<script setup lang="ts">
import { ref } from 'vue'
import { useResourcesStore } from '@/stores/useResourcesStore'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const resourcesStore = useResourcesStore()
const isDeleteMode = ref(false)

const toggleDeleteMode = () => {
  isDeleteMode.value = !isDeleteMode.value
  resourcesStore.setDeleteMode(isDeleteMode.value)
}
</script>

<template>
  <button
    @click="toggleDeleteMode"
    class="fixed bottom-6 right-24 p-3 bg-gray-800 backdrop-blur-sm rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
    :class="{ 'bg-red-600': isDeleteMode }"
    :title="t('deleteResources')"
  >
    <span class="material-symbols-outlined text-2xl">
      delete
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
.material-symbols-outlined {
  color: white;
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 24;
}
</style>