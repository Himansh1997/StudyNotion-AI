const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const otpGenerator = require("otp-generator")

const User = require("../models/User")
const OTP = require("../models/OTP")
const Profile = require("../models/Profile")
const mailSender = require("../utils/mailSender")
const ApiError = require("../utils/ApiError")
const { requireString, requireEnum, requireObjectId } = require("../utils/validation")
const { passwordUpdated } = require("../mail/templates/passwordUpdate")

const normalizeEmail = (email) =>
  requireString(email, "email", { max: 254 }).toLowerCase()

const validatePassword = (password, fieldName = "password") =>
  requireString(password, fieldName, { min: 8, max: 128 })

exports.signup = async (req, res, next) => {
  try {
    const firstName = requireString(req.body.firstName, "firstName", { max: 80 })
    const lastName = requireString(req.body.lastName, "lastName", { max: 80 })
    const email = normalizeEmail(req.body.email)
    const password = validatePassword(req.body.password)
    const confirmPassword = validatePassword(req.body.confirmPassword, "confirmPassword")
    const otp = requireString(req.body.otp, "otp", { min: 6, max: 6 })
    const accountType = requireEnum(req.body.accountType, "accountType", [
      "Student",
      "Instructor",
    ])

    if (password !== confirmPassword) {
      throw new ApiError(400, "Password and confirmation do not match", "VALIDATION_ERROR")
    }
    if (await User.exists({ email })) {
      throw new ApiError(400, "An account already exists for this email", "ACCOUNT_EXISTS")
    }

    const recentOtp = await OTP.findOne({ email }).sort({ createdAt: -1 })
    if (!recentOtp || otp !== recentOtp.otp) {
      throw new ApiError(400, "The OTP is invalid or expired", "INVALID_OTP")
    }

    const profile = await Profile.create({
      gender: null,
      dateOfBirth: null,
      about: null,
      contactNumber: req.body.contactNumber || null,
    })
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: await bcrypt.hash(password, 10),
      accountType,
      approved: accountType === "Student",
      additionalDetails: profile._id,
      image: "",
    })
    await OTP.deleteMany({ email })

    res.status(201).json({
      success: true,
      message:
        accountType === "Instructor"
          ? "Instructor account created and awaiting approval"
          : "User registered successfully",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        accountType: user.accountType,
        approved: user.approved,
      },
    })
  } catch (error) {
    next(error)
  }
}

exports.login = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email)
    const password = requireString(req.body.password, "password", { max: 128 })
    const user = await User.findOne({ email }).populate("additionalDetails")
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS")
    }
    if (!user.active) throw new ApiError(403, "This account is disabled", "ACCOUNT_DISABLED")
    if (user.accountType === "Instructor" && !user.approved) {
      throw new ApiError(403, "Instructor account is awaiting approval", "INSTRUCTOR_NOT_APPROVED")
    }
    if (!process.env.JWT_SECRET) {
      throw new ApiError(500, "Authentication is not configured", "AUTH_NOT_CONFIGURED")
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, accountType: user.accountType },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    )
    const safeUser = user.toObject()
    delete safeUser.password
    delete safeUser.token

    res
      .cookie("token", token, {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production",
      })
      .status(200)
      .json({ success: true, token, user: safeUser, message: "User login successful" })
  } catch (error) {
    next(error)
  }
}

exports.sendotp = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email)
    if (await User.exists({ email })) {
      throw new ApiError(400, "An account already exists for this email", "ACCOUNT_EXISTS")
    }

    let otp
    do {
      otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      })
    } while (await OTP.exists({ otp }))

    await OTP.create({ email, otp })
    res.status(200).json({ success: true, message: "OTP sent successfully" })
  } catch (error) {
    next(error)
  }
}

exports.changePassword = async (req, res, next) => {
  try {
    const oldPassword = requireString(req.body.oldPassword, "oldPassword", { max: 128 })
    const newPassword = validatePassword(req.body.newPassword, "newPassword")
    const user = await User.findById(req.user.id)
    if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
      throw new ApiError(401, "The current password is incorrect", "INVALID_CREDENTIALS")
    }
    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()

    try {
      await mailSender(
        user.email,
        "Your StudyNotion password was updated",
        passwordUpdated(user.email, `Password updated for ${user.firstName} ${user.lastName}`)
      )
    } catch {
      // Password changes must not be rolled back because an optional notification failed.
    }
    res.status(200).json({ success: true, message: "Password updated successfully" })
  } catch (error) {
    next(error)
  }
}

exports.setInstructorApproval = async (req, res, next) => {
  try {
    const userId = requireObjectId(req.params.userId, "userId")
    if (typeof req.body.approved !== "boolean") {
      throw new ApiError(400, "approved must be a boolean", "VALIDATION_ERROR")
    }
    const instructor = await User.findOneAndUpdate(
      { _id: userId, accountType: "Instructor" },
      { $set: { approved: req.body.approved } },
      { new: true }
    ).select("firstName lastName email accountType approved")
    if (!instructor) throw new ApiError(404, "Instructor not found", "USER_NOT_FOUND")
    res.status(200).json({ success: true, instructor })
  } catch (error) {
    next(error)
  }
}
