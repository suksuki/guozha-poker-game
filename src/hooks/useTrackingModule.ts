/**
 * 追踪模块 React Hook
 */

import { useSystemApplication } from './useSystemApplication';
import { TrackingModule } from '../services/system/modules/tracking/TrackingModule';
import type { Player, Card, RoundPlayRecord } from '../types/card';

export interface UseTrackingModuleReturn {
  trackingModule: TrackingModule | null;
  isReady: boolean;
  initializeTracker: (initialHands: Card[][], gameStartTime?: number) => void;
  startRound: (roundNumber: number, players: Player[]) => void;
  recordPlay: (roundNumber: number, playRecord: RoundPlayRecord) => void;
  endRound: (roundNumber: number, winnerId: number, winnerName: string, totalScore: number, players: Player[]) => void;
}

/**
 * 使用追踪模块
 */
export function useTrackingModule(): UseTrackingModuleReturn {
  const { getModule, isInitialized } = useSystemApplication();
  const trackingModule = getModule<TrackingModule>('tracking');
  const isReady = isInitialized && !!trackingModule;
  
  const initializeTracker = (initialHands: Card[][], gameStartTime?: number) => {
    if (trackingModule && isReady) {
      trackingModule.initializeTracker(initialHands, gameStartTime);
    }
  };
  
  const startRound = (roundNumber: number, players: Player[]) => {
    if (trackingModule && isReady) {
      trackingModule.startRound(roundNumber, players);
    }
  };
  
  const recordPlay = (roundNumber: number, playRecord: RoundPlayRecord) => {
    if (trackingModule && isReady) {
      trackingModule.recordPlay(roundNumber, playRecord);
    }
  };
  
  const endRound = (
    roundNumber: number,
    winnerId: number,
    winnerName: string,
    totalScore: number,
    players: Player[]
  ) => {
    if (trackingModule && isReady) {
      trackingModule.endRound(roundNumber, winnerId, winnerName, totalScore, players);
    }
  };
  
  return {
    trackingModule,
    isReady,
    initializeTracker,
    startRound,
    recordPlay,
    endRound,
  };
}

