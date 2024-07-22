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

import { useRef, useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Dialog,
  type SelectComponent,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  clsx,
  CustomSelectorInput,
  BlankPanelPlaceholder,
  createFilter,
  PURE_EnumerationIcon,
  PencilIcon,
  TimesIcon,
  PlusIcon,
  PanelDropZone,
  Panel,
  PanelContent,
  ModalTitle,
  Modal,
  PanelHeaderActionItem,
  PanelHeaderActions,
  PanelHeader,
} from '@finos/legend-art';
import { MappingEditorState } from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingEditorState.js';
import { TypeTree } from './TypeTree.js';
import { useDrop } from 'react-dnd';
import {
  type TransformDropTarget,
  type ElementDragSource,
  type MappingElementSourceDropTarget,
  CORE_DND_TYPE,
  TypeDragSource,
} from '../../../../stores/editor/utils/DnDUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import { noop } from '@finos/legend-shared';
import {
  MappingElementDecorator,
  MappingElementDecorationCleaner,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingElementDecorator.js';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  Type,
  Enum,
  Enumeration,
  type PackageableElement,
  type SourceValue,
  type EnumerationMapping,
  type PackageableElementReference,
  getEnumValueNames,
  PackageableElementExplicitReference,
  PrimitiveType,
} from '@finos/legend-graph';
import {
  enumerationMapping_updateSourceType,
  enumValueMapping_addSourceValue,
  enumValueMapping_deleteSourceValue,
  enumValueMapping_updateSourceValue,
} from '../../../../stores/graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import {
  buildElementOption,
  getPackageableElementOptionFormatter,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';

const EnumerationMappingSourceSelectorModal = observer(
  (props: {
    enumerationMapping: EnumerationMapping;
    open: boolean;
    closeModal: () => void;
  }) => {
    const { enumerationMapping, closeModal, open } = props;
    const editorStore = useEditorStore();
    const applicationStore = editorStore.applicationStore;
    const options = [PrimitiveType.INTEGER, PrimitiveType.STRING]
      .map(buildElementOption)
      .concat(
        editorStore.graphManagerState.usableEnumerations.map(
          buildElementOption,
        ),
      );

    const sourceSelectorRef = useRef<SelectComponent>(null);
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (
        option: PackageableElementOption<PackageableElement>,
      ): string => option.value.path,
    });
    const sourceType = enumerationMapping.sourceType?.value;
    const selectedSourceType = sourceType
      ? { value: sourceType, label: sourceType.name }
      : null;
    const changeSourceType = (
      val: PackageableElementOption<PackageableElement> | null,
    ): void => {
      const value = val?.value;
      if (!value || value instanceof Type) {
        enumerationMapping_updateSourceType(
          enumerationMapping,
          value ? PackageableElementExplicitReference.create(value) : undefined,
        );
      }
      if (value) {
        closeModal();
      }
    };
    const handleEnter = (): void => sourceSelectorRef.current?.focus();

    return (
      <Dialog
        open={open}
        onClose={closeModal}
        TransitionProps={{
          onEnter: handleEnter,
        }}
        classes={{
          container: 'search-modal__container',
        }}
        PaperProps={{
          classes: {
            root: 'search-modal__inner-container',
          },
        }}
      >
        <Modal
          className="search-modal"
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        >
          <ModalTitle title="Choose a Source" />
          <CustomSelectorInput
            ref={sourceSelectorRef}
            options={options}
            onChange={changeSourceType}
            value={selectedSourceType}
            placeholder="Choose a type..."
            isClearable={true}
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
            filterOption={filterOption}
            formatOptionLabel={getPackageableElementOptionFormatter({})}
          />
        </Modal>
      </Dialog>
    );
  },
);

export const SourceValueInput = observer(
  (props: {
    sourceValue: SourceValue;
    expectedType?: Type | undefined;
    updateSourceValue: (val: Enum | string | undefined) => void;
    deleteSourceValue: () => void;
    isReadOnly: boolean;
  }) => {
    const {
      sourceValue,
      updateSourceValue,
      deleteSourceValue,
      expectedType,
      isReadOnly,
    } = props;
    const value =
      sourceValue.value instanceof Enum
        ? sourceValue.value.name
        : (sourceValue.value ?? '');
    const onChange: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      updateSourceValue(event.target.value);
    const onBlur: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      const val = event.target.value;
      // Small validation if sourceType is enumeration
      // reset if not an enum value set to enum if source value not an enum
      if (
        expectedType instanceof Enumeration &&
        !getEnumValueNames(expectedType).includes(val)
      ) {
        updateSourceValue(undefined);
      } else if (
        expectedType instanceof Enumeration &&
        !(sourceValue instanceof Enum) &&
        getEnumValueNames(expectedType).includes(val)
      ) {
        const enumValue = expectedType.values.find((e) => e.name === val);
        updateSourceValue(enumValue);
      }
    };
    // Drag and Drop
    const handleDrop = useCallback(
      (item: TransformDropTarget): void => {
        if (!isReadOnly) {
          if (item instanceof TypeDragSource && item.data) {
            updateSourceValue(value + item.data.label);
          }
        }
      },
      [isReadOnly, updateSourceValue, value],
    );
    const [{ canDrop }, dropRef] = useDrop<
      TypeDragSource,
      void,
      { canDrop: boolean }
    >(
      () => ({
        accept: CORE_DND_TYPE.TYPE_TREE_ENUM,
        drop: (item) => handleDrop(item),
        collect: (monitor) => ({
          canDrop: monitor.canDrop(),
        }),
      }),
      [handleDrop],
    );

    return (
      <div
        ref={dropRef}
        className={clsx(
          'enumeration-mapping-editor__enum-value__source-value',
          {
            'enumeration-mapping-editor__enum-value__source-value--dnd-match':
              canDrop && !isReadOnly,
          },
        )}
      >
        <input
          className="enumeration-mapping-editor__enum-value__source-value__input"
          disabled={isReadOnly}
          spellCheck={false}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="Source value"
          type={expectedType === PrimitiveType.INTEGER ? 'number' : 'text'}
        />
        <div className="enumeration-mapping-editor__enum-value__source-value__info">
          <div className="enumeration-mapping-editor__enum-value__source-value__expected-return-type">
            {expectedType?.name ?? 'unknown'}
          </div>
        </div>
        {!isReadOnly && (
          <button
            className="btn--icon enumeration-mapping-editor__enum-value__source-value__remove-btn"
            disabled={isReadOnly}
            onClick={deleteSourceValue}
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

const EnumValueMappingEditor = observer(
  (props: {
    enumValue: Enum;
    enumerationMapping: EnumerationMapping;
    sourceType: PackageableElementReference<Type> | undefined;
    isReadOnly: boolean;
  }) => {
    const { enumValue, enumerationMapping, sourceType, isReadOnly } = props;
    const matchingEnumValueMapping = enumerationMapping.enumValueMappings.find(
      (evm) => evm.enum.value === enumValue,
    );
    const addSourceValue = (): void =>
      matchingEnumValueMapping
        ? enumValueMapping_addSourceValue(matchingEnumValueMapping, undefined)
        : undefined;

    return (
      <div className="enumeration-mapping-editor__enum-value">
        <div className="enumeration-mapping-editor__enum-value__metadata">
          <div className="enumeration-mapping-editor__enum-value__name">
            {enumValue.name}
          </div>
          {matchingEnumValueMapping && (
            <button
              className="enumeration-mapping-editor__enum-value__add-btn"
              disabled={isReadOnly}
              onClick={addSourceValue}
              tabIndex={-1}
              title="Add enum value"
            >
              <PlusIcon />
            </button>
          )}
        </div>
        {matchingEnumValueMapping && (
          <div>
            {matchingEnumValueMapping.sourceValues.map((sourceValue, idx) => (
              <SourceValueInput
                key={sourceValue._UUID}
                isReadOnly={isReadOnly}
                sourceValue={sourceValue}
                expectedType={sourceType?.value}
                updateSourceValue={(val: Enum | string | undefined): void =>
                  enumValueMapping_updateSourceValue(
                    matchingEnumValueMapping,
                    idx,
                    val,
                    sourceType?.value,
                  )
                }
                deleteSourceValue={(): void =>
                  enumValueMapping_deleteSourceValue(
                    matchingEnumValueMapping,
                    idx,
                  )
                }
              />
            ))}
            {!matchingEnumValueMapping.sourceValues.length && (
              <div className="enumeration-mapping-editor__enum-value__source-value--empty">
                No source value. Click{' '}
                <div
                  className="enumeration-mapping-editor__enum-value__source-value--empty__add-btn"
                  onClick={addSourceValue}
                >
                  <PlusIcon />
                </div>{' '}
                to add one.
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

export const EnumerationMappingEditor = observer(
  (props: { enumerationMapping: EnumerationMapping; isReadOnly: boolean }) => {
    const { enumerationMapping, isReadOnly } = props;
    const editorStore = useEditorStore();
    const mappingEditorState =
      editorStore.tabManagerState.getCurrentEditorState(MappingEditorState);
    const enumeration = enumerationMapping.enumeration;
    // ID
    const showId =
      Object.keys(mappingEditorState.mappingElementsWithSimilarTarget).length >
      1;
    // Source
    const sourceType = enumerationMapping.sourceType?.value;
    const [openSourceSelectorModal, setOpenSourceSelectorModal] =
      useState(false);
    const showSourceSelectorModal = (): void =>
      isReadOnly ? undefined : setOpenSourceSelectorModal(true);
    const hideSourceSelectorModal = (): void =>
      setOpenSourceSelectorModal(false);
    const handleDrop = useCallback(
      (item: MappingElementSourceDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Type) {
          enumerationMapping_updateSourceType(
            enumerationMapping,
            PackageableElementExplicitReference.create(
              item.data.packageableElement,
            ),
          );
        }
      },
      [enumerationMapping, isReadOnly],
    );
    const [{ isDragOver, canDrop }, dropRef] = useDrop<
      ElementDragSource,
      void,
      { isDragOver: boolean; canDrop: boolean }
    >(
      () => ({
        accept: CORE_DND_TYPE.PROJECT_EXPLORER_ENUMERATION,
        drop: (item) => handleDrop(item),
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }),
          canDrop: monitor.canDrop(),
        }),
      }),
      [handleDrop],
    );
    useEffect(() => {
      if (!isReadOnly) {
        new MappingElementDecorator(editorStore).visitEnumerationMapping(
          enumerationMapping,
        );
      }
      return isReadOnly
        ? noop()
        : (): void =>
            new MappingElementDecorationCleaner(
              editorStore,
            ).visitEnumerationMapping(enumerationMapping);
    }, [enumerationMapping, isReadOnly, editorStore]);
    return (
      <div
        className="mapping-element-editor enumeration-mapping-editor"
        data-testid={LEGEND_STUDIO_TEST_ID.ENUMERATION_MAPPING_EDITOR}
      >
        <div className="mapping-element-editor__metadata">
          {/* Target */}
          <div className="mapping-element-editor__metadata__chunk mapping-element-editor__metadata__overview-chunk background--enumeration">
            <div className="mapping-element-editor__metadata__sub-chunk">
              enumeration mapping
            </div>
            {showId && (
              <div className="mapping-element-editor__metadata__sub-chunk mapping-element-editor__metadata__overview__id">
                {enumerationMapping.id.isDefault
                  ? 'default ID'
                  : enumerationMapping.id.value}
              </div>
            )}
            <div className="mapping-element-editor__metadata__sub-chunk">
              for
            </div>
            <div className="mapping-element-editor__metadata__sub-chunk mapping-element-editor__metadata__target">
              <div className="mapping-element-editor__metadata__target__type icon">
                <PURE_EnumerationIcon />
              </div>
              <div className="mapping-element-editor__metadata__target__label">
                {enumeration.value.name}
              </div>
            </div>
          </div>
          {/* Driver */}
          {sourceType && (
            <div
              className={clsx(
                'mapping-element-editor__metadata__chunk',
                'mapping-element-editor__metadata__driver-chunk',
                'background--primitive',
                'mapping-element-editor__metadata__source-chunk--primitive',
                {
                  'mapping-element-editor__metadata__source-chunk--none':
                    !sourceType,
                },
              )}
            >
              <div className="mapping-element-editor__metadata__sub-chunk">
                using
              </div>
              <div className="mapping-element-editor__metadata__sub-chunk mapping-element-editor__metadata__driver__type">
                {sourceType.name}
              </div>
            </div>
          )}
          {!sourceType && (
            <div
              className={clsx(
                'mapping-element-editor__metadata__chunk',
                'mapping-element-editor__metadata__source-chunk',
                'mapping-element-editor__metadata__source-chunk--none',
              )}
            >
              <div className="mapping-element-editor__metadata__sub-chunk">
                with no source
              </div>
            </div>
          )}
        </div>
        <div className="mapping-element-editor__content">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel minSize={300}>
              <Panel>
                <div className="panel__header">
                  <div className="panel__header__title">
                    <div className="panel__header__title__content">ENUMS</div>
                  </div>
                </div>
                <div className="panel__content enumeration-mapping-editor__enum-values">
                  {enumeration.value.values.map((enumValue) => (
                    <EnumValueMappingEditor
                      key={enumValue.name}
                      enumValue={enumValue}
                      enumerationMapping={enumerationMapping}
                      sourceType={enumerationMapping.sourceType}
                      isReadOnly={isReadOnly}
                    />
                  ))}
                </div>
              </Panel>
            </ResizablePanel>
            <ResizablePanelSplitter />
            <ResizablePanel size={300} minSize={300}>
              <div
                data-testid={LEGEND_STUDIO_TEST_ID.SOURCE_PANEL}
                className="panel source-panel"
              >
                <PanelHeader>
                  <div className="panel__header__title">
                    <div className="panel__header__title__label">source</div>
                    <div className="panel__header__title__content">
                      {sourceType?.name ?? '(none)'}
                    </div>
                  </div>
                  <PanelHeaderActions>
                    <PanelHeaderActionItem
                      onClick={showSourceSelectorModal}
                      disabled={isReadOnly}
                      title="Choose a source..."
                    >
                      <PencilIcon />
                    </PanelHeaderActionItem>
                  </PanelHeaderActions>
                </PanelHeader>
                <PanelContent>
                  <PanelDropZone
                    dropTargetConnector={dropRef}
                    isDragOver={
                      Boolean(sourceType) && isDragOver && !isReadOnly
                    }
                  >
                    {sourceType && (
                      <div className="source-panel__explorer">
                        {sourceType instanceof Enumeration && (
                          <TypeTree type={sourceType} />
                        )}
                        {/* TODO?: do we need to show anything when the source type is string or integer */}
                      </div>
                    )}
                    {!sourceType && (
                      <BlankPanelPlaceholder
                        text="Choose a source"
                        onClick={showSourceSelectorModal}
                        clickActionType="add"
                        tooltipText="Drop an enumeration"
                        isDropZoneActive={canDrop}
                        disabled={isReadOnly}
                        previewText="No source"
                      />
                    )}
                    <EnumerationMappingSourceSelectorModal
                      enumerationMapping={enumerationMapping}
                      open={openSourceSelectorModal}
                      closeModal={hideSourceSelectorModal}
                    />
                  </PanelDropZone>
                </PanelContent>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    );
  },
);
