const mongoose = require("mongoose")
const ApiError = require("./ApiError")

const requireObjectId = (value, fieldName) => {
  if (!mongoose.isValidObjectId(value)) {
    throw new ApiError(400, `${fieldName} must be a valid identifier`, "VALIDATION_ERROR")
  }
  return String(value)
}

const requireString = (value, fieldName, { min = 1, max = 5000 } = {}) => {
  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldName} is required`, "VALIDATION_ERROR")
  }
  const trimmed = value.trim()
  if (trimmed.length < min || trimmed.length > max) {
    throw new ApiError(
      400,
      `${fieldName} must contain between ${min} and ${max} characters`,
      "VALIDATION_ERROR"
    )
  }
  return trimmed
}

const optionalObjectId = (value, fieldName) =>
  value === undefined || value === null || value === ""
    ? undefined
    : requireObjectId(value, fieldName)

const requireEnum = (value, fieldName, allowed) => {
  if (!allowed.includes(value)) {
    throw new ApiError(
      400,
      `${fieldName} must be one of: ${allowed.join(", ")}`,
      "VALIDATION_ERROR"
    )
  }
  return value
}

const requireNumber = (value, fieldName, { min, max, integer = false } = {}) => {
  const parsed = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(parsed) || (integer && !Number.isInteger(parsed))) {
    throw new ApiError(400, `${fieldName} must be a valid number`, "VALIDATION_ERROR")
  }
  if ((min !== undefined && parsed < min) || (max !== undefined && parsed > max)) {
    throw new ApiError(
      400,
      `${fieldName} must be between ${min} and ${max}`,
      "VALIDATION_ERROR"
    )
  }
  return parsed
}

module.exports = {
  requireObjectId,
  optionalObjectId,
  requireString,
  requireEnum,
  requireNumber,
}
