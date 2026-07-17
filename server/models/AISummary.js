const mongoose = require("mongoose")

const aiSummarySchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    sourceContentHash: { type: String, required: true, index: true },
    overview: { type: String, required: true },
    learningObjectives: { type: [String], required: true },
    prerequisites: { type: [String], required: true },
    keyPoints: { type: [String], required: true },
    sectionSummaries: [
      {
        sectionId: { type: String, required: true },
        title: { type: String, required: true },
        summary: { type: String, required: true },
        _id: false,
      },
    ],
    glossary: [
      {
        term: { type: String, required: true },
        definition: { type: String, required: true },
        _id: false,
      },
    ],
    revisionChecklist: { type: [String], required: true },
    estimatedStudyTime: { type: String, required: true },
    generatedAt: { type: Date, required: true },
  },
  { timestamps: true }
)

aiSummarySchema.index({ courseId: 1, sourceContentHash: 1 }, { unique: true })

module.exports = mongoose.model("AISummary", aiSummarySchema)
