<template>
  <div class="app">
    <van-nav-bar title="锅炸扑克" fixed />
    <div class="content">
      <GameBoard />
    </div>
  </div>
</template>

<script setup lang="ts">
import { NavBar } from 'vant';
import GameBoard from './components/GameBoard.vue';
</script>

<style scoped>
.app {
  height: 100vh;
  background: #f5f5f5;
}

.content {
  padding-top: 46px;
  height: 100%;
}
</style>

