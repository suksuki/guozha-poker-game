# Piper TTS 模型下载指南

## 问题：模型下载404错误

HuggingFace的模型URL可能已经改变，需要手动下载。

## 解决方案：手动下载模型

### 方式1: 通过HuggingFace网页下载（推荐）

1. **访问模型页面：**
   ```
   https://huggingface.co/rhasspy/piper-voices/tree/main/zh/zh_CN
   ```

2. **选择模型（推荐以下之一）：**
   - **xiaoyan** (女声，推荐) - 点击 `xiaoyan/medium/` 文件夹
   - **xiaoyi** (男声) - 点击 `xiaoyi/medium/` 文件夹  
   - **huayan** (女声) - 点击 `huayan/medium/` 文件夹

3. **下载两个文件：**
   - `xiaoyan-medium.onnx` (或对应模型名)
   - `xiaoyan-medium.onnx.json` (或对应模型名)

4. **放到项目目录：**
   ```bash
   # 确保目录存在
   mkdir -p tts-services/models
   
   # 将下载的文件放到 tts-services/models/ 目录
   ```

### 方式2: 使用git-lfs下载（如果安装了git-lfs）

```bash
cd tts-services/models
git lfs install
git clone https://huggingface.co/rhasspy/piper-voices
cd piper-voices/zh/zh_CN/xiaoyan/medium
# 复制文件到上级目录
cp xiaoyan-medium.onnx* ../../../../../
```

### 方式3: 使用Python脚本下载

创建 `scripts/download-piper-model.py`:

```python
#!/usr/bin/env python3
import requests
import os

def download_file(url, output_path):
    """下载文件"""
    print(f"正在下载: {url}")
    response = requests.get(url, stream=True)
    if response.status_code == 200:
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"✅ 下载成功: {output_path}")
        return True
    else:
        print(f"❌ 下载失败: {response.status_code}")
        return False

# 创建目录
os.makedirs('tts-services/models', exist_ok=True)

# 尝试下载模型（可能需要调整URL）
models = [
    {
        'name': 'xiaoyan-medium',
        'urls': [
            'https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/xiaoyan/medium/xiaoyan-medium.onnx',
            'https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/xiaoyan/medium/xiaoyan-medium.onnx.json',
        ]
    },
    {
        'name': 'huayan-medium', 
        'urls': [
            'https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx',
            'https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx.json',
        ]
    }
]

for model in models:
    for i, url in enumerate(model['urls']):
        ext = '.onnx' if i == 0 else '.onnx.json'
        output = f"tts-services/models/{model['name']}{ext}"
        if not os.path.exists(output):
            download_file(url, output)
        else:
            print(f"✅ 文件已存在: {output}")
```

运行：
```bash
source venv-piper/bin/activate
pip install requests
python scripts/download-piper-model.py
```

## 验证模型

下载完成后，检查文件：

```bash
ls -lh tts-services/models/
```

应该看到类似：
```
xiaoyan-medium.onnx        (~5MB)
xiaoyan-medium.onnx.json   (~1KB)
```

## 启动服务

模型下载完成后，启动服务：

```bash
source venv-piper/bin/activate
python scripts/piper-tts-server.py
```

## 如果仍然无法下载

1. **检查网络连接**
2. **使用VPN或代理**（如果在中国大陆）
3. **使用镜像站点**（如果有）
4. **联系我获取模型文件**（最后手段）

## 推荐模型

- **xiaoyan** - 女声，自然度高（推荐）
- **xiaoyi** - 男声
- **huayan** - 女声，另一种风格

选择其中一个即可，不需要全部下载。

