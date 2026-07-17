const { z } = require("zod")

const boundedText = (max = 4000) => z.string().min(1).max(max)
const citation = z.object({
  id: boundedText(100),
  title: boundedText(300),
  type: z.enum(["section", "lesson"]),
})

const quizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: boundedText(1000),
        options: z.array(boundedText(500)).length(4),
        correctOptionIndex: z.number().int().min(0).max(3),
        explanation: boundedText(2000),
        relatedContentTitle: boundedText(300),
      })
    )
    .min(5)
    .max(15),
})

const summarySchema = z.object({
  overview: boundedText(5000),
  learningObjectives: z.array(boundedText(500)).max(20),
  prerequisites: z.array(boundedText(500)).max(20),
  keyPoints: z.array(boundedText(700)).max(30),
  sectionSummaries: z
    .array(
      z.object({
        sectionId: boundedText(100),
        title: boundedText(300),
        summary: boundedText(3000),
      })
    )
    .max(50),
  glossary: z
    .array(z.object({ term: boundedText(200), definition: boundedText(1000) }))
    .max(40),
  revisionChecklist: z.array(boundedText(700)).max(30),
  estimatedStudyTime: boundedText(200),
})

const doubtSchema = z.object({
  answer: boundedText(8000),
  supportedByCourse: z.boolean(),
  citations: z.array(citation).max(12),
  suggestedFollowUpQuestions: z.array(boundedText(500)).max(5),
})

const roadmapSchema = z.object({
  title: boundedText(300),
  goal: boundedText(1000),
  totalWeeks: z.number().int().min(1).max(52),
  weeklyPlan: z
    .array(
      z.object({
        weekNumber: z.number().int().min(1).max(52),
        objective: boundedText(1000),
        relatedContent: z.array(citation).max(20),
        estimatedHours: z.number().min(0).max(168),
        activities: z.array(boundedText(700)).max(15),
        quizCheckpoint: boundedText(1000),
        milestone: boundedText(1000),
      })
    )
    .min(1)
    .max(52),
  finalProjectSuggestion: boundedText(3000),
  revisionStrategy: boundedText(3000),
})

const formatFor = (name, schema) => ({
  type: "json_schema",
  name,
  strict: true,
  schema: z.toJSONSchema(schema, { target: "draft-7" }),
})

module.exports = {
  quizSchema,
  summarySchema,
  doubtSchema,
  roadmapSchema,
  formats: {
    quiz: formatFor("course_quiz", quizSchema),
    summary: formatFor("course_summary", summarySchema),
    doubt: formatFor("course_answer", doubtSchema),
    roadmap: formatFor("learning_roadmap", roadmapSchema),
  },
}
