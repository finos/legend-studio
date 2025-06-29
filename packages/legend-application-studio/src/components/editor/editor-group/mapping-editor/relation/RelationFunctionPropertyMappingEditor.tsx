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

import { useCallback, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { type ConnectDropTarget, useDrop } from 'react-dnd';
import {
  CLASS_PROPERTY_TYPE,
  getClassPropertyType,
} from '../../../../../stores/editor/utils/ModelClassifierUtils.js';
import { InlineLambdaEditor } from '@finos/legend-query-builder';
import type {
  RelationFunctionInstanceSetImplementationState,
  RelationFunctionPropertyMappingState,
} from '../../../../../stores/editor/editor-state/element-editor-state/mapping/relation/RelationFunctionInstanceSetImplementationState.js';
import {
  TABLE_ELEMENT_DND_TYPE,
  TableOrViewTreeNodeDragSource,
} from '../relational/TableOrViewSourceTree.js';

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

export const RelationalPropertyMappingEditor = observer(
  (props: {
    relationFunctionPropertyMappingState: RelationFunctionPropertyMappingState;
    relationalInstanceSetImplementationState: RelationFunctionInstanceSetImplementationState;
    setImplementationHasParserError: boolean;
    isReadOnly: boolean;
  }) => {
    const {
      relationFunctionPropertyMappingState: relationalPropertyMappingState,
      relationalInstanceSetImplementationState,
      setImplementationHasParserError,
      isReadOnly,
    } = props;
    const disableEditingTransform =
      relationalInstanceSetImplementationState.isConvertingTransformLambdaObjects ||
      isReadOnly;
    // Drag and Drop
    const handleDrop = useCallback(
      (droppedItem: TableOrViewTreeNodeDragSource): void => {
        if (!disableEditingTransform) {
          if (droppedItem instanceof TableOrViewTreeNodeDragSource) {
            const toAppend = droppedItem.data.id;
            if (toAppend) {
              relationalPropertyMappingState.setLambdaString(
                relationalPropertyMappingState.lambdaString + toAppend,
              );
            }
          }
        }
      },
      [disableEditingTransform, relationalPropertyMappingState],
    );
    const [, dropConnector] = useDrop<TableOrViewTreeNodeDragSource>(
      () => ({
        accept: [TABLE_ELEMENT_DND_TYPE],
        drop: (item) => handleDrop(item),
      }),
      [handleDrop],
    );
    const transformProps = {
      disableTransform:
        relationalInstanceSetImplementationState.isConvertingTransformLambdaObjects,
      forceBackdrop: setImplementationHasParserError,
    };
    switch (
      getClassPropertyType(
        relationalPropertyMappingState.propertyMapping.property.value
          .genericType.value.rawType,
      )
    ) {
      case CLASS_PROPERTY_TYPE.UNIT:
      case CLASS_PROPERTY_TYPE.MEASURE:
      case CLASS_PROPERTY_TYPE.PRIMITIVE:
        return (
          <SimplePropertyMappingEditor
            propertyMappingState={relationalPropertyMappingState}
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
