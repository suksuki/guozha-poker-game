#!/usr/bin/env node
/**
 * 测试 Qwen TTS（与 APP 同款：credentials: omit，校验 CORS）
 * 用法：TTS_BASE_URL=http://192.168.0.10:8000 node scripts/test-qwen-tts.mjs
 * 默认：http://localhost:8000
 */

const baseUrl = process.env.TTS_BASE_URL || 'http://localhost:8000';
const testText = '你好，我是南昌人，今朝我们来打过炸。';

const corsHeader = 'access-control-allow-origin';
const pnaHeader = 'access-control-allow-private-network';

async function main() {
  console.log('TTS 地址:', baseUrl);
  console.log('');

  // 1. GET /health
  try {
    const healthRes = await fetch(`${baseUrl}/health`, { credentials: 'omit' });
    const ok = healthRes.ok;
    let body = '';
    try {
      body = await healthRes.text();
    } catch (_) {}
    console.log('1) GET /health:', healthRes.status, ok ? 'OK' : body || '');
    if (!ok) {
      console.log('健康检查未通过，退出');
      process.exit(1);
    }
  } catch (e) {
    console.error('GET /health 失败:', e.message);
    process.exit(1);
  }

  // 2. OPTIONS /tts（预检）
  try {
    const optRes = await fetch(`${baseUrl}/tts`, {
      method: 'OPTIONS',
      credentials: 'omit',
      headers: {
        Origin: 'http://localhost:8080',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      }
    });
    const allowOrigin = optRes.headers.get(corsHeader);
    const pna = optRes.headers.get(pnaHeader);
    console.log('2) OPTIONS /tts:', optRes.status, allowOrigin ? `CORS=${allowOrigin}` : '缺 CORS 头', pna ? `PNA=${pna}` : '');
    if (optRes.status !== 204 && optRes.status !== 200) {
      console.warn('   建议 OPTIONS 返回 204');
    }
    if (!pna && optRes.status === 204) {
      console.warn('   缺 Access-Control-Allow-Private-Network（Chrome 从 localhost 访问 192.168.x.x 需要）');
    }
  } catch (e) {
    console.warn('2) OPTIONS /tts 请求异常:', e.message);
  }

  // 3. POST /tts（与 APP 一致：credentials: omit）
  const body = {
    text: testText,
    speaker: 'Vivian',
    instruct: '牌桌氛围，语气轻松一点',
    language: 'Chinese'
  };
  try {
    const res = await fetch(`${baseUrl}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'omit'
    });
    if (!res.ok) {
      console.error('3) POST /tts:', res.status, await res.text());
      process.exit(1);
    }
    const buf = await res.arrayBuffer();
    const contentType = res.headers.get('Content-Type') || '';
    const allowOrigin = res.headers.get(corsHeader);
    const pna = res.headers.get(pnaHeader);
    console.log('3) POST /tts: 200, 大小:', buf.byteLength, 'bytes, Content-Type:', contentType);
    console.log('   CORS:', allowOrigin ? allowOrigin : '无（浏览器会 Failed to fetch）');
    console.log('   PNA:', pna ? pna : '无（Chrome 访问内网需 Access-Control-Allow-Private-Network: true）');
    if (buf.byteLength === 0) {
      console.error('返回空音频');
      process.exit(1);
    }
    const fs = await import('fs');
    const path = await import('path');
    const outPath = path.join(process.cwd(), 'test-tts-out.wav');
    fs.writeFileSync(outPath, Buffer.from(buf));
    console.log('   已写入:', outPath);
  } catch (e) {
    console.error('3) POST /tts 失败:', e.message);
    process.exit(1);
  }

  console.log('');
  console.log('TTS 测试通过，APP 可正常使用。');
}

main();
