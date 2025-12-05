/**
 * AI玩家头像组件
 * 可复用的AI玩家显示组件，支持发牌和打牌时使用
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { i18n } from '../../i18n';
import { Player } from '../../types/card';
import { TeamConfig } from '../../types/team';
import { getTeam } from '../../utils/teamManager';
import { 
  calculatePlayerPickedScore, 
  calculatePlayerDunScore, 
  calculateTeamScore, 
  calculateTeamDunCount 
} from '../../utils/teamScoring';

export interface AIPlayerAvatarProps {
  player: Player | Omit<Player, 'hand'>;
  handCount?: number; // 手牌数量（如果player没有hand属性）
  position?: { x: number; y: number; angle: number }; // 位置信息（发牌时使用）
  isCurrent?: boolean; // 是否是当前玩家（打牌时使用）
  isLastPlay?: boolean; // 是否是最后出牌的玩家（打牌时使用）
  showPosition?: boolean; // 是否显示位置信息（发牌时true，打牌时false）
  playerCount?: number; // 玩家总数（用于判断最后一名）
  teamConfig?: TeamConfig | null; // 团队配置（团队模式下使用）
  allPlayers?: Player[]; // 所有玩家列表（用于计算墩分）
}

export const AIPlayerAvatar = React.forwardRef<HTMLDivElement, AIPlayerAvatarProps>(({
  player,
  handCount,
  position,
  isCurrent = false,
  isLastPlay = false,
  showPosition = false,
  playerCount,
  teamConfig,
  allPlayers = []
}, ref) => {
  const { t } = useTranslation(['ui']);
  const actualHandCount = handCount !== undefined ? handCount : (player.hand?.length || 0);
  const playerRank = player.finishedRank ?? null;
  const dunCount = player.dunCount || 0; // 玩家出的墩数（7张及以上）
  
  // 团队模式：获取玩家所属团队
  const playerTeam = teamConfig && player.teamId !== null && player.teamId !== undefined
    ? getTeam(player.teamId, teamConfig)
    : null;
  
  // 计算实时分数
  const pickedScore = calculatePlayerPickedScore(player as Player);
  const dunScore = calculatePlayerDunScore(player as Player, allPlayers);
  const totalScore = pickedScore + dunScore;
  
  // 团队模式：计算团队总分和团队总墩数
  const teamTotalScore = teamConfig && player.teamId !== null && player.teamId !== undefined
    ? calculateTeamScore(player.teamId, allPlayers, teamConfig)
    : 0;
  const teamTotalDunCount = teamConfig && player.teamId !== null && player.teamId !== undefined
    ? calculateTeamDunCount(player.teamId, allPlayers, teamConfig)
    : 0;
  
  // 根据玩家ID选择emoji
  const emojis = ['🤖', '👾', '🤖', '👽', '🤖', '👻', '🤖', '🦾'];
  const avatarEmoji = emojis[player.id % 8];
  
  // 奖杯图标：第一名金色🏆，第二名银色🥈，最后一名灰色🏆（使用不同样式）
  const getTrophyIcon = () => {
    if (playerRank === 1) return '🏆'; // 第一名金色奖杯
    if (playerRank === 2) return '🥈'; // 第二名银色奖杯
    // 判断是否是最后一名：如果有 playerCount 且 finishedRank === playerCount，或者是最后一名
    if (playerRank !== null && playerCount && playerRank === playerCount) {
      return '🏆'; // 最后一名灰色奖杯（通过CSS样式控制颜色）
    }
    return null;
  };
  
  const trophyIcon = getTrophyIcon();
  const isLastPlace = playerRank !== null && playerCount && playerRank === playerCount;
  
  // 计算样式
  const containerStyle: React.CSSProperties = showPosition && position
    ? {
        position: 'absolute',
        left: `${position.x}%`,
        top: '10px', // 从顶部往下10px的距离
        transform: 'translateX(-50%)', // 只水平居中
        zIndex: 150 // 提高z-index，确保在顶部且不被遮挡
      }
    : {
        position: 'relative',
        zIndex: 150 // 提高z-index，确保在顶部且不被遮挡
      };
  
  return (
    <div
      ref={ref}
      className={`ai-player-avatar-container ${isCurrent ? 'current-player' : ''} ${isLastPlay ? 'last-play-player' : ''}`}
      style={containerStyle}
    >
      {/* 卡通大头像 */}
      <div className="ai-player-avatar">
        {/* 名次信息 - 绝对定位在头像上方 */}
        {playerRank !== null && (
          <div className="avatar-rank-badge">
            <span className={`rank-badge rank-${playerRank} ${isLastPlace ? 'last-place' : ''}`}>
              {trophyIcon && (
                <span className={`trophy-icon ${isLastPlace ? 'trophy-gray' : playerRank === 1 ? 'trophy-gold' : playerRank === 2 ? 'trophy-silver' : ''}`}>
                  {trophyIcon}
                </span>
              )}
              {(() => {
                // 根据语言格式化名次显示
                const lang = i18n.language || 'zh-CN';
                if (lang.startsWith('en')) {
                  // 英文：1st, 2nd, 3rd, 4th...
                  const suffix = playerRank === 1 ? 'st' : playerRank === 2 ? 'nd' : playerRank === 3 ? 'rd' : 'th';
                  return `${playerRank}${suffix}`;
                }
                // 其他语言使用翻译
                return t('ui:aiPlayer.rankBadge', { rank: playerRank });
              })()}
            </span>
          </div>
        )}
        <div className="avatar-emoji">
          {avatarEmoji}
        </div>
        <div className="avatar-name">
          {player.name}
          {playerTeam && (
            <span style={{
              fontSize: '10px',
              marginLeft: '6px',
              padding: '2px 6px',
              backgroundColor: playerTeam.id === 0 ? '#FFE0E0' : '#E0E0FF',
              borderRadius: '4px',
              color: playerTeam.id === 0 ? '#C62828' : '#1565C0',
              fontWeight: 'bold'
            }}>
              {playerTeam.name}
            </span>
          )}
        </div>
      </div>
      
      {/* 状态信息面板 */}
      <div className="ai-player-status-panel">
        {/* 个人分数 */}
        <div className="status-item status-item-compact" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '8px',
          borderRadius: '8px',
          marginBottom: '4px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '2px' }}>
            📊 个人分数
          </div>
          <div style={{ fontSize: '10px' }}>
            手牌分: {pickedScore} | 墩分: {dunScore} | 总分: {totalScore}
          </div>
          <div style={{ fontSize: '10px' }}>
            墩数: {dunCount}
          </div>
        </div>
        
        {/* 团队分数（团队模式下显示） */}
        {playerTeam && (
          <div className="status-item status-item-compact" style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            padding: '8px',
            borderRadius: '8px',
            marginBottom: '4px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '2px' }}>
              🏆 团队分数
            </div>
            <div style={{ fontSize: '10px' }}>
              总分: {teamTotalScore} | 总墩数: {teamTotalDunCount}
            </div>
          </div>
        )}
        
        <div className="status-item">
          <span className="status-label">{t('ui:aiPlayer.handLabel')}</span>
          <span className="status-value">{t('ui:aiPlayer.cards', { count: actualHandCount })}</span>
        </div>
        {/* 思考中提示 - 放在信息面板下面 */}
        <div className={`avatar-thinking ${isCurrent ? 'visible' : 'hidden'}`}>
          {t('ui:aiPlayer.thinking')}
        </div>
      </div>
    </div>
  );
});

