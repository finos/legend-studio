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

import type { Slice } from '@finos/legend-cube';
import { action, makeObservable, observable } from 'mobx';
import { parseWholeNumberText } from './CubeIntegerText.js';
import { CubeNodeDraft } from './CubeNodeDraft.js';

const textOf = (value: number | undefined): string =>
  value === undefined ? '' : String(value);

/**
 * The Slice editor's draft (spec §17.6: start and stop integer fields). It
 * keeps the texts as typed; a text that isn't a whole number builds a
 * cleared bound, which the node reports, never the default (spec §7.9). A
 * field that holds the text it opened with keeps its saved bound, so a bound
 * the field can't read (`1.5` from an imported spec) is kept unless the user
 * types something else in that field.
 */
export class CubeSliceDraft extends CubeNodeDraft<Slice> {
  startText: string;
  stopText: string;
  /** The texts the fields opened with, which keep the saved bounds */
  private readonly initialStartText: string;
  private readonly initialStopText: string;

  constructor(original: Slice) {
    super(original);
    makeObservable(this, {
      startText: observable,
      stopText: observable,
      setStartText: action,
      setStopText: action,
    });
    this.initialStartText = textOf(original.start);
    this.initialStopText = textOf(original.stop);
    this.startText = this.initialStartText;
    this.stopText = this.initialStopText;
  }

  /** The start the text gives: `undefined` unless it is a whole number */
  get start(): number | undefined {
    return parseWholeNumberText(this.startText);
  }

  /** The stop the text gives: `undefined` unless it is a whole number */
  get stop(): number | undefined {
    return parseWholeNumberText(this.stopText);
  }

  setStartText(text: string): void {
    this.startText = text;
  }

  setStopText(text: string): void {
    this.stopText = text;
  }

  /** The original while each field holds its opening text or the same bound */
  build(): Slice {
    const { original, start, stop } = this;
    const keepStart =
      this.startText.trim() === this.initialStartText ||
      start === original.start;
    const keepStop =
      this.stopText.trim() === this.initialStopText || stop === original.stop;
    return keepStart && keepStop
      ? original
      : original.withRange(
          keepStart ? original.start : start,
          keepStop ? original.stop : stop,
        );
  }
}
