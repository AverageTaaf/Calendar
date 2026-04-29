class UIManager {
  constructor() {
    this.init();
  }

  init() {
    // Theme & Accent Colors initialization
    this.applyTheme();

    // Navigation binds
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        document
          .querySelectorAll(".nav-item")
          .forEach((n) => n.classList.remove("active"));
        e.currentTarget.classList.add("active");
        if (window.CalendarApp) {
          window.CalendarApp.setView(e.currentTarget.dataset.view);
        }
        // Close mobile menu
        document.getElementById("sidebar").classList.remove("open");
      });
    });

    // Mobile Menu
    const mobileToggle = document.getElementById("btn-mobile-menu");
    const mobileClose = document.getElementById("btn-mobile-close");
    const sidebar = document.getElementById("sidebar");

    if (mobileToggle)
      mobileToggle.addEventListener("click", () =>
        sidebar.classList.add("open"),
      );
    if (mobileClose)
      mobileClose.addEventListener("click", () =>
        sidebar.classList.remove("open"),
      );

    // Header controls
    document
      .getElementById("btn-today")
      .addEventListener(
        "click",
        () => window.CalendarApp && window.CalendarApp.goToday(),
      );
    document
      .getElementById("btn-prev")
      .addEventListener(
        "click",
        () => window.CalendarApp && window.CalendarApp.navigate(-1),
      );
    document
      .getElementById("btn-next")
      .addEventListener(
        "click",
        () => window.CalendarApp && window.CalendarApp.navigate(1),
      );

    // Quick Input NLP
    const quickInput = document.getElementById("quick-input");
    if (quickInput) {
      quickInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && quickInput.value.trim()) {
          const parsed = window.NLP
            ? window.NLP.parseQuickAdd(quickInput.value.trim())
            : null;
          if (parsed) {
            this.openItemModal(
              {
                title: parsed.title,
                date: parsed.date,
                time: parsed.time,
                allday: parsed.allday,
              },
              parsed.type,
            );
          }
          quickInput.value = "";
        }
      });
    }

    // Modals
    this.bindModals();

    // Listen for store changes to update UI
    window.addEventListener("store:changed", () => this.updateSidebarUI());
    this.updateSidebarUI();
  }

  bindModals() {
    // Close buttons
    document.querySelectorAll(".modal-close").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const modalId = e.currentTarget.dataset.modal;
        document.getElementById(modalId).classList.remove("active");
      });
    });

    // Overlay click close
    document.querySelectorAll(".modal-overlay").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.remove("active");
      });
    });

    // Main Add Button
    document.getElementById("btn-quick-add").addEventListener("click", () => {
      this.openItemModal(null, "event");
    });

    // Item Modal Tabs
    const itemTabs = document.querySelectorAll(".tab-btn");
    itemTabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        itemTabs.forEach((t) => t.classList.remove("active"));
        e.currentTarget.classList.add("active");
        const type = e.currentTarget.dataset.type;
        document.getElementById("item-type").value = type;

        // Toggle UI based on type
        const isTask = type === "task";
        document.getElementById("end-time-group").style.display = isTask
          ? "none"
          : "block";
        document.getElementById("task-extras").style.display = isTask
          ? "block"
          : "none";
        document.getElementById("allday-group").style.display = isTask
          ? "none"
          : "flex";

        if (isTask) document.getElementById("item-allday").checked = false;
        this.toggleTimeGroup();
      });
    });

    // All day toggle
    document
      .getElementById("item-allday")
      .addEventListener("change", () => this.toggleTimeGroup());

    // Item Form Submit
    document.getElementById("item-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveItem();
    });

    document.getElementById("btn-delete-item").addEventListener("click", () => {
      const id = document.getElementById("item-id").value;
      const type = document.getElementById("item-type").value;
      if (id) {
        if (type === "event") Store.deleteEvent(id);
        else Store.deleteTask(id);
      }
      document.getElementById("event-modal").classList.remove("active");
    });

    // Alarm Binds
    document.getElementById("btn-add-alarm").addEventListener("click", () => {
      this.openAlarmModal();
    });

    document.getElementById("alarm-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveAlarm();
    });

    document
      .getElementById("btn-delete-alarm")
      .addEventListener("click", () => {
        const id = document.getElementById("alarm-id").value;
        if (id) {
          Store.deleteAlarm(id);
        }
        document.getElementById("alarm-modal").classList.remove("active");
      });

    // Settings
    const openSettings = () => {
      const settings = Store.getSettings();
      document.getElementById("setting-color").value =
        settings.accentColor || "#6366f1";
      document.getElementById("color-hex-display").textContent =
        settings.accentColor || "#6366f1";
      document.getElementById("setting-hourly-chime").checked =
        settings.hourlyChime || false;
      document.getElementById("setting-time-format").value =
        settings.timeFormat || "12hr";
      document.getElementById("settings-modal").classList.add("active");
    };

    const oldSettingsBtn = document.getElementById("btn-settings");
    if (oldSettingsBtn) oldSettingsBtn.addEventListener("click", openSettings);

    const navSettings = document.getElementById("nav-item-settings");
    if (navSettings) navSettings.addEventListener("click", openSettings);

    document.getElementById("setting-color").addEventListener("input", (e) => {
      const color = e.target.value;
      document.getElementById("color-hex-display").textContent = color;
      document.documentElement.style.setProperty("--accent", color);
      Store.updateSettings({ accentColor: color });
    });

    document
      .getElementById("setting-hourly-chime")
      .addEventListener("change", (e) => {
        Store.updateSettings({ hourlyChime: e.target.checked });
      });

    document
      .getElementById("setting-time-format")
      .addEventListener("change", (e) => {
        Store.updateSettings({ timeFormat: e.target.value });
      });

    document
      .getElementById("btn-theme-toggle")
      .addEventListener("click", () => {
        const newTheme = document.body.classList.contains("theme-dark")
          ? "light"
          : "dark";
        Store.updateSettings({ theme: newTheme });
        this.applyTheme();
      });

    // Import/Export
    document
      .getElementById("btn-export")
      .addEventListener("click", () => Store.exportData());

    document.getElementById("btn-import").addEventListener("click", () => {
      document.getElementById("import-file").click();
    });

    document.getElementById("import-file").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const replace = confirm(
          "Do you want to replace all current data? (Cancel = Merge)",
        );
        if (Store.importData(ev.target.result, replace)) {
          alert("Import successful");
          document.getElementById("settings-modal").classList.remove("active");
        }
      };
      reader.readAsText(file);
    });

    document.getElementById("btn-clear-data").addEventListener("click", () => {
      if (
        confirm("Are you sure? This will wipe all offline data permanently.")
      ) {
        Store.clearAll();
        document.getElementById("settings-modal").classList.remove("active");
      }
    });
  }

  applyTheme() {
    const settings = Store.getSettings();
    if (settings.theme === "light") {
      document.body.classList.remove("theme-dark");
      document.body.dataset.theme = "light";
    } else {
      document.body.classList.add("theme-dark");
      document.body.dataset.theme = "dark";
    }

    if (settings.accentColor) {
      document.documentElement.style.setProperty(
        "--accent",
        settings.accentColor,
      );
    }
  }

  updateSidebarUI() {
    // Streak
    const settings = Store.getSettings();
    document.getElementById("streak-count").textContent =
      settings.streakCount || 0;

    // Render Alarms in Sidebar
    const alarmList = document.getElementById("alarm-list");
    alarmList.innerHTML = "";
    Store.getAlarms().forEach((alarm) => {
      const li = document.createElement("li");
      li.className = "alarm-item";

      const info = document.createElement("div");
      info.className = "alarm-info";
      info.innerHTML = `<span class="alarm-time-text">${alarm.time}</span><span class="alarm-msg">${alarm.message || "Alarm"}</span>`;

      const toggle = document.createElement("label");
      toggle.className = "switch";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = alarm.enabled;
      cb.addEventListener("change", (e) => {
        Store.updateAlarm({ ...alarm, enabled: e.target.checked });
      });
      const slider = document.createElement("span");
      slider.className = "slider round";

      toggle.appendChild(cb);
      toggle.appendChild(slider);

      const editBtn = document.createElement("button");
      editBtn.className = "icon-btn";
      editBtn.innerHTML = '<i class="ph ph-pencil-simple"></i>';
      editBtn.addEventListener("click", () => this.openAlarmModal(alarm));

      const rightSide = document.createElement("div");
      rightSide.style.display = "flex";
      rightSide.style.alignItems = "center";
      rightSide.style.gap = "0.5rem";
      rightSide.appendChild(editBtn);
      rightSide.appendChild(toggle);

      li.appendChild(info);
      li.appendChild(rightSide);
      alarmList.appendChild(li);
    });
  }

  toggleTimeGroup() {
    const isAllDay = document.getElementById("item-allday").checked;
    const timeGroup = document.getElementById("start-time-group");
    const endTimeGroup = document.getElementById("end-time-group");

    if (isAllDay) {
      timeGroup.style.display = "none";
      endTimeGroup.style.display = "none";
      document.getElementById("item-time").required = false;
    } else {
      timeGroup.style.display = "block";
      document.getElementById("item-time").required = true;
      if (document.getElementById("item-type").value !== "task") {
        endTimeGroup.style.display = "block";
      }
    }
  }

  openItemModal(item = null, type = "event", defaultDate = null) {
    document.getElementById("item-form").reset();
    document.getElementById("item-id").value = "";
    document.getElementById("item-type").value = type;
    document.getElementById("btn-delete-item").style.display = item
      ? "block"
      : "none";

    // Setup Tabs
    document.querySelectorAll(".tab-btn").forEach((t) => {
      t.classList.remove("active");
      if (t.dataset.type === type) t.classList.add("active");
    });

    // Setup Date
    let d = defaultDate || new Date();
    const dateStr = window.CalendarApp
      ? window.CalendarApp.formatDateStr(d)
      : d.toISOString().split("T")[0];
    document.getElementById("item-date").value = dateStr;

    if (item) {
      document.getElementById("item-id").value = item.id;
      document.getElementById("item-title").value = item.title;
      document.getElementById("item-date").value = item.date;

      if (type === "event") {
        document.getElementById("item-allday").checked = item.allday || false;
        if (!item.allday) {
          document.getElementById("item-time").value = item.time || "";
          document.getElementById("item-end-time").value = item.endTime || "";
        }
      } else {
        document.getElementById("item-time").value = item.time || "";
        if (item.recurring)
          document.getElementById("item-recurring").value = item.recurring;
      }
    } else {
      document.getElementById("item-time").value = "12:00";
      document.getElementById("item-allday").checked = false;
    }

    const isTask = type === "task";
    document.getElementById("end-time-group").style.display = isTask
      ? "none"
      : "block";
    document.getElementById("task-extras").style.display = isTask
      ? "block"
      : "none";
    document.getElementById("allday-group").style.display = isTask
      ? "none"
      : "flex";

    this.toggleTimeGroup();
    document.getElementById("event-modal").classList.add("active");
  }

  saveItem() {
    const id = document.getElementById("item-id").value;
    const type = document.getElementById("item-type").value;
    const title = document.getElementById("item-title").value;
    const date = document.getElementById("item-date").value;
    const time = document.getElementById("item-time").value;

    if (type === "event") {
      const allday = document.getElementById("item-allday").checked;
      const endTime = document.getElementById("item-end-time").value;

      const evt = {
        id,
        title,
        date,
        allday,
        time: allday ? null : time,
        endTime: allday ? null : endTime,
      };
      if (id) Store.updateEvent(evt);
      else Store.addEvent(evt);
    } else {
      // Task
      const recurring = document.getElementById("item-recurring").value;
      // check if completion state exists
      let completed = false;
      if (id) {
        const existing = Store.getTasks().find((t) => t.id === id);
        if (existing) completed = existing.completed;
      }

      const tsk = { id, title, date, time: time || null, recurring, completed };
      if (id) Store.updateTask(tsk);
      else Store.addTask(tsk);
    }

    document.getElementById("event-modal").classList.remove("active");
  }

  openAlarmModal(alarm = null) {
    document.getElementById("alarm-form").reset();
    document.getElementById("alarm-id").value = "";
    document.getElementById("btn-delete-alarm").style.display = alarm
      ? "block"
      : "none";

    if (alarm) {
      document.getElementById("alarm-id").value = alarm.id;
      document.getElementById("alarm-time").value = alarm.time;
      document.getElementById("alarm-message").value = alarm.message;
    } else {
      const now = new Date();
      document.getElementById("alarm-time").value =
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    }
    document.getElementById("alarm-modal").classList.add("active");
  }

  saveAlarm() {
    const id = document.getElementById("alarm-id").value;
    const time = document.getElementById("alarm-time").value;
    const message = document.getElementById("alarm-message").value;

    const alarm = { id, time, message, enabled: true };
    if (id) {
      const existing = Store.getAlarms().find((a) => a.id === id);
      if (existing) alarm.enabled = existing.enabled;
      Store.updateAlarm(alarm);
    } else {
      Store.addAlarm(alarm);
    }

    document.getElementById("alarm-modal").classList.remove("active");
  }
}

window.UI = new UIManager();
