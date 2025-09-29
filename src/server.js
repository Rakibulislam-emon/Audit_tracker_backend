import dotenv from "dotenv";
dotenv.config();

import express from "express";
import config from "./config/config.js";
import connectDB from "./config/db.js";
// import path from 'path';
// Import routes
import routes from "./routes/index.js";

const port = config.port;
const app = express();
// Middleware
app.use(express.json()); // Parse JSON bodies

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
