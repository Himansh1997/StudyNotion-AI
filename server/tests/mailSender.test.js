const mailSender = require("../utils/mailSender")

const ENVIRONMENT_KEYS = [
  "GMAIL_APPS_SCRIPT_URL",
  "EMAIL_WEBHOOK_SECRET",
  "MAIL_FROM_NAME",
  "MAIL_REPLY_TO",
  "EMAIL_REQUEST_TIMEOUT_MS",
]
const originalEnvironment = Object.fromEntries(
  ENVIRONMENT_KEYS.map((key) => [key, process.env[key]])
)
const originalFetch = global.fetch

const restoreEnvironment = () => {
  for (const key of ENVIRONMENT_KEYS) {
    if (originalEnvironment[key] === undefined) delete process.env[key]
    else process.env[key] = originalEnvironment[key]
  }
}

beforeEach(() => {
  process.env.GMAIL_APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/test-deployment-id/exec"
  process.env.EMAIL_WEBHOOK_SECRET = "a".repeat(64)
  delete process.env.MAIL_FROM_NAME
  process.env.MAIL_REPLY_TO = "reply@example.test"
  process.env.EMAIL_REQUEST_TIMEOUT_MS = "15000"
  global.fetch = jest.fn()
})

afterEach(() => {
  restoreEnvironment()
  global.fetch = originalFetch
})

test("sends transactional email through the Gmail Apps Script relay", async () => {
  global.fetch.mockResolvedValue({
    ok: true,
    text: jest.fn().mockResolvedValue(JSON.stringify({ success: true })),
  })

  await expect(
    mailSender("student@example.test", "Course update", "<p>Ready</p>")
  ).resolves.toEqual({
    success: true,
  })

  expect(global.fetch).toHaveBeenCalledTimes(1)
  const [url, options] = global.fetch.mock.calls[0]
  expect(url).toBe(
    "https://script.google.com/macros/s/test-deployment-id/exec"
  )
  expect(options).toMatchObject({
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    redirect: "follow",
  })
  expect(JSON.parse(options.body)).toEqual({
    secret: "a".repeat(64),
    to: "student@example.test",
    subject: "Course update",
    html: "<p>Ready</p>",
    fromName: "StudyNotion",
    replyTo: "reply@example.test",
  })
  expect(options.signal).toBeInstanceOf(AbortSignal)
})

test("rejects safely when required configuration is missing", async () => {
  delete process.env.EMAIL_WEBHOOK_SECRET

  await expect(
    mailSender("student@example.test", "Subject", "Body")
  ).rejects.toMatchObject({
    statusCode: 503,
    code: "MAIL_NOT_CONFIGURED",
  })
  expect(global.fetch).not.toHaveBeenCalled()
})

test("rejects safely when the relay secret is too short", async () => {
  process.env.EMAIL_WEBHOOK_SECRET = "too-short"

  await expect(
    mailSender("student@example.test", "Subject", "Body")
  ).rejects.toMatchObject({
    statusCode: 503,
    code: "MAIL_NOT_CONFIGURED",
  })
  expect(global.fetch).not.toHaveBeenCalled()
})

test("maps a rejected provider request without reading its response body", async () => {
  const readProviderBody = jest.fn()
  global.fetch.mockResolvedValue({
    ok: false,
    status: 400,
    text: readProviderBody,
  })

  await expect(
    mailSender("student@example.test", "Subject", "Body")
  ).rejects.toMatchObject({
    statusCode: 502,
    code: "EMAIL_PROVIDER_REJECTED",
  })
  expect(readProviderBody).not.toHaveBeenCalled()
})

test("maps a relay rejection without exposing its response details", async () => {
  global.fetch.mockResolvedValue({
    ok: true,
    text: jest
      .fn()
      .mockResolvedValue(JSON.stringify({ success: false, code: "SEND_FAILED" })),
  })

  await expect(
    mailSender("student@example.test", "Subject", "Body")
  ).rejects.toMatchObject({
    statusCode: 502,
    code: "EMAIL_PROVIDER_REJECTED",
  })
})

test("rejects a non-Google relay URL", async () => {
  process.env.GMAIL_APPS_SCRIPT_URL = "https://example.com/email"

  await expect(
    mailSender("student@example.test", "Subject", "Body")
  ).rejects.toMatchObject({
    statusCode: 503,
    code: "MAIL_NOT_CONFIGURED",
  })
  expect(global.fetch).not.toHaveBeenCalled()
})

test("aborts and maps a timed-out provider request", async () => {
  process.env.EMAIL_REQUEST_TIMEOUT_MS = "5"
  global.fetch.mockImplementation(
    (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => {
            const error = new Error("aborted")
            error.name = "AbortError"
            reject(error)
          },
          { once: true }
        )
      })
  )

  await expect(
    mailSender("student@example.test", "Subject", "Body")
  ).rejects.toMatchObject({
    statusCode: 504,
    code: "EMAIL_PROVIDER_TIMEOUT",
  })
})

test("maps a network failure without returning provider details", async () => {
  global.fetch.mockRejectedValue(new TypeError("network unavailable"))

  await expect(
    mailSender("student@example.test", "Subject", "Body")
  ).rejects.toMatchObject({
    statusCode: 502,
    code: "EMAIL_PROVIDER_UNAVAILABLE",
  })
})
