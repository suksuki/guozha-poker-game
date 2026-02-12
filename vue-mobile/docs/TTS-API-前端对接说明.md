# TTS 接口说明（给前端）

当前服务地址：**http://192.168.0.10:8000**，CORS 已配置为 `*`，**不支持 credentials**。

---

## 1) 接口地址

| 用途     | 方法 | URL                              |
|----------|------|-----------------------------------|
| 健康检查 | GET  | http://192.168.0.10:8000/health |
| 语音合成 | POST | http://192.168.0.10:8000/tts    |

---

## 2) 请求格式（POST /tts）

**Headers**

- `Content-Type: application/json`
- **不要带 cookie / credentials**（见下方注意事项）

**Body（JSON）**

```json
{
  "text": "你好，我是南昌人，今朝我们来打过炸。",
  "speaker": "Vivian",
  "instruct": "牌桌氛围，语气轻松一点",
  "language": "Chinese"
}
```

**字段说明**

| 字段      | 必填 | 说明 |
|-----------|------|------|
| text      | 是   | 要合成的文字 |
| speaker   | 否   | 默认 `"Vivian"` |
| instruct  | 否   | 默认 `"语气自然"`（控制情绪/风格） |
| language  | 否   | 默认 `"Chinese"` |

---

## 3) 响应格式

- **Content-Type:** `audio/wav`
- **返回体：** WAV 二进制（PCM16）

**可选响应头**

- `X-Gen-Seconds`：生成耗时（秒）
- `X-Sample-Rate`：采样率（如 24000）

---

## 4) 浏览器 fetch 示例（推荐）

**注意：不要加 `credentials: 'include'`，也不要用 axios 的 `withCredentials: true`。**

```js
async function ttsToAudioUrl(text) {
  const res = await fetch("http://192.168.0.10:8000/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      speaker: "Vivian",
      instruct: "牌桌氛围，语气轻松一点",
      language: "Chinese",
    }),
    credentials: "omit",
  });

  if (!res.ok) throw new Error(await res.text());

  const blob = await res.blob(); // audio/wav
  return URL.createObjectURL(blob);
}

async function playTTS(text) {
  const url = await ttsToAudioUrl(text);
  const audio = new Audio(url);
  await audio.play();
}
```

---

## 5) axios 示例

```js
import axios from "axios";

async function playTTS(text) {
  const res = await axios.post(
    "http://192.168.0.10:8000/tts",
    { text, speaker: "Vivian", instruct: "语气自然", language: "Chinese" },
    { responseType: "arraybuffer" } // 关键：拿二进制，不要 withCredentials
  );

  const blob = new Blob([res.data], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  new Audio(url).play();
}
```

---

## 6) 必须注意的坑

1. **不能使用 credentials**
   - `fetch` 不要设置 `credentials: 'include'`
   - axios 不要设置 `withCredentials: true`

2. **必须用 blob / arraybuffer 接二进制**
   - 不要 `res.json()`，不要当文本处理

3. **Mixed Content**
   - 如果页面是 **HTTPS**，TTS 是 **HTTP**，浏览器会报 Mixed Content（表现可能像 Failed to fetch）。
   - 局域网用 HTTP 页面一般没问题；若前端是 HTTPS 域名，需要给 TTS 做 HTTPS 反代（可另要 Nginx/Caddy 配置）。

---

## 7) curl 自测

```bash
curl -s http://192.168.0.10:8000/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"测试一下","speaker":"Vivian","instruct":"语气自然","language":"Chinese"}' \
  --output out.wav
```

若把前端运行地址（如 http://192.168.0.7:5173 或 https://xxx）提供给后端，可提前判断是否会遇到 Mixed Content、是否需要 HTTPS 反代。
