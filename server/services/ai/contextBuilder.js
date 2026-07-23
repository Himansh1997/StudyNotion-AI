const crypto = require("crypto")
const ApiError = require("../../utils/ApiError")
const { objectIdEquals } = require("../../utils/courseAccess")

const LIMITS = {
  field: 4000,
  description: 6000,
  total: 28_000,
  sections: 40,
  lessonsPerSection: 80,
}

const text = (value, max = LIMITS.field) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)

const buildCourseContext = ({ course, progress, sectionId, subSectionId }) => {
  let sections = course.courseContent.slice(0, LIMITS.sections)
  if (sectionId) {
    const selected = sections.find((section) =>
      objectIdEquals(section._id, sectionId)
    )
    if (!selected)
      throw new ApiError(
        404,
        "Section not found in this course",
        "SECTION_NOT_FOUND"
      )
    sections = [selected]
  }
  if (subSectionId && !sectionId) {
    throw new ApiError(
      400,
      "sectionId is required with subSectionId",
      "VALIDATION_ERROR"
    )
  }

  const completed = new Set((progress?.completedVideos || []).map(String))
  const references = new Map()
  const contextSections = sections.map((section) => {
    references.set(String(section._id), {
      id: String(section._id),
      title: text(section.sectionName, 300),
      type: "section",
    })
    let lessons = section.subSection.slice(0, LIMITS.lessonsPerSection)
    if (subSectionId) {
      const selected = lessons.find((lesson) =>
        objectIdEquals(lesson._id, subSectionId)
      )
      if (!selected)
        throw new ApiError(
          404,
          "Lesson not found in this section",
          "LESSON_NOT_FOUND"
        )
      lessons = [selected]
    }
    return {
      id: String(section._id),
      title: text(section.sectionName, 300),
      lessons: lessons.map((lesson) => {
        const item = {
          id: String(lesson._id),
          title: text(lesson.title, 300),
          description: text(lesson.description, LIMITS.description),
          completed: completed.has(String(lesson._id)),
        }
        references.set(item.id, {
          id: item.id,
          title: item.title,
          type: "lesson",
        })
        return item
      }),
    }
  })

  const context = {
    id: String(course._id),
    courseName: text(course.courseName, 300),
    courseDescription: text(course.courseDescription, LIMITS.description),
    whatYouWillLearn: text(course.whatYouWillLearn, LIMITS.description),
    tags: (course.tag || []).slice(0, 30).map((item) => text(item, 200)),
    instructions: (course.instructions || [])
      .slice(0, 30)
      .map((item) => text(item, 500)),
    sections: contextSections,
    sourceNotice:
      "Based on course titles and descriptions; video transcripts are not available.",
  }
  context.sections = context.sections.map((section) => ({
    ...section,
    lessons: section.lessons.map((lesson) => ({
      ...lesson,
      description: lesson.description.slice(0, 1200),
    })),
  }))
  while (JSON.stringify(context).length > LIMITS.total) {
    const sectionWithLessons = [...context.sections]
      .reverse()
      .find((section) => section.lessons.length > 1)
    if (!sectionWithLessons) break
    const removed = sectionWithLessons.lessons.pop()
    references.delete(removed.id)
  }
  if (JSON.stringify(context).length > LIMITS.total) {
    context.sections = context.sections.map((section) => ({
      ...section,
      lessons: section.lessons.map((lesson) => ({
        ...lesson,
        description: lesson.description.slice(0, 400),
      })),
    }))
    context.courseDescription = context.courseDescription.slice(0, 1500)
    context.whatYouWillLearn = context.whatYouWillLearn.slice(0, 1500)
  }
  const contentForHash = {
    ...context,
    sections: context.sections.map((section) => ({
      ...section,
      lessons: section.lessons.map(
        ({ completed: ignored, ...lesson }) => lesson
      ),
    })),
  }
  const finalSerialized = JSON.stringify(contentForHash).slice(0, LIMITS.total)
  const sourceContentHash = crypto
    .createHash("sha256")
    .update(finalSerialized)
    .digest("hex")
  const progressHash = crypto
    .createHash("sha256")
    .update([...completed].sort().join(","))
    .digest("hex")
  const totalLessons = [...references.values()].filter(
    (item) => item.type === "lesson"
  ).length
  const completedInScope = [...references.values()].filter(
    (item) => item.type === "lesson" && completed.has(item.id)
  ).length

  return {
    context,
    sourceContentHash,
    progressHash,
    references,
    progress: {
      completedLessonIds: [...completed].filter((id) => references.has(id)),
      totalLessons,
      completedLessons: completedInScope,
      percentage: totalLessons
        ? Math.round((completedInScope / totalLessons) * 10000) / 100
        : 0,
    },
  }
}

const validateReferences = (items, references) => {
  const seen = new Set()
  return items.flatMap((item) => {
    const trusted = references.get(String(item.id))
    if (!trusted || trusted.type !== item.type || seen.has(trusted.id))
      return []
    seen.add(trusted.id)
    return [trusted]
  })
}

module.exports = { buildCourseContext, validateReferences }
