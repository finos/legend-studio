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
  checkDrilldown,
  type ColumnDirection,
  deriveDrilldownLevel,
  type DrilldownCell,
  type DrilldownLevel,
  printIR,
  QueryEmitter,
  SortDirection,
} from '@finos/legend-cube';
import { NULL_CELL_TEXT } from '../__lib__/LegendCubeLabels.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeResultValue,
} from '../graph-manager/CubeEngine.js';
import type { CubeEditorState } from './CubeEditorState.js';
import type { CubeExecutionResult } from './CubeExecutionState.js';
import { type CubeQueryRunResult, runCubeQuery } from './CubeQueryRun.js';

/** A row of a level, by the run's column positions */
export interface CubeGridRow {
  /** Each run column's value, `undefined` where the level shows none (a group row's column with no aggregation) */
  readonly cells: readonly (CubeResultValue | undefined)[];
  /** On a group row, how many of the run's rows the group holds */
  readonly count?: number | undefined;
}

/** The rows of one level of the grid: the run's rows, or groups of them */
export interface CubeGridLevelRows {
  readonly level: DrilldownLevel;
  readonly rows: readonly CubeGridRow[];
  /** The engine returned more than the run's row limit */
  readonly limited: boolean;
}

/** An answer for rows the grid no longer shows: a newer run, or the grid purged its rows; it is dropped */
export class CubeGridFetchDropped extends Error {
  constructor() {
    super('The rows were asked for by a grid that no longer shows them');
    this.name = 'CubeGridFetchDropped';
  }
}

/** The most rows the cache holds across its levels; the oldest levels go first (PLAN §11.10) */
export const MAX_CUBE_GRID_CACHED_ROWS = 200_000;

export const CUBE_GRID_CONTEXT_CHANGED =
  "The cube's model, runtime or warehouse changed since this run: execute again to see more of its rows.";

interface CachedLevel {
  readonly promise: Promise<CubeGridLevelRows>;
  /** Its rows, once answered; 0 until then */
  rows: number;
}

/** How a fetch is shown in the run stats, e.g. `Rows of SHIP_COUNTRY "France"` */
const describeFetch = (
  level: DrilldownLevel,
  keys: readonly DrilldownCell[],
  levels: readonly string[],
  sorts: readonly ColumnDirection[],
): string => {
  const of = keys
    .map(
      (key, index) =>
        `${levels[index]} ${key === null ? NULL_CELL_TEXT : JSON.stringify(String(key))}`,
    )
    .join(', ');
  const sorted = sorts
    .map(
      ({ column, direction }) =>
        `${column} ${direction === SortDirection.DESC ? 'descending' : 'ascending'}`,
    )
    .join(', ');
  return [
    level.isLeaf ? 'Rows' : `Groups by ${level.groupColumns.at(-1)}`,
    of ? ` of ${of}` : '',
    sorted ? `, sorted by ${sorted}` : '',
  ].join('');
};

/**
 * Fetches the levels of the grid's server-side mode (PLAN §11.10): each a
 * query derived from the run on screen, never the live cube, with the
 * drill-down the cube has now and the grid's sort, run as Execute runs
 * (`runCubeQuery`), with the run's model, runtime and row limit. Answers are
 * cached by the derived query, the oldest dropped past
 * `MAX_CUBE_GRID_CACHED_ROWS` rows. `purge()` drops them all, aborts the
 * fetches in flight and drops their answers, as a new run does.
 */
export class CubeGridFetcher {
  readonly editorState: CubeEditorState;
  /** The most rows the cache holds */
  readonly maxCachedRows: number;
  /** Bumped by each purge: an answer of an older generation is dropped */
  private generation = 0;
  private resultId: number | undefined;
  /** In the order last used, the oldest first */
  private readonly cache = new Map<string, CachedLevel>();
  private readonly controllers = new Set<AbortController>();

  constructor(
    editorState: CubeEditorState,
    maxCachedRows = MAX_CUBE_GRID_CACHED_ROWS,
  ) {
    this.editorState = editorState;
    this.maxCachedRows = maxCachedRows;
  }

  /** How many rows the cache holds */
  get cachedRows(): number {
    return Array.from(this.cache.values()).reduce(
      (total, cached) => total + cached.rows,
      0,
    );
  }

  /** Drops every cached level, and aborts the fetches in flight, whose answers are then dropped */
  purge(): void {
    this.generation += 1;
    this.cache.clear();
    this.controllers.forEach((controller) => controller.abort());
    this.controllers.clear();
  }

  /**
   * The rows of the level under the expanded groups' keys (outermost first;
   * none for the top level), sorted by the grid. Rejects with a
   * `CubeEngineError`, or a `CubeGridFetchDropped` when the answer is for rows
   * the grid no longer shows.
   */
  fetchLevel(
    result: CubeExecutionResult,
    keys: readonly DrilldownCell[],
    sorts: readonly ColumnDirection[],
  ): Promise<CubeGridLevelRows> {
    if (result.id !== this.resultId) {
      this.purge();
      this.resultId = result.id;
    }
    const { editorState } = this;
    const model = result.context?.model;
    const runtime = result.context?.runtime;
    const captureId = result.query.selected;
    if (!model || !runtime || captureId === undefined) {
      return Promise.reject(
        new Error('A run has a model, a runtime and a node'),
      );
    }
    // the warehouse is read from the page when the query runs, so a fetch
    // under another one would run the run's query elsewhere
    if (
      result.context !== editorState.document.context ||
      result.warehouse !== editorState.dataProductRuntime.effectiveWarehouse
    ) {
      return Promise.reject(
        new CubeEngineError(
          CubeEngineErrorKind.EXECUTION,
          CUBE_GRID_CONTEXT_CHANGED,
          captureId,
        ),
      );
    }
    let level: DrilldownLevel;
    const drilldown = checkDrilldown(
      editorState.document.meta.drilldown ?? { columns: [], aggregations: [] },
      result.schema,
    );
    try {
      level = deriveDrilldownLevel({
        query: result.query,
        captureId,
        schema: result.schema,
        drilldown,
        keys,
        sorts,
      });
    } catch (error) {
      return Promise.reject(
        new CubeEngineError(
          CubeEngineErrorKind.EXECUTION,
          error instanceof Error ? error.message : String(error),
          captureId,
        ),
      );
    }
    const runId = level.query.selected as string;
    // Cube's own checks first, so the engine never gets a query Cube knows is wrong
    const { schemas, validity } = buildSchemasAndValidity(
      level.query,
      editorState.registry.queryRules,
    );
    const problem = (validity.get(runId) ?? [])[0];
    const schema = schemas.get(runId);
    if (problem !== undefined || !schema) {
      return Promise.reject(
        new CubeEngineError(
          CubeEngineErrorKind.EXECUTION,
          `These rows can't be fetched: ${problem ?? 'the query has no columns'}`,
          captureId,
        ),
      );
    }
    // the whole run, so a sort the row order keeps is in it
    const key = printIR(
      new QueryEmitter(level.query, editorState.registry).emitExecutionLambda({
        rowLimit: result.rowLimit,
        runtime,
      }),
    );
    const cached = this.cache.get(key);
    if (cached) {
      // last used now
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached.promise;
    }
    const generation = this.generation;
    const controller = new AbortController();
    this.controllers.add(controller);
    const entry: CachedLevel = {
      rows: 0,
      promise: runCubeQuery(editorState, {
        query: level.query,
        model,
        runtime,
        schema,
        rowLimit: result.rowLimit,
        abortController: controller,
      })
        .then((run: CubeQueryRunResult): CubeGridLevelRows => {
          if (generation !== this.generation) {
            throw new CubeGridFetchDropped();
          }
          const positions = result.schema.columns.map(({ name }) => {
            const output = level.columns.get(name);
            return output === undefined
              ? -1
              : schema.columns.findIndex((column) => column.name === output);
          });
          const countAt = level.countColumn
            ? schema.columns.findIndex(
                (column) => column.name === level.countColumn,
              )
            : -1;
          const rows = run.rows.map(
            (row): CubeGridRow => ({
              cells: positions.map((position) =>
                position === -1 ? undefined : (row[position] ?? null),
              ),
              ...(countAt === -1 ? {} : { count: Number(row[countAt]) }),
            }),
          );
          editorState.runStats.record(
            describeFetch(level, keys, drilldown.columns, sorts),
            run,
          );
          entry.rows = rows.length;
          this.evict(key);
          return { level, rows, limited: run.limited };
        })
        .catch((error: unknown) => {
          if (this.cache.get(key) === entry) {
            this.cache.delete(key);
          }
          throw generation !== this.generation
            ? new CubeGridFetchDropped()
            : error;
        })
        .finally(() => this.controllers.delete(controller)),
    };
    this.cache.set(key, entry);
    return entry.promise;
  }

  /** Drops the least recently used levels until the cache holds at most its rows, never the one just answered */
  private evict(keep: string): void {
    for (const [key] of this.cache) {
      if (this.cachedRows <= this.maxCachedRows) {
        return;
      }
      if (key !== keep) {
        this.cache.delete(key);
      }
    }
  }
}
