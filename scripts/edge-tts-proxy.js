/**
 * Edge TTS 后端代理服务
 * 
 * 这个服务用于代理 Edge TTS API 请求，解决浏览器的 CORS 限制
 * 
 * 使用方法：
 * 1. 安装依赖：npm install express cors
 * 2. 启动服务：node scripts/edge-tts-proxy.js
 * 3. 服务将在 http://localhost:3001 运行
 * 
 * 注意：这是一个简单的代理实现，实际生产环境可能需要更完善的错误处理和认证
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

// 启用CORS
app.use(cors());
app.use(express.json());

// Edge TTS API 端点
const EDGE_TTS_BASE_URL = 'https://speech.platform.bing.com';

/**
 * 获取可用的语音列表
 */
app.get('/api/edge-tts/voices', async (req, res) => {
  try {
    const response = await fetch(`${EDGE_TTS_BASE_URL}/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Edge TTS API 错误: ${response.status}`);
    }

    const voices = await response.json();
    res.json(voices);
  } catch (error) {
    console.error('[Edge TTS Proxy] 获取语音列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 生成语音
 */
app.post('/api/edge-tts', async (req, res) => {
  try {
    const { text, voice, rate = 1.0, pitch = 1.0 } = req.body;

    if (!text) {
      return res.status(400).json({ error: '缺少 text 参数' });
    }

    // 默认语音
    const defaultVoice = voice || 'zh-CN-XiaoxiaoNeural';

    // 构建SSML
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
        <voice name="${defaultVoice}">
          <prosody rate="${rate}" pitch="${pitch}">
            ${text}
          </prosody>
        </voice>
      </speak>
    `.trim();

    // 调用Edge TTS API
    const response = await fetch(`${EDGE_TTS_BASE_URL}/consumer/speech/synthesize/readaloud/voices/${defaultVoice}/tts?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: ssml,
    });

    if (!response.ok) {
      throw new Error(`Edge TTS API 错误: ${response.status} ${response.statusText}`);
    }

    // 获取音频数据
    const audioBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'audio/mpeg';

    // 设置响应头
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Audio-Duration', response.headers.get('X-Audio-Duration') || '0');

    // 返回音频数据
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('[Edge TTS Proxy] 生成语音失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 健康检查
 */
app.get('/api/edge-tts/health', (req, res) => {
  res.json({ status: 'ok', service: 'edge-tts-proxy' });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`[Edge TTS Proxy] 服务已启动: http://localhost:${PORT}`);
  console.log(`[Edge TTS Proxy] 健康检查: http://localhost:${PORT}/api/edge-tts/health`);
  console.log(`[Edge TTS Proxy] 语音列表: http://localhost:${PORT}/api/edge-tts/voices`);
});

