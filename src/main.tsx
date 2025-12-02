import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
// 确保i18n在React渲染前初始化
import './i18n' // 导入i18n配置（会自动查找index.ts）
import { GameConfigProvider } from './contexts/GameConfigContext'
import { isSpeechSupported, listAvailableVoices } from './services/voiceService'
import { checkChatStrategy, chatService } from './services/chatService'
import { getAudioMixer } from './audio/AudioMixer'
import './utils/testLLMChat' // 导入测试函数

// 🚀 自动检测LLM可用性并初始化聊天服务

// 异步初始化聊天服务（自动检测LLM）
chatService.initializeWithAutoDetection().then(() => {
  const strategyInfo = checkChatStrategy();
  if (strategyInfo.isLLM) {
  } else {
  }
}).catch(error => {
});

// 检查语音支持并输出调试信息
if (isSpeechSupported()) {
  // 等待语音加载完成后列出可用语音
  window.speechSynthesis.onvoiceschanged = () => {
    listAvailableVoices();
  };
  // 立即尝试列出语音（可能已经加载）
  setTimeout(() => {
    listAvailableVoices();
  }, 500);
} else {
}

// 在用户第一次交互时激活音频（浏览器安全限制）
let audioActivated = false;
const activateAudio = async () => {
  if (audioActivated) return;
  
  // 激活语音合成
  if (isSpeechSupported()) {
    const utterance = new SpeechSynthesisUtterance('');
    utterance.volume = 0;
    window.speechSynthesis.speak(utterance);
    window.speechSynthesis.cancel();
  }
  
  // 激活AudioMixer（WebAudio）
  try {
    const mixer = getAudioMixer();
    await mixer.init();
    await mixer.resume();
  } catch (error) {
    // 静默失败，不影响用户体验
  }
  
  audioActivated = true;
};

// 监听用户交互
document.addEventListener('click', activateAudio, { once: true });
document.addEventListener('keydown', activateAudio, { once: true });
document.addEventListener('touchstart', activateAudio, { once: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading...</div>}>
      <GameConfigProvider>
        <App />
      </GameConfigProvider>
    </Suspense>
  </React.StrictMode>,
)

