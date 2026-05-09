import{o as c,h as i,r as o}from"./auth.Cki1utsC.js";async function s(){const a=document.querySelector("[data-saved-list]"),d=document.querySelector("[data-saved-empty]"),t=document.querySelector("[data-saved-anon]");if(!a||!d||!t)return;const n=await i();if(!n){a.hidden=!0,d.hidden=!0,t.hidden=!1;return}t.hidden=!0;const r=await o(n.id);if(!r.length){a.hidden=!0,d.hidden=!1;return}d.hidden=!0,a.hidden=!1,a.innerHTML=r.map(e=>`
      <a class="v2-saved-card" href="/${e.section}/${e.article_slug}/">
        ${e.image_url?`<div class="v2-saved-card__img" style="background-image:url(${e.image_url})"></div>`:""}
        <div class="v2-saved-card__body">
          <p class="v2-saved-card__eyebrow">${e.section}</p>
          <h3 class="v2-saved-card__title">${e.title||e.article_slug}</h3>
          ${e.dek?`<p class="v2-saved-card__dek">${e.dek}</p>`:""}
        </div>
      </a>
    `).join("")}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",s):s();document.addEventListener("astro:page-load",s);c(s);
