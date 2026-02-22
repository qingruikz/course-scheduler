import { createRouter, createWebHistory } from "vue-router";
import MainApp from "../views/MainApp.vue";
import DownloadIcsPage from "../views/DownloadIcsPage.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", component: MainApp },
    { path: "/d", component: DownloadIcsPage },
  ],
});

export default router;
