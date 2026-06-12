import mongoose, { Schema, Document } from "mongoose";

export interface IConversationMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface IConversation extends Document {
  /**
   * Stable session key — one of:
   *   - `email@domain.com`   authenticated user (email login)
   *   - `key:<binanceApiKey>` authenticated user (API-key login)
   *   - `anon:<uuid>`        anonymous visitor
   */
  identifier: string;
  messages: IConversationMessage[];
}

const ConversationSchema: Schema = new Schema(
  {
    identifier: {
      type: String,
      required: true,
      unique: true,
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

ConversationSchema.index({ identifier: 1 });

export default mongoose.model<IConversation>("Conversations", ConversationSchema);
