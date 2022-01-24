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
import { MultiplicityBadge } from '../../../shared/MultiplicityBadge';
import { PurePropertyMappingEditor } from './PurePropertyMappingEditor';
import { getElementIcon } from '../../../shared/ElementIconUtils';
import {
  type MappingElement,
  MappingEditorState,
} from '../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState';
import type { InstanceSetImplementationState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingElementState';
import {
  PurePropertyMappingState,
  PureInstanceSetImplementationState,
} from '../../../../stores/editor-state/element-editor-state/mapping/PureInstanceSetImplementationState';
import { clsx, ArrowCircleRightIcon } from '@finos/legend-art';
import { guaranteeType } from '@finos/legend-shared';
import {
  type FlatDataPropertyMappingState,
  FlatDataInstanceSetImplementationState,
} from '../../../../stores/editor-state/element-editor-state/mapping/FlatDataInstanceSetImplementationState';
import { FlatDataPropertyMappingEditor } from './FlatDataPropertyMappingEditor';
import { RelationalPropertyMappingEditor } from './relational/RelationalPropertyMappingEditor';
import type {
  RelationalPropertyMappingState,
  RootRelationalInstanceSetImplementationState,
} from '../../../../stores/editor-state/element-editor-state/mapping/relational/RelationalInstanceSetImplementationState';
import { useEditorStore } from '../../EditorStoreProvider';
import {
  type Property,
  getRootSetImplementation,
  nominateRootSetImplementation,
  Class,
  CLASS_PROPERTY_TYPE,
  getClassPropertyType,
  SetImplementation,
  SET_IMPLEMENTATION_TYPE,
  PrimitiveType,
  PureInstanceSetImplementation,
  EmbeddedFlatDataPropertyMapping,
} from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';

export const PropertyMappingsEditor = observer(
  (props: {
    property: Property;
    instanceSetImplementationState: InstanceSetImplementationState;
    isReadOnly: boolean;
  }) => {
    const { instanceSetImplementationState, property, isReadOnly } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const mappingEditorState =
      editorStore.getCurrentEditorState(MappingEditorState);
    const propertyRawType = property.genericType.value.rawType;
    const propertyBasicType = getClassPropertyType(propertyRawType);
    const instanceSetImplementationType =
      editorStore.graphState.getSetImplementationType(
        instanceSetImplementationState.setImplementation,
      );
    const isEmbedded =
      instanceSetImplementationState.setImplementation.isEmbedded;
    // Parser Error
    const propertyMappingStates =
      instanceSetImplementationState.propertyMappingStates.filter(
        (pm) => pm.propertyMapping.property.value === property,
      );
    const propertyHasParserError = Boolean(
      propertyMappingStates.find((pm) => pm.parserError),
    );
    const setImplementationHasParserError = Boolean(
      instanceSetImplementationState.propertyMappingStates.find(
        (pm) => pm.parserError,
      ),
    );
    // Walker
    // TODO: revisit this behavior now that we have more types of property mapping to support
    // e.g. embedded, target set implementation, etc.
    // See https://github.com/finos/legend-studio/issues/310
    const visitOrCreateMappingElement = (): void => {
      if (propertyRawType instanceof Class) {
        if (
          instanceSetImplementationState.mappingElement instanceof
          PureInstanceSetImplementation
        ) {
          const rootMappingElement = getRootSetImplementation(
            mappingEditorState.mapping,
            propertyRawType,
          );
          if (rootMappingElement) {
            const parent = rootMappingElement.parent;
            if (parent !== mappingEditorState.element) {
              // TODO: think more about this flow. Right now we open the mapping element in the parent mapping
              editorStore.openElement(parent);
              editorStore
                .getCurrentEditorState(MappingEditorState)
                .openMappingElement(rootMappingElement, false);
            }
            {
              mappingEditorState.openMappingElement(rootMappingElement, true);
            }
          } else {
            if (!isReadOnly) {
              mappingEditorState.createMappingElement({
                target: property.genericType.value.rawType,
                showTarget: false,
                openInAdjacentTab: true,
                postSubmitAction: (
                  newSetImpl: MappingElement | undefined,
                ): void => {
                  // Make this set implementation the new root
                  if (newSetImpl instanceof SetImplementation) {
                    nominateRootSetImplementation(newSetImpl);
                  }
                },
              });
            }
          }
        } else if (
          instanceSetImplementationState instanceof
          FlatDataInstanceSetImplementationState
        ) {
          if (
            propertyMappingStates.length === 1 &&
            propertyMappingStates[0]?.propertyMapping instanceof
              EmbeddedFlatDataPropertyMapping
          ) {
            mappingEditorState.openMappingElement(
              propertyMappingStates[0].propertyMapping,
              true,
            );
          } else if (!propertyMappingStates.length) {
            const embedded =
              instanceSetImplementationState.addEmbeddedPropertyMapping(
                property,
              );
            mappingEditorState.openMappingElement(embedded, true);
          }
        } else {
          applicationStore.notifyWarning(
            `Can't visit mapping element for type '${propertyRawType.name}'`,
          );
        }
      }
    };

    return (
      <div
        className={clsx('property-mapping-editor', {
          backdrop__element: propertyHasParserError,
        })}
      >
        <div className="property-mapping-editor__metadata">
          <div className="property-mapping-editor__name">{property.name}</div>
          <div className="property-mapping-editor__info">
            <div
              className={clsx(
                'property-mapping-editor__type',
                `background--${propertyBasicType.toLowerCase()}`,
                {
                  'property-mapping-editor__type--has-visit-btn':
                    propertyBasicType === CLASS_PROPERTY_TYPE.CLASS,
                },
              )}
              title={
                propertyRawType instanceof PrimitiveType
                  ? undefined
                  : propertyRawType.path
              }
            >
              {propertyBasicType !== CLASS_PROPERTY_TYPE.PRIMITIVE && (
                <div className="property-mapping-editor__type__abbr">
                  {getElementIcon(editorStore, propertyRawType)}
                </div>
              )}
              <div className="property-mapping-editor__type__label">
                {propertyRawType.name}
              </div>
              {propertyBasicType === CLASS_PROPERTY_TYPE.CLASS && (
                <button
                  className="property-mapping-editor__type__visit-btn"
                  onClick={visitOrCreateMappingElement}
                  tabIndex={-1}
                  title={'Visit mapping element'}
                >
                  <ArrowCircleRightIcon />
                </button>
              )}
            </div>
            <div className="property-mapping-editor__multiplicity">
              <MultiplicityBadge multiplicity={property.multiplicity} />
            </div>
          </div>
        </div>
        <div className="property-mapping-editor__content">
          {propertyMappingStates.map((propertyMappingState) => {
            /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
            switch (instanceSetImplementationType) {
              case SET_IMPLEMENTATION_TYPE.PUREINSTANCE: {
                return (
                  <PurePropertyMappingEditor
                    key={propertyMappingState.uuid}
                    isReadOnly={isReadOnly}
                    pureInstanceSetImplementationState={guaranteeType(
                      instanceSetImplementationState,
                      PureInstanceSetImplementationState,
                    )}
                    purePropertyMappingState={guaranteeType(
                      propertyMappingState,
                      PurePropertyMappingState,
                    )}
                    setImplementationHasParserError={
                      setImplementationHasParserError
                    }
                  />
                );
              }
              case SET_IMPLEMENTATION_TYPE.FLAT_DATA:
              case SET_IMPLEMENTATION_TYPE.EMBEDDED_FLAT_DATA: {
                return (
                  <FlatDataPropertyMappingEditor
                    key={propertyMappingState.uuid}
                    isReadOnly={isReadOnly}
                    flatDataInstanceSetImplementationState={
                      instanceSetImplementationState as FlatDataInstanceSetImplementationState
                    }
                    flatDataPropertyMappingState={
                      propertyMappingState as FlatDataPropertyMappingState
                    }
                    setImplementationHasParserError={
                      setImplementationHasParserError
                    }
                  />
                );
              }
              case SET_IMPLEMENTATION_TYPE.RELATIONAL: {
                return (
                  <RelationalPropertyMappingEditor
                    key={propertyMappingState.uuid}
                    isReadOnly={isReadOnly}
                    relationalInstanceSetImplementationState={
                      instanceSetImplementationState as RootRelationalInstanceSetImplementationState
                    }
                    relationalPropertyMappingState={
                      propertyMappingState as RelationalPropertyMappingState
                    }
                    setImplementationHasParserError={
                      setImplementationHasParserError
                    }
                  />
                );
              }
              default:
                return null;
            }
          })}
          {propertyBasicType === CLASS_PROPERTY_TYPE.CLASS &&
            !propertyMappingStates.length && (
              <>
                {isEmbedded && (
                  <div className="property-mapping-editor__entry--empty">
                    Click
                    <button
                      className="property-mapping-editor__entry--empty__visit-btn"
                      onClick={visitOrCreateMappingElement}
                      tabIndex={-1}
                      title={'Create mapping element'}
                    >
                      <ArrowCircleRightIcon />
                    </button>
                    {`to create an embedded class mapping for property '${property.name}'.`}
                  </div>
                )}
                {!isEmbedded && (
                  <div className="property-mapping-editor__entry--empty">
                    No set implementation found. Click
                    <button
                      className="property-mapping-editor__entry--empty__visit-btn"
                      onClick={visitOrCreateMappingElement}
                      tabIndex={-1}
                      title={'Create mapping element'}
                    >
                      <ArrowCircleRightIcon />
                    </button>
                    {`to create a root class mapping for '${propertyRawType.name}'.`}
                  </div>
                )}
              </>
            )}
        </div>
      </div>
    );
  },
);
