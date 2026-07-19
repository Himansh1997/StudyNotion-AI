require("dotenv").config()

const mongoose = require("mongoose")
const User = require("../models/User")

const email = String(process.argv[2] || "").trim().toLowerCase()

const run = async () => {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("Usage: npm run approve:instructor -- instructor@example.com")
  }
  if (!process.env.MONGODB_URL) throw new Error("MONGODB_URL is required")

  await mongoose.connect(process.env.MONGODB_URL)
  const instructor = await User.findOneAndUpdate(
    { email, accountType: "Instructor" },
    { $set: { approved: true, active: true } },
    { new: true }
  ).select("email approved active")

  if (!instructor) throw new Error("No instructor account was found for that email")
  console.info(`Instructor approved: ${instructor.email}`)
}

run()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
