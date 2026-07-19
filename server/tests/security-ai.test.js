const mockResponsesCreate = jest.fn()
const mockRazorpayOrderCreate = jest.fn()

jest.mock("openai", () =>
  jest.fn().mockImplementation(() => ({ responses: { create: mockResponsesCreate } }))
)

jest.mock("../config/razorpay", () => ({
  getRazorpay: () => ({ orders: { create: mockRazorpayOrderCreate } }),
}))

const bcrypt = require("bcryptjs")
const crypto = require("crypto")
const jwt = require("jsonwebtoken")
const request = require("supertest")

const app = require("../app")
const User = require("../models/User")
const Profile = require("../models/Profile")
const Course = require("../models/Course")
const Section = require("../models/Section")
const SubSection = require("../models/Subsection")
const CourseProgress = require("../models/CourseProgress")
const AIConversation = require("../models/AIConversation")
const PendingPayment = require("../models/PendingPayment")

const auth = (user) =>
  `Bearer ${jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET)}`

const createUser = async (accountType, suffix, approved = true) => {
  const profile = await Profile.create({ about: "Test profile" })
  return User.create({
    firstName: "Test",
    lastName: "User",
    email: `${suffix}@example.com`,
    password: "not-used-in-token-tests",
    accountType,
    approved,
    additionalDetails: profile._id,
  })
}

const createCourse = async ({ instructor, students = [], lessonCount = 2 }) => {
  const lessons = []
  for (let index = 0; index < lessonCount; index += 1) {
    lessons.push(
      await SubSection.create({
        title: `Lesson ${index + 1}`,
        description: `Description ${index + 1}`,
        videoUrl: `https://video.invalid/${index + 1}`,
        timeDuration: "120",
      })
    )
  }
  const section = await Section.create({
    sectionName: "Core concepts",
    subSection: lessons.map((lesson) => lesson._id),
  })
  const course = await Course.create({
    courseName: "Secure Course",
    courseDescription: "A test course",
    whatYouWillLearn: "Secure concepts",
    instructor: instructor._id,
    courseContent: [section._id],
    price: 499,
    tag: ["security"],
    instructions: ["Study carefully"],
    status: "Published",
    studentsEnroled: students.map((student) => student._id),
  })
  for (const student of students) {
    const progress = await CourseProgress.create({
      courseID: course._id,
      userId: student._id,
      completedVideos: [],
    })
    await User.findByIdAndUpdate(student._id, {
      $addToSet: { courses: course._id, courseProgress: progress._id },
    })
  }
  return { course, section, lessons }
}

beforeEach(() => {
  mockResponsesCreate.mockReset()
  mockRazorpayOrderCreate.mockReset()
})

test("pending instructors can sign in but approved instructor routes remain blocked", async () => {
  const instructor = await createUser("Instructor", "pending-login", false)
  instructor.password = await bcrypt.hash("strong-password", 10)
  await instructor.save()

  const login = await request(app).post("/api/v1/auth/login").send({
    email: instructor.email,
    password: "strong-password",
  })
  expect(login.status).toBe(200)
  expect(login.body.user).toMatchObject({ accountType: "Instructor", approved: false })
  expect(login.body.message).toMatch(/awaiting approval/i)

  const protectedRoute = await request(app)
    .get("/api/v1/course/getInstructorCourses")
    .set("Authorization", `Bearer ${login.body.token}`)
  expect(protectedRoute.status).toBe(403)
  expect(protectedRoute.body.code).toBe("INSTRUCTOR_NOT_APPROVED")
})

test("unauthenticated AI access and course deletion are rejected", async () => {
  const aiResponse = await request(app).post("/api/v1/ai/quiz/generate").send({})
  expect(aiResponse.status).toBe(401)
  expect(aiResponse.body.code).toBe("AUTH_REQUIRED")

  const deletion = await request(app).delete("/api/v1/course/deleteCourse").send({})
  expect(deletion.status).toBe(401)
})

test("public signup cannot create admins and instructors cannot edit another course", async () => {
  const signup = await request(app).post("/api/v1/auth/signup").send({
    firstName: "Public",
    lastName: "Admin",
    email: "public-admin@example.com",
    password: "strong-password",
    confirmPassword: "strong-password",
    otp: "123456",
    accountType: "Admin",
  })
  expect(signup.status).toBe(400)
  expect(signup.body.code).toBe("VALIDATION_ERROR")

  const owner = await createUser("Instructor", "edit-owner")
  const attacker = await createUser("Instructor", "edit-attacker")
  const { course } = await createCourse({ instructor: owner })
  const edit = await request(app)
    .post("/api/v1/course/editCourse")
    .set("Authorization", auth(attacker))
    .send({ courseId: course._id, courseName: "Stolen course" })
  expect(edit.status).toBe(403)
  expect(edit.body.code).toBe("COURSE_OWNERSHIP_REQUIRED")
})

test("unenrolled students and non-owning instructors cannot use course AI", async () => {
  const owner = await createUser("Instructor", "owner")
  const otherInstructor = await createUser("Instructor", "other-instructor")
  const student = await createUser("Student", "not-enrolled")
  const { course } = await createCourse({ instructor: owner })

  const studentResponse = await request(app)
    .post("/api/v1/ai/summary/generate")
    .set("Authorization", auth(student))
    .send({ courseId: course._id })
  expect(studentResponse.status).toBe(403)
  expect(studentResponse.body.code).toBe("COURSE_ENROLLMENT_REQUIRED")

  const instructorResponse = await request(app)
    .post("/api/v1/ai/quiz/generate")
    .set("Authorization", auth(otherInstructor))
    .send({ courseId: course._id, questionCount: 5, difficulty: "Easy" })
  expect(instructorResponse.status).toBe(403)
  expect(instructorResponse.body.code).toBe("AI_ACCESS_DENIED")
})

test("missing API key returns stable AI_NOT_CONFIGURED", async () => {
  const instructor = await createUser("Instructor", "missing-key-owner")
  const student = await createUser("Student", "missing-key-student")
  const { course } = await createCourse({ instructor, students: [student] })
  const response = await request(app)
    .post("/api/v1/ai/summary/generate")
    .set("Authorization", auth(student))
    .send({ courseId: course._id })
  expect(response.status).toBe(503)
  expect(response.body).toMatchObject({ success: false, code: "AI_NOT_CONFIGURED" })
})

test("invalid model output is rejected without provider details", async () => {
  process.env.OPENAI_API_KEY = "test-key-not-sent"
  mockResponsesCreate.mockResolvedValue({ output_text: "not-json" })
  const instructor = await createUser("Instructor", "invalid-output-owner")
  const student = await createUser("Student", "invalid-output-student")
  const { course } = await createCourse({ instructor, students: [student] })
  const response = await request(app)
    .post("/api/v1/ai/summary/generate")
    .set("Authorization", auth(student))
    .send({ courseId: course._id })
  expect(response.status).toBe(502)
  expect(response.body.code).toBe("AI_INVALID_RESPONSE")
  expect(JSON.stringify(response.body)).not.toContain("not-json")
})

test("quiz answers stay hidden before server-side grading", async () => {
  process.env.OPENAI_API_KEY = "test-key-not-sent"
  const instructor = await createUser("Instructor", "quiz-owner")
  const student = await createUser("Student", "quiz-student")
  const { course } = await createCourse({ instructor, students: [student] })
  mockResponsesCreate.mockResolvedValue({
    output_text: JSON.stringify({
      questions: Array.from({ length: 5 }, (_, index) => ({
        question: `Question ${index + 1}`,
        options: ["A", "B", "C", "D"],
        correctOptionIndex: index % 4,
        explanation: `Explanation ${index + 1}`,
        relatedContentTitle: "Core concepts",
      })),
    }),
  })
  const generated = await request(app)
    .post("/api/v1/ai/quiz/generate")
    .set("Authorization", auth(student))
    .send({ courseId: course._id, questionCount: 5, difficulty: "Medium" })
  expect(generated.status).toBe(201)
  expect(generated.body.quiz.questions[0]).not.toHaveProperty("correctOptionIndex")
  expect(generated.body.quiz.questions[0]).not.toHaveProperty("explanation")

  const graded = await request(app)
    .post(`/api/v1/ai/quiz/${generated.body.quiz.id}/submit`)
    .set("Authorization", auth(student))
    .send({ answers: [0, 1, 2, 3, 0] })
  expect(graded.status).toBe(200)
  expect(graded.body.score).toBe(5)
  expect(graded.body.results[0]).toMatchObject({ correctOptionIndex: 0, correct: true })
  expect(graded.body.results[0].explanation).toBe("Explanation 1")
})

test("conversations are private to their owner", async () => {
  const instructor = await createUser("Instructor", "conversation-owner")
  const owner = await createUser("Student", "conversation-student")
  const stranger = await createUser("Student", "conversation-stranger")
  const { course } = await createCourse({ instructor, students: [owner, stranger] })
  const conversation = await AIConversation.create({
    userId: owner._id,
    courseId: course._id,
    title: "Private question",
    messages: [{ role: "user", content: "Private question" }],
  })
  const response = await request(app)
    .get(`/api/v1/ai/conversations/${conversation._id}`)
    .set("Authorization", auth(stranger))
  expect(response.status).toBe(404)
  expect(response.body.code).toBe("CONVERSATION_NOT_FOUND")
})

test("roadmap uses authenticated progress and validates real references", async () => {
  process.env.OPENAI_API_KEY = "test-key-not-sent"
  const instructor = await createUser("Instructor", "roadmap-owner")
  const student = await createUser("Student", "roadmap-student")
  const { course, section, lessons } = await createCourse({ instructor, students: [student] })
  await CourseProgress.updateOne(
    { courseID: course._id, userId: student._id },
    { $addToSet: { completedVideos: lessons[0]._id } }
  )
  mockResponsesCreate.mockResolvedValue({
    output_text: JSON.stringify({
      title: "Personal roadmap",
      goal: "Complete the secure course",
      totalWeeks: 1,
      weeklyPlan: [
        {
          weekNumber: 1,
          objective: "Finish remaining concepts",
          relatedContent: [{ id: String(section._id), title: "ignored", type: "section" }],
          estimatedHours: 4,
          activities: ["Review the incomplete lesson"],
          quizCheckpoint: "Take a quiz",
          milestone: "Course reviewed",
        },
      ],
      finalProjectSuggestion: "Build a secure checklist",
      revisionStrategy: "Use spaced review",
    }),
  })
  const response = await request(app)
    .post("/api/v1/ai/roadmap/generate")
    .set("Authorization", auth(student))
    .send({
      courseId: course._id,
      currentLevel: "Beginner",
      learningGoal: "Complete the course confidently",
      hoursPerWeek: 5,
    })
  expect(response.status).toBe(200)
  expect(response.body.roadmap.currentProgressPercentage).toBe(50)
  expect(response.body.roadmap.weeklyPlan[0].relatedContent[0]).toMatchObject({
    id: String(section._id),
    title: "Core concepts",
  })
  expect(response.body.roadmap.weeklyPlan[0].estimatedHours).toBeLessThanOrEqual(5)
})

test("AI rate limiting returns 429 per authenticated user", async () => {
  process.env.AI_REQUESTS_PER_HOUR = "3"
  const instructor = await createUser("Instructor", "rate-owner")
  const student = await createUser("Student", "rate-student")
  const { course } = await createCourse({ instructor, students: [student] })
  const statuses = []
  for (let index = 0; index < 4; index += 1) {
    const response = await request(app)
      .post("/api/v1/ai/summary/generate")
      .set("Authorization", auth(student))
      .send({ courseId: course._id })
    statuses.push(response.status)
  }
  expect(statuses).toEqual([503, 503, 503, 429])
})

test("stored payment cannot be switched to another course or reused", async () => {
  const instructor = await createUser("Instructor", "payment-owner")
  const student = await createUser("Student", "payment-student")
  const { course: paidCourse } = await createCourse({ instructor })
  const { course: switchedCourse } = await createCourse({ instructor })
  const orderId = "order_test_123"
  const paymentId = "pay_test_123"
  await PendingPayment.create({
    orderId,
    userId: student._id,
    courseIds: [paidCourse._id],
    expectedAmount: 49900,
    currency: "INR",
  })
  const signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex")
  const body = {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
    courses: [switchedCourse._id],
    amount: 1,
  }
  const response = await request(app)
    .post("/api/v1/payment/verifyPayment")
    .set("Authorization", auth(student))
    .send(body)
  expect(response.status).toBe(200)
  const paid = await Course.findById(paidCourse._id)
  const switched = await Course.findById(switchedCourse._id)
  expect(paid.studentsEnroled.map(String)).toContain(String(student._id))
  expect(switched.studentsEnroled.map(String)).not.toContain(String(student._id))

  const reused = await request(app)
    .post("/api/v1/payment/verifyPayment")
    .set("Authorization", auth(student))
    .send(body)
  expect(reused.status).toBe(409)
  expect(reused.body.code).toBe("PAYMENT_ALREADY_PROCESSED")
})

test("payment order returns the public Razorpay Key ID but never the secret", async () => {
  const instructor = await createUser("Instructor", "payment-key-owner")
  const student = await createUser("Student", "payment-key-student")
  const { course } = await createCourse({ instructor })
  mockRazorpayOrderCreate.mockResolvedValue({ id: "order_public_key_test" })

  const response = await request(app)
    .post("/api/v1/payment/capturePayment")
    .set("Authorization", auth(student))
    .send({ courses: [course._id] })

  expect(response.status).toBe(201)
  expect(response.body.data).toMatchObject({
    id: "order_public_key_test",
    keyId: process.env.RAZORPAY_KEY,
    amount: 49900,
    currency: "INR",
  })
  expect(JSON.stringify(response.body)).not.toContain(process.env.RAZORPAY_SECRET)
})
