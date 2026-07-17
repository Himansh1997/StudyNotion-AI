const mailSender = require("../utils/mailSender")
const { requireString } = require("../utils/validation")

exports.contactUsController = async (req, res, next) => {
  try {
    const email = requireString(req.body.email, "email", { max: 254 })
    const firstname = requireString(req.body.firstname, "firstname", { max: 80 })
    const lastname = requireString(req.body.lastname, "lastname", { max: 80 })
    const message = requireString(req.body.message, "message", { max: 5000 })
    await mailSender(
      email,
      "StudyNotion contact request received",
      `Hello ${firstname} ${lastname}, we received your message: ${message}`
    )
    res.status(200).json({ success: true, message: "Message sent successfully" })
  } catch (error) {
    next(error)
  }
}
