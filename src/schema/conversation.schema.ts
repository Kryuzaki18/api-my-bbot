import mongoose, { Schema, Document } from "mongoose";

export interface IConversationMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface IConversation extends Document {
  email: string;
  messages: IConversationMessage[];
}

const ConversationSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    messages: [
      {
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

ConversationSchema.index({ email: 1 });

export default mongoose.model<IConversation>("Conversations", ConversationSchema);
