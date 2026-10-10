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

/**
 * The edits of one node in the node editor, kept until Apply or closing it
 * (PLAN §7.4, §11.6, spec §17.5). A node type's editor edits its draft,
 * never the document: only Apply, or closing the editor any way but Cancel,
 * stores `build()`, as one undo step. A draft is made once each time the
 * editor opens on a node, and again after an Apply.
 */
export abstract class CubeNodeDraft<N extends QueryNode = QueryNode> {
  /** The node the draft was made from */
  readonly original: N;

  constructor(original: N) {
    this.original = original;
  }

  /**
   * The node Apply would store. Return `original` itself while nothing was
   * edited; the panel also treats a node that saves the same as `original`
   * as no change.
   */
  abstract build(): N;
}

/** A node with nothing to edit in the panel, such as a source or an Unknown node */
export class CubeReadOnlyNodeDraft extends CubeNodeDraft {
  build(): QueryNode {
    return this.original;
  }
}
