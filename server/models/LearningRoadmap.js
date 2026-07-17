const mongoose = require("mongoose")

const relatedContentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, enum: ["section", "lesson"], required: true },
  },
  { _id: false }
)

const weekSchema = new mongoose.Schema(
  {
    weekNumber: { type: Number, required: true, min: 1 },
    objective: { type: String, required: true },
    relatedContent: { type: [relatedContentSchema], required: true },
    estimatedHours: { type: Number, required: true, min: 0 },
    activities: { type: [String], required: true },
    quizCheckpoint: { type: String, required: true },
    milestone: { type: String, required: true },
  },
  { _id: false }
)

const roadmapSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    currentLevel: { type: String, enum: ["Beginner", "Intermediate", "Advanced"], required: true },
    learningGoal: { type: String, required: true },
    hoursPerWeek: { type: Number, required: true },
    targetDate: { type: Date },
    inputHash: { type: String, required: true, index: true },
    progressHash: { type: String, required: true },
    sourceContentHash: { type: String, required: true },
    title: { type: String, required: true },
    goal: { type: String, required: true },
    currentProgressPercentage: { type: Number, required: true },
    totalWeeks: { type: Number, required: true },
    weeklyPlan: { type: [weekSchema], required: true },
    finalProjectSuggestion: { type: String, required: true },
    revisionStrategy: { type: String, required: true },
    generatedAt: { type: Date, required: true },
  },
  { timestamps: true }
)

roadmapSchema.index({ userId: 1, courseId: 1, inputHash: 1, progressHash: 1, sourceContentHash: 1 })

module.exports = mongoose.model("LearningRoadmap", roadmapSchema)
