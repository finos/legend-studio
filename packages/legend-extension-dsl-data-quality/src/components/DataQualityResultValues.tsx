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
import type { DataQualityState } from './states/DataQualityState.js';
import {
  type ExecutionResult,
  extractExecutionResultValues,
  RawExecutionResult,
} from '@finos/legend-graph';
import {
  CODE_EDITOR_LANGUAGE,
  CodeEditor,
} from '@finos/legend-lego/code-editor';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';

export const DataQualityResultValues = observer(
  (props: {
    executionResult: ExecutionResult;
    dataQualityState: DataQualityState;
  }) => {
    const { executionResult } = props;
    if (executionResult instanceof RawExecutionResult) {
      const inputValue =
        executionResult.value === null
          ? 'null'
          : executionResult.value.toString();
      return (
        <CodeEditor
          language={CODE_EDITOR_LANGUAGE.TEXT}
          inputValue={inputValue}
          isReadOnly={true}
        />
      );
    }
    return (
      <CodeEditor
        language={CODE_EDITOR_LANGUAGE.JSON}
        inputValue={JSON.stringify(
          extractExecutionResultValues(executionResult),
          null,
          DEFAULT_TAB_SIZE,
        )}
        isReadOnly={true}
      />
    );
  },
);
