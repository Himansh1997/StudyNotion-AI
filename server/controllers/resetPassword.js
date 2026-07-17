const bcrypt = require("bcryptjs")
const crypto = require("crypto")

const User = require("../models/User")
const mailSender = require("../utils/mailSender")
const ApiError = require("../utils/ApiError")
const { requireString } = require("../utils/validation")

const clientUrl = () => {
  const value = (process.env.CLIENT_URL || "").split(",")[0].trim().replace(/\/$/, "")
  if (!value) throw new ApiError(500, "Password reset is not configured", "CLIENT_URL_REQUIRED")
  return value
}

exports.resetPasswordToken = async (req, res, next) => {
  try {
    const email = requireString(req.body.email, "email", { max: 254 }).toLowerCase()
    const user = await User.findOne({ email })

    // Use the same response for registered and unregistered addresses.
    if (user) {
      const token = crypto.randomBytes(32).toString("hex")
      user.token = crypto.createHash("sha256").update(token).digest("hex")
      user.resetPasswordExpires = Date.now() + 60 * 60 * 1000
      await user.save()
      const url = `${clientUrl()}/update-password/${token}`
      await mailSender(
        email,
        "StudyNotion password reset",
        `Use this link to reset your password: ${url}. It expires in one hour.`
      )
    }

    res.status(200).json({
      success: true,
      message: "If an account exists, a password-reset email has been sent",
    })
  } catch (error) {
    next(error)
  }
}

exports.resetPassword = async (req, res, next) => {
  try {
    const password = requireString(req.body.password, "password", { min: 8, max: 128 })
    const confirmPassword = requireString(req.body.confirmPassword, "confirmPassword", {
      min: 8,
      max: 128,
    })
    const token = requireString(req.body.token, "token", { min: 20, max: 256 })
    if (password !== confirmPassword) {
      throw new ApiError(400, "Password and confirmation do not match", "VALIDATION_ERROR")
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
    const user = await User.findOne({
      token: tokenHash,
      resetPasswordExpires: { $gt: Date.now() },
    })
    if (!user) {
      throw new ApiError(400, "The reset token is invalid or expired", "INVALID_RESET_TOKEN")
    }

    user.password = await bcrypt.hash(password, 10)
    user.token = undefined
    user.resetPasswordExpires = undefined
    await user.save()
    res.status(200).json({ success: true, message: "Password reset successful" })
  } catch (error) {
    next(error)
  }
}
