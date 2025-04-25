const express = require("express")
const router = express.Router()
const WorkEntry = require("../models/WorkEntry")
const User = require("../models/User")
const auth = require("../middleware/auth")

// Get monthly report data for a specific student
router.get("/monthly/:studentId/:year/:month", auth, async (req, res) => {
  try {
    // Only admin or the student themselves can access their report
    if (req.user.role !== "admin" && req.user._id.toString() !== req.params.studentId) {
      return res.status(403).send({ error: "Access denied" })
    }

    const { studentId, year, month } = req.params
    const startDate = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1)
    const endDate = new Date(Number.parseInt(year), Number.parseInt(month), 0) // Last day of month
    endDate.setHours(23, 59, 59, 999)

    // Find the student
    const student = await User.findById(studentId)
    if (!student) {
      return res.status(404).send({ error: "Student not found" })
    }

    // Get all work entries for the student in the specified month
    const entries = await WorkEntry.find({
      student: studentId,
      inTime: { $gte: startDate, $lte: endDate },
    }).sort({ inTime: 1 })

    // Calculate summary data
    const totalDays = entries.length
    const totalHours = entries.reduce((sum, entry) => sum + entry.totalHours, 0)
    const totalEarnings = entries.reduce((sum, entry) => sum + entry.amountEarned, 0)

    res.send({
      student: {
        email: student.email,
        id: student._id,
      },
      month: Number.parseInt(month),
      year: Number.parseInt(year),
      entries,
      summary: {
        totalDays,
        totalHours,
        totalEarnings,
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).send({ error: "Failed to generate report" })
  }
})

// Get all months that have entries for a student
router.get("/available-months/:studentId", auth, async (req, res) => {
  try {
    // Only admin or the student themselves can access their report data
    if (req.user.role !== "admin" && req.user._id.toString() !== req.params.studentId) {
      return res.status(403).send({ error: "Access denied" })
    }

    const { studentId } = req.params

    // Get all work entries for the student
    const entries = await WorkEntry.find({ student: studentId })

    // Extract unique year-month combinations
    const months = new Set()
    entries.forEach((entry) => {
      const date = new Date(entry.inTime)
      const yearMonth = `${date.getFullYear()}-${date.getMonth() + 1}`
      months.add(yearMonth)
    })

    // Convert to array of objects with year and month properties
    const availableMonths = Array.from(months).map((ym) => {
      const [year, month] = ym.split("-")
      return { year: Number.parseInt(year), month: Number.parseInt(month) }
    })

    // Sort by year and month
    availableMonths.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return b.month - a.month
    })

    res.send(availableMonths)
  } catch (err) {
    console.error(err)
    res.status(500).send({ error: "Failed to fetch available months" })
  }
})

module.exports = router
