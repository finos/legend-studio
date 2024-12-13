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
  EmbeddedRelationalInstanceSetImplementationState,
  type RelationalPropertyMappingState,
  type RootRelationalInstanceSetImplementationState,
} from '../../../../../stores/editor/editor-state/element-editor-state/mapping/relational/RelationalInstanceSetImplementationState.js';
import {
  type MappingElement,
  MappingEditorState,
} from '../../../../../stores/editor/editor-state/element-editor-state/mapping/MappingEditorState.js';
import {
  clsx,
  CustomSelectorInput,
  ArrowCircleRightIcon,
} from '@finos/legend-art';
import { type ConnectDropTarget, useDrop } from 'react-dnd';
import { guaranteeType } from '@finos/legend-shared';
import {
  TableOrViewTreeNodeDragSource,
  TABLE_ELEMENT_DND_TYPE,
} from './TableOrViewSourceTree.js';
import { useEditorStore } from '../../../EditorStoreProvider.js';
import {
  Enumeration,
  EnumerationMapping,
  RelationalPropertyMapping,
  getEnumerationMappingsByEnumeration,
  getRawGenericType,
  EnumerationMappingExplicitReference,
} from '@finos/legend-graph';
import { relationalPropertyMapping_setTransformer } from '../../../../../stores/graph-modifier/STO_Relational_GraphModifierHelper.js';
import { getExpectedReturnType } from '../PropertyMappingsEditor.js';
import {
  CLASS_PROPERTY_TYPE,
  getClassPropertyType,
} from '../../../../../stores/editor/utils/ModelClassifierUtils.js';
import { InlineLambdaEditor } from '@finos/legend-query-builder';

const SimplePropertyMappingEditor = observer(
  (props: {
    propertyMappingState: RelationalPropertyMappingState;
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

const EnumerationPropertyMappingEditor = observer(
  (props: {
    propertyMappingState: RelationalPropertyMappingState;
    dropConnector?: ConnectDropTarget;
    transformProps: {
      disableTransform: boolean;
      forceBackdrop: boolean;
    };
    isReadOnly: boolean;
  }) => {
    const { propertyMappingState, dropConnector, transformProps, isReadOnly } =
      props;
    const ref = useRef<HTMLDivElement>(null);
    dropConnector?.(ref);
    const editorStore = useEditorStore();
    const mappingEditorState =
      editorStore.tabManagerState.getCurrentEditorState(MappingEditorState);
    const propertyMapping = guaranteeType(
      propertyMappingState.propertyMapping,
      RelationalPropertyMapping,
      'Relational property mapping for enumeration type property must be a simple property mapping',
    );
    const enumeration = getRawGenericType(
      propertyMapping.property.value.genericType.value,
      Enumeration,
    );
    // Enumeration Mapping Selector
    const options = getEnumerationMappingsByEnumeration(
      mappingEditorState.mapping,
      enumeration,
    ).map((em) => ({ value: em, label: em.id.value }));
    const handleSelectionChange = (
      val: { label: string; value: EnumerationMapping } | null,
    ): void =>
      relationalPropertyMapping_setTransformer(
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
                relationalPropertyMapping_setTransformer(
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
                      value: propertyMapping.transformer.value,
                      label:
                        propertyMapping.transformer.valueForSerialization ?? '',
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
            )}
            disabled={transformProps.disableTransform}
            lambdaEditorState={propertyMappingState}
            forceBackdrop={transformProps.forceBackdrop}
          />
        </div>
      </div>
    );
  },
);

const ClassPropertyMappingEditor = observer(
  (props: {
    propertyMappingState: RelationalPropertyMappingState;
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

    return (
      <div className="property-mapping-editor__entry__container">
        <div ref={ref} className="property-mapping-editor__entry">
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

export const RelationalPropertyMappingEditor = observer(
  (props: {
    relationalPropertyMappingState: RelationalPropertyMappingState;
    relationalInstanceSetImplementationState: RootRelationalInstanceSetImplementationState;
    setImplementationHasParserError: boolean;
    isReadOnly: boolean;
  }) => {
    const {
      relationalPropertyMappingState,
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
      case CLASS_PROPERTY_TYPE.ENUMERATION:
        return (
          <EnumerationPropertyMappingEditor
            propertyMappingState={relationalPropertyMappingState}
            dropConnector={dropConnector}
            transformProps={transformProps}
            isReadOnly={isReadOnly}
          />
        );
      case CLASS_PROPERTY_TYPE.CLASS: {
        if (
          relationalPropertyMappingState instanceof
          EmbeddedRelationalInstanceSetImplementationState
        ) {
          return (
            <div className="property-mapping-editor__entry--embedded">
              Embedded property mapping specified, but not supported in form
              mode
            </div>
          );
        }
        return (
          <ClassPropertyMappingEditor
            propertyMappingState={relationalPropertyMappingState}
            dropConnector={dropConnector}
            transformProps={transformProps}
            isReadOnly={isReadOnly}
          />
        );
      }
      default:
        return null;
    }
  },
);
