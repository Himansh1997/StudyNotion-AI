const fs = require("fs")
const path = require("path")
const mongoose = require("mongoose")

const demoCatalog = require("../data/demoCatalog")
const Category = require("../models/Category")
const Course = require("../models/Course")
const Section = require("../models/Section")
const SubSection = require("../models/Subsection")

const fail = (message) => {
  throw new Error(`Demo catalog validation failed: ${message}`)
}

if (demoCatalog.length !== 8) fail("expected eight courses")

const slugs = new Set()
const names = new Set()
const categories = new Set()
let sectionCount = 0
let lessonCount = 0

for (const course of demoCatalog) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(course.slug)) fail(`invalid slug ${course.slug}`)
  if (slugs.has(course.slug)) fail(`duplicate slug ${course.slug}`)
  if (names.has(course.courseName)) fail(`duplicate course name ${course.courseName}`)
  slugs.add(course.slug)
  names.add(course.courseName)
  categories.add(course.category)

  const categoryError = new Category({
    name: course.category,
    description: course.categoryDescription,
  }).validateSync()
  if (categoryError) fail(`${course.slug} has an invalid category`)

  if (course.sections.length !== 3) fail(`${course.slug} must contain three sections`)
  const sectionIds = []
  for (const section of course.sections) {
    if (section.lessons.length !== 3) fail(`${course.slug} sections must contain three lessons`)
    const lessonIds = []
    for (const item of section.lessons) {
      const lessonDocument = new SubSection({
        ...item,
        videoUrl: "https://example.com/demo.mp4",
      })
      const lessonError = lessonDocument.validateSync()
      if (lessonError) fail(`${course.slug} contains an invalid lesson`)
      lessonIds.push(lessonDocument._id)
      lessonCount += 1
    }
    const sectionDocument = new Section({ sectionName: section.name, subSection: lessonIds })
    const sectionError = sectionDocument.validateSync()
    if (sectionError) fail(`${course.slug} contains an invalid section`)
    sectionIds.push(sectionDocument._id)
    sectionCount += 1
  }

  const courseError = new Course({
    ...course,
    instructor: new mongoose.Types.ObjectId(),
    courseContent: sectionIds,
    ratingAndReviews: [],
    thumbnail: `https://example.com/course-thumbnails/${course.slug}.svg`,
    category: new mongoose.Types.ObjectId(),
    studentsEnroled: [],
    status: "Published",
  }).validateSync()
  if (courseError) fail(`${course.slug} does not satisfy the Course schema`)

  const artworkPath = path.resolve(
    __dirname,
    "..",
    "..",
    "public",
    "course-thumbnails",
    `${course.slug}.svg`
  )
  if (!fs.existsSync(artworkPath)) fail(`${course.slug} is missing its thumbnail`)
  const artwork = fs.readFileSync(artworkPath, "utf8")
  if (!artwork.includes("<svg") || !artwork.includes("<title")) {
    fail(`${course.slug} thumbnail is not an accessible SVG`)
  }
}

if (categories.size !== 6) fail("expected six categories")
if (sectionCount !== 24) fail("expected 24 sections")
if (lessonCount !== 72) fail("expected 72 lessons")

console.log("Demo catalog validation passed: 8 courses, 6 categories, 24 sections, 72 lessons.")
