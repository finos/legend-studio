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
import { PurePropertyMappingEditor } from './PurePropertyMappingEditor.js';
import { getElementIcon } from '../../../ElementIconUtils.js';
import {
  type MappingElement,
  MappingEditorState,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingEditorState.js';
import type {
  InstanceSetImplementationState,
  PropertyMappingState,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingElementState.js';
import {
  PurePropertyMappingState,
  PureInstanceSetImplementationState,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/PureInstanceSetImplementationState.js';
import {
  clsx,
  ArrowCircleRightIcon,
  TimesCircleIcon,
  TimesIcon,
  AsteriskIcon,
} from '@finos/legend-art';
import { guaranteeType } from '@finos/legend-shared';
import {
  type FlatDataPropertyMappingState,
  FlatDataInstanceSetImplementationState,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/FlatDataInstanceSetImplementationState.js';
import { FlatDataPropertyMappingEditor } from './FlatDataPropertyMappingEditor.js';
import { RelationalPropertyMappingEditor } from './relational/RelationalPropertyMappingEditor.js';
import type {
  RelationalPropertyMappingState,
  RootRelationalInstanceSetImplementationState,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/relational/RelationalInstanceSetImplementationState.js';
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
  FlatDataInstanceSetImplementation,
  RootRelationalInstanceSetImplementation,
  MULTIPLICITY_INFINITE,
  type Multiplicity,
  RelationFunctionInstanceSetImplementation,
} from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';
import {
  instanceSetImplementation_deletePropertyMapping,
  setImpl_nominateRoot,
  setImplementation_setRoot,
} from '../../../../stores/graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import {
  CLASS_PROPERTY_TYPE,
  getClassPropertyType,
} from '../../../../stores/editor/utils/ModelClassifierUtils.js';
import type { DSL_Mapping_LegendStudioApplicationPlugin_Extension } from '../../../../stores/extensions/DSL_Mapping_LegendStudioApplicationPlugin_Extension.js';
import { Fragment } from 'react';
import { RelationFunctionPropertyMappingEditor } from './RelationFunctionPropertyMappingEditor.js';
import type {
  RelationFunctionInstanceSetImplementationState,
  RelationFunctionPropertyMappingState,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/RelationFunctionInstanceSetImplementationState.js';

const MultiplicityBadge: React.FC<{
  multiplicity: Multiplicity;
}> = (props) => {
  const { multiplicity } = props;
  const isRequired = multiplicity.lowerBound && multiplicity.lowerBound > 0;
  const tooltipText = `${isRequired ? '[required]' : '[optional]'}${
    isRequired ? ` minimum: ${multiplicity.lowerBound}` : ''
  } maximum: ${multiplicity.upperBound ?? MULTIPLICITY_INFINITE}`;

  return (
    <div
      className={`multiplicity-badge ${
        isRequired ? 'multiplicity-badge--required' : ''
      }`}
      title={tooltipText}
    >
      {multiplicity.upperBound ? null : <AsteriskIcon />}
    </div>
  );
};

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

const GenericPropertyMappingEditorEntry = observer(
  (props: {
    children: React.ReactNode;
    instanceSetImplementationState: InstanceSetImplementationState;
    propertyMappingStates: PropertyMappingState[];
    propertyMappingState: PropertyMappingState;
    propertyBasicType: CLASS_PROPERTY_TYPE;
  }) => {
    const {
      children,
      instanceSetImplementationState,
      propertyMappingStates,
      propertyMappingState,
      propertyBasicType,
    } = props;

    const removePropertyMapping = (pm: PropertyMapping): void => {
      instanceSetImplementation_deletePropertyMapping(
        instanceSetImplementationState.mappingElement,
        pm,
      );
      instanceSetImplementationState.decorate();
    };

    return (
      <div className="property-mapping-editor__generic-entry">
        {children}
        {propertyMappingStates.length > 1 &&
          propertyBasicType !== CLASS_PROPERTY_TYPE.CLASS && (
            <button
              className="property-mapping-editor__generic-entry__remove-btn"
              onClick={() =>
                removePropertyMapping(propertyMappingState.propertyMapping)
              }
              tabIndex={-1}
              title="Remove"
            >
              <TimesIcon />
            </button>
          )}
      </div>
    );
  },
);

export const PropertyMappingEditor = observer(
  (props: {
    property: Property;
    instanceSetImplementationState: InstanceSetImplementationState;
    isReadOnly: boolean;
  }) => {
    const { instanceSetImplementationState, property, isReadOnly } = props;
    const instanceSetImplementation =
      instanceSetImplementationState.mappingElement;
    const validationErrorMessage =
      instanceSetImplementation.propertyMappings.filter(
        (pm) => pm.property.value === property,
      ).length > 1 && !(property.genericType.value.rawType instanceof Class)
        ? 'Only one property mapping should exist per property of type other than class (e.g. primitive, measure, enumeration)'
        : undefined;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const mappingEditorState =
      editorStore.tabManagerState.getCurrentEditorState(MappingEditorState);
    const propertyRawType = property.genericType.value.rawType;
    const propertyBasicType = getClassPropertyType(propertyRawType);
    const isEmbedded = instanceSetImplementation._isEmbedded;
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

    /**
     * TODO: revisit this behavior now that we have more types of property mapping to support
     * e.g. embedded, target set implementation, etc.
     * See https://github.com/finos/legend-studio/issues/310
     *
     * @modularize
     * TODO: modularize this for other types
     * See https://github.com/finos/legend-studio/issues/65
     */
    const visitOrCreateMappingElement = (): void => {
      if (propertyRawType instanceof Class) {
        if (
          instanceSetImplementation instanceof PureInstanceSetImplementation
        ) {
          const rootMappingElement = getRootSetImplementation(
            mappingEditorState.mapping,
            propertyRawType,
          );
          if (rootMappingElement) {
            if (!rootMappingElement.root.value) {
              setImplementation_setRoot(rootMappingElement, true);
            }
            const parent = rootMappingElement._PARENT;
            if (parent !== mappingEditorState.element) {
              // TODO: think more about this flow. Right now we open the mapping element in the parent mapping
              editorStore.graphEditorMode.openElement(parent);
              editorStore.tabManagerState
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
          applicationStore.notificationService.notifyWarning(
            `Can't visit mapping element for type '${propertyRawType.name}'`,
          );
        }
      }
    };

    const renderPropertyMappingEntry = (
      propertyMappingState: PropertyMappingState,
    ): React.ReactNode => {
      if (instanceSetImplementation instanceof PureInstanceSetImplementation) {
        return (
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
            setImplementationHasParserError={setImplementationHasParserError}
          />
        );
      } else if (
        instanceSetImplementation instanceof
          FlatDataInstanceSetImplementation ||
        instanceSetImplementation instanceof EmbeddedFlatDataPropertyMapping
      ) {
        return (
          <FlatDataPropertyMappingEditor
            isReadOnly={isReadOnly}
            flatDataInstanceSetImplementationState={
              instanceSetImplementationState as FlatDataInstanceSetImplementationState
            }
            flatDataPropertyMappingState={
              propertyMappingState as FlatDataPropertyMappingState
            }
            setImplementationHasParserError={setImplementationHasParserError}
          />
        );
      } else if (
        instanceSetImplementation instanceof
        RootRelationalInstanceSetImplementation
      ) {
        return (
          <RelationalPropertyMappingEditor
            isReadOnly={isReadOnly}
            relationalInstanceSetImplementationState={
              instanceSetImplementationState as RootRelationalInstanceSetImplementationState
            }
            relationalPropertyMappingState={
              propertyMappingState as RelationalPropertyMappingState
            }
            setImplementationHasParserError={setImplementationHasParserError}
          />
        );
      } else if (
        instanceSetImplementation instanceof
        RelationFunctionInstanceSetImplementation
      ) {
        return (
          <RelationFunctionPropertyMappingEditor
            isReadOnly={isReadOnly}
            relationInstanceSetImplementationState={
              instanceSetImplementationState as RelationFunctionInstanceSetImplementationState
            }
            relationPropertyMappingState={
              propertyMappingState as RelationFunctionPropertyMappingState
            }
            setImplementationHasParserError={setImplementationHasParserError}
          />
        );
      } else {
        const extraPropertyMappingEditorRenderers = editorStore.pluginManager
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
            return (
              <Fragment key={propertyMappingState.uuid}>
                {renderedPropertyMappingEditor}
              </Fragment>
            );
          }
        }

        return (
          <div
            className="property-mapping-editor__entry--unsupported"
            key={propertyMappingState.uuid}
          >
            Unsupported property mapping
          </div>
        );
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
            <div className="property-mapping-editor__name__label">
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
                  {getElementIcon(propertyRawType, editorStore)}
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
          {propertyMappingStates.map((propertyMappingState) => (
            <GenericPropertyMappingEditorEntry
              key={propertyMappingState.uuid}
              instanceSetImplementationState={instanceSetImplementationState}
              propertyBasicType={propertyBasicType}
              propertyMappingStates={propertyMappingStates}
              propertyMappingState={propertyMappingState}
            >
              {renderPropertyMappingEntry(propertyMappingState)}
            </GenericPropertyMappingEditorEntry>
          ))}
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
    );
  },
);
