const Course = require("../models/Course")
const CourseProgress = require("../models/CourseProgress")
const ApiError = require("./ApiError")
const { requireObjectId } = require("./validation")

const objectIdEquals = (left, right) => String(left) === String(right)

const getCourse = async (courseId, populate = false) => {
  requireObjectId(courseId, "courseId")
  let query = Course.findById(courseId)
  if (populate) {
    query = query.populate({
      path: "courseContent",
      populate: { path: "subSection" },
    })
  }
  const course = await query
  if (!course) throw new ApiError(404, "Course not found", "COURSE_NOT_FOUND")
  return course
}

const requireOwnedCourse = async (courseId, userId, populate = false) => {
  const course = await getCourse(courseId, populate)
  if (!objectIdEquals(course.instructor, userId)) {
    throw new ApiError(403, "You do not own this course", "COURSE_OWNERSHIP_REQUIRED")
  }
  return course
}

const requireSectionOwnership = async ({ sectionId, courseId, userId, populate = false }) => {
  requireObjectId(sectionId, "sectionId")
  const course = await requireOwnedCourse(courseId, userId, populate)
  if (!course.courseContent.some((id) => objectIdEquals(id._id || id, sectionId))) {
    throw new ApiError(404, "Section does not belong to this course", "SECTION_NOT_FOUND")
  }
  return course
}

const requireSubSectionOwnership = async ({
  subSectionId,
  sectionId,
  courseId,
  userId,
}) => {
  requireObjectId(subSectionId, "subSectionId")
  const course = await requireSectionOwnership({
    sectionId,
    courseId,
    userId,
    populate: true,
  })
  const section = course.courseContent.find((item) => objectIdEquals(item._id, sectionId))
  if (!section.subSection.some((item) => objectIdEquals(item._id, subSectionId))) {
    throw new ApiError(404, "Lesson does not belong to this section", "LESSON_NOT_FOUND")
  }
  return { course, section }
}

const requireAiCourseAccess = async ({ courseId, user, feature }) => {
  const course = await getCourse(courseId, true)
  if (user.accountType === "Instructor") {
    if (!["quiz", "summary"].includes(feature) || !objectIdEquals(course.instructor, user.id)) {
      throw new ApiError(403, "This AI feature is not available for this course", "AI_ACCESS_DENIED")
    }
    return { course, progress: null }
  }
  if (user.accountType !== "Student") {
    throw new ApiError(403, "This AI feature is not available for this account", "AI_ACCESS_DENIED")
  }
  if (!course.studentsEnroled.some((id) => objectIdEquals(id, user.id))) {
    throw new ApiError(403, "Enrollment in this course is required", "COURSE_ENROLLMENT_REQUIRED")
  }
  const progress = await CourseProgress.findOne({ courseID: course._id, userId: user.id })
  return { course, progress }
}

module.exports = {
  objectIdEquals,
  getCourse,
  requireOwnedCourse,
  requireSectionOwnership,
  requireSubSectionOwnership,
  requireAiCourseAccess,
}
