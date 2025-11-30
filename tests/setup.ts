import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Mock AudioContext、indexedDB 和 SpeechSynthesis（测试环境不支持）
// 必须在模块加载前设置，所以在文件顶层直接设置

// Mock SpeechSynthesisUtterance
class MockSpeechSynthesisUtterance {
  text: string = '';
  lang: string = '';
  rate: number = 1;
  pitch: number = 1;
  volume: number = 1;
  onstart: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null = null;
  onend: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => any) | null = null;
  onerror: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisErrorEvent) => any) | null = null;
  
  constructor(text: string) {
    this.text = text;
  }
}

// 设置全局 SpeechSynthesisUtterance
if (typeof global !== 'undefined') {
  (global as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
}
if (typeof window !== 'undefined') {
  (window as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
}

// 创建 Mock AudioContext 实例的方法
const createMockAudioContextInstance = () => ({
  state: 'running',
  destination: {},
  sampleRate: 44100,
  createGain() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: {
        value: 1,
        setTargetAtTime: vi.fn(),
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        setValueCurveAtTime: vi.fn(),
        cancelScheduledValues: vi.fn()
      }
    }
  },
  createBufferSource() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      buffer: null
    }
  },
  createStereoPanner() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      pan: { value: 0 }
    }
  },
  createAnalyser() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn()
    }
  },
  decodeAudioData(data: any) {
    return Promise.resolve({
      duration: 1,
      sampleRate: 44100,
      numberOfChannels: 2,
      length: 44100
    } as AudioBuffer)
  },
  resume() {
    return Promise.resolve()
  },
  suspend() {
    return Promise.resolve()
  },
  close() {
    return Promise.resolve()
  }
})

// Mock AudioContext 构造函数（支持 new 调用）
const MockAudioContext: any = function(this: any) {
  const instance = createMockAudioContextInstance()
  Object.assign(this, instance)
  return this
}

// Mock indexedDB（改进版，支持 objectStore 操作）
// 创建一个共享的 objectStore Mock，这样 transaction.objectStore() 可以返回它
const createMockIDBObjectStore = (storeName: string = 'audioCache') => {
  const mockStore: any = {
    add: vi.fn(() => {
      const req: any = { onsuccess: null, onerror: null }
      Promise.resolve().then(() => {
        if (req.onsuccess) req.onsuccess({ target: req })
      })
      return req
    }),
    put: vi.fn(() => {
      const req: any = { onsuccess: null, onerror: null }
      Promise.resolve().then(() => {
        if (req.onsuccess) req.onsuccess({ target: req })
      })
      return req
    }),
    get: vi.fn(() => {
      const req: any = { onsuccess: null, onerror: null, result: null }
      Promise.resolve().then(() => {
        if (req.onsuccess) req.onsuccess({ target: req })
      })
      return req
    }),
    getAll: vi.fn(() => {
      const req: any = { onsuccess: null, onerror: null, result: [] }
      Promise.resolve().then(() => {
        if (req.onsuccess) req.onsuccess({ target: req })
      })
      return req
    }),
    delete: vi.fn(() => {
      const req: any = { onsuccess: null, onerror: null }
      Promise.resolve().then(() => {
        if (req.onsuccess) req.onsuccess({ target: req })
      })
      return req
    }),
    clear: vi.fn(() => {
      const req: any = { onsuccess: null, onerror: null }
      Promise.resolve().then(() => {
        if (req.onsuccess) req.onsuccess({ target: req })
      })
      return req
    }),
    createIndex: vi.fn(() => mockStore),
    index: vi.fn(() => ({
      get: vi.fn(() => {
        const req: any = { onsuccess: null, onerror: null, result: null }
        Promise.resolve().then(() => {
          if (req.onsuccess) req.onsuccess({ target: req })
        })
        return req
      }),
      getAll: vi.fn(() => {
        const req: any = { onsuccess: null, onerror: null, result: [] }
        Promise.resolve().then(() => {
          if (req.onsuccess) req.onsuccess({ target: req })
        })
        return req
      }),
      openCursor: vi.fn(() => {
        const req: any = { onsuccess: null, onerror: null, result: null }
        Promise.resolve().then(() => {
          if (req.onsuccess) req.onsuccess({ target: req })
        })
        return req
      })
    }))
  }
  return mockStore
}

// 存储每个数据库实例的 objectStore
const storeCache = new Map<string, any>()

const createMockIDBTransaction = (storeNames: string[]) => {
  // 为每个 storeName 创建一个 objectStore，或者从缓存获取
  const stores = new Map<string, any>()
  storeNames.forEach(name => {
    if (!stores.has(name)) {
      stores.set(name, createMockIDBObjectStore(name))
    }
  })
  
  return {
    objectStore: (name: string) => {
      if (!stores.has(name)) {
        stores.set(name, createMockIDBObjectStore(name))
      }
      return stores.get(name)
    },
    oncomplete: null,
    onerror: null,
    onabort: null
  }
}

const createMockIDBDatabase = () => {
  const db: any = {
    createObjectStore: (name: string, options?: any) => {
      const store = createMockIDBObjectStore(name)
      storeCache.set(name, store)
      return store
    },
    transaction: (storeNames: string[] | string, mode?: string) => {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames]
      return createMockIDBTransaction(names)
    },
    objectStoreNames: {
      contains: (name: string) => storeCache.has(name)
    }
  }
  return db
}

const mockIndexedDB: any = {
  open: (name: string, version?: number) => {
    const db = createMockIDBDatabase()
    const request: any = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: db
    }
    // 使用 Promise 在下一个 tick 触发成功
    Promise.resolve().then(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request })
      }
    })
    return request
  },
  deleteDatabase: () => ({
    onsuccess: null,
    onerror: null
  })
}

// Mock IDBKeyRange
const mockIDBKeyRange: any = {
  upperBound: (bound: any) => ({ bound, upperOpen: false }),
  lowerBound: (bound: any) => ({ bound, lowerOpen: false }),
  bound: (lower: any, upper: any) => ({ lower, upper, lowerOpen: false, upperOpen: false }),
  only: (value: any) => ({ value })
}

// Mock navigator.mediaDevices.getUserMedia
const mockGetUserMedia = vi.fn(() => {
  // 创建一个模拟的 MediaStream
  const mockStream = {
    getTracks: () => [{
      stop: vi.fn(),
      kind: 'audio',
      enabled: true
    }],
    getAudioTracks: () => [],
    getVideoTracks: () => []
  }
  return Promise.resolve(mockStream as MediaStream)
})

const mockMediaDevices = {
  getUserMedia: mockGetUserMedia,
  enumerateDevices: vi.fn(() => Promise.resolve([]))
}

// Mock MediaRecorder（BrowserTTSClient 需要）
const createMockMediaRecorder = (stream: MediaStream) => {
  const chunks: Blob[] = []
  let state: 'inactive' | 'recording' | 'paused' = 'inactive'
  
  const mockRecorder: any = {
    state,
    stream,
    mimeType: 'audio/webm',
    audioBitsPerSecond: 128000,
    videoBitsPerSecond: 0,
    
    start: vi.fn((timeslice?: number) => {
      state = 'recording'
      mockRecorder.state = state
      // 模拟数据可用事件
      setTimeout(() => {
        if (mockRecorder.ondataavailable) {
          mockRecorder.ondataavailable({
            data: new Blob(['mock audio data'], { type: 'audio/webm' })
          })
        }
      }, 10)
      // 立即停止（模拟）
      setTimeout(() => {
        state = 'inactive'
        mockRecorder.state = state
        if (mockRecorder.onstop) {
          mockRecorder.onstop()
        }
      }, 20)
    }),
    
    stop: vi.fn(() => {
      state = 'inactive'
      mockRecorder.state = state
      if (mockRecorder.onstop) {
        mockRecorder.onstop()
      }
    }),
    
    pause: vi.fn(() => {
      state = 'paused'
      mockRecorder.state = state
    }),
    
    resume: vi.fn(() => {
      state = 'recording'
      mockRecorder.state = state
    }),
    
    requestData: vi.fn(() => {
      if (mockRecorder.ondataavailable) {
        mockRecorder.ondataavailable({
          data: new Blob(['mock audio data'], { type: 'audio/webm' })
        })
      }
    }),
    
    ondataavailable: null,
    onstop: null,
    onstart: null,
    onpause: null,
    onresume: null,
    onerror: null
  }
  
  return mockRecorder
}

// Mock MediaRecorder 构造函数
const MockMediaRecorder: any = function(this: any, stream: MediaStream, options?: MediaRecorderOptions) {
  const instance = createMockMediaRecorder(stream)
  Object.assign(this, instance)
  return this
}

// 添加静态方法
MockMediaRecorder.isTypeSupported = vi.fn(() => true)

// 设置全局 Mock（在文件顶层立即执行）
const setMocks = (target: any) => {
  if (!target.window) {
    target.window = target
  }
  target.AudioContext = MockAudioContext
  target.webkitAudioContext = MockAudioContext
  target.indexedDB = mockIndexedDB
  target.IDBKeyRange = mockIDBKeyRange
  target.MediaRecorder = MockMediaRecorder
  target.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance
  
  // Mock navigator.mediaDevices
  if (!target.navigator) {
    target.navigator = {}
  }
  target.navigator.mediaDevices = mockMediaDevices
  // 兼容性：某些浏览器可能直接在 navigator 上
  if (!target.navigator.getUserMedia) {
    target.navigator.getUserMedia = mockGetUserMedia
  }
  
  // Mock window.speechSynthesis
  if (!target.speechSynthesis) {
    target.speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
      onvoiceschanged: null
    }
  }
}

// 在 globalThis 和 window 上设置
if (typeof globalThis !== 'undefined') {
  setMocks(globalThis)
}
if (typeof window !== 'undefined') {
  setMocks(window)
}

// 清理每个测试后的 DOM
afterEach(() => {
  cleanup()
})
