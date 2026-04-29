class AlarmSystem {
  constructor() {
    this.clockTimeEl = document.getElementById("clock-time-display");
    this.clockDateEl = document.getElementById("clock-date-display");
    this.alarmAudio = document.getElementById("alarm-audio");

    // Ensure audio source
    if (this.alarmAudio && !this.alarmAudio.src) {
      // base64 simple beep
      this.alarmAudio.src =
        "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; // placeholder, use Web Audio API instead
    }

    this.notifiedEvents = new Set();
    this.triggeredAlarms = new Set();
    this.lastHourlyChime = null;

    this.init();
  }

  init() {
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    setInterval(() => this.tick(), 1000);
    this.tick(); // initial call
  }

  tick() {
    const now = new Date();

    // Update Clock UI
    const use24hr = Store.getSettings().timeFormat === "24hr";
    if (this.clockTimeEl) {
      this.clockTimeEl.textContent = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: !use24hr,
      });
    }
    if (this.clockDateEl) {
      this.clockDateEl.textContent = now.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    const currentTimeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;

    // 1. Check Alarms
    const alarms = Store.getAlarms();
    alarms.forEach((alarm) => {
      if (
        alarm.enabled &&
        alarm.time === currentTimeStr &&
        currentSecond === 0
      ) {
        if (!this.triggeredAlarms.has(alarm.id)) {
          this.triggerAlarm(alarm);
          this.triggeredAlarms.add(alarm.id);
        }
      } else if (alarm.time !== currentTimeStr) {
        // reset so it can trigger tomorrow
        this.triggeredAlarms.delete(alarm.id);
      }
    });

    // 2. Check Upcoming Events for Notifications
    const settings = Store.getSettings();
    const minsBefore = settings.notificationMinutesBefore || 5;

    const events = Store.getEvents();
    const todayStr = window.CalendarApp
      ? window.CalendarApp.formatDateStr(now)
      : now.toISOString().split("T")[0];

    events.forEach((evt) => {
      if (evt.date === todayStr && evt.time) {
        const [eh, em] = evt.time.split(":").map(Number);
        const eventTime = new Date(now);
        eventTime.setHours(eh, em, 0, 0);

        const diffMs = eventTime - now;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins === minsBefore && currentSecond === 0) {
          const notifyId = `evt-${evt.id}-${todayStr}`;
          if (!this.notifiedEvents.has(notifyId)) {
            this.showNotification(
              "Upcoming Event",
              `${evt.title} starts in ${minsBefore} minutes.`,
            );
            this.notifiedEvents.add(notifyId);
          }
        }
      }
    });

    // 3. Hourly Chime
    if (settings.hourlyChime && currentMinute === 0 && currentSecond === 0) {
      if (currentHour >= 9 && currentHour <= 21) {
        if (this.lastHourlyChime !== currentHour) {
          this.playBeep();
          this.lastHourlyChime = currentHour;
        }
      }
    }
  }

  playBeep() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [
      { f: 880, d: 0.1, t: 0 },
      { f: 1760, d: 0.2, t: 0.15 },
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = note.f;

      const startTime = ctx.currentTime + note.t;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.05, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.d);

      osc.start(startTime);
      osc.stop(startTime + note.d);
    });
  }

  playAlarmTune() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Engaging, upbeat melody for alarm
    const pattern = [
      { f: 523.25, d: 0.15, t: 0.0 }, // C5
      { f: 659.25, d: 0.15, t: 0.2 }, // E5
      { f: 783.99, d: 0.15, t: 0.4 }, // G5
      { f: 1046.5, d: 0.3, t: 0.6 }, // C6
      { f: 783.99, d: 0.15, t: 1.0 }, // G5
      { f: 1046.5, d: 0.4, t: 1.2 }, // C6
    ];

    let sequence = [];
    for (let i = 0; i < 4; i++) {
      pattern.forEach((n) => {
        sequence.push({ f: n.f, d: n.d, t: n.t + i * 1.8 });
      });
    }

    sequence.forEach((note) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.type = "sine";
      osc2.type = "triangle"; // Add some harmonic richness

      osc1.frequency.value = note.f;
      osc2.frequency.value = note.f * 1.01; // Slight detune for chorus effect

      const startTime = ctx.currentTime + note.t;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.d + 0.1);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + note.d + 0.2);
      osc2.stop(startTime + note.d + 0.2);
    });
  }

  triggerAlarm(alarm) {
    this.showNotification("Alarm", alarm.message || "Time's up!");
    this.playAlarmTune();

    // Show Modal
    const modal = document.getElementById("alarm-trigger-modal");
    const timeEl = document.getElementById("trigger-time");
    const msgEl = document.getElementById("trigger-message");
    const dismissBtn = document.getElementById("btn-dismiss");
    const snoozeBtn = document.getElementById("btn-snooze");

    if (modal && timeEl && msgEl) {
      timeEl.textContent = alarm.time;
      msgEl.textContent = alarm.message || "Alarm";
      modal.classList.add("active");

      const dismissHandler = () => {
        modal.classList.remove("active");
        dismissBtn.removeEventListener("click", dismissHandler);
      };

      const snoozeHandler = () => {
        // create a temporary snoozed alarm
        const [h, m] = alarm.time.split(":").map(Number);
        let newM = m + 5;
        let newH = h;
        if (newM >= 60) {
          newM -= 60;
          newH = (newH + 1) % 24;
        }
        const snoozedTime = `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;

        Store.addAlarm({
          time: snoozedTime,
          message: `Snoozed: ${alarm.message}`,
          enabled: true,
          snoozedFrom: alarm.id,
        });

        modal.classList.remove("active");
        snoozeBtn.removeEventListener("click", snoozeHandler);
      };

      dismissBtn.addEventListener("click", dismissHandler);
      snoozeBtn.addEventListener("click", snoozeHandler);
    }
  }

  showNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.showNotification(title, {
            body: body,
            icon: "assets/icon.svg",
            vibrate: [200, 100, 200],
          });
        })
        .catch(() => {
          // Fallback if no SW
          new Notification(title, { body });
        });
    }
  }
}

window.AlarmApp = new AlarmSystem();
