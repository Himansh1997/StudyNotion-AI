const Course = require("../models/Course")
const Category = require("../models/Category")
const Section = require("../models/Section")
const SubSection = require("../models/Subsection")
const User = require("../models/User")
const CourseProgress = require("../models/CourseProgress")
const { uploadImageToCloudinary } = require("../utils/imageUploader")
const { convertSecondsToDuration } = require("../utils/secToDuration")
const ApiError = require("../utils/ApiError")
const { requireOwnedCourse, objectIdEquals } = require("../utils/courseAccess")
const {
  requireObjectId,
  requireString,
  requireNumber,
  requireEnum,
} = require("../utils/validation")

const parseStringArray = (value, fieldName) => {
  let parsed = value
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value)
    } catch {
      throw new ApiError(400, `${fieldName} must be a JSON array`, "VALIDATION_ERROR")
    }
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 50) {
    throw new ApiError(400, `${fieldName} must be a non-empty array`, "VALIDATION_ERROR")
  }
  return parsed.map((item) => requireString(item, fieldName, { max: 500 }))
}

const durationFor = (course) => {
  const seconds = course.courseContent.reduce(
    (total, section) =>
      total +
      section.subSection.reduce(
        (sectionTotal, lesson) => sectionTotal + (Number.parseInt(lesson.timeDuration, 10) || 0),
        0
      ),
    0
  )
  return convertSecondsToDuration(seconds)
}

const publicPopulation = [
  { path: "instructor", populate: { path: "additionalDetails" }, select: "firstName lastName image additionalDetails" },
  { path: "category" },
  { path: "ratingAndReviews" },
  {
    path: "courseContent",
    populate: {
      path: "subSection",
      select: "title description timeDuration",
    },
  },
]

const fullPopulation = [
  { path: "instructor", populate: { path: "additionalDetails" }, select: "firstName lastName image additionalDetails" },
  { path: "category" },
  { path: "ratingAndReviews" },
  { path: "courseContent", populate: { path: "subSection" } },
]

exports.createCourse = async (req, res, next) => {
  try {
    const courseName = requireString(req.body.courseName, "courseName", { max: 200 })
    const courseDescription = requireString(req.body.courseDescription, "courseDescription", { max: 10000 })
    const whatYouWillLearn = requireString(req.body.whatYouWillLearn, "whatYouWillLearn", { max: 10000 })
    const price = requireNumber(req.body.price, "price", { min: 0, max: 10000000 })
    const category = requireObjectId(req.body.category, "category")
    const tag = parseStringArray(req.body.tag, "tag")
    const instructions = parseStringArray(req.body.instructions, "instructions")
    const status = req.body.status
      ? requireEnum(req.body.status, "status", ["Draft", "Published"])
      : "Draft"
    const thumbnail = req.files?.thumbnailImage
    if (!thumbnail) throw new ApiError(400, "A course thumbnail is required", "VALIDATION_ERROR")
    if (!(await Category.exists({ _id: category }))) {
      throw new ApiError(404, "Category not found", "CATEGORY_NOT_FOUND")
    }

    const uploaded = await uploadImageToCloudinary(thumbnail, process.env.FOLDER_NAME)
    const course = await Course.create({
      courseName,
      courseDescription,
      instructor: req.user.id,
      whatYouWillLearn,
      price,
      tag,
      category,
      thumbnail: uploaded.secure_url,
      status,
      instructions,
    })
    await Promise.all([
      User.findByIdAndUpdate(req.user.id, { $addToSet: { courses: course._id } }),
      Category.findByIdAndUpdate(category, { $addToSet: { courses: course._id } }),
    ])
    res.status(201).json({ success: true, data: course, message: "Course created successfully" })
  } catch (error) {
    next(error)
  }
}

exports.editCourse = async (req, res, next) => {
  try {
    const course = await requireOwnedCourse(req.body.courseId, req.user.id)
    const allowed = [
      "courseName",
      "courseDescription",
      "whatYouWillLearn",
      "price",
      "category",
      "status",
    ]
    for (const key of allowed) {
      if (req.body[key] === undefined) continue
      if (["courseName", "courseDescription", "whatYouWillLearn"].includes(key)) {
        course[key] = requireString(req.body[key], key, { max: key === "courseName" ? 200 : 10000 })
      } else if (key === "price") {
        course.price = requireNumber(req.body.price, "price", { min: 0, max: 10000000 })
      } else if (key === "category") {
        course.category = requireObjectId(req.body.category, "category")
      } else if (key === "status") {
        course.status = requireEnum(req.body.status, "status", ["Draft", "Published"])
      }
    }
    if (req.body.tag !== undefined) course.tag = parseStringArray(req.body.tag, "tag")
    if (req.body.instructions !== undefined) {
      course.instructions = parseStringArray(req.body.instructions, "instructions")
    }
    if (req.files?.thumbnailImage) {
      const uploaded = await uploadImageToCloudinary(req.files.thumbnailImage, process.env.FOLDER_NAME)
      course.thumbnail = uploaded.secure_url
    }
    await course.save()
    await course.populate(fullPopulation)
    res.status(200).json({ success: true, message: "Course updated successfully", data: course })
  } catch (error) {
    next(error)
  }
}

exports.getAllCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({ status: "Published" })
      .select("courseName price thumbnail instructor ratingAndReviews studentsEnroled")
      .populate("instructor", "firstName lastName image")
    res.status(200).json({ success: true, data: courses })
  } catch (error) {
    next(error)
  }
}

exports.getCourseDetails = async (req, res, next) => {
  try {
    const courseId = requireObjectId(req.body.courseId, "courseId")
    const course = await Course.findOne({ _id: courseId, status: "Published" }).populate(publicPopulation)
    if (!course) throw new ApiError(404, "Course not found", "COURSE_NOT_FOUND")
    res.status(200).json({ success: true, data: { courseDetails: course, totalDuration: durationFor(course) } })
  } catch (error) {
    next(error)
  }
}

exports.getFullCourseDetails = async (req, res, next) => {
  try {
    const courseId = requireObjectId(req.body.courseId, "courseId")
    const course = await Course.findById(courseId).populate(fullPopulation)
    if (!course) throw new ApiError(404, "Course not found", "COURSE_NOT_FOUND")
    const isOwner = req.user.accountType === "Instructor" && objectIdEquals(course.instructor._id, req.user.id)
    const isEnrolled =
      req.user.accountType === "Student" &&
      course.studentsEnroled.some((id) => objectIdEquals(id, req.user.id))
    if (!isOwner && !isEnrolled) {
      throw new ApiError(403, "You do not have access to this course content", "COURSE_ACCESS_DENIED")
    }
    const progress = isEnrolled
      ? await CourseProgress.findOne({ courseID: courseId, userId: req.user.id })
      : null
    res.status(200).json({
      success: true,
      data: {
        courseDetails: course,
        totalDuration: durationFor(course),
        completedVideos: progress?.completedVideos || [],
      },
    })
  } catch (error) {
    next(error)
  }
}

exports.getInstructorCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({ instructor: req.user.id }).sort({ createdAt: -1 })
    res.status(200).json({ success: true, data: courses })
  } catch (error) {
    next(error)
  }
}

exports.deleteCourse = async (req, res, next) => {
  try {
    const course = await requireOwnedCourse(req.body.courseId, req.user.id, true)
    const sectionIds = course.courseContent.map((section) => section._id)
    const lessonIds = course.courseContent.flatMap((section) =>
      section.subSection.map((lesson) => lesson._id)
    )
    await Promise.all([
      User.updateMany({ courses: course._id }, { $pull: { courses: course._id } }),
      User.findByIdAndUpdate(req.user.id, { $pull: { courses: course._id } }),
      Category.findByIdAndUpdate(course.category, { $pull: { courses: course._id } }),
      CourseProgress.deleteMany({ courseID: course._id }),
      SubSection.deleteMany({ _id: { $in: lessonIds } }),
      Section.deleteMany({ _id: { $in: sectionIds } }),
    ])
    await Course.findByIdAndDelete(course._id)
    res.status(200).json({ success: true, message: "Course deleted successfully" })
  } catch (error) {
    next(error)
  }
}
