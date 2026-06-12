import mongoose from "mongoose";

let isConnected = false;

/**
 * One-time migration: copy the old `email` field into the new `identifier` field
 * for any Conversation documents that pre-date the anonymous-session feature.
 * Safe to run on every startup — `updateMany` with no matching docs is a no-op.
 */
async function runMigrations(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;

  const result = await db
    .collection("conversations")
    .updateMany(
      { identifier: { $exists: false }, email: { $exists: true } },
      [{ $set: { identifier: "$email" } }],
    );

  if (result.modifiedCount > 0) {
    console.log(
      `[MongoDB] Migration: backfilled identifier on ${result.modifiedCount} conversation(s)`,
    );
  }
}

export async function connectDB(uri: string): Promise<void> {
  if (isConnected) return;

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log("[MongoDB] Connected to Atlas");

    await runMigrations();
  } catch (error) {
    console.error("[MongoDB] Connection failed:", error);
    throw error;
  }
}

export default mongoose;
