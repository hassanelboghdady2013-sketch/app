const reserved = new Set([
  "admin",
  "api",
  "login",
  "register",
  "dashboard",
  "me",
  "www",
  "support",
  "settings",
  "profile",
  "help",
  "about",
  // Reserved because the app uses /card/:username as a public-card
  // share page. Without this, a user could claim "card" and shadow
  // the route prefix at /card.
  "card",
]);

export default reserved;
