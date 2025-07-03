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

import { useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  BlankPanelPlaceholder,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  AsteriskIcon,
  LongArrowAltDownIcon,
  PencilEditIcon,
  PanelDropZone,
  PanelContent,
  PanelHeaderActionItem,
  PanelHeaderActions,
  PanelHeader,
} from '@finos/legend-art';
import {
  CORE_DND_TYPE,
  type ElementDragSource,
  type MappingElementSourceDropTarget,
} from '../../../../stores/editor/utils/DnDUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import {
  InstanceSetImplementationState,
  MappingElementState,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingElementState.js';
import {
  type PureInstanceSetImplementationFilterState,
  PureInstanceSetImplementationState,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/PureInstanceSetImplementationState.js';
import { guaranteeNonNullable, noop } from '@finos/legend-shared';
import {
  getMappingElementSource,
  MappingEditorState,
  getEmbeddedSetImplementations,
  type MappingElementSource,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingEditorState.js';
import { TypeTree } from './TypeTree.js';
import { FlatDataRecordTypeTree } from './FlatDataRecordTypeTree.js';
import { PropertyMappingEditor } from './PropertyMappingsEditor.js';
import { useDrop } from 'react-dnd';
import { FlatDataInstanceSetImplementationState } from '../../../../stores/editor/editor-state/element-editor-state/mapping/FlatDataInstanceSetImplementationState.js';
import { MappingElementDecorationCleaner } from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingElementDecorator.js';
import { UnsupportedInstanceSetImplementationState } from '../../../../stores/editor/editor-state/element-editor-state/mapping/UnsupportedInstanceSetImplementationState.js';
import { UnsupportedEditorPanel } from '../UnsupportedElementEditor.js';
import { TableOrViewSourceTree } from './relational/TableOrViewSourceTree.js';
import {
  getSourceElementLabel,
  InstanceSetImplementationSourceSelectorModal,
} from './InstanceSetImplementationSourceSelectorModal.js';
import { flowResult } from 'mobx';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  ActionAlertActionType,
  useApplicationStore,
} from '@finos/legend-application';
import {
  type InstanceSetImplementation,
  type Property,
  type PackageableElement,
  type View,
  Class,
  Type,
  FlatData,
  RootFlatDataRecordType,
  Table,
  Database,
  TableAlias,
  TableExplicitReference,
  ViewExplicitReference,
  getAllRecordTypes,
  getAllClassProperties,
  PrimitiveType,
  ConcreteFunctionDefinition,
} from '@finos/legend-graph';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';
import type { DSL_Mapping_LegendStudioApplicationPlugin_Extension } from '../../../../stores/extensions/DSL_Mapping_LegendStudioApplicationPlugin_Extension.js';
import { InlineLambdaEditor } from '@finos/legend-query-builder';
import { RelationTypeTree } from './RelationTypeTree.js';

export const InstanceSetImplementationSourceExplorer = observer(
  (props: {
    setImplementation: InstanceSetImplementation;
    isReadOnly: boolean;
  }) => {
    const { setImplementation, isReadOnly } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const [sourceElementToFilter, setSourceElementToFilter] = useState<
      PackageableElement | undefined
    >(undefined);
    const mappingEditorState =
      editorStore.tabManagerState.getCurrentEditorState(MappingEditorState);
    const instanceSetImplementationState =
      mappingEditorState.currentTabState instanceof MappingElementState
        ? mappingEditorState.currentTabState
        : undefined;
    const srcElement = getMappingElementSource(
      setImplementation,
      editorStore.pluginManager.getApplicationPlugins(),
    );
    const sourceLabel = getSourceElementLabel(srcElement);
    // `null` is when we want to open the modal using the existing source
    // `undefined` is to close the source modal
    // any other value to open the source modal using that value as the initial state of the modal
    const [
      sourceElementForSourceSelectorModal,
      setSourceElementForSourceSelectorModal,
    ] = useState<MappingElementSource>();
    const CHANGING_SOURCE_ON_EMBEDDED =
      'Changing source on mapping with embedded children will delete all its children';
    const showSourceSelectorModal = (): void => {
      setSourceElementToFilter(undefined);
      if (!isReadOnly) {
        const embeddedSetImpls =
          getEmbeddedSetImplementations(setImplementation);
        if (!embeddedSetImpls.length) {
          setSourceElementForSourceSelectorModal(null);
        } else {
          applicationStore.alertService.setActionAlertInfo({
            message: CHANGING_SOURCE_ON_EMBEDDED,
            actions: [
              {
                label: 'Continue',
                handler: (): void =>
                  setSourceElementForSourceSelectorModal(null),
                type: ActionAlertActionType.PROCEED,
              },
              {
                label: 'Cancel',
              },
            ],
          });
        }
      }
    };
    const hideSourceSelectorModal = (): void =>
      setSourceElementForSourceSelectorModal(undefined);
    // Drag and Drop
    const dndType = [
      CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
      CORE_DND_TYPE.PROJECT_EXPLORER_FLAT_DATA,
      CORE_DND_TYPE.PROJECT_EXPLORER_DATABASE,
      CORE_DND_TYPE.PROJECT_EXPLORER_FUNCTION,
    ];
    // smartly analyze the content of the source and automatically assign it or its sub-part
    // as class mapping source when possible
    const changeClassMappingSourceDriver = useCallback(
      (droppedPackagableElement: PackageableElement): void => {
        if (droppedPackagableElement instanceof Class) {
          flowResult(
            mappingEditorState.changeClassMappingSourceDriver(
              setImplementation,
              droppedPackagableElement,
            ),
          ).catch(applicationStore.alertUnhandledError);
        } else if (droppedPackagableElement instanceof FlatData) {
          const allRecordTypes = getAllRecordTypes(droppedPackagableElement);
          if (allRecordTypes.length === 0) {
            applicationStore.notificationService.notifyWarning(
              `Source flat-data store '${droppedPackagableElement.path}' must have at least one action`,
            );
            return;
          }
          if (allRecordTypes.length === 1) {
            flowResult(
              mappingEditorState.changeClassMappingSourceDriver(
                setImplementation,
                allRecordTypes[0],
              ),
            ).catch(applicationStore.alertUnhandledError);
          } else {
            setSourceElementForSourceSelectorModal(allRecordTypes[0]);
          }
        } else if (droppedPackagableElement instanceof Database) {
          setSourceElementToFilter(droppedPackagableElement);
          const relations = droppedPackagableElement.schemas.flatMap((schema) =>
            (schema.tables as (Table | View)[]).concat(schema.views),
          );
          if (relations.length === 0) {
            applicationStore.notificationService.notifyWarning(
              `Source database '${droppedPackagableElement.path}' must have at least one table or view`,
            );
            return;
          }
          const mainTableAlias = new TableAlias();
          mainTableAlias.relation =
            relations[0] instanceof Table
              ? TableExplicitReference.create(relations[0])
              : ViewExplicitReference.create(relations[0] as View);
          mainTableAlias.name = mainTableAlias.relation.value.name;
          if (relations.length === 1) {
            flowResult(
              mappingEditorState.changeClassMappingSourceDriver(
                setImplementation,
                mainTableAlias,
              ),
            ).catch(applicationStore.alertUnhandledError);
          } else {
            setSourceElementForSourceSelectorModal(mainTableAlias);
          }
        } else if (
          droppedPackagableElement instanceof ConcreteFunctionDefinition
        ) {
          flowResult(
            mappingEditorState.changeClassMappingSourceDriver(
              setImplementation,
              droppedPackagableElement,
            ),
          ).catch(applicationStore.alertUnhandledError);
        }
      },
      [applicationStore, mappingEditorState, setImplementation],
    );
    const handleDrop = useCallback(
      (item: MappingElementSourceDropTarget): void => {
        if (!setImplementation._isEmbedded && !isReadOnly) {
          const embeddedSetImpls =
            getEmbeddedSetImplementations(setImplementation);
          const droppedPackagableElement = item.data.packageableElement;
          if (!embeddedSetImpls.length) {
            changeClassMappingSourceDriver(droppedPackagableElement);
          } else {
            applicationStore.alertService.setActionAlertInfo({
              message: CHANGING_SOURCE_ON_EMBEDDED,
              actions: [
                {
                  label: 'Continue',
                  handler: (): void =>
                    changeClassMappingSourceDriver(droppedPackagableElement),
                  type: ActionAlertActionType.PROCEED,
                },
                {
                  label: 'Cancel',
                },
              ],
            });
          }
        }
      },
      [
        changeClassMappingSourceDriver,
        applicationStore,
        isReadOnly,
        setImplementation,
      ],
    );
    const [{ isDragOver, canDrop }, dropConnector] = useDrop<
      ElementDragSource,
      void,
      { isDragOver: boolean; canDrop: boolean }
    >(
      () => ({
        accept: dndType,
        drop: (item) => handleDrop(item),
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }),
          canDrop: monitor.canDrop(),
        }),
      }),
      [handleDrop],
    );
    const isUnsupported =
      instanceSetImplementationState instanceof
      UnsupportedInstanceSetImplementationState;
    if (
      !(
        instanceSetImplementationState instanceof InstanceSetImplementationState
      )
    ) {
      return null;
    }
    const extraInstanceSetImplementationBlockingErrorCheckers =
      editorStore.pluginManager
        .getApplicationPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as DSL_Mapping_LegendStudioApplicationPlugin_Extension
            ).getExtraInstanceSetImplementationBlockingErrorCheckers?.() ?? [],
        );
    let hasParseError = false;
    for (const checker of extraInstanceSetImplementationBlockingErrorCheckers) {
      const instanceSetImplementationBlockingErrorChecker = checker(
        instanceSetImplementationState,
      );
      if (instanceSetImplementationBlockingErrorChecker) {
        hasParseError = instanceSetImplementationBlockingErrorChecker;
      }
    }
    return (
      <div
        data-testid={LEGEND_STUDIO_TEST_ID.SOURCE_PANEL}
        className={clsx('panel source-panel', {
          backdrop__element:
            (instanceSetImplementationState instanceof
            PureInstanceSetImplementationState
              ? instanceSetImplementationState.hasParserError
              : false) ||
            (instanceSetImplementationState instanceof
            FlatDataInstanceSetImplementationState
              ? instanceSetImplementationState.hasParserError
              : false) ||
            hasParseError,
        })}
      >
        <PanelHeader>
          <div className="panel__header__title source-panel__header__title">
            <div className="panel__header__title__label">source</div>
            <div className="panel__header__title__content">{sourceLabel}</div>
          </div>
          <PanelHeaderActions>
            <PanelHeaderActionItem
              onClick={showSourceSelectorModal}
              disabled={
                isReadOnly || setImplementation._isEmbedded || isUnsupported
              }
              title="Select Source..."
            >
              <PencilEditIcon />
            </PanelHeaderActionItem>
          </PanelHeaderActions>
        </PanelHeader>
        <PanelContent>
          <PanelDropZone
            dropTargetConnector={dropConnector}
            isDragOver={isDragOver && !isReadOnly}
          >
            {!isUnsupported && (
              <>
                {srcElement ? (
                  <div className="source-panel__explorer">
                    {srcElement instanceof Type && (
                      <TypeTree
                        type={srcElement}
                        selectedType={
                          instanceSetImplementationState.selectedType
                        }
                      />
                    )}
                    {srcElement instanceof RootFlatDataRecordType && (
                      <FlatDataRecordTypeTree
                        recordType={srcElement}
                        selectedType={
                          instanceSetImplementationState.selectedType
                        }
                      />
                    )}
                    {srcElement instanceof TableAlias && (
                      <TableOrViewSourceTree
                        relation={srcElement.relation.value}
                        selectedType={
                          instanceSetImplementationState.selectedType
                        }
                      />
                    )}
                    {srcElement instanceof ConcreteFunctionDefinition && (
                      <RelationTypeTree
                        relation={srcElement}
                        selectedType={
                          instanceSetImplementationState.selectedType
                        }
                        editorStore={editorStore}
                      />
                    )}
                  </div>
                ) : (
                  <BlankPanelPlaceholder
                    text="Choose a source"
                    onClick={showSourceSelectorModal}
                    clickActionType="add"
                    tooltipText="Drop a class mapping source, or click to choose one"
                    isDropZoneActive={canDrop}
                    disabled={isReadOnly}
                    previewText="No source"
                  />
                )}
              </>
            )}
            {isUnsupported && (
              <UnsupportedEditorPanel
                isReadOnly={isReadOnly}
                text="Can't display class mapping source in form mode"
              ></UnsupportedEditorPanel>
            )}
            {sourceElementForSourceSelectorModal !== undefined && (
              <InstanceSetImplementationSourceSelectorModal
                mappingEditorState={mappingEditorState}
                setImplementation={setImplementation}
                sourceElementToSelect={sourceElementForSourceSelectorModal}
                closeModal={hideSourceSelectorModal}
                sourceElementToFilter={sourceElementToFilter}
              />
            )}
          </PanelDropZone>
        </PanelContent>
      </div>
    );
  },
);

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
          <InlineLambdaEditor
            className="class-mapping-filter-editor__element__lambda-editor"
            disabled={
              isReadOnly ||
              instanceSetImplementationState.isConvertingTransformLambdaObjects
            }
            forceBackdrop={Boolean(filterState.parserError)}
            lambdaEditorState={filterState}
            expectedType={PrimitiveType.BOOLEAN}
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
      editorStore.tabManagerState.getCurrentEditorState(MappingEditorState);
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
    const sortedProperties = getAllClassProperties(
      setImplementation.class.value,
    )
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
      ).catch(applicationStore.alertUnhandledError);
      if (
        instanceSetImplementationState instanceof
          PureInstanceSetImplementationState &&
        instanceSetImplementationState.mappingElement.filter
      ) {
        flowResult(instanceSetImplementationState.convertFilter()).catch(
          applicationStore.alertUnhandledError,
        );
      }
      return isReadOnly
        ? noop()
        : (): void =>
            setImplementation.accept_SetImplementationVisitor(
              new MappingElementDecorationCleaner(editorStore),
            );
    }, [
      applicationStore,
      setImplementation,
      isReadOnly,
      instanceSetImplementationState,
      editorStore,
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
                  <PanelHeader>
                    <div className="panel__header__title">
                      <div className="panel__header__title__content">
                        PROPERTIES
                      </div>
                    </div>
                    <PanelHeaderActions>
                      <div className="panel__header__action">
                        <div
                          className={`class-mapping-editor__sort-by-required-btn ${
                            sortByRequired
                              ? 'class-mapping-editor__sort-by-required-btn--enabled'
                              : ''
                          }`}
                          onClick={handleSortChange}
                        >
                          <LongArrowAltDownIcon />
                          <AsteriskIcon />
                        </div>
                      </div>
                    </PanelHeaderActions>
                  </PanelHeader>
                  <PanelContent>
                    {!isReadOnly &&
                      !isUnsupported &&
                      sortedProperties.map((property) => (
                        <PropertyMappingEditor
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
                          <PropertyMappingEditor
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
                        text="Can't display class mapping in form mode"
                      ></UnsupportedEditorPanel>
                    )}
                  </PanelContent>
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
