/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import { DND_TYPE, TransformDropTarget, TypeDragSource } from 'Utilities/DnDUtil';
import { MappingEditorState } from 'Stores/editor-state/element-editor-state/mapping/MappingEditorState';
import { PurePropertyMappingState, PureInstanceSetImplementationState } from 'Stores/editor-state/element-editor-state/mapping/PureInstanceSetImplementationState';
import { useEditorStore } from 'Stores/EditorStore';
import { CustomSelectorInput } from 'Components/shared/CustomSelectorInput';
import { FaArrowAltCircleRight } from 'react-icons/fa';
import { useDrop, ConnectDropTarget } from 'react-dnd';
import clsx from 'clsx';
import { LambdaEditor } from 'Components/shared/LambdaEditor';
import { MappingElement } from 'MM/model/packageableElements/mapping/Mapping';
import { Enumeration } from 'MM/model/packageableElements/domain/Enumeration';
import { CLASS_PROPERTY_TYPE, getClassPropertyType } from 'MM/model/packageableElements/domain/Class';
import { EnumerationMapping } from 'MM/model/packageableElements/mapping/EnumerationMapping';
import { PureInstanceSetImplementation } from 'MM/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';

const SimplePropertyMappingEditor = observer((props: {
  propertyMappingState: PurePropertyMappingState;
  drop?: ConnectDropTarget;
  dragItem?: TransformDropTarget;
  transformProps: {
    disableTransform: boolean;
    forceBackdrop: boolean;
  };
  isReadOnly: boolean;
}) => {
  const { propertyMappingState, transformProps, drop, dragItem } = props;
  const editorStore = useEditorStore();
  const mappingEditorState = editorStore.getCurrentEditorState(MappingEditorState);
  const propertyMapping = propertyMappingState.propertyMapping;
  const expectedType = propertyMapping.property.value.genericType.value.rawType;
  const canDrop = dragItem && dragItem.data.type === expectedType;
  const onExpectedTypeLabelSelect = (): void => mappingEditorState.setSelectedTypeLabel(expectedType);
  const matchedExpectedTypeLabel = (): boolean => Boolean(expectedType) && mappingEditorState.selectedTypeLabel === expectedType;

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
});

const EnumerationPropertyMappingEditor = observer((props: {
  propertyMappingState: PurePropertyMappingState;
  drop?: ConnectDropTarget;
  dragItem?: TransformDropTarget;
  transformProps: {
    disableTransform: boolean;
    forceBackdrop: boolean;
  };
  isReadOnly: boolean;
}) => {
  const { propertyMappingState, drop, dragItem, transformProps, isReadOnly } = props;
  const editorStore = useEditorStore();
  const mappingEditorState = editorStore.getCurrentEditorState(MappingEditorState);
  const propertyMapping = propertyMappingState.propertyMapping;
  const enumeration = propertyMapping.property.value.genericType.value.getRawType(Enumeration);
  const expectedType = propertyMapping.transformer
    ? propertyMapping.transformer.sourceType.value
    : enumeration;
  const onExpectedTypeLabelSelect = (): void => mappingEditorState.setSelectedTypeLabel(expectedType);
  const matchedExpectedTypeLabel = (): boolean => Boolean(expectedType) && mappingEditorState.selectedTypeLabel === expectedType;
  // Enumeration Mapping Selector
  const options = mappingEditorState.mapping.enumerationMappingsByEnumeration(enumeration)
    .map(em => ({ value: em, label: em.id.value }));
  const transformer = propertyMapping.transformer?.id.value ?? '';
  const handleSelectionChange = (val: { label: string; value: EnumerationMapping } | null): void =>
    propertyMapping.setTransformer(val?.value);
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
          postSubmitAction: (newEnumerationMapping: MappingElement | undefined): void => {
            if (newEnumerationMapping instanceof EnumerationMapping) {
              propertyMapping.setTransformer(newEnumerationMapping);
            }
          }
        });
      }
    }
  };
  // DnD
  // NOTE: when we drag enum, we should highlight if the enumeration where that enum is part of matches
  const canDrop = dragItem && ((dragItem.data.type && dragItem.data.type === expectedType)
    || (dragItem.type === DND_TYPE.TYPE_TREE_ENUM && dragItem.data.parent === expectedType));

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
          ><FaArrowAltCircleRight /></button>
        </div>
        <LambdaEditor
          className={clsx('property-mapping-editor__entry__enumeration__transform', { 'lambda-editor--dnd-match': canDrop })}
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
});

const ClassPropertyMappingEditor = observer((props: {
  propertyMappingState: PurePropertyMappingState;
  drop?: ConnectDropTarget;
  dragItem?: TransformDropTarget;
  transformProps: {
    disableTransform: boolean;
    forceBackdrop: boolean;
  };
  isReadOnly: boolean;
}) => {
  const { propertyMappingState, drop, dragItem, transformProps } = props;
  const editorStore = useEditorStore();
  const mappingEditorState = editorStore.getCurrentEditorState(MappingEditorState);
  const propertyMapping = propertyMappingState.propertyMapping;
  const isDefaultId = propertyMapping.targetSetImplementation?.id.isDefault;
  const target = propertyMapping.targetSetImplementation
    ? isDefaultId
      ? <div className="property-mapping-editor__entry__id__label__default-badge">default</div>
      : propertyMapping.targetSetImplementation.id.value
    : '';
  const expectedType = propertyMapping.targetSetImplementation instanceof PureInstanceSetImplementation ? propertyMapping.targetSetImplementation.srcClass.value : undefined;
  const onExpectedTypeLabelSelect = (): void => mappingEditorState.setSelectedTypeLabel(expectedType);
  const matchedExpectedTypeLabel = (): boolean => Boolean(expectedType) && mappingEditorState.selectedTypeLabel === expectedType;
  // Walker
  const visit = (): void => {
    if (propertyMapping.targetSetImplementation) {
      mappingEditorState.openMappingElement(propertyMapping.targetSetImplementation, true);
    }
  };
  // Drag and Drop
  const canDrop = dragItem?.data.type && dragItem.data.type === expectedType;

  return (
    <div className="property-mapping-editor__entry__container">
      <div ref={drop} className="property-mapping-editor__entry">
        <div className="property-mapping-editor__entry__id">
          <div className={clsx('property-mapping-editor__entry__id__label', { 'property-mapping-editor__entry__id__label--default': isDefaultId })}>
            {target}
          </div>
          <button
            className="property-mapping-editor__entry__visit-btn"
            onClick={visit}
            tabIndex={-1}
            title={'Visit class mapping'}
          ><FaArrowAltCircleRight /></button>
        </div>
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
});

export const PurePropertyMappingEditor = observer((props: {
  purePropertyMappingState: PurePropertyMappingState;
  pureInstanceSetImplementationState: PureInstanceSetImplementationState;
  setImplementationHasParserError: boolean;
  isReadOnly: boolean;
}) => {
  const { purePropertyMappingState, pureInstanceSetImplementationState, setImplementationHasParserError, isReadOnly } = props;
  const disableEditingTransform = pureInstanceSetImplementationState.isConvertingTransformObjects || isReadOnly;
  // DnD
  const handleDrop = (dropItem: TransformDropTarget): void => {
    if (!disableEditingTransform) {
      if (dropItem instanceof TypeDragSource) {
        // if the dragged node is enum, when dropped, we want to have it as a constant
        const toAppend = dropItem.type === DND_TYPE.TYPE_TREE_ENUM ? `${dropItem.data.parent.path}.${dropItem.data.label}` : dropItem.data.id;
        if (toAppend) {
          purePropertyMappingState.setLambdaString(purePropertyMappingState.lambdaString + toAppend);
        }
      }
    }
  };
  const [{ item }, drop] = useDrop({
    accept: [DND_TYPE.TYPE_TREE_CLASS, DND_TYPE.TYPE_TREE_ENUMERATION, DND_TYPE.TYPE_TREE_PRIMITIVE, DND_TYPE.TYPE_TREE_ENUM],
    drop: (dropItem: TransformDropTarget): void => handleDrop(dropItem),
    collect: monitor => ({ item: monitor.getItem() as unknown })
  });
  const dragItem = item instanceof TypeDragSource ? item : undefined;
  const transformProps = { disableTransform: disableEditingTransform, forceBackdrop: setImplementationHasParserError };
  switch (getClassPropertyType(purePropertyMappingState.propertyMapping.property.value.genericType.value.rawType)) {
    case CLASS_PROPERTY_TYPE.UNIT:
    case CLASS_PROPERTY_TYPE.MEASURE:
    case CLASS_PROPERTY_TYPE.PRIMITIVE: return <SimplePropertyMappingEditor propertyMappingState={purePropertyMappingState} drop={drop} dragItem={dragItem} transformProps={transformProps} isReadOnly={isReadOnly} />;
    case CLASS_PROPERTY_TYPE.ENUMERATION: return <EnumerationPropertyMappingEditor propertyMappingState={purePropertyMappingState} drop={drop} dragItem={dragItem} transformProps={transformProps} isReadOnly={isReadOnly} />;
    case CLASS_PROPERTY_TYPE.CLASS: return <ClassPropertyMappingEditor drop={drop} propertyMappingState={purePropertyMappingState} dragItem={dragItem} transformProps={transformProps} isReadOnly={isReadOnly} />;
    default: return null;
  }
});
