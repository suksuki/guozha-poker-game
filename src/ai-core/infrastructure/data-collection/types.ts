/**
 * 数据收集相关类型
 */

export interface TrainingDataPoint {
  id: string;
  sessionId: string;
  timestamp: number;
  playerId: number;
  personality: string;
  
  input: {
    gameState: any;
    cognitive: any;
    context: any;
  };
  
  output: {
    decision?: {
      action: any;
      reasoning: string;
      confidence: number;
    };
    communication?: {
      message: string;
      intent: string;
      emotion: string;
    };
  };
  
  feedback?: any;
  annotation: {
    quality: 'excellent' | 'good' | 'average' | 'poor';
    category: string[];
    tags: string[];
    notes: string;
  };
}

export interface TrainingSession {
  id: string;
  startTime: number;
  endTime?: number;
  metadata: any;
  dataPoints: TrainingDataPoint[];
  statistics: SessionStatistics;
}

export interface SessionStatistics {
  totalDataPoints: number;
  byQuality: Record<string, number>;
  byCategory: Record<string, number>;
  avgConfidence: number;
}

