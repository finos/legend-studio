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
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import { useCallback } from 'react';
import {
  type ValueSpecification,
  GenericType,
  GenericTypeExplicitReference,
  observe_PrimitiveInstanceValue,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  PrimitiveType,
  VariableExpression,
} from '@finos/legend-graph';
import { useDrop } from 'react-dnd';
import { PanelEntryDropZonePlaceholder } from '@finos/legend-art';
import { generateDefaultValueForPrimitiveType } from '../../stores/QueryBuilderValueSpecificationHelper.js';
import {
  BasicValueSpecificationEditor,
  type QueryBuilderVariableDragSource,
  QUERY_BUILDER_VARIABLE_DND_TYPE,
  EditableBasicValueSpecificationEditor,
} from '../shared/BasicValueSpecificationEditor.js';
import { instanceValue_setValues } from '../../stores/shared/ValueSpecificationModifierHelper.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../graph/QueryBuilderMetaModelConst.js';
import { createSupportedFunctionExpression } from '../../stores/shared/ValueSpecificationEditorHelper.js';

export const MilestoningParameterEditor = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    parameter: ValueSpecification;
    setParameter: (val: ValueSpecification) => void;
    parameterValue: ValueSpecification | undefined;
    setParameterValue: (val: ValueSpecification) => void;
  }) => {
    const {
      queryBuilderState,
      parameter,
      setParameter,
      parameterValue,
      setParameterValue,
    } = props;
    const handleDrop = useCallback(
      (item: QueryBuilderVariableDragSource): void => {
        setParameter(item.variable);
      },
      [setParameter],
    );
    const [{ isDragOver }, dropConnector] = useDrop<
      QueryBuilderVariableDragSource,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: [QUERY_BUILDER_VARIABLE_DND_TYPE],
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item);
          }
        },
        collect: (monitor): { isDragOver: boolean } => ({
          isDragOver: monitor.isOver({
            shallow: true,
          }),
        }),
      }),
      [handleDrop],
    );
    const resetMilestoningParameter = (): void => {
      const param = observe_PrimitiveInstanceValue(
        new PrimitiveInstanceValue(
          GenericTypeExplicitReference.create(
            new GenericType(PrimitiveType.STRICTDATE),
          ),
        ),
        queryBuilderState.observerContext,
      );
      instanceValue_setValues(
        param,
        [generateDefaultValueForPrimitiveType(PRIMITIVE_TYPE.STRICTDATE)],
        queryBuilderState.observerContext,
      );
      setParameter(param);
    };

    return (
      <div
        ref={dropConnector}
        className="query-builder__milestoning-panel__variable-editor"
      >
        <div className="query-builder__milestoning-panel__variable-editor__variable">
          <PanelEntryDropZonePlaceholder
            isDragOver={isDragOver}
            label="Change Milestoning Parameter Value"
          >
            <BasicValueSpecificationEditor
              valueSpecification={parameter}
              graph={queryBuilderState.graphManagerState.graph}
              observerContext={queryBuilderState.observerContext}
              setValueSpecification={(val: ValueSpecification): void =>
                setParameter(val)
              }
              typeCheckOption={{
                expectedType: PrimitiveType.DATE,
              }}
              resetValue={resetMilestoningParameter}
              isConstant={queryBuilderState.constantState.isValueSpecConstant(
                parameter,
              )}
            />
          </PanelEntryDropZonePlaceholder>
        </div>
        {parameter instanceof VariableExpression && parameterValue && (
          <div className="query-builder__milestoning-panel__variable-editor__value">
            <EditableBasicValueSpecificationEditor
              valueSpecification={parameterValue}
              setValueSpecification={setParameterValue}
              graph={queryBuilderState.graphManagerState.graph}
              observerContext={queryBuilderState.observerContext}
              typeCheckOption={{
                expectedType: PrimitiveType.DATE,
              }}
              resetValue={() => {
                const now = createSupportedFunctionExpression(
                  QUERY_BUILDER_SUPPORTED_FUNCTIONS.NOW,
                  PrimitiveType.DATETIME,
                );
                setParameterValue(now);
              }}
              initializeAsEditable={true}
            />
          </div>
        )}
      </div>
    );
  },
);
