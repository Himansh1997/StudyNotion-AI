const express = require("express")
const controller = require("../controllers/AI")
const { auth, isStudent } = require("../middleware/auth")
const { aiRateLimit } = require("../middleware/rateLimits")

const router = express.Router()

router.use(auth, aiRateLimit)
router.post("/quiz/generate", controller.generateQuiz)
router.get("/quiz/:quizId", controller.getQuiz)
router.post("/quiz/:quizId/submit", isStudent, controller.submitQuiz)
router.post("/summary/generate", controller.generateSummary)
router.get("/summary/:courseId", controller.getSummary)
router.post("/conversations", isStudent, controller.createConversation)
router.get("/conversations/:conversationId", isStudent, controller.getConversation)
router.post("/conversations/:conversationId/messages", isStudent, controller.addConversationMessage)
router.delete("/conversations/:conversationId", isStudent, controller.deleteConversation)
router.post("/roadmap/generate", isStudent, controller.generateRoadmap)
router.get("/roadmap/:courseId", isStudent, controller.getRoadmap)
router.delete("/roadmap/:roadmapId", isStudent, controller.deleteRoadmap)

module.exports = router
