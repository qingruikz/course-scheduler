import { createRouter, createWebHistory } from "vue-router";
import MainApp from "../views/MainApp.vue";
import AdminCalendarMapperView from "../views/AdminCalendarMapperView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", component: MainApp },
    {
      path: "/admin/calendar-mapper",
      component: AdminCalendarMapperView,
      meta: { hidden: true },
    },
  ],
});

export default router;
