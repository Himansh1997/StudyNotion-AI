const Razorpay = require("razorpay")
const ApiError = require("../utils/ApiError")

let instance

exports.getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY || !process.env.RAZORPAY_SECRET) {
    throw new ApiError(503, "Payments are not configured", "PAYMENTS_NOT_CONFIGURED")
  }
  if (!instance) {
    instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY,
      key_secret: process.env.RAZORPAY_SECRET,
    })
  }
  return instance
}
