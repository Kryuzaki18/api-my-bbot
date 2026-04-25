import mongoose, { Schema, Document } from "mongoose";
import type { AIResponseData } from "../models/ai.model.js";

export interface IAnalyses extends Document {
  status: string;
  message: string;
  response: AIResponseData;
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
