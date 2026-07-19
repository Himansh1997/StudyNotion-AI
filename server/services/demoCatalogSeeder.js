const crypto = require("crypto")
const bcrypt = require("bcryptjs")
const mongoose = require("mongoose")

const Category = require("../models/Category")
const Course = require("../models/Course")
const Profile = require("../models/Profile")
const Section = require("../models/Section")
const SubSection = require("../models/Subsection")
const User = require("../models/User")
const demoCatalog = require("../data/demoCatalog")

const DEMO_INSTRUCTOR_EMAIL = "academy@studynotion.demo"
const DEMO_VIDEO_URLS = [
  "https://res.cloudinary.com/dfvxviymf/video/upload/v1723684594/samples/cld-sample-video.mp4",
  "https://res.cloudinary.com/dfvxviymf/video/upload/v1723684594/samples/sea-turtle.mp4",
  "https://res.cloudinary.com/dfvxviymf/video/upload/v1723684594/samples/dance-2.mp4",
  "https://res.cloudinary.com/dfvxviymf/video/upload/v1723684594/samples/elephants.mp4",
]

const stableObjectId = (value) =>
  new mongoose.Types.ObjectId(crypto.createHash("sha256").update(value).digest("hex").slice(0, 24))

const frontendOrigin = () => {
  if (!process.env.CLIENT_URL) throw new Error("CLIENT_URL is required to seed the demo catalog")
  const url = new URL(process.env.CLIENT_URL)
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("CLIENT_URL must be an HTTP(S) URL")
  }
  return url.origin
}

const ensureInstructor = async () => {
  let instructor = await User.findOne({ email: DEMO_INSTRUCTOR_EMAIL })
  if (instructor) {
    if (instructor.accountType !== "Instructor") {
      throw new Error("The reserved demo instructor address belongs to another account type")
    }
    instructor.approved = true
    instructor.active = true
    await instructor.save()
    return instructor
  }

  const profileId = stableObjectId("studynotion-demo-instructor-profile-v1")
  const instructorId = stableObjectId("studynotion-demo-instructor-v1")
  await Profile.findByIdAndUpdate(
    profileId,
    {
      $set: {
        about:
          "StudyNotion Academy creates practical, project-based learning paths for modern software careers.",
      },
    },
    { upsert: true, setDefaultsOnInsert: true }
  )

  const password = await bcrypt.hash(crypto.randomBytes(48).toString("hex"), 12)
  instructor = await User.findByIdAndUpdate(
    instructorId,
    {
      $set: {
        firstName: "StudyNotion",
        lastName: "Academy",
        email: DEMO_INSTRUCTOR_EMAIL,
        accountType: "Instructor",
        approved: true,
        active: true,
        additionalDetails: profileId,
        image: "https://api.dicebear.com/9.x/initials/svg?seed=StudyNotion%20Academy&backgroundColor=facc15",
      },
      $setOnInsert: {
        password,
        courses: [],
        courseProgress: [],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  return instructor
}

const ensureCategory = async ({ name, description }) => {
  const existing = await Category.findOne({ name })
  if (existing) {
    existing.description = description
    await existing.save()
    return existing
  }
  return Category.findByIdAndUpdate(
    stableObjectId(`studynotion-demo-category:${name}`),
    { $set: { name, description }, $setOnInsert: { courses: [] } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

const seedLesson = async ({ courseSlug, sectionIndex, lessonIndex, data }) => {
  const lessonId = stableObjectId(
    `studynotion-demo-lesson:${courseSlug}:${sectionIndex}:${lessonIndex}`
  )
  return SubSection.findByIdAndUpdate(
    lessonId,
    {
      $set: {
        title: data.title,
        timeDuration: data.timeDuration,
        description: data.description,
        videoUrl: DEMO_VIDEO_URLS[(sectionIndex * 3 + lessonIndex) % DEMO_VIDEO_URLS.length],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

const seedSection = async ({ course, section, sectionIndex }) => {
  const lessons = await Promise.all(
    section.lessons.map((data, lessonIndex) =>
      seedLesson({ courseSlug: course.slug, sectionIndex, lessonIndex, data })
    )
  )
  const sectionId = stableObjectId(`studynotion-demo-section:${course.slug}:${sectionIndex}`)
  return Section.findByIdAndUpdate(
    sectionId,
    { $set: { sectionName: section.name, subSection: lessons.map(({ _id }) => _id) } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

const seedCourse = async ({ course, instructor, category, origin }) => {
  const sections = []
  for (const [sectionIndex, section] of course.sections.entries()) {
    sections.push(await seedSection({ course, section, sectionIndex }))
  }

  const courseId = stableObjectId(`studynotion-demo-course:${course.slug}`)
  const seededCourse = await Course.findByIdAndUpdate(
    courseId,
    {
      $set: {
        courseName: course.courseName,
        courseDescription: course.courseDescription,
        instructor: instructor._id,
        whatYouWillLearn: course.whatYouWillLearn,
        courseContent: sections.map(({ _id }) => _id),
        price: course.price,
        thumbnail: `${origin}/course-thumbnails/${course.slug}.svg`,
        tag: course.tag,
        category: category._id,
        instructions: course.instructions,
        status: "Published",
      },
      $setOnInsert: {
        ratingAndReviews: [],
        studentsEnroled: [],
        createdAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  await Promise.all([
    Category.findByIdAndUpdate(category._id, { $addToSet: { courses: seededCourse._id } }),
    User.findByIdAndUpdate(instructor._id, { $addToSet: { courses: seededCourse._id } }),
  ])
  return seededCourse
}

const seedDemoCatalog = async () => {
  const origin = frontendOrigin()
  const instructor = await ensureInstructor()
  const categories = new Map()
  const courses = []

  for (const course of demoCatalog) {
    if (!categories.has(course.category)) {
      categories.set(
        course.category,
        await ensureCategory({
          name: course.category,
          description: course.categoryDescription,
        })
      )
    }
    courses.push(
      await seedCourse({
        course,
        instructor,
        category: categories.get(course.category),
        origin,
      })
    )
  }

  return { courses: courses.length, categories: categories.size }
}

module.exports = { seedDemoCatalog }
