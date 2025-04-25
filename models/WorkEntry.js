const mongoose = require("mongoose")

const workEntrySchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    workLocation: { type: String, required: true },
    inTime: { type: Date, required: true },
    outTime: { type: Date, required: true },
    totalHours: { type: Number, required: true },
    amountEarned: { type: Number, required: true },
    status: { type: String, default: "pending", enum: ["pending", "approved", "rejected"] },
    facultyName: { type: String, required: true },
    studentName: { type: String, required: true },
    className: { type: String, required: true },
    division: { type: String, required: true },
    collegeName: { type: String, required: true },
    prnNumber: { type: String, required: true },
    aadharNumber: { type: String, required: true },
  },
  { timestamps: true },
)

const WorkEntry = mongoose.model("WorkEntry", workEntrySchema)
module.exports = WorkEntry
