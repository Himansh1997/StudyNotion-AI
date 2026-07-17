const jwt = require("jsonwebtoken")
const User = require("../models/User")
const ApiError = require("../utils/ApiError")
const asyncHandler = require("../utils/asyncHandler")

const bearerToken = (header) => {
  if (typeof header !== "string") return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : null
}

exports.auth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token || bearerToken(req.get("Authorization"))
  if (!token) throw new ApiError(401, "Authentication required", "AUTH_REQUIRED")
  if (!process.env.JWT_SECRET) {
    throw new ApiError(500, "Authentication is not configured", "AUTH_NOT_CONFIGURED")
  }

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    throw new ApiError(401, "Invalid or expired authentication token", "INVALID_TOKEN")
  }

  const user = await User.findById(decoded.id).select("email accountType approved active")
  if (!user || !user.active) {
    throw new ApiError(401, "Authenticated user is unavailable", "INVALID_TOKEN")
  }
  req.user = {
    id: String(user._id),
    email: user.email,
    accountType: user.accountType,
    approved: user.approved,
  }
  next()
})

const requireRole = (role, { requireApproval = false } = {}) =>
  (req, res, next) => {
    if (req.user?.accountType !== role) {
      return next(new ApiError(403, `This action requires the ${role} role`, "FORBIDDEN"))
    }
    if (requireApproval && !req.user.approved) {
      return next(new ApiError(403, "Instructor account is awaiting approval", "INSTRUCTOR_NOT_APPROVED"))
    }
    next()
  }

exports.isStudent = requireRole("Student")
exports.isAdmin = requireRole("Admin")
exports.isInstructor = requireRole("Instructor", { requireApproval: true })
