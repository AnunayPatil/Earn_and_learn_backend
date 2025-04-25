const express = require("express")
const router = express.Router()
const User = require("../models/User")
const auth = require("../middleware/auth")
const WorkEntry = require("../models/WorkEntry")

// Register a new student (public route)
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body

    // Force role to be student for public registration
    const role = "student"

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).send({ error: "Email already in use" })
    }

    const user = new User({ email, password, role })
    await user.save()
    const token = await user.generateAuthToken()
    res.status(201).send({ user, token })
  } catch (err) {
    res.status(400).send({ error: err.message })
  }
})

// Create admin account (protected route - only existing admins can create new admins)
router.post("/create-admin", auth, async (req, res) => {
  try {
    // Check if the requesting user is an admin
    if (req.user.role !== "admin") {
      return res.status(403).send({ error: "Access denied. Only admins can create admin accounts." })
    }

    const { email, password } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).send({ error: "Email already in use" })
    }

    const newAdmin = new User({ email, password, role: "admin" })
    await newAdmin.save()

    res
      .status(201)
      .send({ message: "Admin account created successfully", admin: { email: newAdmin.email, _id: newAdmin._id } })
  } catch (err) {
    res.status(400).send({ error: err.message })
  }
})

// Login
router.post("/login", async (req, res) => {
  try {
    const user = await User.findByCredentials(req.body.email, req.body.password)
    const token = await user.generateAuthToken()
    res.send({ user, token })
  } catch (err) {
    res.status(400).send({ error: "Invalid credentials" })
  }
})

// Get current user
router.get("/me", auth, async (req, res) => {
  res.send(req.user)
})

// Logout
router.post("/logout", auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter((t) => t.token !== req.token)
    await req.user.save()
    res.send()
  } catch (err) {
    res.status(500).send({ error: "Failed to log out" })
  }
})

// Admin: Get all students and their work entries
router.get("/students", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).send({ error: "Access denied" })
    }

    const students = await User.find({ role: "student" })

    // For each student, get their work entries
    const studentWorkEntries = await Promise.all(
      students.map(async (student) => {
        const workEntries = await WorkEntry.find({ student: student._id }).sort({ inTime: -1 })
        return {
          student,
          workEntries,
        }
      }),
    )

    res.status(200).send(studentWorkEntries)
  } catch (err) {
    res.status(500).send({ error: "Failed to fetch students and their work entries" })
  }
})

// Get all admins (admin only)
router.get("/admins", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).send({ error: "Access denied" })
    }

    const admins = await User.find({ role: "admin" }, { password: 0, tokens: 0 })
    res.status(200).send(admins)
  } catch (err) {
    res.status(500).send({ error: "Failed to fetch admins" })
  }
})

module.exports = router
