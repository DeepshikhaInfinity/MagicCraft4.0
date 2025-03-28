<script setup lang="ts">
import Resource from "@/components/Resource.vue"
import { useResourcesStore } from "@/stores/useResourcesStore"
import { storeToRefs } from "pinia"
import { computed, ref } from "vue"
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const store = useResourcesStore()
const { resources } = storeToRefs(store)
const searchTerm = ref('')

// Only filter by search term since resources are already language-specific
const filteredResources = computed(() => {
  return resources.value.filter((resource) => {
    return resource.title.toLowerCase().includes(searchTerm.value.toLowerCase())
  })
})
</script>

<template>
  <div class="flex gap-3 flex-wrap pt-3">
    <input
      v-model="searchTerm"
      type="text"
      class="w-full px-3 py-2 border rounded-md outline-none
         bg-white text-black border-gray-300 focus:ring-2 focus:ring-blue-500
         dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:focus:ring-blue-400"

      :placeholder="t('searchResources')"
      
    >
    <Resource
      v-for="resource in filteredResources"
      :key="resource.title"
      :title="resource.title"
      :emoji="resource.emoji"
      :id="resource.title"
      :size="'large'"
      :language="locale"
    />
    
  </div>
  <ClearButton />
</template>