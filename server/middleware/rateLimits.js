const { rateLimit } = require("express-rate-limit")

const response = (message, code) => (req, res) =>
  res.status(429).json({ success: false, code, message })

const createLimit = ({ windowMs, limit, code, message, keyGenerator }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: response(message, code),
    ...(keyGenerator ? { keyGenerator } : {}),
  })

const loginRateLimit = createLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  code: "AUTH_RATE_LIMITED",
  message: "Too many login attempts. Please try again later.",
})

const otpRateLimit = createLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  code: "OTP_RATE_LIMITED",
  message: "Too many OTP requests. Please try again later.",
})

const passwordResetRateLimit = createLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  code: "PASSWORD_RESET_RATE_LIMITED",
  message: "Too many password-reset requests. Please try again later.",
})

const aiRateLimit = createLimit({
  windowMs: 60 * 60 * 1000,
  limit: () => {
    const configured = Number.parseInt(process.env.AI_REQUESTS_PER_HOUR, 10)
    return Number.isInteger(configured) && configured > 0 ? configured : 30
  },
  keyGenerator: (req) => String(req.user.id),
  code: "AI_RATE_LIMITED",
  message: "AI request limit reached. Please try again later.",
})

module.exports = {
  loginRateLimit,
  otpRateLimit,
  passwordResetRateLimit,
  aiRateLimit,
}
