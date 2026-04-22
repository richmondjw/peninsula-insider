import { c as createComponent } from './astro-component_DWnrvw-z.mjs';
import 'piccolore';
import { m as maybeRenderHead, b as addAttribute, a as renderTemplate } from './prerender_DgZBHBwL.mjs';
import 'clsx';

const $$SubscribeForm = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$SubscribeForm;
  const { variant = "dark", source = "footer" } = Astro2.props;
  const ENDPOINT = "https://tjjhpvslpysfklwpqmgz.supabase.co/functions/v1/pi-newsletter-subscribe";
  return renderTemplate`${maybeRenderHead()}<form${addAttribute(["newsletter__form", variant === "light" && "newsletter__form--standalone"], "class:list")} novalidate${addAttribute(source, "data-source")}${addAttribute(ENDPOINT, "data-endpoint")}> <div class="newsletter__field"> <input class="newsletter__input" type="email" name="email" placeholder="your@email.com" autocomplete="email" aria-label="Email address" required> <button class="newsletter__submit" type="submit"> <span class="newsletter__submit-label">Subscribe</span> </button> </div> <p class="newsletter__status" aria-live="polite" aria-atomic="true"></p> <p class="newsletter__disclaimer">
No spam. Unsubscribe any time. <a href="/privacy">Privacy&nbsp;policy</a>.
</p> </form>`;
}, "/home/node/.openclaw/workspace/peninsula-insider/next/src/components/SubscribeForm.astro", void 0);

export { $$SubscribeForm as $ };
