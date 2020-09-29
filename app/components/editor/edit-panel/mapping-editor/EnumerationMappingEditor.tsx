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

import React, { useRef, useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { createFilter } from 'react-select';
import { FaTimes, FaPlus } from 'react-icons/fa';
import SplitPane from 'react-split-pane';
import { CustomSelectorInput, SelectComponent } from 'Components/shared/CustomSelectorInput';
import { MappingEditorState } from 'Stores/editor-state/element-editor-state/mapping/MappingEditorState';
import { TypeTree } from 'Components/shared/TypeTree';
import { useDrop } from 'react-dnd';
import { DND_TYPE, TransformDropTarget, TypeDragSource, ElementDragSource, MappingElementSourceDropTarget } from 'Utilities/DnDUtil';
import { PRIMITIVE_TYPE } from 'MetaModelConst';
import { EnumerationIcon } from 'Components/shared/Icon';
import clsx from 'clsx';
import { TEST_ID } from 'Const';
import { useEditorStore } from 'Stores/EditorStore';
import { MdVerticalAlignBottom, MdModeEdit } from 'react-icons/md';
import Dialog from '@material-ui/core/Dialog';
import { noop } from 'Utilities/GeneralUtil';
import { MappingElementDecorateVisitor, MapppingElementDecorationCleanUpVisitor } from 'Stores/editor-state/element-editor-state/mapping/MapingElementDecorateVisitor';
import { Type } from 'MM/model/packageableElements/domain/Type';
import { PackageableElementSelectOption, PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { SourceValue } from 'MM/model/packageableElements/mapping/EnumValueMapping';
import { EnumerationMapping } from 'MM/model/packageableElements/mapping/EnumerationMapping';
import { Enum } from 'MM/model/packageableElements/domain/Enum';
import { Enumeration } from 'MM/model/packageableElements/domain/Enumeration';
import { OptionalPackageableElementReference } from 'MM/model/packageableElements/PackageableElementReference';

const EnumerationMappingSourceSelectorModal = observer((props: {
  enumerationMapping: EnumerationMapping;
  open: boolean;
  closeModal: () => void;
}) => {
  const { enumerationMapping, closeModal, open } = props;
  const editorStore = useEditorStore();
  const options = editorStore.graphState.graph.enumertionMappingSourceTypeOptions;
  const sourceSelectorRef = useRef<SelectComponent>(null);
  const filterOption = createFilter({ ignoreCase: true, ignoreAccents: false, stringify: (option: PackageableElementSelectOption<PackageableElement>): string => option.value.path });
  const sourceType = enumerationMapping.sourceType.value;
  const selectedSourceType = sourceType ? { value: sourceType, label: sourceType.name } : null;
  const changeSourceType = (val: PackageableElementSelectOption<PackageableElement> | null): void => {
    const value = val?.value;
    if (!value || value instanceof Type) {
      enumerationMapping.updateSourceType(value);
    }
    if (value) { closeModal() }
  };
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
          placeholder={'Choose a data type or enumeration'}
          isClearable={true}
          filterOption={filterOption}
        />
      </div>
    </Dialog>
  );
});

export const SourceValueInput = observer((props: {
  sourceValue: SourceValue;
  expectedType?: Type;
  updateSourceValue: (val: Enum | string | undefined) => void;
  deleteSourceValue: () => void;
  isReadOnly: boolean;
}) => {
  const { sourceValue, updateSourceValue, deleteSourceValue, expectedType, isReadOnly } = props;
  const inputType = expectedType?.name === PRIMITIVE_TYPE.INTEGER ? 'number' : 'text';
  const value = sourceValue.value instanceof Enum ? sourceValue.value.name : sourceValue.value ?? '';
  const onChange: React.ChangeEventHandler<HTMLInputElement> = event => updateSourceValue(event.target.value);
  const onBlur: React.ChangeEventHandler<HTMLInputElement> = event => {
    const val = event.target.value;
    // Small validation if sourceType is enumeration
    // reset if not an enum value set to enum if source value not an enum
    if (expectedType instanceof Enumeration && !expectedType.getValueNames().includes(val)) {
      updateSourceValue(undefined);
    } else if (expectedType instanceof Enumeration && !(sourceValue instanceof Enum) && expectedType.getValueNames().includes(val)) {
      const enumValue = expectedType.values.find(e => e.name === val);
      updateSourceValue(enumValue);
    }
  };
  // Drag and Drop
  const handleDrop = (item: TransformDropTarget): void => {
    if (!isReadOnly) {
      if (item instanceof TypeDragSource) {
        updateSourceValue(value + item.data.label);
      }
    }
  };
  const [{ canDrop }, dropRef] = useDrop({
    accept: DND_TYPE.TYPE_TREE_ENUM,
    drop: (item: TransformDropTarget): void => handleDrop(item),
    collect: monitor => ({ canDrop: monitor.canDrop() }),
  });
  return (
    <div ref={dropRef} className={clsx('enumeration-mapping-editor__enum-value__source-value', { 'enumeration-mapping-editor__enum-value__source-value--dnd-match': canDrop && !isReadOnly })}>
      <input
        className="enumeration-mapping-editor__enum-value__source-value__input"
        disabled={isReadOnly}
        spellCheck={false}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={`Source value`}
        type={inputType}
      />
      <div className="enumeration-mapping-editor__enum-value__source-value__info">
        <div className="enumeration-mapping-editor__enum-value__source-value__expected-return-type">{expectedType?.name ?? 'unknown'}</div>
      </div>
      {!isReadOnly &&
        <button
          className="btn--icon enumeration-mapping-editor__enum-value__source-value__remove-btn"
          disabled={isReadOnly}
          onClick={deleteSourceValue}
          tabIndex={-1}
          title={'Remove'}
        ><FaTimes /></button>
      }
    </div>
  );
});

const EnumValueMappingEditor = observer((props: {
  enumValue: Enum;
  enumerationMapping: EnumerationMapping;
  sourceType: OptionalPackageableElementReference<Type>;
  isReadOnly: boolean;
}) => {
  const { enumValue, enumerationMapping, sourceType, isReadOnly } = props;
  const matchingEnumValueMapping = enumerationMapping.enumValueMappings.find(evm => evm.enum.value === enumValue);
  const addSourceValue = (): void => matchingEnumValueMapping ? matchingEnumValueMapping.addSourceValue() : undefined;

  return (
    <div className="enumeration-mapping-editor__enum-value">
      <div className="enumeration-mapping-editor__enum-value__metadata">
        <div className="enumeration-mapping-editor__enum-value__name">{enumValue.name}</div>
        {matchingEnumValueMapping &&
          <button
            className="enumeration-mapping-editor__enum-value__add-btn"
            disabled={isReadOnly}
            onClick={addSourceValue}
            tabIndex={-1}
            title={'Add enum value'}
          ><FaPlus /></button>
        }
      </div>
      {matchingEnumValueMapping &&
        <div>
          {matchingEnumValueMapping.sourceValues.map((sourceValue, idx) => (
            <SourceValueInput
              key={sourceValue.uuid}
              isReadOnly={isReadOnly}
              sourceValue={sourceValue}
              expectedType={sourceType.value}
              updateSourceValue={(val: Enum | string | undefined): void => matchingEnumValueMapping.updateSourceValue(idx, val, sourceType.value)}
              deleteSourceValue={(): void => matchingEnumValueMapping.deleteSourceValue(idx)}
            />
          ))}
          {!matchingEnumValueMapping.sourceValues.length &&
            <div className="enumeration-mapping-editor__enum-value__source-value--empty">
              No source value. Click <div className="enumeration-mapping-editor__enum-value__source-value--empty__add-btn" onClick={addSourceValue}><FaPlus /></div> to add one.
            </div>
          }
        </div>
      }
    </div>
  );
});

export const EnumerationMappingEditor = observer((props: {
  enumerationMapping: EnumerationMapping;
  isReadOnly: boolean;
}) => {
  const { enumerationMapping, isReadOnly } = props;
  const editorStore = useEditorStore();
  const mappingEditorState = editorStore.getCurrentEditorState(MappingEditorState);
  const enumeration = enumerationMapping.enumeration;
  // ID
  const showId = Object.keys(mappingEditorState.mappingElementsWithSimilarTarget).length > 1;
  // Source
  const sourceType = enumerationMapping.sourceType.value;
  const [openSourceSelectorModal, setOpenSourceSelectorModal] = useState(false);
  const showSourceSelectorModal = (): void => isReadOnly ? undefined : setOpenSourceSelectorModal(true);
  const hideSourceSelectorModal = (): void => setOpenSourceSelectorModal(false);
  const handleDrop = (item: MappingElementSourceDropTarget): void => {
    if (!isReadOnly && item.data.packageableElement instanceof Type) {
      enumerationMapping.updateSourceType(item.data.packageableElement);
    }
  };
  const [{ isDragOver }, dropRef] = useDrop({
    accept: DND_TYPE.PROJECT_EXPLORER_ENUMERATION,
    drop: (item: ElementDragSource): void => handleDrop(item),
    collect: monitor => ({ isDragOver: monitor.isOver({ shallow: true }) }),
  });
  useEffect(() => {
    if (!isReadOnly) { (new MappingElementDecorateVisitor()).visitEnumerationMapping(enumerationMapping) }
    return isReadOnly ? noop() : (): void => (new MapppingElementDecorationCleanUpVisitor()).visitEnumerationMapping(enumerationMapping);
  }, [enumerationMapping, isReadOnly]);
  return (
    <div className="editor__main">
      <div className="mapping-element-editor enumeration-mapping-editor">
        <div className="mapping-element-editor__metadata">
          {/* Target */}
          <div className="mapping-element-editor__metadata__chunk mapping-element-editor__metadata__overview-chunk background--enumeration">
            <div className="mapping-element-editor__metadata__sub-chunk">enumeration mapping</div>
            {showId && <div className="mapping-element-editor__metadata__sub-chunk mapping-element-editor__metadata__overview__id">{enumerationMapping.id.isDefault ? 'default ID' : enumerationMapping.id}</div>}
            <div className="mapping-element-editor__metadata__sub-chunk">for</div>
            <div className="mapping-element-editor__metadata__sub-chunk mapping-element-editor__metadata__target">
              <div className="mapping-element-editor__metadata__target__type icon"><EnumerationIcon /></div>
              <div className="mapping-element-editor__metadata__target__label">{enumeration.value.name}</div>
            </div>
          </div>
          {/* Driver */}
          {sourceType &&
            <div className={clsx('mapping-element-editor__metadata__chunk', 'mapping-element-editor__metadata__driver-chunk', 'background--primitive', {
              'mapping-element-editor__metadata__source--none': !sourceType
            })}>
              <div className="mapping-element-editor__metadata__sub-chunk">using</div>
              <div className="mapping-element-editor__metadata__sub-chunk mapping-element-editor__metadata__driver__type">{sourceType.name}</div>
            </div>
          }
          {!sourceType &&
            <div className={clsx('mapping-element-editor__metadata__chunk', 'mapping-element-editor__metadata__source-chunk', 'mapping-element-editor__metadata__source-chunk--none')}>
              <div className="mapping-element-editor__metadata__sub-chunk">with no source</div>
            </div>
          }
        </div>
        <div className="mapping-element-editor__content">
          <SplitPane primary="second" defaultSize={300} minSize={300} maxSize={-300}>
            <div className="panel">
              <div className="panel__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__content">ENUMS</div>
                </div>
              </div>
              <div className="panel__content enumeration-mapping-editor__enum-values">
                {enumeration.value.values.map(enumValue =>
                  <EnumValueMappingEditor key={enumValue.name} enumValue={enumValue} enumerationMapping={enumerationMapping} sourceType={enumerationMapping.sourceType} isReadOnly={isReadOnly} />
                )}
              </div>
            </div>
            <div data-testid={TEST_ID.SOURCE_PANEL} className="panel source-panel">
              <div className="panel__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__label">source</div>
                  <div className="panel__header__title__content">{sourceType?.name ?? '(none)'}</div>
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action"
                    onClick={showSourceSelectorModal}
                    disabled={isReadOnly}
                    tabIndex={-1}
                    title={'Choose source type'}
                  ><MdModeEdit /></button>
                </div>
              </div>
              <div ref={dropRef} className={clsx('panel__content', { 'panel__content--dnd-over': isDragOver && !isReadOnly })}>
                {sourceType && sourceType instanceof Enumeration && <TypeTree type={sourceType} selectedType={mappingEditorState.selectedTypeLabel} />}
                {!sourceType &&
                  <div className="source-panel__content__source-adder" onClick={showSourceSelectorModal}>
                    <div className="source-panel__content__source-adder__text">
                      Choose a source
                    </div>
                    <div className="source-panel__content__source-adder__action">
                      <MdVerticalAlignBottom />
                    </div>
                  </div>
                }
                <EnumerationMappingSourceSelectorModal enumerationMapping={enumerationMapping} open={openSourceSelectorModal} closeModal={hideSourceSelectorModal} />
              </div>
            </div>
          </SplitPane>
        </div>
      </div>
    </div>
  );
});
