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
import {
  type FlatDataPropertyMappingTransformDropTarget,
  CORE_DND_TYPE,
  FlatDataColumnDragSource,
} from '../../../../stores/editor/utils/DnDUtils.js';
import {
  type MappingElement,
  MappingEditorState,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingEditorState.js';
import type {
  FlatDataPropertyMappingState,
  FlatDataInstanceSetImplementationState,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/FlatDataInstanceSetImplementationState.js';
import {
  clsx,
  CustomSelectorInput,
  ArrowCircleRightIcon,
} from '@finos/legend-art';
import { type ConnectDropTarget, useDrop } from 'react-dnd';
import { useEditorStore } from '../../EditorStoreProvider.js';
import { guaranteeType } from '@finos/legend-shared';
import {
  Enumeration,
  EnumerationMapping,
  FlatDataPropertyMapping,
  getEnumerationMappingsByEnumeration,
  getRawGenericType,
  EnumerationMappingExplicitReference,
} from '@finos/legend-graph';
import { flatDataPropertyMapping_setTransformer } from '../../../../stores/graph-modifier/STO_FlatData_GraphModifierHelper.js';
import {
  CLASS_PROPERTY_TYPE,
  getClassPropertyType,
} from '../../../../stores/editor/utils/ModelClassifierUtils.js';
import { InlineLambdaEditor } from '@finos/legend-query-builder';

const SimplePropertyMappingEditor = observer(
  (props: {
    propertyMappingState: FlatDataPropertyMappingState;
    dropConnector?: ConnectDropTarget | undefined;
    dragItem?: FlatDataPropertyMappingTransformDropTarget | undefined;
    transformProps: {
      disableTransform: boolean;
      forceBackdrop: boolean;
    };
    isReadOnly: boolean;
  }) => {
    const { propertyMappingState, dropConnector, dragItem, transformProps } =
      props;
    const ref = useRef<HTMLDivElement>(null);
    dropConnector?.(ref);
    const propertyMapping = propertyMappingState.propertyMapping;
    const expectedType =
      propertyMapping.property.value.genericType.value.rawType;
    const canDrop =
      dragItem &&
      dragItem.data.field.flatDataDataType._correspondingPrimitiveType ===
        expectedType;
    const onExpectedTypeLabelSelect = (): void =>
      propertyMappingState.instanceSetImplementationState.setSelectedType(
        expectedType,
      );
    const matchedExpectedTypeLabel = (): boolean =>
      Boolean(expectedType) &&
      propertyMappingState.instanceSetImplementationState.selectedType ===
        expectedType;

    return (
      <div className="property-mapping-editor__entry__container">
        <div ref={ref} className="property-mapping-editor__entry">
          <InlineLambdaEditor
            className={clsx({ 'lambda-editor--dnd-match': canDrop })}
            disabled={transformProps.disableTransform}
            lambdaEditorState={propertyMappingState}
            forceBackdrop={transformProps.forceBackdrop}
            expectedType={expectedType}
            onExpectedTypeLabelSelect={onExpectedTypeLabelSelect}
            matchedExpectedType={matchedExpectedTypeLabel}
          />
        </div>
      </div>
    );
  },
);

const EnumerationPropertyMappingEditor = observer(
  (props: {
    propertyMappingState: FlatDataPropertyMappingState;
    dropConnector?: ConnectDropTarget | undefined;
    dragItem?: FlatDataPropertyMappingTransformDropTarget | undefined;
    transformProps: {
      disableTransform: boolean;
      forceBackdrop: boolean;
    };
    isReadOnly: boolean;
  }) => {
    const {
      propertyMappingState,
      dropConnector,
      dragItem,
      transformProps,
      isReadOnly,
    } = props;
    const ref = useRef<HTMLDivElement>(null);
    dropConnector?.(ref);
    const editorStore = useEditorStore();
    const mappingEditorState =
      editorStore.tabManagerState.getCurrentEditorState(MappingEditorState);
    const propertyMapping = guaranteeType(
      propertyMappingState.propertyMapping,
      FlatDataPropertyMapping,
      'Flat-data property mapping for enumeration type property must be a simple property mapping',
    );
    const enumeration = getRawGenericType(
      propertyMapping.property.value.genericType.value,
      Enumeration,
    );
    const expectedType =
      propertyMapping.transformer?.value.sourceType?.value ?? enumeration;
    const onExpectedTypeLabelSelect = (): void =>
      propertyMappingState.instanceSetImplementationState.setSelectedType(
        expectedType,
      );
    const matchedExpectedTypeLabel = (): boolean =>
      Boolean(expectedType) &&
      propertyMappingState.instanceSetImplementationState.selectedType ===
        expectedType;
    // Enumeration Mapping Selector
    const options = getEnumerationMappingsByEnumeration(
      mappingEditorState.mapping,
      enumeration,
    ).map((em) => ({ value: em, label: em.id.value }));
    const handleSelectionChange = (
      val: { label: string; value: EnumerationMapping } | null,
    ): void =>
      flatDataPropertyMapping_setTransformer(
        propertyMapping,
        val?.value
          ? EnumerationMappingExplicitReference.create(val.value)
          : undefined,
      );
    // Walker
    const visit = (): void => {
      const currentTransformerEnumerationMaping =
        propertyMapping.transformer?.value;
      if (currentTransformerEnumerationMaping) {
        mappingEditorState.openMappingElement(
          currentTransformerEnumerationMaping,
          true,
        );
      } else {
        if (!isReadOnly) {
          mappingEditorState.createMappingElement({
            target: enumeration,
            showTarget: false,
            openInAdjacentTab: true,
            postSubmitAction: (
              newEnumerationMapping: MappingElement | undefined,
            ): void => {
              if (newEnumerationMapping instanceof EnumerationMapping) {
                flatDataPropertyMapping_setTransformer(
                  propertyMapping,
                  EnumerationMappingExplicitReference.create(
                    newEnumerationMapping,
                  ),
                );
              }
            },
          });
        }
      }
    };
    // Drag and Drop
    const canDrop =
      dragItem?.data.field.flatDataDataType._correspondingPrimitiveType &&
      dragItem.data.field.flatDataDataType._correspondingPrimitiveType ===
        expectedType;

    return (
      <div className="property-mapping-editor__entry__container">
        <div ref={ref} className="property-mapping-editor__entry">
          <div className="property-mapping-editor__entry__enumeration-mapping-selector">
            <CustomSelectorInput
              disabled={options.length <= 1 || isReadOnly}
              options={options}
              onChange={handleSelectionChange}
              value={
                propertyMapping.transformer
                  ? {
                      label:
                        propertyMapping.transformer.valueForSerialization ?? '',
                      value: propertyMapping.transformer.value,
                    }
                  : null
              }
              placeholder="Choose an existing enumeration mapping"
            />
            <button
              className="property-mapping-editor__entry__visit-btn"
              onClick={visit}
              tabIndex={-1}
              title="Visit enumeration mapping"
            >
              <ArrowCircleRightIcon />
            </button>
          </div>
          <InlineLambdaEditor
            className={clsx(
              'property-mapping-editor__entry__enumeration__transform',
              { 'lambda-editor--dnd-match': canDrop },
            )}
            disabled={transformProps.disableTransform}
            lambdaEditorState={propertyMappingState}
            forceBackdrop={transformProps.forceBackdrop}
            expectedType={expectedType}
            onExpectedTypeLabelSelect={onExpectedTypeLabelSelect}
            matchedExpectedType={matchedExpectedTypeLabel}
          />
        </div>
      </div>
    );
  },
);

export const FlatDataPropertyMappingEditor = observer(
  (props: {
    flatDataPropertyMappingState: FlatDataPropertyMappingState;
    flatDataInstanceSetImplementationState: FlatDataInstanceSetImplementationState;
    setImplementationHasParserError: boolean;
    isReadOnly: boolean;
  }) => {
    const {
      flatDataPropertyMappingState,
      flatDataInstanceSetImplementationState,
      setImplementationHasParserError,
      isReadOnly,
    } = props;
    const disableEditingTransform =
      flatDataInstanceSetImplementationState.isConvertingTransformLambdaObjects ||
      isReadOnly;
    // Drag and Drop
    const handleDrop = useCallback(
      (droppedItem: FlatDataPropertyMappingTransformDropTarget): void => {
        if (!disableEditingTransform) {
          if (droppedItem instanceof FlatDataColumnDragSource) {
            const toAppend = droppedItem.data.id;
            if (toAppend) {
              flatDataPropertyMappingState.setLambdaString(
                flatDataPropertyMappingState.lambdaString + toAppend,
              );
            }
          }
        }
      },
      [disableEditingTransform, flatDataPropertyMappingState],
    );
    const [{ dragItem }, dropConnector] = useDrop<
      FlatDataColumnDragSource,
      void,
      { dragItem: FlatDataColumnDragSource | undefined }
    >(
      () => ({
        accept: [CORE_DND_TYPE.TYPE_TREE_PRIMITIVE],
        drop: (_item) => handleDrop(_item),
        collect: (monitor) => ({
          dragItem:
            monitor.getItem<FlatDataColumnDragSource | null>() ?? undefined,
        }),
      }),
      [handleDrop],
    );
    const transformProps = {
      disableTransform:
        flatDataInstanceSetImplementationState.isConvertingTransformLambdaObjects,
      forceBackdrop: setImplementationHasParserError,
    };
    switch (
      getClassPropertyType(
        flatDataPropertyMappingState.propertyMapping.property.value.genericType
          .value.rawType,
      )
    ) {
      case CLASS_PROPERTY_TYPE.UNIT:
      case CLASS_PROPERTY_TYPE.MEASURE:
      case CLASS_PROPERTY_TYPE.PRIMITIVE:
        return (
          <SimplePropertyMappingEditor
            propertyMappingState={flatDataPropertyMappingState}
            dropConnector={dropConnector}
            dragItem={dragItem}
            transformProps={transformProps}
            isReadOnly={isReadOnly}
          />
        );
      case CLASS_PROPERTY_TYPE.ENUMERATION:
        return (
          <EnumerationPropertyMappingEditor
            propertyMappingState={flatDataPropertyMappingState}
            dropConnector={dropConnector}
            dragItem={dragItem}
            transformProps={transformProps}
            isReadOnly={isReadOnly}
          />
        );
      case CLASS_PROPERTY_TYPE.CLASS:
        // TODO: fix this when we know what we are to do with property mapping for complex property
        // return (
        //   <div className="property-mapping-editor__entry--embedded">
        //     Click
        //     <button
        //       className="property-mapping-editor__entry--embedded__visit-btn"
        //       onClick={visitEmbeddedPropertyMapping}
        //       tabIndex={-1}
        //       title="Create mapping element"
        //     ><ArrowCircleRightIcon /></button>
        //     {`to visit the embedded class mapping for property '${flatDataPropertyMappingState.propertyMapping.property.name}'.`}
        //   </div>
        // );
        return (
          <div className="property-mapping-editor__entry--embedded">
            Editing property mapping for complex property is currently not
            supported in form mode
          </div>
        );
      default:
        return null;
    }
  },
);
