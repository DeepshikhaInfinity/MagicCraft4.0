<script setup lang="ts">
import { ref, reactive, provide, inject, onMounted, onUnmounted, nextTick } from 'vue'
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDark, useToggle } from '@vueuse/core'
import { DndProvider } from 'vue3-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import EnglishView from '@/views/EnglishView.vue'
import HindiView from '@/views/HindiView.vue'
import TamilView from '@/views/TamilView.vue'
import ClearButton from '@/components/ClearButton.vue'
import DeleteResourcesButton from '@/components/DeleteResourcesButton.vue'
import LoginButton from '@/components/auth/LoginButton.vue'




const currentTab = ref('english')
const tabs = ['english', 'hindi', 'tamil']

const currentTabComponent = ref(EnglishView)

const switchTab = (tab: string) => {
  currentTab.value = tab
  switch(tab) {
    case 'english':
      currentTabComponent.value = EnglishView
      break
    case 'hindi':
      currentTabComponent.value = HindiView
      break
    case 'tamil':
      currentTabComponent.value = TamilView
      break
  }
}


// Language-specific item card interface
interface ItemCard {
  id: number
  content: string
  route: string
}

// Language state management
const languageStates = reactive<{ [key: string]: ItemCard[] }>({})

// Particle Classes
class StarParticle {
  x: number
  y: number
  radius: number
  color: string
  opacity: number
  createdAt: number
  lifetime: number
  points: number
  rotation: number

  constructor(x: number, y: number, isDarkMode: boolean) {
    this.x = x
    this.y = y
    this.radius = Math.random() * 3 + 2
    this.points = Math.floor(Math.random() * 3) + 4
    this.rotation = Math.random() * Math.PI * 2
    this.createdAt = Date.now()
    this.lifetime = 2000

    const vibrantColors = [
      'rgba(255, 87, 34, 1)',
      'rgba(33, 150, 243, 1)',
      'rgba(156, 39, 176, 1)',
      'rgba(76, 175, 80, 1)',
      'rgba(255, 193, 7, 1)',
      'rgba(255, 235, 59, 1)',
      'rgba(0, 188, 212, 1)',
      'rgba(233, 30, 99, 1)',
    ]

    this.color = vibrantColors[Math.floor(Math.random() * vibrantColors.length)]
    this.opacity = 1
  }

  drawStar(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation)
    ctx.beginPath()

    for (let i = 0; i < this.points * 2; i++) {
      const radius = i % 2 === 0 ? this.radius : this.radius / 2
      const angle = (Math.PI * 2 * i) / (this.points * 2)
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.closePath()
    ctx.fillStyle = this.color.replace('1', `${this.opacity}`)
    ctx.fill()
    ctx.restore()
  }

  update() {
    const elapsed = Date.now() - this.createdAt
    this.opacity = Math.max(0, 1 * (1 - elapsed / this.lifetime))
    this.rotation += 0.02
  }

  isExpired(): boolean {
    return Date.now() - this.createdAt > this.lifetime
  }
}

class Particle {
  x: number
  y: number
  radius: number
  color: string
  speedX: number
  speedY: number

  constructor(x: number, y: number, isDarkMode: boolean) {
    this.x = x
    this.y = y
    this.radius = Math.random() * 4 + 2

    const vibrantColors = [
      'rgba(255, 87, 34, 1)',
      'rgba(33, 150, 243, 1)',
      'rgba(156, 39, 176, 1)',
      'rgba(76, 175, 80, 1)',
      'rgba(255, 193, 7, 1)',
      'rgba(255, 235, 59, 1)',
      'rgba(0, 188, 212, 1)',
      'rgba(233, 30, 99, 1)',
      'rgba(255, 87, 34, 1)',
      'rgba(139, 195, 74, 1)'
    ]

    this.color = vibrantColors[Math.floor(Math.random() * vibrantColors.length)]

    this.speedX = Math.random() * 2 - 1
    this.speedY = Math.random() * 2 - 1
  }

  update() {
    this.x += this.speedX
    this.y += this.speedY

    if (this.x < 0 || this.x > window.innerWidth) this.speedX *= -1
    if (this.y < 0 || this.y > window.innerHeight) this.speedY *= -1
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = this.color
    ctx.fill()
  }
}

// Language Items Context
function useLanguageItems() {
  const route = useRoute()
  
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

// Reactive References
const container = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const particles = ref<Particle[]>([])
const mouseTrailParticles = ref<StarParticle[]>([])
const ctx = ref<CanvasRenderingContext2D | null>(null)
const mousePosition = ref({ x: 0, y: 0 })
const clickPositions = ref<{ x: number, y: number }[]>([])

// Internationalization and Routing
const { t, locale } = useI18n()
const router = useRouter()

// Define available languages
const languages = {
  en: 'English',
  hi: 'हिंदी',
  ta: 'தமிழ்',
}

// Dark Mode Setup
const isDark = useDark()
const toggleDark = useToggle(isDark)

// Function to change locale and route
function changeLocale(lang: string) {
  locale.value = lang
  const routeMap: { [key: string]: string } = {
    'en': '/english',
    'hi': '/hindi',
    'ta': '/tamil'
  }
  
  router.push(routeMap[lang] || '/')
}

// Mouse Tracking for Trail
const handleMouseMove = (event: MouseEvent) => {
  mousePosition.value = { x: event.clientX, y: event.clientY }
  
  const canvas = canvasRef.value
  if (canvas) {
    const newParticles = Array.from({ length: 3 }, () => 
      new StarParticle(
        mousePosition.value.x + (Math.random() - 0.5) * 20, 
        mousePosition.value.y + (Math.random() - 0.5) * 20, 
        isDark.value
      )
    )
    mouseTrailParticles.value.push(...newParticles)
  }
}

// Handle Mouse Click and Draw Connecting Lines
const handleMouseClick = (event: MouseEvent) => {
  clickPositions.value.push({ x: event.clientX, y: event.clientY })
}

// Particle Initialization
const initParticles = async () => {
  await nextTick()
  const canvas = canvasRef.value
  if (canvas) {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const context = canvas.getContext('2d')
    
    if (context) {
      ctx.value = context
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('click', handleMouseClick)
      particles.value = Array.from({ length: 250 }, () => 
        new Particle(
          Math.random() * canvas.width, 
          Math.random() * canvas.height,
          isDark.value
        )
      )
    }
  }
}

// Particle Animation
const animateParticles = () => {
  const canvas = canvasRef.value
  const context = ctx.value

  if (canvas && context) {
    context.clearRect(0, 0, canvas.width, canvas.height)

    // Drawing particle connection
    for (let i = 0; i < particles.value.length; i++) {
      for (let j = i + 1; j < particles.value.length; j++) {
        const dx = particles.value[i].x - particles.value[j].x
        const dy = particles.value[i].y - particles.value[j].y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 100) {
          context.beginPath()
          context.moveTo(particles.value[i].x, particles.value[i].y)
          context.lineTo(particles.value[j].x, particles.value[j].y)
          context.strokeStyle = isDark.value 
            ? `rgba(255, 255, 255, ${1 - distance / 100})` 
            : `rgba(0, 0, 0, ${1 - distance / 100})`
          context.lineWidth = 0.5
          context.globalAlpha = 0.6
          context.stroke()
        }
      }
    }

    // Drawing lines from particles to mouse click positions
    clickPositions.value.forEach(click => {
      particles.value.forEach(particle => {
        const dx = click.x - particle.x
        const dy = click.y - particle.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 100) {
          context.beginPath()
          context.moveTo(particle.x, particle.y)
          context.lineTo(click.x, click.y)
          context.strokeStyle = isDark.value 
            ? `rgba(255, 255, 255, 0.5)` 
            : `rgba(0, 0, 0, 0.5)`
          context.lineWidth = 1
          context.globalAlpha = 0.5
          context.stroke()
        }
      })
    })

    particles.value.forEach(particle => {
      particle.update()
      particle.draw(context)
    })

    mouseTrailParticles.value = mouseTrailParticles.value.filter(particle => {
      particle.update()
      particle.drawStar(context)
      return !particle.isExpired()
    })

    requestAnimationFrame(animateParticles)
  }
}

// Lifecycle Hooks
onMounted(async () => {
  await initParticles()
  animateParticles()
})

onUnmounted(() => {
  const canvas = canvasRef.value
  if (canvas) {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('click', handleMouseClick)
  }
})
</script>

<template>
  <div class="app">
    <!-- Tab Navigation -->
    <nav class="mb-4">
      <button
        v-for="tab in tabs"
        :key="tab"
        @click="switchTab(tab)"
        :class="[
          'mr-4 px-4 py-2 rounded-lg hover:bg-gray-100',
          currentTab === tab ? 'bg-blue-100' : ''
        ]"
      >
        {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
      </button>
    </nav>

    <!-- Tab Content with DndProvider -->
    <DndProvider :backend="HTML5Backend">
      <keep-alive>
        <component :is="currentTabComponent"></component>
      </keep-alive>
    </DndProvider>
  </div>
  <div 
    ref="container" 
    class="particle-container" 
    :class="{ 'dark': isDark }"
  >
    <canvas ref="canvasRef" class="absolute top-0 left-0 z-1 w-full h-full"></canvas>
    
    <header 
      class="border-b border-gray-300 py-4 px-4 fixed z-20 w-full backdrop-blur-sm shadow-sm"
      :class="isDark 
        ? 'bg-gray-900/70 text-white' 
        : 'bg-white/70 text-black'"
    >
      <div class="flex w-full px-4 mx-auto justify-between items-center">
        <div class="flex items-center space-x-3">
          <div 
            class="border-2 shadow-sm px-2.5 rounded-lg py-1 text-2xl font-bold tracking-wider"
            :class="isDark 
              ? 'border-gray-700 text-white' 
              : 'border-gray-200 text-black'"
          >
            <span class="text-sky-400">Magic</span>Craft
          </div>
        </div>
        
        <nav class="flex space-x-5">
          <!-- Language Tabs -->
          <a
            v-for="(label, key) in languages"
            :key="key"
            href="#"
            class="transition font-semibold"
            :class="[
              isDark 
                ? 'text-white hover:text-gray-200' 
                : 'text-gray-500 hover:text-black',
              { 'font-bold': locale === key }
            ]"
            @click.prevent="changeLocale(key)"
          >
            {{ label }}
          </a>

          <!-- Other Navigation Links -->
          <RouterLink 
            to="/"
            class="transition font-semibold"
            :class="isDark 
              ? 'text-white hover:text-gray-200' 
              : 'text-gray-500 hover:text-black'"
          >
            Home
          </RouterLink>
          <RouterLink 
            to="/about"
            class="transition font-semibold"
            :class="isDark 
              ? 'text-white hover:text-gray-200' 
              : 'text-gray-500 hover:text-black'"
          >
            About
          </RouterLink>
          <!-- Add LoginButton before the dark mode toggle -->
          <LoginButton />
          
        </nav>
        

        <button 
          @click="toggleDark()" 
          class="transition px-4 py-2 rounded-lg focus:outline-none"
          :class="isDark 
            ? 'text-white hover:text-gray-200' 
            : 'text-gray-500 hover:text-black'"
        >
          <span v-if="isDark">🌙</span>
          <span v-else>🌞</span>
        </button>
      </div>
    </header>

    <div 
      class="min-h-screen pt-24 px-4 relative z-10"
      :class="isDark 
        ? 'bg-gray-900/70' 
        : 'bg-gray-50/70'"
    >
      <div class="dark:bg-transparent">
        <RouterView :key="locale" />
        <DeleteResourcesButton 
        class="z-50"
        :class="isDark ? 'text-white hover:bg-gray-700' : 'text-gray-100 hover:bg-gray-700'" 
      />
        <ClearButton 
        class="z-50"
        :class="isDark ? 'text-white hover:bg-gray-700' : 'text-gray-100 hover:bg-gray-700'" 
      />
      </div>
    </div>
  </div>
</template>

<style>
.particle-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #e6e9f0, #f5f7fa);
  overflow: hidden;
  transition: background 0.3s ease;
}

.particle-container.dark {
  background: linear-gradient(135deg, #0a0a1a, #1a1a2a);
}
</style>
