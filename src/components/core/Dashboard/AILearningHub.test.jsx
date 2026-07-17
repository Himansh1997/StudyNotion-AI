import { configureStore } from "@reduxjs/toolkit"

import "@testing-library/jest-dom"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { Provider } from "react-redux"
import { MemoryRouter } from "react-router-dom"

import {
  generateQuiz,
  generateRoadmap,
  generateSummary,
} from "../../../services/operations/aiAPI"
import { getUserEnrolledCourses } from "../../../services/operations/profileAPI"
import authReducer from "../../../slices/authSlice"
import profileReducer from "../../../slices/profileSlice"
import AILearningHub from "./AILearningHub"

jest.mock("../../../services/operations/aiAPI")
jest.mock("../../../services/operations/profileAPI")
jest.mock("react-markdown", () => ({ children }) => <div>{children}</div>)

const course = {
  _id: "course-1",
  courseName: "Secure Course",
  status: "Published",
  courseContent: [
    {
      _id: "section-1",
      sectionName: "Core concepts",
      subSection: [{ _id: "lesson-1", title: "First lesson" }],
    },
  ],
}

const renderHub = (entry = "/dashboard/ai-learning") => {
  const store = configureStore({
    reducer: { auth: authReducer, profile: profileReducer },
    preloadedState: {
      auth: { token: "test-token", signupData: null, loading: false },
      profile: { user: { accountType: "Student" }, loading: false },
    },
  })
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[entry]}>
        <AILearningHub />
      </MemoryRouter>
    </Provider>
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  getUserEnrolledCourses.mockResolvedValue([course])
})

test("renders the AI Learning Hub and enrolled course", async () => {
  renderHub()
  expect(
    screen.getByRole("heading", { name: "AI Learning Hub" })
  ).toBeInTheDocument()
  expect(screen.getByTestId("ai-loading")).toBeInTheDocument()
  expect(
    await screen.findByRole("option", { name: "Secure Course" })
  ).toBeInTheDocument()
  expect(screen.getByRole("tab", { name: "Quiz" })).toHaveAttribute(
    "aria-selected",
    "true"
  )
})

test("shows a safe course-loading error with retry", async () => {
  getUserEnrolledCourses.mockRejectedValueOnce(
    new Error("raw provider details")
  )
  renderHub()
  const alert = await screen.findByRole("alert")
  expect(alert).toHaveTextContent("Enrolled courses could not be loaded")
  expect(alert).not.toHaveTextContent("raw provider details")
  expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
})

test("quiz does not reveal answers or explanations before submission", async () => {
  generateQuiz.mockResolvedValue({
    quiz: {
      id: "quiz-1",
      questions: [
        {
          id: "question-1",
          question: "Which choice is grounded?",
          options: ["A", "B", "C", "D"],
          relatedContentTitle: "Core concepts",
        },
      ],
    },
  })
  renderHub()
  await screen.findByRole("option", { name: "Secure Course" })
  fireEvent.click(screen.getByRole("button", { name: "Generate quiz" }))
  expect(
    await screen.findByRole("group", { name: /Which choice is grounded/ })
  ).toBeInTheDocument()
  expect(screen.queryByText(/Explanation:/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/correct option/i)).not.toBeInTheDocument()
})

test("renders successful summary and roadmap output", async () => {
  generateSummary.mockResolvedValue({
    summary: {
      overview: "A grounded overview",
      learningObjectives: ["Objective one"],
      prerequisites: ["Prerequisite one"],
      keyPoints: ["Key point one"],
      sectionSummaries: [
        {
          sectionId: "section-1",
          title: "Core concepts",
          summary: "Section summary",
        },
      ],
      glossary: [{ term: "Grounding", definition: "Using trusted context" }],
      revisionChecklist: ["Review the lesson"],
      estimatedStudyTime: "2 hours",
    },
  })
  generateRoadmap.mockResolvedValue({
    roadmap: {
      title: "Personal roadmap",
      goal: "Finish the course",
      currentProgressPercentage: 25,
      totalWeeks: 1,
      weeklyPlan: [
        {
          weekNumber: 1,
          objective: "Review core concepts",
          estimatedHours: 4,
          activities: ["Read descriptions"],
          quizCheckpoint: "Take a quiz",
          milestone: "Core concepts reviewed",
        },
      ],
      finalProjectSuggestion: "Build a checklist",
      revisionStrategy: "Use spaced repetition",
    },
  })
  renderHub()
  await screen.findByRole("option", { name: "Secure Course" })

  fireEvent.click(screen.getByRole("tab", { name: "Summary" }))
  fireEvent.click(screen.getByRole("button", { name: "Generate summary" }))
  expect(await screen.findByText("A grounded overview")).toBeInTheDocument()
  expect(screen.getByText("Objective one")).toBeInTheDocument()

  fireEvent.click(screen.getByRole("tab", { name: "Roadmap" }))
  fireEvent.change(screen.getByLabelText("Learning goal"), {
    target: { value: "Finish the secure course" },
  })
  fireEvent.click(screen.getByRole("button", { name: "Generate roadmap" }))
  expect(await screen.findByText("Personal roadmap")).toBeInTheDocument()
  expect(screen.getByText(/Current progress: 25%/)).toBeInTheDocument()
})
