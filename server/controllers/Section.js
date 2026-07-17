const Section = require("../models/Section")
const SubSection = require("../models/Subsection")
const { requireOwnedCourse, requireSectionOwnership } = require("../utils/courseAccess")
const { requireString } = require("../utils/validation")

const populatedCourse = (courseId) =>
  require("../models/Course")
    .findById(courseId)
    .populate({ path: "courseContent", populate: { path: "subSection" } })

exports.createSection = async (req, res, next) => {
  try {
    const { courseId } = req.body
    const sectionName = requireString(req.body.sectionName, "sectionName", { max: 160 })
    const course = await requireOwnedCourse(courseId, req.user.id)
    const section = await Section.create({ sectionName })
    course.courseContent.push(section._id)
    await course.save()
    res.status(201).json({
      success: true,
      message: "Section created successfully",
      updatedCourse: await populatedCourse(courseId),
    })
  } catch (error) {
    next(error)
  }
}

exports.updateSection = async (req, res, next) => {
  try {
    const { sectionId, courseId } = req.body
    const sectionName = requireString(req.body.sectionName, "sectionName", { max: 160 })
    await requireSectionOwnership({ sectionId, courseId, userId: req.user.id })
    await Section.findByIdAndUpdate(sectionId, { sectionName }, { runValidators: true })
    res.status(200).json({
      success: true,
      message: "Section updated successfully",
      data: await populatedCourse(courseId),
    })
  } catch (error) {
    next(error)
  }
}

exports.deleteSection = async (req, res, next) => {
  try {
    const { sectionId, courseId } = req.body
    const course = await requireSectionOwnership({
      sectionId,
      courseId,
      userId: req.user.id,
      populate: true,
    })
    const section = course.courseContent.find((item) => String(item._id) === String(sectionId))
    await SubSection.deleteMany({ _id: { $in: section.subSection.map((item) => item._id) } })
    await Section.findByIdAndDelete(sectionId)
    course.courseContent.pull(sectionId)
    await course.save()
    res.status(200).json({
      success: true,
      message: "Section deleted",
      data: await populatedCourse(courseId),
    })
  } catch (error) {
    next(error)
  }
}
