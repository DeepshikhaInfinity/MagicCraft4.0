//import './assets/main.css'
//import { createApp } from 'vue'
import { createPinia } from 'pinia'
//import App from './App.vue';
//import router from './router'  // This will automatically look for index.ts in the router folder
import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';
import App from './App.vue';
import router from './router';
import { messages } from './i18n/messages'; // Import translation messages
import './assets/main.css';
import en from './locales/en.json';
import hi from './locales/hi.json';
import ta from './locales/ta.json';





const i18n = createI18n({
    legacy: false, // Use Composition API mode (required for Vue 3)
    locale: 'en', // Default language
    fallbackLocale: 'en', // Fallback language
    messages, // Translation messages
  });

const app = createApp(App);
app.use(router);
app.use(i18n);
app.use(createPinia())
app.mount('#app');

//const app = createApp(App)

//app.use(router)
//app.mount('#app')