import mongoose, { Schema, Document } from "mongoose";
import type { AIResponse } from "../models/ai.model.js";

export interface IAnalyses extends Document {
  status: string;
  message: string;
  response: AIResponse;
}

const AnalysesSchema: Schema = new Schema(
  {
    status: {
      type: String,
    },
    message: {
      type: String,
    },
    response: {
      type: Object,
    },
  },
  { timestamps: true },
);

AnalysesSchema.index({ _id: 1 });

export default mongoose.model<IAnalyses>("Analyses", AnalysesSchema);
