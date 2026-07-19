require("dotenv").config()

const app = require("./app")
const database = require("./config/database")
const { seedDemoCatalog } = require("./services/demoCatalogSeeder")

const PORT = Number.parseInt(process.env.PORT, 10) || 4000

const start = async () => {
  await database.connect()
  if (process.env.SEED_DEMO_CATALOG === "true") {
    const seeded = await seedDemoCatalog()
    console.info(`Demo catalog ready: ${seeded.courses} courses in ${seeded.categories} categories`)
  }
  app.listen(PORT, () => {
    console.info(`StudyNotion API listening on port ${PORT}`)
  })
}

start().catch(() => {
  console.error("StudyNotion API failed to start")
  process.exit(1)
})
