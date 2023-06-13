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
import { generateExecutionNodeLabel } from './ExecutionPlanViewer.js';
import {
  type ExecutionPlanState,
  EXECUTION_PLAN_VIEW_MODE,
  ExecutionPlanViewTreeNodeData,
  ExecutionNodeTreeNodeData,
} from '../../stores/execution-plan/ExecutionPlanState.js';

import {
  PanelListItem,
  PanelDivider,
  Button,
  PanelContent,
} from '@finos/legend-art';
import type { ExecutionNode, SequenceExecutionNode } from '@finos/legend-graph';
import { ResultTypeViewer } from './ResultTypeViewer.js';

export const SequenceExecutionNodeViewer: React.FC<{
  node: SequenceExecutionNode;
  executionPlanState: ExecutionPlanState;
}> = observer((props) => {
  const { node, executionPlanState } = props;
  const resultType = node.resultType;
  const applicationStore = executionPlanState.applicationStore;
  const openExecutionNode = (child: ExecutionNode): void => {
    const newNode = executionPlanState.treeData?.nodes.get(child._UUID);
    if (newNode instanceof ExecutionPlanViewTreeNodeData) {
      executionPlanState.transformMetadataToProtocolJson(newNode.executionPlan);
    } else if (newNode instanceof ExecutionNodeTreeNodeData) {
      executionPlanState.transformMetadataToProtocolJson(newNode.executionNode);
    }
    executionPlanState.setSelectedNode(newNode);
  };

  return (
    <PanelContent
      darkMode={
        !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
      }
    >
      <div className="query-builder__sequence__container">
        <div>
          <PanelListItem className="query-builder__sequence__container__item__label">
            Execution Nodes
          </PanelListItem>
          <PanelDivider />
          {node.executionNodes.map((child, index) => (
            <div
              className="query-builder__sequence__container__item"
              key={child._UUID}
            >
              <button
                className="query-builder__sequence__container__item__btn"
                onClick={() => openExecutionNode(child)}
                tabIndex={-1}
                title={`Go to ${generateExecutionNodeLabel(child)}`}
              >
                {`${index + 1}: ${generateExecutionNodeLabel(child)}`}
              </button>
            </div>
          ))}
        </div>
      </div>
      <PanelDivider />
      <ResultTypeViewer resultType={resultType} />
      <div className="query-builder__execution__container">
        <Button
          className="btn--dark execution-node-viewer__unsupported-view__to-text-mode__btn"
          onClick={(): void =>
            executionPlanState.setViewMode(EXECUTION_PLAN_VIEW_MODE.JSON)
          }
          text="View JSON"
        />
      </div>
      <PanelDivider />
    </PanelContent>
  );
});
