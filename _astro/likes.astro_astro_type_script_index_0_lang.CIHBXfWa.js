import{o,e as i,m as l}from"./auth.CnQjLDRU.js";function n(e){return e.replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[s])}function u(e){return e.replace(/-/g," ").replace(/\b\w/g,s=>s.toUpperCase())}function g(e){if(e.length===0)return"";const s=e.map(a=>{const d=a.section??"journal",r=a.article_slug??"",t=a.title||u(r);return`
        <a class="saved-card" href="/${d}/${r}/">
          ${a.image_url?`<div class="saved-card__img" style="background-image: url('${n(a.image_url)}');"></div>`:'<div class="saved-card__img saved-card__img--blank"></div>'}
          <div class="saved-card__body">
            <p class="saved-card__eyebrow">${n(d)}</p>
            <h3 class="saved-card__title">${n(t)}</h3>
            ${a.dek?`<p class="saved-card__dek">${n(a.dek)}</p>`:""}
          </div>
        </a>`}).join("");return`
      <section class="saved-group">
        <header class="saved-group__head">
          <p class="saved-group__eyebrow">Worth reading</p>
          <h2 class="saved-group__title">Articles <span class="saved-group__count">${e.length}</span></h2>
        </header>
        <div class="saved-group__grid">${s}</div>
      </section>`}async function c(){const e=document.querySelector("[data-likes-groups]"),s=document.querySelector("[data-likes-empty]"),a=document.querySelector("[data-likes-anon]"),d=document.querySelector("[data-likes-lead]");if(!e||!s||!a||!d)return;const r=await i();if(!r){e.innerHTML="",s.hidden=!0,a.hidden=!1,d.hidden=!0;return}a.hidden=!0;const t=await l(r.id);if(!t.length){e.innerHTML="",s.hidden=!1,d.hidden=!0;return}s.hidden=!0,d.hidden=!1,e.innerHTML=g(t)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",c):c();document.addEventListener("astro:page-load",c);o(c);
