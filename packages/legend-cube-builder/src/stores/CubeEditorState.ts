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
  buildSchemasAndValidity,
  createNodeRegistry,
  CubeDocument,
  type NodeRegistry,
  type Query,
  QueryEmitter,
  type SchemaInferenceResult,
} from '@finos/legend-cube';
import { action, computed, makeObservable, observable } from 'mobx';
import {
  DEFAULT_ROW_LIMIT,
  LEGEND_CUBE_USER_DATA_KEY,
  MAX_UNDO_STEPS,
} from '../__lib__/LegendCubeLabels.js';
import type { CubeEngineError } from '../graph-manager/CubeEngine.js';
import { CubeExecutionState } from './CubeExecutionState.js';
import type { CubeHost } from './CubeHost.js';
import { CubeSourcePickerState } from './CubeSourcePickerState.js';

/** An engine error placed on a node: its first line shows on the node, its detail in the grid */
export interface CubeHostIssue {
  readonly firstLine: string;
  readonly detail: string;
}

const isValidRowLimit = (value: number | undefined): value is number =>
  value !== undefined && Number.isSafeInteger(value) && value >= 1;

/**
 * The state of one Cube page (PLAN §7.8). The document is immutable: every
 * edit makes a new one through `applyDocument`, which keeps the previous one
 * for undo. Domain and port values are held by reference, never observed
 * deeply.
 */
export class CubeEditorState {
  readonly host: CubeHost;
  /** One registry for inference, emission and the saved spec */
  readonly registry: NodeRegistry;
  readonly execution: CubeExecutionState;
  readonly sourcePicker: CubeSourcePickerState;

  document: CubeDocument;
  /** Earlier documents, oldest first */
  history: readonly CubeDocument[] = [];
  /** Engine errors by node id: shown with the node's own errors, never part of inference */
  hostIssues: ReadonlyMap<string, CubeHostIssue> = new Map();
  /** The rows a run returns; kept per user, never in the cube */
  rowLimit: number;

  constructor(host: CubeHost, document = new CubeDocument()) {
    makeObservable(this, {
      document: observable.ref,
      history: observable.ref,
      hostIssues: observable.ref,
      rowLimit: observable,
      analysis: computed,
      emitter: computed,
      applyDocument: action,
      applyQuery: action,
      select: action,
      setHostIssue: action,
      clearHostIssues: action,
      setRowLimit: action,
    });
    this.host = host;
    this.registry = createNodeRegistry();
    this.document = document;
    const storedLimit = host.applicationStore.userDataService.getNumericValue(
      LEGEND_CUBE_USER_DATA_KEY.ROW_LIMIT,
    );
    this.rowLimit = isValidRowLimit(storedLimit)
      ? storedLimit
      : DEFAULT_ROW_LIMIT;
    this.execution = new CubeExecutionState(this);
    this.sourcePicker = new CubeSourcePickerState(this);
  }

  /** Each node's schema and errors, query-level rules included, as the emitter sees them */
  get analysis(): SchemaInferenceResult {
    return buildSchemasAndValidity(
      this.document.query,
      this.registry.queryRules,
    );
  }

  get emitter(): QueryEmitter {
    return new QueryEmitter(this.document.query, this.registry);
  }

  /**
   * The one way to change the cube. Engine errors belong to the query they
   * came from, so they are dropped when the query changes.
   */
  applyDocument(next: CubeDocument): void {
    if (next === this.document) {
      return;
    }
    this.history = [...this.history, this.document].slice(-MAX_UNDO_STEPS);
    if (next.query !== this.document.query) {
      this.hostIssues = new Map();
      this.execution.clearError();
    }
    this.document = next;
  }

  applyQuery(next: Query): void {
    this.applyDocument(this.document.withQuery(next));
  }

  /** Makes a node the capture node, the one Execute runs */
  select(nodeId: string): void {
    if (this.document.query.canSelect(nodeId)) {
      this.applyQuery(this.document.query.select(nodeId));
    }
  }

  setHostIssue(nodeId: string, error: CubeEngineError): void {
    this.hostIssues = new Map([
      ...this.hostIssues,
      [nodeId, { firstLine: error.firstLine, detail: error.detail }],
    ]);
  }

  clearHostIssues(): void {
    if (this.hostIssues.size) {
      this.hostIssues = new Map();
    }
  }

  /** Sets and remembers the row limit; a value that isn't a whole number of at least 1 is refused */
  setRowLimit(value: number): boolean {
    if (!isValidRowLimit(value)) {
      return false;
    }
    this.rowLimit = value;
    this.host.applicationStore.userDataService.persistValue(
      LEGEND_CUBE_USER_DATA_KEY.ROW_LIMIT,
      value,
    );
    return true;
  }

  /** Stops any run; call when the page closes */
  dispose(): void {
    this.execution.stop();
  }
}
