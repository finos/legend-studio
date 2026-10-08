/**
 * Copyright (c) 2026-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { compressImage } from '../ImageUtils.js';

/**
 * `jsdom` never loads an image, so `src` is replaced with a stub that replays
 * the dimensions the test asked for and then fires the matching event.
 *
 * NOTE: the stub has to wrap a *real* `HTMLImageElement` -- `jest-canvas-mock`
 * type-checks the argument to `drawImage` and throws on a plain object, and
 * because that throw happens inside the image callback rather than inside the
 * promise chain it manifests as a hang rather than a failure.
 */
let imageDimensions = { width: 100, height: 100 };
let shouldFailToLoad = false;
let originalImage: typeof Image;

/** Canvas dimensions observed at the moment the image is encoded. */
let encodedAs: { width: number; height: number } | undefined;
/** Every `quality` the encoder was asked for, in order. */
let requestedQualities: number[] = [];

const TEST_DATA__file = new File([''], 'test.png', { type: 'image/png' });

const mockEncoder = (
  buildPayload: (quality: number) => string,
): void /* records each call and returns the given payload */ => {
  jest
    .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
    .mockImplementation(function (
      this: HTMLCanvasElement,
      _type?: string,
      quality?: unknown,
    ) {
      encodedAs = { width: this.width, height: this.height };
      requestedQualities.push(quality as number);
      return `data:image/jpeg;base64,${buildPayload(quality as number)}`;
    });
};

beforeEach(() => {
  imageDimensions = { width: 100, height: 100 };
  shouldFailToLoad = false;
  encodedAs = undefined;
  requestedQualities = [];

  originalImage = window.Image;
  (URL as unknown as { createObjectURL: () => string }).createObjectURL = () =>
    'blob:test';

  window.Image = function MockImage() {
    const image = new originalImage();
    Object.defineProperty(image, 'width', {
      configurable: true,
      get: () => imageDimensions.width,
    });
    Object.defineProperty(image, 'height', {
      configurable: true,
      get: () => imageDimensions.height,
    });
    Object.defineProperty(image, 'src', {
      configurable: true,
      get: () => 'blob:test',
      set: () => {
        setTimeout(() => {
          image.dispatchEvent(new Event(shouldFailToLoad ? 'error' : 'load'));
        }, 0);
      },
    });
    return image;
  } as unknown as typeof Image;

  mockEncoder(() => 'a'.repeat(8));
});

afterEach(() => {
  window.Image = originalImage;
  delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
});

describe('compressImage', () => {
  describe(unitTest('resizing'), () => {
    test(unitTest('scales a landscape image down by its width'), async () => {
      imageDimensions = { width: 400, height: 200 };
      await compressImage(TEST_DATA__file, 1000, 100);
      expect(encodedAs).toEqual({ width: 100, height: 50 });
    });

    test(unitTest('scales a portrait image down by its height'), async () => {
      imageDimensions = { width: 200, height: 400 };
      await compressImage(TEST_DATA__file, 1000, 100);
      expect(encodedAs).toEqual({ width: 50, height: 100 });
    });

    test(unitTest('scales a square image down by its height'), async () => {
      imageDimensions = { width: 400, height: 400 };
      // `width > height` is false for a square, so the height branch handles it
      await compressImage(TEST_DATA__file, 1000, 100);
      expect(encodedAs).toEqual({ width: 100, height: 100 });
    });

    test(
      unitTest('leaves an image already within bounds untouched'),
      async () => {
        imageDimensions = { width: 80, height: 40 };
        await compressImage(TEST_DATA__file, 1000, 100);
        expect(encodedAs).toEqual({ width: 80, height: 40 });
      },
    );

    test(
      unitTest('does not resize an image exactly at the limit'),
      async () => {
        imageDimensions = { width: 100, height: 100 };
        await compressImage(TEST_DATA__file, 1000, 100);
        // the comparisons are strict, so neither branch applies at the limit
        expect(encodedAs).toEqual({ width: 100, height: 100 });
      },
    );
  });

  describe(unitTest('quality reduction'), () => {
    test(unitTest('encodes once when already small enough'), async () => {
      const result = await compressImage(TEST_DATA__file, 1000, 100);
      expect(requestedQualities).toEqual([1]);
      expect(result.startsWith('data:image/jpeg;base64,')).toBe(true);
    });

    test(unitTest('steps the quality down until it fits'), async () => {
      // ~29KB at full quality, shrinking proportionally as quality drops, so
      // it takes a few steps to come under a 25KB budget
      mockEncoder((quality) => 'a'.repeat(Math.round(40000 * quality)));

      await compressImage(TEST_DATA__file, 25, 100);

      expect(requestedQualities.length).toBeGreaterThan(1);
      expect(requestedQualities[0]).toBe(1);
      // the quality only ever decreases
      requestedQualities.forEach((quality, idx) => {
        if (idx > 0) {
          expect(quality).toBeLessThan(requestedQualities[idx - 1] as number);
        }
      });
    });

    test(unitTest('gives up at the quality floor'), async () => {
      // a budget of 0KB can never be met, so only the floor stops the recursion
      const result = await compressImage(TEST_DATA__file, 0, 100);

      // NOTE: the guard reads `quality <= 0.1`, but the quality is reduced by
      // repeated subtraction of 0.1, which accumulates float error -- so the
      // loop actually runs past 0.1 down to ~1.4e-16, taking 11 attempts
      // rather than the 10 the code reads like.
      expect(requestedQualities).toHaveLength(11);
      expect(requestedQualities.at(-1)).toBeLessThanOrEqual(0.1);
      expect(requestedQualities.at(-1)).toBeGreaterThan(0);
      // it still resolves with the last payload rather than rejecting
      expect(result.startsWith('data:image/jpeg;base64,')).toBe(true);
    });
  });

  describe(unitTest('failure'), () => {
    test(unitTest('rejects when the image cannot be loaded'), async () => {
      shouldFailToLoad = true;
      await expect(compressImage(TEST_DATA__file, 1000, 100)).rejects.toThrow(
        'Failed to load image',
      );
    });
  });
});
