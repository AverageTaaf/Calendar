class Calendar {
  constructor() {
    this.currentDate = new Date();
    this.currentView = Store.getSettings().defaultView || "month";
    this.container = document.getElementById("calendar-container");
    this.titleElement = document.getElementById("current-view-title");

    this.init();
  }

  init() {
    window.addEventListener("store:changed", () => this.render());
    this.render();
  }

  setView(view) {
    this.currentView = view;
    Store.updateSettings({ defaultView: view });
    this.render();
  }

  navigate(direction) {
    if (this.currentView === "month") {
      this.currentDate.setMonth(this.currentDate.getMonth() + direction);
    } else if (this.currentView === "week") {
      this.currentDate.setDate(this.currentDate.getDate() + direction * 7);
    } else if (this.currentView === "day" || this.currentView === "agenda") {
      this.currentDate.setDate(this.currentDate.getDate() + direction);
    }
    this.render();
  }

  goToday() {
    this.currentDate = new Date();
    this.render();
  }

  render() {
    this.container.innerHTML = "";

    switch (this.currentView) {
      case "month":
        this.renderMonthView();
        break;
      case "week":
        this.renderWeekView();
        break;
      case "day":
        this.renderDayView();
        break;
      case "agenda":
        this.renderAgendaView();
        break;
    }
  }

  renderMonthView() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // Update Title
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    this.titleElement.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const grid = document.createElement("div");
    grid.className = "month-grid";

    // Weekdays header
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    weekdays.forEach((day) => {
      const el = document.createElement("div");
      el.className = "weekday-header";
      el.textContent = day;
      grid.appendChild(el);
    });

    const today = new Date();
    const events = Store.getEvents();
    const tasks = Store.getTasks();

    let dateCount = 1;
    let nextMonthDateCount = 1;

    // 6 rows to cover all possibilities
    for (let i = 0; i < 42; i++) {
      const cell = document.createElement("div");
      cell.className = "month-cell";

      let cellDate;

      if (i < firstDay) {
        // Previous month
        cell.classList.add("other-month");
        const d = prevMonthDays - firstDay + i + 1;
        cellDate = new Date(year, month - 1, d);
      } else if (dateCount > daysInMonth) {
        // Next month
        cell.classList.add("other-month");
        cellDate = new Date(year, month + 1, nextMonthDateCount);
        nextMonthDateCount++;
      } else {
        // Current month
        if (
          dateCount === today.getDate() &&
          month === today.getMonth() &&
          year === today.getFullYear()
        ) {
          cell.classList.add("today");
        }
        cellDate = new Date(year, month, dateCount);
        dateCount++;
      }

      const dateStr = this.formatDateStr(cellDate);
      const mood = Store.getMood(dateStr);
      const score = window.Engagement
        ? Engagement.getDailyScore(dateStr)
        : null;

      const scoreHtml =
        score !== null
          ? `<div class="daily-score" title="Productivity Score">${score}%</div>`
          : "";
      const moodHtml = mood ? `<div class="daily-mood">${mood}</div>` : "";

      let bgTint = "";
      if (mood === "😊")
        bgTint = "rgba(34, 197, 94, 0.15)"; // green
      else if (mood === "😐")
        bgTint = "rgba(234, 179, 8, 0.15)"; // yellow
      else if (mood === "😢")
        bgTint = "rgba(239, 68, 68, 0.15)"; // red
      else if (mood === "🔥") bgTint = "rgba(168, 85, 247, 0.15)"; // purple
      if (bgTint) cell.style.backgroundColor = bgTint;

      cell.innerHTML = `
                <div class="cell-header">
                    ${scoreHtml}
                    ${moodHtml}
                    <div class="date-num">${cellDate.getDate()}</div>
                    <div class="mood-selector">
                        <span data-mood="😊">😊</span>
                        <span data-mood="😐">😐</span>
                        <span data-mood="😢">😢</span>
                        <span data-mood="🔥">🔥</span>
                    </div>
                </div>
                <div class="cell-events"></div>
            `;

      const cellEventsContainer = cell.querySelector(".cell-events");

      // Add click listener for quick add
      cell.addEventListener("click", (e) => {
        if (
          e.target.closest(".mood-selector") ||
          e.target.classList.contains("daily-score")
        ) {
          if (e.target.dataset.mood) {
            Store.setMood(dateStr, e.target.dataset.mood);
          }
          return;
        }
        if (
          e.target === cell ||
          e.target.classList.contains("cell-events") ||
          e.target.classList.contains("date-num") ||
          e.target.classList.contains("cell-header")
        ) {
          if (window.UI) UI.openItemModal(null, "event", cellDate);
        }
      });

      // Populate Events & Tasks for this cell
      this.populateCellItems(cellDate, cellEventsContainer, events, tasks);

      grid.appendChild(cell);
    }

    this.container.appendChild(grid);
  }

  populateCellItems(cellDate, container, events, tasks) {
    const dateStr = this.formatDateStr(cellDate);

    // Filter events
    const dayEvents = events.filter(
      (e) => e.date === dateStr || (e.start && e.start.startsWith(dateStr)),
    );
    dayEvents.forEach((evt) => {
      const el = document.createElement("div");
      el.className = "event-pill";
      el.textContent = evt.time
        ? `${this.formatTimeString(evt.time)} ${evt.title}`
        : evt.title;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (window.UI) UI.openItemModal(evt, "event");
      });
      container.appendChild(el);
    });

    // Filter tasks (due date matches, or recurring matches)
    // Ignoring recurring logic here for simplicity, focusing on exact date match
    const dayTasks = tasks.filter((t) => t.date === dateStr);
    dayTasks.forEach((tsk) => {
      const el = document.createElement("div");
      el.className = `event-pill task-pill ${tsk.completed ? "completed" : ""}`;
      el.innerHTML = `<i class="ph ${tsk.completed ? "ph-check-circle" : "ph-circle"}"></i> ${tsk.title}`;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (window.UI) UI.openItemModal(tsk, "task");
      });
      container.appendChild(el);
    });
  }

  renderWeekView() {
    const startOfWeek = new Date(this.currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // Adjust to Sunday
    startOfWeek.setDate(diff);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    this.titleElement.textContent = `${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getDate()} - ${monthNames[endOfWeek.getMonth()]} ${endOfWeek.getDate()}`;

    const grid = document.createElement("div");
    grid.className = "week-grid";

    const timeLabels = document.createElement("div");
    timeLabels.className = "week-time-labels";
    // Add header spacer
    const headerSpacer = document.createElement("div");
    headerSpacer.className = "week-day-header";
    timeLabels.appendChild(headerSpacer);

    const timeLabelsBody = document.createElement("div");
    timeLabelsBody.className = "week-day-body";

    const use24hr = Store.getSettings().timeFormat === "24hr";
    for (let i = 0; i < 24; i++) {
      const label = document.createElement("div");
      label.className = "week-time-label";
      label.style.top = `${i * 60}px`;

      let timeText = `${i.toString().padStart(2, "0")}:00`;
      if (!use24hr) {
        const ampm = i >= 12 ? "PM" : "AM";
        const h12 = i % 12 || 12;
        timeText = `${h12} ${ampm}`;
      }
      label.textContent = timeText;
      timeLabelsBody.appendChild(label);
    }
    timeLabels.appendChild(timeLabelsBody);
    grid.appendChild(timeLabels);

    const events = Store.getEvents();
    const todayStr = this.formatDateStr(new Date());

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      const fDate = this.formatDateStr(currentDay);

      const col = document.createElement("div");
      col.className = "week-day-col";

      const header = document.createElement("div");
      header.className = "week-day-header";
      if (fDate === todayStr) header.classList.add("today");

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      header.innerHTML = `<div class="day-name">${dayNames[i]}</div><div class="day-num">${currentDay.getDate()}</div>`;
      col.appendChild(header);

      const body = document.createElement("div");
      body.className = "week-day-body";

      for (let j = 0; j < 24; j++) {
        const line = document.createElement("div");
        line.className = "week-grid-line";
        line.style.top = `${j * 60}px`;
        body.appendChild(line);
      }

      const dayEvents = events.filter((e) => e.date === fDate);
      dayEvents.forEach((evt) => {
        if (!evt.time) return;

        const [hours, mins] = evt.time.split(":").map(Number);
        const top = hours * 60 + mins;
        let height = 60;

        if (evt.endTime) {
          const [eh, em] = evt.endTime.split(":").map(Number);
          height = eh * 60 + em - top;
          if (height < 20) height = 20;
        }

        const block = document.createElement("div");
        block.style.position = "absolute";
        block.style.top = `${top}px`;
        block.style.left = "4px";
        block.style.right = "4px";
        block.style.height = `${height}px`;
        block.style.background = "rgba(99, 102, 241, 0.2)";
        block.style.borderLeft = "3px solid var(--accent)";
        block.style.borderRadius = "var(--radius-sm)";
        block.style.padding = "0.25rem";
        block.style.color = "var(--text-main)";
        block.style.fontSize = "0.75rem";
        block.style.cursor = "pointer";
        block.style.overflow = "hidden";
        block.textContent = evt.title;

        block.addEventListener("click", () => {
          if (window.UI) UI.openItemModal(evt, "event");
        });

        body.appendChild(block);
      });
      col.appendChild(body);
      grid.appendChild(col);
    }

    this.container.appendChild(grid);
  }

  renderDayView() {
    const dateStr = this.currentDate.toDateString();
    this.titleElement.textContent = dateStr;

    const timeline = document.createElement("div");
    timeline.style.position = "relative";
    timeline.style.height = "1440px"; // 60px per hour * 24
    timeline.style.background = "var(--bg-surface)";
    timeline.style.borderRadius = "var(--radius-lg)";
    timeline.style.border = "1px solid var(--border-color)";

    // Render 24 hour lines
    const use24hr = Store.getSettings().timeFormat === "24hr";
    for (let i = 0; i < 24; i++) {
      const hourLine = document.createElement("div");
      hourLine.style.position = "absolute";
      hourLine.style.top = `${i * 60}px`;
      hourLine.style.left = "0";
      hourLine.style.right = "0";
      hourLine.style.height = "1px";
      hourLine.style.background = "var(--border-color)";

      let timeText = `${i.toString().padStart(2, "0")}:00`;
      if (!use24hr) {
        const ampm = i >= 12 ? "PM" : "AM";
        const h12 = i % 12 || 12;
        timeText = `${h12}:00 ${ampm}`;
      }

      const hourLabel = document.createElement("div");
      hourLabel.textContent = timeText;
      hourLabel.style.position = "absolute";
      hourLabel.style.top = "-10px";
      hourLabel.style.left = "10px";
      hourLabel.style.fontSize = "0.75rem";
      hourLabel.style.color = "var(--text-muted)";

      hourLine.appendChild(hourLabel);
      timeline.appendChild(hourLine);
    }

    // Render Events as blocks
    const events = Store.getEvents();
    const fDate = this.formatDateStr(this.currentDate);
    const dayEvents = events.filter((e) => e.date === fDate);

    dayEvents.forEach((evt) => {
      if (!evt.time) return; // Skip all day for timeline body

      const [hours, mins] = evt.time.split(":").map(Number);
      const top = hours * 60 + mins;
      let height = 60; // default 1 hour

      if (evt.endTime) {
        const [eh, em] = evt.endTime.split(":").map(Number);
        height = eh * 60 + em - top;
        if (height < 20) height = 20; // min height
      }

      const block = document.createElement("div");
      block.style.position = "absolute";
      block.style.top = `${top}px`;
      block.style.left = "60px";
      block.style.right = "20px";
      block.style.height = `${height}px`;
      block.style.background = "rgba(99, 102, 241, 0.2)";
      block.style.borderLeft = "4px solid var(--accent)";
      block.style.borderRadius = "var(--radius-sm)";
      block.style.padding = "0.5rem";
      block.style.color = "var(--text-main)";
      block.style.fontSize = "0.875rem";
      block.style.cursor = "pointer";
      block.style.overflow = "hidden";
      block.textContent = evt.title;

      block.addEventListener("click", () => {
        if (window.UI) UI.openItemModal(evt, "event");
      });

      timeline.appendChild(block);
    });

    this.container.appendChild(timeline);
  }

  renderAgendaView() {
    this.titleElement.textContent = "Agenda";

    const list = document.createElement("div");
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "1rem";

    const events = Store.getEvents();
    const tasks = Store.getTasks();
    const now = new Date();
    const todayStr = this.formatDateStr(now);

    const allItems = [
      ...events.map((e) => ({ ...e, type: "event" })),
      ...tasks.map((t) => ({ ...t, type: "task" })),
    ]
      .filter((i) => i.date && i.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (allItems.length === 0) {
      list.innerHTML =
        '<div style="text-align:center; padding: 2rem; color: var(--text-muted);">No upcoming items.</div>';
    } else {
      let lastDateStr = null;

      allItems.forEach((item) => {
        if (item.date !== lastDateStr) {
          const header = document.createElement("h3");
          header.textContent = item.date;
          header.style.color = "var(--accent)";
          header.style.marginTop = "1rem";
          header.style.borderBottom = "1px solid var(--border-color)";
          header.style.paddingBottom = "0.5rem";
          list.appendChild(header);
          lastDateStr = item.date;
        }

        const card = document.createElement("div");
        card.style.background = "var(--bg-surface)";
        card.style.padding = "1rem";
        card.style.borderRadius = "var(--radius-md)";
        card.style.display = "flex";
        card.style.justifyContent = "space-between";
        card.style.alignItems = "center";
        card.style.cursor = "pointer";

        const left = document.createElement("div");
        left.innerHTML = `<strong>${item.title}</strong><br><small style="color:var(--text-muted)">${item.time ? this.formatTimeString(item.time) : "All day"}</small>`;

        const typeIcon = document.createElement("i");
        typeIcon.className =
          item.type === "event"
            ? "ph ph-calendar"
            : item.completed
              ? "ph ph-check-square"
              : "ph ph-square";
        typeIcon.style.fontSize = "1.5rem";
        typeIcon.style.color =
          item.type === "event" ? "var(--accent)" : "var(--success)";

        card.appendChild(left);
        card.appendChild(typeIcon);

        card.addEventListener("click", () => {
          if (window.UI) UI.openItemModal(item, item.type);
        });

        list.appendChild(card);
      });
    }

    this.container.appendChild(list);
  }

  formatDateStr(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${d}`;
  }

  formatTimeString(timeStr) {
    if (!timeStr) return "";
    const use24hr = Store.getSettings().timeFormat === "24hr";
    if (use24hr) return timeStr;
    const [h, m] = timeStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  }
}

// Instantiate
window.CalendarApp = new Calendar();
