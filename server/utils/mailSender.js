const nodemailer = require("nodemailer")
const ApiError = require("./ApiError")

const mailSender = async (email, title, body) => {
  if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
    throw new ApiError(503, "Email delivery is not configured", "MAIL_NOT_CONFIGURED")
  }
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number.parseInt(process.env.MAIL_PORT, 10) || 587,
    secure: process.env.MAIL_SECURE === "true",
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  })
  return transporter.sendMail({ from: `StudyNotion <${process.env.MAIL_USER}>`, to: email, subject: title, html: body })
}

module.exports = mailSender
