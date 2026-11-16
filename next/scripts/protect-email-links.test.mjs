import test from 'node:test';
import assert from 'node:assert/strict';
import { protectEmailLinks } from './protect-email-links.mjs';
test('email protection preserves destinations, labels and subject parameters and is idempotent', () => {
  const html = '<a href="/contact/">Contact</a><a class="email" href="mailto:hello@example.com?subject=Help%20please">hello@example.com</a>';
  const result = protectEmailLinks(html);
  assert.equal(result, '<a href="/contact/">Contact</a><!--email_off--><a class="email" href="mailto:hello@example.com?subject=Help%20please">hello@example.com</a><!--/email_off-->');
  assert.equal(protectEmailLinks(result), result);
});
