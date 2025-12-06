# 🚀 生产部署检查清单

**版本:** v2.0.0  
**目标:** 确保安全、稳定地发布到生产环境

---

## ✅ 部署前检查

### 📋 代码质量

- [x] 所有新架构测试通过 (210/210 ✅)
- [x] 测试覆盖率 ≥ 85% (实际: 91% ✅)
- [x] 无linter错误
- [x] 无TypeScript错误
- [x] 代码已审查
- [x] 性能测试通过
- [ ] 1000局回归测试完成
- [x] 无循环依赖验证通过

### 🔧 配置检查

- [ ] 环境变量配置正确
  - [ ] `LLM_API_URL` 已设置
  - [ ] `LLM_API_KEY` 已设置
  - [ ] `TTS_SERVICE_URL` 已设置
  - [ ] `NODE_ENV=production`
  - [ ] `PORT` 已配置

- [ ] 数据库配置（如需要）
  - [ ] 连接字符串正确
  - [ ] 权限配置完成
  - [ ] 备份策略就位

- [ ] 第三方服务
  - [ ] LLM服务可用
  - [ ] TTS服务可用
  - [ ] 监控服务配置
  - [ ] 日志服务配置

### 🔒 安全检查

- [x] npm audit通过（或已处理高危漏洞）
- [ ] 敏感信息已移除
  - [ ] API密钥不在代码中
  - [ ] 密码不在代码中
  - [ ] Token使用环境变量
- [ ] HTTPS配置完成
- [ ] CORS配置正确
- [ ] 防火墙规则配置
- [ ] 速率限制配置

### 📊 监控配置

- [ ] 日志系统配置
  - [ ] 应用日志路径
  - [ ] 日志级别: production
  - [ ] 日志轮转配置
  - [ ] 错误追踪集成

- [ ] 性能监控
  - [ ] APM工具配置
  - [ ] 指标收集启用
  - [ ] 告警规则配置
  - [ ] Dashboard创建

- [ ] 健康检查
  - [ ] `/health` 端点实现
  - [ ] 服务状态监控
  - [ ] 自动重启配置

### 🔄 备份与恢复

- [ ] 备份策略
  - [ ] 数据库自动备份
  - [ ] 代码仓库备份
  - [ ] 配置文件备份
  - [ ] 备份测试验证

- [ ] 恢复计划
  - [ ] 回滚脚本准备
  - [ ] 恢复流程文档
  - [ ] 恢复测试验证

### 📱 移动端检查

- [ ] PWA配置
  - [ ] manifest.json正确
  - [ ] Service Worker注册
  - [ ] 离线功能测试
  - [ ] 安装到桌面测试

- [ ] 移动端优化
  - [ ] 响应式测试（多尺寸）
  - [ ] 触摸交互测试
  - [ ] 性能测试（帧率）
  - [ ] 首屏加载 < 2秒

---

## 🚀 部署步骤

### Step 1: 代码准备

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖
npm ci

# 3. 运行测试
npm run test:new

# 4. 构建应用
npm run build

# 5. 构建Vue移动端
cd vue-mobile
npm ci
npm run build
cd ..
```

### Step 2: 环境配置

```bash
# 1. 复制环境变量模板
cp .env.example .env.production

# 2. 编辑生产环境变量
nano .env.production

# 3. 验证配置
source .env.production
echo $NODE_ENV  # 应该输出 production
```

### Step 3: 部署应用

```bash
# 使用PM2部署
pm2 start ecosystem.config.js --env production

# 或使用Docker
docker-compose up -d

# 或使用Systemd
sudo systemctl start guozha-poker
```

### Step 4: 健康检查

```bash
# 1. 检查服务状态
pm2 status
# 或
sudo systemctl status guozha-poker

# 2. 检查端口
curl http://localhost:3000/health

# 3. 查看日志
pm2 logs guozha-poker
# 或
sudo journalctl -u guozha-poker -f
```

### Step 5: 烟雾测试

```bash
# 1. 测试主页
curl http://your-domain.com/

# 2. 测试API
curl http://your-domain.com/api/health

# 3. 测试Vue移动端
curl http://your-domain.com/mobile/
```

---

## 🔍 部署后验证

### 功能验证

- [ ] 游戏可以正常启动
- [ ] 玩家可以正常出牌
- [ ] 分数计算正确
- [ ] 游戏可以正常结束
- [ ] AI可以正常决策
- [ ] 语音合成工作正常

### 性能验证

- [ ] 页面加载时间 < 2秒
- [ ] API响应时间 < 100ms
- [ ] 内存占用 < 200MB
- [ ] CPU使用率 < 50%
- [ ] 无内存泄漏

### 稳定性验证

- [ ] 运行10局游戏无错误
- [ ] 并发10用户无问题
- [ ] 24小时运行无崩溃
- [ ] 错误恢复正常工作

---

## 🚨 应急预案

### 问题1: 服务无法启动

**排查步骤:**
```bash
# 1. 查看日志
pm2 logs guozha-poker --lines 100

# 2. 检查端口占用
lsof -i :3000

# 3. 检查系统资源
free -h
df -h

# 4. 验证配置
cat .env.production
```

**解决方案:**
- 检查环境变量
- 释放占用端口
- 增加系统资源
- 回滚到上一版本

### 问题2: 性能下降

**排查步骤:**
```bash
# 1. 查看资源使用
top
htop

# 2. 查看应用指标
pm2 monit

# 3. 检查日志是否有错误
pm2 logs --err

# 4. 运行性能测试
npm run perf:monitor
```

**解决方案:**
- 重启服务
- 清理缓存
- 增加资源
- 优化配置

### 问题3: 功能异常

**排查步骤:**
```bash
# 1. 查看错误日志
tail -f logs/error.log

# 2. 检查服务健康
curl http://localhost:3000/health

# 3. 运行诊断脚本
npm run diagnose
```

**解决方案:**
- 检查依赖服务
- 验证配置
- 回滚到稳定版本
- 联系技术支持

### 问题4: 需要紧急回滚

**回滚步骤:**
```bash
# 1. 停止当前服务
pm2 stop guozha-poker

# 2. 切换到上一版本
git checkout <previous-tag>

# 3. 重新构建
npm ci
npm run build

# 4. 重启服务
pm2 restart guozha-poker

# 5. 验证
curl http://localhost:3000/health
```

---

## 📊 监控指标

### 关键指标

监控以下指标，确保服务健康：

| 指标 | 正常范围 | 告警阈值 | 紧急阈值 |
|------|----------|----------|----------|
| CPU使用率 | < 30% | > 60% | > 80% |
| 内存使用 | < 150MB | > 300MB | > 500MB |
| 响应时间 | < 50ms | > 200ms | > 500ms |
| 错误率 | < 1% | > 5% | > 10% |
| 可用性 | > 99% | < 98% | < 95% |

### 告警配置

```javascript
// 告警规则示例
{
  cpu: {
    warning: 60,
    critical: 80
  },
  memory: {
    warning: 300 * 1024 * 1024,
    critical: 500 * 1024 * 1024
  },
  responseTime: {
    warning: 200,
    critical: 500
  }
}
```

---

## 🎯 部署后任务

### 立即 (部署后1小时内)

- [ ] 验证所有核心功能
- [ ] 查看错误日志
- [ ] 检查性能指标
- [ ] 烟雾测试通过
- [ ] 通知团队部署完成

### 短期 (部署后24小时内)

- [ ] 监控用户反馈
- [ ] 分析性能数据
- [ ] 处理紧急问题
- [ ] 优化配置参数
- [ ] 更新监控Dashboard

### 中期 (部署后1周内)

- [ ] 收集用户反馈
- [ ] 分析使用数据
- [ ] 性能优化
- [ ] Bug修复
- [ ] 功能改进

---

## 📝 签字确认

### 部署负责人

- [ ] 姓名: ___________
- [ ] 日期: ___________
- [ ] 签名: ___________

### 技术负责人

- [ ] 姓名: ___________
- [ ] 日期: ___________
- [ ] 签名: ___________

### 测试负责人

- [ ] 姓名: ___________
- [ ] 日期: ___________
- [ ] 签名: ___________

---

## 🎉 部署成功标准

当以下条件全部满足时，视为部署成功：

- ✅ 所有健康检查通过
- ✅ 核心功能正常工作
- ✅ 性能指标在正常范围
- ✅ 错误率 < 1%
- ✅ 用户可以正常使用
- ✅ 监控系统正常工作
- ✅ 告警配置正确
- ✅ 备份策略生效

---

**文档版本:** v1.0  
**最后更新:** 2024-12-05  
**适用版本:** v2.0.0+

