import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import EnglishView from '@/views/EnglishView.vue';
import HindiView from '@/views/HindiView.vue';
import TamilView from '@/views/TamilView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue')
    },
    {
      path: '/english',
      name: 'english',
      component: EnglishView
    },
    {
      path: '/hindi',
      name: 'hindi',
      component: HindiView
    },
    {
      path: '/tamil',
      name: 'tamil',
      component:TamilView
    }
  ]
})

export default router