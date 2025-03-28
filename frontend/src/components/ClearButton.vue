<script setup lang="ts">
import { useBoxesStore } from '@/stores/useBoxesStore'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const boxesStore = useBoxesStore()
const handleClear = () => {
  boxesStore.clearBoxes()
}
</script>

<template>
  <button
    @click="handleClear"
    class="fixed bottom-6 right-6 p-3 bg-gray-800 backdrop-blur-sm rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
    :title="t('clearArea')"
  >
    <span class="material-symbols-outlined text-2xl">
      delete_sweep
    </span>
  </button>
</template>

<style scoped>
button {
  z-index: 1000;
}
button:hover {
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
}

/* Ensure material icon is white */
.material-symbols-outlined {
  color: white;
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 24;
}
</style>