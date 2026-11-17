import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import RenderedContent from '../components/relationship-guides/RenderedContent.astro';
import mdxRenderer from '@astrojs/mdx/server.js';
import FamilyFriendlyBody from '../components/relationship-guides/FamilyFriendlyBody.astro';
import RainyDayBody from '../components/relationship-guides/RainyDayBody.astro';
import { staticRelationshipGuides } from './static-relationship-guides.mjs';
/** Build-only singleton. Uses the existing contextual audit and CMS loader. */
import { getCollection, render } from 'astro:content';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildRelationshipIndex, relationshipBodyOverrides, articleRelationshipHref, publishedRelationshipContent, venueRelationshipHold } from './relationship-index.mjs';
import { routeSlug, venueHref } from './editorial';
import { loadOverrides } from './inline-edit/overrides';
import { pageFacts, contextualMentions } from '../../scripts/journal-link-audit.mjs';
import policy from '../../scripts/journal-link-policy.json';
let pending: ReturnType<typeof build> | undefined;
export function loadRelationships() { return pending ??= build(); }
async function build() {
  const [venues,articles,itineraries,events]=await Promise.all([getCollection('venues'),getCollection('articles'),getCollection('itineraries'),getCollection('events')]);
  const now=new Date();
  const container=await AstroContainer.create();
  container.addServerRenderer({renderer:mdxRenderer});
  const entities:any[]=venues.map(v=>({id:String(routeSlug(v)),name:v.data.name,aliases:[v.data.name,...((policy.aliases as Record<string,string[]>)[routeSlug(v)]??[])],href:venueHref(v),hold:venueRelationshipHold(v)}));
  for(const name of policy.ambiguous) entities.push({id:'ambiguous:'+name,name,aliases:[name],href:null,hold:'ambiguous'});
  // Source route contract; the built graph acceptance separately checks every
  // rendered destination's canonical, indexability and fragment.
  const targets=new Map(entities.filter(e=>e.href).map(e=>{const [url,hash]=e.href.split('#');return [url,{canonical:url,noindex:false,stub:false,ids:entities.filter(t=>t.href?.startsWith(url+'#')).map(t=>t.href.split('#')[1])}];}));
  const bodyLinks: Array<{articleId:string;href:string}>=[];
  const supplied=[];
  for(const article of articles) {
    const a:any={...article}; const href=articleRelationshipHref(a);
    // A static .astro override owns its own body/refs. Do not infer from its
    // shadow content record. This includes consolidated/retired guide routes.
    if(existsSync(resolve('src/pages',href.slice(1,-1)+'.astro'))) a.relationshipHold='static-route-needs-rendered-evidence';
    if(publishedRelationshipContent(a,now,true)) {
      const bodyHtml=typeof a.rendered?.html==='string' ? a.rendered.html : await container.renderToString(RenderedContent,{props:{Content:(await render(article)).Content},request:new Request('https://peninsulainsider.com.au'+href)});
      const overrides=a.data.section==='plans' ? {text:{},image:{}} : await loadOverrides('article',routeSlug(a));
      const blocks=relationshipBodyOverrides(a,overrides);
      const html=`<link rel="canonical" href="${href}"><main data-pi-prose-root>${bodyHtml}</main><script id="pi-block-overrides" type="application/json">${JSON.stringify(blocks).replace(/</g,'\\u003c')}</script>`;
      const evidence=contextualMentions(pageFacts(html,href),entities,targets,{allowPlans:true});
      a.relationshipBodyAvailable=!evidence.excluded;
      for(const m of evidence.mentions) if(m.status==='linked') bodyLinks.push({articleId:String(routeSlug(a)),href:m.target});
    }
    supplied.push(a);
  }
  const guideComponents={'guide:family-friendly':FamilyFriendlyBody,'guide:rainy-day':RainyDayBody};
  const guides=[];
  for(const guide of staticRelationshipGuides) {
    const html=`<link rel="canonical" href="${guide.href}">${await container.renderToString(guideComponents[guide.id as keyof typeof guideComponents],{request:new Request('https://peninsulainsider.com.au'+guide.href)})}`;
    const evidence=contextualMentions(pageFacts(html,guide.href),entities,targets);
    guides.push({...guide,evidenceEligible:!evidence.excluded});
    for(const m of evidence.mentions)if(m.status==='linked')bodyLinks.push({articleId:guide.id,href:m.target});
  }
  return buildRelationshipIndex({venues,articles:supplied,itineraries,events,guides,bodyLinks,now});
}
