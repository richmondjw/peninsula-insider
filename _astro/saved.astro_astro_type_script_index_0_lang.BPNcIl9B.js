import{o as g,l as d,c as h,r as m}from"./store.5aagrIxF.js";import{b as _}from"./share-link.Bplfi8Hs.js";import{t as i}from"./analytics.B38B-A80.js";const p={article:{plural:"Articles",eyebrow:"To read"},venue:{plural:"Venues",eyebrow:"To visit"},place:{plural:"Places",eyebrow:"To explore"},event:{plural:"Events",eyebrow:"What's on"},experience:{plural:"Walks & Experiences",eyebrow:"Outdoors"},itinerary:{plural:"Plans",eyebrow:"Weekend plans"},tour:{plural:"Tours",eyebrow:"Guided"},"tour-operator":{plural:"Tour Operators",eyebrow:"Operators"},"tour-package":{plural:"Tour Packages",eyebrow:"Packages"}};function o(e){return e.replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function y(e){return e.replace(/["\\]/g,t=>`\\${t}`)}function f(e){const t=p[e.kind];return`
      <a class="saved-card" href="${o(e.href)}">
        ${e.image_url?`<div class="saved-card__img" style="background-image: url('${y(e.image_url)}');"></div>`:'<div class="saved-card__img saved-card__img--blank"></div>'}
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
      </a>`}function b(e){if(e.length===0)return"";const t=new Map;for(const a of e){const r=t.get(a.kind)??[];r.push(a),t.set(a.kind,r)}return["itinerary","event","venue","experience","place","article","tour-package","tour","tour-operator"].filter(a=>t.has(a)).map(a=>{const r=t.get(a),s=p[a];return`
          <section class="saved-group">
            <header class="saved-group__head">
              <p class="saved-group__eyebrow">${o(s.eyebrow)}</p>
              <h2 class="saved-group__title">${o(s.plural)} <span class="saved-group__count">${r.length}</span></h2>
            </header>
            <div class="saved-group__grid">${r.map(f).join("")}</div>
          </section>`}).join("")}function c(){const e=document.querySelector("[data-saved-groups]"),t=document.querySelector("[data-saved-empty]"),n=document.querySelector("[data-saved-toolbar]"),a=document.querySelector("[data-saved-lead]");if(!e||!t||!n||!a)return;const r=d();if(r.length===0){e.innerHTML="",t.hidden=!1,n.hidden=!0,a.hidden=!0;return}t.hidden=!0,n.hidden=!1,a.hidden=!1,e.innerHTML=b(r)}function k(){document.addEventListener("click",async e=>{const n=e.target?.closest("[data-action]")?.dataset.action;if(n){if(n==="share-plan"){const a=d(),r=_(a),s="My Peninsula plan · Peninsula Insider",v="The places I want to visit on the Mornington Peninsula.";if(typeof navigator.share=="function")try{await navigator.share({title:s,text:v,url:r}),i("pi_plan_share",{item_count:a.length,method:"native"});return}catch{}try{await navigator.clipboard.writeText(r),u("Plan link copied. Send it to anyone."),i("pi_plan_share",{item_count:a.length,method:"copy"})}catch{u("Could not copy link.")}}if(n==="clear-plan"){if(!confirm("Clear every saved item? This can't be undone."))return;const a=d().length;h(),i("pi_plan_clear",{item_count:a})}n==="print-plan"&&(i("pi_plan_print",{item_count:d().length}),window.print())}}),document.addEventListener("click",e=>{const n=e.target?.closest("[data-pi-saved-remove]");if(!n)return;e.preventDefault(),e.stopPropagation();const a=n.dataset.piKind,r=n.dataset.piSlug;!a||!r||m(a,r)})}function u(e){let t=document.querySelector("[data-saved-toast]");t||(t=document.createElement("div"),t.className="saved-toast",t.setAttribute("data-saved-toast",""),t.setAttribute("role","status"),document.body.appendChild(t)),t.textContent=e,t.classList.add("saved-toast--visible"),setTimeout(()=>t?.classList.remove("saved-toast--visible"),2400)}function l(){k(),c(),g(c)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",l):l();document.addEventListener("astro:page-load",l);
