const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const validator = require("validator")

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate: (value) => {
        if (!validator.isEmail(value)) throw new Error("Invalid email")
      },
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      trim: true,
    },
    role: {
      type: String,
      enum: ["student", "admin"],
      required: true,
    },
    tokens: [{ token: { type: String, required: true } }],
    // Profile fields
    profileStatus: {
      type: String,
      enum: ["incomplete", "pending", "approved", "rejected"],
      default: "incomplete",
    },
    profileImage: {
      type: String, // URL to the image
    },
    // Student specific fields
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", ""],
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    // Academic information
    collegeName: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    course: {
      type: String,
      trim: true,
    },
    yearOfStudy: {
      type: Number,
    },
    rollNumber: {
      type: String,
      trim: true,
    },
    prnNumber: {
      type: String,
      trim: true,
    },
    // Government IDs
    aadharNumber: {
      type: String,
      trim: true,
    },
    // Bank details for payments
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      bankName: String,
      ifscCode: String,
      branch: String,
    },
    // Admin feedback on profile
    profileFeedback: {
      type: String,
      trim: true,
    },
    // Profile submission and approval timestamps
    profileSubmittedAt: {
      type: Date,
    },
    profileApprovedAt: {
      type: Date,
    },
    profileRejectedAt: {
      type: Date,
    },
  },
  { timestamps: true },
)

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 8)
  }
})

userSchema.methods.generateAuthToken = async function () {
  const token = jwt.sign({ _id: this._id, role: this.role }, process.env.JWT_SECRET, { expiresIn: "7d" })
  this.tokens.push({ token })
  await this.save()
  return token
}

userSchema.statics.findByCredentials = async (email, password) => {
  const user = await User.findOne({ email })
  if (!user) throw new Error("Invalid credentials")
  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) throw new Error("Invalid credentials")
  return user
}

// Method to check if profile is complete
userSchema.methods.isProfileComplete = function () {
  return (
    this.firstName &&
    this.lastName &&
    this.phoneNumber &&
    this.dateOfBirth &&
    this.gender &&
    this.collegeName &&
    this.department &&
    this.course &&
    this.yearOfStudy &&
    this.rollNumber &&
    this.prnNumber &&
    this.aadharNumber
  )
}

const User = mongoose.model("User", userSchema)
module.exports = User
