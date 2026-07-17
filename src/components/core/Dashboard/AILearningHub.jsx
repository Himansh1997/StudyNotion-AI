import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import ReactMarkdown from "react-markdown"
import { useSelector } from "react-redux"
import { useSearchParams } from "react-router-dom"

import {
  addConversationMessage,
  createConversation,
  generateQuiz,
  generateRoadmap,
  generateSummary,
  submitQuiz,
} from "../../../services/operations/aiAPI"
import { getUserEnrolledCourses } from "../../../services/operations/profileAPI"

const tabs = ["Quiz", "Summary", "Doubt Solver", "Roadmap"]
const fieldClass =
  "w-full rounded-md border border-richblack-600 bg-richblack-700 px-3 py-2 text-richblack-5 outline-none focus:border-yellow-50 focus:ring-2 focus:ring-yellow-50/30"
const buttonClass =
  "rounded-md bg-yellow-50 px-4 py-2 font-semibold text-richblack-900 transition hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-25 disabled:cursor-not-allowed disabled:opacity-50"

const Notice = () => (
  <p className="rounded-md border border-yellow-700 bg-yellow-900/30 p-3 text-sm text-yellow-25">
    AI can make mistakes. Results use available course titles and descriptions,
    not video transcripts.
  </p>
)

const Status = ({ loading, error, onRetry }) => {
  if (loading) {
    return (
      <div
        data-testid="ai-loading"
        className="flex items-center gap-3 py-8 text-richblack-100"
      >
        <div className="spinner h-8 w-8 border-4" /> Generating a grounded
        response…
      </div>
    )
  }
  if (error) {
    return (
      <div
        role="alert"
        className="mt-4 rounded-md border border-pink-500 bg-pink-900/20 p-4 text-pink-25"
      >
        <p>{error}</p>
        {onRetry && (
          <button
            className="mt-3 underline focus:outline-none focus:ring-2 focus:ring-yellow-50"
            onClick={onRetry}
          >
            Retry
          </button>
        )}
      </div>
    )
  }
  return null
}

export default function AILearningHub() {
  const { token } = useSelector((state) => state.auth)
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState(
    requestedTab === "doubt" ? "Doubt Solver" : "Quiz"
  )
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState(searchParams.get("courseId") || "")
  const [courseLoading, setCourseLoading] = useState(true)
  const [courseError, setCourseError] = useState("")

  const selectedCourse = useMemo(
    () => courses.find((course) => course._id === courseId),
    [courses, courseId]
  )

  const loadCourses = async () => {
    setCourseLoading(true)
    setCourseError("")
    try {
      const result = await getUserEnrolledCourses(token)
      const published = result.filter((course) => course.status !== "Draft")
      setCourses(published)
      setCourseId((current) =>
        published.some((course) => course._id === current)
          ? current
          : published[0]?._id || ""
      )
    } catch {
      setCourseError("Enrolled courses could not be loaded.")
    } finally {
      setCourseLoading(false)
    }
  }

  useEffect(() => {
    loadCourses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <section className="space-y-6 text-richblack-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-yellow-50">
          Study smarter
        </p>
        <h1 className="mt-1 text-3xl font-semibold">AI Learning Hub</h1>
        <p className="mt-2 text-richblack-300">
          Quiz yourself, revise, ask questions, and plan your next steps.
        </p>
      </div>
      <Notice />
      <Status
        loading={courseLoading}
        error={courseError}
        onRetry={loadCourses}
      />
      {!courseLoading && !courseError && !courses.length && (
        <div className="rounded-lg border border-richblack-700 bg-richblack-800 p-8 text-center text-richblack-200">
          Enroll in a published course to use the AI Learning Hub.
        </div>
      )}
      {!!courses.length && (
        <>
          <label className="block max-w-xl text-sm font-medium">
            Enrolled course
            <select
              className={`${fieldClass} mt-2`}
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
            >
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.courseName}
                </option>
              ))}
            </select>
          </label>
          <div
            role="tablist"
            aria-label="AI learning tools"
            className="grid grid-cols-2 gap-2 md:grid-cols-4"
          >
            {tabs.map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                className={`rounded-lg border px-3 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-50 ${
                  activeTab === tab
                    ? "border-yellow-50 bg-yellow-900/30 text-yellow-25"
                    : "border-richblack-700 bg-richblack-800 text-richblack-200 hover:border-richblack-500"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-richblack-700 bg-richblack-800 p-4 sm:p-6">
            {activeTab === "Quiz" && (
              <QuizTab course={selectedCourse} token={token} />
            )}
            {activeTab === "Summary" && (
              <SummaryTab courseId={courseId} token={token} />
            )}
            {activeTab === "Doubt Solver" && (
              <DoubtTab
                course={selectedCourse}
                token={token}
                initialSectionId={searchParams.get("sectionId") || ""}
                initialSubSectionId={searchParams.get("subSectionId") || ""}
              />
            )}
            {activeTab === "Roadmap" && (
              <RoadmapTab courseId={courseId} token={token} />
            )}
          </div>
        </>
      )}
    </section>
  )
}

function ScopeFields({
  course,
  sectionId,
  setSectionId,
  subSectionId,
  setSubSectionId,
}) {
  const section = course?.courseContent?.find((item) => item._id === sectionId)
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-sm">
        Section scope (optional)
        <select
          className={`${fieldClass} mt-2`}
          value={sectionId}
          onChange={(event) => {
            setSectionId(event.target.value)
            setSubSectionId("")
          }}
        >
          <option value="">Whole course</option>
          {course?.courseContent?.map((item) => (
            <option key={item._id} value={item._id}>
              {item.sectionName}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Lesson scope (optional)
        <select
          className={`${fieldClass} mt-2`}
          value={subSectionId}
          onChange={(event) => setSubSectionId(event.target.value)}
          disabled={!sectionId}
        >
          <option value="">All lessons in section</option>
          {section?.subSection?.map((item) => (
            <option key={item._id} value={item._id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function QuizTab({ course, token }) {
  const [sectionId, setSectionId] = useState("")
  const [subSectionId, setSubSectionId] = useState("")
  const [difficulty, setDifficulty] = useState("Medium")
  const [questionCount, setQuestionCount] = useState(5)
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setQuiz(null)
    setResult(null)
    setAnswers({})
  }, [course?._id])

  const create = async () => {
    setLoading(true)
    setError("")
    try {
      const data = await generateQuiz(
        {
          courseId: course._id,
          sectionId: sectionId || undefined,
          subSectionId: subSectionId || undefined,
          difficulty,
          questionCount: Number(questionCount),
        },
        token
      )
      setQuiz(data.quiz)
      setAnswers({})
      setResult(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const submit = async () => {
    if (Object.keys(answers).length !== quiz.questions.length) {
      return toast.error("Answer every question before submitting.")
    }
    if (!window.confirm("Submit your answers for grading?")) return
    setLoading(true)
    setError("")
    try {
      setResult(
        await submitQuiz(
          quiz.id,
          quiz.questions.map((_, index) => answers[index]),
          token
        )
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">AI Quiz Generator</h2>
      {!quiz && (
        <>
          <ScopeFields
            {...{
              course,
              sectionId,
              setSectionId,
              subSectionId,
              setSubSectionId,
            }}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              Difficulty
              <select
                className={`${fieldClass} mt-2`}
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                {["Easy", "Medium", "Hard"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Questions
              <input
                className={`${fieldClass} mt-2`}
                type="number"
                min="5"
                max="15"
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
              />
            </label>
          </div>
          <button className={buttonClass} disabled={loading} onClick={create}>
            Generate quiz
          </button>
        </>
      )}
      <Status
        loading={loading}
        error={error}
        onRetry={quiz ? submit : create}
      />
      {quiz &&
        quiz.questions.map((question, questionIndex) => {
          const graded = result?.results?.[questionIndex]
          return (
            <fieldset
              key={question.id}
              className="rounded-lg border border-richblack-600 p-4"
            >
              <legend className="px-2 font-semibold">
                {questionIndex + 1}. {question.question}
              </legend>
              <div className="mt-3 space-y-2">
                {question.options.map((option, optionIndex) => {
                  const selected = answers[questionIndex] === optionIndex
                  const correct = graded?.correctOptionIndex === optionIndex
                  const incorrect = graded && selected && !correct
                  return (
                    <label
                      key={option}
                      className={`flex cursor-pointer gap-3 rounded-md border p-3 ${
                        correct
                          ? "border-caribbeangreen-200 bg-caribbeangreen-900/30"
                          : incorrect
                          ? "border-pink-300 bg-pink-900/30"
                          : selected
                          ? "border-yellow-50 bg-yellow-900/20"
                          : "border-richblack-600"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${questionIndex}`}
                        checked={selected}
                        disabled={Boolean(result)}
                        onChange={() =>
                          setAnswers((current) => ({
                            ...current,
                            [questionIndex]: optionIndex,
                          }))
                        }
                      />
                      {option}
                    </label>
                  )
                })}
              </div>
              {graded && (
                <p className="mt-3 text-sm text-richblack-100">
                  <strong>Explanation:</strong> {graded.explanation}
                </p>
              )}
            </fieldset>
          )
        })}
      {quiz && !result && (
        <div className="flex gap-3">
          <button className={buttonClass} disabled={loading} onClick={submit}>
            Submit answers
          </button>
          <button
            className="text-richblack-200 underline"
            onClick={() => setQuiz(null)}
          >
            New quiz
          </button>
        </div>
      )}
      {result && (
        <div className="rounded-lg bg-richblack-700 p-4 text-lg font-semibold text-yellow-25">
          Score: {result.score}/{result.total} ({result.percentage}%)
        </div>
      )}
    </div>
  )
}

function SummaryTab({ courseId, token }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    setSummary(null)
    setError("")
  }, [courseId])
  const generate = async (forceRegenerate = false) => {
    setLoading(true)
    setError("")
    try {
      setSummary(
        (await generateSummary({ courseId, forceRegenerate }, token)).summary
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">AI Course Summary</h2>
      {!summary && (
        <button
          className={buttonClass}
          disabled={loading}
          onClick={() => generate(false)}
        >
          Generate summary
        </button>
      )}
      <Status loading={loading} error={error} onRetry={() => generate(false)} />
      {summary && (
        <div className="space-y-5">
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{summary.overview}</ReactMarkdown>
          </div>
          <List
            title="Learning objectives"
            items={summary.learningObjectives}
          />
          <List title="Prerequisites" items={summary.prerequisites} />
          <List title="Key points" items={summary.keyPoints} />
          <div>
            <h3 className="font-semibold text-yellow-25">Sections</h3>
            {summary.sectionSummaries.map((section) => (
              <div
                key={section.sectionId}
                className="mt-3 rounded-md bg-richblack-700 p-3"
              >
                <h4 className="font-semibold">{section.title}</h4>
                <p className="mt-1 text-richblack-100">{section.summary}</p>
              </div>
            ))}
          </div>
          <div>
            <h3 className="font-semibold text-yellow-25">Glossary</h3>
            {summary.glossary.map((item) => (
              <p key={item.term} className="mt-2">
                <strong>{item.term}:</strong> {item.definition}
              </p>
            ))}
          </div>
          <List title="Revision checklist" items={summary.revisionChecklist} />
          <p>
            <strong>Estimated study time:</strong> {summary.estimatedStudyTime}
          </p>
          <button
            className={buttonClass}
            disabled={loading}
            onClick={() => generate(true)}
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  )
}

const List = ({ title, items = [] }) => (
  <div>
    <h3 className="font-semibold text-yellow-25">{title}</h3>
    <ul className="mt-2 list-disc space-y-1 pl-5 text-richblack-100">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  </div>
)

function DoubtTab({ course, token, initialSectionId, initialSubSectionId }) {
  const [sectionId, setSectionId] = useState(initialSectionId)
  const [subSectionId, setSubSectionId] = useState(initialSubSectionId)
  const [question, setQuestion] = useState("")
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const ask = async () => {
    if (!question.trim()) return
    const asked = question.trim()
    setLoading(true)
    setError("")
    setQuestion("")
    try {
      const response = conversationId
        ? await addConversationMessage(conversationId, asked, token)
        : await createConversation(
            {
              courseId: course._id,
              sectionId: sectionId || undefined,
              subSectionId: subSectionId || undefined,
              question: asked,
            },
            token
          )
      setConversationId(response.conversationId)
      setMessages((current) => [
        ...current,
        { role: "user", content: asked },
        {
          role: "assistant",
          content: response.answer,
          citations: response.citations,
        },
      ])
    } catch (err) {
      setQuestion(asked)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  const reset = () => {
    setConversationId(null)
    setMessages([])
    setQuestion("")
    setError("")
  }
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Ask AI</h2>
        {messages.length > 0 && (
          <button className="text-sm underline" onClick={reset}>
            New conversation
          </button>
        )}
      </div>
      {!conversationId && (
        <ScopeFields
          {...{
            course,
            sectionId,
            setSectionId,
            subSectionId,
            setSubSectionId,
          }}
        />
      )}
      {!messages.length && (
        <p className="rounded-md bg-richblack-700 p-5 text-center text-richblack-200">
          Ask about a concept from this course. The assistant will cite matching
          sections or lessons.
        </p>
      )}
      <div className="space-y-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`rounded-lg p-4 ${
              message.role === "user"
                ? "ml-auto max-w-[85%] bg-yellow-900/40"
                : "mr-auto max-w-[95%] bg-richblack-700"
            }`}
          >
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
            {message.citations?.length > 0 && (
              <p className="mt-3 text-xs text-richblack-300">
                Sources:{" "}
                {message.citations.map((item) => item.title).join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>
      <Status loading={loading} error={error} onRetry={ask} />
      <label className="block text-sm">
        Your question
        <textarea
          className={`${fieldClass} mt-2 min-h-[100px]`}
          maxLength="2000"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Explain this concept using the course material…"
        />
      </label>
      <button
        className={buttonClass}
        disabled={loading || !question.trim()}
        onClick={ask}
      >
        Ask AI
      </button>
    </div>
  )
}

function RoadmapTab({ courseId, token }) {
  const [form, setForm] = useState({
    currentLevel: "Beginner",
    learningGoal: "",
    hoursPerWeek: 5,
    targetDate: "",
  })
  const [roadmap, setRoadmap] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    setRoadmap(null)
    setError("")
  }, [courseId])
  const generate = async () => {
    setLoading(true)
    setError("")
    try {
      setRoadmap(
        (
          await generateRoadmap(
            {
              courseId,
              ...form,
              hoursPerWeek: Number(form.hoursPerWeek),
              targetDate: form.targetDate || undefined,
            },
            token
          )
        ).roadmap
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }))
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">AI Learning Roadmap</h2>
      {!roadmap && (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            Current level
            <select
              className={`${fieldClass} mt-2`}
              value={form.currentLevel}
              onChange={update("currentLevel")}
            >
              {["Beginner", "Intermediate", "Advanced"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Hours per week
            <input
              className={`${fieldClass} mt-2`}
              type="number"
              min="1"
              max="80"
              value={form.hoursPerWeek}
              onChange={update("hoursPerWeek")}
            />
          </label>
          <label className="text-sm md:col-span-2">
            Learning goal
            <textarea
              className={`${fieldClass} mt-2`}
              maxLength="1000"
              value={form.learningGoal}
              onChange={update("learningGoal")}
            />
          </label>
          <label className="text-sm">
            Target date (optional)
            <input
              className={`${fieldClass} mt-2`}
              type="date"
              value={form.targetDate}
              onChange={update("targetDate")}
            />
          </label>
        </div>
      )}
      {!roadmap && (
        <button
          className={buttonClass}
          disabled={loading || form.learningGoal.trim().length < 5}
          onClick={generate}
        >
          Generate roadmap
        </button>
      )}
      <Status loading={loading} error={error} onRetry={generate} />
      {roadmap && (
        <div className="space-y-5">
          <div>
            <h3 className="text-2xl font-semibold text-yellow-25">
              {roadmap.title}
            </h3>
            <p className="mt-2 text-richblack-100">{roadmap.goal}</p>
            <p className="mt-2 text-sm">
              Current progress: {roadmap.currentProgressPercentage}% ·{" "}
              {roadmap.totalWeeks} weeks
            </p>
          </div>
          {roadmap.weeklyPlan.map((week) => (
            <article
              key={week.weekNumber}
              className="rounded-lg border border-richblack-600 p-4"
            >
              <h4 className="font-semibold text-yellow-25">
                Week {week.weekNumber}: {week.objective}
              </h4>
              <p className="mt-1 text-sm">Up to {week.estimatedHours} hours</p>
              {week.relatedContent?.length > 0 && (
                <p className="mt-2 text-sm text-richblack-200">
                  <strong>Course content:</strong>{" "}
                  {week.relatedContent.map((item) => item.title).join(", ")}
                </p>
              )}
              <List title="Activities" items={week.activities} />
              <p className="mt-3">
                <strong>Checkpoint:</strong> {week.quizCheckpoint}
              </p>
              <p>
                <strong>Milestone:</strong> {week.milestone}
              </p>
            </article>
          ))}
          <div>
            <h3 className="font-semibold text-yellow-25">Final project</h3>
            <p>{roadmap.finalProjectSuggestion}</p>
          </div>
          <div>
            <h3 className="font-semibold text-yellow-25">Revision strategy</h3>
            <p>{roadmap.revisionStrategy}</p>
          </div>
          <button className={buttonClass} onClick={() => setRoadmap(null)}>
            Create a new plan
          </button>
        </div>
      )}
    </div>
  )
}
