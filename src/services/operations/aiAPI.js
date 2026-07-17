import { apiConnector } from "../apiConnector"
import { aiEndpoints } from "../apis"

const authHeaders = (token) => ({ Authorization: `Bearer ${token}` })

const safeError = (error) => {
  const code = error?.response?.data?.code || "AI_REQUEST_FAILED"
  const knownMessages = {
    AI_NOT_CONFIGURED: "AI features are not configured yet.",
    AI_RATE_LIMITED: "You have reached the AI request limit. Try again later.",
    COURSE_ENROLLMENT_REQUIRED: "You must be enrolled in this course.",
    AI_UNAVAILABLE: "The AI service is temporarily unavailable.",
    AI_INVALID_RESPONSE: "The AI response could not be validated. Please retry.",
  }
  const wrapped = new Error(knownMessages[code] || "The AI request could not be completed.")
  wrapped.code = code
  throw wrapped
}

const call = async (method, url, token, data) => {
  try {
    const response = await apiConnector(method, url, data, authHeaders(token))
    return response.data
  } catch (error) {
    return safeError(error)
  }
}

export const generateQuiz = (data, token) =>
  call("POST", aiEndpoints.GENERATE_QUIZ_API, token, data)
export const submitQuiz = (quizId, answers, token) =>
  call("POST", `${aiEndpoints.QUIZ_API}/${quizId}/submit`, token, { answers })
export const generateSummary = (data, token) =>
  call("POST", aiEndpoints.GENERATE_SUMMARY_API, token, data)
export const createConversation = (data, token) =>
  call("POST", aiEndpoints.CONVERSATIONS_API, token, data)
export const addConversationMessage = (conversationId, question, token) =>
  call("POST", `${aiEndpoints.CONVERSATIONS_API}/${conversationId}/messages`, token, { question })
export const deleteConversation = (conversationId, token) =>
  call("DELETE", `${aiEndpoints.CONVERSATIONS_API}/${conversationId}`, token)
export const generateRoadmap = (data, token) =>
  call("POST", aiEndpoints.GENERATE_ROADMAP_API, token, data)
export const deleteRoadmap = (roadmapId, token) =>
  call("DELETE", `${aiEndpoints.ROADMAP_API}/${roadmapId}`, token)
