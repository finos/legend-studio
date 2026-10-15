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
  ColumnComparisonFilter,
  type CubeDocument,
  Extend,
  type ExtendColumn,
  Filter,
  FilterOperator,
  getVariantDatabaseProblem,
  Restrict,
  Schema,
  type SchemaColumn,
} from '@finos/legend-cube';
import { assertErrorThrown, type GeneratorFn } from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import {
  CubeEngineError,
  type CubeParsedExpression,
} from '../../graph-manager/CubeEngine.js';
import type { CubeEditorState } from '../CubeEditorState.js';
import { getCubeGridActionBlocker } from '../CubeGridQuickActions.js';
import {
  CubeQueryRunAborted,
  type CubeQueryRunResult,
  runCubeQuery,
} from '../CubeQueryRun.js';
import {
  type CubeJsonField,
  type CubeJsonOffer,
  getCubeJsonFields,
  getFreeCubeColumnName,
} from './CubeJsonOffers.js';
import { type CubeJsonSample, inferCubeJsonShape } from './CubeJsonShape.js';

/** How many values Explore JSON reads first (user, 2026-10-14) */
export const CUBE_JSON_SAMPLE_SIZE = 1000;

/** No limit: Read every row (the run's `limit(rowLimit + 1)` then takes them all) */
const EVERY_ROW = Number.MAX_SAFE_INTEGER;

/** The runs Explore JSON makes, as Runs lists them */
export const CUBE_JSON_RUN_LABEL = {
  sample: (column: string): string => `Sample of ${column}`,
  everyRow: (column: string): string => `Every value of ${column}`,
};

/** A field's path as one key, for ticking */
const pathKey = (path: readonly string[]): string => JSON.stringify(path);

/** A ticked offer, by its field and its key */
const offerKey = (path: readonly string[], offer: CubeJsonOffer): string =>
  `${pathKey(path)} ${offer.key}`;

/**
 * Explore JSON (PLAN §11.20): a Variant column's documents, sampled through
 * the cube's own query path (the query up to the node that ran, the column
 * alone, its non-empty values), so the sample is listed in Runs and can be
 * stopped; their fields as a tree; and the offers ticked, added as one Extend
 * after the node that ran, as one undo step. The engine parses each column's
 * text first; the background check types the Extend, as any typed in the
 * editor.
 */
export class CubeJsonExplorerState {
  readonly editorState: CubeEditorState;

  /** The column explored; `undefined` while closed */
  column: SchemaColumn | undefined;
  /** What was read: the first values, or every row */
  sample: CubeJsonSample | undefined;
  isReading = false;
  isAdding = false;
  /** Why the column couldn't be read, or the columns added */
  error: string | undefined;
  search = '';
  /** The field whose offers show */
  selectedPath: readonly string[] = [];
  /** The ticked offers, by field and key */
  ticked = new Map<string, CubeJsonOffer>();

  /** The cube as it was when the dialog opened, and the node that ran */
  private document: CubeDocument | undefined;
  private afterId: string | undefined;
  private controller: AbortController | undefined;

  constructor(editorState: CubeEditorState) {
    makeObservable<CubeJsonExplorerState, 'document' | 'afterId'>(this, {
      column: observable.ref,
      sample: observable.ref,
      isReading: observable,
      isAdding: observable,
      error: observable,
      search: observable,
      selectedPath: observable.ref,
      ticked: observable.shallow,
      document: observable.ref,
      afterId: observable,
      isOpen: computed,
      fields: computed,
      selectedField: computed,
      tickedOffers: computed,
      open: flow,
      read: flow,
      add: flow,
      stop: action,
      close: action,
      setSearch: action,
      select: action,
      toggle: action,
    });
    this.editorState = editorState;
  }

  get isOpen(): boolean {
    return this.column !== undefined;
  }

  /** The column's fields, from what was read */
  get fields(): CubeJsonField | undefined {
    return this.column && this.sample
      ? getCubeJsonFields(this.column.name, this.sample)
      : undefined;
  }

  get selectedField(): CubeJsonField | undefined {
    const key = pathKey(this.selectedPath);
    const find = (field: CubeJsonField): CubeJsonField | undefined =>
      pathKey(field.path) === key
        ? field
        : field.children.reduce<CubeJsonField | undefined>(
            (found, child) => found ?? find(child),
            undefined,
          );
    return this.fields ? find(this.fields) : undefined;
  }

  /** The offers ticked, in the order ticked */
  get tickedOffers(): CubeJsonOffer[] {
    return [...this.ticked.values()];
  }

  isTicked(path: readonly string[], offer: CubeJsonOffer): boolean {
    return this.ticked.has(offerKey(path, offer));
  }

  /**
   * Why Explore JSON can't be used on the column now: the grid's blockers
   * (stale rows, edits, a run, a read-only cube), or a database without
   * JSON; `undefined` when it can
   */
  getDisabledReason(): string | undefined {
    const { editorState } = this;
    const blocker = getCubeGridActionBlocker(editorState);
    if (blocker) {
      return blocker;
    }
    const { context, query } = editorState.document;
    const nodeId = query.selected;
    return context?.runtime === undefined || nodeId === undefined
      ? undefined
      : getVariantDatabaseProblem(
          editorState.getRunDatabaseType(
            query,
            nodeId,
            context.model,
            context.runtime,
          ),
        );
  }

  /** Opens the dialog on a column of the rows shown, and reads its first values */
  *open(column: SchemaColumn): GeneratorFn<void> {
    const { editorState } = this;
    const { document } = editorState;
    this.stop();
    this.column = column;
    this.document = document;
    this.afterId = document.query.selected;
    this.sample = undefined;
    this.error = undefined;
    this.search = '';
    this.selectedPath = [];
    this.ticked.clear();
    // the database the column's rows run on, which must read JSON: its
    // model's outline may not have been needed by the run that showed them
    const context = document.context;
    const nodeId = this.afterId;
    if (context?.runtime !== undefined && nodeId !== undefined) {
      yield flowResult(editorState.loadModelOutline(context.model));
      const problem = getVariantDatabaseProblem(
        editorState.getRunDatabaseType(
          document.query,
          nodeId,
          context.model,
          context.runtime,
        ),
      );
      if (problem) {
        this.error = problem;
        return;
      }
    }
    yield flowResult(this.read(false));
  }

  /** Reads the column's first values, or every row: either replaces what was read */
  *read(everyRow: boolean): GeneratorFn<void> {
    const { editorState, column, document, afterId } = this;
    const context = document?.context;
    if (
      !column ||
      !document ||
      afterId === undefined ||
      context?.runtime === undefined ||
      this.isReading
    ) {
      return;
    }
    const controller = new AbortController();
    this.controller = controller;
    this.isReading = true;
    this.error = undefined;
    try {
      const { query } = document;
      // the query up to the node that ran, then the column alone and its
      // non-empty values, each after the one before; the query isn't kept
      const restrict = new Restrict(query.generateId(Restrict.TYPE), [
        column.name,
      ]);
      const nonEmpty = new Filter(
        query.generateId(Filter.TYPE),
        new ColumnComparisonFilter(column.name, FilterOperator.IS_NOT_EMPTY),
      );
      const values = [restrict, nonEmpty].reduce(
        (built, node) => built.add(node, built.selected),
        query.selected === afterId ? query : query.select(afterId),
      );
      const result = (yield runCubeQuery(editorState, {
        query: values,
        model: context.model,
        runtime: context.runtime,
        schema: new Schema([column]),
        rowLimit: everyRow ? EVERY_ROW : CUBE_JSON_SAMPLE_SIZE,
        abortController: controller,
        label: everyRow
          ? CUBE_JSON_RUN_LABEL.everyRow(column.name)
          : CUBE_JSON_RUN_LABEL.sample(column.name),
      })) as CubeQueryRunResult;
      if (this.controller !== controller) {
        return;
      }
      this.sample = inferCubeJsonShape(
        result.rows.map((row) => row[0] ?? null),
        !result.limited,
      );
    } catch (error) {
      if (
        this.controller !== controller ||
        error instanceof CubeQueryRunAborted
      ) {
        return;
      }
      assertErrorThrown(error);
      this.error =
        error instanceof CubeEngineError ? error.firstLine : error.message;
    } finally {
      if (this.controller === controller) {
        this.controller = undefined;
        this.isReading = false;
      }
    }
  }

  /** Stops a read in flight, keeping what was read before it */
  stop(): void {
    this.controller?.abort();
    this.controller = undefined;
    this.isReading = false;
  }

  setSearch(search: string): void {
    this.search = search;
  }

  select(path: readonly string[]): void {
    this.selectedPath = path;
  }

  toggle(path: readonly string[], offer: CubeJsonOffer): void {
    const key = offerKey(path, offer);
    if (this.ticked.has(key)) {
      this.ticked.delete(key);
    } else {
      this.ticked.set(key, offer);
    }
  }

  /**
   * Adds the ticked offers as one Extend after the node that ran, one undo
   * step, each column under its default name or the next free one: the
   * engine parses each column's text first, and the dialog stays open with
   * the error if it can't. Nothing is added if the cube changed meanwhile.
   */
  *add(): GeneratorFn<void> {
    const { editorState, document, afterId } = this;
    const offers = this.tickedOffers.filter(
      (offer): offer is CubeJsonOffer & { code: string } =>
        offer.code !== undefined,
    );
    if (
      !document ||
      afterId === undefined ||
      !offers.length ||
      this.isAdding ||
      editorState.document !== document
    ) {
      return;
    }
    this.isAdding = true;
    this.error = undefined;
    try {
      const { query } = document;
      const extendId = query.generateId(Extend.TYPE);
      const taken = (
        editorState.analysis.schemas.get(afterId)?.columns ?? []
      ).map((column) => column.name);
      const columns: ExtendColumn[] = [];
      for (const [index, offer] of offers.entries()) {
        const name = getFreeCubeColumnName(offer.name, [
          ...taken,
          ...columns.map((column) => column.name),
        ]);
        const parsed = (yield editorState.host.engine.parseExpression(
          offer.code,
          `${extendId}:${index}`,
        )) as CubeParsedExpression;
        columns.push({ name, code: offer.code, lambda: parsed.lambda });
      }
      // as the dialog found it: nothing changed while the engine parsed
      if (editorState.document !== document) {
        return;
      }
      editorState.addConfiguredNode(new Extend(extendId, columns), afterId);
      this.close();
    } catch (error) {
      assertErrorThrown(error);
      this.error =
        error instanceof CubeEngineError ? error.firstLine : error.message;
    } finally {
      this.isAdding = false;
    }
  }

  close(): void {
    this.stop();
    this.column = undefined;
    this.sample = undefined;
    this.document = undefined;
    this.afterId = undefined;
    this.error = undefined;
    this.search = '';
    this.selectedPath = [];
    this.ticked.clear();
  }
}
