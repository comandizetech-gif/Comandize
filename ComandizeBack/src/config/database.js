import mongoose from "mongoose";

const connectDatabase = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI não encontrada no .env");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
    });

    console.log("MongoDB conectado 🚀");
  } catch (error) {
    console.log("ERRO MONGODB:");
    console.log(error.message);
  }
};

export default connectDatabase;