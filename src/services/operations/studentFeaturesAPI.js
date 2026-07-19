import { toast } from "react-hot-toast"

import rzpLogo from "../../assets/Logo/rzp_logo.png"
import { resetCart } from "../../slices/cartSlice"
import { setPaymentLoading } from "../../slices/courseSlice"
import { apiConnector } from "../apiConnector"
import { studentEndpoints } from "../apis"

const { COURSE_PAYMENT_API, COURSE_VERIFY_API } = studentEndpoints

const paymentErrorMessage = (error) => {
  const code = error?.response?.data?.code
  const messages = {
    PAYMENTS_NOT_CONFIGURED: "Test payments are not configured yet.",
    ALREADY_ENROLLED: "You are already enrolled in this course.",
    COURSE_NOT_FOUND: "This course is not available for purchase.",
    INVALID_PAYMENT_AMOUNT: "This course has an invalid price.",
  }
  return messages[code] || error?.response?.data?.message || "Could not initiate payment."
}

const loadScript = (src) =>
  new Promise((resolve) => {
    const script = document.createElement("script")
    script.src = src
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })

export async function BuyCourse(token, courses, userDetails, navigate, dispatch) {
  const toastId = toast.loading("Loading...")
  try {
    if (!(await loadScript("https://checkout.razorpay.com/v1/checkout.js"))) {
      toast.error("Razorpay could not be loaded. Check your connection.")
      return
    }
    const orderResponse = await apiConnector(
      "POST",
      COURSE_PAYMENT_API,
      { courses },
      { Authorization: `Bearer ${token}` }
    )
    const order = orderResponse.data.data
    if (!order?.keyId) {
      throw new Error("Razorpay Key ID was not returned by the server")
    }
    const options = {
      key: order.keyId,
      currency: order.currency,
      amount: String(order.amount),
      order_id: order.id,
      name: "StudyNotion",
      description: "Thank you for purchasing the course.",
      image: rzpLogo,
      prefill: {
        name: `${userDetails.firstName} ${userDetails.lastName}`,
        email: userDetails.email,
      },
      handler: (response) => verifyPayment(response, token, navigate, dispatch),
    }
    const paymentObject = new window.Razorpay(options)
    paymentObject.open()
    paymentObject.on("payment.failed", () => toast.error("Payment failed. No enrollment was made."))
  } catch (error) {
    toast.error(paymentErrorMessage(error))
  } finally {
    toast.dismiss(toastId)
  }
}

async function verifyPayment(paymentResponse, token, navigate, dispatch) {
  const toastId = toast.loading("Verifying payment...")
  dispatch(setPaymentLoading(true))
  try {
    await apiConnector("POST", COURSE_VERIFY_API, paymentResponse, {
      Authorization: `Bearer ${token}`,
    })
    toast.success("Payment verified. You are enrolled in the course.")
    navigate("/dashboard/enrolled-courses")
    dispatch(resetCart())
  } catch {
    toast.error("Payment could not be verified. Contact support if you were charged.")
  } finally {
    toast.dismiss(toastId)
    dispatch(setPaymentLoading(false))
  }
}
