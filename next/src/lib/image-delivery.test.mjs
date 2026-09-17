import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isTransformablePublicImage,
  responsivePublicImage,
  transformedPublicImage,
} from './image-delivery.mjs';

const RAW = 'https://project.supabase.co/storage/v1/object/public/cms-assets/page/home/hero.jpg';

test('recognises only public Supabase object URLs', () => {
  assert.equal(isTransformablePublicImage(RAW), true);
  assert.equal(isTransformablePublicImage('/images/hero.webp'), false);
  assert.equal(isTransformablePublicImage('https://example.com/hero.jpg'), false);
  assert.equal(isTransformablePublicImage('https://project.supabase.co/storage/v1/object/sign/cms-assets/hero.jpg'), false);
});

test('creates bounded public transformation URLs', () => {
  const out = new URL(transformedPublicImage(RAW, { width: 1280, height: 720, quality: 75 }));
  assert.equal(out.pathname, '/storage/v1/render/image/public/cms-assets/page/home/hero.jpg');
  assert.equal(out.searchParams.get('width'), '1280');
  assert.equal(out.searchParams.get('height'), '720');
  assert.equal(out.searchParams.get('resize'), 'cover');
  assert.equal(out.searchParams.get('quality'), '75');
  assert.equal(transformedPublicImage(RAW, { width: 0, height: 720 }), RAW);
});

test('builds a responsive set and leaves local assets alone', () => {
  const remote = responsivePublicImage(RAW, {
    widths: [640, 320, 640],
    aspectRatio: 16 / 9,
    fallbackWidth: 640,
    sizes: '100vw',
  });
  assert.match(remote.src, /width=640/);
  assert.match(remote.src, /height=360/);
  assert.equal(remote.srcset.split(', ').length, 2, 'duplicate widths are removed');
  assert.equal(remote.sizes, '100vw');

  assert.deepEqual(responsivePublicImage('/images/hero.webp'), {
    src: '/images/hero.webp',
    srcset: undefined,
    sizes: undefined,
  });
  assert.deepEqual(responsivePublicImage(RAW, { aspectRatio: 0 }), {
    src: RAW,
    srcset: undefined,
    sizes: undefined,
  });
});
