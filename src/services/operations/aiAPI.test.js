import { apiConnector } from "../apiConnector"
import { generateSummary } from "./aiAPI"

jest.mock("../apiConnector")

test.each([
  ["AI_REQUEST_REJECTED", "The AI request format was rejected. Please retry."],
  ["AI_AUTH_FAILED", "The AI service authentication failed."],
])("maps %s to a safe user-facing message", async (code, message) => {
  apiConnector.mockRejectedValueOnce({ response: { data: { code } } })

  await expect(generateSummary({ courseId: "course-id" }, "test-token")).rejects.toMatchObject({
    code,
    message,
  })
})
