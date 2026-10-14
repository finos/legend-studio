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

import type { CubeContext, Query } from '@finos/legend-cube';
import type { GeneratorFn } from '@finos/legend-shared';

export enum CubeSourcePickerTabKey {
  MODEL = 'model',
  DIRECT_CONNECTION = 'directConnection',
  DATA_PRODUCT = 'dataProduct',
  INGEST = 'ingest',
  PROJECT = 'project',
  PROJECT_FUNCTION = 'projectFunction',
  SERVICE = 'service',
}

/**
 * A tab of the source dialog (PLAN §6.1, §6.8): one way to find a source,
 * e.g. a model's tables or a database connection's. The dialog opens one tab
 * at a time and runs its Add; a cube's fixed context belongs to one tab,
 * which then is the only one enabled.
 */
export interface CubeSourcePickerTab {
  readonly key: CubeSourcePickerTabKey;
  readonly label: string;
  /** The host serves it; a tab it doesn't serve isn't shown */
  readonly isAvailable: boolean;
  /** Something is loading or being typed */
  readonly isBusy: boolean;
  readonly canConfirm: boolean;
  /** Whether a cube's fixed context is this tab's, e.g. its saved connection */
  ownsContext(context: CubeContext): boolean;
  /** When the dialog opens on the tab, or the user switches to it */
  open(): void;
  /** When the dialog closes: answers still on their way are dropped */
  close(): void;
  /** How many sources Add adds, when the tab picks several at once; one when left out */
  readonly pickedCount?: number;
  /** Adds the picked sources; gives whether every one was added */
  confirm(): GeneratorFn<boolean>;
}

/**
 * Ids for several new nodes of a type, none taken by the query nor by each
 * other: `generateId` sees only the query's nodes, so asking it again gives
 * the same id
 */
export const generateCubeNodeIds = (
  query: Query,
  type: string,
  count: number,
): string[] => {
  const first = query.generateId(type);
  const ids = [first];
  const number = Number(first.slice(type.length));
  for (let next = number + 1; ids.length < count; next += 1) {
    const id = `${type}${next}`;
    if (!query.getNode(id)) {
      ids.push(id);
    }
  }
  return ids;
};

/** How long the clicks on a list's tables pause before the table picked last is previewed */
export const CUBE_TABLE_PREVIEW_DELAY_MS = 250;
