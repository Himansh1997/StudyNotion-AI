const mongoose = require("mongoose")

const questionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: { type: [String], required: true, validate: (value) => value.length === 4 },
    correctOptionIndex: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String, required: true },
    relatedContentTitle: { type: String, required: true },
  },
  { _id: true }
)

const attemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    answers: [{ type: Number, min: 0, max: 3 }],
    score: { type: Number, required: true },
    percentage: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: true }
)

const aiQuizSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: "Section" },
    subSectionId: { type: mongoose.Schema.Types.ObjectId, ref: "SubSection" },
    questionCount: { type: Number, required: true, min: 5, max: 15 },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
    sourceContentHash: { type: String, required: true, index: true },
    questions: { type: [questionSchema], required: true },
    attempts: { type: [attemptSchema], default: [] },
  },
  { timestamps: true }
)

aiQuizSchema.index({ ownerId: 1, courseId: 1, sourceContentHash: 1, difficulty: 1, questionCount: 1 })

module.exports = mongoose.model("AIQuiz", aiQuizSchema)
