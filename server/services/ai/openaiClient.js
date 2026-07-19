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

const generateStructured = async ({ input, format, schema, maxOutputTokens = 6000 }) => {
  let response
  try {
    response = await getClient().chat.completions.create({
      model: getModel(),
      messages: input,
      max_completion_tokens: maxOutputTokens,
      response_format: format,
    })
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(503, "The AI service is temporarily unavailable", "AI_UNAVAILABLE")
  }

  let decoded
  try {
    decoded = JSON.parse(response.choices[0].message.content)
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
