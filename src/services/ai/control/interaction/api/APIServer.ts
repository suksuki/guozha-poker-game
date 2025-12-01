/**
 * API服务器
 * 提供REST API和WebSocket接口
 */

import { InteractionService } from '../InteractionService';
import { EventBus } from '../../events/EventBus';

/**
 * API请求
 */
export interface APIRequest {
  method: string;
  path: string;
  params?: Record<string, any>;
  body?: any;
  query?: Record<string, any>;
}

/**
 * API响应
 */
export interface APIResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

/**
 * API服务器（简化版，实际应该使用Express等框架）
 */
export class APIServer {
  private interactionService: InteractionService;
  private eventBus: EventBus;
  private routes: Map<string, (req: APIRequest) => Promise<APIResponse>> = new Map();
  
  constructor() {
    this.interactionService = new InteractionService();
    this.eventBus = EventBus.getInstance();
    this.setupRoutes();
  }
  
  /**
   * 设置路由
   */
  private setupRoutes(): void {
    // 系统状态
    this.routes.set('GET /api/ai-control/status', async () => {
      return {
        success: true,
        data: this.interactionService.getSystemStatus(),
        timestamp: Date.now()
      };
    });
    
    // 启动监控
    this.routes.set('POST /api/ai-control/monitoring/start', async () => {
      this.interactionService.startMonitoring();
      return {
        success: true,
        data: { message: '监控已启动' },
        timestamp: Date.now()
      };
    });
    
    // 停止监控
    this.routes.set('POST /api/ai-control/monitoring/stop', async () => {
      this.interactionService.stopMonitoring();
      return {
        success: true,
        data: { message: '监控已停止' },
        timestamp: Date.now()
      };
    });
    
    // 获取分析结果
    this.routes.set('GET /api/ai-control/analysis/results', async (req) => {
      const filters = req.query || {};
      const results = this.interactionService.getAnalysisResults(filters);
      return {
        success: true,
        data: {
          results,
          total: results.length,
          page: parseInt(filters.page as string) || 1,
          pageSize: parseInt(filters.pageSize as string) || 20
        },
        timestamp: Date.now()
      };
    });
    
    // 获取单个分析结果
    this.routes.set('GET /api/ai-control/analysis/results/:id', async (req) => {
      const id = req.params?.id;
      if (!id) {
        return {
          success: false,
          error: '缺少ID参数',
          timestamp: Date.now()
        };
      }
      
      const result = this.interactionService.getAnalysisResult(id);
      if (!result) {
        return {
          success: false,
          error: '分析结果不存在',
          timestamp: Date.now()
        };
      }
      
      return {
        success: true,
        data: result,
        timestamp: Date.now()
      };
    });
    
    // 生成优化方案
    this.routes.set('POST /api/ai-control/optimization/generate', async (req) => {
      const { analysisId } = req.body || {};
      if (!analysisId) {
        return {
          success: false,
          error: '缺少analysisId',
          timestamp: Date.now()
        };
      }
      
      try {
        const suggestion = await this.interactionService.generateOptimization(analysisId);
        return {
          success: true,
          data: suggestion,
          timestamp: Date.now()
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          timestamp: Date.now()
        };
      }
    });
    
    // 执行优化
    this.routes.set('POST /api/ai-control/optimization/execute/:id', async (req) => {
      const id = req.params?.id;
      if (!id) {
        return {
          success: false,
          error: '缺少ID参数',
          timestamp: Date.now()
        };
      }
      
      try {
        await this.interactionService.executeOptimization(id);
        return {
          success: true,
          data: { message: '优化已执行' },
          timestamp: Date.now()
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          timestamp: Date.now()
        };
      }
    });
    
    // 获取游戏会话列表
    this.routes.set('GET /api/ai-control/data/sessions', async (req) => {
      const filters = req.query || {};
      const sessions = await this.interactionService.getGameSessions({
        limit: parseInt(filters.limit as string) || 100,
        offset: parseInt(filters.offset as string) || 0
      });
      
      return {
        success: true,
        data: {
          sessions,
          total: sessions.length
        },
        timestamp: Date.now()
      };
    });
    
    // 获取游戏会话详情
    this.routes.set('GET /api/ai-control/data/sessions/:id', async (req) => {
      const id = req.params?.id;
      if (!id) {
        return {
          success: false,
          error: '缺少ID参数',
          timestamp: Date.now()
        };
      }
      
      const session = this.interactionService.getGameSession(id);
      if (!session) {
        return {
          success: false,
          error: '会话不存在',
          timestamp: Date.now()
        };
      }
      
      return {
        success: true,
        data: session,
        timestamp: Date.now()
      };
    });
    
    // 生成训练数据
    this.routes.set('POST /api/ai-control/data/training/generate', async (req) => {
      const { sessionIds, format } = req.body || {};
      if (!sessionIds || !Array.isArray(sessionIds)) {
        return {
          success: false,
          error: '缺少sessionIds参数',
          timestamp: Date.now()
        };
      }
      
      try {
        const data = await this.interactionService.generateTrainingData(
          sessionIds,
          format || 'json'
        );
        return {
          success: true,
          data: {
            format,
            data,
            size: data.length
          },
          timestamp: Date.now()
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          timestamp: Date.now()
        };
      }
    });
    
    // 获取知识库历史
    this.routes.set('GET /api/ai-control/knowledge/history', async (req) => {
      const { type, limit } = req.query || {};
      const records = await this.interactionService.getKnowledgeHistory(
        type as string || 'all',
        parseInt(limit as string) || 100
      );
      
      return {
        success: true,
        data: {
          records,
          total: records.length
        },
        timestamp: Date.now()
      };
    });
  }
  
  /**
   * 处理请求
   */
  async handleRequest(request: APIRequest): Promise<APIResponse> {
    const routeKey = `${request.method} ${request.path}`;
    const handler = this.routes.get(routeKey);
    
    if (!handler) {
      return {
        success: false,
        error: `路由不存在: ${routeKey}`,
        timestamp: Date.now()
      };
    }
    
    try {
      return await handler(request);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '服务器错误',
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * 获取所有路由
   */
  getRoutes(): string[] {
    return Array.from(this.routes.keys());
  }
}

// 单例实例
let apiServerInstance: APIServer | null = null;

/**
 * 获取API服务器实例
 */
export function getAPIServer(): APIServer {
  if (!apiServerInstance) {
    apiServerInstance = new APIServer();
  }
  return apiServerInstance;
}

