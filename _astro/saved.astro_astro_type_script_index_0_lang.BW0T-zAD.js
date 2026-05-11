import{o as p,l as c,c as v,r as g}from"./store.5aagrIxF.js";import{b as y}from"./share-link.Bplfi8Hs.js";const u={article:{plural:"Articles",eyebrow:"To read"},venue:{plural:"Venues",eyebrow:"To visit"},place:{plural:"Places",eyebrow:"To explore"},event:{plural:"Events",eyebrow:"What's on"},experience:{plural:"Walks & Experiences",eyebrow:"Outdoors"},itinerary:{plural:"Plans",eyebrow:"Weekend plans"},tour:{plural:"Tours",eyebrow:"Guided"},"tour-operator":{plural:"Tour Operators",eyebrow:"Operators"},"tour-package":{plural:"Tour Packages",eyebrow:"Packages"}};function o(e){return e.replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function h(e){return e.replace(/["\\]/g,t=>`\\${t}`)}function f(e){const t=u[e.kind];return`
      <a class="saved-card" href="${o(e.href)}">
        ${e.image_url?`<div class="saved-card__img" style="background-image: url('${h(e.image_url)}');"></div>`:'<div class="saved-card__img saved-card__img--blank"></div>'}
        <div class="saved-card__body">
          <p class="saved-card__eyebrow">${o(t.plural)}</p>
          <h3 class="saved-card__title">${o(e.title)}</h3>
          ${e.dek?`<p class="saved-card__dek">${o(e.dek)}</p>`:""}
        </div>
        <button type="button" class="saved-card__remove" data-pi-saved-remove data-pi-kind="${e.kind}" data-pi-slug="${o(e.slug)}" aria-label="Remove ${o(e.title)} from your saves">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </a>`}function b(e){if(e.length===0)return"";const t=new Map;for(const a of e){const n=t.get(a.kind)??[];n.push(a),t.set(a.kind,n)}return["itinerary","event","venue","experience","place","article","tour-package","tour","tour-operator"].filter(a=>t.has(a)).map(a=>{const n=t.get(a),s=u[a];return`
          <section class="saved-group">
            <header class="saved-group__head">
              <p class="saved-group__eyebrow">${o(s.eyebrow)}</p>
              <h2 class="saved-group__title">${o(s.plural)} <span class="saved-group__count">${n.length}</span></h2>
            </header>
            <div class="saved-group__grid">${n.map(f).join("")}</div>
          </section>`}).join("")}function i(){const e=document.querySelector("[data-saved-groups]"),t=document.querySelector("[data-saved-empty]"),r=document.querySelector("[data-saved-toolbar]"),a=document.querySelector("[data-saved-lead]");if(!e||!t||!r||!a)return;const n=c();if(n.length===0){e.innerHTML="",t.hidden=!1,r.hidden=!0,a.hidden=!0;return}t.hidden=!0,r.hidden=!1,a.hidden=!1,e.innerHTML=b(n)}function m(){document.addEventListener("click",async e=>{const r=e.target?.closest("[data-action]")?.dataset.action;if(r){if(r==="share-plan"){const a=y(c()),n="My Peninsula plan · Peninsula Insider",s="The places I want to visit on the Mornington Peninsula.";if(typeof navigator.share=="function")try{await navigator.share({title:n,text:s,url:a});return}catch{}try{await navigator.clipboard.writeText(a),l("Plan link copied. Send it to anyone.")}catch{l("Could not copy link.")}}if(r==="clear-plan"){if(!confirm("Clear every saved item? This can't be undone."))return;v()}r==="print-plan"&&window.print()}}),document.addEventListener("click",e=>{const r=e.target?.closest("[data-pi-saved-remove]");if(!r)return;e.preventDefault(),e.stopPropagation();const a=r.dataset.piKind,n=r.dataset.piSlug;!a||!n||g(a,n)})}function l(e){let t=document.querySelector("[data-saved-toast]");t||(t=document.createElement("div"),t.className="saved-toast",t.setAttribute("data-saved-toast",""),t.setAttribute("role","status"),document.body.appendChild(t)),t.textContent=e,t.classList.add("saved-toast--visible"),setTimeout(()=>t?.classList.remove("saved-toast--visible"),2400)}function d(){m(),i(),p(i)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",d):d();document.addEventListener("astro:page-load",d);
