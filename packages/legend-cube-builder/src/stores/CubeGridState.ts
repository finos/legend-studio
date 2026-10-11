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
  addDrilldownLevel,
  type AggregationFunction,
  type CheckedDrilldown,
  checkDrilldown,
  type ColumnDirection,
  type Drilldown,
  type DrilldownCell,
  foldColumnName,
  isEmptyDrilldown,
  isSortableType,
  removeDrilldownLevel,
  setDrilldownAggregation,
  SortDirection,
} from '@finos/legend-cube';
import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import {
  CUBE_DRILLDOWN_BLOCKER,
  LEGEND_CUBE_USER_DATA_KEY,
  READ_ONLY_CUBE_TITLE,
} from '../__lib__/LegendCubeLabels.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeResultValue,
} from '../graph-manager/CubeEngine.js';
import type { CubeEditorState } from './CubeEditorState.js';
import type { CubeExecutionResult } from './CubeExecutionState.js';
import { CubeGridFetchDropped } from './CubeGridFetcher.js';

/** How the grid shows a run (spec §12.1, PLAN §11.10) */
export enum CubeGridMode {
  /** Each sort and drill-down level runs on the engine (the default) */
  SERVER_SIDE = 'serverSide',
  /** The run's rows, grouped, pivoted and filtered in the browser */
  LOCAL = 'local',
}

/** The id ag-grid gives the column of the drill-down's groups */
export const CUBE_GRID_GROUP_COLUMN_ID = 'ag-Grid-AutoColumn';

/** A column's id in the grid: its position, as `c<position>` */
export const CUBE_GRID_COLUMN_ID_PREFIX = 'c';

/** A row of the server-side grid: a group of the drill-down, or a row of the run */
export interface CubeGridRowData {
  /** Unique among the grid's rows: its group's keys, typed, or its group's and its position */
  readonly id: string;
  /** The keys of its group and the groups around it, outermost first, as the engine returned them */
  readonly keys: readonly DrilldownCell[];
  readonly isGroup: boolean;
  /** Each run column's value, `undefined` where a group row shows none */
  readonly cells: readonly (CubeResultValue | undefined)[];
  /** On a group row, how many of the run's rows it holds */
  readonly count?: number | undefined;
}

/** A sort ag-grid asks for: a column's id and its direction */
export interface CubeGridSortRequest {
  readonly colId: string;
  readonly sort: 'asc' | 'desc';
}

const NO_DRILLDOWN = Object.freeze({ columns: [], aggregations: [] });

/**
 * The grid's state beyond the run (PLAN §11.10): its mode, remembered for the
 * user, and in server-side mode the rows of each level ag-grid asks for, from
 * the run on screen (`CubeGridFetcher`), with what the levels say: an error,
 * and whether a level was cut at the row limit.
 */
export class CubeGridState {
  readonly editorState: CubeEditorState;
  mode: CubeGridMode;
  /** The last fetch's error, until the next fetch or a new run */
  fetchError: CubeEngineError | undefined;
  /** Some level shown was cut at the run's row limit */
  hasLimitedLevel = false;
  /** Fetches in flight */
  fetching = 0;
  /** The drill-down's settings dialog is open */
  isSettingsOpen = false;

  constructor(editorState: CubeEditorState) {
    makeObservable(this, {
      mode: observable,
      fetchError: observable.ref,
      hasLimitedLevel: observable,
      fetching: observable,
      drilldown: computed,
      setMode: action,
      addLevel: action,
      removeLevel: action,
      setAggregation: action,
      clearDrilldown: action,
      openSettings: action,
      closeSettings: action,
      isSettingsOpen: observable,
      clearFetchError: action,
      resetLevels: action,
    });
    this.editorState = editorState;
    const stored =
      editorState.host.applicationStore.userDataService.getStringValue(
        LEGEND_CUBE_USER_DATA_KEY.GRID_MODE,
      );
    this.mode =
      stored === CubeGridMode.LOCAL
        ? CubeGridMode.LOCAL
        : CubeGridMode.SERVER_SIDE;
  }

  get isServerSide(): boolean {
    return this.mode === CubeGridMode.SERVER_SIDE;
  }

  /** The cube's drill-down, checked against the run on screen; none without a run */
  get drilldown(): CheckedDrilldown | undefined {
    const { result } = this.editorState.execution;
    return result
      ? checkDrilldown(
          this.editorState.document.meta.drilldown ?? NO_DRILLDOWN,
          result.schema,
        )
      : undefined;
  }

  /**
   * Shows the run another way. Both modes show the same run, so nothing runs
   * again: local mode shows its rows, server-side mode fetches what it needs
   */
  setMode(mode: CubeGridMode): void {
    this.mode = mode;
    this.editorState.host.applicationStore.userDataService.persistValue(
      LEGEND_CUBE_USER_DATA_KEY.GRID_MODE,
      mode,
    );
  }

  /**
   * Why 'Drilldown by' can't be used on the run's column, if it can't: a
   * type that can't be grouped, a column that is a level already, a cube
   * saved by a newer version
   */
  getAddLevelBlocker(column: string): string | undefined {
    const { editorState } = this;
    const type = editorState.execution.result?.schema.type(column);
    if (editorState.readOnly) {
      return READ_ONLY_CUBE_TITLE;
    }
    if (!type || !isSortableType(type)) {
      return CUBE_DRILLDOWN_BLOCKER.notGroupable(type?.displayName ?? '');
    }
    return (editorState.document.meta.drilldown?.columns ?? []).some(
      (level) => foldColumnName(level) === foldColumnName(column),
    )
      ? CUBE_DRILLDOWN_BLOCKER.ALREADY_A_LEVEL
      : undefined;
  }

  private setDrilldown(drilldown: Drilldown | undefined): void {
    const { editorState } = this;
    const { meta } = editorState.document;
    const { drilldown: _, ...others } = meta;
    editorState.applyDocument(
      editorState.document.withMeta(
        isEmptyDrilldown(drilldown) ? others : { ...meta, drilldown },
      ),
    );
  }

  /**
   * Adds the column as the drill-down's innermost level, an undo step that
   * leaves the rows current (spec §12.4); the grid shows it server-side,
   * the only mode with levels (spec §12.1)
   */
  addLevel(column: string): void {
    if (this.getAddLevelBlocker(column) !== undefined) {
      return;
    }
    this.setDrilldown(
      addDrilldownLevel(this.editorState.document.meta.drilldown, column),
    );
    if (!this.isServerSide) {
      this.setMode(CubeGridMode.SERVER_SIDE);
    }
  }

  /** Removes the level at the position: the ones inside it move out */
  removeLevel(index: number): void {
    const { drilldown } = this.editorState.document.meta;
    if (drilldown && !this.editorState.readOnly) {
      this.setDrilldown(removeDrilldownLevel(drilldown, index));
    }
  }

  /** Sets how a group row shows the run's column: a function, or nothing */
  setAggregation(column: string, fn: AggregationFunction | null): void {
    const type = this.editorState.execution.result?.schema.type(column);
    if (type && !this.editorState.readOnly) {
      this.setDrilldown(
        setDrilldownAggregation(
          this.editorState.document.meta.drilldown,
          column,
          type,
          fn,
        ),
      );
    }
  }

  /** Removes the drill-down: its levels and its aggregations */
  clearDrilldown(): void {
    if (!this.editorState.readOnly) {
      this.setDrilldown(undefined);
    }
  }

  openSettings(): void {
    this.isSettingsOpen = true;
  }

  closeSettings(): void {
    this.isSettingsOpen = false;
  }

  clearFetchError(): void {
    this.fetchError = undefined;
  }

  /** A new grid: what earlier levels said is forgotten */
  resetLevels(): void {
    this.fetchError = undefined;
    this.hasLimitedLevel = false;
  }

  /**
   * The sort ag-grid asks for, by the run's column names: a column by its
   * position; the groups' column by the level's own column at a group level,
   * and not at all at the leaf
   */
  toSorts(
    result: CubeExecutionResult,
    sortModel: readonly CubeGridSortRequest[],
    depth: number,
  ): ColumnDirection[] {
    const levels = this.drilldown?.columns ?? [];
    return sortModel.flatMap(({ colId, sort }): ColumnDirection[] => {
      const direction =
        sort === 'desc' ? SortDirection.DESC : SortDirection.ASC;
      if (colId === CUBE_GRID_GROUP_COLUMN_ID) {
        const column = levels[depth];
        return column === undefined ? [] : [{ column, direction }];
      }
      const column = colId.startsWith(CUBE_GRID_COLUMN_ID_PREFIX)
        ? result.schema.columns[
            Number(colId.slice(CUBE_GRID_COLUMN_ID_PREFIX.length))
          ]
        : undefined;
      return column ? [{ column: column.name, direction }] : [];
    });
  }

  /**
   * The rows under a group, by its keys (none for the top level), sorted as
   * ag-grid asks. The run's own rows when nothing is derived (no drill-down
   * level, no sort), else a fetched level. Resolves to `undefined` for rows
   * the grid no longer shows, which are then left alone.
   */
  async loadRows(
    result: CubeExecutionResult,
    keys: readonly DrilldownCell[],
    sortModel: readonly CubeGridSortRequest[],
  ): Promise<CubeGridRowData[] | undefined> {
    const parentId = JSON.stringify(keys);
    const sorts = this.toSorts(result, sortModel, keys.length);
    if (!keys.length && !this.drilldown?.columns.length && !sorts.length) {
      return result.rows.map((row, index) => ({
        id: `${parentId}#${index}`,
        keys,
        isGroup: false,
        cells: row,
      }));
    }
    this.track(1);
    try {
      const level = await this.editorState.gridFetcher.fetchLevel(
        result,
        keys,
        sorts,
      );
      this.noteLevel(level.limited);
      const levels = this.drilldown?.columns ?? [];
      const keyAt = level.level.isLeaf
        ? -1
        : result.schema.names().indexOf(levels[keys.length] as string);
      return level.rows.map((row, index) => {
        if (level.level.isLeaf) {
          return {
            id: `${parentId}#${index}`,
            keys,
            isGroup: false,
            cells: row.cells,
          };
        }
        const groupKeys = [...keys, row.cells[keyAt] ?? null];
        return {
          id: JSON.stringify(groupKeys),
          keys: groupKeys,
          isGroup: true,
          cells: row.cells,
          count: row.count,
        };
      });
    } catch (error) {
      if (error instanceof CubeGridFetchDropped) {
        return undefined;
      }
      this.noteError(
        error instanceof CubeEngineError
          ? error
          : new CubeEngineError(
              CubeEngineErrorKind.EXECUTION,
              error instanceof Error ? error.message : String(error),
            ),
      );
      throw error;
    } finally {
      this.track(-1);
    }
  }

  private track(change: number): void {
    runInAction(() => {
      this.fetching += change;
      if (change > 0) {
        this.fetchError = undefined;
      }
    });
  }

  private noteLevel(limited: boolean): void {
    if (limited) {
      runInAction(() => {
        this.hasLimitedLevel = true;
      });
    }
  }

  private noteError(error: CubeEngineError): void {
    runInAction(() => {
      this.fetchError = error;
    });
  }
}
