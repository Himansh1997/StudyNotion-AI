const OpenAI = require("openai")
const ApiError = require("../../utils/ApiError")

let client

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite"

const getModel = () => {
  return String(process.env.GEMINI_MODEL || "").trim() || DEFAULT_GEMINI_MODEL
}

const getClient = () => {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim()
  if (!apiKey) {
    throw new ApiError(
      503,
      "AI features are not configured. Please try again later.",
      "AI_NOT_CONFIGURED"
    )
  }
  if (!client) {
    client = new OpenAI({
      apiKey,
      baseURL: GEMINI_BASE_URL,
      timeout: 30_000,
      maxRetries: 1,
      logLevel: "off",
    })
  }
  return client
}

const sanitizeMetadataValue = (value) => {
  const sanitized = String(value || "unknown")
    .replace(/[^a-zA-Z0-9_.:-]/g, "_")
    .slice(0, 80)
  return sanitized || "unknown"
}

const getProviderStatus = (error) => {
  const status = Number(error?.status)
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : null
}

const classifyProviderError = (status) => {
  if (status === 400 || (status && status >= 404 && status < 429)) {
    return new ApiError(502, "The AI request was rejected", "AI_REQUEST_REJECTED")
  }
  if (status === 401 || status === 403) {
    return new ApiError(503, "The AI service authentication failed", "AI_AUTH_FAILED")
  }
  if (status === 429) {
    return new ApiError(429, "The AI service rate limit was reached", "AI_RATE_LIMITED")
  }
  return new ApiError(503, "The AI service is temporarily unavailable", "AI_UNAVAILABLE")
}

const logProviderError = (error, model) => {
  console.error("Gemini AI provider request failed", {
    status: getProviderStatus(error),
    code: sanitizeMetadataValue(error?.code || error?.error?.code),
    type: sanitizeMetadataValue(error?.type || error?.error?.type),
    model: sanitizeMetadataValue(model),
  })
}

const generateStructured = async ({ input, format, schema, maxOutputTokens = 6000 }) => {
  let response
  const model = getModel()
  try {
    response = await getClient().chat.completions.create({
      model,
      messages: input,
      max_tokens: maxOutputTokens,
      response_format: format,
    })
  } catch (error) {
    if (error instanceof ApiError) throw error
    logProviderError(error, model)
    throw classifyProviderError(getProviderStatus(error))
  }

  let decoded
  try {
    const content = response?.choices?.[0]?.message?.content
    if (typeof content !== "string" || !content.trim()) throw new Error("Missing content")
    decoded = JSON.parse(content)
  } catch {
    throw new ApiError(502, "The AI service returned an invalid response", "AI_INVALID_RESPONSE")
  }
  const validated = schema.safeParse(decoded)
  if (!validated.success) {
    throw new ApiError(502, "The AI service returned an invalid response", "AI_INVALID_RESPONSE")
  }
  return validated.data
}

module.exports = { generateStructured, getModel }
