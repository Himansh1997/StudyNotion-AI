const CourseProgress = require("../models/CourseProgress")
const { getCourse, objectIdEquals } = require("../utils/courseAccess")
const ApiError = require("../utils/ApiError")
const { requireObjectId } = require("../utils/validation")

exports.updateCourseProgress = async (req, res, next) => {
  try {
    const courseId = requireObjectId(req.body.courseId, "courseId")
    const subsectionId = requireObjectId(req.body.subsectionId, "subsectionId")
    const course = await getCourse(courseId, true)
    if (!course.studentsEnroled.some((id) => objectIdEquals(id, req.user.id))) {
      throw new ApiError(403, "Enrollment in this course is required", "COURSE_ENROLLMENT_REQUIRED")
    }
    const belongsToCourse = course.courseContent.some((section) =>
      section.subSection.some((lesson) => objectIdEquals(lesson._id, subsectionId))
    )
    if (!belongsToCourse) {
      throw new ApiError(404, "Lesson does not belong to this course", "LESSON_NOT_FOUND")
    }

    const progress = await CourseProgress.findOneAndUpdate(
      { courseID: courseId, userId: req.user.id },
      { $addToSet: { completedVideos: subsectionId } },
      { new: true }
    )
    if (!progress) throw new ApiError(404, "Course progress not found", "PROGRESS_NOT_FOUND")
    res.status(200).json({ success: true, message: "Course progress updated" })
  } catch (error) {
    next(error)
  }
}
