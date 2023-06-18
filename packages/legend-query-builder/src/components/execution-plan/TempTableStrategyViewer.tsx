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

import { PanelDivider, PanelListItem } from '@finos/legend-art';
import {
  LoadFromResultSetAsValueTuplesTempTableStrategy,
  LoadFromSubQueryTempTableStrategy,
  LoadFromTempFileTempTableStrategy,
  type TempTableStrategy,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import {
  ExecutionNodeViewer,
  generateExecutionNodeLabel,
} from './ExecutionPlanViewer.js';
import { type ExecutionPlanState } from '../../stores/execution-plan/ExecutionPlanState.js';

export enum TEMP_TABLE_STRATEGY_TYPES {
  RESULT_SET = 'resultSet',
  TEMP_FILE = 'tempFile',
  SUB_QUERY = 'subQuery',
}

export const TempTableStrategyViewer: React.FC<{
  tempTableStrategy: TempTableStrategy;
  executionPlanState: ExecutionPlanState;
}> = observer((props) => {
  const { tempTableStrategy, executionPlanState } = props;
  let _type = '';
  if (
    tempTableStrategy instanceof LoadFromResultSetAsValueTuplesTempTableStrategy
  ) {
    _type = TEMP_TABLE_STRATEGY_TYPES.RESULT_SET;
  } else if (tempTableStrategy instanceof LoadFromTempFileTempTableStrategy) {
    _type = TEMP_TABLE_STRATEGY_TYPES.TEMP_FILE;
  }
  if (tempTableStrategy instanceof LoadFromSubQueryTempTableStrategy) {
    _type = TEMP_TABLE_STRATEGY_TYPES.SUB_QUERY;
  }
  return (
    <div className="query-builder__temp-table-strategy__container">
      {_type && (
        <PanelListItem className="query-builder__temp-table-strategy__container__item">
          Type: {_type}
        </PanelListItem>
      )}
      <PanelListItem className="query-builder__temp-table-strategy__container__header">
        {`Create Temp Table (${generateExecutionNodeLabel(
          tempTableStrategy.createTempTableNode,
        )})`}
      </PanelListItem>
      <ExecutionNodeViewer
        executionNode={tempTableStrategy.createTempTableNode}
        executionPlanState={executionPlanState}
        viewJson={false}
      />
      <PanelDivider />

      <PanelListItem className="query-builder__temp-table-strategy__container__header">
        {`Load Temp Table (${generateExecutionNodeLabel(
          tempTableStrategy.loadTempTableNode,
        )})`}
      </PanelListItem>
      <ExecutionNodeViewer
        executionNode={tempTableStrategy.loadTempTableNode}
        executionPlanState={executionPlanState}
        viewJson={false}
      />
      <PanelDivider />

      <PanelListItem className="query-builder__temp-table-strategy__container__header">
        {`Drop Temp Table (${generateExecutionNodeLabel(
          tempTableStrategy.dropTempTableNode,
        )})`}
      </PanelListItem>
      <ExecutionNodeViewer
        executionNode={tempTableStrategy.dropTempTableNode}
        executionPlanState={executionPlanState}
        viewJson={false}
      />
      <PanelDivider />
    </div>
  );
});
