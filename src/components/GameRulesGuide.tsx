/**
 * 游戏规则帮助组件
 * 展示打牌规则、计分规则等，使用卡通、直观的呈现方式
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './GameRulesGuide.css';

export const GameRulesGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tutorial' | 'rules' | 'scoring' | 'tips'>('tutorial');
  const { t } = useTranslation('gameRules');

  if (!isOpen) {
    return (
      <button
        className="game-rules-guide-toggle"
        onClick={() => setIsOpen(true)}
        title={t('toggle.title') || '游戏规则指南'}
      >
        📖
      </button>
    );
  }

  return (
    <div className="game-rules-guide-overlay" onClick={() => setIsOpen(false)}>
      <div className="game-rules-guide-container" onClick={(e) => e.stopPropagation()}>
        <div className="game-rules-guide-header">
          <h2>📖 {t('title')}</h2>
          <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
        </div>

        <div className="game-rules-guide-tabs">
          <button
            className={`tab-btn ${activeTab === 'tutorial' ? 'active' : ''}`}
            onClick={() => setActiveTab('tutorial')}
          >
            🎮 {t('tabs.tutorial')}
          </button>
          <button
            className={`tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            🎴 {t('tabs.rules')}
          </button>
          <button
            className={`tab-btn ${activeTab === 'scoring' ? 'active' : ''}`}
            onClick={() => setActiveTab('scoring')}
          >
            💰 {t('tabs.scoring')}
          </button>
          <button
            className={`tab-btn ${activeTab === 'tips' ? 'active' : ''}`}
            onClick={() => setActiveTab('tips')}
          >
            💡 {t('tabs.tips')}
          </button>
        </div>

        <div className="game-rules-guide-content">
          {activeTab === 'tutorial' && (
            <div className="tutorial-section">
              <div className="tutorial-card">
                <div className="tutorial-icon">🚀</div>
                <h3>{t('tutorial.start.title')}</h3>
                <div className="tutorial-steps">
                  <div className="tutorial-step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <strong>{t('tutorial.start.step1.title')}</strong>
                      <p>{t('tutorial.start.step1.desc')}</p>
                    </div>
                  </div>
                  <div className="tutorial-step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <strong>{t('tutorial.start.step2.title')}</strong>
                      <p>{t('tutorial.start.step2.desc')}</p>
                    </div>
                  </div>
                  <div className="tutorial-step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <strong>{t('tutorial.start.step3.title')}</strong>
                      <p>{t('tutorial.start.step3.desc')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="tutorial-card">
                <div className="tutorial-icon">👆</div>
                <h3>{t('tutorial.play.title')}</h3>
                <div className="tutorial-steps">
                  <div className="tutorial-step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <strong>{t('tutorial.play.step1.title')}</strong>
                      <p>{t('tutorial.play.step1.desc')}</p>
                      <div className="step-example">
                        <span className="example-icon">💡</span>
                        <span>{t('tutorial.play.step1.example')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="tutorial-step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <strong>{t('tutorial.play.step2.title')}</strong>
                      <p>{t('tutorial.play.step2.desc')}</p>
                      <div className="step-example">
                        <span className="example-icon">💡</span>
                        <span>{t('tutorial.play.step2.example')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="tutorial-step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <strong>{t('tutorial.play.step3.title')}</strong>
                      <p>{t('tutorial.play.step3.desc')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="tutorial-card">
                <div className="tutorial-icon">🔄</div>
                <h3>{t('tutorial.pass.title')}</h3>
                <div className="tutorial-steps">
                  <div className="tutorial-step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <strong>{t('tutorial.pass.step1.title')}</strong>
                      <p>{t('tutorial.pass.step1.desc')}</p>
                    </div>
                  </div>
                  <div className="tutorial-step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <strong>{t('tutorial.pass.step2.title')}</strong>
                      <p>{t('tutorial.pass.step2.desc')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="tutorial-card">
                <div className="tutorial-icon">🤖</div>
                <h3>{t('tutorial.ai.title')}</h3>
                <div className="tutorial-steps">
                  <div className="tutorial-step">
                    <div className="step-number">💡</div>
                    <div className="step-content">
                      <strong>{t('tutorial.ai.hint.title')}</strong>
                      <p>{t('tutorial.ai.hint.desc')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="tutorial-card highlight">
                <div className="tutorial-icon">⚡</div>
                <h3>{t('tutorial.flow.title')}</h3>
                <div className="flow-diagram">
                  <div className="flow-step">
                    <span className="flow-icon">🎮</span>
                    <span>{t('tutorial.flow.step1')}</span>
                  </div>
                  <div className="flow-arrow">→</div>
                  <div className="flow-step">
                    <span className="flow-icon">👀</span>
                    <span>{t('tutorial.flow.step2')}</span>
                  </div>
                  <div className="flow-arrow">→</div>
                  <div className="flow-step">
                    <span className="flow-icon">🃏</span>
                    <span>{t('tutorial.flow.step3')}</span>
                  </div>
                  <div className="flow-arrow">→</div>
                  <div className="flow-step">
                    <span className="flow-icon">✅</span>
                    <span>{t('tutorial.flow.step4')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="rules-section">
              <div className="rule-card">
                <div className="rule-icon">🎯</div>
                <h3>{t('rules.cardTypes.title')}</h3>
                <div className="rule-list">
                  <div className="rule-item">
                    <span className="rule-emoji">1️⃣</span>
                    <div>
                      <strong>{t('rules.cardTypes.single')}</strong>
                      <p>{t('rules.cardTypes.singleDesc')}</p>
                    </div>
                  </div>
                  <div className="rule-item">
                    <span className="rule-emoji">2️⃣</span>
                    <div>
                      <strong>{t('rules.cardTypes.pair')}</strong>
                      <p>{t('rules.cardTypes.pairDesc')}</p>
                    </div>
                  </div>
                  <div className="rule-item">
                    <span className="rule-emoji">3️⃣</span>
                    <div>
                      <strong>{t('rules.cardTypes.triple')}</strong>
                      <p>{t('rules.cardTypes.tripleDesc')}</p>
                    </div>
                  </div>
                  <div className="rule-item">
                    <span className="rule-emoji">💣</span>
                    <div>
                      <strong>{t('rules.cardTypes.bomb')}</strong>
                      <p>{t('rules.cardTypes.bombDesc')}</p>
                    </div>
                  </div>
                  <div className="rule-item">
                    <span className="rule-emoji">🏔️</span>
                    <div>
                      <strong>{t('rules.cardTypes.dun')}</strong>
                      <p>{t('rules.cardTypes.dunDesc')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rule-card">
                <div className="rule-icon">⚔️</div>
                <h3>{t('rules.beating.title')}</h3>
                <div className="rule-list">
                  <div className="rule-item highlight">
                    <span className="rule-emoji">🏔️</span>
                    <div>
                      <strong>{t('rules.beating.dun')}</strong>
                      <p>{t('rules.beating.dunDesc')}</p>
                    </div>
                  </div>
                  <div className="rule-item highlight">
                    <span className="rule-emoji">💣</span>
                    <div>
                      <strong>{t('rules.beating.bomb')}</strong>
                      <p>{t('rules.beating.bombDesc')}</p>
                    </div>
                  </div>
                  <div className="rule-item">
                    <span className="rule-emoji">⚖️</span>
                    <div>
                      <strong>{t('rules.beating.sameType')}</strong>
                      <p>{t('rules.beating.sameTypeDesc')}</p>
                    </div>
                  </div>
                  <div className="rule-item">
                    <span className="rule-emoji">🔄</span>
                    <div>
                      <strong>{t('rules.beating.pass')}</strong>
                      <p>{t('rules.beating.passDesc')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scoring' && (
            <div className="scoring-section">
              <div className="rule-card">
                <div className="rule-icon">🎁</div>
                <h3>{t('scoring.initial.title')}</h3>
                <div className="score-example">
                  <div className="score-badge">-100</div>
                  <p>{t('scoring.initial.desc')}</p>
                </div>
              </div>

              <div className="rule-card">
                <div className="rule-icon">⭐</div>
                <h3>{t('scoring.scoreCards.title')}</h3>
                <div className="score-cards-list">
                  <div className="score-card-item">
                    <span className="card-emoji">5️⃣</span>
                    <span className="score-value">+5 {t('scoring.scoreCards.points')}</span>
                  </div>
                  <div className="score-card-item">
                    <span className="card-emoji">🔟</span>
                    <span className="score-value">+10 {t('scoring.scoreCards.points')}</span>
                  </div>
                  <div className="score-card-item">
                    <span className="card-emoji">👑</span>
                    <span className="score-value">+10 {t('scoring.scoreCards.points')}</span>
                  </div>
                </div>
                <p className="rule-note">{t('scoring.scoreCards.note')}</p>
              </div>

              <div className="rule-card">
                <div className="rule-icon">🏔️</div>
                <h3>{t('scoring.dun.title')}</h3>
                <div className="dun-table">
                  <div className="dun-row header">
                    <span>{t('scoring.dun.cards')}</span>
                    <span>{t('scoring.dun.duns')}</span>
                    <span>{t('scoring.dun.example')}</span>
                  </div>
                  <div className="dun-row">
                    <span>7 {t('scoring.dun.cardsUnit')}</span>
                    <span>1 {t('scoring.dun.dunsUnit')}</span>
                    <span className="example-text">{t('scoring.dun.example1')}</span>
                  </div>
                  <div className="dun-row">
                    <span>8 {t('scoring.dun.cardsUnit')}</span>
                    <span>2 {t('scoring.dun.dunsUnit')}</span>
                    <span className="example-text">{t('scoring.dun.example2')}</span>
                  </div>
                  <div className="dun-row">
                    <span>9 {t('scoring.dun.cardsUnit')}</span>
                    <span>4 {t('scoring.dun.dunsUnit')}</span>
                    <span className="example-text">{t('scoring.dun.example3')}</span>
                  </div>
                  <div className="dun-row">
                    <span>10 {t('scoring.dun.cardsUnit')}</span>
                    <span>8 {t('scoring.dun.dunsUnit')}</span>
                    <span className="example-text">{t('scoring.dun.example4')}</span>
                  </div>
                </div>
                <p className="rule-note">{t('scoring.dun.note')}</p>
              </div>

              <div className="rule-card">
                <div className="rule-icon">🏆</div>
                <h3>{t('scoring.final.title')}</h3>
                <div className="rule-list">
                  <div className="rule-item">
                    <span className="rule-emoji">🥇</span>
                    <div>
                      <strong>{t('scoring.final.first')}</strong>
                      <p>{t('scoring.final.firstDesc')}</p>
                    </div>
                  </div>
                  <div className="rule-item">
                    <span className="rule-emoji">🥉</span>
                    <div>
                      <strong>{t('scoring.final.last')}</strong>
                      <p>{t('scoring.final.lastDesc')}</p>
                    </div>
                  </div>
                  <div className="rule-item">
                    <span className="rule-emoji">🎁</span>
                    <div>
                      <strong>{t('scoring.final.bonus')}</strong>
                      <p>{t('scoring.final.bonusDesc')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tips' && (
            <div className="tips-section">
              <div className="tip-card">
                <div className="tip-icon">💡</div>
                <h3>{t('tips.strategy.title')}</h3>
                <ul className="tip-list">
                  <li>{t('tips.strategy.tip1')}</li>
                  <li>{t('tips.strategy.tip2')}</li>
                  <li>{t('tips.strategy.tip3')}</li>
                  <li>{t('tips.strategy.tip4')}</li>
                </ul>
              </div>

              <div className="tip-card">
                <div className="tip-icon">🎯</div>
                <h3>{t('tips.timing.title')}</h3>
                <ul className="tip-list">
                  <li>{t('tips.timing.tip1')}</li>
                  <li>{t('tips.timing.tip2')}</li>
                  <li>{t('tips.timing.tip3')}</li>
                </ul>
              </div>

              <div className="tip-card">
                <div className="tip-icon">🤝</div>
                <h3>{t('tips.cooperation.title')}</h3>
                <ul className="tip-list">
                  <li>{t('tips.cooperation.tip1')}</li>
                  <li>{t('tips.cooperation.tip2')}</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

