class TasksManager {
  constructor() {
    this.focusModeToggle = document.getElementById("focus-mode-toggle");
    this.init();
  }

  init() {
    if (this.focusModeToggle) {
      this.focusModeToggle.checked = Store.getSettings().focusMode;
      this.focusModeToggle.addEventListener("change", (e) => {
        Store.updateSettings({ focusMode: e.target.checked });
        this.applyFocusMode();
      });
    }

    window.addEventListener("store:changed", () => this.applyFocusMode());
    this.applyFocusMode();
  }

  applyFocusMode() {
    const isFocus = Store.getSettings().focusMode;
    if (this.focusModeToggle) this.focusModeToggle.checked = isFocus;

    if (isFocus) {
      document.body.classList.add("focus-mode");
      // Change default view to Day if in month
      if (window.CalendarApp && window.CalendarApp.currentView !== "day") {
        window.CalendarApp.setView("day");
      }
    } else {
      document.body.classList.remove("focus-mode");
    }
  }
}

window.TasksApp = new TasksManager();
