/**
 * 测试示例：QuarrelVoiceService
 * 可以在浏览器控制台或测试文件中运行
 */

import { getQuarrelVoiceService, updateMainFightRoles } from '../services/quarrelVoiceService';
import { handleQuarrelScene, handleQuickJab } from '../utils/quarrelVoiceHelper';

/**
 * 测试1：基本播放
 */
export async function testBasicPlayback() {
  console.log('=== 测试1：基本播放 ===');
  
  const service = getQuarrelVoiceService();
  await service.init();

  await service.submitUtter({
    roleId: 'test_player_1',
    text: '我跟一手，你莫急咧。',
    priority: 'NORMAL_CHAT',
    civility: 1,
    lang: 'zh',
    volume: 1.0,
    onStart: () => console.log('开始播放'),
    onEnd: () => console.log('播放完成'),
  });

  console.log('✅ 测试1完成');
}

/**
 * 测试2：主吵架对轰
 */
export async function testMainFight() {
  console.log('=== 测试2：主吵架对轰 ===');
  
  const service = getQuarrelVoiceService();
  await service.init();

  // 设置主吵架双方
  updateMainFightRoles(['test_player_1', 'test_player_2']);

  // 同时提交两个话语
  await Promise.all([
    service.submitUtter({
      roleId: 'test_player_1',
      text: '你这一手打得，我都替你着急！',
      priority: 'MAIN_FIGHT',
      civility: 2,
      lang: 'zh',
      volume: 1.0,
    }),
    service.submitUtter({
      roleId: 'test_player_2',
      text: '你嘴巴跟漏斗一样，别在这儿放屁！',
      priority: 'MAIN_FIGHT',
      civility: 3,
      lang: 'zh',
      volume: 1.0,
    }),
  ]);

  console.log('✅ 测试2完成');
}

/**
 * 测试3：QUICK_JAB短插一句
 */
export async function testQuickJab() {
  console.log('=== 测试3：QUICK_JAB短插一句 ===');
  
  const service = getQuarrelVoiceService();
  await service.init();

  // 先提交一个主吵架
  await service.submitUtter({
    roleId: 'test_player_1',
    text: '你这一手打得不行！',
    priority: 'MAIN_FIGHT',
    civility: 2,
    lang: 'zh',
    volume: 1.0,
  });

  // 短插一句（会自动检查时长）
  await service.submitUtter({
    roleId: 'test_player_3',
    text: '你们别吵了！',  // 短句，应该能正常播放
    priority: 'QUICK_JAB',
    civility: 1,
    lang: 'zh',
    volume: 0.8,
  });

  // 测试超长QUICK_JAB（应该会被截断）
  await service.submitUtter({
    roleId: 'test_player_4',
    text: '这是一段很长的文本，用来测试QUICK_JAB的时长限制功能，看看是否会被自动截断。',  // 超过1.5s，应该被截断
    priority: 'QUICK_JAB',
    civility: 1,
    lang: 'zh',
    volume: 0.8,
  });

  console.log('✅ 测试3完成');
}

/**
 * 测试4：长吵架分段播放
 */
export async function testLongQuarrel() {
  console.log('=== 测试4：长吵架分段播放 ===');
  
  const service = getQuarrelVoiceService();
  await service.init();

  // 设置主吵架双方
  updateMainFightRoles(['test_player_1', 'test_player_2']);

  // 提交长文本（超过40字，应该会自动分段）
  await service.submitUtter({
    roleId: 'test_player_1',
    text: '你这一手打得，我都替你着急！你嘴巴跟漏斗一样，别在这儿放屁！这局我拿下了，你还有什么话说？下局见真章！',  // 超过40字
    priority: 'MAIN_FIGHT',
    civility: 3,
    lang: 'zh',
    volume: 1.0,
  });

  console.log('✅ 测试4完成（注意观察是否分段播放）');
}

/**
 * 测试5：使用辅助工具
 */
export async function testHelperFunctions() {
  console.log('=== 测试5：使用辅助工具 ===');
  
  // 模拟Player对象
  const player1 = { id: 1, name: '玩家1' } as any;
  const player2 = { id: 2, name: '玩家2' } as any;

  // 使用handleQuarrelScene
  await handleQuarrelScene(
    player1,
    player2,
    '你这一手打得不行！',
    '你嘴巴跟漏斗一样！',
    {
      civility: 2,
      volume: 1.0
    }
  );

  // 使用handleQuickJab
  const player3 = { id: 3, name: '玩家3' } as any;
  await handleQuickJab(player3, '你们别吵了！', {
    civility: 1,
    volume: 0.8
  });

  console.log('✅ 测试5完成');
}

/**
 * 测试6：状态查询
 */
export async function testStatusQuery() {
  console.log('=== 测试6：状态查询 ===');
  
  const service = getQuarrelVoiceService();
  await service.init();

  // 提交一些话语
  await service.submitUtter({
    roleId: 'test_player_1',
    text: '测试消息1',
    priority: 'NORMAL_CHAT',
    civility: 1,
    lang: 'zh',
    volume: 1.0,
  });

  // 查询状态
  const status = service.getStatus();
  console.log('服务状态:', status);
  console.log('正在播放的角色:', service.getPlayingRoles());
  console.log('队列长度:', service.getQueueLength());
  console.log('配置:', service.getConfig());

  console.log('✅ 测试6完成');
}

/**
 * 测试7：错误处理和重试
 */
export async function testErrorHandling() {
  console.log('=== 测试7：错误处理和重试 ===');
  
  const service = getQuarrelVoiceService();
  await service.init();

  // 测试空文本（应该能处理）
  try {
    await service.submitUtter({
      roleId: 'test_player_1',
      text: '',
      priority: 'NORMAL_CHAT',
      civility: 1,
      lang: 'zh',
      volume: 1.0,
    });
  } catch (error) {
    console.log('✅ 空文本错误处理正常:', error);
  }

  // 测试停止功能
  await service.submitUtter({
    roleId: 'test_player_1',
    text: '这是一段测试文本，用来测试停止功能。',
    priority: 'NORMAL_CHAT',
    civility: 1,
    lang: 'zh',
    volume: 1.0,
  });

  // 立即停止
  setTimeout(() => {
    service.stopRole('test_player_1');
    console.log('✅ 停止功能测试完成');
  }, 100);

  console.log('✅ 测试7完成');
}

/**
 * 运行所有测试
 */
export async function runAllTests() {
  console.log('🚀 开始运行所有测试...\n');

  try {
    await testBasicPlayback();
    await new Promise(resolve => setTimeout(resolve, 2000));  // 等待2秒

    await testMainFight();
    await new Promise(resolve => setTimeout(resolve, 3000));  // 等待3秒

    await testQuickJab();
    await new Promise(resolve => setTimeout(resolve, 3000));  // 等待3秒

    await testLongQuarrel();
    await new Promise(resolve => setTimeout(resolve, 5000));  // 等待5秒

    await testHelperFunctions();
    await new Promise(resolve => setTimeout(resolve, 3000));  // 等待3秒

    await testStatusQuery();
    await new Promise(resolve => setTimeout(resolve, 1000));  // 等待1秒

    await testErrorHandling();
    await new Promise(resolve => setTimeout(resolve, 2000));  // 等待2秒

    console.log('\n✅ 所有测试完成！');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 在浏览器控制台中使用：
// import { runAllTests } from './docs/examples/test-quarrel-voice';
// runAllTests();

