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
import { MultiplicityBadge } from '../../../shared/MultiplicityBadge.js';
import { PurePropertyMappingEditor } from './PurePropertyMappingEditor.js';
import { getElementIcon } from '../../../shared/ElementIconUtils.js';
import {
  type MappingElement,
  MappingEditorState,
} from '../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState.js';
import type {
  InstanceSetImplementationState,
  PropertyMappingState,
} from '../../../../stores/editor-state/element-editor-state/mapping/MappingElementState.js';
import {
  PurePropertyMappingState,
  PureInstanceSetImplementationState,
} from '../../../../stores/editor-state/element-editor-state/mapping/PureInstanceSetImplementationState.js';
import {
  clsx,
  ArrowCircleRightIcon,
  TimesCircleIcon,
  TimesIcon,
} from '@finos/legend-art';
import { guaranteeType, UnsupportedOperationError } from '@finos/legend-shared';
import {
  type FlatDataPropertyMappingState,
  FlatDataInstanceSetImplementationState,
} from '../../../../stores/editor-state/element-editor-state/mapping/FlatDataInstanceSetImplementationState.js';
import { FlatDataPropertyMappingEditor } from './FlatDataPropertyMappingEditor.js';
import { RelationalPropertyMappingEditor } from './relational/RelationalPropertyMappingEditor.js';
import type {
  RelationalPropertyMappingState,
  RootRelationalInstanceSetImplementationState,
} from '../../../../stores/editor-state/element-editor-state/mapping/relational/RelationalInstanceSetImplementationState.js';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  type Property,
  type PropertyMapping,
  type Type,
  getRootSetImplementation,
  Class,
  SetImplementation,
  PrimitiveType,
  PureInstanceSetImplementation,
  EmbeddedFlatDataPropertyMapping,
  OperationSetImplementation,
} from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';
import {
  instanceSetImpl_deletePropertyMapping,
  setImpl_nominateRoot,
  setImpl_setRoot,
} from '../../../../stores/graphModifier/DSL_Mapping_GraphModifierHelper.js';
import {
  CLASS_PROPERTY_TYPE,
  getClassPropertyType,
  SET_IMPLEMENTATION_TYPE,
} from '../../../../stores/shared/ModelClassifierUtils.js';
import type { DSL_Mapping_LegendStudioApplicationPlugin_Extension } from '../../../../stores/DSL_Mapping_LegendStudioApplicationPlugin_Extension.js';

export const getExpectedReturnType = (
  targetSetImplementation: SetImplementation | undefined,
): Type | undefined => {
  if (targetSetImplementation instanceof PureInstanceSetImplementation) {
    return targetSetImplementation.srcClass?.value;
  } else if (targetSetImplementation instanceof OperationSetImplementation) {
    return targetSetImplementation.class.value;
  } else {
    return undefined;
  }
};

export const PropertyMappingsEditor = observer(
  (props: {
    property: Property;
    instanceSetImplementationState: InstanceSetImplementationState;
    isReadOnly: boolean;
  }) => {
    const { instanceSetImplementationState, property, isReadOnly } = props;
    const validationErrorMessage =
      instanceSetImplementationState.mappingElement.propertyMappings.filter(
        (pm) => pm.property.value === property,
      ).length > 1 && !(property.genericType.value.rawType instanceof Class)
        ? 'Only one property mapping should exist per simple type (e.g. primitive, measure, unit) or enumeration type property'
        : undefined;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const mappingEditorState =
      editorStore.getCurrentEditorState(MappingEditorState);
    const propertyRawType = property.genericType.value.rawType;
    const propertyBasicType = getClassPropertyType(propertyRawType);
    const instanceSetImplementationType =
      editorStore.graphState.getSetImplementationType(
        instanceSetImplementationState.mappingElement,
      );
    const isEmbedded =
      instanceSetImplementationState.mappingElement._isEmbedded;
    // Parser Error
    const propertyMappingStates: PropertyMappingState[] =
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
    const removePropertyMapping = (pm: PropertyMapping): void => {
      instanceSetImpl_deletePropertyMapping(
        instanceSetImplementationState.mappingElement,
        pm,
      );
      instanceSetImplementationState.decorate();
    };
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
            if (!rootMappingElement.root.value) {
              setImpl_setRoot(rootMappingElement, true);
            }
            const parent = rootMappingElement._PARENT;
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
                    setImpl_nominateRoot(newSetImpl);
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
          <div
            className={clsx('property-mapping-editor__name', {
              'property-mapping-editor__name--with-validation': Boolean(
                validationErrorMessage,
              ),
            })}
          >
            <div className={'property-mapping-editor__name__label'}>
              {property.name}
            </div>
            {validationErrorMessage && (
              <div
                className="property-mapping-editor__name--with-validation__indicator"
                title={validationErrorMessage}
              >
                <TimesCircleIcon />
              </div>
            )}
          </div>
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
                  title="Visit mapping element"
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
          <div className="property-mapping-editor__entries">
            {propertyMappingStates.map((propertyMappingState) => {
              switch (instanceSetImplementationType) {
                case SET_IMPLEMENTATION_TYPE.PUREINSTANCE: {
                  return (
                    <div
                      className="property-mapping-editor__entries__entry"
                      key={propertyMappingState.uuid}
                    >
                      <PurePropertyMappingEditor
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
                      {propertyMappingStates.length > 1 &&
                        propertyBasicType !== CLASS_PROPERTY_TYPE.CLASS && (
                          <button
                            className="property-mapping-editor__entries__entry__remove-btn"
                            onClick={() =>
                              removePropertyMapping(
                                propertyMappingState.propertyMapping,
                              )
                            }
                            tabIndex={-1}
                            title="Remove"
                            disabled={propertyMappingState.lambdaString === ''}
                          >
                            <TimesIcon />
                          </button>
                        )}
                    </div>
                  );
                }
                case SET_IMPLEMENTATION_TYPE.FLAT_DATA:
                case SET_IMPLEMENTATION_TYPE.EMBEDDED_FLAT_DATA: {
                  return (
                    <div
                      className="property-mapping-editor__entries__entry"
                      key={propertyMappingState.uuid}
                    >
                      <FlatDataPropertyMappingEditor
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
                      {propertyMappingStates.length > 1 &&
                        propertyBasicType !== CLASS_PROPERTY_TYPE.CLASS && (
                          <button
                            key={propertyMappingState.uuid}
                            className="property-mapping-editor__entries__entry__remove-btn"
                            onClick={() =>
                              removePropertyMapping(
                                propertyMappingState.propertyMapping,
                              )
                            }
                            tabIndex={-1}
                            title="Remove"
                            disabled={propertyMappingState.lambdaString === ''}
                          >
                            <TimesIcon />
                          </button>
                        )}
                    </div>
                  );
                }
                case SET_IMPLEMENTATION_TYPE.RELATIONAL: {
                  return (
                    <div
                      className="property-mapping-editor__entries__entry"
                      key={propertyMappingState.uuid}
                    >
                      <RelationalPropertyMappingEditor
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
                      {propertyMappingStates.length > 1 &&
                        propertyBasicType !== CLASS_PROPERTY_TYPE.CLASS && (
                          <button
                            className="property-mapping-editor__entries__entry__remove-btn"
                            key={propertyMappingState.uuid}
                            onClick={() =>
                              removePropertyMapping(
                                propertyMappingState.propertyMapping,
                              )
                            }
                            tabIndex={-1}
                            title="Remove"
                            disabled={propertyMappingState.lambdaString === ''}
                          >
                            <TimesIcon />
                          </button>
                        )}
                    </div>
                  );
                }
                default: {
                  const extraPropertyMappingEditorRenderers =
                    editorStore.pluginManager
                      .getApplicationPlugins()
                      .flatMap(
                        (plugin) =>
                          (
                            plugin as DSL_Mapping_LegendStudioApplicationPlugin_Extension
                          ).getExtraPropertyMappingEditorRenderers?.() ?? [],
                      );
                  for (const renderer of extraPropertyMappingEditorRenderers) {
                    const renderedPropertyMappingEditor = renderer(
                      instanceSetImplementationState,
                      propertyMappingState,
                    );
                    if (renderedPropertyMappingEditor) {
                      return renderedPropertyMappingEditor;
                    }
                  }
                  throw new UnsupportedOperationError(
                    `Can't render property mapping editor: no compatible renderer available from plugins`,
                  );
                }
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
                        title="Create mapping element"
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
                        title="Create mapping element"
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
      </div>
    );
  },
);
