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
  diffSchemas,
  type NodeRegistry,
  type Query,
  QueryEmitter,
  type QueryNode,
  RelationalTableSource,
  rereadQueryFilterValues,
  type Schema,
  type SchemaInferenceResult,
} from '@finos/legend-cube';
import type { GeneratorFn } from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import {
  DEFAULT_ROW_LIMIT,
  getSchemaDriftWarning,
  getSourceRecheckWarning,
  LEGEND_CUBE_USER_DATA_KEY,
  MAX_UNDO_STEPS,
} from '../__lib__/LegendCubeLabels.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../graph-manager/CubeEngine.js';
import { CubeExecutionState } from './CubeExecutionState.js';
import type { CubeHost } from './CubeHost.js';
import { CubeShowPureState } from './CubeShowPureState.js';
import { CubeSourcePickerState } from './CubeSourcePickerState.js';
import { CubeSpecTransferState } from './CubeSpecTransferState.js';

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
  readonly specTransfer: CubeSpecTransferState;
  readonly showPure: CubeShowPureState;

  document: CubeDocument;
  /** Earlier documents, oldest first */
  history: readonly CubeDocument[] = [];
  /** Engine errors by node id: shown with the node's own errors, never part of inference */
  hostIssues: ReadonlyMap<string, CubeHostIssue> = new Map();
  /**
   * Warnings by node key, e.g. a table that changed since the cube was saved:
   * shown on the node, never errors, and gone once the node is replaced
   */
  warnings: ReadonlyMap<number, readonly string[]> = new Map();
  /** Sources sent to the engine to be typed again, until it answers */
  private pendingSources: ReadonlySet<QueryNode> = new Set();
  /** The rows a run returns; kept per user, never in the cube */
  rowLimit: number;
  /**
   * The cube was saved by a newer version of Cube: it can be viewed and run,
   * but not changed, undone or exported (Settled before M1.8)
   */
  readOnly = false;
  /** Documents in the undo history that were read-only, so undo restores the flag */
  private readonly readOnlyDocuments = new WeakSet<CubeDocument>();

  constructor(host: CubeHost, document = new CubeDocument()) {
    makeObservable<CubeEditorState, 'pendingSources'>(this, {
      pendingSources: observable.ref,
      document: observable.ref,
      history: observable.ref,
      hostIssues: observable.ref,
      warnings: observable.ref,
      isResolvingSources: computed,
      rowLimit: observable,
      readOnly: observable,
      analysis: computed,
      emitter: computed,
      canUndo: computed,
      applyDocument: action,
      undo: action,
      importDocument: action,
      reresolveSources: flow,
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
    this.specTransfer = new CubeSpecTransferState(this);
    this.showPure = new CubeShowPureState(this);
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

  /** The cube shown has tables being typed again, after an import */
  get isResolvingSources(): boolean {
    return this.document.query.nodes.some((node) =>
      this.pendingSources.has(node),
    );
  }

  get canUndo(): boolean {
    return this.history.length > 0 && !this.readOnly;
  }

  /** The one way to change the cube; the document before goes to the undo history */
  applyDocument(next: CubeDocument): void {
    if (next === this.document) {
      return;
    }
    this.pushHistory();
    this.replaceDocument(next);
  }

  /**
   * Opens another cube in place of this one, e.g. an imported spec: one undo
   * step. Stops any run and any table being added, and drops the last run's
   * rows and errors, which belong to the cube before. Never runs the cube.
   */
  importDocument(next: CubeDocument, readOnly: boolean): void {
    this.pushHistory();
    this.execution.reset();
    this.sourcePicker.close();
    this.hostIssues = new Map();
    this.warnings = new Map();
    this.document = next;
    this.readOnly = readOnly;
    flowResult(this.reresolveSources()).catch(
      this.host.applicationStore.alertUnhandledError,
    );
  }

  /**
   * Types the cube's tables again, in one engine call, outside the undo
   * history (PLAN §10.3, Settled before M1.8):
   * - a table whose columns are the saved ones is left as it is;
   * - a table that changed takes its new columns, with a warning listing the
   *   changes;
   * - a table with saved columns that can't be typed keeps them, with a
   *   warning; one without them shows the engine's error.
   *
   * Then filter values saved as invalid text are read again against the
   * columns. The answer goes to every document holding the very source
   * objects that were typed: the cube shown and the undo snapshots taken
   * meanwhile, so undoing an edit made while the tables were typed keeps
   * them typed. A source the user changed meanwhile is a new object, and is
   * left alone.
   */
  *reresolveSources(): GeneratorFn<void> {
    const { context, query } = this.document;
    const sources = query.nodes.filter(
      (node): node is RelationalTableSource =>
        node instanceof RelationalTableSource,
    );
    if (!context || !sources.length) {
      return;
    }
    this.pendingSources = new Set([...this.pendingSources, ...sources]);
    let answers: ReadonlyMap<string, Schema | CubeEngineError>;
    try {
      answers = (yield this.host.engine.resolveSchemas(
        context.model,
        new Map(
          sources.map((source) => [
            source.id,
            [source.database, source.schema, source.table],
          ]),
        ),
      )) as Map<string, Schema | CubeEngineError>;
    } catch (error) {
      const failure =
        error instanceof CubeEngineError
          ? error
          : new CubeEngineError(
              CubeEngineErrorKind.NETWORK,
              error instanceof Error ? error.message : String(error),
            );
      answers = new Map(sources.map((source) => [source.id, failure]));
    } finally {
      this.pendingSources = new Set(
        [...this.pendingSources].filter(
          (node) => !sources.includes(node as RelationalTableSource),
        ),
      );
    }
    const warnings = new Map(this.warnings);
    /** Each typed source, by the object that was sent, and what replaces it */
    const replacements = new Map<
      RelationalTableSource,
      RelationalTableSource
    >();
    sources.forEach((source) => {
      const answer =
        answers.get(source.id) ??
        new CubeEngineError(
          CubeEngineErrorKind.COMPILE,
          'The engine gave no schema for this table',
          source.id,
        );
      const saved =
        source.resolution.kind === 'resolved'
          ? source.resolution.schema
          : undefined;
      if (answer instanceof CubeEngineError) {
        if (saved) {
          warnings.set(source.key, [getSourceRecheckWarning(answer.firstLine)]);
        } else {
          replacements.set(
            source,
            source.withResolution({ kind: 'failed', message: answer.detail }),
          );
        }
        return;
      }
      if (saved?.isIdenticalTo(answer)) {
        return;
      }
      const resolved = source.withResolution({
        kind: 'resolved',
        schema: answer,
      });
      if (saved) {
        warnings.set(resolved.key, [
          getSchemaDriftWarning(diffSchemas(saved, answer)),
        ]);
      }
      replacements.set(source, resolved);
    });
    this.warnings = warnings;
    if (!replacements.size) {
      return;
    }
    const check = (document: CubeDocument): CubeDocument => {
      let checked = document.query;
      replacements.forEach((resolved, source) => {
        if (checked.getNode(source.id) === source) {
          checked = checked.replace(resolved);
        }
      });
      if (checked === document.query) {
        return document;
      }
      const next = document.withQuery(
        rereadQueryFilterValues(checked, this.registry.queryRules),
      );
      if (this.readOnlyDocuments.has(document)) {
        this.readOnlyDocuments.add(next);
      }
      return next;
    };
    this.history = this.history.map(check);
    const next = check(this.document);
    if (next !== this.document) {
      this.replaceDocument(next);
    }
  }

  /**
   * Restores the document before the last edit; does nothing when there is
   * no history. A restored query is a new object (PLAN §4.3), so rows that
   * ran before the edit show as stale. An edit that left the query alone,
   * such as a rename, keeps it, with its rows and engine errors.
   */
  undo(): void {
    const previous = this.history.at(-1);
    if (!previous || !this.canUndo) {
      return;
    }
    this.history = this.history.slice(0, -1);
    this.readOnly = this.readOnlyDocuments.has(previous);
    const { query } = this.document;
    this.replaceDocument(
      previous.withQuery(
        previous.query === query ? query : previous.query.clone(),
      ),
    );
  }

  private pushHistory(): void {
    if (this.readOnly) {
      this.readOnlyDocuments.add(this.document);
    }
    this.history = [...this.history, this.document].slice(-MAX_UNDO_STEPS);
  }

  /** Engine errors belong to the query they came from, so they are dropped when the query changes */
  private replaceDocument(next: CubeDocument): void {
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
