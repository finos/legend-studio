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

import { describe, expect, test } from '@jest/globals';
import { Slice } from '@finos/legend-cube';
import { CubeSliceDraft } from '../CubeSliceDraft.js';

describe('Slice draft', () => {
  test('Starts from the range and gives the original back until something is typed', () => {
    const slice = new Slice('slice101', 10, 20, { note: 'kept' });
    const draft = new CubeSliceDraft(slice);
    expect([draft.startText, draft.stopText]).toEqual(['10', '20']);
    expect([draft.start, draft.stop]).toEqual([10, 20]);
    expect(draft.build()).toBe(slice);
  });

  test('Builds the typed range, with the same id and saved keys', () => {
    const slice = new Slice('slice101', 10, 20, { note: 'kept' });
    const draft = new CubeSliceDraft(slice);
    draft.setStartText('0');
    draft.setStopText('5');
    const built = draft.build();
    expect(built).toBeInstanceOf(Slice);
    expect(built.id).toBe('slice101');
    expect([built.start, built.stop]).toEqual([0, 5]);
    expect(built.rest).toBe(slice.rest);
  });

  test('Changes one bound and keeps the other', () => {
    const draft = new CubeSliceDraft(new Slice('slice101', 10, 20));
    draft.setStopText('30');
    expect([draft.build().start, draft.build().stop]).toEqual([10, 30]);
  });

  test('Gives the original back once both bounds are typed back', () => {
    const slice = new Slice('slice101', 10, 20);
    const draft = new CubeSliceDraft(slice);
    draft.setStartText('1');
    draft.setStopText('2');
    draft.setStartText('10');
    draft.setStopText(' 20 ');
    expect(draft.build()).toBe(slice);
  });

  test.each(['', '1.5', '1e3', 'ten'])(
    'Builds a cleared bound from %j, never the default',
    (text) => {
      const draft = new CubeSliceDraft(new Slice('slice101', 10, 20));
      draft.setStartText(text);
      expect(draft.build().start).toBeUndefined();
      expect(draft.build().stop).toBe(20);
    },
  );

  test.each([1.5, 1e21, -0.5])(
    'Keeps a saved start %p its field cannot hold while only the stop changes',
    (start) => {
      const slice = new Slice('slice101', start, 20);
      const draft = new CubeSliceDraft(slice);
      expect(draft.build()).toBe(slice);
      draft.setStopText('30');
      expect([draft.build().start, draft.build().stop]).toEqual([start, 30]);
      // and gives the original back once its text is typed back
      draft.setStopText('20');
      draft.setStartText(`${String(start)}x`);
      draft.setStartText(String(start));
      expect(draft.build()).toBe(slice);
    },
  );

  test('Opens cleared bounds as empty fields', () => {
    const slice = new Slice('slice101', undefined, undefined);
    const draft = new CubeSliceDraft(slice);
    expect([draft.startText, draft.stopText]).toEqual(['', '']);
    expect(draft.build()).toBe(slice);
  });

  test('Keeps a saved bound its field cannot hold when its opening text is typed back with spaces', () => {
    const slice = new Slice('slice101', 1.5, 2.5);
    const draft = new CubeSliceDraft(slice);
    draft.setStartText(' 1.5 ');
    expect(draft.build()).toBe(slice);
    draft.setStopText(' 2.5 ');
    expect(draft.build()).toBe(slice);
  });
});
