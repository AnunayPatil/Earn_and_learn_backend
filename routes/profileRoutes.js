const express = require("express")
const router = express.Router()
const User = require("../models/User")
const auth = require("../middleware/auth")
const multer = require("multer")
const path = require("path")
const fs = require("fs")

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/profiles"
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, "profile-" + uniqueSuffix + ext)
  },
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error("Only image files are allowed!"), false)
    }
    cb(null, true)
  },
})

// Get current user's profile
router.get("/me", auth, async (req, res) => {
  try {
    // Return user without sensitive information
    const user = req.user.toObject()
    delete user.password
    delete user.tokens

    res.send(user)
  } catch (err) {
    res.status(500).send({ error: "Failed to fetch profile" })
  }
})

// Update user profile (student only)
router.patch("/me", auth, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).send({ error: "Only students can update their profile" })
    }

    const updates = req.body
    const allowedUpdates = [
      "firstName",
      "lastName",
      "phoneNumber",
      "dateOfBirth",
      "gender",
      "address",
      "collegeName",
      "department",
      "course",
      "yearOfStudy",
      "rollNumber",
      "prnNumber",
      "aadharNumber",
      "bankDetails",
    ]

    // Filter out fields that are not allowed to be updated
    const validUpdates = Object.keys(updates).filter((update) => allowedUpdates.includes(update))

    // Apply updates
    validUpdates.forEach((update) => {
      req.user[update] = updates[update]
    })

    // Check if profile is complete and update status if needed
    if (req.user.isProfileComplete() && req.user.profileStatus === "incomplete") {
      req.user.profileStatus = "pending"
      req.user.profileSubmittedAt = new Date()
    }

    await req.user.save()
    res.send(req.user)
  } catch (err) {
    res.status(400).send({ error: err.message })
  }
})

// Upload profile image
router.post("/me/image", auth, upload.single("profileImage"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ error: "No file uploaded" })
    }

    // Save the file path to the user's profile
    req.user.profileImage = `/uploads/profiles/${req.file.filename}`
    await req.user.save()

    res.send({ profileImage: req.user.profileImage })
  } catch (err) {
    res.status(400).send({ error: err.message })
  }
})

// Submit profile for approval
router.post("/me/submit", auth, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).send({ error: "Only students can submit profiles" })
    }

    if (!req.user.isProfileComplete()) {
      return res.status(400).send({ error: "Profile is incomplete. Please fill all required fields." })
    }

    req.user.profileStatus = "pending"
    req.user.profileSubmittedAt = new Date()
    await req.user.save()

    res.send({ message: "Profile submitted for approval", status: req.user.profileStatus })
  } catch (err) {
    res.status(400).send({ error: err.message })
  }
})

// Admin: Get all student profiles
router.get("/students", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).send({ error: "Access denied" })
    }

    // Query parameters for filtering
    const { status } = req.query
    const filter = { role: "student" }

    if (status) {
      filter.profileStatus = status
    }

    const students = await User.find(filter, { password: 0, tokens: 0 })
    res.send(students)
  } catch (err) {
    res.status(500).send({ error: "Failed to fetch student profiles" })
  }
})

// Admin: Approve or reject a student profile
router.patch("/students/:id/status", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).send({ error: "Access denied" })
    }

    const { status, feedback } = req.body
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).send({ error: "Invalid status" })
    }

    const student = await User.findOne({ _id: req.params.id, role: "student" })
    if (!student) {
      return res.status(404).send({ error: "Student not found" })
    }

    student.profileStatus = status
    student.profileFeedback = feedback || ""

    if (status === "approved") {
      student.profileApprovedAt = new Date()
    } else if (status === "rejected") {
      student.profileRejectedAt = new Date()
    }

    await student.save()
    res.send(student)
  } catch (err) {
    res.status(400).send({ error: err.message })
  }
})

// Admin: Get a specific student profile
router.get("/students/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).send({ error: "Access denied" })
    }

    const student = await User.findOne({ _id: req.params.id, role: "student" }, { password: 0, tokens: 0 })
    if (!student) {
      return res.status(404).send({ error: "Student not found" })
    }

    res.send(student)
  } catch (err) {
    res.status(500).send({ error: "Failed to fetch student profile" })
  }
})

module.exports = router
