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
  function apply(reset = false, persist = true) {
    if (reset) limit = 8;
    const q = search.value.trim().toLocaleLowerCase();
    const matches = rows.filter(
      (r) =>
        (!q || r.dataset.title.includes(q)) &&
        (!topic.value || JSON.parse(r.dataset.topics).includes(topic.value)) &&
        (!month.value || r.dataset.month === month.value),
    );
    rows.forEach((r) => (r.hidden = true));
    matches.slice(0, limit).forEach((r) => (r.hidden = false));
    count.textContent = `${matches.length} ${matches.length === 1 ? "story" : "stories"}${matches.length > limit ? ` · showing ${limit}` : ""}`;
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
    const firstHidden = rows.find(
      (r) =>
        r.hidden &&
        (!search.value ||
          r.dataset.title.includes(search.value.trim().toLowerCase())) &&
        (!topic.value || JSON.parse(r.dataset.topics).includes(topic.value)) &&
        (!month.value || r.dataset.month === month.value),
    );
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
