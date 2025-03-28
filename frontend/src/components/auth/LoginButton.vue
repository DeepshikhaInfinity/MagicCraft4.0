<template><!--
  <div class="relative h-full">
    
    <button
      @click="toggleDropdown"
      class="relative z-10 transition font-semibold"
      :class="isDark ? 'text-white hover:text-gray-200' : 'text-gray-500 hover:text-black'"
    >
      <span v-if="isAuthenticated">{{ user?.email }}</span>
      <span v-else>Login</span>
    </button> -->

    <!-- Dropdown Menu -->
    <div
      v-if="showDropdown"
      class="absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-1 z-20 bg-white dark:bg-gray-800"
    ><!--
      <template v-if="!isAuthenticated">
        <button
          @click="showLoginModal = true; showDropdown = false"
          class="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Login
        </button>
        <button
          @click="showSignupModal = true; showDropdown = false"
          class="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Sign Up
        </button>
        <button
          @click="showForgotModal = true; showDropdown = false"
          class="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Forgot Password
        </button>
      </template>
      <template v-else>
        <button
          @click="logout"
          class="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Logout
        </button>
      </template>
    </div>-->

    <!-- Login Modal -->
    <Teleport to="body">
      <div 
        v-if="showLoginModal"
        class="fixed inset-0 z-50"
      >
        <div 
          class="fixed inset-0 bg-black/50"
          @click="showLoginModal = false"
        ></div>
        <div class="fixed top-24 left-1/2 -translate-x-1/2 w-96 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
          <button 
            @click="showLoginModal = false" 
            class="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✖
          </button>
          <h2 class="text-2xl mb-4 text-center text-black dark:text-white">Login</h2>
          <input
            v-model="email"
            type="email"
            placeholder="Email"
            class="w-full mb-4 p-2 border rounded dark:bg-gray-700 dark:text-white"
          />
          <input
            v-model="password"
            type="password"
            placeholder="Password"
            class="w-full mb-4 p-2 border rounded dark:bg-gray-700 dark:text-white"
          />
          <div class="flex justify-between">
            <button
              @click="showLoginModal = false"
              class="px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              @click="login"
              class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Sign Up Modal -->
    <Teleport to="body">
      <div 
        v-if="showSignupModal"
        class="fixed inset-0 z-50"
      >
        <div 
          class="fixed inset-0 bg-black/50"
          @click="showSignupModal = false"
        ></div>
        <div class="fixed top-24 left-1/2 -translate-x-1/2 w-96 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
          <button 
            @click="showSignupModal = false" 
            class="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✖
          </button>
          <h2 class="text-2xl mb-4 text-center text-black dark:text-white">Sign Up</h2>
          <input
            v-model="name"
            type="name"
            placeholder="Name"
            class="w-full mb-4 p-2 border rounded dark:bg-gray-700 dark:text-white"
          />
          <input
            v-model="email"
            type="email"
            placeholder="Email"
            class="w-full mb-4 p-2 border rounded dark:bg-gray-700 dark:text-white"
          />
          <input
            v-model="password"
            type="password"
            placeholder="Password"
            class="w-full mb-4 p-2 border rounded dark:bg-gray-700 dark:text-white"
          />
          <div class="flex justify-between">
            <button
              @click="showSignupModal = false"
              class="px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              @click="signup"
              class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Forgot Password Modal -->
    <Teleport to="body">
      <div 
        v-if="showForgotModal"
        class="fixed inset-0 z-50"
      >
        <div 
          class="fixed inset-0 bg-black/50"
          @click="showForgotModal = false"
        ></div>
        <div class="fixed top-24 left-1/2 -translate-x-1/2 w-96 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
          <button 
            @click="showForgotModal = false" 
            class="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✖
          </button>
          <h2 class="text-2xl mb-4 text-center text-black dark:text-white">Reset Password</h2>
          <input
            v-model="email"
            type="email"
            placeholder="Email"
            class="w-full mb-4 p-2 border rounded dark:bg-gray-700 dark:text-white"
          />
          <div class="flex justify-between">
            <button
              @click="showForgotModal = false"
              class="px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              @click="forgotPassword"
              class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import useAuthStore from "@/stores/useAuthStore";

import { useRouter } from 'vue-router'
import { useDark } from '@vueuse/core'

const isDark = useDark()
//const authStore = useAuthStore()
const router = useRouter()
const showDropdown = ref(false)
const email = ref('')
const password = ref('')
const name = ref(""); 
const showLoginModal = ref(false)
const showSignupModal = ref(false)
const showForgotModal = ref(false)

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const login = async () => {
  try {
    //await authStore.login(email.value, password.value)
    showLoginModal.value = false
    router.push('/')
  } catch (error) {
    console.error('Login failed:', error)
  }
}

const signup = async () => {
  try {
    //await authStore.signup(name.value, email.value, password.value)
    showSignupModal.value = false
    router.push('/')
  } catch (error) {
    console.error('Signup failed:', error)
  }
}

const logout = async () => {
  //await authStore.logout()
  router.push('/login')
}

const forgotPassword = async () => {
  try {
   // await authStore.forgotPassword(email.value)
    showForgotModal.value = false
  } catch (error) {
    console.error('Password reset failed:', error)
  }
}

//const isAuthenticated = computed(() => authStore.isAuthenticated)
//const user = computed(() => authStore.user)
</script>