const Section = require("../models/Section")
const SubSection = require("../models/Subsection")
const { uploadImageToCloudinary } = require("../utils/imageUploader")
const {
  requireSectionOwnership,
  requireSubSectionOwnership,
} = require("../utils/courseAccess")
const ApiError = require("../utils/ApiError")
const { requireString } = require("../utils/validation")

exports.createSubSection = async (req, res, next) => {
  try {
    const { sectionId, courseId } = req.body
    const title = requireString(req.body.title, "title", { max: 200 })
    const description = requireString(req.body.description, "description", { max: 5000 })
    await requireSectionOwnership({ sectionId, courseId, userId: req.user.id })
    const video = req.files?.video
    if (!video) throw new ApiError(400, "A lesson video is required", "VALIDATION_ERROR")
    const upload = await uploadImageToCloudinary(video, process.env.FOLDER_NAME)
    const lesson = await SubSection.create({
      title,
      description,
      timeDuration: String(upload.duration || ""),
      videoUrl: upload.secure_url,
    })
    const section = await Section.findByIdAndUpdate(
      sectionId,
      { $push: { subSection: lesson._id } },
      { new: true }
    ).populate("subSection")
    res.status(201).json({ success: true, data: section })
  } catch (error) {
    next(error)
  }
}

exports.updateSubSection = async (req, res, next) => {
  try {
    const { sectionId, subSectionId, courseId } = req.body
    await requireSubSectionOwnership({ sectionId, subSectionId, courseId, userId: req.user.id })
    const lesson = await SubSection.findById(subSectionId)
    if (req.body.title !== undefined) {
      lesson.title = requireString(req.body.title, "title", { max: 200 })
    }
    if (req.body.description !== undefined) {
      lesson.description = requireString(req.body.description, "description", { max: 5000 })
    }
    if (req.files?.video) {
      const upload = await uploadImageToCloudinary(req.files.video, process.env.FOLDER_NAME)
      lesson.videoUrl = upload.secure_url
      lesson.timeDuration = String(upload.duration || "")
    }
    await lesson.save()
    res.status(200).json({
      success: true,
      message: "Lesson updated successfully",
      data: await Section.findById(sectionId).populate("subSection"),
    })
  } catch (error) {
    next(error)
  }
}

exports.deleteSubSection = async (req, res, next) => {
  try {
    const { subSectionId, sectionId, courseId } = req.body
    await requireSubSectionOwnership({ sectionId, subSectionId, courseId, userId: req.user.id })
    await Section.findByIdAndUpdate(sectionId, { $pull: { subSection: subSectionId } })
    await SubSection.findByIdAndDelete(subSectionId)
    res.status(200).json({
      success: true,
      message: "Lesson deleted successfully",
      data: await Section.findById(sectionId).populate("subSection"),
    })
  } catch (error) {
    next(error)
  }
}
