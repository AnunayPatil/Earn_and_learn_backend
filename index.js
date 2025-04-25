const express = require("express")
const cors = require("cors")
const dotenv = require("dotenv")
const connectDB = require("./config/db")
const path = require("path")

// Load env vars
dotenv.config()

// Connect to MongoDB
connectDB()

const app = express()

// Middleware
app.use(cors({
    origin:["http://localhost:3000","https://earn-and-learn.vercel.app"]
}))
app.use(express.json())

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Routes
app.use("/api/auth", require("./routes/authRoutes"))
app.use("/api/work-entries", require("./routes/workEntryRoutes"))
app.use("/api/reports", require("./routes/reportRoutes"))
app.use("/api/profile", require("./routes/profileRoutes"))

app.get("/",(req,res)=>{
    res.send("Hello")
})

// Start server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
