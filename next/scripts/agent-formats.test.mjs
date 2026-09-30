import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPage } from './generate-agent-formats.mjs';
const url = 'https://peninsulainsider.com.au/eat/example/';
const page = (main, head = '') => `<html><head><link rel="canonical" href="${url}">${head}</head><body><nav>Navigation noise</nav><main>${main}</main><footer>Footer noise</footer></body></html>`;
test('compact output retains caveats, uncertainty, dates and citation links without navigation or executable content', () => {
  const result = extractPage(page('<h1>A place &amp; a purpose</h1><p>Dog access is unknown. Confirm with the operator.</p><p>Fact checked <time>2026-09-20</time></p><a href="../operator/?a=1&amp;b=2">Source</a><script>privateRuntime()</script><form>private form value</form>'), url);
  assert.match(result.markdown, /Dog access is unknown\. Confirm with the operator\./);
  assert.match(result.markdown, /Fact checked 2026-09-20/);
  assert.match(result.markdown, /https:\/\/peninsulainsider.com.au\/eat\/operator\/\?a=1&b=2/);
  assert.doesNotMatch(result.markdown, /Navigation noise|Footer noise|privateRuntime|private form value/);
  assert.equal(result.title, 'A place & a purpose');
});
test('rejects redirects, non-indexable pages, absent main content and canonical mismatches', () => {
  assert.throws(() => extractPage(page('<h1>Private</h1>', '<meta name="robots" content="noindex, nofollow">'), url), /non-public/);
  assert.throws(() => extractPage(page('<h1>Moved</h1>', '<meta http-equiv="refresh" content="0;url=/about/">'), url), /redirect/);
  assert.throws(() => extractPage('<h1>No main</h1>', url), /no public main/);
  assert.throws(() => extractPage(page('<h1>Wrong</h1>'), url + 'other/'), /canonical mismatch/);
});
test('does not turn hostile text into Markdown structure or executable links', () => {
  const result = extractPage(page('<h1>Example</h1><p>[Fake](https://evil.test) &lt;script&gt; x_y</p><a href="javascript:alert(1)">Bad link</a>'), url);
  assert.match(result.markdown, /\\\[Fake\\\]/);
  assert.doesNotMatch(result.markdown, /javascript:/);
});
test('content hashes ignore surrounding chrome but change when facts or caveats change', () => {
  const first = extractPage(page('<h1>Example</h1><p>Hours unknown.</p>'), url);
  const chrome = extractPage(page('<h1>Example</h1><p>Hours unknown.</p>').replace('Navigation noise', 'New menu'), url);
  const edited = extractPage(page('<h1>Example</h1><p>Closed permanently.</p>'), url);
  assert.equal(first.contentSha256, chrome.contentSha256);
  assert.notEqual(first.contentSha256, edited.contentSha256);
});
test('line breaks and adjacent labels remain separate words', () => {
  const result = extractPage(page('<h1>A good day<br>starts here</h1><p><span>Sculpture Park</span><span>Laura Restaurant</span></p>'), url);
  assert.equal(result.title, 'A good day starts here');
  assert.match(result.markdown, /Sculpture Park\s+Laura Restaurant/);
});
test('hidden decorative separators do not join facts; price indicators and empty controls stay out', () => {
  const result = extractPage(page('<h1>Example</h1><p>Park<span aria-hidden="true"> · </span>Restaurant</p><span class="venue-detail__price-band">$$$</span><ul><li><button>Next</button></li></ul>'), url);
  assert.match(result.markdown, /Park\s+Restaurant/);
  assert.doesNotMatch(result.markdown, /\$\$\$|\n-\s*\n/);
});
test('named anchors without href never invent destination URLs', () => {
  const result = extractPage(page('<h1>Example</h1><a id="sources">Sources</a>'), url);
  assert.doesNotMatch(result.markdown, /undefined/);
  assert.match(result.markdown, /Sources/);
});
