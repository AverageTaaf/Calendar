class NLP {
  static parseQuickAdd(text) {
    // Super simple parser
    // Expected formats: "Title on YYYY-MM-DD at HH:MM" or "Title tomorrow at HH:MM"
    // This is a naive implementation

    let title = text;
    let dateStr = new Date().toISOString().split("T")[0];
    let timeStr = null;
    let type = "event";

    // Check for time
    const timeMatch = text.match(/at\s+(\d{1,2})(:\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      title = title.replace(timeMatch[0], "").trim();
      let hours = parseInt(timeMatch[1]);
      const mins = timeMatch[2] ? timeMatch[2].substring(1) : "00";
      const meridiem = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

      if (meridiem === "pm" && hours < 12) hours += 12;
      if (meridiem === "am" && hours === 12) hours = 0;

      timeStr = `${String(hours).padStart(2, "0")}:${mins}`;
    }

    // Check for dates
    if (text.toLowerCase().includes("tomorrow")) {
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      dateStr = tmrw.toISOString().split("T")[0];
      title = title.replace(/tomorrow/i, "").trim();
    } else if (text.toLowerCase().includes("today")) {
      title = title.replace(/today/i, "").trim();
    } else {
      const dateMatch = text.match(/on\s+(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        dateStr = dateMatch[1];
        title = title.replace(dateMatch[0], "").trim();
      }
    }

    // Check task
    if (
      text.toLowerCase().startsWith("todo") ||
      text.toLowerCase().startsWith("task")
    ) {
      type = "task";
      title = title.replace(/^(todo|task):?/i, "").trim();
    }

    return {
      type,
      title,
      date: dateStr,
      time: timeStr,
      allday: !timeStr,
    };
  }
}
window.NLP = NLP;
