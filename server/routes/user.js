const express = require("express")
const {
  login,
  signup,
  sendotp,
  changePassword,
  setInstructorApproval,
} = require("../controllers/Auth")
const { resetPasswordToken, resetPassword } = require("../controllers/resetPassword")
const { auth, isAdmin } = require("../middleware/auth")
const {
  loginRateLimit,
  otpRateLimit,
  passwordResetRateLimit,
} = require("../middleware/rateLimits")

const router = express.Router()

router.post("/login", loginRateLimit, login)
router.post("/signup", signup)
router.post("/sendotp", otpRateLimit, sendotp)
router.post("/changepassword", auth, passwordResetRateLimit, changePassword)
router.post("/reset-password-token", passwordResetRateLimit, resetPasswordToken)
router.post("/reset-password", passwordResetRateLimit, resetPassword)
router.patch("/instructors/:userId/approval", auth, isAdmin, setInstructorApproval)

module.exports = router
