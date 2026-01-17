import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/mongodb.js";

import userRouter from "./routes/userRoute.js";
import productRouter from "./routes/productRoute.js";
import cartRouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";
import couponRouter from "./routes/couponRoute.js";
import reviewRouter from "./routes/reviewRoute.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load environment variables
dotenv.config();

// App config
const app = express();
const port = process.env.PORT || 4000;

// Connect services
connectDB();

// Middlewares
app.use(express.json({ limit: "50mb" })); // Increase limit for base64 images
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// CORS Configuration
const corsOptions = {
  origin: [
    "https://forever-main-f.vercel.app",
    "https://forever-main-admin-p.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "token"],
};
app.use(cors(corsOptions));

// API routes
app.use("/api/user", userRouter);
app.use("/api/product", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/order", orderRouter);
app.use("/api/coupon", couponRouter);
app.use("/api/review", reviewRouter);

// Health check
app.get("/", (req, res) => {
  res.send("API working");
});

// Error handling middleware for multer and other errors
app.use((error, req, res, next) => {
  if (error.name === "MulterError") {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size too large. Maximum 5MB per file.",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files uploaded.",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${error.message}`,
    });
  }

  if (error.message && error.message.includes("Invalid file type")) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  // Default error response
  console.error("Server error:", error);
  res.status(500).json({
    success: false,
    message: error.message || "Server error",
  });
});

// Start server
app.listen(port, () => {
  console.log("Server started on port:", port);
});


export default app;
