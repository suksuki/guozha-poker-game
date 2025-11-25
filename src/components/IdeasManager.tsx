import React, { useState, useEffect } from 'react';
import './IdeasManager.css';

export interface Idea {
  id: string;
  title: string;
  date: string;
  status: 'new' | 'discussing' | 'adopted' | 'implementing' | 'implemented' | 'abandoned';
  category: 'feature' | 'optimization' | 'architecture' | 'experience' | 'technology' | 'other';
  priority: 'high' | 'medium' | 'low';
  description: string;
  details: string;
  advantages: string;
  challenges: string;
  discussion: string;
  relatedDocs: string;
  notes: string;
}

const STATUS_ICONS = {
  new: '🆕',
  discussing: '💬',
  adopted: '✅',
  implementing: '🚧',
  implemented: '✨',
  abandoned: '❌'
};

const STATUS_LABELS = {
  new: '新想法',
  discussing: '讨论中',
  adopted: '已采纳',
  implementing: '实现中',
  implemented: '已实现',
  abandoned: '已放弃'
};

const CATEGORY_ICONS = {
  feature: '🎮',
  optimization: '⚡',
  architecture: '🏗️',
  experience: '🎨',
  technology: '🔬',
  other: '📦'
};

const CATEGORY_LABELS = {
  feature: '功能',
  optimization: '优化',
  architecture: '架构',
  experience: '体验',
  technology: '技术',
  other: '其他'
};

const STORAGE_KEY = 'ideas_manager_data';

export const IdeasManager: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // 加载想法
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setIdeas(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load ideas:', e);
      }
    } else {
      // 初始化示例数据
      const initialIdeas: Idea[] = [
        {
          id: '1',
          title: '多模态方言语音包训练系统',
          date: '2024-12-19',
          status: 'adopted',
          category: 'feature',
          priority: 'medium',
          description: '使用本地多模态模型，通过网络视频训练方言语音包，实现真正的方言TTS',
          details: '从网络视频（YouTube、B站等）收集方言音频数据\n使用Whisper等工具进行语音识别和文本对齐\n训练多模态TTS模型（如VITS）\n集成到游戏中，替换speechSynthesis',
          advantages: '真正的方言语音，不是文本映射\n本地推理，免费使用\n可以支持多种方言',
          challenges: '需要大量训练数据（每种方言10+小时）\n训练需要GPU和时间\n推理速度优化',
          discussion: '',
          relatedDocs: 'docs/development/DEVELOPMENT_DESIGN_PLAN.md#多模态方言语音包训练方案',
          notes: '这是一个长期计划，预计需要6-12个月'
        },
        {
          id: '2',
          title: '实时想法记录机制',
          date: '2024-12-19',
          status: 'implemented',
          category: 'other',
          priority: 'high',
          description: '创建一个可以实时更新和讨论的想法记录系统',
          details: '在开发计划文档中添加"讨论和想法"部分\n创建独立的想法记录文档\n使用状态标记跟踪想法进度\n支持按时间倒序排列',
          advantages: '不会忘记奇思妙想\n可以随时讨论和更新\n便于追踪想法状态',
          challenges: '',
          discussion: '',
          relatedDocs: 'docs/development/IDEAS_AND_DISCUSSIONS.md',
          notes: '这个文档本身就是一个想法的实现！'
        }
      ];
      setIdeas(initialIdeas);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialIdeas));
    }
  }, []);

  // 保存想法
  const saveIdeas = (newIdeas: Idea[]) => {
    setIdeas(newIdeas);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newIdeas));
  };

  // 添加想法
  const handleAdd = () => {
    const newIdea: Idea = {
      id: Date.now().toString(),
      title: '',
      date: new Date().toISOString().split('T')[0],
      status: 'new',
      category: 'other',
      priority: 'medium',
      description: '',
      details: '',
      advantages: '',
      challenges: '',
      discussion: '',
      relatedDocs: '',
      notes: ''
    };
    setEditingIdea(newIdea);
    setShowAddForm(true);
  };

  // 编辑想法
  const handleEdit = (idea: Idea) => {
    setEditingIdea({ ...idea });
    setShowAddForm(true);
  };

  // 删除想法
  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个想法吗？')) {
      saveIdeas(ideas.filter(i => i.id !== id));
    }
  };

  // 保存编辑
  const handleSave = () => {
    if (!editingIdea) return;
    
    if (editingIdea.title.trim() === '') {
      alert('请输入想法标题');
      return;
    }

    const existingIndex = ideas.findIndex(i => i.id === editingIdea.id);
    if (existingIndex >= 0) {
      const newIdeas = [...ideas];
      newIdeas[existingIndex] = editingIdea;
      saveIdeas(newIdeas);
    } else {
      saveIdeas([...ideas, editingIdea]);
    }
    
    setEditingIdea(null);
    setShowAddForm(false);
  };

  // 导出为Markdown
  const handleExport = () => {
    let markdown = '# 💡 想法和讨论记录\n\n';
    markdown += '> **最后更新**：' + new Date().toLocaleDateString('zh-CN') + '\n\n';
    
    ideas.forEach(idea => {
      markdown += `\n## ${STATUS_ICONS[idea.status]} ${idea.title}\n\n`;
      markdown += `- **提出时间**：${idea.date}\n`;
      markdown += `- **状态**：${STATUS_ICONS[idea.status]} ${STATUS_LABELS[idea.status]}\n`;
      markdown += `- **分类**：${CATEGORY_ICONS[idea.category]} ${CATEGORY_LABELS[idea.category]}\n`;
      markdown += `- **优先级**：${idea.priority}\n`;
      markdown += `- **描述**：${idea.description}\n\n`;
      
      if (idea.details) {
        markdown += `**详细说明**：\n${idea.details.split('\n').map(l => `- ${l}`).join('\n')}\n\n`;
      }
      
      if (idea.advantages) {
        markdown += `**优势**：\n${idea.advantages.split('\n').map(l => `- ${l}`).join('\n')}\n\n`;
      }
      
      if (idea.challenges) {
        markdown += `**挑战**：\n${idea.challenges.split('\n').map(l => `- ${l}`).join('\n')}\n\n`;
      }
      
      if (idea.relatedDocs) {
        markdown += `**相关文档**：${idea.relatedDocs}\n\n`;
      }
      
      if (idea.notes) {
        markdown += `**备注**：${idea.notes}\n\n`;
      }
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ideas-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 统计
  const stats = {
    total: ideas.length,
    new: ideas.filter(i => i.status === 'new').length,
    discussing: ideas.filter(i => i.status === 'discussing').length,
    adopted: ideas.filter(i => i.status === 'adopted').length,
    implementing: ideas.filter(i => i.status === 'implementing').length,
    implemented: ideas.filter(i => i.status === 'implemented').length,
    abandoned: ideas.filter(i => i.status === 'abandoned').length
  };

  if (!isOpen) {
    return (
      <button 
        className="ideas-manager-toggle"
        onClick={() => setIsOpen(true)}
        title="打开想法管理器"
      >
        💡
      </button>
    );
  }

  return (
    <div className="ideas-manager-overlay" onClick={() => setIsOpen(false)}>
      <div className="ideas-manager-container" onClick={(e) => e.stopPropagation()}>
        <div className="ideas-manager-header">
          <h2>💭 奇思妙想记录本 💭</h2>
          <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
        </div>

        <div className="ideas-manager-stats">
          <div className="stat-item">
            <span className="stat-label">总想法数</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">🆕 新想法</span>
            <span className="stat-value">{stats.new}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">✅ 已采纳</span>
            <span className="stat-value">{stats.adopted}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">✨ 已实现</span>
            <span className="stat-value">{stats.implemented}</span>
          </div>
        </div>

        <div className="ideas-manager-actions">
          <button className="btn-primary" onClick={handleAdd}>➕ 添加想法</button>
          <button className="btn-secondary" onClick={handleExport}>📥 导出Markdown</button>
        </div>

        {showAddForm && editingIdea && (
          <div className="ideas-manager-form">
            <h3>{editingIdea.id ? '编辑想法' : '添加想法'}</h3>
            <div className="form-group">
              <label>标题 *</label>
              <input
                type="text"
                value={editingIdea.title}
                onChange={(e) => setEditingIdea({ ...editingIdea, title: e.target.value })}
                placeholder="输入想法标题"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>状态</label>
                <select
                  value={editingIdea.status}
                  onChange={(e) => setEditingIdea({ ...editingIdea, status: e.target.value as Idea['status'] })}
                >
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{STATUS_ICONS[key as keyof typeof STATUS_ICONS]} {label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>分类</label>
                <select
                  value={editingIdea.category}
                  onChange={(e) => setEditingIdea({ ...editingIdea, category: e.target.value as Idea['category'] })}
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{CATEGORY_ICONS[key as keyof typeof CATEGORY_ICONS]} {label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>优先级</label>
                <select
                  value={editingIdea.priority}
                  onChange={(e) => setEditingIdea({ ...editingIdea, priority: e.target.value as Idea['priority'] })}
                >
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>描述</label>
              <textarea
                value={editingIdea.description}
                onChange={(e) => setEditingIdea({ ...editingIdea, description: e.target.value })}
                placeholder="简要描述想法，1-2句话"
                rows={2}
              />
            </div>
            <div className="form-group">
              <label>详细说明</label>
              <textarea
                value={editingIdea.details}
                onChange={(e) => setEditingIdea({ ...editingIdea, details: e.target.value })}
                placeholder="详细说明想法、技术方案等（每行一个要点）"
                rows={4}
              />
            </div>
            <div className="form-group">
              <label>优势</label>
              <textarea
                value={editingIdea.advantages}
                onChange={(e) => setEditingIdea({ ...editingIdea, advantages: e.target.value })}
                placeholder="想法的优势（每行一个）"
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>挑战</label>
              <textarea
                value={editingIdea.challenges}
                onChange={(e) => setEditingIdea({ ...editingIdea, challenges: e.target.value })}
                placeholder="实现挑战（每行一个）"
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>相关文档</label>
              <input
                type="text"
                value={editingIdea.relatedDocs}
                onChange={(e) => setEditingIdea({ ...editingIdea, relatedDocs: e.target.value })}
                placeholder="相关文档链接"
              />
            </div>
            <div className="form-group">
              <label>备注</label>
              <textarea
                value={editingIdea.notes}
                onChange={(e) => setEditingIdea({ ...editingIdea, notes: e.target.value })}
                placeholder="其他备注"
                rows={2}
              />
            </div>
            <div className="form-actions">
              <button className="btn-primary" onClick={handleSave}>💾 保存</button>
              <button className="btn-secondary" onClick={() => { setShowAddForm(false); setEditingIdea(null); }}>❌ 取消</button>
            </div>
          </div>
        )}

        <div className="ideas-manager-list">
          {ideas.length === 0 ? (
            <div className="empty-state">
              <p>🎈 还没有想法，点击"添加想法"开始记录吧！</p>
            </div>
          ) : (
            ideas
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(idea => (
                <div key={idea.id} className="idea-card">
                  <div className="idea-card-header">
                    <div className="idea-card-title">
                      <span className="idea-status-icon">{STATUS_ICONS[idea.status]}</span>
                      <h3>{idea.title || '(无标题)'}</h3>
                    </div>
                    <div className="idea-card-actions">
                      <button className="btn-icon" onClick={() => handleEdit(idea)} title="编辑">✏️</button>
                      <button className="btn-icon" onClick={() => handleDelete(idea.id)} title="删除">🗑️</button>
                    </div>
                  </div>
                  <div className="idea-card-meta">
                    <span className="idea-meta-item">📅 {idea.date}</span>
                    <span className="idea-meta-item">{CATEGORY_ICONS[idea.category]} {CATEGORY_LABELS[idea.category]}</span>
                    <span className="idea-meta-item">⭐ {idea.priority === 'high' ? '高' : idea.priority === 'medium' ? '中' : '低'}</span>
                  </div>
                  {idea.description && (
                    <div className="idea-card-description">
                      <p>{idea.description}</p>
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

