import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { routeSlug } from '../lib/editorial';

const SITE_URL = 'https://peninsulainsider.com.au';
const FEED_TITLE = 'Peninsula Insider';
const FEED_DESC =
  'Editorial coverage of the Mornington Peninsula — eat, stay, do, wine, and the weekend curated.';

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function rfc822(d: Date): string {
  return d.toUTCString();
}

export const GET: APIRoute = async () => {
  const articles = await getCollection(
    'articles',
    ({ data }) => data.status === 'published'
  );

  const items = articles
    .map((a) => ({
      slug: routeSlug(a),
      title: a.data.title as string,
      description: (a.data.dek ?? '') as string,
      pubDate: (a.data.publishedAt as Date | undefined) ?? new Date(),
    }))
    .filter((a) => Boolean(a.slug))
    .sort((x, y) => y.pubDate.getTime() - x.pubDate.getTime())
    .slice(0, 40);

  const lastBuildDate = items[0]?.pubDate ?? new Date();

  const itemsXml = items
    .map((item) => {
      const link = `${SITE_URL}/journal/${item.slug}/`;
      return `    <item>
      <title>${xmlEscape(item.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${rfc822(item.pubDate)}</pubDate>
      <description>${xmlEscape(item.description)}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(FEED_TITLE)}</title>
    <link>${SITE_URL}/</link>
    <description>${xmlEscape(FEED_DESC)}</description>
    <language>en-au</language>
    <lastBuildDate>${rfc822(lastBuildDate)}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
