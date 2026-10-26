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

import type { CubeContext, QueryNode } from '@finos/legend-cube';

/** A node editor's own undo and redo, as its buttons do them */
export interface CubeNodeDraftHistory {
  undo(): void;
  redo(): void;
}

/**
 * The edits of one node in the node editor, kept until Apply or closing it
 * (PLAN §7.4, §11.8, spec §17.5). A node type's editor edits its draft,
 * never the document: only Apply, or closing the editor any way but Cancel,
 * stores `build()`, as one undo step. A draft is made once each time the
 * editor opens on a node, and again after an Apply.
 */
export abstract class CubeNodeDraft<N extends QueryNode = QueryNode> {
  /** The node the draft was made from; `follow` may move it on */
  original: N;

  constructor(original: N) {
    this.original = original;
  }

  /**
   * The node Apply would store. Return `original` itself while nothing was
   * edited; the panel also treats a node that saves the same as `original`
   * as no change.
   */
  abstract build(): N;

  /**
   * Whether the draft holds edits `build()` can't make a node of yet, e.g.
   * a data space source's query builder holding a query Cube can't run
   * (PLAN §11.25): the panel counts them as changes, so closing it keeps it
   * open, saying why (`applyDisabledReason`), rather than dropping them
   */
  get hasEditsNotBuilt(): boolean {
    return false;
  }

  /**
   * The cube's context Apply stores with the node, in the same undo step,
   * when the draft changes it: a data space source's new execution context
   * (PLAN §11.25); by default none, as the context stays
   */
  get editedContext(): CubeContext | undefined {
    return undefined;
  }

  /**
   * The editor's own history, when it has one, e.g. a data space source's
   * query builder (PLAN §11.25): Cube's undo and redo shortcuts step
   * through it while the editor is open, in place of Cube's undo, which
   * would drop every change made in it; by default none
   */
  get history(): CubeNodeDraftHistory | undefined {
    return undefined;
  }

  /**
   * Why Apply waits, if it does: the panel disables it with this reason and
   * shows it in place of the problems, e.g. an Extend whose expressions
   * aren't validated yet (PLAN §11.7)
   */
  get applyDisabledReason(): string | undefined {
    return undefined;
  }

  /**
   * Whether the draft goes on, made from this node, when the node it was
   * made from is replaced underneath it by one that differs in nothing the
   * draft edits, e.g. an Extend the engine typed in the background; else
   * the panel drops the edits (PLAN §7.4)
   */
  follow(node: QueryNode): boolean {
    return false;
  }

  /** The editor closed on the draft: stops what it does in the background, e.g. checking code */
  dispose(): void {
    // nothing by default
  }
}

/** A node with nothing to edit in the panel, such as a source or an Unknown node */
export class CubeReadOnlyNodeDraft extends CubeNodeDraft {
  build(): QueryNode {
    return this.original;
  }
}
