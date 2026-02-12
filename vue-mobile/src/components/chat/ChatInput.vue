<template>
  <div class="chat-input-container">
    <van-field
      v-model="inputText"
      :placeholder="$t('chat.inputPlaceholder')"
      :border="false"
      class="chat-input-field"
      @keyup.enter="sendMessage"
    >
      <template #left-icon>
        <div class="magic-wand" @click="autoSuggest" :class="{ 'loading': isLoadingSuggestion }">
          🪄
        </div>
      </template>
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
        type="primary"
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
  t('chat.quickPhrases.steady'),
  t('chat.quickPhrases.comeOn'),
  t('chat.quickPhrases.nicePlay'),
  t('chat.quickPhrases.unlucky')
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

  // 目前先直接发送用户输入的消息
};

const isLoadingSuggestion = ref(false);

const autoSuggest = async () => {
  if (isLoadingSuggestion.value) return;

  isLoadingSuggestion.value = true;
  try {
    const suggestion = await chatStore.getAISuggestion();
    if (suggestion) {
      inputText.value = suggestion;
      showToast(t('chat.suggestionDone'));
    } else {
      showToast(t('chat.suggestionNone'));
    }
  } catch (err) {
    showToast(t('chat.suggestionFailed'));
  } finally {
    isLoadingSuggestion.value = false;
  }
};
</script>

<style scoped>
.chat-input-container {
  padding: 12px;
  background: transparent;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-input-field {
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 6px 12px;
}

/* 覆盖 Vant Field 样式 */
:deep(.van-field__control) {
  color: white;
}

:deep(.van-field__control::placeholder) {
  color: rgba(255, 255, 255, 0.5);
}

.quick-phrases {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.quick-phrase-tag {
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.15) !important;
  color: rgba(255, 255, 255, 0.9) !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 4px 10px;
}

.quick-phrase-tag:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.25) !important;
}

.magic-wand {
  font-size: 20px;
  margin-right: 8px;
  cursor: pointer;
  filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.5));
  transition: all 0.3s ease;
  animation: float 3s ease-in-out infinite;
}

.magic-wand:active {
  transform: scale(0.9);
}

.magic-wand.loading {
  animation: spin 1s linear infinite;
  filter: grayscale(1);
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-3px) rotate(10deg); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

