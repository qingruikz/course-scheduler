import { createRouter, createWebHistory } from "vue-router";
import MainApp from "../views/MainApp.vue";
import DownloadIcsPage from "../views/DownloadIcsPage.vue";
import AdminCalendarMapperView from "../views/AdminCalendarMapperView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", component: MainApp },
    { path: "/d", component: DownloadIcsPage },
    {
      path: "/admin/calendar-mapper",
      component: AdminCalendarMapperView,
      meta: { hidden: true },
    },
  ],
});

export default router;
