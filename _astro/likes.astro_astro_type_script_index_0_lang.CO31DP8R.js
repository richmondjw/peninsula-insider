import{o as c,h as o,q as l}from"./auth.DE0kyD5o.js";async function t(){const e=document.querySelector("[data-likes-list]"),a=document.querySelector("[data-likes-empty]"),n=document.querySelector("[data-likes-anon]");if(!e||!a||!n)return;const s=await o();if(!s){e.hidden=!0,a.hidden=!0,n.hidden=!1;return}n.hidden=!0;const r=await l(s.id);if(!r.length){a.hidden=!1,e.hidden=!0;return}a.hidden=!0,e.hidden=!1,e.innerHTML=r.map(d=>`
      <a class="v2-saved-card" href="/${d.section}/${d.article_slug}/">
        <div class="v2-saved-card__img"></div>
        <div class="v2-saved-card__body">
          <p class="v2-saved-card__eyebrow">${d.section}</p>
          <h3 class="v2-saved-card__title">${d.article_slug.replace(/-/g," ").replace(/\b\w/g,i=>i.toUpperCase())}</h3>
        </div>
      </a>
    `).join("")}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",t):t();document.addEventListener("astro:page-load",t);c(t);
