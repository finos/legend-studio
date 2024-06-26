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

import { observer } from 'mobx-react-lite';
import {
  type ExecutionPlanState,
  EXECUTION_PLAN_VIEW_MODE,
} from '../../stores/execution-plan/ExecutionPlanState.js';

import {
  PanelListItem,
  PanelDivider,
  Button,
  PanelContent,
  clsx,
} from '@finos/legend-art';
import {
  type RelationalClassQueryTempTableGraphFetchExecutionNode,
  SQLExecutionNode,
} from '@finos/legend-graph';
import { ResultTypeViewer } from './ResultTypeViewer.js';
import { SQLExecutionNodeViewerHelper } from './SQLExecutionNodeViewer.js';
import { useState } from 'react';
import { prettyCONSTName } from '@finos/legend-shared';
import { ImplementationViewer } from './ImplementationViewer.js';
import { TempTableStrategyViewer } from './TempTableStrategyViewer.js';

enum RELATIONAL_CLASS_QUERY_TABS {
  GENERAL = 'GENERAL',
  TEMP_TABLE = 'TEMP_TABLE_STRATEGY',
}

export const RelationalClassQueryTempTableGraphFetchExecutionNodeViewer: React.FC<{
  node: RelationalClassQueryTempTableGraphFetchExecutionNode;
  executionPlanState: ExecutionPlanState;
}> = observer((props) => {
  const { node, executionPlanState } = props;
  const applicationStore = executionPlanState.applicationStore;

  const [selectedTab, setSelectedTab] = useState<RELATIONAL_CLASS_QUERY_TABS>(
    RELATIONAL_CLASS_QUERY_TABS.GENERAL,
  );

  return (
    <PanelContent
      darkMode={
        !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
      }
    >
      <div className="query-builder__execution-plan-form--editor">
        <div className="panel">
          <div className="panel__header query-builder__execution-plan-form--editor__header--with-tabs">
            <div className="uml-element-editor__tabs">
              {Object.values(RELATIONAL_CLASS_QUERY_TABS).map((tab) => (
                <div
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={clsx(
                    'query-builder__execution-plan-form--editor__tab',
                    {
                      'query-builder__execution-plan-form--editor__tab--active':
                        tab === selectedTab,
                    },
                  )}
                >
                  {prettyCONSTName(tab)}
                </div>
              ))}
            </div>
          </div>
          {selectedTab === RELATIONAL_CLASS_QUERY_TABS.GENERAL && (
            <div className="query-builder__store-mapping-global-graph-fetch__container">
              <PanelListItem className="query-builder__store-mapping-global-graph-fetch__container__label">
                Relational Class Query Temp Table Graph Fetch Execution Node
                Details
              </PanelListItem>
              <PanelDivider />
              <table className="query-builder__store-mapping-global-graph-fetch__container__table table">
                <thead>
                  <tr>
                    <th className="table__cell--left">Property</th>
                    <th className="table__cell--left">Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="table__cell--left"> NodeIndex</td>
                    <td className="table__cell--left">{node.nodeIndex}</td>
                  </tr>
                  {node.parentIndex && (
                    <tr>
                      <td className="table__cell--left">ParentIndex</td>
                      <td className="table__cell--left">{node.parentIndex}</td>
                    </tr>
                  )}
                  {node.authDependent && (
                    <tr>
                      <td className="table__cell--left">AuthDependent</td>
                      <td className="table__cell--left">
                        {node.authDependent.toString()}
                      </td>
                    </tr>
                  )}
                  {node.processedTempTableName && (
                    <tr>
                      <td className="table__cell--left">
                        processedTempTableName
                      </td>
                      <td className="table__cell--left">
                        {node.processedTempTableName}
                      </td>
                    </tr>
                  )}
                  {node.tempTableName && (
                    <tr>
                      <td className="table__cell--left">tempTableName</td>
                      <td className="table__cell--left">
                        {node.tempTableName}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <PanelDivider />
              <div className="query-builder__store-mapping-global-graph-fetch__container__implementation">
                <ImplementationViewer
                  node={node}
                  executionPlanState={executionPlanState}
                />
              </div>
              <PanelDivider />
              {node.executionNodes.length > 0 &&
                node.executionNodes[0] &&
                node.executionNodes[0] instanceof SQLExecutionNode && (
                  <>
                    <PanelListItem className="query-builder__store-mapping-global-graph-fetch__container__label2">
                      Execution Node Details
                    </PanelListItem>
                    <PanelDivider />
                    <SQLExecutionNodeViewerHelper
                      query={node.executionNodes[0].sqlQuery}
                      resultColumns={node.executionNodes[0].resultColumns}
                      resultType={node.executionNodes[0].resultType}
                      executionPlanState={executionPlanState}
                    />
                  </>
                )}
              <PanelDivider />
              <div className="query-builder__store-mapping-global-graph-fetch__container__result">
                <ResultTypeViewer resultType={node.resultType} />
              </div>
              <PanelDivider />
              <div className="query-builder__store-mapping-global-graph-fetch__container__result">
                <Button
                  className="btn--dark execution-node-viewer__unsupported-view__to-text-mode__btn"
                  onClick={(): void =>
                    executionPlanState.setViewMode(
                      EXECUTION_PLAN_VIEW_MODE.JSON,
                    )
                  }
                  text="View JSON"
                />
              </div>
            </div>
          )}
          {selectedTab === RELATIONAL_CLASS_QUERY_TABS.TEMP_TABLE &&
            node.tempTableStrategy && (
              <TempTableStrategyViewer
                tempTableStrategy={node.tempTableStrategy}
                executionPlanState={executionPlanState}
              />
            )}
        </div>
      </div>
    </PanelContent>
  );
});
