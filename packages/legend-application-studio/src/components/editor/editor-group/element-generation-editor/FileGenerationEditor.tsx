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
import { flowResult, runInAction } from 'mobx';
import { getElementIcon } from '../../../ElementIconUtils.js';
import { useDrop } from 'react-dnd';
import { FileGenerationEditorState } from '../../../../stores/editor/editor-state/element-editor-state/FileGenerationEditorState.js';
import {
  type DebouncedFunc,
  UnsupportedOperationError,
  debounce,
  guaranteeNonNullable,
  type PlainObject,
  prettyCONSTName,
} from '@finos/legend-shared';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  CustomSelectorInput,
  PencilIcon,
  RefreshIcon,
  TimesIcon,
  LockIcon,
  SaveIcon,
  PanelDropZone,
  Panel,
  PanelContent,
  PanelFormSection,
  PanelHeader,
  PanelFormTextField,
  PanelFormBooleanField,
  Button,
} from '@finos/legend-art';
import {
  type FileGenerationSourceDropTarget,
  type ElementDragSource,
  CORE_DND_TYPE,
} from '../../../../stores/editor/utils/DnDUtils.js';
import type { FileGenerationState } from '../../../../stores/editor/editor-state/FileGenerationState.js';
import type { ElementFileGenerationState } from '../../../../stores/editor/editor-state/element-editor-state/ElementFileGenerationState.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  type GenerationProperty,
  type PackageableElement,
  GenerationPropertyItemType,
  PackageableElementReference,
  PackageableElementExplicitReference,
  isValidFullPath,
  resolvePackagePathAndElementName,
  getNullableFileGenerationConfig,
} from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';
import {
  fileGeneration_addScopeElement,
  fileGeneration_changeScopeElement,
  fileGeneration_deleteScopeElement,
  fileGeneration_setGenerationOutputPath,
} from '../../../../stores/graph-modifier/DSL_Generation_GraphModifierHelper.js';
import { FileSystemViewer } from './FileSystemViewer.js';

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
      fileGeneration_deleteScopeElement(fileGeneration, scopeElement);
      regenerate()?.catch(applicationStore.alertUnhandledError);
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
        const element = editorStore.graphManagerState.graph.getNullableElement(
          itemValue,
          true,
        );
        fileGenerationState.addScopeElement(element ?? itemValue);
        regenerate()?.catch(applicationStore.alertUnhandledError);
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
          const element =
            editorStore.graphManagerState.graph.getNullableElement(
              itemValue,
              true,
            );
          if (element) {
            regenerate.cancel();
            fileGeneration_changeScopeElement(
              fileGeneration,
              value,
              PackageableElementExplicitReference.create(element),
            );
            regenerate()?.catch(applicationStore.alertUnhandledError);
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
            data-testid={
              LEGEND_STUDIO_TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS
            }
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
                      <Button
                        className="panel__content__form__section__list__new-item__add-btn"
                        disabled={isDisabled}
                        onClick={updateValue(value)}
                        text="save"
                      />
                      <Button
                        className="panel__content__form__section__list__new-item__cancel-btn"
                        disabled={isReadOnly}
                        onClick={hideAddOrEditItemInput}
                        text="cancel"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="panel__content__form__section__list__item__value file-generation-editor__configuration__content__scope">
                      {
                        <div className="file-generation-editor__configuration__content__scope__icon">
                          {getElementIcon(
                            value instanceof PackageableElementReference
                              ? value.value
                              : undefined,
                            editorStore,
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
                        <PencilIcon />
                      </button>
                      <button
                        className="panel__content__form__section__list__item__remove-btn"
                        disabled={isReadOnly}
                        onClick={(): void => deleteScopeElement(value)}
                        tabIndex={-1}
                      >
                        <TimesIcon />
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
    isReadOnly: boolean;
    update: (property: GenerationProperty, newValue: PlainObject) => void;
    getConfigValue: (name: string) => unknown;
  }) => {
    const { property, getConfigValue, isReadOnly, update } = props;
    // If there is no default value the string will be 'null'. We will treat it as an empty string
    const defaultValue =
      property.defaultValue === 'null' ? '' : property.defaultValue;
    const value =
      (getConfigValue(property.name) as string | undefined) ?? defaultValue;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      update(property, event.target.value as unknown as PlainObject);
    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          {prettyCONSTName(property.name)}
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
    isReadOnly: boolean;
    update: (property: GenerationProperty, newValue: PlainObject) => void;
    getConfigValue: (name: string) => unknown;
  }) => {
    const { property, getConfigValue, isReadOnly, update } = props;
    const defaultValue = JSON.parse(property.defaultValue) as
      | number
      | undefined;
    const value =
      (getConfigValue(property.name) as number | undefined) ?? defaultValue;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      update(property, event.target.value as unknown as PlainObject);
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
    isReadOnly: boolean;
    update: (property: GenerationProperty, newValue: PlainObject) => void;
    getConfigValue: (name: string) => unknown;
  }) => {
    const { property, getConfigValue, isReadOnly, update } = props;
    const defaultValue = JSON.parse(property.defaultValue) as
      | boolean
      | undefined;
    const value =
      (getConfigValue(property.name) as boolean | undefined) ?? defaultValue;
    return (
      <PanelFormBooleanField
        isReadOnly={isReadOnly}
        value={value}
        name={prettyCONSTName(property.name)}
        prompt={property.description}
        update={(newValue: boolean | undefined): void => {
          update(property, newValue as unknown as PlainObject);
        }}
      />
    );
  },
);

const GenerationEnumPropertyEditor = observer(
  (props: {
    property: GenerationProperty;
    isReadOnly: boolean;
    update: (property: GenerationProperty, newValue: PlainObject) => void;
    getConfigValue: (name: string) => unknown;
  }) => {
    const { property, getConfigValue, isReadOnly, update } = props;
    const applicationStore = useApplicationStore();
    const getEnumLabel = (_enum: string): string =>
      isValidFullPath(_enum)
        ? resolvePackagePathAndElementName(_enum)[1]
        : _enum;
    const options = guaranteeNonNullable(
      property.items,
      'Generation configuration description items for enum property item type is missing',
    ).enums.map((_enum) => ({ label: getEnumLabel(_enum), value: _enum }));
    const value =
      (getConfigValue(property.name) as string | undefined) ??
      property.defaultValue;
    const onChange = (val: { label: string; value: string } | null): void => {
      if (val !== null && val.value !== value) {
        update(property, val.value as unknown as PlainObject);
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
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          disabled={isReadOnly}
        />
      </div>
    );
  },
);

const GenerationArrayPropertyEditor = observer(
  (props: {
    property: GenerationProperty;
    isReadOnly: boolean;
    update: (property: GenerationProperty, newValue: object) => void;
    getConfigValue: (name: string) => unknown;
  }) => {
    const { property, getConfigValue, isReadOnly, update } = props;
    let defaultValue: string[] = [];
    // NOTE: hacking this because the backend send corrupted array string
    if (property.defaultValue !== '' && property.defaultValue !== '[]') {
      defaultValue = property.defaultValue
        .substring(1, property.defaultValue.length - 1)
        .split(',');
    }
    const arrayValues =
      (getConfigValue(property.name) as string[] | undefined) ?? defaultValue;
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
          update(property, [...arrayValues]);
          // Since we keep track of the value currently being edited using the index, we have to account for it as we delete entry
          if (typeof showEditInput === 'number' && showEditInput > idx) {
            setShowEditInput(showEditInput - 1);
          }
        }
      };
    return (
      <PanelFormSection>
        <div className="panel__content__form__section__header__label">
          {property.name}
        </div>
        <div className="panel__content__form__section__header__prompt">
          {property.description}
        </div>
        <div className="panel__content__form__section__list">
          <div
            className="panel__content__form__section__list__items"
            data-testid={
              LEGEND_STUDIO_TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS
            }
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
                        <PencilIcon />
                      </button>
                      <button
                        className="panel__content__form__section__list__item__remove-btn"
                        disabled={isReadOnly}
                        onClick={deleteValue(idx)}
                        tabIndex={-1}
                      >
                        <TimesIcon />
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
              <Button
                className="panel__content__form__section__list__new-item__add-btn"
                disabled={isReadOnly}
                onClick={showAddItemInput}
                text="Add Value"
              />
            </div>
          )}
        </div>
      </PanelFormSection>
    );
  },
);

const GenerationMapPropertyEditor = observer(
  (props: {
    property: GenerationProperty;
    isReadOnly: boolean;
    update: (property: GenerationProperty, newValue: object) => void;
    getConfigValue: (name: string) => unknown;
  }) => {
    const { property, getConfigValue, isReadOnly, update } = props;
    // Right now, always assume this is a map between STRING and STRING (might need to support STRING - INTEGER and STRING - BOOLEAN)
    const nonNullableDefaultValue =
      property.defaultValue === 'null' ? '{}' : property.defaultValue;
    const mapValues = ((getConfigValue(property.name) as
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
      <PanelFormSection>
        <div className="panel__content__form__section__header__label">
          {property.name}
        </div>
        <div className="panel__content__form__section__header__prompt">
          {property.description}
        </div>
        <div className="panel__content__form__section__list">
          <div
            className="panel__content__form__section__list__items"
            data-testid={
              LEGEND_STUDIO_TEST_ID.PANEL_CONTENT_FORM_SECTION_LIST_ITEMS
            }
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
                        <PencilIcon />
                      </button>
                      <button
                        className="panel__content__form__section__list__item__remove-btn"
                        disabled={isReadOnly}
                        onClick={deleteValue(key, idx)}
                        tabIndex={-1}
                      >
                        <TimesIcon />
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
      </PanelFormSection>
    );
  },
);

export const GenerationPropertyEditor = observer(
  (props: {
    property: GenerationProperty;
    getConfigValue: (name: string) => unknown;
    isReadOnly: boolean;
    update: (property: GenerationProperty, newValue: object) => void;
  }) => {
    const { property, getConfigValue, isReadOnly, update } = props;
    switch (property.type) {
      case GenerationPropertyItemType.STRING:
        return (
          <GenerationStringPropertyEditor
            getConfigValue={getConfigValue}
            isReadOnly={isReadOnly}
            update={update}
            property={property}
          />
        );
      case GenerationPropertyItemType.INTEGER:
        return (
          <GenerationIntegerPropertyEditor
            getConfigValue={getConfigValue}
            isReadOnly={isReadOnly}
            update={update}
            property={property}
          />
        );
      case GenerationPropertyItemType.BOOLEAN:
        return (
          <GenerationBooleanPropertyEditor
            getConfigValue={getConfigValue}
            isReadOnly={isReadOnly}
            update={update}
            property={property}
          />
        );
      case GenerationPropertyItemType.ENUM:
        return (
          <GenerationEnumPropertyEditor
            getConfigValue={getConfigValue}
            isReadOnly={isReadOnly}
            update={update}
            property={property}
          />
        );
      case GenerationPropertyItemType.ARRAY:
        return (
          <GenerationArrayPropertyEditor
            getConfigValue={getConfigValue}
            isReadOnly={isReadOnly}
            update={update}
            property={property}
          />
        );
      case GenerationPropertyItemType.MAP:
        return (
          <GenerationMapPropertyEditor
            getConfigValue={getConfigValue}
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
      editorStore.graphState.graphGenerationState.globalFileGenerationState.getFileGenerationConfiguration(
        fileGeneration.type,
      ).properties;
    const debouncedRegenerate = useMemo(
      () => debounce(() => flowResult(fileGenerationState.generate()), 500),
      [fileGenerationState],
    );
    const update = (
      generationProperty: GenerationProperty,
      newValue: object,
    ): void => {
      debouncedRegenerate.cancel();
      fileGenerationState.updateFileGenerationParameters(
        fileGeneration,
        generationProperty,
        newValue,
      );
      debouncedRegenerate()?.catch(applicationStore.alertUnhandledError);
    };
    const showFileGenerationModal = (): void => {
      elementGenerationState?.setShowNewFileGenerationModal(true);
    };
    const resetDefaultConfiguration = (): void => {
      debouncedRegenerate.cancel();
      fileGenerationState.resetGenerator();
      debouncedRegenerate()?.catch(applicationStore.alertUnhandledError);
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
          fileGeneration_addScopeElement(
            fileGeneration,
            PackageableElementExplicitReference.create(element),
          );
          debouncedRegenerate()?.catch(applicationStore.alertUnhandledError);
        }
      },
      [
        applicationStore.alertUnhandledError,
        debouncedRegenerate,
        elementGenerationState,
        fileGeneration,
        fileGenerationState,
        isReadOnly,
      ],
    );
    const [{ isScopeElementDragOver }, dropConnector] = useDrop<
      ElementDragSource,
      void,
      { isScopeElementDragOver: boolean }
    >(
      () => ({
        accept: [
          CORE_DND_TYPE.PROJECT_EXPLORER_PACKAGE,
          CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
          CORE_DND_TYPE.PROJECT_EXPLORER_ENUMERATION,
        ],
        drop: (item) => handleDrop(item),
        collect: (monitor) => ({
          isScopeElementDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );

    const getConfigValue = (name: string): unknown =>
      getNullableFileGenerationConfig(fileGeneration, name)?.value;

    return (
      <Panel className="file-generation-editor__configuration">
        <PanelHeader>
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
              title="Reset to default configuration"
            >
              <RefreshIcon />
            </button>
            {Boolean(elementGenerationState) && (
              <button
                className="panel__header__action"
                tabIndex={-1}
                disabled={isReadOnly}
                onClick={showFileGenerationModal}
                title="Promote to file generation specification..."
              >
                <SaveIcon />
              </button>
            )}
          </div>
        </PanelHeader>
        <PanelContent>
          <PanelDropZone
            dropTargetConnector={dropConnector}
            isDragOver={
              isScopeElementDragOver && !elementGenerationState && !isReadOnly
            }
          >
            <div className="file-generation-editor__configuration__content">
              <FileGenerationScopeEditor
                fileGenerationState={fileGenerationState}
                regenerate={debouncedRegenerate}
                isReadOnly={isReadOnly || Boolean(elementGenerationState)}
              />

              <PanelFormTextField
                isReadOnly={isReadOnly}
                value={fileGeneration.generationOutputPath ?? ''}
                name="Generation Output Path"
                prompt="Specifies the root path where files will be generated.
                Defaults to the file specification path"
                update={(value: string | undefined): void =>
                  fileGeneration_setGenerationOutputPath(
                    fileGeneration,
                    value ?? '',
                  )
                }
              />
              {fileGenerationConfiguration.map((abstractGenerationProperty) => (
                <GenerationPropertyEditor
                  key={
                    abstractGenerationProperty.name +
                    abstractGenerationProperty.type
                  }
                  update={update}
                  isReadOnly={isReadOnly}
                  getConfigValue={getConfigValue}
                  property={abstractGenerationProperty}
                />
              ))}
            </div>
          </PanelDropZone>
        </PanelContent>
      </Panel>
    );
  },
);

export const FileGenerationEditor = observer(() => {
  const editorStore = useEditorStore();
  const fileGenerationEditorState =
    editorStore.tabManagerState.getCurrentEditorState(
      FileGenerationEditorState,
    );
  const fileGeneration = fileGenerationEditorState.fileGeneration;
  const isReadOnly = fileGenerationEditorState.isReadOnly;

  return (
    <div className="file-generation-editor">
      <Panel>
        <PanelHeader>
          <div className="panel__header__title">
            {isReadOnly && (
              <div className="uml-element-editor__header__lock">
                <LockIcon />
              </div>
            )}
            <div className="panel__header__title__label">file generation</div>
            <div className="panel__header__title__content">
              {fileGeneration.name}
            </div>
          </div>
        </PanelHeader>
        <PanelContent className="file-generation-editor__content">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel size={400} minSize={300}>
              <FileGenerationConfigurationEditor
                isReadOnly={isReadOnly}
                fileGenerationState={
                  fileGenerationEditorState.fileGenerationState
                }
              />
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel>
              <FileSystemViewer
                generatedFileState={
                  fileGenerationEditorState.fileGenerationState
                }
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </PanelContent>
      </Panel>
    </div>
  );
});
