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

import {
  FunctionSelectionHandler,
  RenderColumn,
} from './DataQualityRelationLambdaGUIDataTypeHandlers.js';
import { EditableBasicValueSpecificationEditor } from '@finos/legend-query-builder';
import type { DATA_QUALITY_VALIDATION_PURE_FUNCTIONS } from './constants/DataQualityConstants.js';
import {
  PRIMITIVE_TYPE,
  type CollectionInstanceValue,
  type ObserverContext,
  type PrimitiveInstanceValue,
  type PureModel,
  type ValueSpecification,
} from '@finos/legend-graph';
import type { Option } from './DataQualityCustomSelector.js';
import { useState } from 'react';

interface ColumnOption {
  value: string;
  label: string;
  type: string;
}

interface DataQualityValidationFunctionRendererProps {
  id: string;
  columnOptions: ColumnOption[];
  functionOptions?: Option[];
  handleColChange: (value: string, type: string) => void;
  readOnly: boolean;
  selectedColumn: ColumnOption | undefined;
  functionName: string;
  functionParameters: ValueSpecification[];
  handleFunctionChange: (name: string, id: string) => void;
  handleFunctionParametersChange: (
    param: PrimitiveInstanceValue | CollectionInstanceValue,
    index: number,
  ) => void;
  graph: PureModel;
  observerContext: ObserverContext;
}

export function DataQualityValidationFunctionRenderer({
  id,
  columnOptions,
  functionOptions,
  handleColChange,
  readOnly,
  selectedColumn,
  functionParameters,
  handleFunctionChange,
  handleFunctionParametersChange,
  functionName,
  graph,
  observerContext,
}: DataQualityValidationFunctionRendererProps) {
  const [initializeAsEditable, setInitializeAsEditable] = useState(false);

  return (
    <div className="data-quality-validation-gui-editor__function">
      <div className="data-quality-validation-gui-editor__function__parameter">
        <RenderColumn
          column={selectedColumn}
          onChange={({ value, type }) => {
            handleColChange(value, type);
          }}
          options={columnOptions}
          disabled={readOnly}
        />
      </div>
      <div className="data-quality-validation-gui-editor__function__selector">
        <FunctionSelectionHandler
          value={functionName}
          options={functionOptions ?? []}
          onChange={(name: string) => {
            handleFunctionChange(
              name as DATA_QUALITY_VALIDATION_PURE_FUNCTIONS,
              id,
            );
          }}
          disabled={readOnly}
        />
      </div>

      {functionParameters.map((param, idx) => {
        const genericType = param.genericType;
        if (!genericType) {
          return null;
        }
        const type = genericType.value.rawType.name;
        return (
          <div
            className="data-quality-validation-gui-editor__function__parameter data-quality-validation-gui-editor__function__parameter--value"
            key={getParameterKey(param.hashCode, idx)}
            onFocus={() => setInitializeAsEditable(true)}
            onBlur={() => setInitializeAsEditable(false)}
          >
            <EditableBasicValueSpecificationEditor
              valueSpecification={param}
              enableExpressionCalculation={false}
              displayAsString={!isPrimitiveNumber(type)}
              setValueSpecification={(newValue) => {
                handleFunctionParametersChange(
                  newValue as PrimitiveInstanceValue | CollectionInstanceValue,
                  idx,
                );
              }}
              graph={graph}
              observerContext={observerContext}
              typeCheckOption={{
                expectedType: genericType.value.rawType,
              }}
              resetValue={() => null}
              isConstant={false}
              initializeAsEditable={initializeAsEditable}
              readOnly={readOnly}
            />
          </div>
        );
      })}
    </div>
  );
}

function getParameterKey(hasCode: string, index: number) {
  return `${hasCode}${index}`;
}

function isPrimitiveNumber(type?: string): boolean {
  switch (type) {
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.INTEGER:
    case PRIMITIVE_TYPE.FLOAT:
    case PRIMITIVE_TYPE.DECIMAL:
      return true;
    default:
      return false;
  }
}
