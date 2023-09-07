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

import { PanelListItem } from '@finos/legend-art';
import {
  type ExecutionNode,
  ExecutionPlan,
  JavaPlatformImplementation,
} from '@finos/legend-graph';
import { guaranteeType } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import {
  type ExecutionPlanState,
  PLAN_TABS,
} from '../../stores/execution-plan/ExecutionPlanState.js';

export const ImplementationViewer: React.FC<{
  node: ExecutionNode;
  executionPlanState: ExecutionPlanState;
}> = observer((props) => {
  const { node, executionPlanState } = props;

  const openJavaClass = (): void => {
    executionPlanState.setSelectedNode(
      executionPlanState.treeData?.nodes.get(`Execution Plan`),
    );
    executionPlanState.transformMetadataToProtocolJson(
      guaranteeType(
        executionPlanState.plan,
        ExecutionPlan,
        'Execution plan is undefined',
      ),
    );
    executionPlanState.globalImplementationSupportState.setSelectedTab(
      PLAN_TABS.GLOBAL_IMPLEMENTATION_SUPPORT,
    );
    if (node.implementation instanceof JavaPlatformImplementation) {
      executionPlanState.globalImplementationSupportState.setSelectedJavaClass(
        node.implementation.executionClassFullName,
      );
    }
  };

  return (
    <>
      <PanelListItem className="query-builder__implementation__container__header">
        Implementation
      </PanelListItem>
      {node.implementation instanceof JavaPlatformImplementation &&
        node.implementation.executionClassFullName && (
          <div className="query-builder__implementation__container__item">
            <button
              onClick={openJavaClass}
              title={`Go to Java class: ${node.implementation.executionClassFullName}`}
              className="query-builder__implementation__container__item__java-btn"
            >
              {node.implementation.executionClassFullName}
            </button>
          </div>
        )}
    </>
  );
});
