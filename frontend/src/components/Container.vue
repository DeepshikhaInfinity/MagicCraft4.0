<script lang="ts" setup>
import { useDrop } from 'vue3-dnd'
import type { XYCoord } from 'vue3-dnd'
import { ItemTypes } from './ItemTypes'
import Box from './Box.vue'
import type { DragItem } from "@/components/interfaces"
import { computed, ref, onMounted } from 'vue'
import ItemCard from "@/components/ItemCard.vue"
import AvailableResources from "@/components/AvailableResources.vue"
import { useBoxesStore } from "@/stores/useBoxesStore"
import { storeToRefs } from "pinia"
import { useI18n } from 'vue-i18n'
import { useDark } from "@vueuse/core"; // Import useDark from VueUse

const isDark = useDark(); // Reactive dark mode state

const { t, locale } = useI18n()
const store = useBoxesStore()
const { boxes } = storeToRefs(store)

// Ensure reactive tracking of filtered boxes
const filteredBoxes = computed(() => {
  return Object.entries(boxes.value).reduce((acc, [key, box]) => {
    if (box.language === locale.value) {
      acc[key] = box
    }
    return acc
  }, {} as typeof boxes.value)
})

const containerElement = ref<HTMLElement | null>(null)

const moveBox = (id: string | null, left: number, top: number, title: string = "Untitled", emoji?: string | null) => {
  // Ensure coordinates are within container bounds
  const container = containerElement.value
  if (container) {
    left = Math.max(0, Math.min(left, container.clientWidth - 80))
    top = Math.max(0, Math.min(top, container.clientHeight - 30))
  }

  if (id && boxes.value[id]) {
    store.boxes[id] = {
      ...boxes.value[id],
      left,
      top
    }
  } else {
    const key = Math.random().toString(36).substring(7)
    store.addBox({
      top,
      left,
      title,
      emoji: emoji ?? "🔥",
      language: locale.value
    })
  }
}

const [, drop] = useDrop(() => ({
  accept: ItemTypes.BOX,
  drop(item: DragItem, monitor) {
    const container = containerElement.value
    if (!container) return undefined

    const containerRect = container.getBoundingClientRect()

    if (item.id && typeof item.left === 'number' && typeof item.top === 'number') {
      const delta = monitor.getDifferenceFromInitialOffset() as XYCoord
      if (delta) {
        const left = Math.round(item.left + delta.x)
        const top = Math.round(item.top + delta.y)
        moveBox(item.id, left, top)
      }
    } else {
      const offset = monitor.getClientOffset()
      if (offset) {
        const left = Math.round(offset.x - containerRect.left)
        const top = Math.round(offset.y - containerRect.top)
        moveBox(null, left, top, item.title, item.emoji)
      }
    }
    return undefined
  },
}))

// Ensure drop target is properly initialized
onMounted(() => {
  if (containerElement.value) {
    drop(containerElement.value)
  }
})
</script>

<template>
  <div ref="containerElement">
    <main class="flex gap-x-3">
      <div class="w-3/4">
        <div
          ref="containerElement"
          class="container"
          :class="isDark ? 'transparent' : 'transparent'"
        >
          <Box
            v-for="(value, key) in filteredBoxes"
            :key="key"
            :id="key"
            :left="value.left"
            :top="value.top"
            :loading="value.loading"
          >
            <ItemCard
              size="large"
              :id="key.toString()"
              :title="value.title"
              :emoji="value.emoji"
              :language="locale"
              
            />
          </Box>
        </div>
      </div>
      <div class="w-1/4 shadow px-4 py-3 border rounded-lg overflow-y-scroll max-h-[80vh]"
      :class="isDark ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-300 text-gray-800'">
      <div class="sticky top-0 bg-inherit z-10"></div>
        <h2 class="font-semibold">{{ t('resources') }}</h2>
        <AvailableResources class="bg-transparent"></AvailableResources>
      </div>
    </main>
  </div>
</template>

<style scoped>
.container {
  position: relative;
  width: 100%;
  height: 90vh;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  overflow: hidden;
}
</style>