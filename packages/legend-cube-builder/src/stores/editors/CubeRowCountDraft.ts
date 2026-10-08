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
 * never the default (spec §7.7).
 */
export class CubeRowCountDraft<
  N extends CubeRowCountNode<N>,
> extends CubeNodeDraft<N> {
  sizeText: string;
  /** Anything was typed; until then, `build()` gives the original back */
  private touched = false;

  constructor(original: N) {
    super(original);
    makeObservable<CubeRowCountDraft<N>, 'touched'>(this, {
      sizeText: observable,
      touched: observable,
      setSizeText: action,
    });
    this.sizeText = original.size === undefined ? '' : String(original.size);
  }

  /** The size the text gives: `undefined` unless it is a whole number */
  get size(): number | undefined {
    return parseWholeNumberText(this.sizeText);
  }

  setSizeText(text: string): void {
    this.sizeText = text;
    this.touched = true;
  }

  build(): N {
    const { original, size } = this;
    return !this.touched || size === original.size
      ? original
      : original.withSize(size);
  }
}
