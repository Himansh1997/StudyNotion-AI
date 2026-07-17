const ApiError = require("../utils/ApiError")

const notFound = (req, res, next) => {
  next(new ApiError(404, "Route not found", "NOT_FOUND"))
}

const errorHandler = (error, req, res, next) => {
  const isProduction = process.env.NODE_ENV === "production"
  let statusCode = error.statusCode || 500
  let code = error.code || "INTERNAL_ERROR"
  let message = error.message || "An unexpected error occurred"

  if (error.name === "CastError") {
    statusCode = 400
    code = "INVALID_ID"
    message = "A supplied identifier is invalid"
  } else if (error.name === "ValidationError") {
    statusCode = 400
    code = "VALIDATION_ERROR"
    message = "Request validation failed"
  } else if (error.code === 11000) {
    statusCode = 409
    code = "CONFLICT"
    message = "The requested record already exists"
  }

  const payload = { success: false, code, message }
  if (error.details && !isProduction) payload.details = error.details
  if (!isProduction && !(error instanceof ApiError)) payload.stack = error.stack

  res.status(statusCode).json(payload)
}

module.exports = { notFound, errorHandler }
