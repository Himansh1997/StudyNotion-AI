const mongoose = require("mongoose")
const { MongoMemoryServer } = require("mongodb-memory-server")

let mongo

beforeAll(async () => {
  process.env.JWT_SECRET = "test-jwt-secret"
  process.env.CLIENT_URL = "http://localhost:3000"
  process.env.RAZORPAY_SECRET = "test-razorpay-secret"
  process.env.RAZORPAY_KEY = "rzp_test_public_key"
  process.env.AI_REQUESTS_PER_HOUR = "30"
  mongo = await MongoMemoryServer.create()
  await mongoose.connect(mongo.getUri())
})

afterEach(async () => {
  const collections = mongoose.connection.collections
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})))
  delete process.env.OPENAI_API_KEY
  process.env.AI_REQUESTS_PER_HOUR = "30"
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongo.stop()
})
