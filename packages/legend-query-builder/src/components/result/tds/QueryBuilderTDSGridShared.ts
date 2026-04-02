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

import type { GenericLegendApplicationStore } from '@finos/legend-application';
import type {
  DataGridDefaultMenuItem,
  DataGridGetContextMenuItemsParams,
  DataGridMenuItemDef,
} from '@finos/legend-lego/data-grid';
import type { TDSRowDataType } from '@finos/legend-graph';
import { QueryBuilderTDSState } from '../../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { filterByOrOutValues } from './QueryBuilderTDSResultShared.js';
import type { QueryBuilderResultState } from '../../../stores/QueryBuilderResultState.js';

/**
 * Build the shared context-menu items used by both the enterprise and
 * simple TDS grid components:
 *   Filter By | Filter Out | Copy | Copy with Headers | Copy Row Value
 */
export const buildTDSGridContextMenuItems = (
  params: DataGridGetContextMenuItemsParams<TDSRowDataType>,
  applicationStore: GenericLegendApplicationStore,
  resultState: QueryBuilderResultState,
  onError: (error: Error) => void,
): (DataGridDefaultMenuItem | DataGridMenuItemDef)[] => {
  const fetchStructureImplementation =
    resultState.queryBuilderState.fetchStructureState.implementation;
  if (fetchStructureImplementation instanceof QueryBuilderTDSState) {
    return [
      {
        name: 'Filter By',
        action: () => {
          filterByOrOutValues(
            applicationStore,
            resultState.mousedOverCell,
            true,
            fetchStructureImplementation,
          ).catch(onError);
        },
      },
      {
        name: 'Filter Out',
        action: () => {
          filterByOrOutValues(
            applicationStore,
            resultState.mousedOverCell,
            false,
            fetchStructureImplementation,
          ).catch(onError);
        },
      },
      'copy',
      'copyWithHeaders',
      {
        name: 'Copy Row Value',
        action: () => {
          params.api.copySelectedRowsToClipboard();
        },
      },
    ];
  }
  return [];
};
