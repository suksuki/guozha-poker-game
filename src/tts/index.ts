/**
 * TTS 模块导出
 */

export {
  BrowserTTSClient,
  LocalTTSClient,
  synthesizeSpeech,
  setDefaultTTSClient,
  getDefaultTTSClient,
  type ITTSClient,
  type TTSLanguage,
  type TTSOptions,
  type TTSResult,
} from './ttsClient';

export {
  SpeakerManager,
  defaultSpeakerManager,
  type SpeakerConfig,
  DEFAULT_SPEAKERS,
} from './speakers';

export {
  LocalTTSAPIClient,
  EdgeTTSClient,
  type LocalTTSConfig,
} from './localTTSClient';

export {
  GPTSoVITSClient,
  type GPTSoVITSConfig,
} from './gptSoVITSClient';

export {
  CoquiTTSClient,
  type CoquiTTSConfig,
} from './coquiTTSClient';

export {
  AudioCache,
  getAudioCache,
} from './audioCache';

export {
  TTSServiceManager,
  getTTSServiceManager,
  type TTSProvider,
  type TTSProviderConfig,
} from './ttsServiceManager';

export {
  initTTS,
  getTTSConfigFromEnv,
  saveTTSConfig,
  type TTSInitConfig,
} from './initTTS';

