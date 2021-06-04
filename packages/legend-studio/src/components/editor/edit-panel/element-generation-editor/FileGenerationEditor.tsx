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

import { useState, useMemo, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { getElementIcon } from '../../../shared/Icon';
import { useDrop } from 'react-dnd';
import { useEditorStore } from '../../../../stores/EditorStore';
import {
  getTextContent,
  getEditorLanguageFromFormat,
} from '../../../../stores/editor-state/FileGenerationViewerState';
import { FileGenerationEditorState } from '../../../../stores/editor-state/element-editor-state/FileGenerationEditorState';
import type { DebouncedFunc } from '@finos/legend-studio-shared';
import {
  UnsupportedOperationError,
  debounce,
  guaranteeNonNullable,
} from '@finos/legend-studio-shared';
import type {
  TreeNodeContainerProps,
  TreeData,
  TreeNodeData,
} from '@finos/legend-studio-components';
import {
  clsx,
  TreeView,
  BlankPanelContent,
  PanelLoadingIndicator,
  CustomSelectorInput,
} from '@finos/legend-studio-components';
import {
  FaTimes,
  FaCheckSquare,
  FaSquare,
  FaChevronDown,
  FaChevronRight,
  FaFolderOpen,
  FaFolder,
  FaFileCode,
  FaLock,
  FaSave,
} from 'react-icons/fa';
import { MdModeEdit, MdRefresh } from 'react-icons/md';
import type { FileGenerationSourceDropTarget } from '../../../../stores/shared/DnDUtil';
import { CORE_DND_TYPE } from '../../../../stores/shared/DnDUtil';
import type { FileGenerationState } from '../../../../stores/editor-state/FileGenerationState';
import SplitPane from 'react-split-pane';
import { TextInputEditor } from '../../../shared/TextInputEditor';
import type { ElementFileGenerationState } from '../../../../stores/editor-state/element-editor-state/ElementFileGenerationState';
import type { GenerationTreeNodeData } from '../../../../stores/shared/FileGenerationTreeUtil';
import {
  GenerationDirectory,
  GenerationFile,
  getFileGenerationChildNodes,
} from '../../../../stores/shared/FileGenerationTreeUtil';
import { useApplicationStore } from '../../../../stores/ApplicationStore';
import { CORE_TEST_ID } from '../../../../const';
import type { GenerationProperty } from '../../../../models/metamodels/pure/action/generation/GenerationConfigurationDescription';
import { GenerationPropertyItemType } from '../../../../models/metamodels/pure/action/generation/GenerationConfigurationDescription';
import type { PackageableElement } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import type { FileGenerationSpecification } from '../../../../models/metamodels/pure/model/packageableElements/fileGeneration/FileGenerationSpecification';
import {
  PackageableElementReference,
  PackageableElementExplicitReference,
} from '../../../../models/metamodels/pure/model/packageableElements/PackageableElementReference';
import {
  isValidFullPath,
  resolvePackageNameAndElementName,
} from '../../../../models/MetaModelUtility';

export const FileGenerationTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    GenerationTreeNodeData,
    {
      selectedNode?: TreeNodeData;
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
  const { selectedNode } = innerProps;
  const isSelected = selectedNode === node;
  const isDirectory = node.fileNode instanceof GenerationDirectory;
  const expandIcon = !isDirectory ? (
    <div />
  ) : node.isOpen ? (
    <FaChevronDown />
  ) : (
    <FaChevronRight />
  );
  const iconPackageColor = 'color--generated';
  const nodeIcon = isDirectory ? (
    node.isOpen ? (
      <div className={iconPackageColor}>
        <FaFolderOpen />
      </div>
    ) : (
      <div className={iconPackageColor}>
        <FaFolder />
      </div>
    )
  ) : (
    <div className="icon">
      <FaFileCode />
    </div>
  );
  const selectNode: React.MouseEventHandler = (event) => onNodeSelect?.(node);

  return (
    <div
      className={clsx(
        'tree-view__node__container generation-result-viewer__explorer__package-tree__node__container',
        {
          'generation-result-viewer__explorer__package-tree__node__container--selected':
            isSelected,
        },
      )}
      onClick={selectNode}
      style={{
        paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
        display: 'flex',
      }}
    >
      <div className="tree-view__node__icon generation-result-viewer__explorer__package-tree__node__icon">
        <div className="generation-result-viewer__explorer__package-tree__node__icon__expand">
          {expandIcon}
        </div>
        <div className="generation-result-viewer__explorer__package-tree__node__icon__type">
          {nodeIcon}
        </div>
      </div>
      <button
        className="tree-view__node__label generation-result-viewer__explorer__package-tree__node__label"
        tabIndex={-1}
        title={node.fileNode.path}
      >
        {node.label}
      </button>
    </div>
  );
};

export const FileGenerationTree = observer(
  (props: {
    selectedNode?: TreeNodeData;
    directoryTreeData: TreeData<GenerationTreeNodeData>;
    onNodeSelect: (node: GenerationTreeNodeData) => void;
    getFileElementTreeChildNodes: (
      node: GenerationTreeNodeData,
    ) => GenerationTreeNodeData[];
  }) => {
    const {
      directoryTreeData,
      onNodeSelect,
      getFileElementTreeChildNodes,
      selectedNode,
    } = props;

    return (
      <TreeView
        components={{
          TreeNodeContainer: FileGenerationTreeNodeContainer,
        }}
        treeData={directoryTreeData}
        onNodeSelect={onNodeSelect}
        getChildNodes={getFileElementTreeChildNodes}
        innerProps={{
          selectedNode: selectedNode,
        }}
      />
    );
  },
);

export const GenerationResultExplorer = observer(
  (props: { fileGenerationState: FileGenerationState }) => {
    const { fileGenerationState } = props;
    const treeData = guaranteeNonNullable(
      fileGenerationState.directoryTreeData,
    );
    const onNodeSelect = (node: GenerationTreeNodeData): void =>
      fileGenerationState.onTreeNodeSelect(node, treeData);
    const getMappingElementTreeChildNodes = (
      node: GenerationTreeNodeData,
    ): GenerationTreeNodeData[] => getFileGenerationChildNodes(node, treeData);

    if (!treeData.nodes.size) {
      return <BlankPanelContent>No content</BlankPanelContent>;
    }
    return (
      <div className="generation-result-viewer__explorer__content">
        <FileGenerationTree
          selectedNode={fileGenerationState.selectedNode}
          directoryTreeData={treeData}
          onNodeSelect={onNodeSelect}
          getFileElementTreeChildNodes={getMappingElementTreeChildNodes}
        />
      </div>
    );
  },
);

export const GenerationResultViewer = observer(
  (props: { fileGenerationState: FileGenerationState }) => {
    const { fileGenerationState } = props;
    const applicationStore = useApplicationStore();
    const selectedNode = fileGenerationState.selectedNode;
    const fileNode = selectedNode?.fileNode;
    const regenerate = applicationStore.guaranteeSafeAction(() =>
      fileGenerationState.generate(),
    );

    return (
      <SplitPane
        split="vertical"
        defaultSize={250}
        minSize={250}
        maxSize={-300}
      >
        <div className="generation-result-viewer__side-bar">
          <div className="panel generation-result-viewer__explorer">
            <div className="panel__header">
              <div className="panel__header__title">
                <div className="panel__header__title__label">result</div>
              </div>
              <div className="panel__header__actions">
                <button
                  className={clsx(
                    'panel__header__action  generation-result-viewer__regenerate-btn',
                    {
                      ' generation-result-viewer__regenerate-btn--loading':
                        fileGenerationState.isGenerating,
                    },
                  )}
                  tabIndex={-1}
                  disabled={fileGenerationState.isGenerating}
                  onClick={regenerate}
                  title={'Re-generate'}
                >
                  <MdRefresh />
                </button>
              </div>
            </div>
            <div className="panel__content">
              <PanelLoadingIndicator
                isLoading={fileGenerationState.isGenerating}
              />
              {Boolean(fileGenerationState.directoryTreeData) && (
                <GenerationResultExplorer
                  fileGenerationState={fileGenerationState}
                />
              )}
              {Boolean(!fileGenerationState.directoryTreeData) && (
                <BlankPanelContent>
                  Generation result not available
                </BlankPanelContent>
              )}
            </div>
          </div>
        </div>
        <div className="panel generation-result-viewer__file">
          <div className="panel__header">
            {fileNode && !(fileNode instanceof GenerationDirectory) && (
              <div className="panel__header__title">
                <div className="panel__header__title__label">file</div>
                <div className="panel__header__title__content generation-result-viewer__file__header-name">
                  {fileNode.name}
                </div>
              </div>
            )}
          </div>
          <div className="panel__content">
            {fileNode instanceof GenerationFile && (
              <TextInputEditor
                inputValue={getTextContent(fileNode.content, fileNode.format)}
                isReadOnly={true}
                language={getEditorLanguageFromFormat(fileNode.format)}
              />
            )}
            {!(fileNode instanceof GenerationFile) && (
              <BlankPanelContent>No file selected</BlankPanelContent>
            )}
          </div>
        </div>
      </SplitPane>
    );
  },
);

const FileGenerationScopeEditor = observer(
  (props: {
    isReadOnly: boolean;
    fileGenerationState: FileGenerationState;
    regenerate: DebouncedFunc<() => Promise<void>>;
  }) => {
    const { isReadOnly, fileGenerationState, regenerate } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const fileGeneration = fileGenerationState.fileGeneration;
    const scopeElements = fileGeneration.scopeElements;
    const scopeElementPath = (
      element: PackageableElementReference<PackageableElement> | string,
    ): string =>
      element instanceof PackageableElementReference
        ? element.value.path
        : element;
    // NOTE: `showEditInput` is either boolean (to hide/show the add value button) or a number (index of the item being edited)
    const [showEditInput, setShowEditInput] = useState<boolean | number>(false);
    const [itemValue, setItemValue] = useState<string | undefined>(undefined);
    const hideAddOrEditItemInput = (): void => {
      setShowEditInput(false);
      setItemValue('');
    };
    const showEditItemInput =
      (
        value: PackageableElementReference<PackageableElement> | string,
        idx: number,
      ): (() => void) =>
      (): void => {
        setItemValue(scopeElementPath(value));
        setShowEditInput(idx);
      };
    const showAddItemInput = (): void => {
      setShowEditInput(true);
      setItemValue('');
    };
    const deleteScopeElement = (
      scopeElement: PackageableElementReference<PackageableElement> | string,
    ): void => {
      fileGeneration.deleteScopeElement(scopeElement);
      regenerate()?.catch(applicationStore.alertIllegalUnhandledError);
    };
    const changeItemInputValue: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => setItemValue(event.target.value);
    const isDisabled = Boolean(
      isReadOnly ||
        !itemValue ||
        scopeElements
          .map((element) => scopeElementPath(element))
          .includes(itemValue),
    );
    const addValue = (): void => {
      if (itemValue && !isReadOnly) {
        regenerate.cancel();
        const element = editorStore.graphState.graph.getNullableElement(
          itemValue,
          true,
        );
        fileGenerationState.addScopeElement(element ?? itemValue);
        regenerate()?.catch(applicationStore.alertIllegalUnhandledError);
        hideAddOrEditItemInput();
      }
    };
    const updateValue =
      (
        value: PackageableElementReference<PackageableElement> | string,
      ): (() => void) =>
      (): void => {
        if (
          itemValue &&
          !isReadOnly &&
          !scopeElements
            .map((element) => scopeElementPath(element))
            .includes(itemValue)
        ) {
          const element = editorStore.graphState.graph.getNullableElement(
            itemValue,
            true,
          );
          if (element) {
            regenerate.cancel();
            fileGeneration.changeScopeElement(
              value,
              PackageableElementExplicitReference.create(element),
            );
            regenerate()?.catch(applicationStore.alertIllegalUnhandledError);
          }
        }
        hideAddOrEditItemInput();
      };

    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          Scope
        </div>
        <div className="panel__content__form__section__header__prompt">
          Specifies the list of packages and elements that will determine
          elements to get generated
        </div>
        <div className="panel__content__form__section__list">
          <div
            className="panel__content__form__section__list__items"
            data-testid={CORE_TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS}
          >
            {scopeElements.map((value, idx) => (
              // NOTE: since the value must be unique, we will use it as the key
              <div
                key={scopeElementPath(value)}
                className={
                  showEditInput === idx
                    ? 'panel__content__form__section__list__new-item'
                    : 'panel__content__form__section__list__item'
                }
              >
                {showEditInput === idx ? (
                  <>
                    <input
                      className="panel__content__form__section__input panel__content__form__section__list__new-item__input"
                      spellCheck={false}
                      disabled={isReadOnly}
                      value={itemValue}
                      onChange={changeItemInputValue}
                    />
                    <div className="panel__content__form__section__list__new-item__actions">
                      <button
                        className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                        disabled={isDisabled}
                        onClick={updateValue(value)}
                        tabIndex={-1}
                      >
                        Save
                      </button>
                      <button
                        className="panel__content__form__section__list__new-item__cancel-btn btn btn--dark"
                        disabled={isReadOnly}
                        onClick={hideAddOrEditItemInput}
                        tabIndex={-1}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="panel__content__form__section__list__item__value file-generation-editor__configuration__content__scope">
                      {
                        <div className="file-generation-editor__configuration__content__scope__icon">
                          {getElementIcon(
                            editorStore,
                            value instanceof PackageableElementReference
                              ? value.value
                              : undefined,
                          )}
                        </div>
                      }
                      <div className="file-generation-editor__configuration__content__scope__path">
                        {scopeElementPath(value)}
                      </div>
                    </div>
                    <div className="panel__content__form__section__list__item__actions">
                      <button
                        className="panel__content__form__section__list__item__edit-btn"
                        disabled={isReadOnly}
                        onClick={showEditItemInput(value, idx)}
                        tabIndex={-1}
                      >
                        <MdModeEdit />
                      </button>
                      <button
                        className="panel__content__form__section__list__item__remove-btn"
                        disabled={isReadOnly}
                        onClick={(): void => deleteScopeElement(value)}
                        tabIndex={-1}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {/* ADD NEW VALUE */}
            {showEditInput === true && (
              <div className="panel__content__form__section__list__new-item">
                <input
                  className="panel__content__form__section__input panel__content__form__section__list__new-item__input"
                  spellCheck={false}
                  disabled={isReadOnly}
                  value={itemValue}
                  onChange={changeItemInputValue}
                />
                <div className="panel__content__form__section__list__new-item__actions">
                  <button
                    className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                    disabled={isDisabled}
                    onClick={addValue}
                    tabIndex={-1}
                  >
                    Save
                  </button>
                  <button
                    className="panel__content__form__section__list__new-item__cancel-btn btn btn--dark"
                    disabled={isReadOnly}
                    onClick={hideAddOrEditItemInput}
                    tabIndex={-1}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          {!scopeElements.length && (
            <div className="panel__content__form__section__list__empty">
              No path specified
            </div>
          )}
          {showEditInput !== true && (
            <div className="panel__content__form__section__list__new-item__add">
              <button
                className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                disabled={isReadOnly}
                onClick={showAddItemInput}
                tabIndex={-1}
              >
                Add Value
              </button>
            </div>
          )}
        </div>
      </div>
    );
  },
);

const GenerationStringPropertyEditor = observer(
  (props: {
    property: GenerationProperty;
    fileGeneration: FileGenerationSpecification;
    isReadOnly: boolean;
    update: (
      AbstractGenerationProperty: GenerationProperty,
      newValue: Record<PropertyKey, unknown>,
    ) => void;
  }) => {
    const { property, fileGeneration, isReadOnly, update } = props;
    // FIXME: If there is no default value the string will be 'null'. We will treat it as an empty string
    const defaultValue =
      property.defaultValue === 'null' ? '' : property.defaultValue;
    const value =
      (fileGeneration.getConfigValue(property.name) as string | undefined) ??
      defaultValue;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      update(
        property,
        event.target.value as unknown as Record<PropertyKey, unknown>,
      );
    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          {property.name}
        </div>
        <div className="panel__content__form__section__header__prompt">
          {property.description}
        </div>
        <input
          className="panel__content__form__section__input"
          spellCheck={false}
          disabled={isReadOnly}
          value={value}
          onChange={changeValue}
        />
      </div>
    );
  },
);

const GenerationIntegerPropertyEditor = observer(
  (props: {
    property: GenerationProperty;
    fileGeneration: FileGenerationSpecification;
    isReadOnly: boolean;
    update: (
      AbstractGenerationProperty: GenerationProperty,
      newValue: Record<PropertyKey, unknown>,
    ) => void;
  }) => {
    const { property, fileGeneration, isReadOnly, update } = props;
    const defaultValue = JSON.parse(property.defaultValue) as
      | number
      | undefined;
    const value =
      (fileGeneration.getConfigValue(property.name) as number | undefined) ??
      defaultValue;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      update(
        property,
        event.target.value as unknown as Record<PropertyKey, unknown>,
      );
    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          {property.name}
        </div>
        <div className="panel__content__form__section__header__prompt">
          {property.description}
        </div>
        <input
          className="panel__content__form__section__input panel__content__form__section__number-input"
          spellCheck={false}
          type="number"
          disabled={isReadOnly}
          value={value}
          onChange={changeValue}
        />
      </div>
    );
  },
);

const GenerationBooleanPropertyEditor = observer(
  (props: {
    property: GenerationProperty;
    fileGeneration: FileGenerationSpecification;
    isReadOnly: boolean;
    update: (
      AbstractGenerationProperty: GenerationProperty,
      newValue: Record<PropertyKey, unknown>,
    ) => void;
  }) => {
    const { property, fileGeneration, isReadOnly, update } = props;
    const defaultValue = JSON.parse(property.defaultValue) as
      | boolean
      | undefined;
    const value =
      (fileGeneration.getConfigValue(property.name) as boolean | undefined) ??
      defaultValue;
    const toggle = (): void => {
      if (!isReadOnly) {
        update(property, !value as unknown as Record<PropertyKey, unknown>);
      }
    };
    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          {property.name}
        </div>
        <div
          className={clsx('panel__content__form__section__toggler', {
            'panel__content__form__section__toggler--disabled': isReadOnly,
          })}
          onClick={toggle}
        >
          <button
            className={clsx('panel__content__form__section__toggler__btn', {
              'panel__content__form__section__toggler__btn--toggled': value,
            })}
            disabled={isReadOnly}
            tabIndex={-1}
          >
            {value ? <FaCheckSquare /> : <FaSquare />}
          </button>
          <div className="panel__content__form__section__toggler__prompt">
            {property.description}
          </div>
        </div>
      </div>
    );
  },
);

const GenerationEnumPropertyEditor = observer(
  (props: {
    property: GenerationProperty;
    fileGeneration: FileGenerationSpecification;
    isReadOnly: boolean;
    update: (
      AbstractGenerationProperty: GenerationProperty,
      newValue: Record<PropertyKey, unknown>,
    ) => void;
  }) => {
    const { property, fileGeneration, isReadOnly, update } = props;
    const getEnumLabel = (_enum: string): string =>
      isValidFullPath(_enum)
        ? resolvePackageNameAndElementName('', _enum)[1]
        : _enum;
    const options = guaranteeNonNullable(
      property.items,
      'Generation configuration description items for enum property item type is missing',
    ).enums.map((_enum) => ({ label: getEnumLabel(_enum), value: _enum }));
    const value =
      (fileGeneration.getConfigValue(property.name) as string | undefined) ??
      property.defaultValue;
    const onChange = (val: { label: string; value: string } | null): void => {
      if (val !== null && val.value !== value) {
        update(property, val.value as unknown as Record<PropertyKey, unknown>);
      }
    };
    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          {property.name}
        </div>
        <div className="panel__content__form__section__header__prompt">
          {property.description}
        </div>
        <CustomSelectorInput
          className="panel__content__form__section__dropdown"
          options={options}
          onChange={onChange}
          value={{ label: getEnumLabel(value), value }}
          isClearable={true}
          escapeClearsValue={true}
          darkMode={true}
          disable={isReadOnly}
        />
      </div>
    );
  },
);

const GenerationArrayPropertyEditor = observer(
  (props: {
    property: GenerationProperty;
    fileGeneration: FileGenerationSpecification;
    isReadOnly: boolean;
    update: (
      AbstractGenerationProperty: GenerationProperty,
      newValue: object,
    ) => void;
  }) => {
    const { property, fileGeneration, isReadOnly, update } = props;
    let defaultValue: string[] = [];
    // FIXME: hacking this because the backend send corrupted array string
    if (property.defaultValue !== '' && property.defaultValue !== '[]') {
      defaultValue = property.defaultValue
        .substring(1, property.defaultValue.length - 1)
        .split(',');
    }
    const arrayValues =
      (fileGeneration.getConfigValue(property.name) as string[] | undefined) ??
      defaultValue;
    // NOTE: `showEditInput` is either boolean (to hide/show the add value button) or a number (index of the item being edited)
    const [showEditInput, setShowEditInput] = useState<boolean | number>(false);
    const [itemValue, setItemValue] = useState<string>('');
    const showAddItemInput = (): void => setShowEditInput(true);
    const showEditItemInput =
      (value: string, idx: number): (() => void) =>
      (): void => {
        setItemValue(value);
        setShowEditInput(idx);
      };
    const hideAddOrEditItemInput = (): void => {
      setShowEditInput(false);
      setItemValue('');
    };
    const changeItemInputValue: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => setItemValue(event.target.value);
    const addValue = (): void => {
      if (itemValue && !isReadOnly && !arrayValues.includes(itemValue)) {
        update(property, arrayValues.concat([itemValue]));
      }
      hideAddOrEditItemInput();
    };
    const updateValue =
      (idx: number): (() => void) =>
      (): void => {
        if (itemValue && !isReadOnly && !arrayValues.includes(itemValue)) {
          runInAction(() => {
            arrayValues[idx] = itemValue;
          });
          update(property, arrayValues);
        }
        hideAddOrEditItemInput();
      };
    const deleteValue =
      (idx: number): (() => void) =>
      (): void => {
        if (!isReadOnly) {
          runInAction(() => arrayValues.splice(idx, 1));
          update(property, arrayValues);
          // Since we keep track of the value currently being edited using the index, we have to account for it as we delete entry
          if (typeof showEditInput === 'number' && showEditInput > idx) {
            setShowEditInput(showEditInput - 1);
          }
        }
      };
    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          {property.name}
        </div>
        <div className="panel__content__form__section__header__prompt">
          {property.description}
        </div>
        <div className="panel__content__form__section__list">
          <div
            className="panel__content__form__section__list__items"
            data-testid={CORE_TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS}
          >
            {arrayValues.map((value, idx) => (
              // NOTE: since the value must be unique, we will use it as the key
              <div
                key={value}
                className={
                  showEditInput === idx
                    ? 'panel__content__form__section__list__new-item'
                    : 'panel__content__form__section__list__item'
                }
              >
                {showEditInput === idx ? (
                  <>
                    <input
                      className="panel__content__form__section__input panel__content__form__section__list__new-item__input"
                      spellCheck={false}
                      disabled={isReadOnly}
                      value={itemValue}
                      onChange={changeItemInputValue}
                    />
                    <div className="panel__content__form__section__list__new-item__actions">
                      <button
                        className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                        disabled={isReadOnly || arrayValues.includes(itemValue)}
                        onClick={updateValue(idx)}
                        tabIndex={-1}
                      >
                        Save
                      </button>
                      <button
                        className="panel__content__form__section__list__new-item__cancel-btn btn btn--dark"
                        disabled={isReadOnly}
                        onClick={hideAddOrEditItemInput}
                        tabIndex={-1}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="panel__content__form__section__list__item__value">
                      {value}
                    </div>
                    <div className="panel__content__form__section__list__item__actions">
                      <button
                        className="panel__content__form__section__list__item__edit-btn"
                        disabled={isReadOnly}
                        onClick={showEditItemInput(value, idx)}
                        tabIndex={-1}
                      >
                        <MdModeEdit />
                      </button>
                      <button
                        className="panel__content__form__section__list__item__remove-btn"
                        disabled={isReadOnly}
                        onClick={deleteValue(idx)}
                        tabIndex={-1}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {/* ADD NEW VALUE */}
            {showEditInput === true && (
              <div className="panel__content__form__section__list__new-item">
                <input
                  className="panel__content__form__section__input panel__content__form__section__list__new-item__input"
                  spellCheck={false}
                  disabled={isReadOnly}
                  value={itemValue}
                  onChange={changeItemInputValue}
                />
                <div className="panel__content__form__section__list__new-item__actions">
                  <button
                    className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                    disabled={isReadOnly || arrayValues.includes(itemValue)}
                    onClick={addValue}
                    tabIndex={-1}
                  >
                    Save
                  </button>
                  <button
                    className="panel__content__form__section__list__new-item__cancel-btn btn btn--dark"
                    disabled={isReadOnly}
                    onClick={hideAddOrEditItemInput}
                    tabIndex={-1}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          {showEditInput !== true && (
            <div className="panel__content__form__section__list__new-item__add">
              <button
                className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                disabled={isReadOnly}
                onClick={showAddItemInput}
                tabIndex={-1}
              >
                Add Value
              </button>
            </div>
          )}
        </div>
      </div>
    );
  },
);

const GenerationMapPropertyEditor = observer(
  (props: {
    property: GenerationProperty;
    fileGeneration: FileGenerationSpecification;
    isReadOnly: boolean;
    update: (
      AbstractGenerationProperty: GenerationProperty,
      newValue: object,
    ) => void;
  }) => {
    const { property, fileGeneration, isReadOnly, update } = props;
    // Right now, always assume this is a map between STRING and STRING (might need to support STRING - INTEGER and STRING - BOOLEAN)
    const nonNullableDefaultValue =
      property.defaultValue === 'null' ? '{}' : property.defaultValue;
    const mapValues = ((fileGeneration.getConfigValue(property.name) as
      | Record<string, string>
      | undefined) ?? JSON.parse(nonNullableDefaultValue)) as Record<
      string,
      string
    >;
    // NOTE: `showEditInput` is either boolean (to hide/show the add value button) or a number (index of the item being edited)
    const [showEditInput, setShowEditInput] = useState<boolean | number>(false);
    const [itemKey, setItemKey] = useState<string>('');
    const [itemValue, setItemValue] = useState<string>('');
    const showAddItemInput = (): void => setShowEditInput(true);
    const showEditItemInput =
      (key: string, value: string, idx: number): (() => void) =>
      (): void => {
        setItemKey(key);
        setItemValue(value);
        setShowEditInput(idx);
      };
    const hideAddOrEditItemInput = (): void => {
      setShowEditInput(false);
      setItemKey('');
      setItemValue('');
    };
    const changeItemInputKey: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => setItemKey(event.target.value);
    const changeItemInputValue: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => setItemValue(event.target.value);
    const addValue = (): void => {
      if (
        itemValue &&
        itemKey &&
        !isReadOnly &&
        !Array.from(Object.keys(mapValues)).includes(itemKey)
      ) {
        runInAction(() => {
          mapValues[itemKey] = itemValue;
        });
        update(property, mapValues);
      }
      hideAddOrEditItemInput();
    };
    const updateValue =
      (key: string): (() => void) =>
      (): void => {
        if (itemValue && !isReadOnly) {
          runInAction(() => {
            delete mapValues[key];
            mapValues[itemKey] = itemValue;
          });
          update(property, mapValues);
        }
        hideAddOrEditItemInput();
      };
    const deleteValue =
      (key: string, idx: number): (() => void) =>
      (): void => {
        if (!isReadOnly) {
          runInAction(() => delete mapValues[key]);
          update(property, mapValues);
          // Since we keep track of the value currently being edited using the index, we have to account for it as we delete entry
          if (typeof showEditInput === 'number' && showEditInput > idx) {
            setShowEditInput(showEditInput - 1);
          }
        }
      };
    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          {property.name}
        </div>
        <div className="panel__content__form__section__header__prompt">
          {property.description}
        </div>
        <div className="panel__content__form__section__list">
          <div
            className="panel__content__form__section__list__items"
            data-testid={CORE_TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS}
          >
            {Array.from(Object.entries(mapValues)).map(([key, value], idx) => (
              // NOTE: since the key must be unique, we will use it to generate the key
              <div
                key={key}
                className={
                  showEditInput === idx
                    ? 'panel__content__form__section__list__new-item'
                    : 'panel__content__form__section__list__item'
                }
              >
                {showEditInput === idx ? (
                  <>
                    <input
                      className="panel__content__form__section__input panel__content__form__section__list__new-item__input"
                      spellCheck={false}
                      disabled={isReadOnly}
                      value={itemKey}
                      onChange={changeItemInputKey}
                    />
                    <input
                      className="panel__content__form__section__input panel__content__form__section__list__new-item__input"
                      spellCheck={false}
                      disabled={isReadOnly}
                      value={itemValue}
                      onChange={changeItemInputValue}
                    />
                    <div className="panel__content__form__section__list__new-item__actions">
                      <button
                        className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                        disabled={isReadOnly}
                        onClick={updateValue(key)}
                        tabIndex={-1}
                      >
                        Save
                      </button>
                      <button
                        className="panel__content__form__section__list__new-item__cancel-btn btn btn--dark"
                        disabled={isReadOnly}
                        onClick={hideAddOrEditItemInput}
                        tabIndex={-1}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="panel__content__form__section__list__item__value panel__content__form__section__list__item__value__map-item">
                      <span className="panel__content__form__section__list__item__value__map-item__key">
                        {key}
                      </span>
                      <span className="panel__content__form__section__list__item__value__map-item__separator">
                        :
                      </span>
                      <span className="panel__content__form__section__list__item__value__map-item__value">
                        {value}
                      </span>
                    </div>
                    <div className="panel__content__form__section__list__item__actions">
                      <button
                        className="panel__content__form__section__list__item__edit-btn"
                        disabled={isReadOnly}
                        onClick={showEditItemInput(key, value, idx)}
                        tabIndex={-1}
                      >
                        <MdModeEdit />
                      </button>
                      <button
                        className="panel__content__form__section__list__item__remove-btn"
                        disabled={isReadOnly}
                        onClick={deleteValue(key, idx)}
                        tabIndex={-1}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {/* ADD NEW VALUE */}
            {showEditInput === true && (
              <div className="panel__content__form__section__list__new-item">
                <input
                  className="panel__content__form__section__input panel__content__form__section__list__new-item__input"
                  spellCheck={false}
                  disabled={isReadOnly}
                  value={itemKey}
                  onChange={changeItemInputKey}
                />
                <input
                  className="panel__content__form__section__input panel__content__form__section__list__new-item__input"
                  spellCheck={false}
                  disabled={isReadOnly}
                  value={itemValue}
                  onChange={changeItemInputValue}
                />
                <div className="panel__content__form__section__list__new-item__actions">
                  <button
                    className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                    disabled={
                      isReadOnly ||
                      Array.from(Object.keys(mapValues)).includes(itemKey)
                    }
                    onClick={addValue}
                    tabIndex={-1}
                  >
                    Save
                  </button>
                  <button
                    className="panel__content__form__section__list__new-item__cancel-btn btn btn--dark"
                    disabled={isReadOnly}
                    onClick={hideAddOrEditItemInput}
                    tabIndex={-1}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          {showEditInput !== true && (
            <div className="panel__content__form__section__list__new-item__add">
              <button
                className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                disabled={isReadOnly}
                onClick={showAddItemInput}
                tabIndex={-1}
              >
                Add Value
              </button>
            </div>
          )}
        </div>
      </div>
    );
  },
);

const GenerationPropertyEditor = observer(
  (props: {
    property: GenerationProperty;
    fileGeneration: FileGenerationSpecification;
    isReadOnly: boolean;
    update: (
      AbstractGenerationProperty: GenerationProperty,
      newValue: object,
    ) => void;
  }) => {
    const {
      property,
      fileGeneration: fileGeneration,
      isReadOnly,
      update,
    } = props;
    switch (property.type) {
      case GenerationPropertyItemType.STRING:
        return (
          <GenerationStringPropertyEditor
            fileGeneration={fileGeneration}
            isReadOnly={isReadOnly}
            update={update}
            property={property}
          />
        );
      case GenerationPropertyItemType.INTEGER:
        return (
          <GenerationIntegerPropertyEditor
            fileGeneration={fileGeneration}
            isReadOnly={isReadOnly}
            update={update}
            property={property}
          />
        );
      case GenerationPropertyItemType.BOOLEAN:
        return (
          <GenerationBooleanPropertyEditor
            fileGeneration={fileGeneration}
            isReadOnly={isReadOnly}
            update={update}
            property={property}
          />
        );
      case GenerationPropertyItemType.ENUM:
        return (
          <GenerationEnumPropertyEditor
            fileGeneration={fileGeneration}
            isReadOnly={isReadOnly}
            update={update}
            property={property}
          />
        );
      case GenerationPropertyItemType.ARRAY:
        return (
          <GenerationArrayPropertyEditor
            fileGeneration={fileGeneration}
            isReadOnly={isReadOnly}
            update={update}
            property={property}
          />
        );
      case GenerationPropertyItemType.MAP:
        return (
          <GenerationMapPropertyEditor
            fileGeneration={fileGeneration}
            isReadOnly={isReadOnly}
            update={update}
            property={property}
          />
        );
      default:
        throw new UnsupportedOperationError(
          `Can't generate editor for artifact generation property of type '${property.type}'`,
        );
    }
  },
);

export const FileGenerationConfigurationEditor = observer(
  (props: {
    isReadOnly: boolean;
    /**
     * In element generation mode, we want to show the button to promote the config to a FileGeneration element
     * and we also want to disable scope edition.
     */
    elementGenerationState?: ElementFileGenerationState;
    fileGenerationState: FileGenerationState;
  }) => {
    const { isReadOnly, fileGenerationState, elementGenerationState } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const fileGeneration = fileGenerationState.fileGeneration;
    const fileGenerationConfiguration =
      editorStore.graphState.graphGenerationState.getFileGenerationConfiguration(
        fileGeneration.type,
      ).properties;
    const debouncedRegenerate = useMemo(
      () => debounce(() => fileGenerationState.generate(), 500),
      [fileGenerationState],
    );
    const update = (
      AbstractGenerationProperty: GenerationProperty,
      newValue: object,
    ): void => {
      debouncedRegenerate.cancel();
      fileGeneration.updateParameters(AbstractGenerationProperty, newValue);
      debouncedRegenerate()?.catch(applicationStore.alertIllegalUnhandledError);
    };
    const showFileGenerationModal = (): void => {
      elementGenerationState?.setShowNewFileGenerationModal(true);
    };
    const resetDefaultConfiguration = (): void => {
      debouncedRegenerate.cancel();
      fileGenerationState.resetFileGeneration();
      debouncedRegenerate()?.catch(applicationStore.alertIllegalUnhandledError);
    };

    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      const val = event.target.value;
      fileGeneration.setGenerationOutputPath(val || undefined);
    };

    // Drag and Drop
    const handleDrop = useCallback(
      (item: FileGenerationSourceDropTarget): void => {
        const element = item.data.packageableElement;
        if (
          !isReadOnly &&
          !elementGenerationState &&
          !fileGenerationState.getScopeElement(element)
        ) {
          debouncedRegenerate.cancel();
          fileGeneration.addScopeElement(
            PackageableElementExplicitReference.create(element),
          );
          debouncedRegenerate()?.catch(
            applicationStore.alertIllegalUnhandledError,
          );
        }
      },
      [
        applicationStore.alertIllegalUnhandledError,
        debouncedRegenerate,
        elementGenerationState,
        fileGeneration,
        fileGenerationState,
        isReadOnly,
      ],
    );
    const [{ isScopeElementDragOver }, scopeElementDropRef] = useDrop(
      () => ({
        accept: [
          CORE_DND_TYPE.PROJECT_EXPLORER_PACKAGE,
          CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
          CORE_DND_TYPE.PROJECT_EXPLORER_ENUMERATION,
        ],
        drop: (item: FileGenerationSourceDropTarget): void => handleDrop(item),
        collect: (monitor): { isScopeElementDragOver: boolean } => ({
          isScopeElementDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );

    return (
      <div className="panel file-generation-editor__configuration">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">{`${fileGeneration.type} configuration`}</div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action file-generation-editor__configuration__reset-btn"
              tabIndex={-1}
              disabled={
                isReadOnly || !fileGeneration.configurationProperties.length
              }
              onClick={resetDefaultConfiguration}
              title={'Reset to default configuration'}
            >
              <MdRefresh />
            </button>
            {Boolean(elementGenerationState) && (
              <button
                className="panel__header__action"
                tabIndex={-1}
                disabled={isReadOnly}
                onClick={showFileGenerationModal}
                title={'Promote File Generation Specification...'}
              >
                <FaSave />
              </button>
            )}
          </div>
        </div>
        <div ref={scopeElementDropRef} className="panel__content dnd__dropzone">
          <div
            className={clsx({
              dnd__overlay:
                isScopeElementDragOver &&
                !elementGenerationState &&
                !isReadOnly,
            })}
          />
          <div className="file-generation-editor__configuration__content">
            <FileGenerationScopeEditor
              fileGenerationState={fileGenerationState}
              regenerate={debouncedRegenerate}
              isReadOnly={isReadOnly || Boolean(elementGenerationState)}
            />
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Generation Output Path
              </div>
              <div className="panel__content__form__section__header__prompt">
                Specifies the root path where files will be generated. Defaults
                to the file specification path
              </div>
              <input
                className="panel__content__form__section__input"
                spellCheck={false}
                disabled={isReadOnly}
                value={fileGeneration.generationOutputPath ?? ''}
                onChange={changeValue}
              />
            </div>
            {fileGenerationConfiguration.map((abstractGenerationProperty) => (
              <GenerationPropertyEditor
                key={
                  abstractGenerationProperty.name +
                  abstractGenerationProperty.type
                }
                update={update}
                isReadOnly={isReadOnly}
                fileGeneration={fileGeneration}
                property={abstractGenerationProperty}
              />
            ))}{' '}
          </div>
        </div>
      </div>
    );
  },
);

export const FileGenerationEditor = observer(() => {
  const editorStore = useEditorStore();
  const fileGenerationEditorState = editorStore.getCurrentEditorState(
    FileGenerationEditorState,
  );
  const fileGeneration = fileGenerationEditorState.fileGeneration;
  const isReadOnly = fileGenerationEditorState.isReadOnly;

  return (
    <div className="file-generation-editor">
      <div className="panel">
        <div className="panel__header">
          <div className="panel__header__title">
            {isReadOnly && (
              <div className="uml-element-editor__header__lock">
                <FaLock />
              </div>
            )}
            <div className="panel__header__title__label">file generation</div>
            <div className="panel__header__title__content">
              {fileGeneration.name}
            </div>
          </div>
        </div>
        <div className="panel__content file-generation-editor__content">
          <SplitPane
            split="vertical"
            defaultSize={400}
            minSize={300}
            maxSize={-550}
          >
            <FileGenerationConfigurationEditor
              isReadOnly={isReadOnly}
              fileGenerationState={
                fileGenerationEditorState.fileGenerationState
              }
            />
            <GenerationResultViewer
              fileGenerationState={
                fileGenerationEditorState.fileGenerationState
              }
            />
          </SplitPane>
        </div>
      </div>
    </div>
  );
});
