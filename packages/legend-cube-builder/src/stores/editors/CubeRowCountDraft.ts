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

import type { QueryNode } from '@finos/legend-cube';
import { action, makeObservable, observable } from 'mobx';
import { parseWholeNumberText } from './CubeIntegerText.js';
import { CubeNodeDraft } from './CubeNodeDraft.js';

/** A node whose one setting is a number of rows, such as a Limit */
export interface CubeRowCountNode<N extends QueryNode> extends QueryNode {
  readonly size: number | undefined;
  withSize(size: number | undefined): N;
}

/**
 * The draft of a node whose one setting is a number of rows (spec §17.6: "one
 * integer field"). It keeps the text as typed. Text that isn't a whole
 * number, empty text included, builds a cleared size, which the node reports:
 * never the default (spec §7.7). The text it opened with gives the original
 * back, so a saved size the field can't read (`1.5` from an imported spec) is
 * kept unless the user types something else.
 */
export class CubeRowCountDraft<
  N extends CubeRowCountNode<N>,
> extends CubeNodeDraft<N> {
  sizeText: string;
  /** The text the field opened with, which builds the original */
  private readonly initialText: string;

  constructor(original: N) {
    super(original);
    makeObservable(this, {
      sizeText: observable,
      setSizeText: action,
    });
    this.initialText = original.size === undefined ? '' : String(original.size);
    this.sizeText = this.initialText;
  }

  /** The size the text gives: `undefined` unless it is a whole number */
  get size(): number | undefined {
    return parseWholeNumberText(this.sizeText);
  }

  setSizeText(text: string): void {
    this.sizeText = text;
  }

  /** The original while the field holds its opening text or the same size */
  build(): N {
    const { original, size } = this;
    return this.sizeText.trim() === this.initialText || size === original.size
      ? original
      : original.withSize(size);
  }
}
