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

import { useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import {
  type TransformDropTarget,
  CORE_DND_TYPE,
  TypeDragSource,
} from '../../../../stores/editor/utils/DnDUtils.js';
import {
  type MappingElement,
  MappingEditorState,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingEditorState.js';
import type {
  PurePropertyMappingState,
  PureInstanceSetImplementationState,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/PureInstanceSetImplementationState.js';
import {
  clsx,
  CustomSelectorInput,
  ArrowCircleRightIcon,
} from '@finos/legend-art';
import { type ConnectDropTarget, useDrop } from 'react-dnd';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  Enumeration,
  EnumerationMapping,
  DerivedProperty,
  getEnumerationMappingsByEnumeration,
  getRawGenericType,
  EnumerationMappingExplicitReference,
} from '@finos/legend-graph';
import { purePropertyMapping_setTransformer } from '../../../../stores/graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import { getExpectedReturnType } from './PropertyMappingsEditor.js';
import {
  CLASS_PROPERTY_TYPE,
  getClassPropertyType,
} from '../../../../stores/editor/utils/ModelClassifierUtils.js';
import { InlineLambdaEditor } from '@finos/legend-query-builder';

const SimplePropertyMappingEditor = observer(
  (props: {
    propertyMappingState: PurePropertyMappingState;
    drop?: ConnectDropTarget | undefined;
    dragItem?: TransformDropTarget | undefined;
    transformProps: {
      disableTransform: boolean;
      forceBackdrop: boolean;
    };
    isReadOnly: boolean;
  }) => {
    const { propertyMappingState, transformProps, drop, dragItem } = props;
    const propertyMapping = propertyMappingState.propertyMapping;
    const expectedType =
      propertyMapping.property.value.genericType.value.rawType;

    const canDrop = dragItem?.data?.type === expectedType;

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
        <div ref={drop} className="property-mapping-editor__entry">
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
    propertyMappingState: PurePropertyMappingState;
    drop?: ConnectDropTarget | undefined;
    dragItem?: TransformDropTarget | undefined;
    dragItemType: string;
    transformProps: {
      disableTransform: boolean;
      forceBackdrop: boolean;
    };
    isReadOnly: boolean;
  }) => {
    const {
      propertyMappingState,
      drop,
      dragItem,
      dragItemType,
      transformProps,
      isReadOnly,
    } = props;
    const editorStore = useEditorStore();
    const mappingEditorState =
      editorStore.tabManagerState.getCurrentEditorState(MappingEditorState);
    const propertyMapping = propertyMappingState.propertyMapping;
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
      purePropertyMapping_setTransformer(
        propertyMapping,
        val?.value
          ? EnumerationMappingExplicitReference.create(val.value)
          : undefined,
      );
    // Walker
    const visit = (): void => {
      const currentTransformerEnumerationMapping =
        propertyMapping.transformer?.value;
      if (currentTransformerEnumerationMapping) {
        mappingEditorState.openMappingElement(
          currentTransformerEnumerationMapping,
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
                purePropertyMapping_setTransformer(
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
    // DnD
    // NOTE: when we drag enum, we should highlight if the enumeration where that enum is part of matches
    const canDrop =
      dragItem &&
      ((dragItem.data?.type && dragItem.data.type === expectedType) ||
        (dragItemType === CORE_DND_TYPE.TYPE_TREE_ENUM &&
          dragItem.data?.parent === expectedType));

    return (
      <div className="property-mapping-editor__entry__container">
        <div ref={drop} className="property-mapping-editor__entry">
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

const ClassPropertyMappingEditor = observer(
  (props: {
    propertyMappingState: PurePropertyMappingState;
    drop?: ConnectDropTarget | undefined;
    dragItem?: TransformDropTarget | undefined;
    transformProps: {
      disableTransform: boolean;
      forceBackdrop: boolean;
    };
    isReadOnly: boolean;
  }) => {
    const { propertyMappingState, drop, dragItem, transformProps } = props;
    const editorStore = useEditorStore();
    const mappingEditorState =
      editorStore.tabManagerState.getCurrentEditorState(MappingEditorState);
    const propertyMapping = propertyMappingState.propertyMapping;
    const isDefaultId =
      propertyMapping.targetSetImplementation?.value.id.isDefault;
    const target = isDefaultId ? (
      <div className="property-mapping-editor__entry__id__label__default-badge">
        default
      </div>
    ) : (
      propertyMapping.targetSetImplementation?.value.id.value
    );
    const expectedType = getExpectedReturnType(
      propertyMapping.targetSetImplementation?.value,
    );
    const onExpectedTypeLabelSelect = (): void =>
      propertyMappingState.instanceSetImplementationState.setSelectedType(
        expectedType,
      );
    const matchedExpectedTypeLabel = (): boolean =>
      Boolean(expectedType) &&
      propertyMappingState.instanceSetImplementationState.selectedType ===
        expectedType;
    // Walker
    const visit = (): void => {
      if (propertyMapping.targetSetImplementation?.value) {
        mappingEditorState.openMappingElement(
          propertyMapping.targetSetImplementation.value,
          true,
        );
      }
    };
    // Drag and Drop

    const canDrop = dragItem?.data?.type && dragItem.data.type === expectedType;

    return (
      <div className="property-mapping-editor__entry__container">
        <div ref={drop} className="property-mapping-editor__entry">
          <div className="property-mapping-editor__entry__id">
            <div
              className={clsx('property-mapping-editor__entry__id__label', {
                'property-mapping-editor__entry__id__label--default':
                  isDefaultId,
              })}
            >
              {target}
            </div>
            <button
              className="property-mapping-editor__entry__visit-btn"
              onClick={visit}
              tabIndex={-1}
              title="Visit class mapping"
            >
              <ArrowCircleRightIcon />
            </button>
          </div>
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

export const PurePropertyMappingEditor = observer(
  (props: {
    purePropertyMappingState: PurePropertyMappingState;
    pureInstanceSetImplementationState: PureInstanceSetImplementationState;
    setImplementationHasParserError: boolean;
    isReadOnly: boolean;
  }) => {
    const {
      purePropertyMappingState,
      pureInstanceSetImplementationState,
      setImplementationHasParserError,
      isReadOnly,
    } = props;
    const disableEditingTransform =
      pureInstanceSetImplementationState.isConvertingTransformLambdaObjects ||
      isReadOnly;
    // DnD
    const handleDrop = useCallback(
      (dropItem: TransformDropTarget, dropType: string): void => {
        if (!disableEditingTransform) {
          if (dropItem instanceof TypeDragSource) {
            // if the dragged node is enum, when dropped, we want to have it as a constant
            let toAppend = '';
            if (dropType === CORE_DND_TYPE.TYPE_TREE_ENUM) {
              toAppend = `${dropItem.data?.parent.path}.${dropItem.data?.label}`;
            } else {
              if (dropItem.data?.id) {
                toAppend = dropItem.data.id;
              }
              if (dropItem.data?.property instanceof DerivedProperty) {
                toAppend += '()';
              }
            }
            if (toAppend) {
              purePropertyMappingState.setLambdaString(
                purePropertyMappingState.lambdaString + toAppend,
              );
            }
          }
        }
      },
      [disableEditingTransform, purePropertyMappingState],
    );
    const [{ dragItem, dragItemType }, drop] = useDrop<
      TypeDragSource,
      void,
      {
        dragItem: TypeDragSource | undefined;
        dragItemType: CORE_DND_TYPE;
      }
    >(
      () => ({
        accept: [
          CORE_DND_TYPE.TYPE_TREE_CLASS,
          CORE_DND_TYPE.TYPE_TREE_ENUMERATION,
          CORE_DND_TYPE.TYPE_TREE_PRIMITIVE,
          CORE_DND_TYPE.TYPE_TREE_ENUM,
        ],
        drop: (item, monitor) =>
          handleDrop(item, monitor.getItemType() as string),
        collect: (monitor) => ({
          dragItem: monitor.getItem<TypeDragSource | null>() ?? undefined,
          dragItemType: monitor.getItemType() as CORE_DND_TYPE,
        }),
      }),
      [handleDrop],
    );
    const transformProps = {
      disableTransform: disableEditingTransform,
      forceBackdrop: setImplementationHasParserError,
    };
    switch (
      getClassPropertyType(
        purePropertyMappingState.propertyMapping.property.value.genericType
          .value.rawType,
      )
    ) {
      case CLASS_PROPERTY_TYPE.UNIT:
      case CLASS_PROPERTY_TYPE.MEASURE:
      case CLASS_PROPERTY_TYPE.PRIMITIVE:
        return (
          <SimplePropertyMappingEditor
            propertyMappingState={purePropertyMappingState}
            drop={drop}
            dragItem={dragItem}
            transformProps={transformProps}
            isReadOnly={isReadOnly}
          />
        );
      case CLASS_PROPERTY_TYPE.ENUMERATION:
        return (
          <EnumerationPropertyMappingEditor
            propertyMappingState={purePropertyMappingState}
            drop={drop}
            dragItem={dragItem}
            dragItemType={dragItemType}
            transformProps={transformProps}
            isReadOnly={isReadOnly}
          />
        );
      case CLASS_PROPERTY_TYPE.CLASS:
        return (
          <ClassPropertyMappingEditor
            propertyMappingState={purePropertyMappingState}
            drop={drop}
            dragItem={dragItem}
            transformProps={transformProps}
            isReadOnly={isReadOnly}
          />
        );
      default:
        return null;
    }
  },
);
