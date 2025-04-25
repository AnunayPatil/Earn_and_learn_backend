const express = require("express")
const router = express.Router()
const WorkEntry = require("../models/WorkEntry")
const auth = require("../middleware/auth")

// Create a new work entry
router.post("/", auth, async (req, res) => {
  try {
    const {
      workLocation,
      inTime,
      outTime,
      facultyName,
      studentName,
      className,
      division,
      collegeName,
      prnNumber,
      aadharNumber,
    } = req.body

    if (!workLocation || !inTime || !outTime) {
      return res.status(400).json({ error: "Required fields missing" })
    }

    const start = new Date(inTime)
    const end = new Date(outTime)

    if (end <= start) {
      return res.status(400).json({ error: "Out time must be after in time" })
    }

    const totalHours = (end - start) / (1000 * 60 * 60)
    const amountEarned = totalHours * 100

    const workEntry = new WorkEntry({
      student: req.user._id,
      workLocation,
      inTime: start,
      outTime: end,
      totalHours,
      amountEarned,
      status: "pending",
      facultyName,
      studentName,
      className,
      division,
      collegeName,
      prnNumber,
      aadharNumber,
    })

    await workEntry.save()
    res.status(201).json(workEntry)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Get logged-in student's work entries
router.get("/my-entries", auth, async (req, res) => {
  try {
    const entries = await WorkEntry.find({ student: req.user._id }).sort({ createdAt: -1 })
    res.send(entries)
  } catch (err) {
    res.status(500).send({ error: "Failed to fetch work entries" })
  }
})

// Get all work entries (for admin)
router.get("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).send({ error: "Access denied" })
    }

    const entries = await WorkEntry.find({}).populate("student", "email").sort({ createdAt: -1 })
    res.send(entries)
  } catch (err) {
    res.status(500).send({ error: "Failed to fetch work entries" })
  }
})

// Update work entry status (for admin)
router.patch("/:id/status", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).send({ error: "Access denied" })
    }

    const { status } = req.body
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).send({ error: "Invalid status" })
    }

    const entry = await WorkEntry.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate(
      "student",
      "email",
    )

    if (!entry) {
      return res.status(404).send({ error: "Work entry not found" })
    }

    res.send(entry)
  } catch (err) {
    res.status(500).send({ error: "Failed to update work entry status" })
  }
})

module.exports = router
