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
import type { FlatDataPropertyMappingTransformDropTarget } from '../../../../stores/shared/DnDUtil';
import {
  CORE_DND_TYPE,
  FlatDataColumnDragSource,
} from '../../../../stores/shared/DnDUtil';
import { MappingEditorState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState';
import type {
  FlatDataPropertyMappingState,
  FlatDataInstanceSetImplementationState,
} from '../../../../stores/editor-state/element-editor-state/mapping/FlatDataInstanceSetImplementationState';
import { useEditorStore } from '../../../../stores/EditorStore';
import { clsx, CustomSelectorInput } from '@finos/legend-studio-components';
import { FaArrowAltCircleRight } from 'react-icons/fa';
import type { ConnectDropTarget } from 'react-dnd';
import { useDrop } from 'react-dnd';
import { LambdaEditor } from '../../../shared/LambdaEditor';
import { guaranteeType } from '@finos/legend-studio-shared';
import {
  CLASS_PROPERTY_TYPE,
  getClassPropertyType,
} from '../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import type { MappingElement } from '../../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { Enumeration } from '../../../../models/metamodels/pure/model/packageableElements/domain/Enumeration';
import { EnumerationMapping } from '../../../../models/metamodels/pure/model/packageableElements/mapping/EnumerationMapping';
import { FlatDataPropertyMapping } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/mapping/FlatDataPropertyMapping';

const SimplePropertyMappingEditor = observer(
  (props: {
    propertyMappingState: FlatDataPropertyMappingState;
    drop?: ConnectDropTarget;
    dragItem?: FlatDataPropertyMappingTransformDropTarget;
    transformProps: {
      disableTransform: boolean;
      forceBackdrop: boolean;
    };
    isReadOnly: boolean;
  }) => {
    const { propertyMappingState, drop, dragItem, transformProps } = props;
    const editorStore = useEditorStore();
    const mappingEditorState =
      editorStore.getCurrentEditorState(MappingEditorState);
    const propertyMapping = propertyMappingState.propertyMapping;
    const expectedType =
      propertyMapping.property.value.genericType.value.rawType;
    const canDrop =
      dragItem &&
      dragItem.data.field.flatDataDataType.correspondingPrimitiveType ===
        expectedType;
    const onExpectedTypeLabelSelect = (): void =>
      mappingEditorState.setSelectedTypeLabel(expectedType);
    const matchedExpectedTypeLabel = (): boolean =>
      Boolean(expectedType) &&
      mappingEditorState.selectedTypeLabel === expectedType;

    return (
      <div className="property-mapping-editor__entry__container">
        <div ref={drop} className="property-mapping-editor__entry">
          <LambdaEditor
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
    drop?: ConnectDropTarget;
    dragItem?: FlatDataPropertyMappingTransformDropTarget;
    transformProps: {
      disableTransform: boolean;
      forceBackdrop: boolean;
    };
    isReadOnly: boolean;
  }) => {
    const { propertyMappingState, drop, dragItem, transformProps, isReadOnly } =
      props;
    const editorStore = useEditorStore();
    const mappingEditorState =
      editorStore.getCurrentEditorState(MappingEditorState);
    const propertyMapping = guaranteeType(
      propertyMappingState.propertyMapping,
      FlatDataPropertyMapping,
      'Flat-data property mapping for enumeration type property must be a simple property mapping',
    );
    const enumeration =
      propertyMapping.property.value.genericType.value.getRawType(Enumeration);
    const expectedType = propertyMapping.transformer
      ? propertyMapping.transformer.sourceType.value
      : enumeration;
    const onExpectedTypeLabelSelect = (): void =>
      mappingEditorState.setSelectedTypeLabel(expectedType);
    const matchedExpectedTypeLabel = (): boolean =>
      Boolean(expectedType) &&
      mappingEditorState.selectedTypeLabel === expectedType;
    // Enumeration Mapping Selector
    const options = mappingEditorState.mapping
      .enumerationMappingsByEnumeration(enumeration)
      .map((em) => ({ value: em, label: em.id.value }));
    const transformer = propertyMapping.transformer?.id.value ?? '';
    const handleSelectionChange = (
      val: { label: string; value: EnumerationMapping } | null,
    ): void => propertyMapping.setTransformer(val?.value);
    // Walker
    const visit = (): void => {
      const currentTransformer = propertyMapping.transformer;
      if (currentTransformer) {
        mappingEditorState.openMappingElement(currentTransformer, true);
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
                propertyMapping.setTransformer(newEnumerationMapping);
              }
            },
          });
        }
      }
    };
    // Drag and Drop
    const canDrop =
      dragItem?.data.field.flatDataDataType.correspondingPrimitiveType &&
      dragItem.data.field.flatDataDataType.correspondingPrimitiveType ===
        expectedType;

    return (
      <div className="property-mapping-editor__entry__container">
        <div ref={drop} className="property-mapping-editor__entry">
          <div className="property-mapping-editor__entry__enumeration-mapping-selector">
            <CustomSelectorInput
              disabled={options.length <= 1 || isReadOnly}
              options={options}
              onChange={handleSelectionChange}
              value={{ value: transformer, label: transformer }}
              placeholder={`Select an existing enumeration mapping`}
            />
            <button
              className="property-mapping-editor__entry__visit-btn"
              onClick={visit}
              tabIndex={-1}
              title={'Visit enumeration mapping'}
            >
              <FaArrowAltCircleRight />
            </button>
          </div>
          <LambdaEditor
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
      flatDataInstanceSetImplementationState.isConvertingTransformObjects ||
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
    const [{ item }, drop] = useDrop(
      () => ({
        accept: [CORE_DND_TYPE.TYPE_TREE_PRIMITIVE],
        drop: (droppedItem: FlatDataPropertyMappingTransformDropTarget): void =>
          handleDrop(droppedItem),
        collect: (monitor): { item: unknown } => ({
          item: monitor.getItem(),
        }),
      }),
      [handleDrop],
    );
    const dragItem =
      item instanceof FlatDataColumnDragSource ? item : undefined;
    const transformProps = {
      disableTransform:
        flatDataInstanceSetImplementationState.isConvertingTransformObjects,
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
            drop={drop}
            dragItem={dragItem}
            transformProps={transformProps}
            isReadOnly={isReadOnly}
          />
        );
      case CLASS_PROPERTY_TYPE.ENUMERATION:
        return (
          <EnumerationPropertyMappingEditor
            propertyMappingState={flatDataPropertyMappingState}
            drop={drop}
            dragItem={dragItem}
            transformProps={transformProps}
            isReadOnly={isReadOnly}
          />
        );
      case CLASS_PROPERTY_TYPE.CLASS:
        // FIXME: fix this when we know what we are to do with property mapping for complex property
        // return (
        //   <div className="property-mapping-editor__entry--embedded">
        //     Click
        //     <button
        //       className="property-mapping-editor__entry--embedded__visit-btn"
        //       onClick={visitEmbeddedPropertyMapping}
        //       tabIndex={-1}
        //       title={'Create mapping element'}
        //     ><FaArrowAltCircleRight /></button>
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
