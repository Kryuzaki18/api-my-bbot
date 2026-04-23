import mongoose, { Schema, Document } from "mongoose";
import type { OrderSide } from "../models/order.model.js";

export interface IAnalysis extends Document {
  status: string;
  message: string;
  response: IAnalysisData | null;
}

interface IAnalysisData {
  signal: IAnalysisSignal;
  buy: IAnalysisEntry[];
  sell: IAnalysisEntry[];
}

interface IAnalysisSignal {
  type: OrderSide;
  entryZone: number[];
  sl: number;
  tp: number;
  leverage: number;
  riskReward: number;
  reasoning: string;
  confidence: IConfidence;
}

interface IConfidence {
  score: number;
  components: {
    trend: number;
    momentum: number;
    volume: number;
    structure: number;
  };
}

interface IAnalysisEntry {
  indicators: string[];
  pattern: string[];
  entryZone: number[];
  sl: number;
  tp: number;
  leverage: number;
  riskReward: number;
}

const AnalysisSchema: Schema = new Schema(
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

AnalysisSchema.index({ _id: 1 });

export default mongoose.model<IAnalysis>("Analysis", AnalysisSchema);
