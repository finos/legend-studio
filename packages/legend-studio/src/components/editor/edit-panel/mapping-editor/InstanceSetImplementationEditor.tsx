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

import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { FaAsterisk, FaLongArrowAltDown } from 'react-icons/fa';
import {
  clsx,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
} from '@finos/legend-art';
import { InstanceSetImplementationState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingElementState';
import type { PureInstanceSetImplementationFilterState } from '../../../../stores/editor-state/element-editor-state/mapping/PureInstanceSetImplementationState';
import { PureInstanceSetImplementationState } from '../../../../stores/editor-state/element-editor-state/mapping/PureInstanceSetImplementationState';
import { guaranteeNonNullable, noop } from '@finos/legend-shared';
import { MappingEditorState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState';
import { PropertyMappingsEditor } from './PropertyMappingsEditor';
import { MappingElementDecorationCleaner } from '../../../../stores/editor-state/element-editor-state/mapping/MappingElementDecorator';
import { UnsupportedInstanceSetImplementationState } from '../../../../stores/editor-state/element-editor-state/mapping/UnsupportedInstanceSetImplementationState';
import { UnsupportedEditorPanel } from '../../../editor/edit-panel/UnsupportedElementEditor';
import { flowResult } from 'mobx';
import { useEditorStore } from '../../EditorStoreProvider';
import { useApplicationStore } from '@finos/legend-application';
import type { InstanceSetImplementation, Property } from '@finos/legend-graph';
import { Class, PRIMITIVE_TYPE } from '@finos/legend-graph';
import { StudioLambdaEditor } from '../../../shared/StudioLambdaEditor';
import type { EditorStore } from '../../../../stores/EditorStore';
import { InstanceSetImplementationSourceExplorer } from './InstanceSetImplementationSourceExplorer';

const MappingFilterEditor = observer(
  ({
    editorStore,
    filterState,
    instanceSetImplementationState,
    isReadOnly,
  }: {
    editorStore: EditorStore;
    filterState: PureInstanceSetImplementationFilterState;
    instanceSetImplementationState: PureInstanceSetImplementationState;
    isReadOnly: boolean;
  }) => (
    <div className="panel class-mapping-editor__filter-panel">
      <div className="panel__header">
        <div className="panel__header__title">
          <div className="panel__header__title__content">FILTER</div>
        </div>
      </div>
      <div
        className={clsx('property-mapping-editor', {
          backdrop__element: Boolean(filterState.parserError),
        })}
      >
        <div className="class-mapping-filter-editor__content">
          <StudioLambdaEditor
            className="class-mapping-filter-editor__element__lambda-editor"
            disabled={
              isReadOnly ||
              instanceSetImplementationState.isConvertingTransformLambdaObjects
            }
            forceBackdrop={!!filterState.parserError}
            forceExpansion={false}
            lambdaEditorState={filterState}
            expectedType={editorStore.graphManagerState.graph.getPrimitiveType(
              PRIMITIVE_TYPE.BOOLEAN,
            )}
          />
        </div>
      </div>
    </div>
  ),
);

// Sort by property type/complexity (asc)
const typeSorter = (a: Property, b: Property): number =>
  (a.genericType.value.rawType instanceof Class ? 1 : 0) -
  (b.genericType.value.rawType instanceof Class ? 1 : 0);
// Sort by requiredness/multiplicity (desc)
const requiredStatusSorter = (a: Property, b: Property): number =>
  (a.multiplicity.lowerBound > 0 ? 0 : 1) -
  (b.multiplicity.lowerBound > 0 ? 0 : 1);

export const InstanceSetImplementationEditor = observer(
  (props: {
    setImplementation: InstanceSetImplementation;
    isReadOnly: boolean;
  }) => {
    const { setImplementation, isReadOnly } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const mappingEditorState =
      editorStore.getCurrentEditorState(MappingEditorState);
    const [sortByRequired, setSortByRequired] = useState(true);
    const instanceSetImplementationState = guaranteeNonNullable(
      mappingEditorState.currentTabState instanceof
        InstanceSetImplementationState
        ? mappingEditorState.currentTabState
        : undefined,
      'Mapping element state for instance set implementation must be instance set implementation state',
    );
    const handleSortChange = (): void => setSortByRequired(!sortByRequired);
    // Get properties of supertypes
    const sortedProperties = setImplementation.class.value
      .getAllProperties()
      // LEVEL 1: sort properties by name
      .sort((a, b) => a.name.localeCompare(b.name))
      // LEVEL 2: sort by properties by required/type (which ever is not chosen to be the primary sort)
      .sort(sortByRequired ? typeSorter : requiredStatusSorter)
      // LEVEL 3: sort by properties by required/type (primary sort)
      .sort(sortByRequired ? requiredStatusSorter : typeSorter);

    const isUnsupported =
      instanceSetImplementationState instanceof
      UnsupportedInstanceSetImplementationState;

    const renderFilterEditor =
      instanceSetImplementationState instanceof
        PureInstanceSetImplementationState &&
      instanceSetImplementationState.mappingElement.filter;

    useEffect(() => {
      if (!isReadOnly) {
        instanceSetImplementationState.decorate();
      }
      flowResult(
        instanceSetImplementationState.convertPropertyMappingTransformObjects(),
      ).catch(applicationStore.alertIllegalUnhandledError);
      if (
        instanceSetImplementationState instanceof
          PureInstanceSetImplementationState &&
        instanceSetImplementationState.mappingElement.filter
      ) {
        flowResult(instanceSetImplementationState.convertFilter()).catch(
          applicationStore.alertIllegalUnhandledError,
        );
      }
      return isReadOnly
        ? noop()
        : (): void =>
            setImplementation.accept_SetImplementationVisitor(
              new MappingElementDecorationCleaner(),
            );
    }, [
      applicationStore,
      setImplementation,
      isReadOnly,
      instanceSetImplementationState,
    ]);

    useEffect(() => {
      instanceSetImplementationState.setSelectedType(undefined);
    }, [instanceSetImplementationState]);

    return (
      <div className="mapping-element-editor__content">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel minSize={300}>
            <ResizablePanelGroup orientation="horizontal">
              <ResizablePanel minSize={300}>
                <div className="panel class-mapping-editor__property-panel">
                  <div className="panel__header">
                    <div className="panel__header__title">
                      <div className="panel__header__title__content">
                        PROPERTIES
                      </div>
                    </div>
                    <div className="panel__header__actions">
                      <div className="panel__header__action">
                        <div
                          className={`class-mapping-editor__sort-by-required-btn ${
                            sortByRequired
                              ? 'class-mapping-editor__sort-by-required-btn--enabled'
                              : ''
                          }`}
                          onClick={handleSortChange}
                        >
                          <FaLongArrowAltDown />
                          <FaAsterisk />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="panel__content">
                    {!isReadOnly &&
                      !isUnsupported &&
                      sortedProperties.map((property) => (
                        <PropertyMappingsEditor
                          key={property.name}
                          property={property}
                          instanceSetImplementationState={
                            instanceSetImplementationState
                          }
                          isReadOnly={isReadOnly}
                        />
                      ))}
                    {isReadOnly &&
                      !isUnsupported &&
                      sortedProperties
                        // for property without any property mapping in readonly mode, we won't show it
                        .filter(
                          (p) =>
                            instanceSetImplementationState.propertyMappingStates.filter(
                              (pm) =>
                                pm.propertyMapping.property.value.name ===
                                p.name,
                            ).length,
                        )
                        .map((property) => (
                          <PropertyMappingsEditor
                            key={property.name}
                            property={property}
                            instanceSetImplementationState={
                              instanceSetImplementationState
                            }
                            isReadOnly={isReadOnly}
                          />
                        ))}
                    {isUnsupported && (
                      <UnsupportedEditorPanel
                        isReadOnly={isReadOnly}
                        text={`Can't display class mapping in form mode`}
                      ></UnsupportedEditorPanel>
                    )}
                  </div>
                </div>
              </ResizablePanel>
              <ResizablePanelSplitter />
              {renderFilterEditor &&
                instanceSetImplementationState.mappingFilterState && (
                  <ResizablePanel size={330} minSize={80}>
                    <MappingFilterEditor
                      editorStore={editorStore}
                      instanceSetImplementationState={
                        instanceSetImplementationState
                      }
                      filterState={
                        instanceSetImplementationState.mappingFilterState
                      }
                      isReadOnly={isReadOnly}
                    />
                  </ResizablePanel>
                )}
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizablePanelSplitter />
          <ResizablePanel size={300} minSize={300}>
            <InstanceSetImplementationSourceExplorer
              setImplementation={setImplementation}
              isReadOnly={isReadOnly}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);
