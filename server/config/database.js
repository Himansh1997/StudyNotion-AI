const mongoose = require("mongoose")

exports.connect = async () => {
  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL is required")
  }
  await mongoose.connect(process.env.MONGODB_URL)
  console.info("Database connection established")
}
