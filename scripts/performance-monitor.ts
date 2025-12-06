/**
 * 性能监控脚本
 * 监控游戏性能并生成报告
 */

import { GameState } from '../src/game-engine/state/GameState';
import { StateManager } from '../src/game-engine/state/StateManager';
import { PlayerType } from '../src/types/card';
import { dealCards } from '../src/utils/cardUtils';
import { DealingModule } from '../src/game-engine/modules/DealingModule';
import { GameFlowModule } from '../src/game-engine/modules/GameFlowModule';

interface PerformanceMetrics {
  operation: string;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  samples: number;
}

class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  record(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);
  }

  getMetrics(operation: string): PerformanceMetrics | null {
    const durations = this.metrics.get(operation);
    if (!durations || durations.length === 0) {
      return null;
    }

    return {
      operation,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      samples: durations.length
    };
  }

  getAllMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.keys())
      .map(op => this.getMetrics(op))
      .filter((m): m is PerformanceMetrics => m !== null);
  }

  printReport(): void {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   性能监控报告');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const metrics = this.getAllMetrics();
    
    for (const metric of metrics) {
      console.log(`操作: ${metric.operation}`);
      console.log(`  平均: ${metric.avgDuration.toFixed(2)}ms`);
      console.log(`  最快: ${metric.minDuration.toFixed(2)}ms`);
      console.log(`  最慢: ${metric.maxDuration.toFixed(2)}ms`);
      console.log(`  样本: ${metric.samples}次`);
      console.log('');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

async function monitorGamePerformance(): Promise<void> {
  const monitor = new PerformanceMonitor();
  const iterations = 100;

  console.log(`开始性能监控测试 (${iterations}次迭代)...\n`);

  for (let i = 0; i < iterations; i++) {
    // 1. 测试初始化性能
    let start = performance.now();
    const config = {
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false
    };
    const stateManager = new StateManager(config);
    let end = performance.now();
    monitor.record('创建StateManager', end - start);

    // 2. 测试玩家初始化
    start = performance.now();
    const players = [0, 1, 2, 3].map(id => ({
      id,
      name: `玩家${id}`,
      type: PlayerType.AI,
      hand: [],
      score: 0,
      isHuman: false,
      finishedRank: null,
      dunCount: 0
    }));
    let state = stateManager.getState();
    state = state.initializePlayers(players);
    end = performance.now();
    monitor.record('初始化玩家', end - start);

    // 3. 测试发牌性能
    start = performance.now();
    const hands = dealCards(4);
    state = DealingModule.assignHandsToPlayers(state, hands);
    end = performance.now();
    monitor.record('发牌', end - start);

    // 4. 测试游戏开始
    start = performance.now();
    state = GameFlowModule.startGame(state);
    end = performance.now();
    monitor.record('开始游戏', end - start);

    // 5. 测试状态更新
    start = performance.now();
    state = state.updatePlayer(0, { score: 10 });
    end = performance.now();
    monitor.record('更新玩家', end - start);

    if ((i + 1) % 10 === 0) {
      console.log(`进度: ${i + 1}/${iterations}`);
    }
  }

  console.log(`\n✅ 完成${iterations}次迭代`);
  monitor.printReport();
}

// 运行监控
if (require.main === module) {
  monitorGamePerformance().catch(console.error);
}

export { PerformanceMonitor, monitorGamePerformance };

