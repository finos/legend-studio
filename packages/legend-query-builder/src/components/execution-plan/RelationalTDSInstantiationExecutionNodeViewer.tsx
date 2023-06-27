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
  SQLExecutionNode,
  type RelationalTDSInstantiationExecutionNode,
} from '@finos/legend-graph';
import { PanelDivider, Button, PanelContent } from '@finos/legend-art';
import { SQLExecutionNodeViewerHelper } from './SQLExecutionNodeViewer.js';
import { ResultTypeViewer } from './ResultTypeViewer.js';

export const RelationalTDSInstantiationExecutionNodeViewer: React.FC<{
  node: RelationalTDSInstantiationExecutionNode;
  executionPlanState: ExecutionPlanState;
}> = observer((props) => {
  const { node, executionPlanState } = props;
  const resultType = node.resultType;
  const applicationStore = executionPlanState.applicationStore;

  return (
    <PanelContent
      darkMode={
        !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
      }
    >
      {node.executionNodes.length > 0 &&
        node.executionNodes[0] !== undefined &&
        node.executionNodes[0] instanceof SQLExecutionNode && (
          <SQLExecutionNodeViewerHelper
            query={node.executionNodes[0].sqlQuery}
            resultColumns={node.executionNodes[0].resultColumns}
            resultType={node.executionNodes[0].resultType}
            executionPlanState={executionPlanState}
          />
        )}
      <PanelDivider />
      <ResultTypeViewer resultType={resultType} />
      <div className="query-builder__sql__container">
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
