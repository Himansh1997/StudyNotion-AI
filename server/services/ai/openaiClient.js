const OpenAI = require("openai")
const ApiError = require("../../utils/ApiError")

let client

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/"
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
  return Number.isInteger(status) && status >= 100 && status <= 599
    ? status
    : null
}

const classifyProviderError = (status) => {
  if (status === 400 || (status && status >= 404 && status < 429)) {
    return new ApiError(
      502,
      "The AI request was rejected",
      "AI_REQUEST_REJECTED"
    )
  }
  if (status === 401 || status === 403) {
    return new ApiError(
      503,
      "The AI service authentication failed",
      "AI_AUTH_FAILED"
    )
  }
  if (status === 429) {
    return new ApiError(
      429,
      "The AI service rate limit was reached",
      "AI_RATE_LIMITED"
    )
  }
  return new ApiError(
    503,
    "The AI service is temporarily unavailable",
    "AI_UNAVAILABLE"
  )
}

const logProviderError = (error, model) => {
  console.error("Gemini AI provider request failed", {
    status: getProviderStatus(error),
    code: sanitizeMetadataValue(error?.code || error?.error?.code),
    type: sanitizeMetadataValue(error?.type || error?.error?.type),
    model: sanitizeMetadataValue(model),
  })
}

const schemaName = (format) =>
  sanitizeMetadataValue(format?.json_schema?.name || "structured_response")

const jsonContractMessage = (format, validationPaths = []) => ({
  role: "user",
  content: [
    "Return exactly one JSON object and no Markdown or surrounding text.",
    `The object must match this JSON Schema: ${JSON.stringify(
      format.json_schema.schema
    )}`,
    validationPaths.length
      ? `A previous generation failed validation at these fields: ${validationPaths.join(
          ", "
        )}. Regenerate the complete object with valid, non-empty values.`
      : "",
  ]
    .filter(Boolean)
    .join("\n"),
})

const logValidationFailure = (validation, format) => {
  const paths = validation.error.issues
    .slice(0, 8)
    .map((issue) => issue.path.join(".") || "<root>")
  console.error("Gemini AI response validation failed", {
    schema: schemaName(format),
    paths,
  })
  return paths
}

const requestCompletion = async ({
  input,
  format,
  maxOutputTokens,
  preferJsonObject,
  validationPaths = [],
}) => {
  const model = getModel()
  const useJsonObject = preferJsonObject || validationPaths.length > 0
  const messages = useJsonObject
    ? [...input, jsonContractMessage(format, validationPaths)]
    : input

  try {
    return await getClient().chat.completions.create({
      model,
      messages,
      max_tokens: maxOutputTokens,
      response_format: useJsonObject ? { type: "json_object" } : format,
    })
  } catch (error) {
    if (error instanceof ApiError) throw error
    logProviderError(error, model)
    if (!useJsonObject && getProviderStatus(error) === 400) {
      return requestCompletion({
        input,
        format,
        maxOutputTokens,
        preferJsonObject: true,
      })
    }
    throw classifyProviderError(getProviderStatus(error))
  }
}

const decodeResponse = (response) => {
  let decoded
  try {
    const content = response?.choices?.[0]?.message?.content
    if (typeof content !== "string" || !content.trim())
      throw new Error("Missing content")
    decoded = JSON.parse(content)
  } catch {
    throw new ApiError(
      502,
      "The AI service returned an invalid response",
      "AI_INVALID_RESPONSE"
    )
  }
  return decoded
}

const generateStructured = async ({
  input,
  format,
  schema,
  maxOutputTokens = 6000,
  preferJsonObject = false,
}) => {
  const response = await requestCompletion({
    input,
    format,
    maxOutputTokens,
    preferJsonObject,
  })
  const decoded = decodeResponse(response)
  const validated = schema.safeParse(decoded)
  if (validated.success) return validated.data

  const validationPaths = logValidationFailure(validated, format)
  const repairedResponse = await requestCompletion({
    input,
    format,
    maxOutputTokens,
    preferJsonObject: true,
    validationPaths,
  })
  const repaired = schema.safeParse(decodeResponse(repairedResponse))
  if (repaired.success) return repaired.data

  logValidationFailure(repaired, format)
  throw new ApiError(
    502,
    "The AI service returned an invalid response",
    "AI_INVALID_RESPONSE"
  )
}

module.exports = { generateStructured, getModel }
