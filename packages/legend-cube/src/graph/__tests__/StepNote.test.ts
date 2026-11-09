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
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import {
  column,
  resolvedTable,
  TestUnaryNode,
} from '../../__test-utils__/CubeTestNodes.js';
import { decodeCubeSpec, encodeCubeSpec } from '../../spec/CubeSpecCodec.js';
import { CubeSpecDecodeError } from '../../spec/SpecReader.js';
import { Connection } from '../Connection.js';
import { CubeDocument, DEFAULT_META } from '../CubeDocument.js';
import { Query } from '../Query.js';
import {
  getStepNoteText,
  reconcileStepNotes,
  setStepNote,
  type StepNote,
} from '../StepNote.js';

/** s1 → testUnary101 → testUnary102 */
const chain = (): Query =>
  new Query(
    [
      resolvedTable('s1', 'TRADES', [column('DESK')]),
      new TestUnaryNode('testUnary101'),
      new TestUnaryNode('testUnary102'),
    ],
    [
      new Connection('s1', 'testUnary101', 'tds'),
      new Connection('testUnary101', 'testUnary102', 'tds'),
    ],
    'testUnary102',
  );

const NOTES: readonly StepNote[] = [
  { step: 's1', text: 'The desks of the daily load' },
  { step: 'testUnary102', text: 'Only EMEA, per Risk', rest: { later: 1 } },
];

describe(unitTest('Step notes'), () => {
  test("Gives a step's note, and none for a step without one or with an empty one", () => {
    expect(getStepNoteText(NOTES, 's1')).toBe('The desks of the daily load');
    expect(getStepNoteText(NOTES, 'testUnary101')).toBeUndefined();
    expect(getStepNoteText([{ step: 's1', text: '' }], 's1')).toBeUndefined();
    expect(getStepNoteText(undefined, 's1')).toBeUndefined();
  });

  test('Puts a new note last, its ends trimmed', () => {
    expect(setStepNote(undefined, 's1', '  Why this table \n')).toEqual([
      { step: 's1', text: 'Why this table' },
    ]);
    expect(setStepNote(NOTES, 'testUnary101', 'Line one\nline two')).toEqual([
      ...NOTES,
      { step: 'testUnary101', text: 'Line one\nline two' },
    ]);
  });

  test('Edits a note in its place, keeping its unknown keys', () => {
    expect(setStepNote(NOTES, 'testUnary102', 'EMEA and APAC')).toEqual([
      NOTES[0],
      { step: 'testUnary102', text: 'EMEA and APAC', rest: { later: 1 } },
    ]);
  });

  test('Takes a note away when its text is empty, or only spaces', () => {
    expect(setStepNote(NOTES, 's1', '')).toEqual([NOTES[1]]);
    expect(setStepNote(NOTES, 'testUnary102', ' \n ')).toEqual([NOTES[0]]);
  });

  test('Leaves the notes as they were when nothing changes', () => {
    expect(setStepNote(NOTES, 's1', ' The desks of the daily load ')).toBe(
      NOTES,
    );
    expect(setStepNote(NOTES, 'testUnary101', '  ')).toBe(NOTES);
    expect(setStepNote(undefined, 's1', '')).toBeUndefined();
  });
});

describe(unitTest('Step notes: a note follows its step'), () => {
  test('Takes away the notes of steps the query no longer has', () => {
    const query = chain().remove('testUnary102');
    expect(reconcileStepNotes(NOTES, query)).toEqual([NOTES[0]]);
    expect(reconcileStepNotes(NOTES, new Query())).toEqual([]);
  });

  test('Leaves the notes as they were when every step is there', () => {
    expect(reconcileStepNotes(NOTES, chain())).toBe(NOTES);
    expect(reconcileStepNotes(undefined, chain())).toBeUndefined();
  });

  test('A new step given the id of a removed one starts without its note', () => {
    const removed = chain().remove('testUnary102');
    const notes = reconcileStepNotes(NOTES, removed);
    // ids are the highest number plus one, so the id comes back
    const id = removed.generateId(TestUnaryNode.TYPE);
    expect(id).toBe('testUnary102');
    const added = removed.add(new TestUnaryNode(id), 'testUnary101');
    expect(getStepNoteText(reconcileStepNotes(notes, added), id)).toBe(
      undefined,
    );
  });
});

describe(unitTest('Saved spec: step notes'), () => {
  const withNotes = (notes: unknown): Record<string, unknown> => ({
    formatVersion: 1,
    query: { nodes: [] },
    meta: { notes },
  });

  test('Writes notes back as they were read, unknown keys, empty texts and steps the query lacks included', () => {
    const json = withNotes([
      { step: 'relational101', text: 'Why\nthis table' },
      { step: 'filter101', text: '', later: { kept: true } },
    ]);
    const { document } = decodeCubeSpec(json);
    expect(document.meta.notes).toEqual([
      { step: 'relational101', text: 'Why\nthis table' },
      { step: 'filter101', text: '', rest: { later: { kept: true } } },
    ]);
    expect(encodeCubeSpec(document)).toEqual(json);
  });

  test('Writes the notes after the containers, and unknown keys of the meta after them', () => {
    const json = {
      formatVersion: 1,
      query: { nodes: [] },
      meta: {
        containers: [{ id: 'container1', title: 'A', steps: ['s1'] }],
        notes: [{ step: 's1', text: 'Why' }],
        later: true,
      },
    };
    const { meta } = encodeCubeSpec(decodeCubeSpec(json).document) as {
      meta: Record<string, unknown>;
    };
    expect(Object.keys(meta)).toEqual(['containers', 'notes', 'later']);
  });

  test('Writes no notes for a cube without any', () => {
    expect(encodeCubeSpec(new CubeDocument()).meta).toBeUndefined();
    expect(
      encodeCubeSpec(new CubeDocument({ meta: { ...DEFAULT_META, notes: [] } }))
        .meta,
    ).toBeUndefined();
  });

  test.each<[string, unknown, string, string]>([
    [
      'notes that are not a list',
      { s1: 'Why' },
      'meta.notes',
      'must be a list',
    ],
    [
      'a note with no step',
      [{ text: 'Why' }],
      'meta.notes[0].step',
      'is required',
    ],
    [
      'a note with an empty step',
      [{ step: '', text: 'Why' }],
      'meta.notes[0].step',
      'must not be empty',
    ],
    [
      'a note with no text',
      [{ step: 's1' }],
      'meta.notes[0].text',
      'is required',
    ],
    [
      'a text that is not a string',
      [{ step: 's1', text: 3 }],
      'meta.notes[0].text',
      'must be a string',
    ],
    [
      'two notes for one step',
      [
        { step: 's1', text: 'Why' },
        { step: 's1', text: 'Why again' },
      ],
      'meta.notes[1].step',
      'repeats the step "s1"',
    ],
  ])('Refuses %s', (_, notes, path, detail) => {
    expect(() => decodeCubeSpec(withNotes(notes))).toThrow(
      new CubeSpecDecodeError(path, detail),
    );
  });
});
