const mongoose = require("mongoose")
const mailSender = require("../utils/mailSender")
const emailTemplate = require("../mail/templates/emailVerificationTemplate")

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 5 },
})

otpSchema.pre("save", async function sendOtpEmail() {
  if (this.isNew) {
    await mailSender(this.email, "StudyNotion verification code", emailTemplate(this.otp))
  }
})

module.exports = mongoose.model("OTP", otpSchema)
