const Store = {
  _data: {
    events: [],
    tasks: [],
    alarms: [],
    notes: [],
    settings: {
      theme: "dark",
      accentColor: "#6366f1",
      defaultView: "month",
      notificationMinutesBefore: 5,
      alarmVolume: 0.8,
      focusMode: false,
      streakLastVisit: null,
      achievements: [],
      hourlyChime: false,
      timeFormat: "12hr",
    },
  },

  init() {
    const saved = localStorage.getItem("localflow_data");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this._data = { ...this._data, ...parsed };
        // merge settings specifically in case of new default fields
        this._data.settings = {
          ...this._data.settings,
          ...(parsed.settings || {}),
        };
      } catch (e) {
        console.error("Failed to parse localStorage data", e);
      }
    }
    this.save();
  },

  save() {
    localStorage.setItem("localflow_data", JSON.stringify(this._data));
    // Dispatch custom event so UI can react to data changes
    window.dispatchEvent(new Event("store:changed"));
  },

  // Events
  getEvents() {
    return this._data.events;
  },
  addEvent(event) {
    event.id = event.id || crypto.randomUUID();
    this._data.events.push(event);
    this.save();
  },
  updateEvent(event) {
    const index = this._data.events.findIndex((e) => e.id === event.id);
    if (index !== -1) {
      this._data.events[index] = event;
      this.save();
    }
  },
  deleteEvent(id) {
    this._data.events = this._data.events.filter((e) => e.id !== id);
    this.save();
  },

  // Moods
  getMood(dateStr) {
    return this._data.moods ? this._data.moods[dateStr] : null;
  },
  setMood(dateStr, mood) {
    if (!this._data.moods) this._data.moods = {};
    if (this._data.moods[dateStr] === mood) {
      delete this._data.moods[dateStr];
    } else {
      this._data.moods[dateStr] = mood;
    }
    this.save();
  },

  // Tasks
  getTasks() {
    return this._data.tasks;
  },
  addTask(task) {
    task.id = task.id || crypto.randomUUID();
    this._data.tasks.push(task);
    this.save();
  },
  updateTask(task) {
    const index = this._data.tasks.findIndex((t) => t.id === task.id);
    if (index !== -1) {
      this._data.tasks[index] = task;
      this.save();
    }
  },
  deleteTask(id) {
    this._data.tasks = this._data.tasks.filter((t) => t.id !== id);
    this.save();
  },

  // Alarms
  getAlarms() {
    return this._data.alarms;
  },
  addAlarm(alarm) {
    alarm.id = alarm.id || crypto.randomUUID();
    this._data.alarms.push(alarm);
    this.save();
  },
  updateAlarm(alarm) {
    const index = this._data.alarms.findIndex((a) => a.id === alarm.id);
    if (index !== -1) {
      this._data.alarms[index] = alarm;
      this.save();
    }
  },
  deleteAlarm(id) {
    this._data.alarms = this._data.alarms.filter((a) => a.id !== id);
    this.save();
  },

  // Settings
  getSettings() {
    return this._data.settings;
  },
  updateSettings(newSettings) {
    this._data.settings = { ...this._data.settings, ...newSettings };
    this.save();
  },

  // Streaks
  updateStreak() {
    const todayStr = new Date().toDateString();
    const lastVisit = this._data.settings.streakLastVisit;

    if (!lastVisit) {
      this._data.settings.streakCount = 1;
      this._data.settings.streakLastVisit = todayStr;
      this.save();
      return;
    }

    const lastDate = new Date(lastVisit);
    const todayDate = new Date(todayStr);
    const diffTime = Math.abs(todayDate - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      this._data.settings.streakCount += 1;
      this._data.settings.streakLastVisit = todayStr;
      this.save();
    } else if (diffDays > 1) {
      this._data.settings.streakCount = 1; // reset streak
      this._data.settings.streakLastVisit = todayStr;
      this.save();
    }
    // if diffDays === 0, same day visit, do nothing
  },

  // Export & Import
  exportData() {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(this._data));
    const anchor = document.createElement("a");
    anchor.setAttribute("href", dataStr);
    anchor.setAttribute("download", "localflow-backup.json");
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  },
  importData(jsonString, replace = false) {
    try {
      const parsed = JSON.parse(jsonString);
      if (replace) {
        this._data = parsed;
      } else {
        // Merge
        this._data.events = [...this._data.events, ...(parsed.events || [])];
        this._data.tasks = [...this._data.tasks, ...(parsed.tasks || [])];
        this._data.alarms = [...this._data.alarms, ...(parsed.alarms || [])];
        // Keep current settings or merge? Let's just keep current for safety on merge
      }
      this.save();
      return true;
    } catch (e) {
      console.error("Invalid JSON import", e);
      return false;
    }
  },
  clearAll() {
    this._data = {
      events: [],
      tasks: [],
      alarms: [],
      notes: [],
      settings: this._data.settings, // preserve some settings? Or wipe them. Let's reset theme to dark.
    };
    this._data.settings.streakCount = 0;
    this.save();
  },
};

Store.init();
