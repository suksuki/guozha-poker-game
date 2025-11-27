#!/usr/bin/env python3
import requests
import os

def download_file(url, output_path):
    print(f'正在下载: {url}')
    try:
        response = requests.get(url, stream=True, timeout=30)
        if response.status_code == 200:
            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0
            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total_size > 0:
                            percent = (downloaded / total_size) * 100
                            print(f'\r进度: {percent:.1f}%', end='', flush=True)
            print(f'\n 下载成功: {output_path}')
            return True
        else:
            print(f' 下载失败: HTTP {response.status_code}')
            return False
    except Exception as e:
        print(f' 下载失败: {e}')
        return False

os.makedirs('tts-services/models', exist_ok=True)

# 尝试多个模型URL
models_to_try = [
    ('xiaoyan-medium.onnx', 'https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/xiaoyan/medium/xiaoyan-medium.onnx'),
    ('xiaoyan-medium.onnx.json', 'https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/xiaoyan/medium/xiaoyan-medium.onnx.json'),
    ('zh_CN-huayan-medium.onnx', 'https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx'),
    ('zh_CN-huayan-medium.onnx.json', 'https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx.json'),
]

print('=' * 60)
print('Piper TTS 模型下载工具')
print('=' * 60)

for filename, url in models_to_try:
    output_path = f'tts-services/models/{filename}'
    if os.path.exists(output_path):
        print(f' 文件已存在: {output_path}')
    else:
        download_file(url, output_path)

print('=' * 60)
print('下载完成！')
print('=' * 60)
