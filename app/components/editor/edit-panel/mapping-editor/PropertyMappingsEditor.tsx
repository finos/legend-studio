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
import { FaArrowAltCircleRight } from 'react-icons/fa';
import Tooltip from '@material-ui/core/Tooltip';
import { MultiplicityBadge } from 'Components/shared/MultiplicityBadge';
import { PurePropertyMappingEditor } from './PurePropertyMappingEditor';
import { ElementIcon } from 'Components/shared/Icon';
import { MappingEditorState } from 'Stores/editor-state/element-editor-state/mapping/MappingEditorState';
import { useEditorStore } from 'Stores/EditorStore';
import { InstanceSetImplementationState } from 'Stores/editor-state/element-editor-state/mapping/MappingElementState';
import { PurePropertyMappingState, PureInstanceSetImplementationState } from 'Stores/editor-state/element-editor-state/mapping/PureInstanceSetImplementationState';
import { nominateRootSetImplementation } from 'Utilities/MappingResolutionUtil';
import clsx from 'clsx';
import { guaranteeType } from 'Utilities/GeneralUtil';
import { getSetImplementationType } from 'Utilities/GraphUtil';
import { Class, CLASS_PROPERTY_TYPE, getClassPropertyType } from 'MM/model/packageableElements/domain/Class';
import { SetImplementation, SET_IMPLEMENTATION_TYPE } from 'MM/model/packageableElements/mapping/SetImplementation';
import { Property } from 'MM/model/packageableElements/domain/Property';
import { PrimitiveType } from 'MM/model/packageableElements/domain/PrimitiveType';
import { PureInstanceSetImplementation } from 'MM/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import { MappingElement } from 'MM/model/packageableElements/mapping/Mapping';

export const PropertyMappingsEditor = observer((props: {
  property: Property;
  instanceSetImplementationState: InstanceSetImplementationState;
  isReadOnly: boolean;
}) => {
  const { instanceSetImplementationState, property, isReadOnly } = props;
  const editorStore = useEditorStore();
  const mappingEditorState = editorStore.getCurrentEditorState(MappingEditorState);
  const propertyRawType = property.genericType.value.rawType;
  const propertyBasicType = getClassPropertyType(propertyRawType);
  const instanceSetImplementationType = getSetImplementationType(instanceSetImplementationState.setImplementation);
  const isEmbedded = instanceSetImplementationState.setImplementation.isEmbedded;
  // Parser Error
  const propertyMappingStates = instanceSetImplementationState.propertyMappingStates.filter(pm => pm.propertyMapping.property.value.name === property.name);
  /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
  const propertyHasParserError = Boolean(propertyMappingStates.find(pm => (pm instanceof PurePropertyMappingState) && pm.parserError));
  const setImplementationHasParserError = Boolean(instanceSetImplementationState.propertyMappingStates.find(pm => (pm instanceof PurePropertyMappingState) && pm.parserError));
  // Walker
  const visit = (): void => {
    if (propertyRawType instanceof Class) {
      if (instanceSetImplementationState.mappingElement instanceof PureInstanceSetImplementation) {
        const rootMappingElement = mappingEditorState.mapping.getRootSetImplementation(propertyRawType);
        if (rootMappingElement) {
          mappingEditorState.openMappingElement(rootMappingElement, true);
        } else {
          if (!isReadOnly) {
            mappingEditorState.createMappingElement({
              target: property.genericType.value.rawType,
              showTarget: false,
              openInAdjacentTab: true,
              postSubmitAction: (newSetImpl: MappingElement | undefined): void => {
                // Make this set implementation the new root
                if (newSetImpl instanceof SetImplementation) {
                  nominateRootSetImplementation(newSetImpl);
                }
              }
            });
          }
        }
      }
    }
  };

  return (
    <div className={clsx('property-mapping-editor', { 'backdrop__element': propertyHasParserError })}>
      <div className="property-mapping-editor__metadata">
        <div className="property-mapping-editor__name">{property.name}</div>
        <div className="property-mapping-editor__info">
          <Tooltip
            interactive={true}
            enterDelay={500}
            leaveDelay={100}
            title={propertyRawType instanceof PrimitiveType ? '' : propertyRawType.path}
            placement="top-end"
          >
            <div className={clsx('property-mapping-editor__type', `background--${propertyBasicType.toLowerCase()}`,
              { 'property-mapping-editor__type--has-visit-btn': propertyBasicType === CLASS_PROPERTY_TYPE.CLASS }
            )}>
              {propertyBasicType !== CLASS_PROPERTY_TYPE.PRIMITIVE && <div className="property-mapping-editor__type__abbr"><ElementIcon element={propertyRawType} /></div>}
              <div className="property-mapping-editor__type__label">{propertyRawType.name}</div>
              {propertyBasicType === CLASS_PROPERTY_TYPE.CLASS &&
                <button
                  className="property-mapping-editor__type__visit-btn"
                  onClick={visit}
                  tabIndex={-1}
                  title={'Visit mapping element'}
                ><FaArrowAltCircleRight /></button>
              }
            </div>
          </Tooltip>
          <div className="property-mapping-editor__multiplicity">
            <MultiplicityBadge multiplicity={property.multiplicity} />
          </div>
        </div>
      </div>
      <div className="property-mapping-editor__content">
        {propertyMappingStates.map(propertyMappingState => {
          /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
          switch (instanceSetImplementationType) {
            case SET_IMPLEMENTATION_TYPE.PUREINSTANCE:
              return (
                <PurePropertyMappingEditor
                  key={propertyMappingState.uuid}
                  isReadOnly={isReadOnly}
                  pureInstanceSetImplementationState={guaranteeType(instanceSetImplementationState, PureInstanceSetImplementationState)}
                  purePropertyMappingState={guaranteeType(propertyMappingState, PurePropertyMappingState)}
                  setImplementationHasParserError={setImplementationHasParserError}
                />
              );
            default:
              return null;
          }
        })}
        {propertyBasicType === CLASS_PROPERTY_TYPE.CLASS && !propertyMappingStates.length &&
          <>
            {isEmbedded &&
              <div className="property-mapping-editor__entry--empty">
                Click
                <button
                  className="property-mapping-editor__entry--empty__visit-btn"
                  onClick={visit}
                  tabIndex={-1}
                  title={'Create mapping element'}
                ><FaArrowAltCircleRight /></button>
                to create an embedded class mapping for property &apos;{property.name}&apos;.
              </div>
            }
            {!isEmbedded &&
              <div className="property-mapping-editor__entry--empty">
                No set implementation found. Click
                <button
                  className="property-mapping-editor__entry--empty__visit-btn"
                  onClick={visit}
                  tabIndex={-1}
                  title={'Create mapping element'}
                ><FaArrowAltCircleRight /></button>
                to create a root class mapping for {propertyRawType.name}.
              </div>
            }
          </>
        }
      </div>
    </div>
  );
});
