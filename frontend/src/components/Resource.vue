<script setup lang="ts">
import { useDrag } from 'vue3-dnd'
import { ItemTypes } from './ItemTypes'
import { toRefs } from '@vueuse/core'
import ItemCard from "@/components/ItemCard.vue"
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const props = defineProps<{
  emoji: string
  title: string
  id: string
  size: string
}>()

const [collect, drag] = useDrag(() => ({
  type: ItemTypes.BOX,
  item: { title: props.title, emoji: props.emoji },
  collect: monitor => ({
    isDragging: monitor.isDragging(),
  }),
}))

const { isDragging } = toRefs(collect)
</script>

<template>
  <div
    class="inline-block"
    :ref="drag"
    role="Box"
    data-testid="box"
  >
    <ItemCard 
      :title="title" 
      :emoji="emoji" 
      :id="id" 
      size="large" 
      :language="locale"
    />
  </div>
</template>