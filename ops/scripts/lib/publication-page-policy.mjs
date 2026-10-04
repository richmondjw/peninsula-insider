/** Read metadata as quoted HTML attributes without truncating apostrophes. */
export function metaContent(html,name,property=false){
 for(const tag of html.matchAll(/<meta\b(?:[^"'>]|"[^"]*"|'[^']*')*>/gi)){
  const attrs={};for(const attribute of tag[0].matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs))attrs[attribute[1].toLowerCase()]=attribute[3];
  if(attrs[property?'property':'name']?.toLowerCase()===name.toLowerCase())return attrs.content??null;
 }return null;
}
export function sitemapPolicy(inSitemap,robots){
 const excluded=/(?:^|[\s,;])noindex(?:$|[\s,;])/i.test(robots??'');
 return {ok:excluded?!inSitemap:inSitemap,detail:excluded?(inSitemap?'noindex page incorrectly included':'noindex page correctly excluded'):(inSitemap?'present':'not in sitemap.xml')};
}
