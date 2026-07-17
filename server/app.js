require("dotenv").config()

const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const fileUpload = require("express-fileupload")
const helmet = require("helmet")
const ApiError = require("./utils/ApiError")

const userRoutes = require("./routes/user")
const profileRoutes = require("./routes/profile")
const courseRoutes = require("./routes/Course")
const paymentRoutes = require("./routes/Payments")
const contactUsRoute = require("./routes/Contact")
const aiRoutes = require("./routes/AI")
const { cloudinaryConnect } = require("./config/cloudinary")
const { notFound, errorHandler } = require("./middleware/errorHandler")

const app = express()

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean)

app.disable("x-powered-by")
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }))
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
        return callback(null, true)
      }
      return callback(new ApiError(403, "Origin is not allowed by CORS", "CORS_FORBIDDEN"))
    },
  })
)
app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ extended: true, limit: "1mb" }))
app.use(cookieParser())
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    limits: { fileSize: 250 * 1024 * 1024 },
    abortOnLimit: true,
    safeFileNames: true,
  })
)

cloudinaryConnect()

app.get(["/", "/health"], (req, res) => {
  res.status(200).json({ success: true, message: "StudyNotion API is healthy" })
})

app.use("/api/v1/auth", userRoutes)
app.use("/api/v1/profile", profileRoutes)
app.use("/api/v1/course", courseRoutes)
app.use("/api/v1/payment", paymentRoutes)
app.use("/api/v1/reach", contactUsRoute)
app.use("/api/v1/ai", aiRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app
