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
  type CubeContext,
  DataSpaceSource,
  type QueryNode,
} from '@finos/legend-cube';
import { CUBE_DATA_SPACE_MESSAGE } from '../../__lib__/LegendCubeDataSpaceLabels.js';
import { getCubeProjectCoordinates } from '../../graph-manager/CubeProject.js';
import type {
  CubeDataSpaceEdit,
  CubeDataSpaceEditorSession,
} from '../CubeDataSpaceEditor.js';
import type { CubeEditorState } from '../CubeEditorState.js';
import { CubeNodeDraft, type CubeNodeDraftHistory } from './CubeNodeDraft.js';

/** What Apply would change of a source: its coordinates, as saved */
const getCoordinatesKey = (source: DataSpaceSource): string =>
  JSON.stringify([
    source.dataSpace,
    source.executionContext,
    source.entity ?? null,
    source.query ?? null,
    source.relation ?? null,
  ]);

/**
 * A data space source's edits (PLAN §11.25): the host's query builder,
 * opened on the source's data space, execution context and query, in a
 * session the draft lasts as long as. Apply stores the session's query as
 * the source's, unresolved, so the editor types it; an execution context the
 * query builder changed changes the cube's mapping and runtime too, unless
 * other data space sources run in the one it had.
 */
export class CubeDataSpaceDraft extends CubeNodeDraft<DataSpaceSource> {
  readonly editorState: CubeEditorState;
  /** The host's query builder on the source; none when it can't be opened */
  readonly session: CubeDataSpaceEditorSession | undefined;
  /** Why the query builder can't be opened */
  readonly openError: string | undefined;

  constructor(original: DataSpaceSource, editorState: CubeEditorState) {
    super(original);
    this.editorState = editorState;
    const { dataSpaceEditor } = editorState.host;
    const { context } = editorState.document;
    const project = context
      ? getCubeProjectCoordinates(context.model)
      : undefined;
    if (!dataSpaceEditor) {
      this.openError = CUBE_DATA_SPACE_MESSAGE.NO_EDITOR;
    } else if (!project) {
      this.openError = CUBE_DATA_SPACE_MESSAGE.NO_PROJECT;
    } else {
      this.session = dataSpaceEditor.openSession({
        project,
        dataSpace: original.dataSpace,
        executionContext: original.executionContext,
        query: original.query,
      });
    }
  }

  /** The query builder holds a query Cube can't run yet, which closing mustn't drop */
  override get hasEditsNotBuilt(): boolean {
    const { session } = this;
    return (
      session !== undefined &&
      !session.isLoading &&
      session.loadError === undefined &&
      session.hasChanges &&
      session.edit === undefined
    );
  }

  /** The query builder's own undo and redo, once it shows */
  override get history(): CubeNodeDraftHistory | undefined {
    const { session } = this;
    return session && !session.isLoading && session.loadError === undefined
      ? session
      : undefined;
  }

  /** The session's query, once it is one Cube can run and differs from the source's */
  private get edit(): CubeDataSpaceEdit | undefined {
    const { session } = this;
    return session?.hasChanges ? session.edit : undefined;
  }

  build(): DataSpaceSource {
    const { edit } = this;
    if (!edit) {
      return this.original;
    }
    const next = this.original.withCoordinates(edit.coordinates);
    return getCoordinatesKey(next) === getCoordinatesKey(this.original)
      ? this.original
      : next;
  }

  /**
   * The other data space sources of the cube, which share its execution
   * context with this one (`dataSpaceSourcesShareContext`)
   */
  private get others(): DataSpaceSource[] {
    return this.editorState.document.query.nodes.filter(
      (node): node is DataSpaceSource =>
        node instanceof DataSpaceSource && node.id !== this.original.id,
    );
  }

  /** Whether the session's query runs with another mapping or runtime than the cube's */
  private get changesContext(): boolean {
    const { edit } = this;
    const { context } = this.editorState.document;
    return (
      edit !== undefined &&
      context !== undefined &&
      (edit.mapping !== context.mapping || edit.runtime !== context.runtime)
    );
  }

  override get editedContext(): CubeContext | undefined {
    const { edit } = this;
    const { context } = this.editorState.document;
    return edit && context && this.changesContext && !this.others.length
      ? { ...context, mapping: edit.mapping, runtime: edit.runtime }
      : undefined;
  }

  /**
   * Why the query builder's edits can't be applied yet: its own reason, or
   * another execution context than the cube's other data space sources'.
   * None while there can be no edit: the editor's body says why, e.g. the
   * data space loading.
   */
  override get applyDisabledReason(): string | undefined {
    const { session } = this;
    if (
      !session ||
      session.isLoading ||
      session.loadError !== undefined ||
      !session.hasChanges
    ) {
      return undefined;
    }
    const { edit } = session;
    if (!edit) {
      return session.editProblem ?? CUBE_DATA_SPACE_MESSAGE.NO_QUERY;
    }
    const [other] = this.others;
    return other && this.changesContext
      ? CUBE_DATA_SPACE_MESSAGE.OTHER_CONTEXT(
          edit.coordinates.executionContext,
          other.executionContext,
        )
      : undefined;
  }

  /** Goes on, made from the node, when the source was only typed underneath it: the same coordinates */
  override follow(node: QueryNode): boolean {
    if (
      node instanceof DataSpaceSource &&
      node.id === this.original.id &&
      getCoordinatesKey(node) === getCoordinatesKey(this.original)
    ) {
      this.original = node;
      return true;
    }
    return false;
  }

  override dispose(): void {
    this.session?.dispose();
  }
}
