/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import type { DataQualityRelationValidationState } from './states/DataQualityRelationValidationState.js';
import { instanceValue_setValues } from '@finos/legend-query-builder';
import { ColSpec } from '@finos/legend-graph';
import type { DataQualityValidationCustomHelperFunction } from './utils/DataQualityValidationFunction.js';
import { DataQualityValidationFunctionRenderer } from './DataQualityValidationFunctionRenderer.js';
import { DataQualityValidationFunctionsUtils } from './utils/DataQualityValidationFunctionsUtils.js';

export const DataQualityValidationHelperFunctionEditor = observer(
  (props: {
    validationState: DataQualityRelationValidationState;
    disabled: boolean;
    validationFunction: DataQualityValidationCustomHelperFunction;
  }) => {
    const { validationState, validationFunction, disabled } = props;
    const { columnOptions, dataQualityValidationLambdaFormState } =
      validationState;
    const observerContext =
      validationState.editorStore.changeDetectionState.observerContext;
    const graph = validationState.editorStore.graphManagerState.graph;
    const { column, otherParams } = validationFunction.parameters;
    const columnOption = columnOptions.find(
      ({ value }) => value === column.values[0]?.name,
    );

    if (!dataQualityValidationLambdaFormState) {
      return null;
    }

    const { handleValidationBodyChange } = dataQualityValidationLambdaFormState;

    return (
      <DataQualityValidationFunctionRenderer
        id={validationFunction.id}
        columnOptions={columnOptions}
        graph={graph}
        observerContext={observerContext}
        readOnly={disabled}
        functionName={validationFunction.name}
        functionParameters={otherParams}
        functionOptions={DataQualityValidationFunctionsUtils.getFunctionOptionsByColType(
          columnOption?.type ?? '',
        )}
        handleColChange={(value: string) => {
          const colSpec = new ColSpec();
          colSpec.name = value;
          instanceValue_setValues(column, [colSpec], observerContext);
          validationState.debouncedHandleValidationFormChange();
        }}
        selectedColumn={columnOptions.find(
          ({ value }) => value === column.values[0]?.name,
        )}
        handleFunctionChange={(name: string) => {
          handleValidationBodyChange(name);
          validationState.debouncedHandleValidationFormChange();
        }}
        handleFunctionParametersChange={() => {
          validationState.debouncedHandleValidationFormChange();
        }}
      />
    );
  },
);
