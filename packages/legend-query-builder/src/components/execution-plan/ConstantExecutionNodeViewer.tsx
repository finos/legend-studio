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
} from '@finos/legend-art';
import type { ConstantExecutionNode } from '@finos/legend-graph';
import { ResultTypeViewer } from './ResultTypeViewer.js';
import { isPlainObject } from '@finos/legend-shared';

export const ConstantExecutionNodeViewer: React.FC<{
  cnode: ConstantExecutionNode;
  executionPlanState: ExecutionPlanState;
}> = observer((props) => {
  const { cnode, executionPlanState } = props;
  const resultType = cnode.resultType;
  let value = '';
  const applicationStore = executionPlanState.applicationStore;
  try {
    value = (isPlainObject(cnode.values) ? cnode.values.value : '') as string;
  } catch {
    // do nothing
  }

  return (
    <PanelContent
      darkMode={
        !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
      }
    >
      {value !== '' && (
        <div className="query-builder__constant__container">
          <div>
            <PanelListItem className="query-builder__constant__container__item__label">
              Constant Execution Node Details
            </PanelListItem>
            <PanelDivider />
            <pre>
              <div className="query-builder__constant__container__item">
                <div>value: {value}</div>
              </div>
            </pre>
          </div>
        </div>
      )}
      <PanelDivider />
      <ResultTypeViewer resultType={resultType} />
      <div className="query-builder__constant__container">
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
