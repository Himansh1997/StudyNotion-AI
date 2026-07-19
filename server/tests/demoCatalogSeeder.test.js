const Category = require("../models/Category")
const Course = require("../models/Course")
const Section = require("../models/Section")
const SubSection = require("../models/Subsection")
const User = require("../models/User")
const { seedDemoCatalog } = require("../services/demoCatalogSeeder")

describe("demo catalog seeder", () => {
  test("creates a complete published catalog and remains idempotent", async () => {
    const first = await seedDemoCatalog()
    const second = await seedDemoCatalog()

    expect(first).toEqual({ courses: 8, categories: 6 })
    expect(second).toEqual(first)
    expect(await Course.countDocuments()).toBe(8)
    expect(await Category.countDocuments()).toBe(6)
    expect(await Section.countDocuments()).toBe(24)
    expect(await SubSection.countDocuments()).toBe(72)

    const instructor = await User.findOne({ email: "academy@studynotion.demo" })
    expect(instructor).toMatchObject({
      accountType: "Instructor",
      approved: true,
      active: true,
    })
    expect(instructor.courses).toHaveLength(8)

    const courses = await Course.find().populate({
      path: "courseContent",
      populate: { path: "subSection" },
    })
    for (const course of courses) {
      expect(course.status).toBe("Published")
      expect(course.thumbnail).toMatch(
        /^http:\/\/localhost:3000\/course-thumbnails\/[a-z0-9-]+\.svg$/
      )
      expect(course.courseContent).toHaveLength(3)
      expect(course.courseContent.every((section) => section.subSection.length === 3)).toBe(true)
    }

    const categories = await Category.find()
    expect(categories.reduce((total, category) => total + category.courses.length, 0)).toBe(8)
  })
})
