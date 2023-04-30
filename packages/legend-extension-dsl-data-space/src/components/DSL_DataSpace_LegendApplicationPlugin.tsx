/**
 * Copyright (c) 2020-present, Goldman Sachs
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
  LegendApplicationPlugin,
  type LegendApplicationPluginManager,
} from '@finos/legend-application';
import packageJson from '../../package.json';
import type {
  LoadQueryFilterOption,
  QueryBuilder_LegendApplicationPlugin_Extension,
} from '@finos/legend-query-builder';
import { DataSpaceQueryBuilderState } from '../stores/query/DataSpaceQueryBuilderState.js';
import type { QuerySearchSpecification } from '@finos/legend-graph';
import {
  createQueryClassTaggedValue,
  createQueryDataSpaceTaggedValue,
} from '../stores/query/DataSpaceQueryCreatorStore.js';

export class DSL_DataSpace_LegendApplicationPlugin
  extends LegendApplicationPlugin
  implements QueryBuilder_LegendApplicationPlugin_Extension
{
  static NAME = packageJson.extensions.applicationPlugin;

  constructor() {
    super(DSL_DataSpace_LegendApplicationPlugin.NAME, packageJson.version);
  }

  install(
    pluginManager: LegendApplicationPluginManager<LegendApplicationPlugin>,
  ): void {
    pluginManager.registerApplicationPlugin(this);
  }

  getExtraLoadQueryFilterOptions(): LoadQueryFilterOption[] {
    return [
      {
        key: 'data-space-filter-option',
        label: (queryBuilderState): string | undefined => {
          if (queryBuilderState instanceof DataSpaceQueryBuilderState) {
            return 'Current Data Space';
          }
          return undefined;
        },
        filterFunction: (
          searchSpecification,
          queryBuilderState,
        ): QuerySearchSpecification => {
          if (queryBuilderState instanceof DataSpaceQueryBuilderState) {
            searchSpecification.taggedValues = [
              createQueryDataSpaceTaggedValue(queryBuilderState.dataSpace.path),
            ];
          }
          return searchSpecification;
        },
      },
      {
        key: 'class-filter-option',
        label: (queryBuilderState): string | undefined => {
          if (queryBuilderState instanceof DataSpaceQueryBuilderState) {
            return 'Current Class';
          }
          return undefined;
        },
        filterFunction: (
          searchSpecification,
          queryBuilderState,
        ): QuerySearchSpecification => {
          if (
            queryBuilderState instanceof DataSpaceQueryBuilderState &&
            queryBuilderState.class
          ) {
            searchSpecification.taggedValues = [
              createQueryDataSpaceTaggedValue(queryBuilderState.dataSpace.path),
              createQueryClassTaggedValue(queryBuilderState.class.path),
            ];
          }
          return searchSpecification;
        },
      },
    ];
  }
}
