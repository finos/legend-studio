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
  type LegendApplicationSetup,
  type LegendApplicationPluginManager,
  collectKeyedCommandConfigEntriesFromConfig,
  type KeyedCommandConfigEntry,
} from '@finos/legend-application';
import packageJson from '../../package.json' with { type: 'json' };
import type {
  CuratedTemplateQuery,
  CuratedTemplateQuerySpecification,
  LoadQueryFilterOption,
  QueryBuilderState,
  QueryBuilder_LegendApplicationPlugin_Extension,
  TemplateQueryPanelContentRenderer,
} from '@finos/legend-query-builder';
import { DataSpaceQueryBuilderState } from '../stores/query-builder/DataSpaceQueryBuilderState.js';
import { DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_CONFIG } from '../__lib__/DSL_DataSpace_LegendApplicationCommand.js';
import type { QuerySearchSpecification } from '@finos/legend-graph';
import { configureDataGridComponent } from '@finos/legend-lego/data-grid';
import { DataSpaceExecutableTemplate } from '../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import { filterByType } from '@finos/legend-shared';
import {
  createQueryClassTaggedValue,
  createQueryDataSpaceTaggedValue,
} from '../stores/shared/DataSpaceUtils.js';
import { renderDataSpaceQueryBuilderTemplateQueryPanelContent } from './query-builder/DataSpaceQueryBuilderTemplateQueryPanelContent.js';

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

  override getExtraKeyedCommandConfigEntries(): KeyedCommandConfigEntry[] {
    return collectKeyedCommandConfigEntriesFromConfig(
      DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_CONFIG,
    );
  }

  override getExtraApplicationSetups(): LegendApplicationSetup[] {
    return [
      async (applicationStore) => {
        configureDataGridComponent();
      },
    ];
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
            searchSpecification.combineTaggedValuesCondition = true;
          }
          return searchSpecification;
        },
      },
    ];
  }

  getQueryFilterOptionsRelatedToTemplateQuery(): (
    queryBuilderState: QueryBuilderState,
  ) => string[] {
    return (queryBuilderState): string[] => {
      if (queryBuilderState instanceof DataSpaceQueryBuilderState) {
        return ['Current Data Space'];
      }
      return [];
    };
  }

  getExtraTemplateQueryPanelContentRenderer(): TemplateQueryPanelContentRenderer[] {
    return [
      (queryBuilderState: QueryBuilderState): React.ReactNode => {
        if (queryBuilderState instanceof DataSpaceQueryBuilderState) {
          return renderDataSpaceQueryBuilderTemplateQueryPanelContent(
            queryBuilderState,
          );
        }
        return undefined;
      },
    ];
  }

  getCuratedTemplateQuerySpecifications(): CuratedTemplateQuerySpecification[] {
    return [
      {
        getCuratedTemplateQueries: (
          queryBuilderState,
        ): CuratedTemplateQuery[] => {
          if (queryBuilderState instanceof DataSpaceQueryBuilderState) {
            const executableTemplates =
              queryBuilderState.dataSpace.executables?.filter(
                filterByType(DataSpaceExecutableTemplate),
              );
            return executableTemplates
              ? executableTemplates.map(
                  (e) =>
                    ({
                      id: e.id,
                      title: e.title,
                      description: e.description,
                      query: e.query,
                      executionContextKey:
                        e.executionContextKey ??
                        queryBuilderState.dataSpace.defaultExecutionContext
                          .name,
                    }) as CuratedTemplateQuery,
                )
              : [];
          }
          return [];
        },
        loadCuratedTemplateQuery: (
          templateQuery: CuratedTemplateQuery,
          queryBuilderState: QueryBuilderState,
        ): void => {
          if (queryBuilderState instanceof DataSpaceQueryBuilderState) {
            if (
              queryBuilderState.executionContext.name !==
              templateQuery.executionContextKey
            ) {
              const executionContext =
                queryBuilderState.dataSpace.executionContexts.find(
                  (c) => c.name === templateQuery.executionContextKey,
                );
              if (executionContext) {
                queryBuilderState.setExecutionContext(executionContext);
                queryBuilderState.propagateExecutionContextChange(
                  executionContext,
                );
                queryBuilderState.initializeWithQuery(templateQuery.query);
                queryBuilderState.onExecutionContextChange?.(executionContext);
              }
            } else {
              queryBuilderState.initializeWithQuery(templateQuery.query);
            }
          }
        },
      },
    ];
  }
}
