const MAX_SUBJECT_LENGTH = 998
const MAX_HTML_LENGTH = 100000
const MIN_SECRET_LENGTH = 32

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  )
}

function secureEqual(left, right) {
  const first = String(left || "")
  const second = String(right || "")
  let mismatch = first.length ^ second.length
  const length = Math.max(first.length, second.length)

  for (let index = 0; index < length; index += 1) {
    mismatch |= (first.charCodeAt(index) || 0) ^ (second.charCodeAt(index) || 0)
  }
  return mismatch === 0
}

function isEmail(value) {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  )
}

function plainTextFromHtml(value) {
  return String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
}

function doGet() {
  return jsonResponse({ success: true, service: "StudyNotion email relay" })
}

function authorizeEmailRelay() {
  return MailApp.getRemainingDailyQuota()
}

function doPost(event) {
  try {
    const configuredSecret = PropertiesService.getScriptProperties().getProperty(
      "EMAIL_WEBHOOK_SECRET"
    )
    const payload = JSON.parse((event.postData && event.postData.contents) || "{}")

    if (
      !configuredSecret ||
      configuredSecret.length < MIN_SECRET_LENGTH ||
      !secureEqual(payload.secret, configuredSecret)
    ) {
      return jsonResponse({ success: false, code: "UNAUTHORIZED" })
    }

    if (
      !isEmail(payload.to) ||
      typeof payload.subject !== "string" ||
      payload.subject.length === 0 ||
      payload.subject.length > MAX_SUBJECT_LENGTH ||
      typeof payload.html !== "string" ||
      payload.html.length === 0 ||
      payload.html.length > MAX_HTML_LENGTH ||
      (payload.replyTo && !isEmail(payload.replyTo))
    ) {
      return jsonResponse({ success: false, code: "INVALID_REQUEST" })
    }

    if (MailApp.getRemainingDailyQuota() < 1) {
      return jsonResponse({ success: false, code: "QUOTA_EXCEEDED" })
    }

    const message = {
      to: payload.to,
      subject: payload.subject,
      body: plainTextFromHtml(payload.html) || payload.subject,
      htmlBody: payload.html,
      name: String(payload.fromName || "StudyNotion").slice(0, 80),
    }
    if (payload.replyTo) message.replyTo = payload.replyTo

    MailApp.sendEmail(message)
    return jsonResponse({ success: true })
  } catch (_error) {
    return jsonResponse({ success: false, code: "SEND_FAILED" })
  }
}
