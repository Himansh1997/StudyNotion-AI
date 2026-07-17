const crypto = require("crypto")

const AIQuiz = require("../models/AIQuiz")
const AISummary = require("../models/AISummary")
const AIConversation = require("../models/AIConversation")
const LearningRoadmap = require("../models/LearningRoadmap")
const ApiError = require("../utils/ApiError")
const { requireAiCourseAccess } = require("../utils/courseAccess")
const {
  requireObjectId,
  optionalObjectId,
  requireString,
  requireEnum,
  requireNumber,
} = require("../utils/validation")
const { buildCourseContext, validateReferences } = require("../services/ai/contextBuilder")
const { generateStructured } = require("../services/ai/openaiClient")
const { formats, quizSchema, summarySchema, doubtSchema, roadmapSchema } = require("../services/ai/schemas")
const { quizPrompt, summaryPrompt, doubtPrompt, roadmapPrompt } = require("../services/ai/prompts")

const sha256 = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex")

const getAiContext = async (req, feature, source = req.body) => {
  const courseId = requireObjectId(source.courseId, "courseId")
  const sectionId = optionalObjectId(source.sectionId, "sectionId")
  const subSectionId = optionalObjectId(source.subSectionId, "subSectionId")
  const access = await requireAiCourseAccess({ courseId, user: req.user, feature })
  return {
    courseId,
    sectionId,
    subSectionId,
    ...access,
    ...buildCourseContext({ ...access, sectionId, subSectionId }),
  }
}

const publicQuiz = (quiz) => ({
  id: String(quiz._id),
  courseId: String(quiz.courseId),
  sectionId: quiz.sectionId ? String(quiz.sectionId) : null,
  subSectionId: quiz.subSectionId ? String(quiz.subSectionId) : null,
  difficulty: quiz.difficulty,
  questionCount: quiz.questionCount,
  generatedAt: quiz.createdAt,
  questions: quiz.questions.map((item) => ({
    id: String(item._id),
    question: item.question,
    options: item.options,
    relatedContentTitle: item.relatedContentTitle,
  })),
})

exports.generateQuiz = async (req, res, next) => {
  try {
    const questionCount = requireNumber(req.body.questionCount ?? 5, "questionCount", {
      min: 5,
      max: 15,
      integer: true,
    })
    const difficulty = requireEnum(req.body.difficulty ?? "Medium", "difficulty", [
      "Easy",
      "Medium",
      "Hard",
    ])
    const ai = await getAiContext(req, "quiz")
    const scope = {
      ownerId: req.user.id,
      courseId: ai.courseId,
      sectionId: ai.sectionId || null,
      subSectionId: ai.subSectionId || null,
      questionCount,
      difficulty,
      sourceContentHash: ai.sourceContentHash,
    }
    let quiz = await AIQuiz.findOne(scope).sort({ createdAt: -1 })
    let cached = true
    if (!quiz) {
      cached = false
      const generated = await generateStructured({
        input: quizPrompt({ context: ai.context, difficulty, questionCount }),
        format: formats.quiz,
        schema: quizSchema,
      })
      if (generated.questions.length !== questionCount) {
        throw new ApiError(502, "The AI service returned the wrong number of questions", "AI_INVALID_RESPONSE")
      }
      const titles = new Set([...ai.references.values()].map((item) => item.title))
      if (generated.questions.some((question) => !titles.has(question.relatedContentTitle))) {
        throw new ApiError(502, "The AI service returned an invalid course reference", "AI_INVALID_RESPONSE")
      }
      quiz = await AIQuiz.create({ ...scope, questions: generated.questions })
    }
    res.status(cached ? 200 : 201).json({ success: true, cached, quiz: publicQuiz(quiz) })
  } catch (error) {
    next(error)
  }
}

exports.getQuiz = async (req, res, next) => {
  try {
    requireObjectId(req.params.quizId, "quizId")
    const quiz = await AIQuiz.findOne({ _id: req.params.quizId, ownerId: req.user.id })
    if (!quiz) throw new ApiError(404, "Quiz not found", "QUIZ_NOT_FOUND")
    await requireAiCourseAccess({ courseId: quiz.courseId, user: req.user, feature: "quiz" })
    res.status(200).json({ success: true, quiz: publicQuiz(quiz) })
  } catch (error) {
    next(error)
  }
}

exports.submitQuiz = async (req, res, next) => {
  try {
    requireObjectId(req.params.quizId, "quizId")
    const quiz = await AIQuiz.findOne({ _id: req.params.quizId, ownerId: req.user.id })
    if (!quiz) throw new ApiError(404, "Quiz not found", "QUIZ_NOT_FOUND")
    if (!Array.isArray(req.body.answers) || req.body.answers.length !== quiz.questions.length) {
      throw new ApiError(400, "One answer is required for every question", "VALIDATION_ERROR")
    }
    const answers = req.body.answers.map((answer) =>
      requireNumber(answer, "answer", { min: 0, max: 3, integer: true })
    )
    const results = quiz.questions.map((question, index) => ({
      questionId: String(question._id),
      selectedOptionIndex: answers[index],
      correctOptionIndex: question.correctOptionIndex,
      correct: answers[index] === question.correctOptionIndex,
      explanation: question.explanation,
    }))
    const score = results.filter((result) => result.correct).length
    const percentage = Math.round((score / results.length) * 10000) / 100
    quiz.attempts.push({ userId: req.user.id, answers, score, percentage })
    await quiz.save()
    res.status(200).json({ success: true, score, total: results.length, percentage, results })
  } catch (error) {
    next(error)
  }
}

exports.generateSummary = async (req, res, next) => {
  try {
    const forceRegenerate = req.body.forceRegenerate === true
    const ai = await getAiContext(req, "summary")
    let summary = !forceRegenerate
      ? await AISummary.findOne({ courseId: ai.courseId, sourceContentHash: ai.sourceContentHash })
      : null
    let cached = Boolean(summary)
    if (!summary) {
      const generated = await generateStructured({
        input: summaryPrompt({ context: ai.context }),
        format: formats.summary,
        schema: summarySchema,
        maxOutputTokens: 8000,
      })
      generated.sectionSummaries = generated.sectionSummaries.map((item) => {
        const trusted = ai.references.get(String(item.sectionId))
        if (!trusted || trusted.type !== "section") {
          throw new ApiError(502, "The AI service returned an invalid section", "AI_INVALID_RESPONSE")
        }
        return { ...item, title: trusted.title }
      })
      summary = await AISummary.findOneAndUpdate(
        { courseId: ai.courseId, sourceContentHash: ai.sourceContentHash },
        { ...generated, generatedAt: new Date() },
        { upsert: true, new: true, runValidators: true }
      )
      cached = false
    }
    res.status(200).json({
      success: true,
      cached,
      notice: "Based on available course titles and descriptions; video transcripts are not included.",
      summary,
    })
  } catch (error) {
    next(error)
  }
}

exports.getSummary = async (req, res, next) => {
  try {
    const ai = await getAiContext(req, "summary", { courseId: req.params.courseId })
    const summary = await AISummary.findOne({
      courseId: ai.courseId,
      sourceContentHash: ai.sourceContentHash,
    })
    if (!summary) throw new ApiError(404, "No current summary has been generated", "SUMMARY_NOT_FOUND")
    res.status(200).json({
      success: true,
      notice: "Based on available course titles and descriptions; video transcripts are not included.",
      summary,
    })
  } catch (error) {
    next(error)
  }
}

const answerDoubt = async ({ ai, question, history }) => {
  const generated = await generateStructured({
    input: doubtPrompt({ context: ai.context, history, question }),
    format: formats.doubt,
    schema: doubtSchema,
    maxOutputTokens: 5000,
  })
  return { ...generated, citations: validateReferences(generated.citations, ai.references) }
}

exports.createConversation = async (req, res, next) => {
  try {
    const question = requireString(req.body.question, "question", { min: 2, max: 2000 })
    const ai = await getAiContext(req, "doubt")
    const answer = await answerDoubt({ ai, question, history: [] })
    const conversation = await AIConversation.create({
      userId: req.user.id,
      courseId: ai.courseId,
      sectionId: ai.sectionId,
      subSectionId: ai.subSectionId,
      title: question.slice(0, 100),
      messages: [
        { role: "user", content: question },
        {
          role: "assistant",
          content: answer.answer,
          citations: answer.citations,
          suggestedFollowUpQuestions: answer.suggestedFollowUpQuestions,
        },
      ],
    })
    res.status(201).json({
      success: true,
      conversationId: String(conversation._id),
      answer: answer.answer,
      supportedByCourse: answer.supportedByCourse,
      citations: answer.citations,
      suggestedFollowUpQuestions: answer.suggestedFollowUpQuestions,
    })
  } catch (error) {
    next(error)
  }
}

exports.getConversation = async (req, res, next) => {
  try {
    requireObjectId(req.params.conversationId, "conversationId")
    const conversation = await AIConversation.findOne({
      _id: req.params.conversationId,
      userId: req.user.id,
    })
    if (!conversation) throw new ApiError(404, "Conversation not found", "CONVERSATION_NOT_FOUND")
    res.status(200).json({ success: true, conversation })
  } catch (error) {
    next(error)
  }
}

exports.addConversationMessage = async (req, res, next) => {
  try {
    requireObjectId(req.params.conversationId, "conversationId")
    const question = requireString(req.body.question, "question", { min: 2, max: 2000 })
    const conversation = await AIConversation.findOne({
      _id: req.params.conversationId,
      userId: req.user.id,
    })
    if (!conversation) throw new ApiError(404, "Conversation not found", "CONVERSATION_NOT_FOUND")
    const ai = await getAiContext(req, "doubt", {
      courseId: conversation.courseId,
      sectionId: conversation.sectionId,
      subSectionId: conversation.subSectionId,
    })
    const history = conversation.messages.slice(-12).map((message) => ({
      role: message.role,
      content: message.content.slice(0, 2000),
    }))
    const answer = await answerDoubt({ ai, question, history })
    conversation.messages.push(
      { role: "user", content: question },
      {
        role: "assistant",
        content: answer.answer,
        citations: answer.citations,
        suggestedFollowUpQuestions: answer.suggestedFollowUpQuestions,
      }
    )
    if (conversation.messages.length > 100) conversation.messages = conversation.messages.slice(-100)
    await conversation.save()
    res.status(200).json({
      success: true,
      conversationId: String(conversation._id),
      answer: answer.answer,
      supportedByCourse: answer.supportedByCourse,
      citations: answer.citations,
      suggestedFollowUpQuestions: answer.suggestedFollowUpQuestions,
    })
  } catch (error) {
    next(error)
  }
}

exports.deleteConversation = async (req, res, next) => {
  try {
    requireObjectId(req.params.conversationId, "conversationId")
    const result = await AIConversation.deleteOne({
      _id: req.params.conversationId,
      userId: req.user.id,
    })
    if (!result.deletedCount) throw new ApiError(404, "Conversation not found", "CONVERSATION_NOT_FOUND")
    res.status(200).json({ success: true, message: "Conversation deleted" })
  } catch (error) {
    next(error)
  }
}

const roadmapInputs = (body) => {
  const currentLevel = requireEnum(body.currentLevel, "currentLevel", [
    "Beginner",
    "Intermediate",
    "Advanced",
  ])
  const learningGoal = requireString(body.learningGoal, "learningGoal", { min: 5, max: 1000 })
  const hoursPerWeek = requireNumber(body.hoursPerWeek, "hoursPerWeek", { min: 1, max: 80 })
  let targetDate
  if (body.targetDate) {
    targetDate = new Date(body.targetDate)
    const max = new Date()
    max.setFullYear(max.getFullYear() + 5)
    if (Number.isNaN(targetDate.getTime()) || targetDate <= new Date() || targetDate > max) {
      throw new ApiError(400, "targetDate must be a future date within five years", "VALIDATION_ERROR")
    }
  }
  return { currentLevel, learningGoal, hoursPerWeek, targetDate }
}

exports.generateRoadmap = async (req, res, next) => {
  try {
    const inputs = roadmapInputs(req.body)
    const ai = await getAiContext(req, "roadmap")
    const inputHash = sha256({ ...inputs, targetDate: inputs.targetDate?.toISOString() || null })
    const cacheKey = {
      userId: req.user.id,
      courseId: ai.courseId,
      inputHash,
      progressHash: ai.progressHash,
      sourceContentHash: ai.sourceContentHash,
    }
    let roadmap = await LearningRoadmap.findOne(cacheKey).sort({ createdAt: -1 })
    let cached = Boolean(roadmap)
    if (!roadmap) {
      const generated = await generateStructured({
        input: roadmapPrompt({ context: ai.context, inputs, progress: ai.progress }),
        format: formats.roadmap,
        schema: roadmapSchema,
        maxOutputTokens: 10_000,
      })
      if (generated.weeklyPlan.length !== generated.totalWeeks) {
        throw new ApiError(502, "The AI service returned an invalid roadmap", "AI_INVALID_RESPONSE")
      }
      const maxWeeks = inputs.targetDate
        ? Math.max(1, Math.ceil((inputs.targetDate - Date.now()) / (7 * 24 * 60 * 60 * 1000)))
        : 52
      generated.weeklyPlan = generated.weeklyPlan.map((week, index) => {
        if (
          week.weekNumber !== index + 1 ||
          week.estimatedHours > inputs.hoursPerWeek ||
          generated.totalWeeks > maxWeeks
        ) {
          throw new ApiError(502, "The AI service returned an invalid roadmap schedule", "AI_INVALID_RESPONSE")
        }
        return { ...week, relatedContent: validateReferences(week.relatedContent, ai.references) }
      })
      roadmap = await LearningRoadmap.create({
        ...cacheKey,
        ...inputs,
        ...generated,
        currentProgressPercentage: ai.progress.percentage,
        generatedAt: new Date(),
      })
      cached = false
    }
    res.status(200).json({ success: true, cached, roadmap })
  } catch (error) {
    next(error)
  }
}

exports.getRoadmap = async (req, res, next) => {
  try {
    const ai = await getAiContext(req, "roadmap", { courseId: req.params.courseId })
    const roadmap = await LearningRoadmap.findOne({
      userId: req.user.id,
      courseId: ai.courseId,
      progressHash: ai.progressHash,
      sourceContentHash: ai.sourceContentHash,
    }).sort({ createdAt: -1 })
    if (!roadmap) throw new ApiError(404, "No current roadmap has been generated", "ROADMAP_NOT_FOUND")
    res.status(200).json({ success: true, roadmap })
  } catch (error) {
    next(error)
  }
}

exports.deleteRoadmap = async (req, res, next) => {
  try {
    requireObjectId(req.params.roadmapId, "roadmapId")
    const result = await LearningRoadmap.deleteOne({ _id: req.params.roadmapId, userId: req.user.id })
    if (!result.deletedCount) throw new ApiError(404, "Roadmap not found", "ROADMAP_NOT_FOUND")
    res.status(200).json({ success: true, message: "Roadmap deleted" })
  } catch (error) {
    next(error)
  }
}
