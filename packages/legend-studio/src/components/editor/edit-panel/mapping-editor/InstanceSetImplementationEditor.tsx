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

import { useState, useRef, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { FaAsterisk, FaLongArrowAltDown, FaEdit } from 'react-icons/fa';
import SplitPane from 'react-split-pane';
import type { SelectComponent } from '@finos/legend-studio-components';
import {
  clsx,
  CustomSelectorInput,
  createFilter,
} from '@finos/legend-studio-components';
import type {
  ElementDragSource,
  MappingElementSourceDropTarget,
} from '../../../../stores/shared/DnDUtil';
import { CORE_DND_TYPE } from '../../../../stores/shared/DnDUtil';
import { CORE_TEST_ID } from '../../../../const';
import { MdVerticalAlignBottom, MdAdd } from 'react-icons/md';
import {
  InstanceSetImplementationState,
  MappingElementState,
} from '../../../../stores/editor-state/element-editor-state/mapping/MappingElementState';
import { PureInstanceSetImplementationState } from '../../../../stores/editor-state/element-editor-state/mapping/PureInstanceSetImplementationState';
import {
  guaranteeType,
  assertTrue,
  guaranteeNonNullable,
  noop,
} from '@finos/legend-studio-shared';
import { MappingEditorState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState';
import { useEditorStore } from '../../../../stores/EditorStore';
import { TypeTree } from '../../../shared/TypeTree';
import { FlatDataRecordTypeTree } from './FlatDataRecordTypeTree';
import { PropertyMappingsEditor } from './PropertyMappingsEditor';
import Dialog from '@material-ui/core/Dialog';
import { useDrop } from 'react-dnd';
import { FlatDataInstanceSetImplementationState } from '../../../../stores/editor-state/element-editor-state/mapping/FlatDataInstanceSetImplementationState';
import {
  ActionAlertActionType,
  useApplicationStore,
} from '../../../../stores/ApplicationStore';
import { MapppingElementDecorationCleanUpVisitor } from '../../../../stores/editor-state/element-editor-state/mapping/MappingElementDecorateVisitor';
import { UnsupportedInstanceSetImplementationState } from '../../../../stores/editor-state/element-editor-state/mapping/UnsupportedInstanceSetImplementationState';
import { UnsupportedEditorPanel } from '../../../editor/edit-panel/UnsupportedElementEditor';
import { SET_IMPLEMENTATION_TYPE } from '../../../../models/metamodels/pure/model/packageableElements/mapping/SetImplementation';
import type { InstanceSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/mapping/InstanceSetImplementation';
import type { Property } from '../../../../models/metamodels/pure/model/packageableElements/domain/Property';
import { Class } from '../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import { PureInstanceSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import { Type } from '../../../../models/metamodels/pure/model/packageableElements/domain/Type';
import type { FlatDataInstanceSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/mapping/FlatDataInstanceSetImplementation';
import { FlatData } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/model/FlatData';
import type { EmbeddedFlatDataPropertyMapping } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping';
import type {
  MappingElementSourceSelectOption,
  MappingElementSource,
} from '../../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import {
  getMappingElementSource,
  getMappingElementSourceFilterText,
} from '../../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import type { PackageableElement } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import { RootFlatDataRecordType } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/model/FlatDataDataType';
import { View } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/model/View';
import { Table } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/model/Table';
import { TableOrViewSourceTree } from './relational/TableOrViewSourceTree';

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
const getSourceElementLabel = (
  srcElement: MappingElementSource | undefined,
): string => {
  let sourceLabel = '(none)';
  if (srcElement instanceof Class) {
    sourceLabel = srcElement.name;
  } else if (srcElement instanceof RootFlatDataRecordType) {
    sourceLabel = srcElement.owner.name;
  } else if (srcElement instanceof Table || srcElement instanceof View) {
    sourceLabel = `${srcElement.schema.owner.name}.${srcElement.schema.name}.${srcElement.name}`;
  }
  return sourceLabel;
};

const InstanceSetImplementationSourceSelectorModal = observer(
  (props: {
    mappingEditorState: MappingEditorState;
    setImplementation: InstanceSetImplementation;
    open: boolean;
    closeModal: () => void;
  }) => {
    const { mappingEditorState, setImplementation, closeModal, open } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const options = mappingEditorState.mappingElementSourceOptions;
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: getMappingElementSourceFilterText,
    });
    const sourceSelectorRef = useRef<SelectComponent>(null);
    const instanceSetImplementationType = editorStore.graphState.getSetImplementationType(
      setImplementation,
    );
    let sourceTypeLabel;
    switch (instanceSetImplementationType) {
      /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
      case SET_IMPLEMENTATION_TYPE.PUREINSTANCE:
        sourceTypeLabel = 'class';
        break;
      case SET_IMPLEMENTATION_TYPE.FLAT_DATA:
      case SET_IMPLEMENTATION_TYPE.EMBEDDED_FLAT_DATA:
        sourceTypeLabel = 'flat-data store';
        break;
      case SET_IMPLEMENTATION_TYPE.RELATIONAL:
        sourceTypeLabel = 'database store';
        break;
      default:
        sourceTypeLabel = 'source element';
        break;
    }
    let selectedSourceType;
    /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
    switch (instanceSetImplementationType) {
      case SET_IMPLEMENTATION_TYPE.PUREINSTANCE: {
        const pureInstance = guaranteeType(
          setImplementation,
          PureInstanceSetImplementation,
        );
        selectedSourceType = pureInstance.srcClass.value
          ? {
              value: pureInstance.srcClass.value,
              label: pureInstance.srcClass.value.name,
            }
          : null;
        break;
      }
      case SET_IMPLEMENTATION_TYPE.FLAT_DATA: {
        const flatDataInstance = setImplementation as FlatDataInstanceSetImplementation;
        selectedSourceType = {
          value: flatDataInstance.sourceRootRecordType.value,
          label: flatDataInstance.sourceRootRecordType.value.owner.name,
        };
        break;
      }
      case SET_IMPLEMENTATION_TYPE.EMBEDDED_FLAT_DATA: {
        const embeddedPropertyMapping = setImplementation as EmbeddedFlatDataPropertyMapping;
        const flatDataInstance = embeddedPropertyMapping.rootInstanceSetImplementation as FlatDataInstanceSetImplementation;
        selectedSourceType = {
          value: flatDataInstance.sourceRootRecordType.value,
          label: flatDataInstance.sourceRootRecordType.value.owner.name,
        };
        break;
      }
      default:
        selectedSourceType = null;
        break;
    }
    const changeSourceType = (
      val: MappingElementSourceSelectOption | null,
    ): Promise<void> =>
      mappingEditorState
        .changeClassMappingSourceDriver(setImplementation, val?.value)
        .then(() => closeModal())
        .catch(applicationStore.alertIllegalUnhandledError);
    const handleEnter = (): void => sourceSelectorRef.current?.focus();

    return (
      <Dialog
        open={open}
        onClose={closeModal}
        onEnter={handleEnter}
        classes={{
          container: 'search-modal__container',
        }}
        PaperProps={{
          classes: {
            root: 'search-modal__inner-container',
          },
        }}
      >
        <div className="modal search-modal">
          <div className="modal__title">Choose a Source</div>
          <CustomSelectorInput
            ref={sourceSelectorRef}
            options={options}
            onChange={changeSourceType}
            value={selectedSourceType}
            placeholder={`Choose a ${sourceTypeLabel}...`}
            isClearable={true}
            filterOption={filterOption}
          />
        </div>
      </Dialog>
    );
  },
);

const FlatDataSourceSelectorModal = observer(
  (props: {
    mappingEditorState: MappingEditorState;
    setImplementation: InstanceSetImplementation;
    flatData: FlatData;
    open: boolean;
    closeModal: () => void;
  }) => {
    const {
      setImplementation,
      closeModal,
      open,
      flatData,
      mappingEditorState,
    } = props;
    const applicationStore = useApplicationStore();
    const options = flatData.recordTypes.map(
      (recordType) => recordType.selectOption,
    );
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: getMappingElementSourceFilterText,
    });
    const sourceSelectorRef = useRef<SelectComponent>(null);
    const changeSourceType = (
      val: MappingElementSourceSelectOption | null,
    ): void => {
      if (val?.value) {
        mappingEditorState
          .changeClassMappingSourceDriver(setImplementation, val.value)
          .then(() => closeModal())
          .catch(applicationStore.alertIllegalUnhandledError);
      }
    };
    const handleEnter = (): void => sourceSelectorRef.current?.focus();

    return (
      <Dialog
        open={open}
        onClose={closeModal}
        onEnter={handleEnter}
        classes={{
          container: 'search-modal__container',
        }}
        PaperProps={{
          classes: {
            root: 'search-modal__inner-container',
          },
        }}
      >
        <div className="modal search-modal">
          <div className="modal__title">Choose a Source</div>
          <CustomSelectorInput
            ref={sourceSelectorRef}
            options={options}
            onChange={changeSourceType}
            value={null}
            placeholder="Choose a flat-data action..."
            isClearable={true}
            filterOption={filterOption}
          />
        </div>
      </Dialog>
    );
  },
);

export const InstanceSetImplementationSourceExplorer = observer(
  (props: {
    setImplementation: InstanceSetImplementation;
    isReadOnly: boolean;
  }) => {
    const { setImplementation, isReadOnly } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const mappingEditorState = editorStore.getCurrentEditorState(
      MappingEditorState,
    );
    const instanceSetImplementationState =
      mappingEditorState.currentTabState instanceof MappingElementState
        ? mappingEditorState.currentTabState
        : undefined;
    const srcElement = getMappingElementSource(setImplementation);
    const sourceLabel = getSourceElementLabel(srcElement);
    // Source Selector Modal
    const [openSourceSelectorModal, setOpenSourceSelectorModal] = useState(
      false,
    );
    const [flatDataSourceModal, setFlatDataSourceModal] = useState<
      FlatData | undefined
    >(undefined);
    const CHANGING_SOURCE_ON_EMBEDDED =
      'Changing source on mapping with embedded children will delete all its children';
    const showSourceSelectorModal = (): void => {
      if (!isReadOnly) {
        const embeddedSetImpls = setImplementation.getEmbeddedSetImplmentations();
        if (!embeddedSetImpls.length) {
          setOpenSourceSelectorModal(true);
        } else {
          editorStore.setActionAltertInfo({
            message: CHANGING_SOURCE_ON_EMBEDDED,
            onEnter: (): void => editorStore.setBlockGlobalHotkeys(true),
            onClose: (): void => editorStore.setBlockGlobalHotkeys(false),
            actions: [
              {
                label: 'Continue',
                handler: (): void => setOpenSourceSelectorModal(true),
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
      setOpenSourceSelectorModal(false);
    const showFlatDataActionModal = useCallback(
      (flatData: FlatData): void =>
        isReadOnly ? undefined : setFlatDataSourceModal(flatData),
      [isReadOnly],
    );
    const hideFlatDataActionModal = (): void =>
      setFlatDataSourceModal(undefined);
    // Drag and Drop
    /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
    const dndType = [
      CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
      CORE_DND_TYPE.PROJECT_EXPLORER_FLAT_DATA,
      CORE_DND_TYPE.PROJECT_EXPLORER_DATABASE,
    ];
    const changeClassMappingSourceDriver = useCallback(
      (droppedPackagableElement: PackageableElement): void => {
        if (droppedPackagableElement instanceof Class) {
          mappingEditorState
            .changeClassMappingSourceDriver(
              setImplementation,
              droppedPackagableElement,
            )
            .catch(applicationStore.alertIllegalUnhandledError);
        } else if (droppedPackagableElement instanceof FlatData) {
          assertTrue(
            droppedPackagableElement.recordTypes.length !== 0,
            `Source flat-data store '${droppedPackagableElement.path}' must have at least one action`,
          );
          if (droppedPackagableElement.recordTypes.length === 1) {
            mappingEditorState
              .changeClassMappingSourceDriver(
                setImplementation,
                droppedPackagableElement.recordTypes[0],
              )
              .catch(applicationStore.alertIllegalUnhandledError);
          } else {
            showFlatDataActionModal(droppedPackagableElement);
          }
        }
      },
      [
        applicationStore.alertIllegalUnhandledError,
        mappingEditorState,
        setImplementation,
        showFlatDataActionModal,
      ],
    );
    const handleDrop = useCallback(
      (item: MappingElementSourceDropTarget): void => {
        if (!setImplementation.isEmbedded && !isReadOnly) {
          const embeddedSetImpls = setImplementation.getEmbeddedSetImplmentations();
          const droppedPackagableElement = item.data.packageableElement;
          if (!embeddedSetImpls.length) {
            changeClassMappingSourceDriver(droppedPackagableElement);
          } else {
            editorStore.setActionAltertInfo({
              message: CHANGING_SOURCE_ON_EMBEDDED,
              onEnter: (): void => editorStore.setBlockGlobalHotkeys(true),
              onClose: (): void => editorStore.setBlockGlobalHotkeys(false),
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
        editorStore,
        isReadOnly,
        setImplementation,
      ],
    );
    const [{ isDragOver }, dropRef] = useDrop(
      () => ({
        accept: dndType,
        drop: (item: ElementDragSource): void => handleDrop(item),
        collect: (monitor): { isDragOver: boolean } => ({
          isDragOver: monitor.isOver({ shallow: true }),
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
    return (
      <div
        data-testid={CORE_TEST_ID.SOURCE_PANEL}
        className={clsx('panel source-panel', {
          /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
          backdrop__element:
            (instanceSetImplementationState instanceof
            PureInstanceSetImplementationState
              ? instanceSetImplementationState.hasParserError
              : false) ||
            (instanceSetImplementationState instanceof
            FlatDataInstanceSetImplementationState
              ? instanceSetImplementationState.hasParserError
              : false),
        })}
      >
        <div className="panel__header">
          <div className="panel__header__title source-panel__header__title">
            <div className="panel__header__title__label">source</div>
            <div className="panel__header__title__content">{sourceLabel}</div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              onClick={showSourceSelectorModal}
              disabled={
                isReadOnly || setImplementation.isEmbedded || isUnsupported
              }
              tabIndex={-1}
              title="Select Source..."
            >
              <FaEdit />
            </button>
          </div>
        </div>
        {/* TODO: use BlankPanelPlaceholder */}
        <div
          ref={dropRef}
          className={clsx('panel__content', {
            'panel__content--dnd-over': isDragOver && !isReadOnly,
          })}
        >
          {srcElement instanceof Type && (
            <TypeTree
              type={srcElement}
              selectedType={mappingEditorState.selectedTypeLabel}
            />
          )}
          {srcElement instanceof RootFlatDataRecordType && (
            <FlatDataRecordTypeTree
              recordType={srcElement}
              selectedType={mappingEditorState.selectedTypeLabel}
            />
          )}
          {(srcElement instanceof Table || srcElement instanceof View) && (
            <TableOrViewSourceTree
              relation={srcElement}
              selectedType={mappingEditorState.selectedTypeLabel}
            />
          )}
          {!srcElement && (
            <div
              className="source-panel__content__source-adder"
              onClick={showSourceSelectorModal}
            >
              <div className="source-panel__content__source-adder__text">
                Choose a source...
              </div>
              <div className="source-panel__content__source-adder__action">
                <MdVerticalAlignBottom className="source-panel__content__source-adder__action__dnd-icon" />
                <MdAdd className="source-panel__content__source-adder__action__add-icon" />
              </div>
            </div>
          )}
          {isUnsupported && (
            <UnsupportedEditorPanel
              isReadOnly={isReadOnly}
              text={`Can't display class mapping source in form mode`}
            ></UnsupportedEditorPanel>
          )}
          <InstanceSetImplementationSourceSelectorModal
            mappingEditorState={mappingEditorState}
            setImplementation={setImplementation}
            open={openSourceSelectorModal}
            closeModal={hideSourceSelectorModal}
          />
          {flatDataSourceModal && (
            <FlatDataSourceSelectorModal
              mappingEditorState={mappingEditorState}
              setImplementation={setImplementation}
              flatData={flatDataSourceModal}
              open={true}
              closeModal={hideFlatDataActionModal}
            />
          )}
        </div>
      </div>
    );
  },
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
    const mappingEditorState = editorStore.getCurrentEditorState(
      MappingEditorState,
    );
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
    useEffect(() => {
      if (!isReadOnly) {
        instanceSetImplementationState.decorate();
      }
      instanceSetImplementationState
        .convertPropertyMappingTransformObjects()
        .catch(applicationStore.alertIllegalUnhandledError);
      return isReadOnly
        ? noop()
        : (): void =>
            setImplementation.accept_SetImplementationVisitor(
              new MapppingElementDecorationCleanUpVisitor(),
            );
    }, [
      applicationStore,
      setImplementation,
      isReadOnly,
      instanceSetImplementationState,
    ]);

    return (
      <div className="mapping-element-editor__content">
        <SplitPane
          primary="second"
          defaultSize={300}
          minSize={300}
          maxSize={-600}
        >
          <div className="panel class-mapping-editor__property-panel">
            <div className="panel__header">
              <div className="panel__header__title">
                <div className="panel__header__title__content">PROPERTIES</div>
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
                          pm.propertyMapping.property.value.name === p.name,
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
          <InstanceSetImplementationSourceExplorer
            setImplementation={setImplementation}
            isReadOnly={isReadOnly}
          />
        </SplitPane>
      </div>
    );
  },
);
