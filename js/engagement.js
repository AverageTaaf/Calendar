window.Engagement = {
  compliments: [
    "You're doing great!",
    "Keep up the awesome work!",
    "You are a productivity machine!",
    "Every step counts!",
    "You're closer to your goals today!",
    "Look at you go!",
    "You've got this!",
    "Small progress is still progress.",
    "You're unstoppable!",
    "Take a deep breath, you're doing fine.",
    "You make it look easy!",
    "Wow, just wow!",
    "Your dedication is inspiring.",
    "You're crushing it!",
    "Don't forget to stay hydrated!",
    "You're a star!",
    "Believe in yourself!",
    "You're making a difference.",
    "Your future self will thank you.",
    "You are enough.",
    "Your potential is limitless.",
    "Why did the scarecrow win an award? Because he was outstanding in his field!",
    "What do you call fake spaghetti? An impasta!",
    "You are capable of amazing things.",
    "You bring so much joy to the world.",
    "Keep shining!",
    "You're stronger than you think.",
    "You're a masterpiece.",
    "Your smile is contagious.",
    "You are appreciated.",
    "I'm so proud of you.",
    "You're doing the best you can, and that's enough.",
    "You're on the right path.",
    "You are loved.",
    "You're a gift to those around you.",
    "You have a great sense of humor.",
    "You are intelligent and capable.",
    "Your hard work will pay off.",
    "You're so creative!",
    "You are resilient.",
    "You are a beautiful person inside and out.",
    "You are unique.",
    "You are important.",
    "You are making progress, even if you can't see it yet.",
    "You are brave.",
    "You are worthy of all good things.",
    "You have a big heart.",
    "You are a good friend.",
    "You are talented.",
    "You are a light in this world.",
    "You are amazing just the way you are.",
  ],

  init() {
    const btnCompliment = document.getElementById("btn-compliment");
    if (btnCompliment) {
      btnCompliment.addEventListener("click", () =>
        this.showRandomCompliment(),
      );
    }

    window.addEventListener("store:changed", () =>
      this.renderWeeklyProductivity(),
    );
    this.renderWeeklyProductivity();
  },

  showRandomCompliment() {
    const idx = Math.floor(Math.random() * this.compliments.length);
    const msg = this.compliments[idx];

    // create a toast
    const toast = document.createElement("div");
    toast.className = "toast-container";
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  getDailyScore(dateStr) {
    const tasks = Store.getTasks().filter((t) => t.date === dateStr);
    if (tasks.length === 0) return null;

    const completed = tasks.filter((t) => t.completed).length;
    return Math.round((completed / tasks.length) * 100);
  },

  renderWeeklyProductivity() {
    const graphEl = document.getElementById("weekly-productivity-graph");
    const avgEl = document.getElementById("weekly-avg-score");
    if (!graphEl) return;

    graphEl.innerHTML = "";
    let totalScore = 0;
    let daysWithTasks = 0;

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      const dateStr = window.CalendarApp
        ? window.CalendarApp.formatDateStr(currentDay)
        : currentDay.toISOString().split("T")[0];

      const score = this.getDailyScore(dateStr);

      const barContainer = document.createElement("div");
      barContainer.style.flex = "1";
      barContainer.style.height = "100%";
      barContainer.style.background = "var(--bg-main)";
      barContainer.style.borderRadius = "var(--radius-sm)";
      barContainer.style.position = "relative";
      barContainer.style.overflow = "hidden";

      if (score !== null) {
        totalScore += score;
        daysWithTasks++;

        const fill = document.createElement("div");
        fill.style.position = "absolute";
        fill.style.bottom = "0";
        fill.style.left = "0";
        fill.style.right = "0";
        fill.style.height = `${score}%`;
        fill.style.background = "var(--accent)";
        fill.style.opacity = score === 100 ? "1" : "0.7";
        fill.title = `${dateStr}: ${score}%`;
        barContainer.appendChild(fill);
      } else {
        barContainer.title = `${dateStr}: No tasks`;
      }

      graphEl.appendChild(barContainer);
    }

    const avg = daysWithTasks > 0 ? Math.round(totalScore / daysWithTasks) : 0;
    if (avgEl) avgEl.textContent = avg;
  },
};

window.addEventListener("DOMContentLoaded", () => {
  if (window.Engagement) window.Engagement.init();
});
