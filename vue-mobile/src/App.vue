<template>
  <div class="app">
    <GameBoard />
  </div>
</template>

<script setup lang="ts">
import GameBoard from './components/GameBoard.vue';
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: fixed;
  touch-action: none;
}

.app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* 横屏提示 */
@media screen and (orientation: portrait) {
  .app::before {
    content: '请横屏查看以获得最佳体验 🔄';
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(90deg);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 20px 40px;
    border-radius: 12px;
    font-size: 16px;
    z-index: 9999;
    white-space: nowrap;
    pointer-events: none;
  }
}
</style>

