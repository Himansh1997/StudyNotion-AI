const express = require("express")
const { capturePayment, verifyPayment } = require("../controllers/payments")
const { auth, isStudent } = require("../middleware/auth")

const router = express.Router()
router.post("/capturePayment", auth, isStudent, capturePayment)
router.post("/verifyPayment", auth, isStudent, verifyPayment)

module.exports = router
