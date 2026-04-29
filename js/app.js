document.addEventListener("DOMContentLoaded", () => {
  // Check Streak
  if (window.Store) {
    window.Store.updateStreak();
  }

  // Register Service Worker for PWA / Offline capabilities
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("sw.js")
        .then((registration) => {
          console.log(
            "ServiceWorker registration successful with scope: ",
            registration.scope,
          );
        })
        .catch((err) => {
          console.error("ServiceWorker registration failed: ", err);
        });
    });
  }
});
