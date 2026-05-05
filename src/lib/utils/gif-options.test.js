import test from 'node:test';
import assert from 'node:assert/strict';
import { getGifDimensions } from './gif-options.js';

test('getGifDimensions preserves canvas aspect ratio', () => {
    assert.deepEqual(getGifDimensions({ width: 1000, height: 500 }, 500), {
        width: 500,
        height: 250
    });
});

test('getGifDimensions falls back to the default width', () => {
    assert.deepEqual(getGifDimensions({ width: 1000, height: 500 }, 0), {
        width: 500,
        height: 250
    });
});

test('getGifDimensions rejects missing canvas dimensions', () => {
    assert.throws(() => getGifDimensions({ width: 0, height: 500 }), /Canvas is not ready/);
});
