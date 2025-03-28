import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { reactive, watchEffect } from "vue"
import { useI18n } from 'vue-i18n'

export interface BoxStoreEntry {
  top: number
  left: number
  title: string
  emoji: string
  loading?: boolean
  language?: string
}

export const useBoxesStore = defineStore('counter', () => {
  const { t, locale } = useI18n()
  const boxes = reactive<{ [key: string]: BoxStoreEntry }>({})

  // Initialize the first box with reactive title and current language
  const initializeBox = (lang: string) => {
    const boxId = `initial-${lang}`
    if (!boxes[boxId]) {
      boxes[boxId] = {
        top: 20,
        left: 80,
        title: t('fire', { locale: lang }),
        emoji: '🔥',
        language: lang
      }
    }
  }

  // Add new clearBoxes function
  function clearBoxes() {
    const currentLang = locale.value
    // Get all box IDs for current language
    const currentBoxes = Object.entries(boxes).filter(([_, box]) => box.language === currentLang)
    
    // Remove each box for current language
    currentBoxes.forEach(([id, _]) => {
      delete boxes[id]
    })
    
    // Reinitialize the first box only for current language
    initializeBox(currentLang)
  }

  // Update box titles when language changes
  watchEffect(() => {
    const currentLang = locale.value
    initializeBox(currentLang)
  })

  function addBox(box: BoxStoreEntry) {
    const randomId = Math.random().toString(36).substr(2, 5)
    boxes[randomId] = {
      ...box,
      language: box.language || locale.value
    }
  }

  function removeBox(id: string) {
    delete boxes[id]
  }

  const getBoxesByLanguage = computed(() => {
    return Object.entries(boxes).reduce((acc, [key, box]) => {
      if (box.language === locale.value) {
        acc[key] = box
      }
      return acc
    }, {} as { [key: string]: BoxStoreEntry })
  })

  return {
    boxes,
    removeBox,
    addBox,
    getBoxesByLanguage,
    clearBoxes
  }
})