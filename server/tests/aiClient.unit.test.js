const mockCreate = jest.fn()

jest.mock("openai", () =>
  jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }))
)

const { z } = require("zod")
const { generateStructured } = require("../services/ai/openaiClient")

const schema = z.object({ answer: z.string().min(1) })
const format = {
  type: "json_schema",
  json_schema: {
    name: "test_answer",
    strict: true,
    schema: {
      type: "object",
      properties: { answer: { type: "string" } },
      required: ["answer"],
      additionalProperties: false,
    },
  },
}
const response = (value) => ({
  choices: [{ message: { content: JSON.stringify(value) } }],
})

beforeEach(() => {
  process.env.GEMINI_API_KEY = "unit-test-key"
  process.env.GEMINI_MODEL = "gemini-test"
  mockCreate.mockReset()
})

test("falls back to JSON mode when Gemini rejects a complex schema", async () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {})
  mockCreate
    .mockRejectedValueOnce({
      status: 400,
      code: "invalid_argument",
      type: "bad_request",
    })
    .mockResolvedValueOnce(response({ answer: "Recovered" }))

  await expect(
    generateStructured({ input: [], format, schema })
  ).resolves.toEqual({
    answer: "Recovered",
  })
  expect(mockCreate.mock.calls[0][0].response_format).toBe(format)
  expect(mockCreate.mock.calls[1][0].response_format).toEqual({
    type: "json_object",
  })
  expect(mockCreate.mock.calls[1][0].messages.at(-1).content).toContain(
    '"answer"'
  )
  log.mockRestore()
})

test("regenerates once when a JSON response fails Zod validation", async () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {})
  mockCreate
    .mockResolvedValueOnce(response({ answer: "" }))
    .mockResolvedValueOnce(response({ answer: "Repaired" }))

  await expect(
    generateStructured({ input: [], format, schema })
  ).resolves.toEqual({
    answer: "Repaired",
  })
  expect(mockCreate).toHaveBeenCalledTimes(2)
  expect(mockCreate.mock.calls[1][0].response_format).toEqual({
    type: "json_object",
  })
  expect(mockCreate.mock.calls[1][0].messages.at(-1).content).toContain(
    "answer"
  )
  log.mockRestore()
})

test("uses JSON mode immediately when requested for a complex feature", async () => {
  mockCreate.mockResolvedValueOnce(response({ answer: "Roadmap-like output" }))

  await generateStructured({
    input: [],
    format,
    schema,
    preferJsonObject: true,
  })

  expect(mockCreate).toHaveBeenCalledTimes(1)
  expect(mockCreate.mock.calls[0][0].response_format).toEqual({
    type: "json_object",
  })
})
