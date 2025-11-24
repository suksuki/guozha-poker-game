import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './i18n'
import { isSpeechSupported, listAvailableVoices } from './services/voiceService'
import { checkChatStrategy } from './services/chatService'
import './utils/testLLMChat' // 导入测试函数

// 检查聊天策略
const strategyInfo = checkChatStrategy();
console.log('🔍 当前聊天策略检查:', strategyInfo);
if (strategyInfo.isLLM) {
  console.log('✅ 正在使用大模型（LLM）聊天策略');
} else {
  console.warn('⚠️ 正在使用规则（rule-based）聊天策略，不是大模型');
}

// 检查语音支持并输出调试信息
if (isSpeechSupported()) {
  console.log('✅ 语音合成API支持');
  // 等待语音加载完成后列出可用语音
  window.speechSynthesis.onvoiceschanged = () => {
    listAvailableVoices();
  };
  // 立即尝试列出语音（可能已经加载）
  setTimeout(() => {
    listAvailableVoices();
  }, 500);
} else {
  console.warn('❌ 浏览器不支持语音合成API');
}

// 在用户第一次交互时激活语音（浏览器安全限制）
let voiceActivated = false;
const activateVoice = () => {
  if (!voiceActivated && isSpeechSupported()) {
    // 创建一个空的utterance来激活语音服务
    const utterance = new SpeechSynthesisUtterance('');
    utterance.volume = 0;
    window.speechSynthesis.speak(utterance);
    window.speechSynthesis.cancel(); // 立即取消
    voiceActivated = true;
    console.log('✅ 语音服务已激活');
  }
};

// 监听用户交互
document.addEventListener('click', activateVoice, { once: true });
document.addEventListener('keydown', activateVoice, { once: true });
document.addEventListener('touchstart', activateVoice, { once: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

