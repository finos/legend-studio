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

import type { DataSpaceQueryCoordinates, JsonObject } from '@finos/legend-cube';
import type { ReactNode } from 'react';
import type { CubeProjectCoordinates } from '../graph-manager/CubeProject.js';

// A data space as a source (PLAN §11.25): its editor is the host's query
// builder, so the builder keeps no dependency on legend-query-builder. Only a
// host with a data space editor offers the source.

/** A released data space in the host's depot, as the Data Space tab lists it */
export interface CubeDataSpaceSummary {
  /** Its path, e.g. `trading::TradesDataSpace` */
  readonly path: string;
  readonly title?: string | undefined;
  readonly description?: string | undefined;
  /** Its project, at the version listed: its latest release */
  readonly project: CubeProjectCoordinates;
}

/** An execution context of a data space: the mapping and runtime a cube on it runs with */
export interface CubeDataSpaceExecutionContext {
  /** Its key, e.g. `production` */
  readonly name: string;
  readonly title?: string | undefined;
  readonly mapping: string;
  readonly runtime: string;
}

/** A data space at one version, as the Data Space tab adds it */
export interface CubeDataSpaceDescription {
  readonly path: string;
  readonly title?: string | undefined;
  readonly executionContexts: readonly CubeDataSpaceExecutionContext[];
  /** The key of the context a new source starts in */
  readonly defaultExecutionContext: string;
}

/** What the host's data space editor opens on: a source of the cube */
export interface CubeDataSpaceEditorTarget {
  /** The cube's project, at its version */
  readonly project: CubeProjectCoordinates;
  readonly dataSpace: string;
  readonly executionContext: string;
  /** The query builder's lambda, as the source saved it; none while it is unset */
  readonly query?: JsonObject | undefined;
}

/** The query builder's query, as a source Cube can apply */
export interface CubeDataSpaceEdit {
  /** With the execution context the query builder runs in, which it may have changed */
  readonly coordinates: DataSpaceQueryCoordinates;
  /** The execution context's mapping, which the cube runs with */
  readonly mapping: string;
  /** The execution context's runtime, which the cube runs with */
  readonly runtime: string;
}

/**
 * The host's query builder opened on a data space source, while its node
 * editor shows it. Its fields are observable: Cube reads `edit` as the user
 * edits the query.
 */
export interface CubeDataSpaceEditorSession {
  /** The data space's model is still loading */
  readonly isLoading: boolean;
  /** Why the data space can't be edited, once loading failed */
  readonly loadError: string | undefined;
  /** The query differs from the one the session opened on */
  readonly hasChanges: boolean;
  /** The source the query is, once it is one Cube can run */
  readonly edit: CubeDataSpaceEdit | undefined;
  /**
   * Why there is no edit, e.g. no column picked yet, or an aggregate, which
   * is a Cube step after the source
   */
  readonly editProblem: string | undefined;
  /**
   * The query builder's own undo and redo, as its buttons do them: Cube's
   * shortcuts step through them while the session shows, in place of
   * Cube's undo, which would drop every change made in it
   */
  undo(): void;
  redo(): void;
  /** The editor closed: stops what the session does */
  dispose(): void;
}

/** The host's data space editor, e.g. Legend Analytics', from its query builder */
export interface CubeDataSpaceEditor {
  /** The released data spaces in the host's depot */
  listDataSpaces(): Promise<readonly CubeDataSpaceSummary[]>;
  /** A data space at a version of its project, with its execution contexts */
  describeDataSpace(
    project: CubeProjectCoordinates,
    dataSpace: string,
  ): Promise<CubeDataSpaceDescription>;
  /** Opens the query builder on a data space; the session loads its model */
  openSession(target: CubeDataSpaceEditorTarget): CubeDataSpaceEditorSession;
  /** The session's query builder, which fills the space it is given */
  renderSession(session: CubeDataSpaceEditorSession): ReactNode;
}
