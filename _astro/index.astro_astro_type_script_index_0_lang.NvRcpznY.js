import{g as d}from"./auth.CnQjLDRU.js";function u(e){if(e.published)return"published";const a=Date.now(),t=e.voting_opens_at?new Date(e.voting_opens_at).getTime():null,n=e.voting_closes_at?new Date(e.voting_closes_at).getTime():null;return t&&a<t?"before":n&&a>=n?"closed":t&&a>=t?"open":"before"}async function c(){const e=document.querySelector("[data-awards-status]"),a=d();if(!a){e&&(e.textContent="");return}try{const{data:t,error:n}=await a.from("award_categories").select("slug, year, title, description, voting_opens_at, voting_closes_at, published").order("sort_order",{ascending:!0});if(n)throw n;if(!t||t.length===0){e&&(e.textContent="The 2026 slate isn't published yet. The default categories above are a preview.");return}const r=document.querySelector("[data-awards-categories]");r&&(r.innerHTML=""),t.forEach(s=>{const o=document.createElement("li");o.className="award-category",o.setAttribute("data-category-slug",s.slug);const i=u(s),l=i==="open"?"Voting open — cast yours":i==="closed"?"Voting closed":i==="published"?"Results published":"Voting opens September";o.innerHTML=`
          <p class="award-category__eyebrow">Category · ${s.year}</p>
          <h2 class="award-category__title">
            <a href="/awards/${s.slug}/">${s.title}</a>
          </h2>
          <p class="award-category__description">${s.description??""}</p>
          <p class="award-category__meta">${l}</p>
        `,r?.appendChild(o)}),e&&(e.textContent="")}catch(t){console.warn("[awards] live load failed:",t),e&&(e.textContent="")}}c();document.addEventListener("astro:page-load",c);
