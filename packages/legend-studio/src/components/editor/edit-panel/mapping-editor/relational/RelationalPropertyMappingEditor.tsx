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
import type {
  RelationalPropertyMappingState,
  RootRelationalInstanceSetImplementationState,
} from '../../../../../stores/editor-state/element-editor-state/mapping/relational/RelationalInstanceSetImplementationState';
import {
  CLASS_PROPERTY_TYPE,
  getClassPropertyType,
} from '../../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import { MappingEditorState } from '../../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState';
import { useEditorStore } from '../../../../../stores/EditorStore';
import { clsx, CustomSelectorInput } from '@finos/legend-studio-components';
import { FaArrowAltCircleRight } from 'react-icons/fa';
import type { ConnectDropTarget } from 'react-dnd';
import { useDrop } from 'react-dnd';
import { LambdaEditor } from '../../../../shared/LambdaEditor';
import { guaranteeType } from '@finos/legend-studio-shared';
import type { MappingElement } from '../../../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { Enumeration } from '../../../../../models/metamodels/pure/model/packageableElements/domain/Enumeration';
import { EnumerationMapping } from '../../../../../models/metamodels/pure/model/packageableElements/mapping/EnumerationMapping';
import {
  TableOrViewTreeNodeDragSource,
  TABLE_ELEMENT_DND_TYPE,
} from './TableOrViewSourceTree';
import { RelationalPropertyMapping } from '../../../../../models/metamodels/pure/model/packageableElements/store/relational/mapping/RelationalPropertyMapping';

const SimplePropertyMappingEditor = observer(
  (props: {
    propertyMappingState: RelationalPropertyMappingState;
    drop?: ConnectDropTarget;
    transformProps: {
      disableTransform: boolean;
      forceBackdrop: boolean;
    };
    isReadOnly: boolean;
  }) => {
    const { propertyMappingState, drop, transformProps } = props;
    return (
      <div className="property-mapping-editor__entry__container">
        <div ref={drop} className="property-mapping-editor__entry">
          <LambdaEditor
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
    drop?: ConnectDropTarget;
    transformProps: {
      disableTransform: boolean;
      forceBackdrop: boolean;
    };
    isReadOnly: boolean;
  }) => {
    const { propertyMappingState, drop, transformProps, isReadOnly } = props;
    const editorStore = useEditorStore();
    const mappingEditorState =
      editorStore.getCurrentEditorState(MappingEditorState);
    const propertyMapping = guaranteeType(
      propertyMappingState.propertyMapping,
      RelationalPropertyMapping,
      'Relational property mapping for enumeration type property must be a simple property mapping',
    );
    const enumeration =
      propertyMapping.property.value.genericType.value.getRawType(Enumeration);
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
      relationalInstanceSetImplementationState.isConvertingTransformObjects ||
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
    const [, drop] = useDrop(
      () => ({
        accept: [TABLE_ELEMENT_DND_TYPE],
        drop: (droppedItem: TableOrViewTreeNodeDragSource): void =>
          handleDrop(droppedItem),
        collect: (monitor): { item: unknown } => ({
          item: monitor.getItem(),
        }),
      }),
      [handleDrop],
    );
    const transformProps = {
      disableTransform:
        relationalInstanceSetImplementationState.isConvertingTransformObjects,
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
            drop={drop}
            transformProps={transformProps}
            isReadOnly={isReadOnly}
          />
        );
      case CLASS_PROPERTY_TYPE.ENUMERATION:
        return (
          <EnumerationPropertyMappingEditor
            propertyMappingState={relationalPropertyMappingState}
            drop={drop}
            transformProps={transformProps}
            isReadOnly={isReadOnly}
          />
        );
      case CLASS_PROPERTY_TYPE.CLASS: {
        if (
          relationalInstanceSetImplementationState.mappingElement.isEmbedded
        ) {
          return (
            <div className="property-mapping-editor__entry--embedded">
              Editing embedded property mapping is currently not supported in
              form mode
            </div>
          );
        }
        return (
          <SimplePropertyMappingEditor
            propertyMappingState={relationalPropertyMappingState}
            drop={drop}
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
