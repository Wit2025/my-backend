import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import userRoutes from "./router/routes.js";
import { connectDB } from "./config/db_mydb.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Mount routes
app.use("/", userRoutes); // endpoint เช่น /user/register

// Test route
app.get("/", (req, res) => {
  res.json({ message: "API is running..." });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port: ${PORT}`);
  await connectDB();
});
