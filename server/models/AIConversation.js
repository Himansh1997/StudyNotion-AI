const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    citations: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
        type: { type: String, enum: ["section", "lesson"], required: true },
        _id: false,
      },
    ],
    suggestedFollowUpQuestions: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
)

const aiConversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: "Section" },
    subSectionId: { type: mongoose.Schema.Types.ObjectId, ref: "SubSection" },
    title: { type: String, required: true },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true }
)

module.exports = mongoose.model("AIConversation", aiConversationSchema)
