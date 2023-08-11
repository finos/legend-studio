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

import { flow, makeObservable, observable } from 'mobx';
import type { EditorStore } from './EditorStore.js';
import {
  assertErrorThrown,
  LogEvent,
  type GeneratorFn,
} from '@finos/legend-shared';
import {
  DatabaseType,
  type RelationalConnectionConfiguration,
} from '@finos/legend-graph';
import {
  CORE_AUTHENTICATION_STRATEGY_TYPE,
  CORE_DATASOURCE_SPEC_TYPE,
} from './editor-state/element-editor-state/connection/ConnectionEditorState.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../__lib__/LegendStudioEvent.js';

export class DatabaseTypeConfiguration {
  compatibleDataSources: string[] = [];
  compatibleAuthStragies: string[] = [];

  constructor(
    compatibleDataSources: string[],
    compatibleAuthStragies: string[],
  ) {
    this.compatibleDataSources = compatibleDataSources;
    this.compatibleAuthStragies = compatibleAuthStragies;
  }
}

export class RelationalConnectionConfigurationState {
  editorStore: EditorStore;
  dbTypeToDataSourceAndAuthMap:
    | Map<string, DatabaseTypeConfiguration>
    | undefined = undefined;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
    makeObservable(this, {
      dbTypeToDataSourceAndAuthMap: observable,
      fetchAvailableDbAuthenticationFlows: flow,
    });
  }

  *fetchAvailableDbAuthenticationFlows(): GeneratorFn<void> {
    try {
      const dbTypeDataSourceAndAuths =
        (yield this.editorStore.graphManagerState.graphManager.getDbTypeToDataSourceAndAuthMapping()) as RelationalConnectionConfiguration[];
      const dbTypeToDataSourceAndAuthMap: Map<
        string,
        DatabaseTypeConfiguration
      > = new Map<string, DatabaseTypeConfiguration>();
      const allAvailableDbTypes = Object.values(DatabaseType) as string[];
      const allAvailableDataSourceSpecs = Object.values(
        CORE_DATASOURCE_SPEC_TYPE,
      ) as string[];
      const allAvailableAuths = Object.values(
        CORE_AUTHENTICATION_STRATEGY_TYPE,
      ) as string[];
      dbTypeDataSourceAndAuths.forEach((dbTypeDataSourceAndAuth) => {
        const dbType = dbTypeDataSourceAndAuth.dbType;
        const dataSource = dbTypeDataSourceAndAuth.dataSource;
        const authStrategy = dbTypeDataSourceAndAuth.authStrategy;
        if (
          allAvailableDbTypes.includes(dbType) &&
          allAvailableDataSourceSpecs.includes(dataSource) &&
          allAvailableAuths.includes(authStrategy)
        ) {
          if (!dbTypeToDataSourceAndAuthMap.has(dbType)) {
            dbTypeToDataSourceAndAuthMap.set(
              dbType,
              new DatabaseTypeConfiguration([dataSource], [authStrategy]),
            );
          } else {
            const getDatasourcesAndAuths =
              dbTypeToDataSourceAndAuthMap.get(dbType) ??
              new DatabaseTypeConfiguration([], []);
            const dataSources = getDatasourcesAndAuths.compatibleDataSources;
            const authStrategies =
              getDatasourcesAndAuths.compatibleAuthStragies;
            if (!dataSources.includes(dataSource)) {
              dataSources.push(dataSource);
            }
            if (!authStrategies.includes(authStrategy)) {
              authStrategies.push(authStrategy);
            }
            dbTypeToDataSourceAndAuthMap.set(
              dbType,
              new DatabaseTypeConfiguration(dataSources, authStrategies),
            );
          }
        }
      });
      this.dbTypeToDataSourceAndAuthMap = dbTypeToDataSourceAndAuthMap;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.GENERIC_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }
}
