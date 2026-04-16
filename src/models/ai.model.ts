interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradingSignal {
  ai: string;
  indicators: string[];
  pattern: string[];
  signal: 'Buy' | 'Sell' | 'Neutral';
  sl: number;
  tp: number;
  confidence_score: string;
}

interface TradingResponse {
  ai: string;
  response: string;
  confidence_score: string;
}

interface RequestBody {
  input: OHLCV[] | string;
}
