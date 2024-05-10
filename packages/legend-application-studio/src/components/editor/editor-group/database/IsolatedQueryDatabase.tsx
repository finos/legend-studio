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
  type PackageableConnection,
  getMappingCompatibleClasses,
} from '@finos/legend-graph';
import { QueryBuilderClassSelector } from '@finos/legend-query-builder';
import type { IsolatedDatabaseBuilderState } from '../../../../stores/editor/editor-state/element-editor-state/database/QueryDatabaseState.js';
import { observer } from 'mobx-react-lite';
import {
  CustomSelectorInput,
  PURE_ConnectionIcon,
  PURE_DatabaseIcon,
} from '@finos/legend-art';
import { returnUndefOnError } from '@finos/legend-shared';

const IsolatedDatabseQueryBuilderSetupPanelContext = observer(
  (props: { queryBuilderState: IsolatedDatabaseBuilderState }) => {
    const { queryBuilderState } = props;
    const globalGraphManagerState = queryBuilderState.globalGraphManagerState;
    const getConnectionValue = (
      val: string,
    ): PackageableConnection | undefined =>
      returnUndefOnError(() =>
        globalGraphManagerState.graph.getConnection(val),
      );
    const database = queryBuilderState.database;
    const compConnections = queryBuilderState.compatibleConnections;
    const compConnectionsOptions = Array.from(compConnections.keys()).map(
      (e) => ({ value: e, label: getConnectionValue(e)?.name ?? e }),
    );
    const changeConnection = (
      val: { value: string; label: string } | null,
    ): void => {
      if (val) {
        queryBuilderState.changeConnection(val.value);
      }
    };
    const connection = compConnections.get(queryBuilderState.connectionKey);
    const selectedConnection = connection
      ? {
          label: queryBuilderState.connectionKey,
          value:
            getConnectionValue(queryBuilderState.connectionKey)?.name ??
            queryBuilderState.connectionKey,
        }
      : undefined;
    const databaseOption = {
      value: database,
      label: database.path,
    };
    const classes = queryBuilderState.executionContextState.mapping
      ? getMappingCompatibleClasses(
          queryBuilderState.executionContextState.mapping,
          queryBuilderState.graphManagerState.usableClasses,
        )
      : [];
    return (
      <>
        <div className="query-builder__setup__config-group">
          <div className="query-builder__setup__config-group__header">
            <div className="query-builder__setup__config-group__header__title">
              Properties
            </div>
          </div>
          <div className="query-builder__setup__config-group__content">
            <div className="query-builder__setup__config-group__item">
              <div
                className="btn--sm query-builder__setup__config-group__item__label"
                title="store"
              >
                Store
              </div>
              <CustomSelectorInput
                className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
                noMatchMessage="No compatible mapping found for specified class"
                disabled={true}
                options={[]}
                value={databaseOption}
                darkMode={
                  !queryBuilderState.applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
              />
            </div>
            <div className="query-builder__setup__config-group__item">
              <div
                className="btn--sm query-builder__setup__config-group__item__label"
                title="connection"
              >
                Connection
              </div>
              <CustomSelectorInput
                className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
                noMatchMessage="No compatible mapping found for specified class"
                disabled={compConnectionsOptions.length < 2}
                options={compConnectionsOptions}
                onChange={changeConnection}
                value={selectedConnection}
                darkMode={
                  !queryBuilderState.applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
              />
            </div>
          </div>
        </div>
        <QueryBuilderClassSelector
          queryBuilderState={queryBuilderState}
          classes={classes}
          noMatchMessage="No classes selected from"
        />
      </>
    );
  },
);

export const renderDatabaseQueryBuilderSetupPanelContent = (
  queryBuilderState: IsolatedDatabaseBuilderState,
): React.ReactNode => (
  <IsolatedDatabseQueryBuilderSetupPanelContext
    queryBuilderState={queryBuilderState}
  />
);
