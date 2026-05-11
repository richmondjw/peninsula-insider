import{m}from"./store.5aagrIxF.js";import{d as v}from"./share-link.Bplfi8Hs.js";import{t as g}from"./analytics.B38B-A80.js";const p={article:{plural:"Articles",eyebrow:"To read"},venue:{plural:"Venues",eyebrow:"To visit"},place:{plural:"Places",eyebrow:"To explore"},event:{plural:"Events",eyebrow:"What's on"},experience:{plural:"Walks & Experiences",eyebrow:"Outdoors"},itinerary:{plural:"Plans",eyebrow:"Weekend plans"},tour:{plural:"Tours",eyebrow:"Guided"},"tour-operator":{plural:"Tour Operators",eyebrow:"Operators"},"tour-package":{plural:"Tour Packages",eyebrow:"Packages"}};function o(a){return a.replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}function _(a){return a.replace(/["\\]/g,e=>`\\${e}`)}function f(a){const e=p[a.kind];return`
      <a class="saved-card" href="${o(a.href)}">
        ${a.image_url?`<div class="saved-card__img" style="background-image: url('${_(a.image_url)}');"></div>`:'<div class="saved-card__img saved-card__img--blank"></div>'}
        <div class="saved-card__body">
          <p class="saved-card__eyebrow">${o(e.plural)}</p>
          <h3 class="saved-card__title">${o(a.title)}</h3>
          ${a.dek?`<p class="saved-card__dek">${o(a.dek)}</p>`:""}
        </div>
      </a>`}function y(a){if(a.length===0)return"";const e=new Map;for(const t of a){const r=e.get(t.kind)??[];r.push(t),e.set(t.kind,r)}return["itinerary","event","venue","experience","place","article","tour-package","tour","tour-operator"].filter(t=>e.has(t)).map(t=>{const r=e.get(t),d=p[t];return`
          <section class="saved-group">
            <header class="saved-group__head">
              <p class="saved-group__eyebrow">${o(d.eyebrow)}</p>
              <h2 class="saved-group__title">${o(d.plural)} <span class="saved-group__count">${r.length}</span></h2>
            </header>
            <div class="saved-group__grid">${r.map(f).join("")}</div>
          </section>`}).join("")}function u(a){let e=document.querySelector("[data-saved-toast]");e||(e=document.createElement("div"),e.className="saved-toast",e.setAttribute("data-saved-toast",""),e.setAttribute("role","status"),document.body.appendChild(e)),e.textContent=a,e.classList.add("saved-toast--visible"),setTimeout(()=>e?.classList.remove("saved-toast--visible"),2400)}function c(){const e=new URLSearchParams(location.search).get("p"),n=v(e),t=document.querySelector("[data-plan-groups]"),r=document.querySelector("[data-plan-empty]"),d=document.querySelector("[data-plan-toolbar]");if(!n||n.items.length===0){r&&(r.hidden=!1),d&&(d.hidden=!0);return}t&&(t.innerHTML=y(n.items)),document.querySelector('[data-action="fork-plan"]')?.addEventListener("click",()=>{const i=n.items.map(s=>({kind:s.kind,slug:s.slug,section:s.section,title:s.title,dek:s.dek,image_url:s.image_url,href:s.href,savedAt:Date.now()})),l=m(i);g("pi_plan_fork",{source:"shared",items_added:l,items_total:i.length}),l>0?u(`Saved ${l} ${l===1?"item":"items"} to your plan.`):u("All of these are already in your plan.")})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",c):c();document.addEventListener("astro:page-load",c);
