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
import type { ExecutionPlanState } from '../../stores/execution-plan/ExecutionPlanState.js';
import { PanelListItem, PanelDivider, PanelContent } from '@finos/legend-art';
import {
  ConstantExecutionNode,
  type AllocationExecutionNode,
} from '@finos/legend-graph';
import { ResultTypeViewer } from './ResultTypeViewer.js';
import { ConstantExecutionNodeViewer } from './ConstantExecutionNodeViewer.js';

export const AllocationExecutionNodeViewer: React.FC<{
  node: AllocationExecutionNode;
  executionPlanState: ExecutionPlanState;
}> = observer((props) => {
  const { node, executionPlanState } = props;
  const varName = node.varName;
  const resultType = node.resultType;
  const realizeInMemory = node.realizeInMemory.toString();
  const applicationStore = executionPlanState.applicationStore;

  return (
    <PanelContent
      darkMode={
        !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
      }
    >
      <div className="query-builder__allocation__container">
        <div>
          <PanelListItem className="query-builder__allocation__container__item__label">
            Allocation Node Details
          </PanelListItem>
          <PanelDivider />
          <div className="query-builder__allocation__container__item">
            <table className="query-builder__allocation__container__table">
              <tbody>
                <tr>
                  <td>varName</td>
                  <td>{`: ${varName}`}</td>
                </tr>
                <tr>
                  <td>realizeInMemory</td>
                  <td>{`: ${realizeInMemory}`}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <PanelDivider />
      <ResultTypeViewer resultType={resultType} />
      <PanelDivider />
      {node.executionNodes.length > 0 &&
        node.executionNodes[0] !== undefined &&
        node.executionNodes[0] instanceof ConstantExecutionNode && (
          <ConstantExecutionNodeViewer
            cnode={node.executionNodes[0]}
            executionPlanState={executionPlanState}
          />
        )}
      <PanelDivider />
    </PanelContent>
  );
});
