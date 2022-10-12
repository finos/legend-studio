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
import type { ExecutionPlanState } from '../../stores/ExecutionPlanState.js';
import { format } from 'sql-formatter';
import type { SQLResultColumn } from '@finos/legend-graph';
import { TextInputEditor } from '../shared/TextInputEditor.js';
import { EDITOR_LANGUAGE } from '../../const.js';

/**
 * TODO: Create a new `AbstractPlugin` for this, called `ExecutionPlanViewerPlugin`
 * when we modularize relational and execution plan processing, etc.
 *
 * @modularize
 * See https://github.com/finos/legend-studio/issues/65
 */
export const SQLExecutionNodeViewer: React.FC<{
  query: string;
  resultColumns: SQLResultColumn[];
  executionPlanState: ExecutionPlanState;
}> = observer((props) => {
  const { query } = props;

  return (
    <TextInputEditor
      inputValue={format(query)}
      isReadOnly={true}
      language={EDITOR_LANGUAGE.SQL}
      showMiniMap={false}
    />
  );
});
