const crypto = require("crypto")

const { getRazorpay } = require("../config/razorpay")
const Course = require("../models/Course")
const User = require("../models/User")
const CourseProgress = require("../models/CourseProgress")
const PendingPayment = require("../models/PendingPayment")
const mailSender = require("../utils/mailSender")
const ApiError = require("../utils/ApiError")
const { requireObjectId, requireString } = require("../utils/validation")
const { courseEnrollmentEmail } = require("../mail/templates/courseEnrollmentEmail")
const { paymentSuccessEmail } = require("../mail/templates/paymentSuccessEmail")

exports.capturePayment = async (req, res, next) => {
  try {
    if (!Array.isArray(req.body.courses) || req.body.courses.length < 1 || req.body.courses.length > 20) {
      throw new ApiError(400, "One to twenty course IDs are required", "VALIDATION_ERROR")
    }
    const courseIds = [...new Set(req.body.courses.map((id) => requireObjectId(id, "courseId")))]
    const courses = await Course.find({ _id: { $in: courseIds }, status: "Published" }).select(
      "price studentsEnroled courseName"
    )
    if (courses.length !== courseIds.length) {
      throw new ApiError(404, "One or more courses were not found", "COURSE_NOT_FOUND")
    }
    if (courses.some((course) => course.studentsEnroled.some((id) => String(id) === req.user.id))) {
      throw new ApiError(400, "You are already enrolled in one of these courses", "ALREADY_ENROLLED")
    }
    const expectedAmount = courses.reduce((total, course) => total + Math.round(course.price * 100), 0)
    if (!Number.isSafeInteger(expectedAmount) || expectedAmount <= 0) {
      throw new ApiError(400, "The selected courses have an invalid price", "INVALID_PAYMENT_AMOUNT")
    }

    const order = await getRazorpay().orders.create({
      amount: expectedAmount,
      currency: "INR",
      receipt: crypto.randomBytes(16).toString("hex"),
    })
    await PendingPayment.create({
      orderId: order.id,
      userId: req.user.id,
      courseIds,
      expectedAmount,
      currency: "INR",
    })
    res.status(201).json({
      success: true,
      // The Key ID is public by design. Returning it with the server-created
      // order removes a stale duplicate frontend setting; the secret stays here.
      data: {
        id: order.id,
        amount: expectedAmount,
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY,
      },
    })
  } catch (error) {
    next(error)
  }
}

const signatureMatches = (orderId, paymentId, signature) => {
  if (!process.env.RAZORPAY_SECRET) return false
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex")
  const expectedBuffer = Buffer.from(expected, "utf8")
  const receivedBuffer = Buffer.from(signature, "utf8")
  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
}

const enrollFromPendingPayment = async (pending) => {
  const user = await User.findById(pending.userId)
  if (!user) throw new ApiError(404, "User not found", "USER_NOT_FOUND")

  for (const courseId of pending.courseIds) {
    const course = await Course.findByIdAndUpdate(
      courseId,
      { $addToSet: { studentsEnroled: pending.userId } },
      { new: true }
    )
    if (!course) throw new ApiError(404, "Course not found", "COURSE_NOT_FOUND")
    const progress = await CourseProgress.findOneAndUpdate(
      { courseID: courseId, userId: pending.userId },
      { $setOnInsert: { completedVideos: [] } },
      { upsert: true, new: true }
    )
    await User.findByIdAndUpdate(pending.userId, {
      $addToSet: { courses: courseId, courseProgress: progress._id },
    })
  }
  return user
}

exports.verifyPayment = async (req, res, next) => {
  let lockedPayment
  try {
    const orderId = requireString(req.body.razorpay_order_id, "razorpay_order_id", { max: 200 })
    const paymentId = requireString(req.body.razorpay_payment_id, "razorpay_payment_id", { max: 200 })
    const signature = requireString(req.body.razorpay_signature, "razorpay_signature", { max: 512 })
    const pending = await PendingPayment.findOne({ orderId, userId: req.user.id })
    if (!pending) throw new ApiError(404, "Payment order not found", "PAYMENT_ORDER_NOT_FOUND")
    if (pending.status === "processed") {
      throw new ApiError(409, "Payment order has already been processed", "PAYMENT_ALREADY_PROCESSED")
    }
    if (!signatureMatches(orderId, paymentId, signature)) {
      throw new ApiError(400, "Payment signature verification failed", "INVALID_PAYMENT_SIGNATURE")
    }

    lockedPayment = await PendingPayment.findOneAndUpdate(
      { _id: pending._id, status: "created" },
      { $set: { status: "processing" } },
      { new: true }
    )
    if (!lockedPayment) {
      throw new ApiError(409, "Payment order is already being processed", "PAYMENT_ALREADY_PROCESSING")
    }

    const user = await enrollFromPendingPayment(lockedPayment)
    lockedPayment.status = "processed"
    lockedPayment.paymentId = paymentId
    lockedPayment.processedAt = new Date()
    await lockedPayment.save()

    try {
      await mailSender(
        user.email,
        "StudyNotion payment received",
        paymentSuccessEmail(
          `${user.firstName} ${user.lastName}`,
          lockedPayment.expectedAmount / 100,
          orderId,
          paymentId
        )
      )
      const courses = await Course.find({ _id: { $in: lockedPayment.courseIds } }).select("courseName")
      for (const course of courses) {
        await mailSender(
          user.email,
          `Enrolled in ${course.courseName}`,
          courseEnrollmentEmail(course.courseName, `${user.firstName} ${user.lastName}`)
        )
      }
    } catch {
      // Enrollment succeeds independently of optional notification email delivery.
    }

    res.status(200).json({ success: true, message: "Payment verified and enrollment completed" })
  } catch (error) {
    if (lockedPayment?.status === "processing") {
      await PendingPayment.updateOne({ _id: lockedPayment._id }, { $set: { status: "created" } }).catch(() => {})
    }
    next(error)
  }
}
