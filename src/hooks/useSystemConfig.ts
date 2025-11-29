/**
 * 系统配置管理 Hook
 * 用于在 UI 中读取和更新系统应用模块的配置
 */

import { useState, useEffect, useCallback } from 'react';
import { useSystemApplication } from './useSystemApplication';
import { ValidationModule } from '../services/system/modules/validation/ValidationModule';
import { TrackingModule } from '../services/system/modules/tracking/TrackingModule';
import { AudioModule } from '../services/system/modules/audio/AudioModule';
import type { ValidationConfig, TrackingConfig, AudioConfig } from '../services/system/types/SystemConfig';

export interface UseSystemConfigReturn {
  // 验证模块配置
  validationEnabled: boolean;
  validateOnRoundEnd: boolean;
  validateOnGameEnd: boolean;
  detectDuplicates: boolean;
  setValidationEnabled: (enabled: boolean) => void;
  setValidateOnRoundEnd: (enabled: boolean) => void;
  setValidateOnGameEnd: (enabled: boolean) => void;
  setDetectDuplicates: (enabled: boolean) => void;
  
  // 追踪模块配置
  trackingEnabled: boolean;
  recordSnapshots: boolean;
  setTrackingEnabled: (enabled: boolean) => void;
  setRecordSnapshots: (enabled: boolean) => void;
  
  // 音频模块配置
  audioEnabled: boolean;
  announcementEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;
  setAnnouncementEnabled: (enabled: boolean) => void;
  
  // 状态
  isReady: boolean;
  isLoading: boolean;
}

/**
 * 使用系统配置
 */
export function useSystemConfig(): UseSystemConfigReturn {
  const { getModule, isInitialized } = useSystemApplication();
  const [isLoading, setIsLoading] = useState(true);
  
  // 验证模块配置状态
  const [validationEnabled, setValidationEnabledState] = useState(true);
  const [validateOnRoundEnd, setValidateOnRoundEndState] = useState(true);
  const [validateOnGameEnd, setValidateOnGameEndState] = useState(true);
  const [detectDuplicates, setDetectDuplicatesState] = useState(true);
  
  // 追踪模块配置状态
  const [trackingEnabled, setTrackingEnabledState] = useState(true);
  const [recordSnapshots, setRecordSnapshotsState] = useState(true);
  
  // 音频模块配置状态
  const [audioEnabled, setAudioEnabledState] = useState(true);
  const [announcementEnabled, setAnnouncementEnabledState] = useState(true);
  
  // 加载配置
  useEffect(() => {
    if (!isInitialized) {
      setIsLoading(true);
      return;
    }
    
    try {
      const validationModule = getModule<ValidationModule>('validation');
      const trackingModule = getModule<TrackingModule>('tracking');
      const audioModule = getModule<AudioModule>('audio');
      
      // 读取验证模块配置
      if (validationModule) {
        const status = validationModule.getStatus();
        setValidationEnabledState(status.enabled);
        // TODO: 从模块读取详细配置
      }
      
      // 读取追踪模块配置
      if (trackingModule) {
        const status = trackingModule.getStatus();
        setTrackingEnabledState(status.enabled);
      }
      
      // 读取音频模块配置
      if (audioModule) {
        const status = audioModule.getStatus();
        setAudioEnabledState(status.enabled);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('[useSystemConfig] 加载配置失败:', error);
      setIsLoading(false);
    }
  }, [isInitialized, getModule]);
  
  // 更新验证模块配置
  const setValidationEnabled = useCallback((enabled: boolean) => {
    const validationModule = getModule<ValidationModule>('validation');
    if (validationModule) {
      validationModule.configure({ enabled });
      setValidationEnabledState(enabled);
    }
  }, [getModule]);
  
  const setValidateOnRoundEnd = useCallback((enabled: boolean) => {
    const validationModule = getModule<ValidationModule>('validation');
    if (validationModule) {
      validationModule.configure({ validateOnRoundEnd: enabled });
      setValidateOnRoundEndState(enabled);
    }
  }, [getModule]);
  
  const setValidateOnGameEnd = useCallback((enabled: boolean) => {
    const validationModule = getModule<ValidationModule>('validation');
    if (validationModule) {
      validationModule.configure({ validateOnGameEnd: enabled });
      setValidateOnGameEndState(enabled);
    }
  }, [getModule]);
  
  const setDetectDuplicates = useCallback((enabled: boolean) => {
    const validationModule = getModule<ValidationModule>('validation');
    if (validationModule) {
      // 需要完整配置，因为 configure 是浅合并
      validationModule.configure({ 
        cardIntegrity: { 
          enabled: true,  // 保持原有配置
          detectDuplicates: enabled,
          strictMode: true,
          tolerance: 0
        } 
      });
      setDetectDuplicatesState(enabled);
    }
  }, [getModule]);
  
  // 更新追踪模块配置
  const setTrackingEnabled = useCallback((enabled: boolean) => {
    const trackingModule = getModule<TrackingModule>('tracking');
    if (trackingModule) {
      trackingModule.configure({ enabled });
      setTrackingEnabledState(enabled);
    }
  }, [getModule]);
  
  const setRecordSnapshots = useCallback((enabled: boolean) => {
    const trackingModule = getModule<TrackingModule>('tracking');
    if (trackingModule) {
      trackingModule.configure({ 
        cardTracker: { recordSnapshots: enabled } 
      });
      setRecordSnapshotsState(enabled);
    }
  }, [getModule]);
  
  // 更新音频模块配置
  const setAudioEnabled = useCallback((enabled: boolean) => {
    const audioModule = getModule<AudioModule>('audio');
    if (audioModule) {
      audioModule.configure({ enabled });
      setAudioEnabledState(enabled);
    }
  }, [getModule]);
  
  const setAnnouncementEnabled = useCallback((enabled: boolean) => {
    const audioModule = getModule<AudioModule>('audio');
    if (audioModule) {
      audioModule.configure({ 
        announcement: { enabled } 
      });
      setAnnouncementEnabledState(enabled);
    }
  }, [getModule]);
  
  return {
    validationEnabled,
    validateOnRoundEnd,
    validateOnGameEnd,
    detectDuplicates,
    setValidationEnabled,
    setValidateOnRoundEnd,
    setValidateOnGameEnd,
    setDetectDuplicates,
    trackingEnabled,
    recordSnapshots,
    setTrackingEnabled,
    setRecordSnapshots,
    audioEnabled,
    announcementEnabled,
    setAudioEnabled,
    setAnnouncementEnabled,
    isReady: isInitialized && !isLoading,
    isLoading,
  };
}

