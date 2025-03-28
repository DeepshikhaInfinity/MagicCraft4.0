import { ref, reactive } from 'vue'
import { useRoute } from 'vue-router'

export interface ItemCard {
  id: number
  content: string
  route: string
}

export function useLanguageItems() {
  const route = useRoute()
  
  // Explicitly type the reactive object
  const languageStates = reactive<Record<string, ItemCard[]>>({})

  const addItemCard = (card: ItemCard) => {
    const currentRoute = route.path
    if (!languageStates[currentRoute]) {
      languageStates[currentRoute] = []
    }
    languageStates[currentRoute].push({
      ...card,
      route: currentRoute
    })
  }
  
  const getItemCards = () => {
    const currentRoute = route.path
    return languageStates[currentRoute] || []
  }
  
  return {
    addItemCard,
    getItemCards
  }
}
