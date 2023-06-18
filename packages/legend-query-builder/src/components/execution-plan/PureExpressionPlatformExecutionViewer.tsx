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

import { PanelListItem, PanelDivider, Button } from '@finos/legend-art';
import {
  type PureExpressionPlatformExecutionNode,
  type ValueSpecification,
} from '@finos/legend-graph';
import { ResultTypeViewer } from './ResultTypeViewer.js';
import { useState } from 'react';
import {
  CodeEditor,
  CODE_EDITOR_LANGUAGE,
} from '@finos/legend-lego/code-editor';
import { ImplementationViewer } from './ImplementationViewer.js';

export const PureExpressionPlatformExecutionNodeViewer: React.FC<{
  node: PureExpressionPlatformExecutionNode;
  executionPlanState: ExecutionPlanState;
}> = observer((props) => {
  const [pureCode, setPureCode] = useState('');
  const { node, executionPlanState } = props;
  const pureMap = new Map<string, ValueSpecification>([['pure', node.pure]]);

  const getPureCode = async (
    map: Map<string, ValueSpecification>,
    pretty: boolean,
  ): Promise<Map<string, string>> =>
    executionPlanState.graphManagerState.graphManager.valueSpecificationsToPureCode(
      map,
      pretty,
    );

  getPureCode(pureMap, true).then(
    (value) =>
      setPureCode(`$collection->${value.get('pure')?.substring(4) ?? ''}`),
    () => setPureCode(''),
  );

  return (
    <div>
      <PanelListItem className="query-builder__pure-expression-platform__container__header">
        Pure Code
      </PanelListItem>
      <PanelDivider />
      <div className="query-builder__pure-expression-platform__container__code">
        <CodeEditor
          inputValue={pureCode}
          isReadOnly={true}
          language={CODE_EDITOR_LANGUAGE.PURE}
          hideMinimap={true}
          hideActionBar={true}
        />
      </div>
      <PanelDivider />
      <div className="query-builder__pure-expression-platform__container__implementation">
        <ImplementationViewer
          node={node}
          executionPlanState={executionPlanState}
        />
      </div>
      <PanelDivider />
      <ResultTypeViewer resultType={node.resultType} />
      <div className="query-builder__pure-expression-platform__container__btn">
        <Button
          className="btn--dark execution-node-viewer__unsupported-view__to-text-mode__btn"
          onClick={(): void =>
            executionPlanState.setViewMode(EXECUTION_PLAN_VIEW_MODE.JSON)
          }
          text="View JSON"
        />
      </div>
    </div>
  );
});
