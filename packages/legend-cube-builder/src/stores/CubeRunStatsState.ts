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

import { action, makeObservable, observable } from 'mobx';

/** How many of the latest runs are kept (spec §12.6) */
export const MAX_CUBE_RUN_STATS = 15;

/** One run on the engine: an Execute, a fetch of the grid's rows, an export */
export interface CubeRunStat {
  readonly id: number;
  /** What ran, e.g. `Execute` or `Rows of SHIP_COUNTRY "France"` */
  readonly label: string;
  /** When it finished, in milliseconds since the epoch */
  readonly finishedAt: number;
  readonly durationMs: number;
  /** The SQL statements the engine ran */
  readonly sql: readonly string[];
}

/**
 * The latest runs of the page, newest first, at most `MAX_CUBE_RUN_STATS`
 * (spec §12.6, PLAN §11.10): each successful Execute, fetch and export
 * records one. They are the page's, not the cube's, and aren't saved.
 */
export class CubeRunStatsState {
  entries: readonly CubeRunStat[] = [];
  private count = 0;

  constructor() {
    makeObservable<CubeRunStatsState, 'count'>(this, {
      entries: observable.ref,
      count: false,
      record: action,
      clear: action,
    });
  }

  record(
    label: string,
    run: { readonly durationMs: number; readonly sql: readonly string[] },
  ): void {
    this.entries = [
      {
        id: ++this.count,
        label,
        finishedAt: Date.now(),
        durationMs: run.durationMs,
        sql: run.sql,
      },
      ...this.entries,
    ].slice(0, MAX_CUBE_RUN_STATS);
  }

  clear(): void {
    this.entries = [];
  }
}
