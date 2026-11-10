let journalCleanup;
document.addEventListener("astro:before-swap", () => journalCleanup?.());
function initJournal() {
  const root = document.querySelector("[data-journal-index]");
  if (!root || root.dataset.bound) return;
  root.dataset.bound = "true";
  const rows = [...root.querySelectorAll(".archive-row")];
  const search = root.querySelector("#story-search");
  const topic = root.querySelector("#topic-filter");
  const month = root.querySelector("#month-filter");
  const more = root.querySelector("#load-more");
  const clear = root.querySelector("#clear-filters");
  const count = root.querySelector("#result-count");
  let limit = 8;
  // Unfiltered, the list skips stories already featured above it (rows
  // marked data-featured); any search, theme or month brings them back.
  function matching() {
    const q = search.value.trim().toLocaleLowerCase();
    const filtering = Boolean(q || topic.value || month.value);
    return rows.filter(
      (r) =>
        (filtering || !r.hasAttribute("data-featured")) &&
        (!q || r.dataset.title.includes(q)) &&
        (!topic.value || JSON.parse(r.dataset.topics).includes(topic.value)) &&
        (!month.value || r.dataset.month === month.value),
    );
  }
  function apply(reset = false, persist = true) {
    if (reset) limit = 8;
    const q = search.value.trim().toLocaleLowerCase();
    const matches = matching();
    const filtering = Boolean(q || topic.value || month.value);
    rows.forEach((r) => (r.hidden = true));
    matches.slice(0, limit).forEach((r) => (r.hidden = false));
    const total = filtering ? matches.length : rows.length;
    count.textContent = `${total} ${total === 1 ? "story" : "stories"}`;
    more.hidden = matches.length <= limit;
    root.querySelector("#empty-state").hidden = matches.length !== 0;
    clear.hidden = !(q || topic.value || month.value);
    if (persist) {
      const u = new URL(location.href);
      for (const [key, value] of [
        ["q", search.value],
        ["theme", topic.value],
        ["month", month.value],
      ]) {
        if (value) u.searchParams.set(key, value);
        else u.searchParams.delete(key);
      }
      history.replaceState(null, "", u);
    }
  }
  function restore() {
    const p = new URLSearchParams(location.search);
    search.value = p.get("q") || "";
    topic.value = p.get("theme") || "";
    month.value = p.get("month") || "";
    apply(true, false);
  }
  search.addEventListener("input", () => apply(true));
  topic.addEventListener("change", () => apply(true));
  month.addEventListener("change", () => apply(true));
  clear.addEventListener("click", () => {
    search.value = "";
    topic.value = "";
    month.value = "";
    apply(true);
    search.focus();
  });
  more.addEventListener("click", () => {
    const firstHidden = matching().find((r) => r.hidden);
    limit += 8;
    apply();
    if (firstHidden) {
      const a = firstHidden.querySelector("a");
      a.focus({ preventScroll: true });
    }
  });
  root.querySelectorAll("[data-theme-link]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      topic.value = a.dataset.themeLink;
      search.value = "";
      month.value = "";
      apply(true);
      root.querySelector("#archive").scrollIntoView({ block: "start" });
    }),
  );
  window.addEventListener("popstate", restore);
  journalCleanup = () => window.removeEventListener("popstate", restore);
  restore();

  root.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = root.querySelector(a.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
      history.replaceState(
        null,
        "",
        location.pathname + location.search + a.getAttribute("href"),
      );
    }
  });
  if (location.hash) {
    requestAnimationFrame(() =>
      document.getElementById(location.hash.slice(1))?.scrollIntoView(),
    );
  }
}
initJournal();
document.addEventListener("astro:page-load", initJournal);
