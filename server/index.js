require("dotenv").config()

const app = require("./app")
const database = require("./config/database")

const PORT = Number.parseInt(process.env.PORT, 10) || 4000

const start = async () => {
  await database.connect()
  app.listen(PORT, () => {
    console.info(`StudyNotion API listening on port ${PORT}`)
  })
}

start().catch(() => {
  console.error("StudyNotion API failed to start")
  process.exit(1)
})
