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
  DataProductAccessPointSource,
  IngestDatasetSource,
  buildSchemasAndValidity,
  createNodeRegistry,
  CubeDocument,
  diffSchemas,
  findLostSortOrders,
  MESSAGE_SORT_COLUMNS_CUT,
  MESSAGE_SORT_COLUMNS_DROPPED,
  MESSAGE_SORT_ORDER_LOST,
  type ModelContext,
  type NodeRegistry,
  type Query,
  QueryEmitter,
  type QueryNode,
  RelationalTableSource,
  rereadQueryFilterValues,
  type Schema,
  type SchemaInferenceResult,
  type SourceDefinition,
} from '@finos/legend-cube';
import type { CommandRegistrar } from '@finos/legend-application';
import type { GeneratorFn } from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import { LEGEND_CUBE_COMMAND_KEY } from '../__lib__/LegendCubeCommand.js';
import {
  CUBE_EDITOR_CLOSED_REASON,
  DEFAULT_ROW_LIMIT,
  getSchemaDriftWarning,
  getSourceRecheckWarning,
  LEGEND_CUBE_USER_DATA_KEY,
  MAX_UNDO_STEPS,
} from '../__lib__/LegendCubeLabels.js';
import {
  CUBE_DATA_PRODUCT_RECHECK_MESSAGE,
  getAccessPointDriftWarning,
  getAccessPointRecheckWarning,
} from '../__lib__/LegendCubeDataProductLabels.js';
import {
  CUBE_INGEST_RECHECK_MESSAGE,
  getDataSetDriftWarning,
  getDataSetRecheckWarning,
} from '../__lib__/LegendCubeIngestLabels.js';
import { isCubeDataProductModel } from '../graph-manager/CubeDataProduct.js';
import { isCubeIngestModel } from '../graph-manager/CubeIngest.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeModelOutline,
} from '../graph-manager/CubeEngine.js';
import { getDatabaseType } from '../graph-manager/CubeModelOutlineHelper.js';
import { recheckCubeDataProductSources } from './CubeDataProductRecheck.js';
import { recheckCubeIngestSources } from './CubeIngestRecheck.js';
import { CubeDataProductRuntimeState } from './CubeDataProductRuntimeState.js';
import { CubeExamplesState } from './CubeExamplesState.js';
import { CubeExecutionState } from './CubeExecutionState.js';
import type { CubeHost } from './CubeHost.js';
import { CubeNodeEditorState } from './CubeNodeEditorState.js';
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

/** Focus is where text is typed, so Ctrl+Z is the field's own undo */
const isTypingText = (): boolean => {
  const element = document.activeElement;
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    (element instanceof HTMLElement && element.isContentEditable)
  );
};

/** A source Cube types again to see drift: a table, or a data product's access point */
type RecheckedSource =
  | RelationalTableSource
  | DataProductAccessPointSource
  | IngestDatasetSource;

/**
 * The state of one Cube page (PLAN §7.8). The document is immutable: every
 * edit makes a new one through `applyDocument`, which keeps the previous one
 * for undo. Domain and port values are held by reference, never observed
 * deeply.
 */
export class CubeEditorState implements CommandRegistrar {
  readonly host: CubeHost;
  /** One registry for inference, emission and the saved spec */
  readonly registry: NodeRegistry;
  readonly execution: CubeExecutionState;
  /** Where a lakehouse cube runs, a data product's or an ingest one's: its class and warehouse */
  readonly dataProductRuntime: CubeDataProductRuntimeState;
  readonly sourcePicker: CubeSourcePickerState;
  readonly specTransfer: CubeSpecTransferState;
  readonly examples: CubeExamplesState;
  readonly showPure: CubeShowPureState;
  readonly nodeEditor: CubeNodeEditorState;

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
  /**
   * The outline of each model the cube used, loaded when an editor needs it,
   * e.g. for the Join's 'type unknown' warning; by reference, never observed
   * deeply
   */
  private modelOutlines: ReadonlyMap<ModelContext, CubeModelOutline> =
    new Map();
  /** Sources sent to the engine to be typed again, until it answers */
  private pendingSources: ReadonlySet<QueryNode> = new Set();
  /** The rows a run returns; kept per user, never in the cube */
  rowLimit: number;
  /** The palette shows icons only; kept per user, never in the cube */
  isPaletteCollapsed: boolean;
  /**
   * The cube was saved by a newer version of Cube: it can be viewed and run,
   * but not changed, undone or exported (Settled before M1.8)
   */
  readOnly = false;
  /** Documents in the undo history that were read-only, so undo restores the flag */
  private readonly readOnlyDocuments = new WeakSet<CubeDocument>();
  /** Documents an import replaced: undoing back to one opens another cube again */
  private readonly importedOver = new WeakSet<CubeDocument>();

  constructor(host: CubeHost, document = new CubeDocument()) {
    makeObservable<CubeEditorState, 'pendingSources' | 'modelOutlines'>(this, {
      pendingSources: observable.ref,
      modelOutlines: observable.ref,
      modelOutline: computed,
      loadModelOutline: flow,
      document: observable.ref,
      history: observable.ref,
      hostIssues: observable.ref,
      warnings: observable.ref,
      derivedWarnings: computed,
      isResolvingSources: computed,
      rowLimit: observable,
      isPaletteCollapsed: observable,
      readOnly: observable,
      analysis: computed,
      emitter: computed,
      canUndo: computed,
      isDialogOpen: computed,
      applyDocument: action,
      undo: action,
      importDocument: action,
      reresolveSources: flow,
      refreshSource: flow,
      applyQuery: action,
      select: action,
      connect: action,
      addNode: action,
      addConfiguredNode: action,
      dropNode: action,
      removeNode: action,
      swapInputs: action,
      setShowGraph: action,
      setPaletteCollapsed: action,
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
    this.isPaletteCollapsed =
      host.applicationStore.userDataService.getBooleanValue(
        LEGEND_CUBE_USER_DATA_KEY.PALETTE_COLLAPSED,
      ) ?? false;
    this.execution = new CubeExecutionState(this);
    this.dataProductRuntime = new CubeDataProductRuntimeState(this);
    this.sourcePicker = new CubeSourcePickerState(this);
    this.specTransfer = new CubeSpecTransferState(this);
    this.examples = new CubeExamplesState(this);
    this.showPure = new CubeShowPureState(this);
    this.nodeEditor = new CubeNodeEditorState(this);
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

  /** The source is being typed again by the engine, e.g. after an import */
  isPendingSource(node: QueryNode): boolean {
    return this.pendingSources.has(node);
  }

  /**
   * Warnings worked out from the query, by node id: a Sort whose order is
   * lost before it is used (PLAN §11.4). Never stored and never errors, so
   * Execute stays enabled; they go as soon as the query no longer loses it.
   * A partial loss names each node that removes some of the Sort's columns,
   * then the columns that came after a removed one. A loss waits until the
   * Sort and every node it names have no errors, e.g. a Restrict just added,
   * with no column yet: their own errors come first.
   */
  get derivedWarnings(): ReadonlyMap<string, readonly string[]> {
    const { validity, schemas } = this.analysis;
    const isValid = (nodeId: string): boolean =>
      validity.get(nodeId)?.length === 0;
    const { query } = this.document;
    return new Map(
      Array.from(findLostSortOrders(query, undefined, schemas))
        .filter(
          ([sortId, loss]) =>
            isValid(sortId) &&
            isValid(loss.nodeId) &&
            (loss.removals ?? []).every(({ nodeId }) => isValid(nodeId)),
        )
        .map(([sortId, loss]) => [
          sortId,
          loss.removals
            ? [
                ...loss.removals.map(({ nodeId, columns }) =>
                  MESSAGE_SORT_COLUMNS_DROPPED(columns, nodeId),
                ),
                ...(loss.cutColumns?.length
                  ? [MESSAGE_SORT_COLUMNS_CUT(loss.cutColumns)]
                  : []),
              ]
            : [MESSAGE_SORT_ORDER_LOST(loss.nodeId)],
        ]),
    );
  }

  /** A node's warnings: the stored ones (by key), then the derived ones (by id) */
  getNodeWarnings(node: QueryNode): readonly string[] {
    return [
      ...(this.warnings.get(node.key) ?? []),
      ...(this.derivedWarnings.get(node.id) ?? []),
    ];
  }

  /**
   * The node's errors, each once: its own and those of the query rules, then
   * the first line of the engine's error on it
   */
  getNodeErrors(nodeId: string): readonly string[] {
    const hostIssue = this.hostIssues.get(nodeId);
    return [
      ...new Set([
        ...(this.analysis.validity.get(nodeId) ?? []),
        ...(hostIssue ? [hostIssue.firstLine] : []),
      ]),
    ];
  }

  /** The outline of the cube's model, once an editor has loaded it */
  get modelOutline(): CubeModelOutline | undefined {
    const model = this.document.context?.model;
    return model === undefined ? undefined : this.getModelOutline(model);
  }

  /** The outline of a model, once loaded */
  getModelOutline(model: ModelContext): CubeModelOutline | undefined {
    return this.modelOutlines.get(model);
  }

  /**
   * The database type a run of the query up to the node needs, with the
   * model's runtime (PLAN §11.4), from the model's outline once it is loaded
   * (`loadModelOutline`): the type of the runtime's connections to the
   * databases the node reads. None without an outline, which writes every
   * operation the native way.
   */
  getRunDatabaseType(
    query: Query,
    nodeId: string,
    model: ModelContext,
    runtime: string,
  ): string | undefined {
    const outline = this.getModelOutline(model);
    if (!outline) {
      return undefined;
    }
    const databases = new Set<string>();
    const visit = (id: string): void => {
      const node = query.getNode(id);
      if (node instanceof RelationalTableSource) {
        databases.add(node.database);
      }
      query
        .getInputIds(id)
        .forEach((inputId) => inputId !== undefined && visit(inputId));
    };
    visit(nodeId);
    return getDatabaseType(outline, runtime, [...databases]);
  }

  /**
   * Loads the outline of a model, the cube's by default, once per model. It
   * only adds warnings and database types, so a model that fails to load
   * shows none and runs every operation the native way.
   */
  *loadModelOutline(
    model: ModelContext | undefined = this.document.context?.model,
  ): GeneratorFn<void> {
    if (model === undefined || this.modelOutlines.has(model)) {
      return;
    }
    try {
      const outline = (yield this.host.modelCatalog.loadOutline(
        model,
      )) as CubeModelOutline;
      this.modelOutlines = new Map([...this.modelOutlines, [model, outline]]);
    } catch {
      // no outline, no warning: nothing is blocked on it
    }
  }

  /** One of Cube's dialogs is open: the source picker, Import or Export, Show Pure */
  get isDialogOpen(): boolean {
    return (
      this.sourcePicker.isOpen ||
      this.examples.isOpen ||
      this.specTransfer.mode !== undefined ||
      this.showPure.isOpen
    );
  }

  /**
   * The page's keyboard shortcuts, while it is open (spec §17.12). Each does
   * nothing when its button can't be used, and nothing while a Cube dialog
   * is open, since a dialog doesn't stop the app's shortcuts (user's choice,
   * 2026-10-07). Undo leaves Ctrl+Z to a text field that has the focus.
   */
  registerCommands(): void {
    const { commandService, alertUnhandledError } = this.host.applicationStore;
    commandService.registerCommand({
      key: LEGEND_CUBE_COMMAND_KEY.EXECUTE,
      trigger: () =>
        !this.isDialogOpen &&
        this.execution.canExecute &&
        !this.execution.isRunning,
      action: () => {
        flowResult(this.execution.execute()).catch(alertUnhandledError);
      },
    });
    commandService.registerCommand({
      key: LEGEND_CUBE_COMMAND_KEY.UNDO,
      trigger: () => !this.isDialogOpen && this.canUndo && !isTypingText(),
      action: () => this.undo(),
    });
  }

  deregisterCommands(): void {
    Object.values(LEGEND_CUBE_COMMAND_KEY).forEach((key) =>
      this.host.applicationStore.commandService.deregisterCommand(key),
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
   * step. Stops any run and any table being added, closes the node editor
   * without applying its edits, and drops the last run's rows and errors,
   * which belong to the cube before. Never runs the cube.
   */
  importDocument(next: CubeDocument, readOnly: boolean): void {
    this.pushHistory();
    this.importedOver.add(this.document);
    this.execution.reset();
    this.sourcePicker.close();
    this.nodeEditor.discard(CUBE_EDITOR_CLOSED_REASON.CUBE_REPLACED);
    this.hostIssues = new Map();
    // warnings are kept: they are by node key, which the imported nodes don't
    // share, and Undo brings back the nodes they belong to
    this.document = next;
    this.readOnly = readOnly;
    flowResult(this.reresolveSources()).catch(
      this.host.applicationStore.alertUnhandledError,
    );
  }

  /**
   * Types the cube's sources again, outside the undo history (PLAN §10.3,
   * Settled before M1.8): its tables in one engine call, a data product
   * cube's access points through the catalog, from the deployed artifact at
   * the cube's version (PLAN §6.8). Warnings name the kind of source:
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
   *
   * `only` types just these sources of the cube shown, e.g. one Refresh. A
   * table found unchanged loses any earlier warning. `fresh` reads a data
   * product's artifact again rather than what this page visit read.
   */
  *reresolveSources(
    only?: readonly RecheckedSource[],
    fresh = false,
  ): GeneratorFn<void> {
    const { context, query } = this.document;
    if (!context) {
      return;
    }
    const kept = (only ?? query.nodes).filter(
      (node) => query.getNode(node.id) === node,
    );
    const tables = kept.filter(
      (node): node is RelationalTableSource =>
        node instanceof RelationalTableSource,
    );
    // an access point on a cube of tables is the no-mix rule's to flag
    const accessPoints = isCubeDataProductModel(context.model)
      ? kept.filter(
          (node): node is DataProductAccessPointSource =>
            node instanceof DataProductAccessPointSource,
        )
      : [];
    const dataSets = isCubeIngestModel(context.model)
      ? kept.filter(
          (node): node is IngestDatasetSource =>
            node instanceof IngestDatasetSource,
        )
      : [];
    const sources: readonly RecheckedSource[] = [
      ...tables,
      ...accessPoints,
      ...dataSets,
    ];
    if (!sources.length) {
      return;
    }
    this.pendingSources = new Set([...this.pendingSources, ...sources]);
    let answers: ReadonlyMap<string, Schema | CubeEngineError>;
    try {
      const [tableAnswers, accessPointAnswers, dataSetAnswers] =
        (yield Promise.all([
          tables.length
            ? this.host.engine
                .resolveSchemas(
                  context.model,
                  new Map(
                    tables.map((source) => [
                      source.id,
                      [source.database, source.schema, source.table],
                    ]),
                  ),
                )
                .catch((error: unknown) => {
                  const failure =
                    error instanceof CubeEngineError
                      ? error
                      : new CubeEngineError(
                          CubeEngineErrorKind.NETWORK,
                          error instanceof Error
                            ? error.message
                            : String(error),
                        );
                  return new Map(tables.map((source) => [source.id, failure]));
                })
            : new Map(),
          accessPoints.length
            ? recheckCubeDataProductSources(
                this.host.dataProductCatalog,
                context.model,
                accessPoints,
                fresh,
              )
            : new Map(),
          dataSets.length
            ? recheckCubeIngestSources(
                this.host.ingestCatalog,
                context.model,
                dataSets,
                fresh,
              )
            : new Map(),
        ])) as ReadonlyMap<string, Schema | CubeEngineError>[];
      answers = new Map([
        ...(tableAnswers ?? []),
        ...(accessPointAnswers ?? []),
        ...(dataSetAnswers ?? []),
      ]);
    } finally {
      this.pendingSources = new Set(
        [...this.pendingSources].filter(
          (node) => !sources.includes(node as RecheckedSource),
        ),
      );
    }
    const warnings = new Map(this.warnings);
    /** Each typed source, by the object that was sent, and what replaces it */
    const replacements = new Map<RecheckedSource, RecheckedSource>();
    sources.forEach((source) => {
      const isAccessPoint = source instanceof DataProductAccessPointSource;
      const isDataSet = source instanceof IngestDatasetSource;
      const answer =
        answers.get(source.id) ??
        new CubeEngineError(
          CubeEngineErrorKind.COMPILE,
          isAccessPoint
            ? CUBE_DATA_PRODUCT_RECHECK_MESSAGE.NO_ANSWER
            : isDataSet
              ? CUBE_INGEST_RECHECK_MESSAGE.NO_ANSWER
              : 'The engine gave no schema for this table',
          source.id,
        );
      const saved =
        source.resolution.kind === 'resolved'
          ? source.resolution.schema
          : undefined;
      if (answer instanceof CubeEngineError) {
        if (saved) {
          warnings.set(source.key, [
            isAccessPoint
              ? getAccessPointRecheckWarning(answer.firstLine)
              : isDataSet
                ? getDataSetRecheckWarning(answer.firstLine)
                : getSourceRecheckWarning(answer.firstLine),
          ]);
        } else if (
          source.resolution.kind !== 'failed' ||
          source.resolution.message !== answer.detail
        ) {
          // a table that fails as it did before is left as it is
          replacements.set(
            source,
            source.withResolution({ kind: 'failed', message: answer.detail }),
          );
        }
        return;
      }
      if (saved?.isIdenticalTo(answer)) {
        warnings.delete(source.key);
        return;
      }
      const resolved = source.withResolution({
        kind: 'resolved',
        schema: answer,
      });
      if (saved) {
        const diff = diffSchemas(saved, answer);
        warnings.set(resolved.key, [
          isAccessPoint
            ? getAccessPointDriftWarning(diff)
            : isDataSet
              ? getDataSetDriftWarning(diff)
              : getSchemaDriftWarning(diff),
        ]);
      }
      replacements.set(source, resolved);
    });
    this.warnings = warnings;
    if (!replacements.size) {
      return;
    }
    // documents that shared a query share its checked one, so an undo
    // between them still finds the query unchanged
    const checkedQueries = new Map<Query, Query>();
    const check = (document: CubeDocument): CubeDocument => {
      let checked = checkedQueries.get(document.query);
      if (checked === undefined) {
        let replaced = document.query;
        replacements.forEach((resolved, source) => {
          if (replaced.getNode(source.id) === source) {
            replaced = replaced.replace(resolved);
          }
        });
        checked =
          replaced === document.query
            ? replaced
            : rereadQueryFilterValues(replaced, this.registry.queryRules);
        checkedQueries.set(document.query, checked);
      }
      if (checked === document.query) {
        return document;
      }
      const next = document.withQuery(checked);
      if (this.readOnlyDocuments.has(document)) {
        this.readOnlyDocuments.add(next);
      }
      if (this.importedOver.has(document)) {
        this.importedOver.add(next);
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
   * Types a source again, from its Source panel (spec §17.6), as a re-check
   * after an import does: a table with the engine, an access point through
   * the catalog. No undo step, nothing changes when its columns are the
   * same, and a warning lists any change.
   */
  *refreshSource(nodeId: string): GeneratorFn<void> {
    const source = this.document.query.getNode(nodeId);
    if (
      source instanceof RelationalTableSource ||
      source instanceof DataProductAccessPointSource ||
      source instanceof IngestDatasetSource
    ) {
      // a Refresh reads the deployed artifact or definition again
      yield flowResult(this.reresolveSources([source], true));
    }
  }

  /**
   * Restores the document before the last edit; does nothing when there is
   * no history. A restored query is a new object (PLAN §4.3), so rows that
   * ran before the edit show as stale. An edit that left the query and the
   * context alone, such as a rename, keeps them, with the rows and engine
   * errors; undoing a warehouse edit brings back the context the rows ran
   * with. Undoing an
   * import closes the node editor and the picker, as the import did.
   */
  undo(): void {
    const previous = this.history.at(-1);
    if (!previous || !this.canUndo) {
      return;
    }
    this.history = this.history.slice(0, -1);
    this.readOnly = this.readOnlyDocuments.has(previous);
    if (this.importedOver.has(previous)) {
      // the cube before an import is another cube, as the import was
      this.sourcePicker.close();
      this.nodeEditor.discard(CUBE_EDITOR_CLOSED_REASON.CUBE_REPLACED);
    }
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

  /**
   * Engine errors belong to the query and the context they came from, so
   * they are dropped when either changes, e.g. a data product cube's
   * warehouse
   */
  private replaceDocument(next: CubeDocument): void {
    if (
      next.query !== this.document.query ||
      next.context !== this.document.context
    ) {
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

  /**
   * Feeds a node into another, on the port if given, else the first free one.
   * Does nothing when the query doesn't allow it or the cube is read-only.
   */
  connect(sourceId: string, targetId: string, port?: string): void {
    const { query } = this.document;
    if (!this.readOnly && query.canConnect(sourceId, targetId, port)) {
      this.applyQuery(query.connect(sourceId, targetId, port));
    }
  }

  /**
   * The kinds of source the host serves: data products and ingest data sets
   * only with their catalogs. The cube's kind may still disable one
   * (`canAddNode`)
   */
  get offeredSources(): readonly SourceDefinition[] {
    return this.registry.sources.filter(
      (definition) =>
        (definition.type !== DataProductAccessPointSource.TYPE ||
          this.sourcePicker.dataProductTab.isAvailable) &&
        (definition.type !== IngestDatasetSource.TYPE ||
          this.sourcePicker.ingestTab.isAvailable),
    );
  }

  /**
   * Whether a node of the type can be added: a transform, unconnected or
   * spliced in after `afterId`, when the query allows it; a source only
   * unconnected, through the source picker. Never while the cube is read-only.
   */
  canAddNode(type: string, afterId?: string): boolean {
    const definition = this.registry.get(type);
    if (this.readOnly || !definition) {
      return false;
    }
    if (definition.kind === 'source') {
      // through its tab, which the cube's kind may disable (PLAN §6.8)
      const tab = this.sourcePicker.tabForSourceType(type);
      return (
        afterId === undefined &&
        tab !== undefined &&
        this.sourcePicker.isTabEnabled(tab)
      );
    }
    const { query } = this.document;
    return query.canAdd(definition.create(query.generateId(type)), afterId);
  }

  /**
   * Adds a node of the type, as the palette and the context menu do (spec
   * §17.4): a transform with its default settings, unconnected or spliced in
   * after `afterId`; a source opens the source picker, which adds it once
   * the engine has typed it. Does nothing `canAddNode` refuses.
   */
  addNode(type: string, afterId?: string): void {
    const definition = this.registry.get(type);
    if (!definition || !this.canAddNode(type, afterId)) {
      return;
    }
    if (definition.kind === 'source') {
      this.sourcePicker.open(this.sourcePicker.tabForSourceType(type)?.key);
      return;
    }
    const { query } = this.document;
    this.applyQuery(
      query.add(definition.create(query.generateId(type)), afterId),
    );
  }

  /**
   * Adds a node made elsewhere, with its settings, as the grid's quick
   * actions do (spec §12.4): spliced in after `afterId`, so it becomes the
   * node that runs when that one did, as one undo step. Does nothing in a
   * read-only cube, or when the query can't take it.
   */
  addConfiguredNode(node: QueryNode, afterId?: string): void {
    const { query } = this.document;
    if (this.readOnly || !query.canAdd(node, afterId)) {
      return;
    }
    this.applyQuery(query.add(node, afterId));
  }

  /** Whether dropping a node on another does anything: connect it, or else move it after it */
  canDropNode(nodeId: string, targetId: string): boolean {
    const { query } = this.document;
    return (
      !this.readOnly &&
      (query.canConnect(nodeId, targetId) || query.canMove(nodeId, targetId))
    );
  }

  /**
   * Drops a node on another (spec §17.4): it feeds the target's first free
   * port if it can, else it moves to after the target
   */
  dropNode(nodeId: string, targetId: string): void {
    if (!this.canDropNode(nodeId, targetId)) {
      return;
    }
    const { query } = this.document;
    this.applyQuery(
      query.canConnect(nodeId, targetId)
        ? query.connect(nodeId, targetId)
        : query.move(nodeId, targetId),
    );
  }

  canRemoveNode(nodeId: string): boolean {
    return !this.readOnly && this.document.query.canRemove(nodeId);
  }

  /**
   * Removes a node, healing the chain around it. Removing the last node also
   * clears the cube's model and runtime, in the same undo step, so the next
   * table can come from any model (user's choice, 2026-10-07).
   */
  removeNode(nodeId: string): void {
    if (!this.canRemoveNode(nodeId)) {
      return;
    }
    // the node editor, if it shows the node, closes by itself
    const query = this.document.query.remove(nodeId);
    this.applyDocument(
      query.isEmpty
        ? this.document.withContext(undefined).withQuery(query)
        : this.document.withQuery(query),
    );
  }

  canSwapInputs(nodeId: string): boolean {
    return !this.readOnly && this.document.query.canSwapInputs(nodeId);
  }

  /** Swaps a binary node's two inputs; its settings follow them, e.g. a Join's key columns */
  swapInputs(nodeId: string): void {
    if (this.canSwapInputs(nodeId)) {
      this.applyQuery(this.document.query.swapInputs(nodeId));
    }
  }

  /**
   * Shows or hides the graph, which the cube saves (spec §17.1). An undoable
   * edit that leaves the query, and so the rows, as they are (M1.8b).
   */
  setShowGraph(showGraph: boolean): void {
    const { meta } = this.document;
    if (meta.presentation.showGraph !== showGraph) {
      this.applyDocument(
        this.document.withMeta({
          ...meta,
          presentation: { ...meta.presentation, showGraph },
        }),
      );
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

  /** Collapses or expands the palette, and remembers it for the user */
  setPaletteCollapsed(collapsed: boolean): void {
    this.isPaletteCollapsed = collapsed;
    this.host.applicationStore.userDataService.persistValue(
      LEGEND_CUBE_USER_DATA_KEY.PALETTE_COLLAPSED,
      collapsed,
    );
  }

  /** Stops any run; call when the page closes */
  dispose(): void {
    this.execution.stop();
    this.nodeEditor.dispose();
  }
}
