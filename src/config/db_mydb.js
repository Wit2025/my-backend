import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.DATABASE_URL; // เช่น mongodb://localhost:27017
const client = new MongoClient(uri);

let db;

export async function connectDB() {
  try {
    await client.connect();
    db = client.db("travel_booking"); // database name
    console.log("MongoDB connected to travel_booking");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

export default function getDB() {
  if (!db) throw new Error("Database not initialized");
  return db;
}
