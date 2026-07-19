const { formats } = require("../services/ai/schemas")

const collectKeys = (value, keys = new Set()) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys))
    return keys
  }
  if (!value || typeof value !== "object") return keys

  Object.entries(value).forEach(([key, nestedValue]) => {
    keys.add(key)
    collectKeys(nestedValue, keys)
  })
  return keys
}

test.each([
  ["Quiz", formats.quiz, "course_quiz"],
  ["Summary", formats.summary, "course_summary"],
  ["Doubt Solver", formats.doubt, "course_answer"],
  ["Roadmap", formats.roadmap, "learning_roadmap"],
])("%s provider schema removes unsupported Gemini keywords", (_feature, format, name) => {
  expect(format).toMatchObject({
    type: "json_schema",
    json_schema: { name, strict: true },
  })

  const keys = collectKeys(format.json_schema.schema)
  expect(keys).not.toContain("$schema")
  expect(keys).not.toContain("minLength")
  expect(keys).not.toContain("maxLength")
  expect([...keys]).toEqual(
    expect.arrayContaining(["type", "properties", "required", "additionalProperties"])
  )
})

test("provider schemas retain supported validation keywords", () => {
  const keys = collectKeys(Object.values(formats).map((format) => format.json_schema.schema))

  expect([...keys]).toEqual(
    expect.arrayContaining([
      "type",
      "properties",
      "required",
      "additionalProperties",
      "items",
      "enum",
      "minimum",
      "maximum",
      "minItems",
      "maxItems",
    ])
  )
})
