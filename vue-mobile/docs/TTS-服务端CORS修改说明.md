# TTS 服务端 CORS 修改说明（给服务端同事）

前端现象：**GET /health 正常，POST /tts 在浏览器里报 Failed to fetch**。  
原因是：浏览器对带 JSON body 的 POST 会先发 **OPTIONS 预检**，并且要求**实际 POST 的响应**里也带 CORS 头，否则会拦截。

---

## 需要服务端做的修改

**保证以下两个响应的响应头里都带上 CORS：**

1. **OPTIONS /tts**（预检请求）  
   - 已有的话保持即可，需包含：  
     `Access-Control-Allow-Origin: *`（或具体前端域名）  
     `Access-Control-Allow-Methods: GET, POST, OPTIONS`  
     `Access-Control-Allow-Headers: content-type`

2. **POST /tts 的 200 响应**（返回 WAV 二进制的那次）  
   - **必须**在这次响应的响应头里也加上：  
     `Access-Control-Allow-Origin: *`（或与 OPTIONS 一致）  
   - 很多实现只给 OPTIONS 加了 CORS，忘记给实际 POST 的响应加，浏览器会报 Failed to fetch。

---

## FastAPI 示例（推荐）

在创建 `app` 后加一层 CORS 中间件，**所有响应**（含 GET /health、OPTIONS /tts、POST /tts）都会自动带 CORS 头：

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
```

说明：当前前端不会带 cookie，服务端 CORS 是 `*` 且不支持 credentials，所以这里用 `allow_credentials=False` 即可。

---

## 如何自测

在 TTS 服务所在机器上执行：

```bash
# 看 POST /tts 的响应头里是否有 access-control-allow-origin
curl -i -X POST http://192.168.0.11:8000/tts \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:8080" \
  -d '{"text":"测试","speaker":"Vivian","instruct":"","language":"Chinese"}' 2>/dev/null | head -n 20
```

若响应头里没有 `access-control-allow-origin`，说明 POST 响应未加 CORS，需要按上面方式在服务端给**所有响应**（或至少 POST /tts）加上该头。
