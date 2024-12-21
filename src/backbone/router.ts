import { SignalRouter } from "../parts/signal-router.ts";

export const $router = new SignalRouter({
  home: "/",
  servers: "/servers",
  serversAdd: '/servers/add',
  serversEdit: '/servers/:name',
});
