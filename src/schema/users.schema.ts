import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  binanceKeys: {
    test: {
      apiKey: string;
      apiSecret: string;
    };
    prod: {
      apiKey: string;
      apiSecret: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
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
    binanceKeys: {
      test: {
        apiKey: {
          type: String,
          required: [true, "Testnet Binance API key is required"],
          minlength: [10, "Testnet Binance API key must be at least 10 characters"],
        },
        apiSecret: {
          type: String,
          required: [true, "Testnet Binance API secret is required"],
          minlength: [10, "Testnet Binance API secret must be at least 10 characters"],
        },
      },
      prod: {
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
    },
  },
  { timestamps: true },
);

UserSchema.index({ email: 1 });

export default mongoose.model<IUser>("Users", UserSchema);
