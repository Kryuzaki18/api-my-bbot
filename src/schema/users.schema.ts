import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  apiKey: string;
  apiSecret: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [50, "Username must be at most 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [10, "Email must be at least 10 characters"],
      maxlength: [100, "Email must be at most 100 characters"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [7, "Password must be at least 7 characters"],
    },
    apiKey: {
      type: String,
      required: [true, "Binance API key is required"],
      minlength: [10, "Binance API key must be at least 10 characters"],
    },
    apiSecret: {
      type: String,
      required: [true, "Binance API secret is required"],
      minlength: [10, "Binance API secret must be at least 10 characters"],
    },
  },
  { timestamps: true },
);

UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });

export default mongoose.model<IUser>("Users", UserSchema);
