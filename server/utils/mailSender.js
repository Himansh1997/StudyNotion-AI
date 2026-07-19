const ApiError = require("./ApiError")

const BREVO_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email"
const DEFAULT_TIMEOUT_MS = 15000

const getRequestTimeout = () => {
  const configuredTimeout = Number.parseInt(
    process.env.EMAIL_REQUEST_TIMEOUT_MS,
    10
  )
  return Number.isInteger(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : DEFAULT_TIMEOUT_MS
}

const mailSender = async (email, title, body) => {
  const apiKey = process.env.BREVO_API_KEY?.trim()
  const senderAddress = process.env.MAIL_FROM_ADDRESS?.trim()

  if (!apiKey || !senderAddress) {
    throw new ApiError(
      503,
      "Email delivery is not configured",
      "MAIL_NOT_CONFIGURED"
    )
  }

  const senderName = process.env.MAIL_FROM_NAME?.trim() || "StudyNotion"
  const replyToAddress = process.env.MAIL_REPLY_TO?.trim()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), getRequestTimeout())

  const payload = {
    sender: { name: senderName, email: senderAddress },
    to: [{ email }],
    subject: title,
    htmlContent: body,
  }
  if (replyToAddress) payload.replyTo = { email: replyToAddress }

  try {
    const response = await fetch(BREVO_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new ApiError(
        502,
        "Email provider rejected the request",
        "EMAIL_PROVIDER_REJECTED"
      )
    }

    return { success: true }
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (controller.signal.aborted || error?.name === "AbortError") {
      throw new ApiError(
        504,
        "Email delivery timed out",
        "EMAIL_PROVIDER_TIMEOUT"
      )
    }
    throw new ApiError(
      502,
      "Email provider is unavailable",
      "EMAIL_PROVIDER_UNAVAILABLE"
    )
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = mailSender
