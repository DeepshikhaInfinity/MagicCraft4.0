import { ref, watch, computed } from 'vue'
import { defineStore } from 'pinia'
import { useI18n } from 'vue-i18n'

export interface ResourceStoreEntry {
  language: string | undefined
  title: string
  emoji: string
}

export const useResourcesStore = defineStore('resources', () => {
  const { t, locale } = useI18n()
  const initialResources = ref<Record<string, ResourceStoreEntry[]>>({})
  const userResources = ref<Record<string, ResourceStoreEntry[]>>({})
  const isDeleteMode = ref(false)

  // Function to check if a resource is one of the initial resources
  function isInitialResource(title: string) {
    const lang = locale.value
    return initialResources.value[lang]?.some(resource => resource.title === title) ?? false
  }

  // Function to initialize default resources for a language
  const initializeDefaultResources = (lang: string) => {
    initialResources.value[lang] = [
      {
        title: t('fire', { locale: lang }), emoji: '🔥',
        language: undefined
      },
      {
        title: t('water', { locale: lang }), emoji: '💧',
        language: undefined
      },
      {
        title: t('earth', { locale: lang }), emoji: '🌍',
        language: undefined
      },
      {
        title: t('air', { locale: lang }), emoji: '💨',
        language: undefined
      }
    ]
  }

  // Get current resources (initial + user) for the active language
  const resources = computed(() => {
    const lang = locale.value
    const initial = initialResources.value[lang] || []
    const userAdded = userResources.value[lang] || []
    return [...initial, ...userAdded]
  })

  watch(
    () => locale.value,
    (newLang) => {
      if (!initialResources.value[newLang]) {
        initializeDefaultResources(newLang)
      }
      if (!userResources.value[newLang]) {
        userResources.value[newLang] = []
      }
    },
    { immediate: true }
  )

  function addResourceToLanguage(box: ResourceStoreEntry, language: string) {
    if (!userResources.value[language]) {
      userResources.value[language] = []
    }
    if (!userResources.value[language].some(resource => resource.title === box.title)) {
      userResources.value[language].push(box)
    }
  }

  function addResource(box: ResourceStoreEntry) {
    addResourceToLanguage(box, locale.value)
  }

  function deleteResource(title: string) {
    const lang = locale.value
    // Only delete from user resources, not initial resources
    if (userResources.value[lang]) {
      userResources.value[lang] = userResources.value[lang].filter(
        resource => resource.title !== title
      )
    }
  }

  function setDeleteMode(mode: boolean) {
    isDeleteMode.value = mode
  }

  function getResourcesByLanguage(language: string) {
    const initial = initialResources.value[language] || []
    const userAdded = userResources.value[language] || []
    return [...initial, ...userAdded]
  }

  return {
    resources,
    addResource,
    addResourceToLanguage,
    getResourcesByLanguage,
    deleteResource,
    setDeleteMode,
    isInitialResource,
    isDeleteMode
  }
})