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

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  TimesIcon,
  PencilIcon,
  RefreshIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  CustomSelectorInput,
  PURE_MappingIcon,
  clsx,
  PanelLoadingIndicator,
  ErrorIcon,
} from '@finos/legend-art';
import {
  type EditorStore,
  StudioTextInputEditor,
  type PackageableElementOption,
} from '@finos/legend-studio';
import {
  EDITOR_LANGUAGE,
  useApplicationStore,
} from '@finos/legend-application';
import type { MappingGenerationEditorState } from '../stores/MappingGenerationEditorState.js';
import { flowResult, runInAction } from 'mobx';
import {
  type Mapping,
  createValidationError,
  isStubbed_PackageableElement,
  stub_Mapping,
} from '@finos/legend-graph';

const StringEditor = observer(
  (props: {
    propertyName: string;
    description?: string;
    value: string | undefined;
    isReadOnly: boolean;
    update: (value: string | undefined) => void;
  }) => {
    const { value, propertyName, description, isReadOnly, update } = props;
    const displayValue = value ?? '';
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      const stringValue = event.target.value;
      const updatedValue = stringValue ? stringValue : undefined;
      update(updatedValue);
    };

    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          {propertyName}
        </div>
        <div className="panel__content__form__section__header__prompt">
          {description}
        </div>
        <input
          className="panel__content__form__section__input"
          spellCheck={false}
          disabled={isReadOnly}
          value={displayValue}
          placeholder={`${propertyName}Value`}
          onChange={changeValue}
        />
      </div>
    );
  },
);

const ArrayEditor = observer(
  (props: {
    propertyName: string;
    description?: string;
    values: PackageableElementOption<Mapping>[];
    isReadOnly: boolean;
    update: (updatedValues: PackageableElementOption<Mapping>[]) => void;
    mappingOptions: PackageableElementOption<Mapping>[];
  }) => {
    const {
      propertyName,
      description,
      values,
      isReadOnly,
      update,
      mappingOptions,
    } = props;
    const arrayValues: PackageableElementOption<Mapping>[] = values;
    // NOTE: `showEditInput` is either boolean (to hide/show the add value button) or a number (index of the item being edited)
    const [showEditInput, setShowEditInput] = useState<boolean | number>(false);
    const [itemValue, setItemValue] = useState<
      PackageableElementOption<Mapping>
    >({ label: '', value: stub_Mapping() });
    const showAddItemInput = (): void => setShowEditInput(true);
    const showEditItemInput =
      (value: PackageableElementOption<Mapping>, idx: number): (() => void) =>
      (): void => {
        setItemValue(value);
        setShowEditInput(idx);
      };
    const hideAddOrEditItemInput = (): void => {
      setShowEditInput(false);
      setItemValue({ label: '', value: stub_Mapping() });
    };
    const changeItemInputValue = (
      val: PackageableElementOption<Mapping>,
    ): void => {
      if (val.value !== itemValue.value) {
        setItemValue(val);
      }
    };
    const addValue = (): void => {
      if (
        itemValue.value.name !== '' &&
        !isReadOnly &&
        !arrayValues.includes(itemValue)
      ) {
        update(arrayValues.concat([itemValue]));
      }
      hideAddOrEditItemInput();
    };
    const updateValue =
      (idx: number): (() => void) =>
      (): void => {
        if (
          itemValue.value.name !== '' &&
          !isReadOnly &&
          !arrayValues.includes(itemValue)
        ) {
          runInAction(() => {
            arrayValues[idx] = itemValue;
          });
          update(arrayValues);
        }
        hideAddOrEditItemInput();
      };
    const deleteValue =
      (idx: number): (() => void) =>
      (): void => {
        if (!isReadOnly) {
          runInAction(() => arrayValues.splice(idx, 1));
          update(arrayValues);
          // Since we keep track of the value currently being edited using the index, we have to account for it as we delete entry
          if (typeof showEditInput === 'number' && showEditInput > idx) {
            setShowEditInput(showEditInput - 1);
          }
        }
      };

    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          {propertyName}
        </div>
        <div className="panel__content__form__section__header__prompt">
          {description}
        </div>
        <div className="panel__content__form__section__list">
          <div className="panel__content__form__section__list__items">
            {arrayValues.map((value, idx) => (
              // NOTE: since the value must be unique, we will use it as the key
              <div
                key={value.value._UUID}
                className={
                  showEditInput === idx
                    ? 'mapping-generation-editor__configuration__item'
                    : 'panel__content__form__section__list__item'
                }
              >
                {showEditInput === idx ? (
                  <>
                    <CustomSelectorInput
                      className="panel__content__form__section__dropdown mapping-generation-editor__configuration__item__dropdown"
                      options={mappingOptions}
                      onChange={changeItemInputValue}
                      value={itemValue}
                      darkMode={true}
                    />
                    <button
                      className="btn--dark btn--sm mapping-generation-editor__configuration__item__btn"
                      disabled={isReadOnly || arrayValues.includes(itemValue)}
                      onClick={updateValue(idx)}
                      tabIndex={-1}
                    >
                      Save
                    </button>
                    <button
                      className="btn--dark btn--sm mapping-generation-editor__configuration__item__btn"
                      disabled={isReadOnly}
                      onClick={hideAddOrEditItemInput}
                      tabIndex={-1}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div className="panel__content__form__section__list__item__value">
                      {value.value.path}
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
              <div className="mapping-generation-editor__configuration__item">
                <CustomSelectorInput
                  className="panel__content__form__section__dropdown mapping-generation-editor__configuration__item__dropdown"
                  options={mappingOptions}
                  onChange={changeItemInputValue}
                  value={itemValue}
                  darkMode={true}
                />
                <button
                  className="btn--dark btn--sm mapping-generation-editor__configuration__item__btn__add"
                  disabled={isReadOnly || arrayValues.includes(itemValue)}
                  onClick={addValue}
                  tabIndex={-1}
                >
                  Save
                </button>
                <button
                  className="btn--dark btn--sm mapping-generation-editor__configuration__item__btn__cancel"
                  disabled={isReadOnly}
                  onClick={hideAddOrEditItemInput}
                  tabIndex={-1}
                >
                  Cancel
                </button>
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

const MappingSelectorEditor = observer(
  (props: {
    selectedMapping: PackageableElementOption<Mapping> | undefined;
    setMapping: (value: PackageableElementOption<Mapping>) => void;
    propertyName: string;
    description: string;
    editorStore: EditorStore;
  }) => {
    const {
      selectedMapping,
      setMapping,
      propertyName,
      description,
      editorStore,
    } = props;
    // mapping
    const isMappingEmpty =
      selectedMapping?.value &&
      isStubbed_PackageableElement(selectedMapping.value)
        ? createValidationError(['Mapping cannot be empty'])
        : undefined;
    const mapping = selectedMapping?.value;
    const mappingOptions = editorStore.mappingOptions;
    const noMappingLabel = (
      <div
        className="mapping-generation-editor__configuration__mapping-option--empty"
        title={isMappingEmpty?.messages.join('\n') ?? ''}
      >
        <div className="mapping-generation-editor__configuration__mapping-option--empty__label">
          (none)
        </div>
        <ErrorIcon />
      </div>
    );
    const selectedMappingOption = {
      value: mapping,
      label: isMappingEmpty ? noMappingLabel : selectedMapping?.value.path,
    };
    const onMappingSelectionChange = (
      val: PackageableElementOption<Mapping>,
    ): void => {
      if (val.value !== mapping) {
        setMapping(val);
      }
    };
    return (
      <div className="panel__content__form__section">
        <div className="panel__content__form__section__header__label">
          {propertyName}
        </div>
        <div className="panel__content__form__section__header__prompt">
          {description}
        </div>
        <div className="mapping-generation-editor__configuration__item">
          <div className="btn--sm mapping-generation-editor__configuration__item__label">
            <PURE_MappingIcon />
          </div>
          <CustomSelectorInput
            className="panel__content__form__section__dropdown mapping-generation-editor__configuration__item__dropdown"
            options={mappingOptions}
            onChange={onMappingSelectionChange}
            value={selectedMappingOption}
            darkMode={true}
            hasError={isMappingEmpty}
          />
        </div>
      </div>
    );
  },
);

export const MappingGenerationEditor = observer(
  (props: { mappingGenerationEditorState: MappingGenerationEditorState }) => {
    const { mappingGenerationEditorState } = props;
    const applicationStore = useApplicationStore();

    const editorStore: EditorStore = mappingGenerationEditorState.editorStore;
    const isGenerating = mappingGenerationEditorState.isGenerating;
    const updateModel = (val: string): void =>
      editorStore.modelLoaderState.setModelText(val);
    const generate = (): void => {
      flowResult(mappingGenerationEditorState.generate()).catch(
        applicationStore.alertUnhandledError,
      );
    };

    return (
      <div className="panel element-generation-editor">
        <div
          className="panel__content element-generation-editor__content"
          style={{ height: '100%' }}
        >
          <div className="mapping-generation-editor">
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel minSize={50} size={300}>
                <div className="mapping-generation-editor">
                  <div className="panel">
                    <div className="panel__header">
                      <div className="panel__header__title">
                        <div className="panel__header__title__content">
                          Configuration
                        </div>
                      </div>
                    </div>
                    <div className="mapping-generation-editor__configuration__content">
                      <MappingSelectorEditor
                        description={
                          'Pick a mapping with XStore ' +
                          'between Pure and Relational class mapping that will be ' +
                          'a starting point for relational mapping generation'
                        }
                        propertyName={'Mapping to regenerate'}
                        selectedMapping={
                          mappingGenerationEditorState.mappingToRegenerate
                        }
                        setMapping={(
                          value: PackageableElementOption<Mapping>,
                        ): void =>
                          mappingGenerationEditorState.setMappingToRegenerate(
                            value,
                          )
                        }
                        editorStore={mappingGenerationEditorState.editorStore}
                      />
                      <MappingSelectorEditor
                        propertyName={'Source Mapping'}
                        description={
                          'Pick a relational mapping' +
                          ' that is a ultimate source for M2M class mapping ' +
                          'regeneration'
                        }
                        selectedMapping={
                          mappingGenerationEditorState.sourceMapping
                        }
                        setMapping={(
                          value: PackageableElementOption<Mapping>,
                        ): void =>
                          mappingGenerationEditorState.setSourceMapping(value)
                        }
                        editorStore={mappingGenerationEditorState.editorStore}
                      />
                      <ArrayEditor
                        propertyName={'Additional M2M mappings'}
                        values={
                          mappingGenerationEditorState.m2mAdditionalMappings
                        }
                        isReadOnly={false}
                        update={(
                          values: PackageableElementOption<Mapping>[],
                        ): void =>
                          mappingGenerationEditorState.setM2mAdditionalMappings(
                            values,
                          )
                        }
                        mappingOptions={editorStore.mappingOptions}
                      />
                      <StringEditor
                        isReadOnly={false}
                        propertyName={'Generated mapping name'}
                        value={mappingGenerationEditorState.mappingNewName}
                        update={(value: string | undefined): void =>
                          mappingGenerationEditorState.setMappingName(value)
                        }
                      />
                      <StringEditor
                        isReadOnly={false}
                        propertyName={'Generated store name'}
                        value={mappingGenerationEditorState.storeNewName}
                        update={(value: string | undefined): void =>
                          mappingGenerationEditorState.setStoreName(value)
                        }
                      />
                      <div className="panel__content__form__section__list__new-item__add">
                        <button
                          className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                          disabled={
                            isGenerating ||
                            !mappingGenerationEditorState.sourceMapping ||
                            !mappingGenerationEditorState.mappingToRegenerate
                          }
                          onClick={generate}
                          tabIndex={-1}
                        >
                          Generate
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </ResizablePanel>
              <ResizablePanelSplitter>
                <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
              </ResizablePanelSplitter>
              <ResizablePanel>
                <div className="panel generation-result-viewer__file">
                  <div className="panel__header">
                    <div className="panel__header__title">
                      <div className="panel__header__title__label">results</div>
                    </div>
                    <div className="panel__header__actions">
                      <button
                        className={clsx(
                          'panel__header__action  generation-result-viewer__regenerate-btn',
                          {
                            ' generation-result-viewer__regenerate-btn--loading':
                              isGenerating,
                          },
                        )}
                        tabIndex={-1}
                        disabled={
                          isGenerating ||
                          !mappingGenerationEditorState.sourceMapping ||
                          !mappingGenerationEditorState.mappingToRegenerate
                        }
                        onClick={generate}
                        title={'Re-generate'}
                      >
                        <RefreshIcon />
                      </button>
                    </div>
                  </div>
                  <div className="panel__content">
                    <PanelLoadingIndicator isLoading={isGenerating} />
                    <StudioTextInputEditor
                      language={EDITOR_LANGUAGE.PURE}
                      inputValue={editorStore.modelLoaderState.modelText}
                      updateInput={updateModel}
                      showMiniMap={true}
                      isReadOnly={true}
                    />
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </div>
    );
  },
);
