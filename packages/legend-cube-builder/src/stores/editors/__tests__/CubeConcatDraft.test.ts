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
import { Concat } from '@finos/legend-cube';
import { autorun } from 'mobx';
import { CubeConcatDraft } from '../CubeConcatDraft.js';

// The Concat editor's draft: its one setting, Convert types (PLAN §11.5, Q5)

describe('Concat draft', () => {
  test.each([false, true])(
    'Starts from the setting %p and gives the original back until it changes',
    (widenTypes) => {
      const concat = new Concat('concat101', widenTypes, { note: 'kept' });
      const draft = new CubeConcatDraft(concat);
      expect(draft.original).toBe(concat);
      expect(draft.widenTypes).toBe(widenTypes);
      expect(draft.build()).toBe(concat);
      // setting it to what it is changes nothing
      draft.setWidenTypes(widenTypes);
      expect(draft.build()).toBe(concat);
    },
  );

  test('Builds a concat that converts types, with the same id and saved keys', () => {
    const concat = new Concat('concat101', false, { note: 'kept' });
    const draft = new CubeConcatDraft(concat);
    draft.setWidenTypes(true);
    expect(draft.widenTypes).toBe(true);
    const built = draft.build();
    expect(built).toBeInstanceOf(Concat);
    expect(built === concat).toBe(false);
    expect(built.id).toBe('concat101');
    expect(built.widenTypes).toBe(true);
    expect(built.rest).toBe(concat.rest);
    expect(built.describe()).toBe(
      'Concatenate additional input, converting types',
    );
    // the original is left as it was
    expect(concat.widenTypes).toBe(false);
    expect(draft.original).toBe(concat);
  });

  test('Builds a concat that no longer converts types, from one saved with it', () => {
    const concat = new Concat('concat101', true, { note: 'kept' });
    const draft = new CubeConcatDraft(concat);
    draft.setWidenTypes(false);
    const built = draft.build();
    expect(built === concat).toBe(false);
    expect(built.id).toBe('concat101');
    expect(built.widenTypes).toBe(false);
    expect(built.rest).toBe(concat.rest);
    expect(built.describe()).toBe('Concatenate additional input');
  });

  test.each([false, true])(
    'Gives the original back once the setting %p is set back',
    (widenTypes) => {
      const concat = new Concat('concat101', widenTypes);
      const draft = new CubeConcatDraft(concat);
      draft.setWidenTypes(!widenTypes);
      expect(draft.build().widenTypes).toBe(!widenTypes);
      draft.setWidenTypes(widenTypes);
      expect(draft.build()).toBe(concat);
    },
  );

  test('Lets the editor follow its setting', () => {
    const draft = new CubeConcatDraft(new Concat('concat101'));
    const seen: boolean[] = [];
    const dispose = autorun(() => {
      seen.push(draft.widenTypes);
    });
    draft.setWidenTypes(true);
    draft.setWidenTypes(false);
    dispose();
    expect(seen).toEqual([false, true, false]);
  });
});
