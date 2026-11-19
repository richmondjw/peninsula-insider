/** Browser-owned recognition only. Never records audio or sends a chat message. */
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean; processLocally?: boolean;
  start(): void; stop(): void; abort(): void;
  onstart: (() => void) | null; onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
};
type RecognitionConstructor = {
  new(): Recognition;
  available?: (options: { langs: string[]; processLocally: boolean }) => Promise<string>;
};

export function setupChatDictation(root: HTMLElement, input: HTMLTextAreaElement | HTMLInputElement, grow: () => void) {
  const button = root.querySelector<HTMLButtonElement>('#ask-mic')!;
  const box = root.querySelector<HTMLElement>('#ask-voice')!;
  const status = root.querySelector<HTMLElement>('#ask-voice-status')!;
  const start = root.querySelector<HTMLButtonElement>('#ask-voice-start')!;
  const cancel = root.querySelector<HTMLButtonElement>('#ask-voice-cancel')!;
  const fallback = 'You can type or use the microphone on your keyboard. On iPhone, try Safari with Siri enabled.';
  const browser = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  const Constructor = browser.SpeechRecognition || browser.webkitSpeechRecognition;
  let recognition: Recognition | null = null;
  let generation = 0;
  let local = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active = false;
  function permitted() {
    const doc = document as Document & { permissionsPolicy?: { allowsFeature(name: string): boolean }; featurePolicy?: { allowsFeature(name: string): boolean } };
    const policy = doc.permissionsPolicy || doc.featurePolicy;
    return location.pathname === '/ask/' && root.isConnected && !document.hidden && policy?.allowsFeature('microphone') !== false;
  }

  function message(text: string) { box.hidden = false; status.textContent = text; }
  function idle() {
    active = false;
    clearTimeout(timer);
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', 'Voice input');
    button.disabled = false;
  }
  function abort(text?: string) {
    generation++;
    const previous = recognition;
    recognition = null;
    if (previous) {
      previous.onstart = previous.onresult = previous.onerror = previous.onend = null;
      try { previous.abort(); } catch { /* already ended */ }
    }
    idle();
    start.hidden = true;
    cancel.textContent = text ? 'Close voice input' : 'Cancel';
    if (text) message(text); else box.hidden = true;
  }
  async function prepare() {
    abort();
    if (!permitted()) {
      message(`Voice input is unavailable on this page or blocked by its permissions. ${fallback}`);
      cancel.focus();
      return;
    }
    if (!Constructor || !window.isSecureContext) {
      message(`Voice input is not available in this browser. ${fallback}`);
      cancel.focus();
      return;
    }
    const token = generation;
    message('Checking voice input availability. No microphone is active.');
    let availableLocally = false;
    try {
      const probe = new Constructor();
      if ('processLocally' in probe && Constructor.available) {
        availableLocally = await Constructor.available({ langs: ['en-AU'], processLocally: true }) === 'available';
      }
    } catch { /* disclose browser processing; do not start recognition */ }
    if (token !== generation) return;
    if (!permitted()) { abort(`Voice input is unavailable on this page. ${fallback}`); return; }
    local = availableLocally;
    message(local
      ? 'Voice input will run on this device. PI does not record or upload audio. Text is added to your draft; review it before sending.'
      : "Your browser may send audio to its speech provider for transcription, under that provider's privacy practices. PI does not record or upload audio. Text is added to your draft; review it before sending.");
    start.textContent = local ? 'Start on-device dictation' : 'Start browser dictation';
    start.hidden = false;
    start.focus();
  }
  function begin() {
    if (!Constructor || active || start.hidden) return;
    if (!permitted()) { abort(`Voice input is unavailable on this page. ${fallback}`); return; }
    start.hidden = true;
    const token = ++generation;
    let heard = false;
    const seen = new Set<number>();
    try {
      const session = new Constructor();
      recognition = session;
      session.lang = 'en-AU';
      session.continuous = false;
      session.interimResults = false;
      if (local) session.processLocally = true;
      active = true;
      button.setAttribute('aria-pressed', 'true');
      button.setAttribute('aria-label', 'Stop voice input');
      cancel.textContent = 'Cancel dictation';
      message('Starting voice input. Allow microphone access if your browser asks.');
      const current = () => token === generation && recognition === session;
      session.onstart = () => {
        if (!current()) return;
        clearTimeout(timer);
        message('Listening. Tap the microphone to stop. Typing stops dictation and keeps your edits.');
        timer = setTimeout(() => abort(`Voice input timed out. Your draft is kept. ${fallback}`), 60000);
      };
      session.onresult = (event) => {
        if (!current()) return;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result.isFinal || seen.has(i)) continue;
          seen.add(i);
          const text = result[0].transcript.trim();
          if (!text) continue;
          heard = true;
          const separator = input.value && !/\s$/.test(input.value) ? ' ' : '';
          const addition = separator + text;
          const room = Math.max(0, input.maxLength - input.value.length);
          input.value += addition.slice(0, room);
          grow();
          if (addition.length > room) {
            abort('Your draft reached the 500-character limit. Review it before sending.');
            return;
          }
        }
      };
      session.onerror = (event) => {
        if (!current()) return;
        const reason = event.error === 'no-speech' ? 'No speech was detected.'
          : local
          ? 'On-device dictation could not finish. No switch to online processing was made.'
          : event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'Microphone or speech recognition access was denied.'
          : 'Voice input could not finish.';
        abort(`${reason} Your draft is kept. ${fallback}`);
      };
      session.onend = () => {
        if (!current()) return;
        recognition = null;
        idle();
        cancel.textContent = 'Close voice input';
        message(heard ? 'Dictation added. Review or edit your question, then choose Ask.' : `No speech was detected. ${fallback}`);
      };
      timer = setTimeout(() => abort(`Voice input did not start. ${fallback}`), 15000);
      session.start();
      button.focus();
    } catch {
      abort(`Voice input could not start. Your draft is kept. ${fallback}`);
    }
  }
  button.addEventListener('click', () => {
    if (!active) { cancel.textContent = 'Cancel'; void prepare(); return; }
    message('Stopping voice input. Waiting for the final words.');
    button.disabled = true;
    clearTimeout(timer);
    timer = setTimeout(() => abort(`Voice input stopped. Your draft is kept. ${fallback}`), 5000);
    try { recognition?.stop(); } catch { abort(`Voice input stopped. ${fallback}`); }
  });
  start.addEventListener('click', begin);
  cancel.addEventListener('click', () => { abort(); button.focus(); });
  input.addEventListener('input', () => { if (active) abort('Dictation stopped so you can edit. Your draft is kept.'); });
  return { cancel: () => abort() };
}
