const ApiError = require("./ApiError")

const DEFAULT_TIMEOUT_MS = 15000
const MAX_RELAY_RESPONSE_BYTES = 4096
const MIN_RELAY_SECRET_LENGTH = 32

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
  const relayUrl = process.env.GMAIL_APPS_SCRIPT_URL?.trim()
  const relaySecret = process.env.EMAIL_WEBHOOK_SECRET?.trim()

  if (
    !relayUrl ||
    !relaySecret ||
    relaySecret.length < MIN_RELAY_SECRET_LENGTH
  ) {
    throw new ApiError(
      503,
      "Email delivery is not configured",
      "MAIL_NOT_CONFIGURED"
    )
  }

  let parsedRelayUrl
  try {
    parsedRelayUrl = new URL(relayUrl)
  } catch (_error) {
    throw new ApiError(
      503,
      "Email delivery is not configured",
      "MAIL_NOT_CONFIGURED"
    )
  }
  if (
    parsedRelayUrl.protocol !== "https:" ||
    parsedRelayUrl.hostname !== "script.google.com" ||
    !parsedRelayUrl.pathname.startsWith("/macros/s/") ||
    !parsedRelayUrl.pathname.endsWith("/exec")
  ) {
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
    secret: relaySecret,
    to: email,
    subject: title,
    html: body,
    fromName: senderName,
  }
  if (replyToAddress) payload.replyTo = replyToAddress

  try {
    const response = await fetch(parsedRelayUrl.toString(), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new ApiError(
        502,
        "Email provider rejected the request",
        "EMAIL_PROVIDER_REJECTED"
      )
    }

    const responseBody = await response.text()
    if (responseBody.length > MAX_RELAY_RESPONSE_BYTES) {
      throw new ApiError(
        502,
        "Email provider rejected the request",
        "EMAIL_PROVIDER_REJECTED"
      )
    }

    let relayResult
    try {
      relayResult = JSON.parse(responseBody)
    } catch (_error) {
      throw new ApiError(
        502,
        "Email provider rejected the request",
        "EMAIL_PROVIDER_REJECTED"
      )
    }
    if (relayResult?.success !== true) {
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
