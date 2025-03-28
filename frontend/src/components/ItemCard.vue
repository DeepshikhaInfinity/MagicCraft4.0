<script setup lang="ts">
import { useDrop } from "vue3-dnd"
import { ItemTypes } from "@/components/ItemTypes"
import type { DragItem } from "@/components/interfaces"
import { useBoxesStore } from "@/stores/useBoxesStore"
import { useResourcesStore } from "@/stores/useResourcesStore"
import { storeToRefs } from "pinia"
import { twMerge } from "tailwind-merge"
import axios from "axios"

const props = defineProps<{
  title: string
  emoji: string
  id: string
  size: 'small' | 'large'
  language?: string
}>()

const store = useBoxesStore()
const { removeBox, addBox } = store
const resourceStore = useResourcesStore()
const { resources } = storeToRefs(resourceStore)
const { isDeleteMode } = storeToRefs(resourceStore)

/**
 * Function to speak the crafted word.
 */
 const speakCardCreation = (title: string) => {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(`${title} Crafted`);
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  }
};

/**
 * Function to play a click sound effect.
 */
 const playClickSound = () => {
  const audio = new Audio("/click.mp3") // Ensure the file is in the `public` folder
  audio.play()
}

const handleItemClick = () => {
  playClickSound() // Play sound on click

  // Add the item to the main content area
  addBox({
    title: props.title,
    emoji: props.emoji,
    left: Math.random() * 1200,  // Random position 
    top: Math.random() * 700,   // Random position 
    language: props.language
  })
}


const handleDelete = (event: Event) => {
  event.stopPropagation()
  if (!resourceStore.isInitialResource(props.title)) {
    resourceStore.deleteResource(props.title)
  }}

const [, drop] = useDrop(() => ({
  accept: ItemTypes.BOX,
  async drop(item: DragItem, monitor) {
    if (item.id !== props.id) {
      const droppedId = item?.id
      const targetBox = store.boxes[props.id]
      const droppedBox = droppedId ? store.boxes[droppedId] : item

      // Get the language of the items being combined
      const combinationLanguage = targetBox.language || props.language
      const droppedLanguage = droppedBox.language || props.language

      // Check if both items have the same language
      if (combinationLanguage !== droppedLanguage) {
        return // Don't combine items of different languages
      }

      // Remove the dropped box if it exists
      if (droppedId) {
        removeBox(droppedId)
      }

      // Set loading state
      store.boxes[props.id].loading = true

      try {
        // Call API to combine words
        const response = await axios.post('http://127.0.0.1:3000/', {
          first: targetBox.title,
          second: droppedBox.title || item?.title,
          language: combinationLanguage
        })

        const resultAnswer = response.data.result || targetBox.title
        const resultEmoji = response.data.emoji || targetBox.emoji

        // Add new combined box
        addBox({
          title: resultAnswer,
          emoji: resultEmoji,
          left: targetBox.left,
          top: targetBox.top,
          language: combinationLanguage
        })

        speakCardCreation(resultAnswer);

        // Add to resources with the specific language if language is defined
        if (combinationLanguage) {
          resourceStore.addResourceToLanguage({
            title: resultAnswer,
            emoji: resultEmoji,
            language: undefined
          }, combinationLanguage)
        } else {
          // Fallback to adding to current locale if no language is specified
          resourceStore.addResource({
            title: resultAnswer,
            emoji: resultEmoji,
            language: undefined
          })
        }

        // Remove the target box
        removeBox(props.id)
      } catch (error) {
        console.error('Error combining items:', error)
        store.boxes[props.id].loading = false
      }
    }
  }
}))
</script>

<template>
  <div :ref="drop" class="relative group" @click="handleItemClick" @mousedown="playClickSound">
    <div
      :class="twMerge(
        props.size === 'large' ? 'text-2xl space-x-2.5 py-2.5 px-4' : 'space-x-1.5 px-3 py-1',
        'border-gray-200 bg-white text-black shadow hover:bg-gray-100 cursor-pointer transition inline-block font-medium border rounded-lg',
        isDeleteMode ? 'opacity-80' : '',
        'dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white'
      )"
    >
    <span class="group-hover:animate-bounce transition-all duration-300 inline-block transform">
      {{ props.emoji }}
    </span>
    <span class="group-hover:translate-y-[-2px] group-hover:opacity-90 transition-all duration-300 inline-block">
      {{ props.title }}
    </span>
      <!-- Delete icon overlay -->
      <div
        v-if="isDeleteMode && !resourceStore.isInitialResource(title)"
        class="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"
        @click="handleDelete"
      >
        <span class="material-symbols-outlined text-red-500">
          close
        </span>
      </div>
    </div>
  </div>
</template>



<style scoped>
.material-symbols-outlined {
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 24;
}

.item-card {
  color: black !important;
  background-color: transparent !important;
}

.dark .item-card {
  color: white !important;
  background-color: transparent !important; /* Dark background */
}

.dark .item-card:hover {
  color: #ffffff;
}
</style>
