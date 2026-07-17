const mongoose = require("mongoose")

const pendingPaymentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true, immutable: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true, immutable: true },
    courseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, immutable: true }],
    expectedAmount: { type: Number, required: true, min: 0, immutable: true },
    currency: { type: String, required: true, default: "INR", immutable: true },
    status: {
      type: String,
      enum: ["created", "processing", "processed"],
      default: "created",
      index: true,
    },
    paymentId: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true }
)

module.exports = mongoose.model("PendingPayment", pendingPaymentSchema)
