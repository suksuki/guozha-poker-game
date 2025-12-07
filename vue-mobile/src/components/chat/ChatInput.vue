<template>
  <div class="chat-input-container">
    <van-field
      v-model="inputText"
      :placeholder="$t('chat.inputPlaceholder')"
      :border="false"
      class="chat-input-field"
      @keyup.enter="sendMessage"
    >
      <template #button>
        <van-button 
          size="small" 
          type="primary"
          @click="sendMessage"
          :disabled="!inputText.trim()"
        >
          {{ $t('chat.send') }}
        </van-button>
      </template>
    </van-field>
    
    <!-- 快捷短语 -->
    <div class="quick-phrases">
      <van-tag
        v-for="phrase in quickPhrases"
        :key="phrase"
        size="small"
        @click="inputText = phrase"
        class="quick-phrase-tag"
      >
        {{ phrase }}
      </van-tag>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from '../../i18n/composable';
import { useChatStore } from '../../stores/chatStore';
import { useGameStore } from '../../stores/gameStore';
import { showToast } from 'vant';

const { t } = useI18n();

const chatStore = useChatStore();
const gameStore = useGameStore();

const inputText = ref('');
const quickPhrases = computed(() => [
  t('chat.quickPhrases.goodCards'),
  t('chat.quickPhrases.pass'),
  t('chat.quickPhrases.continue'),
  t('chat.quickPhrases.notBad'),
  t('chat.quickPhrases.awesome'),
  t('chat.quickPhrases.haha'),
  t('chat.quickPhrases.cheer'),
  t('chat.quickPhrases.steady')
]);

const sendMessage = () => {
  if (!inputText.value.trim()) {
    return;
  }

  const humanPlayer = gameStore.humanPlayer;
  if (!humanPlayer) {
    showToast(t('game.gameNotStarted'));
    return;
  }

  // 添加人类玩家的消息
  chatStore.addMessage({
    playerId: humanPlayer.id,
    playerName: humanPlayer.name || '你',
    content: inputText.value.trim(),
    intent: 'social_chat',
    timestamp: Date.now()
  });

  // 清空输入
  inputText.value = '';

  // TODO: 如果启用了AI Brain辅助，可以在这里触发AI生成建议
  // 目前先直接发送用户输入的消息
};
</script>

<style scoped>
.chat-input-container {
  padding: 8px;
  background: rgba(255, 255, 255, 0.95);
  border-top: 1px solid #e0e0e0;
}

.chat-input-field {
  margin-bottom: 8px;
}

.quick-phrases {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.quick-phrase-tag {
  cursor: pointer;
  transition: all 0.2s;
}

.quick-phrase-tag:active {
  transform: scale(0.95);
  opacity: 0.8;
}
</style>

