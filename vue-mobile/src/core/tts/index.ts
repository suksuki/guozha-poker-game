/**
 * TTS 模块导出
 */

export {
  BrowserTTSClient,
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
  MeloTTSClient,
  type MeloTTSConfig,
} from './meloTTSClient';

export {
  PiperTTSClient,
  type PiperTTSConfig,
} from './piperTTSClient';

export {
  AzureSpeechTTSClient,
  type AzureSpeechTTSConfig,
} from './azureSpeechTTSClient';

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

