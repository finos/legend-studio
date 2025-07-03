/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { useCallback, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { InlineLambdaEditor } from '@finos/legend-query-builder';
import type {
  RelationFunctionInstanceSetImplementationState,
  RelationFunctionPropertyMappingState,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/RelationFunctionInstanceSetImplementationState.js';
import { type ConnectDropTarget, useDrop } from 'react-dnd';
import {
  getClassPropertyType,
  CLASS_PROPERTY_TYPE,
} from '../../../../stores/editor/utils/ModelClassifierUtils.js';
import { RelationTypeDragSource } from './RelationTypeTree.js';
import { CORE_DND_TYPE } from '../../../../stores/editor/utils/DnDUtils.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

const SimplePropertyMappingEditor = observer(
  (props: {
    propertyMappingState: RelationFunctionPropertyMappingState;
    dropConnector?: ConnectDropTarget;
    transformProps: {
      disableTransform: boolean;
      forceBackdrop: boolean;
    };
    isReadOnly: boolean;
  }) => {
    const { propertyMappingState, dropConnector, transformProps } = props;
    const ref = useRef<HTMLDivElement>(null);
    dropConnector?.(ref);
    return (
      <div className="property-mapping-editor__entry__container">
        <div ref={ref} className="property-mapping-editor__entry">
          <InlineLambdaEditor
            disabled={transformProps.disableTransform}
            lambdaEditorState={propertyMappingState}
            forceBackdrop={transformProps.forceBackdrop}
          />
        </div>
      </div>
    );
  },
);

export const RelationFunctionPropertyMappingEditor = observer(
  (props: {
    relationPropertyMappingState: RelationFunctionPropertyMappingState;
    relationInstanceSetImplementationState: RelationFunctionInstanceSetImplementationState;
    setImplementationHasParserError: boolean;
    isReadOnly: boolean;
  }) => {
    const {
      relationPropertyMappingState: relationPropertyMappingState,
      relationInstanceSetImplementationState:
        relationInstanceSetImplementationState,
      setImplementationHasParserError,
      isReadOnly,
    } = props;
    const disableEditingTransform =
      relationInstanceSetImplementationState.isConvertingTransformLambdaObjects ||
      isReadOnly;
    // Drag and Drop
    const handleDrop = useCallback(
      (droppedItem: RelationTypeDragSource): void => {
        if (!disableEditingTransform) {
          if (droppedItem instanceof RelationTypeDragSource) {
            const toAppend = guaranteeNonNullable(droppedItem.data).id;
            if (toAppend) {
              relationPropertyMappingState.setLambdaString(
                relationPropertyMappingState.lambdaString + toAppend,
              );
            }
          }
        }
      },
      [disableEditingTransform, relationPropertyMappingState],
    );
    const [, dropConnector] = useDrop<RelationTypeDragSource>(
      () => ({
        accept: [CORE_DND_TYPE.PROJECT_EXPLORER_FUNCTION],
        drop: (item) => handleDrop(item),
      }),
      [handleDrop],
    );
    const transformProps = {
      disableTransform:
        relationInstanceSetImplementationState.isConvertingTransformLambdaObjects,
      forceBackdrop: setImplementationHasParserError,
    };

    switch (
      getClassPropertyType(
        relationPropertyMappingState.propertyMapping.property.value.genericType
          .value.rawType,
      )
    ) {
      case CLASS_PROPERTY_TYPE.UNIT:
      case CLASS_PROPERTY_TYPE.MEASURE:
      case CLASS_PROPERTY_TYPE.PRIMITIVE:
        return (
          <SimplePropertyMappingEditor
            propertyMappingState={relationPropertyMappingState}
            dropConnector={dropConnector}
            transformProps={transformProps}
            isReadOnly={isReadOnly}
          />
        );
      default:
        return null;
    }
  },
);
