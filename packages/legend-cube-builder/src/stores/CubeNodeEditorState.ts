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
  canFixJoinDuplicates,
  canRenameConcatInput,
  canRestrictConcatInput,
  fixJoinDuplicates,
  type NodeRegistry,
  type Query,
  type QueryNode,
  renameConcatInput,
  restrictConcatInput,
  type Schema,
} from '@finos/legend-cube';
import {
  action,
  computed,
  type IReactionDisposer,
  makeObservable,
  observable,
  reaction,
} from 'mobx';
import {
  CUBE_EDITOR_CLOSED_REASON,
  getEditorClosedNotice,
  getEditorKeptOpenNotice,
} from '../__lib__/LegendCubeLabels.js';
import type { CubeEditorState } from './CubeEditorState.js';
import type { CubeNodeDraft } from './editors/CubeNodeDraft.js';
import { createCubeNodeDraft } from './editors/CubeNodeDraftRegistry.js';

/**
 * Whether two nodes of the same id save the same: their own fields, as the
 * spec stores them, and the keys this version doesn't know. A node of a type
 * the registry doesn't know is the same only as itself.
 */
export const isSameNodeContent = (
  registry: NodeRegistry,
  a: QueryNode,
  b: QueryNode,
): boolean => {
  if (a === b) {
    return true;
  }
  const definition = registry.get(a.type);
  return (
    definition !== undefined &&
    a.type === b.type &&
    JSON.stringify([definition.spec.encode(a), a.rest]) ===
      JSON.stringify([definition.spec.encode(b), b.rest])
  );
};

/**
 * The node editor (PLAN §7.4, §11.8, spec §17.5). Opening it never changes
 * which node Execute runs. Edits go to a draft, and only Apply, or closing
 * the editor, stores them, as one undo step; Cancel drops them. Every close
 * that applies goes through `finish`, which first lets the editor's fields
 * commit text typed but not yet stored.
 *
 * The panel follows the cube (user's choice, 2026-10-07): when the node it
 * shows is replaced or removed underneath it, by Undo, a re-check or a
 * Remove, a panel with edits closes without applying them and says so; one
 * without edits shows the new node, or closes when the node is gone.
 */
export class CubeNodeEditorState {
  readonly editorState: CubeEditorState;

  /** The id of the node the panel shows, while it is open */
  nodeId: string | undefined;
  /** The key of the node the draft was made from */
  private nodeKey: number | undefined;
  draft: CubeNodeDraft | undefined;
  /** Why the panel closed by itself, until it opens again or is dismissed */
  notice: string | undefined;
  /** A node the keyboard goes back to, once its editor closed from the keyboard */
  nodeToFocus: string | undefined;
  /** How many dropdowns, pickers or dialogs opened from the editor hold it open */
  private holds = 0;
  /** What commits the editor's pending input, e.g. a field's text not yet stored, in order */
  private flushers: { flush: () => void; isPending: () => boolean }[] = [];

  private readonly disposeSync: IReactionDisposer;

  constructor(editorState: CubeEditorState) {
    makeObservable<CubeNodeEditorState, 'nodeKey' | 'holds' | 'sync'>(this, {
      nodeId: observable,
      nodeKey: observable,
      holds: observable,
      nodeToFocus: observable,
      runFromKeyboard: action,
      clearNodeToFocus: action,
      isHeld: computed,
      holdOpen: action,
      finish: action,
      finishApplied: action,
      draft: observable.ref,
      notice: observable,
      node: computed,
      edited: computed,
      hasChanges: computed,
      open: action,
      canSwapInputs: computed,
      canRenameDuplicateColumns: computed,
      canRenameConcatInput: computed,
      canRestrictConcatInput: computed,
      apply: action,
      swapInputs: action,
      renameDuplicateColumns: action,
      renameConcatInput: action,
      restrictConcatInput: action,
      close: action,
      cancel: action,
      discard: action,
      dismissNotice: action,
      sync: action,
    });
    this.editorState = editorState;
    this.disposeSync = reaction(
      () => this.node,
      () => this.sync(),
    );
  }

  /** The node the panel shows, as the cube has it now */
  get node(): QueryNode | undefined {
    return this.nodeId === undefined
      ? undefined
      : this.editorState.document.query.getNode(this.nodeId);
  }

  /** The node Apply would store, built once per edit */
  get edited(): QueryNode | undefined {
    return this.draft?.build();
  }

  /** The draft saves differently from the node it was made from */
  get hasChanges(): boolean {
    const { draft, edited } = this;
    return (
      draft !== undefined &&
      edited !== undefined &&
      !isSameNodeContent(this.editorState.registry, edited, draft.original)
    );
  }

  /**
   * Opens the editor on a node, finishing (and so applying) the one it showed;
   * does nothing while that one is held open, or kept open saying why
   */
  open(nodeId: string): void {
    if (nodeId === this.nodeId) {
      this.notice = undefined;
      return;
    }
    const node = this.editorState.document.query.getNode(nodeId);
    if (!node) {
      return;
    }
    this.notice = undefined;
    if (this.finish()) {
      // the node as the cube has it once the other editor finished
      this.bind(this.editorState.document.query.getNode(nodeId) ?? node);
    }
  }

  /**
   * Stores the draft in place of the node, as one undo step, and goes on
   * editing the stored node. Does nothing without changes, or while the cube
   * is read-only.
   */
  apply(): void {
    const { node, edited } = this;
    if (
      !node ||
      !edited ||
      node.key !== this.nodeKey ||
      !this.hasChanges ||
      this.editorState.readOnly ||
      this.draft?.applyDisabledReason !== undefined
    ) {
      return;
    }
    const { query } = this.editorState.document;
    if (query.canReplace(edited)) {
      this.editorState.applyQuery(query.replace(edited));
      this.bind(edited);
    }
  }

  get canSwapInputs(): boolean {
    const { node } = this;
    return (
      node !== undefined &&
      !this.editorState.readOnly &&
      this.editorState.document.query.canSwapInputs(node.id)
    );
  }

  /**
   * Swaps the node's two inputs (a Join's Swap Inputs, spec §17.6), applying
   * the draft first, as one undo step, then goes on editing the swapped
   * node, whose settings followed its inputs
   */
  swapInputs(): void {
    const { node, edited } = this;
    if (!node || !edited || node.key !== this.nodeKey || !this.canSwapInputs) {
      return;
    }
    let { query } = this.editorState.document;
    if (this.hasChanges && query.canReplace(edited)) {
      query = query.replace(edited);
    }
    query = query.swapInputs(node.id);
    this.editorState.applyQuery(query);
    this.bind(query.getNode(node.id) ?? node);
  }

  /**
   * The cube's query with the draft in place of its node, when it has
   * changes, and the schemas of the node's inputs, which the draft doesn't
   * change
   */
  private get queryWithEdits(): {
    query: Query;
    inputSchemas: (Schema | undefined)[];
  } {
    const { node, edited } = this;
    let { query } = this.editorState.document;
    if (edited && this.hasChanges && query.canReplace(edited)) {
      query = query.replace(edited);
    }
    return {
      query,
      inputSchemas: node
        ? query
            .getInputIds(node.id)
            .map((inputId) =>
              inputId === undefined
                ? undefined
                : this.editorState.analysis.schemas.get(inputId),
            )
        : [],
    };
  }

  /**
   * Whether the join being edited, edits included, can have the columns its
   * inputs share renamed (spec §7.11's autofix, PLAN §11.4): its only problem
   * is the duplicate rule, and the cube isn't read-only
   */
  get canRenameDuplicateColumns(): boolean {
    const { node } = this;
    if (!node || node.key !== this.nodeKey || this.editorState.readOnly) {
      return false;
    }
    const { query, inputSchemas } = this.queryWithEdits;
    const [leftSchema, rightSchema] = inputSchemas;
    return canFixJoinDuplicates(query, node.id, leftSchema, rightSchema);
  }

  /**
   * Renames the columns the join's inputs share with a Rename before each
   * input, applying the draft first, as one undo step, then goes on editing
   * the join, whose keys follow the renames
   */
  renameDuplicateColumns(): void {
    const { node } = this;
    if (!node || !this.canRenameDuplicateColumns) {
      return;
    }
    const { query, inputSchemas } = this.queryWithEdits;
    const [leftSchema, rightSchema] = inputSchemas;
    const fixed = fixJoinDuplicates(query, node.id, leftSchema, rightSchema);
    this.editorState.applyQuery(fixed);
    this.bind(fixed.getNode(node.id) ?? node);
  }

  /**
   * The query with the draft applied and the node's input schemas, when the
   * node is the one the panel was opened on and the cube can be changed
   */
  private get fixable():
    | { node: QueryNode; query: Query; inputSchemas: (Schema | undefined)[] }
    | undefined {
    const { node } = this;
    return node && node.key === this.nodeKey && !this.editorState.readOnly
      ? { node, ...this.queryWithEdits }
      : undefined;
  }

  /**
   * Applies a fix of the query made from the draft applied, as one undo step,
   * then goes on editing the node
   */
  private applyFix(
    fix: (
      query: Query,
      nodeId: string,
      inputSchemas: (Schema | undefined)[],
    ) => Query,
  ): void {
    const { fixable } = this;
    if (!fixable) {
      return;
    }
    const { node, query, inputSchemas } = fixable;
    const fixed = fix(query, node.id, inputSchemas);
    this.editorState.applyQuery(fixed);
    this.bind(fixed.getNode(node.id) ?? node);
  }

  /**
   * Whether the concat being edited can be fixed by a Rename before its
   * second input (PLAN §11.5, Q6), and the cube isn't read-only
   */
  get canRenameConcatInput(): boolean {
    const { fixable } = this;
    return (
      fixable !== undefined &&
      canRenameConcatInput(
        fixable.query,
        fixable.node.id,
        fixable.inputSchemas[0],
        fixable.inputSchemas[1],
      )
    );
  }

  /** Adds the Rename before the concat's second input, as one undo step */
  renameConcatInput(): void {
    if (this.canRenameConcatInput) {
      this.applyFix((query, nodeId, [first, second]) =>
        renameConcatInput(query, nodeId, first, second),
      );
    }
  }

  /**
   * Whether the concat being edited can be fixed by a Restrict before its
   * wider input (PLAN §11.5, Q6), and the cube isn't read-only
   */
  get canRestrictConcatInput(): boolean {
    const { fixable } = this;
    return (
      fixable !== undefined &&
      canRestrictConcatInput(
        fixable.query,
        fixable.node.id,
        fixable.inputSchemas[0],
        fixable.inputSchemas[1],
      )
    );
  }

  /** Adds the Restrict before the concat's wider input, as one undo step */
  restrictConcatInput(): void {
    if (this.canRestrictConcatInput) {
      this.applyFix((query, nodeId, [first, second]) =>
        restrictConcatInput(query, nodeId, first, second),
      );
    }
  }

  /**
   * Applies the draft, then closes the panel (spec §17.5: edits commit on
   * close). A draft whose Apply waits, e.g. an Extend whose expressions
   * aren't validated, keeps the panel open and says why, rather than
   * dropping or storing what can't be applied yet; Cancel drops it.
   */
  close(): void {
    if (this.keepOpenWhileWaiting()) {
      return;
    }
    this.apply();
    this.reset();
    this.notice = undefined;
  }

  /**
   * Whether a dropdown, picker or dialog opened from the editor is open: then
   * nothing outside it closes the editor, and the page's shortcuts wait
   * (spec §17.5)
   */
  get isHeld(): boolean {
    return this.holds > 0;
  }

  /**
   * Holds the editor open while something opened from it is open; call the
   * returned function, once, when that closes
   */
  holdOpen(): () => void {
    this.holds += 1;
    let released = false;
    return action(() => {
      if (!released) {
        released = true;
        this.holds -= 1;
      }
    });
  }

  /**
   * Has `finish` commit the editor's pending input first, e.g. by moving the
   * focus out of a field that stores its text on blur; returns the function
   * that removes it. One asked to run first runs before the others: the
   * editor's blur, so a field's text is stored before what reads it.
   */
  addFlusher(
    flush: () => void,
    options?: {
      first?: boolean;
      /** Whether it has input to commit, e.g. text typed and not applied */
      isPending?: () => boolean;
    },
  ): () => void {
    const flusher = { flush, isPending: options?.isPending ?? (() => false) };
    this.flushers = options?.first
      ? [flusher, ...this.flushers]
      : [...this.flushers, flusher];
    return () => {
      this.flushers = this.flushers.filter((other) => other !== flusher);
    };
  }

  /**
   * Whether the editor holds input a flusher would commit on closing, e.g. a
   * warehouse typed and not applied; read when asked, not observed
   */
  hasPendingInput(): boolean {
    return this.flushers.some((flusher) => flusher.isPending());
  }

  /**
   * Keeps the editor open, saying why, when its draft's Apply waits, e.g. an
   * Extend whose expressions aren't validated (PLAN §11.7), rather than
   * dropping or storing what can't be applied yet; says whether it did
   */
  private keepOpenWhileWaiting(): boolean {
    const { nodeId, draft } = this;
    const waiting = draft?.applyDisabledReason;
    if (
      nodeId === undefined ||
      waiting === undefined ||
      !this.hasChanges ||
      this.editorState.readOnly
    ) {
      return false;
    }
    this.notice = getEditorKeptOpenNotice(nodeId, waiting);
    return true;
  }

  /**
   * Finishes with the editor as anything but Cancel does (PLAN §11.8): commits
   * its pending input, then closes it, applying the edits as one undo step.
   * Edits the query can't take close it with a notice instead of vanishing.
   * Does nothing while something opened from the editor holds it open, and
   * keeps it open, saying why, while its Apply waits (PLAN §11.7).
   */
  private finishWith(): 'held' | 'kept' | 'dropped' | 'closed' {
    if (this.nodeId === undefined) {
      return 'closed';
    }
    if (this.isHeld) {
      return 'held';
    }
    this.flushers.forEach((flusher) => flusher.flush());
    if (this.keepOpenWhileWaiting()) {
      return 'kept';
    }
    const { edited } = this;
    if (
      edited !== undefined &&
      this.hasChanges &&
      !this.editorState.readOnly &&
      !this.editorState.document.query.canReplace(edited)
    ) {
      this.discard(CUBE_EDITOR_CLOSED_REASON.CANNOT_APPLY);
      return 'dropped';
    }
    this.close();
    return 'closed';
  }

  /** Finishes with the editor (`finishWith`); says whether it is closed */
  finish(): boolean {
    const finished = this.finishWith();
    return finished === 'dropped' || finished === 'closed';
  }

  /**
   * Finishes with the editor (`finishWith`); says whether its edits, if any,
   * are now in the cube, so what comes next acts on them: false while it is
   * held or kept open, or when its edits had to be dropped
   */
  finishApplied(): boolean {
    return this.finishWith() === 'closed';
  }

  /**
   * Runs what a shortcut does (F9, Ctrl+Z), which may finish the editor: when
   * it closes the editor while the keyboard was in it, the keyboard goes back
   * to the node (PLAN §11.8), as on Escape. The canvas takes the request.
   */
  runFromKeyboard(run: () => void, focusWasInEditor: boolean): void {
    const { nodeId } = this;
    run();
    if (focusWasInEditor && nodeId !== undefined && this.nodeId === undefined) {
      this.nodeToFocus = nodeId;
    }
  }

  clearNodeToFocus(): void {
    this.nodeToFocus = undefined;
  }

  /** Closes the panel, dropping the draft */
  cancel(): void {
    this.reset();
  }

  /**
   * Closes the panel without applying the draft, e.g. when another cube is
   * opened, saying so when that drops edits
   */
  discard(reason: CUBE_EDITOR_CLOSED_REASON): void {
    const { nodeId } = this;
    if (nodeId !== undefined && this.hasChanges) {
      this.notice = getEditorClosedNotice(nodeId, reason);
    }
    this.reset();
  }

  dismissNotice(): void {
    this.notice = undefined;
  }

  /** Stops following the cube; call when the page closes */
  dispose(): void {
    this.disposeSync();
  }

  private bind(node: QueryNode): void {
    this.nodeId = node.id;
    this.nodeKey = node.key;
    this.draft = createCubeNodeDraft(node, this.editorState);
  }

  private reset(): void {
    this.nodeId = undefined;
    this.nodeKey = undefined;
    this.draft = undefined;
  }

  /** Runs whenever the node with the panel's id is another object, or gone */
  private sync(): void {
    const { node } = this;
    if (this.nodeId === undefined || node?.key === this.nodeKey) {
      return;
    }
    if (this.hasChanges) {
      if (node && this.draft?.follow(node)) {
        this.nodeKey = node.key;
        return;
      }
      this.discard(
        node
          ? CUBE_EDITOR_CLOSED_REASON.NODE_CHANGED
          : CUBE_EDITOR_CLOSED_REASON.NODE_REMOVED,
      );
    } else if (node) {
      this.bind(node);
    } else {
      this.reset();
    }
  }
}
