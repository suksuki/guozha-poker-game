/**
 * 设置DevTools字体大小和中文支持
 * 这个脚本会在DevTools打开后注入到DevTools中
 */

function setupDevToolsFont() {
  // 等待DevTools完全加载
  const setupFont = () => {
    try {
      // 创建样式来设置DevTools字体
      const style = document.createElement('style');
      style.id = 'devtools-chinese-font';
      style.textContent = `
        /* 设置所有文本的字体 */
        * {
          font-family: 'Microsoft YaHei', '微软雅黑', 'Consolas', 'Courier New', monospace !important;
        }
        
        /* 控制台消息字体 */
        .console-message-text,
        .console-message,
        .console-view-object-properties-section,
        .console-view-object-properties-section * {
          font-size: 14px !important;
          line-height: 1.6 !important;
          font-family: 'Microsoft YaHei', '微软雅黑', 'Consolas', monospace !important;
        }
        
        /* 源代码字体 */
        .source-code,
        .monospace,
        code {
          font-size: 14px !important;
          font-family: 'Consolas', 'Microsoft YaHei', monospace !important;
        }
        
        /* 所有文本元素 */
        div, span, p, a, button, input, textarea, select, label {
          font-family: 'Microsoft YaHei', '微软雅黑', 'Segoe UI', sans-serif !important;
        }
      `;
      
      // 如果样式已存在，先移除
      const existingStyle = document.getElementById('devtools-chinese-font');
      if (existingStyle) {
        existingStyle.remove();
      }
      
      document.head.appendChild(style);
      console.log('✅ DevTools字体已设置为14px，中文字体已启用');
    } catch (error) {
      console.error('设置DevTools字体时出错:', error);
    }
  };

  // 立即尝试设置
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(setupFont, 100);
  } else {
    document.addEventListener('DOMContentLoaded', setupFont);
  }

  // 监听DOM变化，确保在DevTools完全加载后设置
  const observer = new MutationObserver(() => {
    setupFont();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 如果是在DevTools环境中运行
if (typeof window !== 'undefined') {
  setupDevToolsFont();
}

