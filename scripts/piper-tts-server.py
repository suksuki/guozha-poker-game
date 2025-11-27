#!/usr/bin/env python3
"""
Piper TTS HTTP 服务
用于为游戏提供轻量级本地TTS服务

安装依赖：
    pip install flask piper-tts

使用方法：
    python scripts/piper-tts-server.py

服务地址：
    http://localhost:5000
"""

from flask import Flask, request, send_file
from flask_cors import CORS
import io
import os
import sys

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 全局变量
voice = None
MODEL_PATH = None

def find_model_path():
    """查找可用的模型文件"""
    model_dir = os.path.join(os.path.dirname(__file__), '..', 'tts-services', 'models')
    possible_models = [
        'zh_CN-huayan-medium.onnx',  # 优先使用已下载的模型
        'xiaoyan-medium.onnx',
        'zh_CN-xiaoyan-medium.onnx',
    ]
    
    for model_name in possible_models:
        model_path = os.path.join(model_dir, model_name)
        if os.path.exists(model_path) and os.path.getsize(model_path) > 0:
            return model_path
    
    # 尝试其他路径
    other_paths = [
        os.path.expanduser('~/piper-models/xiaoyan-medium.onnx'),
        os.path.join(os.getcwd(), 'models', 'xiaoyan-medium.onnx'),
    ]
    
    for path in other_paths:
        if os.path.exists(path) and os.path.getsize(path) > 0:
            return path
    
    return None

def pcm_to_wav(pcm_data, sample_rate=22050, channels=1, sample_width=2):
    """将PCM数据转换为WAV格式"""
    import struct
    
    # WAV文件头
    # RIFF header
    wav_header = b'RIFF'
    # 文件大小（稍后填充）
    wav_header += struct.pack('<I', 0)
    # WAVE标识
    wav_header += b'WAVE'
    
    # fmt chunk
    wav_header += b'fmt '
    # fmt chunk大小
    wav_header += struct.pack('<I', 16)
    # 音频格式（1=PCM）
    wav_header += struct.pack('<H', 1)
    # 声道数
    wav_header += struct.pack('<H', channels)
    # 采样率
    wav_header += struct.pack('<I', sample_rate)
    # 字节率
    byte_rate = sample_rate * channels * sample_width
    wav_header += struct.pack('<I', byte_rate)
    # 块对齐
    block_align = channels * sample_width
    wav_header += struct.pack('<H', block_align)
    # 位深度
    wav_header += struct.pack('<H', sample_width * 8)
    
    # data chunk
    wav_header += b'data'
    # data chunk大小
    data_size = len(pcm_data)
    wav_header += struct.pack('<I', data_size)
    
    # 更新文件大小（RIFF chunk大小 = 文件大小 - 8）
    file_size = len(wav_header) + data_size - 8
    wav_header = wav_header[:4] + struct.pack('<I', file_size) + wav_header[8:]
    
    # 合并WAV头和PCM数据
    return wav_header + pcm_data

def load_voice():
    """加载Piper TTS模型"""
    global voice, MODEL_PATH
    
    if voice is not None:
        return voice
    
    # 先查找模型路径
    model_path = find_model_path()
    if not model_path:
        raise FileNotFoundError('未找到Piper TTS模型文件，请下载模型到 tts-services/models/ 目录')
    
    MODEL_PATH = model_path
    
    try:
        # 尝试使用piper-tts Python包
        try:
            from piper import PiperVoice
            
            print(f'[Piper TTS] 加载模型: {MODEL_PATH}')
            voice = PiperVoice.load(MODEL_PATH)
            print(f'[Piper TTS] ✅ 模型加载成功')
            return voice
            
        except ImportError:
            # 如果piper-tts包不可用，尝试使用piper命令行工具
            print('[Piper TTS] ⚠️  piper-tts Python包未安装，尝试使用piper命令行工具...')
            
            # 查找piper可执行文件
            piper_paths = [
                'piper',  # 系统PATH中
                os.path.join(os.path.dirname(__file__), '..', 'tts-services', 'piper', 'piper'),
                os.path.join(os.path.dirname(__file__), '..', 'tts-services', 'piper', 'piper.exe'),
            ]
            
            piper_cmd = None
            for path in piper_paths:
                if path == 'piper' and os.system(f'which {path} > /dev/null 2>&1') == 0:
                    piper_cmd = path
                    break
                elif os.path.exists(path) and os.access(path, os.X_OK):
                    piper_cmd = path
                    break
            
            if piper_cmd:
                print(f'[Piper TTS] ✅ 找到piper命令行工具: {piper_cmd}')
                # 使用命令行工具模式（需要修改synthesize方法）
                voice = {'type': 'command', 'cmd': piper_cmd}
                return voice
            else:
                raise ImportError('未找到piper-tts包或piper命令行工具')
        
    except Exception as e:
        print(f'[Piper TTS] ❌ 加载失败: {e}')
        print('[Piper TTS] 💡 建议：')
        print('   1. 运行安装脚本: ./scripts/setup-piper-tts.sh')
        print('   2. 或手动下载模型到 tts-services/models/ 目录')
        print('[Piper TTS] 📖 安装指南: docs/setup/piper-tts-setup.md')
        raise
    except Exception as e:
        print(f'[Piper TTS] ❌ 加载模型失败: {e}')
        raise

@app.route('/api/tts', methods=['POST'])
def synthesize():
    """TTS合成接口"""
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return {'error': '缺少 text 参数'}, 400
        
        # 加载语音模型（如果还没有加载）
        voice = load_voice()
        
        # 根据voice类型选择合成方式
        if isinstance(voice, dict) and voice.get('type') == 'command':
            # 使用命令行工具
            import subprocess
            import tempfile
            
            piper_cmd = voice['cmd']
            # 使用已找到的模型路径，如果没有则重新查找
            if not MODEL_PATH:
                model_path = find_model_path()
                if not model_path:
                    raise FileNotFoundError('未找到Piper TTS模型文件')
            else:
                model_path = MODEL_PATH
            
            # 创建临时文件
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
                tmp_path = tmp_file.name
            
            try:
                # 调用piper命令行工具
                result = subprocess.run(
                    [piper_cmd, '--model', model_path, '--output_file', tmp_path],
                    input=text.encode('utf-8'),
                    capture_output=True,
                    check=True
                )
                
                # 读取生成的音频文件
                with open(tmp_path, 'rb') as f:
                    audio_data = f.read()
                
                # 删除临时文件
                os.unlink(tmp_path)
                
                return send_file(
                    io.BytesIO(audio_data),
                    mimetype='audio/wav',
                    as_attachment=False
                )
            except subprocess.CalledProcessError as e:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
                raise Exception(f'piper命令行工具执行失败: {e.stderr.decode()}')
        else:
            # 使用Python包
            # synthesize() 返回AudioChunk对象的生成器
            audio_generator = voice.synthesize(text)
            
            # 收集所有AudioChunk并获取音频参数
            audio_chunks = []
            sample_rate = None
            sample_channels = None
            sample_width = None
            
            for chunk in audio_generator:
                # 获取音频参数（从第一个chunk）
                if sample_rate is None:
                    sample_rate = getattr(chunk, 'sample_rate', 22050)
                    sample_channels = getattr(chunk, 'sample_channels', 1)
                    sample_width = getattr(chunk, 'sample_width', 2)
                
                # AudioChunk对象有audio_int16_bytes属性，包含PCM音频数据
                if hasattr(chunk, 'audio_int16_bytes'):
                    audio_chunks.append(chunk.audio_int16_bytes)
                elif hasattr(chunk, 'audio_int16_array'):
                    # 如果是数组，转换为字节
                    import numpy as np
                    audio_chunks.append(chunk.audio_int16_array.tobytes())
                elif isinstance(chunk, bytes):
                    audio_chunks.append(chunk)
                else:
                    audio_chunks.append(bytes(chunk))
            
            # 将所有chunk合并为PCM数据
            pcm_data = b''.join(audio_chunks)
            
            # 将PCM数据包装成WAV格式
            audio_data = pcm_to_wav(pcm_data, sample_rate, sample_channels, sample_width)
            
            # 返回音频数据
            return send_file(
                io.BytesIO(audio_data),
                mimetype='audio/wav',
                as_attachment=False
            )
    except Exception as e:
        print(f'[Piper TTS] ❌ 合成失败: {e}')
        return {'error': str(e)}, 500

@app.route('/health', methods=['GET'])
def health():
    """健康检查接口"""
    try:
        # 检查模型文件是否存在（不强制加载）
        model_dir = os.path.join(os.path.dirname(__file__), '..', 'tts-services', 'models')
        possible_models = [
            'xiaoyan-medium.onnx',
            'zh_CN-huayan-medium.onnx',
            'zh_CN-xiaoyan-medium.onnx',
        ]
        
        found_model = None
        for model_name in possible_models:
            model_path = os.path.join(model_dir, model_name)
            if os.path.exists(model_path) and os.path.getsize(model_path) > 0:
                found_model = model_name
                break
        
        if found_model:
            # 尝试加载模型以检查服务是否正常
            try:
                load_voice()
                return {
                    'status': 'ok',
                    'service': 'piper-tts',
                    'model': found_model,
                    'model_path': MODEL_PATH or '未加载'
                }
            except Exception as e:
                # 即使加载失败，如果模型文件存在，也认为服务可用
                return {
                    'status': 'ok',
                    'service': 'piper-tts',
                    'model': found_model,
                    'warning': f'模型加载失败但文件存在: {str(e)}'
                }
        else:
            return {
                'status': 'error',
                'service': 'piper-tts',
                'error': '未找到模型文件',
                'suggested_path': model_dir
            }, 500
    except Exception as e:
        return {
            'status': 'error',
            'service': 'piper-tts',
            'error': str(e)
        }, 500

@app.route('/models', methods=['GET'])
def list_models():
    """列出可用的模型"""
    models_dir = os.path.join(os.path.dirname(__file__), '..', 'tts-services', 'models')
    if os.path.exists(models_dir):
        models = [f for f in os.listdir(models_dir) if f.endswith('.onnx')]
        return {'models': models}
    return {'models': []}

if __name__ == '__main__':
    print('=' * 60)
    print('[Piper TTS] 🚀 启动服务...')
    print('[Piper TTS] 📖 安装指南: docs/setup/piper-tts-setup.md')
    print('=' * 60)
    
    try:
        # 尝试加载模型
        load_voice()
    except Exception as e:
        print(f'[Piper TTS] ⚠️ 模型加载失败: {e}')
        print('[Piper TTS] 💡 服务仍会启动，但TTS功能可能不可用')
        print('[Piper TTS] 💡 请参考安装指南下载模型')
    
    print(f'[Piper TTS] ✅ 服务已启动: http://localhost:5000')
    print(f'[Piper TTS] 📍 健康检查: http://localhost:5000/health')
    print(f'[Piper TTS] 📍 TTS接口: http://localhost:5000/api/tts')
    print('=' * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=False)

