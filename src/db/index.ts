import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const MONGODB_URI = "mongodb://localhost:27017/riddle";

export async function initializeDB() {
  return mongoose.connect(MONGODB_URI).then(() => {
    console.log("Successfully connected to MongoDB");
    return mongoose.connection;
  });
}

export default mongoose.connection;
