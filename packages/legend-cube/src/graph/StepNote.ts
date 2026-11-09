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

import type { JsonObject } from '../utils/Json.js';
import type { CubeDocument } from './CubeDocument.js';
import type { Query } from './Query.js';

// A note beside a step: plain text the canvas shows under it, saying why the
// step is there, where its label says what it does (PLAN §11.31). Only how
// the graph is shown, never what the cube runs. Saved in the cube's meta
// (`meta.notes`), one per step, in the order written.

export interface StepNote {
  /** The id of its step */
  readonly step: string;
  readonly text: string;
  readonly rest?: JsonObject;
}

/** The longest note the editor takes, in characters */
export const STEP_NOTE_MAX_LENGTH = 500;

/** A step's note, if it has one that isn't empty */
export const getStepNoteText = (
  notes: readonly StepNote[] | undefined,
  stepId: string,
): string | undefined =>
  notes?.find((note) => note.step === stepId && note.text !== '')?.text;

/**
 * The notes with a step's note set to the text, its ends trimmed: a new
 * note goes last, one edited keeps its place and unknown keys, and an empty
 * text takes the note away. The notes as they were when nothing changes.
 */
export const setStepNote = (
  notes: readonly StepNote[] | undefined,
  stepId: string,
  text: string,
): readonly StepNote[] | undefined => {
  const trimmed = text.trim();
  const all = notes ?? [];
  const note = all.find((each) => each.step === stepId);
  if (!note) {
    return trimmed ? [...all, { step: stepId, text: trimmed }] : notes;
  }
  if (!trimmed) {
    return all.filter((each) => each !== note);
  }
  return note.text === trimmed
    ? notes
    : all.map((each) => (each === note ? { ...note, text: trimmed } : each));
};

/** The document with a step's note set (`setStepNote`); the same document when that changes nothing */
export const withStepNote = (
  document: CubeDocument,
  stepId: string,
  text: string,
): CubeDocument => {
  const { meta } = document;
  const notes = setStepNote(meta.notes, stepId, text);
  return notes === meta.notes
    ? document
    : document.withMeta({ ...meta, notes });
};

/**
 * The notes once the query has changed (PLAN §11.31): a step the query no
 * longer has takes its note away, so a new step given the same id (the
 * highest number plus one) starts without one. The notes as they were when
 * nothing changes.
 */
export const reconcileStepNotes = (
  notes: readonly StepNote[] | undefined,
  query: Query,
): readonly StepNote[] | undefined => {
  const kept = notes?.filter((note) => query.getNode(note.step) !== undefined);
  return !notes || kept?.length === notes.length ? notes : kept;
};
