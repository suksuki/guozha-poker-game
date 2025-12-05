<template>
  <div class="hand-cards">
    <div class="cards-container">
      <van-checkbox-group v-model="selectedCards" @change="handleSelection">
        <div class="card-list">
          <div
            v-for="card in sortedHand"
            :key="card.id"
            class="card-item"
            :class="{ selected: isSelected(card) }"
          >
            <van-checkbox
              :name="card.id"
              :disabled="disabled"
            >
              <CardView :card="card" :size="cardSize" />
            </van-checkbox>
          </div>
        </div>
      </van-checkbox-group>
    </div>
    
    <div class="card-count">
      <van-tag type="primary" size="large">
        {{ hand.length }} 张牌
      </van-tag>
      <van-tag v-if="selectedCards.length > 0" type="success" size="large">
        已选 {{ selectedCards.length }} 张
      </van-tag>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Card } from '../../../src/types/card';
import { sortCards } from '../../../src/utils/cardSorting';
import { Checkbox, CheckboxGroup, Tag } from 'vant';
import CardView from './CardView.vue';

interface Props {
  hand: Card[];
  disabled?: boolean;
  cardSize?: 'small' | 'medium' | 'large';
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  cardSize: 'medium'
});

const emit = defineEmits<{
  selectionChange: [cards: Card[]];
}>();

const selectedCards = ref<string[]>([]);

// 排序后的手牌
const sortedHand = computed(() => sortCards(props.hand));

// 检查是否选中
const isSelected = (card: Card) => {
  return selectedCards.value.includes(card.id);
};

// 处理选择变化
const handleSelection = () => {
  const selected = props.hand.filter(card => 
    selectedCards.value.includes(card.id)
  );
  emit('selectionChange', selected);
};

// 暴露清除选择方法
defineExpose({
  clearSelection: () => {
    selectedCards.value = [];
  }
});
</script>

<style scoped>
.hand-cards {
  padding: 16px;
  background: #fff;
  border-radius: 12px;
}

.cards-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.card-list {
  display: flex;
  gap: 8px;
  min-width: min-content;
}

.card-item {
  transition: transform 0.2s;
}

.card-item.selected {
  transform: translateY(-20px);
}

.card-count {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  justify-content: center;
}
</style>

