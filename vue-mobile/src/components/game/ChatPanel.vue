<template>
  <div class="chat-panel-landscape">
    <div class="chat-messages-landscape">
      <div 
        v-for="msg in messages" 
        :key="msg.id"
        class="chat-message"
        :class="{
          'chat-message-human': msg.playerId === humanPlayerId,
          'chat-message-ai': msg.playerId !== humanPlayerId
        }"
      >
        <span class="chat-player-name">{{ getPlayerName(msg.playerId) }}:</span>
        <span class="chat-content">{{ msg.content }}</span>
        <span class="chat-intent" v-if="msg.intent && msg.intent !== 'social_chat'">
          [{{ getIntentLabel(msg.intent) }}]
        </span>
      </div>
      <div v-if="messages.length === 0" class="chat-empty">
        {{ $t('chat.noMessages') }}
      </div>
    </div>
    
    <!-- 聊天输入框 -->
    <ChatInput />
  </div>
</template>

<script setup lang="ts">
import ChatInput from '../chat/ChatInput.vue';
import { useI18n } from '@/i18n/composable';

// Props
const props = defineProps<{
  messages: Array<{
    id: string;
    playerId: number;
    content: string;
    intent?: string;
  }>;
  humanPlayerId?: number;
}>();

// Emits
const emit = defineEmits<{
  'get-player-name': [playerId: number];
  'get-intent-label': [intent: string];
}>();

const { t } = useI18n();

// 获取玩家名称（通过父组件的回调）
const getPlayerName = (playerId: number) => {
  return `玩家${playerId}`;
};

// 意图 key 到 i18n chat.intent 的映射（多语言）
const intentI18nKeys: Record<string, string> = {
  tactical_signal: 'tactical',
  strategic_discuss: 'strategic',
  emotional_express: 'emotional',
  social_chat: 'social',
  taunt: 'taunt',
  encourage: 'encourage',
  celebrate: 'celebrate'
};

const getIntentLabel = (intent: string) => {
  const i18nKey = intentI18nKeys[intent] ?? intent;
  return t(`chat.intent.${i18nKey}`) || intent;
};
</script>

<style scoped>
.chat-panel-landscape {
  position: absolute;
  top: 36px;
  left: 4px;
  right: 4px;
  max-height: 150px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  z-index: 10;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.chat-messages-landscape {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  max-height: 100px;
}

.chat-message {
  padding: 4px 8px;
  margin-bottom: 4px;
  border-radius: 4px;
  font-size: 12px;
}

.chat-message-human {
  background: rgba(25, 137, 250, 0.3);
  color: white;
}

.chat-message-ai {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.chat-player-name {
  font-weight: bold;
  margin-right: 4px;
  color: #1989fa;
}

.chat-content {
  color: white;
}

.chat-intent {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  margin-left: 4px;
}

.chat-empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  padding: 12px;
}
</style>
