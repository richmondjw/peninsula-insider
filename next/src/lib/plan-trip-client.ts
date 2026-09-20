import * as store from './v5-store';
import { prepareEditorialPlan, type EditorialPlan } from './editorial-plan-import';

let busy = false;
function snapshot(): store.TripStore { return { version: 1, days: store.tripDays(), entries: store.tripEntries() }; }

function chooseImport(title: string, trigger?: HTMLElement): Promise<'append' | 'replace' | null> {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'plan-import-dialog';
    dialog.setAttribute('aria-labelledby', 'plan-import-title');
    dialog.innerHTML = `<h2 id="plan-import-title">You already have a trip</h2><p data-plan-name></p><p>Add this plan on extra days, or replace the stops and days in your current trip. Your saved places stay saved.</p><form method="dialog"><button class="pi-btn pi-btn--solid" value="append">Add as extra days</button><button class="pi-btn pi-btn--ghost" value="replace">Replace current trip</button><button class="pi-btn pi-btn--text" value="cancel" autofocus>Cancel</button></form>`;
    dialog.querySelector('[data-plan-name]')!.textContent = title;
    Object.assign(dialog.style, { maxWidth: '32rem', width: 'calc(100% - 2rem)', padding: '1.5rem', border: '1px solid var(--c-rule, #ccc)', borderRadius: '8px', background: 'var(--c-paper, #faf7f0)', color: 'var(--text, #222)' });
    Object.assign(dialog.querySelector('form')!.style, { display: 'flex', flexWrap: 'wrap', gap: '.75rem', marginTop: '1rem' });
    const cancelOnNavigation = () => dialog.close('cancel');
    document.addEventListener('astro:before-swap', cancelOnNavigation, { once: true });
    dialog.addEventListener('close', () => {
      const answer = dialog.returnValue;
      document.removeEventListener('astro:before-swap', cancelOnNavigation);
      dialog.remove();
      // Callers re-enable their trigger after awaiting this result.
      requestAnimationFrame(() => { if (trigger?.isConnected) trigger.focus(); });
      resolve(answer === 'append' || answer === 'replace' ? answer : null);
    }, { once: true });
    document.body.append(dialog);
    dialog.showModal();
  });
}

function status(message: string, link = false): void {
  let node = document.querySelector<HTMLElement>('[data-plan-import-status]');
  if (!node) { node = document.createElement('div'); node.dataset.planImportStatus = ''; node.setAttribute('role', 'status'); document.body.append(node); }
  node.replaceChildren(document.createTextNode(message + ' '));
  if (link) { const a = document.createElement('a'); a.href = '/me/trip/'; a.textContent = 'Open My Trip'; node.append(a); }
  const dismiss = document.createElement('button');
  dismiss.type = 'button'; dismiss.textContent = 'Dismiss'; dismiss.className = 'pi-btn pi-btn--text pi-btn--sm';
  dismiss.addEventListener('click', () => node?.remove()); node.append(' ', dismiss);
  Object.assign(node.style, { position: 'fixed', bottom: '5rem', left: '1rem', right: '1rem', maxWidth: '36rem', margin: 'auto', padding: '1rem', background: 'var(--c-paper, #faf7f0)', color: 'var(--text, #222)', border: '1px solid #888', zIndex: '1000' });
}

export async function useEditorialPlan(plan: EditorialPlan, trigger?: HTMLElement): Promise<'added' | 'existing' | 'cancelled' | 'failed'> {
  if (busy) return 'cancelled';
  busy = true;
  try {
    const before = snapshot();
    const appended = prepareEditorialPlan(plan, before, 'append');
    if (!appended) return 'failed';
    if (appended.entries.length === before.entries.length) { status('This plan is already in your trip.', true); return 'existing'; }
    const mode = before.entries.length ? await chooseImport(plan.title, trigger) : 'append';
    if (!mode) return 'cancelled';
    const next = prepareEditorialPlan(plan, before, mode);
    if (!next || !store.tripCommit(next, before)) { status('Your trip could not be updated. It may have changed in another tab, or saving is unavailable. Try again.'); return 'failed'; }
    for (const s of plan.stops) {
      if ((s.kind === 'venue' || s.kind === 'experience') && s.slug && s.href) store.save({ kind: s.kind, slug: s.slug, title: s.title, href: s.href });
    }
    status('Your plan is ready. Adjust stops, share or print it in My Trip.', true);
    return 'added';
  } finally { busy = false; }
}
