type Frame = { key: string; name: string; credit: string; label: string; title: string; description: string; href: string; template?: HTMLTemplateElement };
const hold = 10_000;
const fade = 950;

let mounted: HTMLElement | null;
let unmount: (() => void) | undefined;

export function initHomeCover() {
  const cover = document.querySelector<HTMLElement>('[data-cover-rotation]');
  if (cover === mounted) return;
  unmount?.();
  mounted = cover;
  unmount = undefined;
  if (!cover) return;
  const controls = cover.querySelector<HTMLElement>('.home-cover__controls')!;
  const chooser = controls.querySelector<HTMLElement>('.home-cover__dots')!;
  const dots = [...chooser.querySelectorAll<HTMLButtonElement>('button')];
  const toggle = controls.querySelector<HTMLButtonElement>('.home-cover__playback')!;
  const icon = toggle.querySelector('path')!;
  const announcement = controls.querySelector<HTMLElement>('.home-cover__announcement')!;
  const plate = cover.querySelector<HTMLElement>('figure')!;
  // The plate written into the page is the first cover, whichever that is.
  const base = plate.querySelector<HTMLImageElement>('[data-cover-media]')!;
  const credit = plate.querySelector<HTMLElement>('figcaption')!;
  const story = cover.querySelector<HTMLAnchorElement>('.home-cover__story')!;
  const label = story.querySelector<HTMLElement>('.home-cover__story-label')!;
  const title = story.querySelector('strong')!;
  const description = story.querySelector<HTMLElement>('[data-cover-description]')!;
  const frames: Frame[] = [
    { key: base.dataset.coverMedia!, name: (dots[0]?.getAttribute('aria-label') ?? '').replace(/^Show /, ''), credit: credit.textContent!, label: label.textContent!,
      title: title.textContent!, description: description.textContent!, href: story.getAttribute('href')! },
    ...[...cover.querySelectorAll<HTMLTemplateElement>('template[data-cover-frame]')].map(template => {
      const { coverFrame, name, credit, label, title, description, href } = template.dataset;
      return { key: coverFrame!, name: name!, credit: credit!, label: label!, title: title!, description: description!, href: href!, template };
    }),
  ];
  const controller = new AbortController();
  const { signal } = controller;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let playing = !motion.matches;
  let visible = !('IntersectionObserver' in window);
  let timer = 0;
  let finish = 0;
  let revision = 0;
  let active = 0;
  let requested = 0;
  let layer: HTMLElement | null = null;
  let pending: HTMLElement | null = null;
  let touch: { x: number; y: number } | null = null;

  const stop = () => {
    window.clearTimeout(timer);
    window.clearTimeout(finish);
    pending?.remove();
    pending = null;
    if (layer && layer.dataset.visible === undefined) layer.dataset.visible = '';
  };
  function arm() {
    window.clearTimeout(timer);
    if (playing && visible && !document.hidden) {
      timer = window.setTimeout(() => { void show((active + 1) % frames.length); }, hold);
    }
  }
  function setPlaying(on: boolean) {
    playing = on;
    if (!on) {
      stop();
      ++revision;
      requested = active;
    }
    const text = on ? 'Pause cover rotation' : 'Play cover rotation';
    toggle.title = text;
    toggle.setAttribute('aria-label', text);
    icon.setAttribute('d', on ? 'M6 4v8m4-8v8' : 'M5 3.5v9l7-4.5z');
    arm();
  }
  async function show(index: number, manual = false) {
    if (manual) setPlaying(false);
    stop();
    const id = ++revision;
    requested = index;
    if (index === active) { arm(); return; }
    const frame = frames[index];
    let incoming: HTMLElement | null = null;
    if (frame.template) {
      incoming = frame.template.content.firstElementChild!.cloneNode(true) as HTMLElement;
      const photo = incoming.querySelector('img')!;
      // Decode before replacing anything so a failed or slow asset never
      // blanks the hero, mismatches its caption, or blocks a manual choice.
      plate.insertBefore(incoming, credit);
      pending = incoming;
      try {
        await photo.decode();
      } catch {
        incoming.remove();
        if (id === revision) {
          pending = null;
          requested = active;
          if (manual) announcement.textContent = 'That cover could not load.';
          arm();
        }
        return;
      }
      if (id !== revision || signal.aborted) { incoming.remove(); return; }
      // Force the initial transparent state before making the layer visible.
      void incoming.offsetWidth;
      incoming.dataset.visible = '';
    } else if (layer) {
      delete layer.dataset.visible;
    }
    const settle = () => {
      if (id !== revision || signal.aborted) return;
      layer?.remove();
      layer = incoming;
      pending = null;
      incoming?.removeAttribute('aria-hidden');
      if (incoming) base.setAttribute('aria-hidden', 'true');
      else base.removeAttribute('aria-hidden');
      credit.textContent = frame.credit;
      label.textContent = frame.label;
      title.textContent = frame.title;
      description.textContent = frame.description;
      story.setAttribute('href', frame.href);
      cover.dataset.activeCover = frame.key;
      active = index;
      dots.forEach((button, i) => {
        if (i === index) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
      if (manual) announcement.textContent = 'Showing ' + frame.name;
      arm();
    };
    if (motion.matches) settle();
    else finish = window.setTimeout(settle, fade + 30);
  }

  dots.forEach((dot, i) => dot.addEventListener('click', () => { void show(i, true); }, { signal }));
  chooser.addEventListener('keydown', event => {
    const index = dots.indexOf(document.activeElement as HTMLButtonElement);
    const moves: Record<string, number> = {
      ArrowLeft: (index + dots.length - 1) % dots.length,
      ArrowRight: (index + 1) % dots.length, Home: 0, End: dots.length - 1,
    };
    if (index < 0 || !Object.hasOwn(moves, event.key)) return;
    event.preventDefault();
    const next = moves[event.key];
    dots[next].focus();
    void show(next, true);
  }, { signal });
  toggle.addEventListener('click', () => { setPlaying(!playing); }, { signal });
  cover.addEventListener('focusin', event => {
    if (event.target === toggle && !toggle.matches(':focus-visible')) return;
    setPlaying(false);
  }, { signal });
  cover.addEventListener('touchstart', event => {
    const t = event.touches[0];
    touch = event.touches.length === 1 && !(event.target as Element).closest('button,a') ? { x: t.clientX, y: t.clientY } : null;
  }, { passive: true, signal });
  cover.addEventListener('touchcancel', () => { touch = null; }, { passive: true, signal });
  cover.addEventListener('touchend', event => {
    if (!touch) return;
    const t = event.changedTouches[0];
    const dx = t.clientX - touch.x, dy = t.clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      void show((requested + (dx < 0 ? 1 : frames.length - 1)) % frames.length, true);
    }
  }, { passive: true, signal });
  motion.addEventListener('change', () => { if (motion.matches) setPlaying(false); }, { signal });
  document.addEventListener('visibilitychange', arm);
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    arm();
  }, { threshold: 0.15 }) : null;
  observer?.observe(cover);
  unmount = () => {
    document.removeEventListener('visibilitychange', arm);
    controller.abort();
    observer?.disconnect();
    stop();
    ++revision;
  };
  cover.dataset.activeCover = frames[0].key;
  controls.hidden = false;
  setPlaying(playing);
}
