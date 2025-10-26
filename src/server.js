import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import config from "./config/config.js";
import connectDB from "./config/db.js";
// import path from 'path';

// Import routes
import routes from "./routes/index.js";
dotenv.config();

const port = config.port;
const app = express();

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(cookieParser());

app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:3000",
        "https://audit-management-chi.vercel.app",
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Connect to MongoDB
connectDB();

app.use("/", routes);

//  // Static files serve করার জন্য (uploads folder)
// app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Audit Tracker API is running",
    timestamp: new Date().toISOString(),
  });
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
