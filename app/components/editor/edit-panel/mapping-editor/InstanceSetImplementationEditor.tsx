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

import React, { useState, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { FaAsterisk, FaLongArrowAltDown, FaEdit } from 'react-icons/fa';
import SplitPane from 'react-split-pane';
import { CustomSelectorInput, SelectComponent } from 'Components/shared/CustomSelectorInput';
import { DND_TYPE, ElementDragSource, MappingElementSourceDropTarget } from 'Utilities/DnDUtil';
import clsx from 'clsx';
import { TEST_ID } from 'Const';
import { createFilter } from 'react-select';
import { getSetImplementationType } from 'Utilities/GraphUtil';
import { MdVerticalAlignBottom, MdAdd } from 'react-icons/md';
import { InstanceSetImplementationState, MappingElementState } from 'Stores/editor-state/element-editor-state/mapping/MappingElementState';
import { PureInstanceSetImplementationState } from 'Stores/editor-state/element-editor-state/mapping/PureInstanceSetImplementationState';
import { guaranteeType, guaranteeNonNullable, noop } from 'Utilities/GeneralUtil';
import { MappingEditorState } from 'Stores/editor-state/element-editor-state/mapping/MappingEditorState';
import { useEditorStore } from 'Stores/EditorStore';
import { TypeTree } from 'Components/shared/TypeTree';
import { PropertyMappingsEditor } from './PropertyMappingsEditor';
import Dialog from '@material-ui/core/Dialog';
import { useDrop } from 'react-dnd';
import { ActionAlertActionType, useApplicationStore } from 'Stores/ApplicationStore';
import { MapppingElementDecorationCleanUpVisitor } from 'Stores/editor-state/element-editor-state/mapping/MapingElementDecorateVisitor';
import { UnsupportedInstanceSetImplementationState } from 'Stores/editor-state/element-editor-state/mapping/UnsupportedInstanceSetImplementationState';
import { UnsupportedEditorPanel } from 'Components/editor/edit-panel/UnsupportedElementEditor.tsx';
import { SET_IMPLEMENTATION_TYPE } from 'MM/model/packageableElements/mapping/SetImplementation';
import { InstanceSetImplementation } from 'MM/model/packageableElements/mapping/InstanceSetImplementation';
import { Property } from 'MM/model/packageableElements/domain/Property';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { PureInstanceSetImplementation } from 'MM/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import { Type } from 'MM/model/packageableElements/domain/Type';
import { MappingElementSourceSelectOption, getMappingElementSource, MappingElementSource, getMappingElementSourceFilterText } from 'MM/model/packageableElements/mapping/Mapping';
import { PackageableElement } from 'MM/model/packageableElements/PackageableElement';

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
const getSourceElementLabel = (srcElement: MappingElementSource | undefined): string => {
  let sourceLabel = '(none)';
  if (srcElement instanceof Class) {
    sourceLabel = srcElement.name;
  }
  return sourceLabel;
};

export const InstanceSetImplementationSourceExplorer = observer((props: {
  setImplementation: InstanceSetImplementation;
  isReadOnly: boolean;
}) => {
  const { setImplementation, isReadOnly } = props;
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const mappingEditorState = editorStore.getCurrentEditorState(MappingEditorState);
  const instanceSetImplementationState = mappingEditorState.currentTabState instanceof MappingElementState ? mappingEditorState.currentTabState : undefined;
  const srcElement = getMappingElementSource(setImplementation);
  const sourceLabel = getSourceElementLabel(srcElement);
  // Source Selector Modal
  const [openSourceSelectorModal, setOpenSourceSelectorModal] = useState(false);
  const CHANGING_SOURCE_ON_EMBEDDED = 'Changing source on mapping with embedded children will delete all its children';
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
            }
          ]
        });
      }
    }
  };
  const hideSourceSelectorModal = (): void => setOpenSourceSelectorModal(false);
  // Drag and Drop
  /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
  const dndType = [DND_TYPE.PROJECT_EXPLORER_CLASS];
  const changeClassMappingSourceDriver = (droppedPackagableElement: PackageableElement): void => {
    if (droppedPackagableElement instanceof Class) {
      mappingEditorState.changeClassMappingSourceDriver(setImplementation, droppedPackagableElement).catch(applicationStore.alertIllegalUnhandledError);
    }
  };
  const handleDrop = (item: MappingElementSourceDropTarget): void => {
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
              handler: (): void => changeClassMappingSourceDriver(droppedPackagableElement),
              type: ActionAlertActionType.PROCEED,
            },
            {
              label: 'Cancel',
            }
          ]
        });
      }
    }
  };
  const [{ isDragOver }, dropRef] = useDrop({
    accept: dndType,
    drop: (item: ElementDragSource): void => handleDrop(item),
    collect: monitor => ({ isDragOver: monitor.isOver({ shallow: true }) }),
  });
  const isUnsupported = instanceSetImplementationState instanceof UnsupportedInstanceSetImplementationState;
  if (!(instanceSetImplementationState instanceof InstanceSetImplementationState)) {
    return null;
  }
  return (
    <div data-testid={TEST_ID.SOURCE_PANEL} className={clsx('panel source-panel',
      {
        /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
        'backdrop__element':
          (instanceSetImplementationState instanceof PureInstanceSetImplementationState ? instanceSetImplementationState.hasParserError : false)
      }
    )}>
      <div className="panel__header">
        <div className="panel__header__title">
          <div className="panel__header__title__label">source</div>
          <div className="panel__header__title__content">{sourceLabel}</div>
        </div>
        <div className="panel__header__actions">
          <button
            className="panel__header__action"
            onClick={showSourceSelectorModal}
            disabled={isReadOnly || setImplementation.isEmbedded || isUnsupported}
            tabIndex={-1}
            title={'Choose source'}
          ><FaEdit />
          </button>
        </div>
      </div>
      <div ref={dropRef} className={clsx('panel__content', { 'panel__content--dnd-over': isDragOver && !isReadOnly })}>
        {srcElement instanceof Type && <TypeTree type={srcElement} selectedType={mappingEditorState.selectedTypeLabel} />}
        {!srcElement &&
          <div className="source-panel__content__source-adder" onClick={showSourceSelectorModal}>
            <div className="source-panel__content__source-adder__text">Choose a source</div>
            <div className="source-panel__content__source-adder__action">
              <MdVerticalAlignBottom className="source-panel__content__source-adder__action__dnd-icon" />
              <MdAdd className="source-panel__content__source-adder__action__add-icon" />
            </div>
          </div>
        }
        {isUnsupported && <UnsupportedEditorPanel isReadOnly={isReadOnly} text={`Can't display class mapping source in form mode`} ></UnsupportedEditorPanel>}
        <InstanceSetImplementationSourceSelectorModal mappingEditorState={mappingEditorState} setImplementation={setImplementation} open={openSourceSelectorModal} closeModal={hideSourceSelectorModal} />
      </div>
    </div>
  );
});

const InstanceSetImplementationSourceSelectorModal = observer((props: {
  mappingEditorState: MappingEditorState;
  setImplementation: InstanceSetImplementation;
  open: boolean;
  closeModal: () => void;
}) => {
  const { mappingEditorState, setImplementation, closeModal, open } = props;
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const options = editorStore.graphState.graph.mappingSourceElementOptions;
  const filterOption = createFilter({ ignoreCase: true, ignoreAccents: false, stringify: getMappingElementSourceFilterText });
  const sourceSelectorRef = useRef<SelectComponent>(null);
  const instanceSetImplementationType = getSetImplementationType(setImplementation);
  let sourceTypeLabel;
  switch (instanceSetImplementationType) {
    /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
    case SET_IMPLEMENTATION_TYPE.PUREINSTANCE: sourceTypeLabel = 'class'; break;
    default: sourceTypeLabel = 'source element'; break;
  }
  let selectedSourceType;
  /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
  switch (instanceSetImplementationType) {
    case SET_IMPLEMENTATION_TYPE.PUREINSTANCE: {
      const pureInstance = guaranteeType(setImplementation, PureInstanceSetImplementation);
      selectedSourceType = pureInstance.srcClass.value ? { value: pureInstance.srcClass.value, label: pureInstance.srcClass.value.name } : null;
      break;
    }
    default: selectedSourceType = null; break;
  }
  const changeSourceType = (val: MappingElementSourceSelectOption | null): Promise<void> => mappingEditorState.changeClassMappingSourceDriver(setImplementation, val?.value).then(() => closeModal()).catch(applicationStore.alertIllegalUnhandledError);
  const handleEnter = (): void => sourceSelectorRef.current?.focus();

  return (
    <Dialog
      open={open}
      onClose={closeModal}
      onEnter={handleEnter}
      classes={{
        container: 'search-modal__container'
      }}
      PaperProps={{
        classes: {
          root: 'search-modal__inner-container'
        }
      }}
    >
      <div className="modal search-modal">
        <div className="modal__title">Choose a source</div>
        <CustomSelectorInput
          ref={sourceSelectorRef}
          options={options}
          onChange={changeSourceType}
          value={selectedSourceType}
          placeholder={`Choose a ${sourceTypeLabel}`}
          isClearable={true}
          filterOption={filterOption}
        />
      </div>
    </Dialog>
  );
});

// Sort by property type/complexity (asc)
const typeSorter = (a: Property, b: Property): number => (a.genericType.value.rawType instanceof Class ? 1 : 0) - (b.genericType.value.rawType instanceof Class ? 1 : 0);
// Sort by requiredness/multiplicity (desc)
const requiredStatusSorter = (a: Property, b: Property): number => (a.multiplicity.lowerBound > 0 ? 0 : 1) - (b.multiplicity.lowerBound > 0 ? 0 : 1);

export const InstanceSetImplementationEditor = observer((props: {
  setImplementation: InstanceSetImplementation;
  isReadOnly: boolean;
}) => {
  const { setImplementation, isReadOnly } = props;
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const mappingEditorState = editorStore.getCurrentEditorState(MappingEditorState);
  const [sortByRequired, setSortByRequired] = useState(true);
  const instanceSetImplementationState = guaranteeNonNullable(mappingEditorState.currentTabState instanceof InstanceSetImplementationState
    ? mappingEditorState.currentTabState : undefined, 'Mapping element state for instance set implementation must be instance set implementation state');
  const handleSortChange = (): void => setSortByRequired(!sortByRequired);
  // Get properties of supertypes
  const sortedProperties = setImplementation.class.value.getAllProperties()
    // LEVEL 1: sort properties by name
    .sort((a, b) => a.name.localeCompare(b.name))
    // LEVEL 2: sort by properties by required/type (which ever is not chosen to be the primary sort)
    .sort(sortByRequired ? typeSorter : requiredStatusSorter)
    // LEVEL 3: sort by properties by required/type (primary sort)
    .sort(sortByRequired ? requiredStatusSorter : typeSorter);

  const isUnsupported = instanceSetImplementationState instanceof UnsupportedInstanceSetImplementationState;
  useEffect(() => {
    if (!isReadOnly) { instanceSetImplementationState.decorate() }
    instanceSetImplementationState.convertPropertyMappingTransformObjects().catch(applicationStore.alertIllegalUnhandledError);
    return isReadOnly ? noop() : (): void => setImplementation.accept_SetImplementationVisitor(new MapppingElementDecorationCleanUpVisitor());
  }, [applicationStore, setImplementation, isReadOnly, instanceSetImplementationState]);

  return (
    <div className="mapping-element-editor__content">
      <SplitPane primary="second" defaultSize={300} minSize={300} maxSize={-600}>
        <div className="panel class-mapping-editor__property-panel">
          <div className="panel__header">
            <div className="panel__header__title">
              <div className="panel__header__title__content">PROPERTIES</div>
            </div>
            <div className="panel__header__actions">
              <div className="panel__header__action">
                <div className={`class-mapping-editor__sort-by-required-btn ${sortByRequired ? 'class-mapping-editor__sort-by-required-btn--enabled' : ''}`} onClick={handleSortChange}>
                  <FaLongArrowAltDown />
                  <FaAsterisk />
                </div>
              </div>
            </div>
          </div>
          <div className="panel__content">
            {!isReadOnly && !isUnsupported && sortedProperties
              .map(property =>
                <PropertyMappingsEditor
                  key={property.name}
                  property={property}
                  instanceSetImplementationState={instanceSetImplementationState}
                  isReadOnly={isReadOnly}
                />)
            }
            {isReadOnly && !isUnsupported && sortedProperties
              // for property without any property mapping in readonly mode, we won't show it
              .filter(p => instanceSetImplementationState.propertyMappingStates.filter(pm => pm.propertyMapping.property.value.name === p.name).length)
              .map(property =>
                <PropertyMappingsEditor
                  key={property.name}
                  property={property}
                  instanceSetImplementationState={instanceSetImplementationState}
                  isReadOnly={isReadOnly}
                />
              )
            }
            {isUnsupported && <UnsupportedEditorPanel isReadOnly={isReadOnly} text={`Can't display class mapping in form mode`} ></UnsupportedEditorPanel>}
          </div>
        </div>
        <InstanceSetImplementationSourceExplorer setImplementation={setImplementation} isReadOnly={isReadOnly} />
      </SplitPane>
    </div>
  );
});
