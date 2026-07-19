const OpenAI = require("openai")
const ApiError = require("../../utils/ApiError")

let client

const LEGACY_CODEX_MODELS = new Set(["gpt-5.6-sol", "gpt-5.6-terra"])

const getModel = () => {
  const configuredModel = String(process.env.OPENAI_MODEL || "").trim()
  if (!configuredModel || LEGACY_CODEX_MODELS.has(configuredModel)) {
    return "gpt-5.4-mini"
  }
  return configuredModel
}

const getClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new ApiError(
      503,
      "AI features are not configured. Please try again later.",
      "AI_NOT_CONFIGURED"
    )
  }
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
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
    response = await getClient().responses.create({
      model: getModel(),
      input,
      store: false,
      max_output_tokens: maxOutputTokens,
      text: { format },
    })
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(503, "The AI service is temporarily unavailable", "AI_UNAVAILABLE")
  }

  let decoded
  try {
    decoded = JSON.parse(response.output_text)
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
