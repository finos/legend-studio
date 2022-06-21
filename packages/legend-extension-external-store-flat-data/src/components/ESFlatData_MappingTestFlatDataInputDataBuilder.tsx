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

import { EDITOR_LANGUAGE } from '@finos/legend-application';
import { StudioTextInputEditor } from '@finos/legend-application-studio';
import { observer } from 'mobx-react-lite';
import { flatData_setData } from '../stores/studio/ESFlatData_GraphModifierHelper.js';
import type { MappingTestFlatDataInputDataState } from '../stores/studio/ESFlatData_MappingTestFlatDataInputDataState.js';

export const MappingTestFlatDataInputDataBuilder = observer(
  (props: {
    inputDataState: MappingTestFlatDataInputDataState;
    isReadOnly: boolean;
  }) => {
    const { inputDataState, isReadOnly } = props;

    // Input data
    const updateInput = (val: string): void =>
      flatData_setData(inputDataState.inputData, val);

    return (
      <div className="panel__content mapping-test-editor__input-data-panel__content">
        <StudioTextInputEditor
          language={EDITOR_LANGUAGE.TEXT}
          inputValue={inputDataState.inputData.data}
          isReadOnly={isReadOnly}
          updateInput={updateInput}
        />
      </div>
    );
  },
);
