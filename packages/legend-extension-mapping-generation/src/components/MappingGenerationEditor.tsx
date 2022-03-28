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
  clsx,
  PanelLoadingIndicator,
} from '@finos/legend-art';
import {
  type EditorStore,
  StudioTextInputEditor,
} from '@finos/legend-studio';
import {
  EDITOR_LANGUAGE,
  useApplicationStore,
} from '@finos/legend-application';
import type { MappingGenerationEditorState } from '../stores/MappingGenerationEditorState';
import { runInAction } from 'mobx';

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
    values: string[];
    isReadOnly: boolean;
    update: (updatedValues: string[]) => void;
  }) => {
    const { propertyName, description, values, isReadOnly, update } = props;
    const arrayValues = values;
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
        update(arrayValues.concat([itemValue]));
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

export const MappingGenerationEditor = observer(
  (props: { mappingGenerationEditorState: MappingGenerationEditorState }) => {
    const { mappingGenerationEditorState } = props;
    const applicationStore = useApplicationStore();

    const editorStore: EditorStore = mappingGenerationEditorState.editorStore;
    const isGenerating = mappingGenerationEditorState.isGenerating;
    const updateModel = (val: string): void =>
      editorStore.modelLoaderState.setModelText(val);

    const generate = applicationStore.guardUnhandledError(() =>
      mappingGenerationEditorState.generate(),
    );

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
                      <StringEditor
                        isReadOnly={false}
                        propertyName={'Mapping to regenerate'}
                        description={
                          'Provide a full path to a mapping with XStore' +
                          ' between Pure and Relational class mapping that will be' +
                          ' a starting point for relational mapping generation'
                        }
                        value={mappingGenerationEditorState.mappingToRegenerate}
                        update={(value: string | undefined): void =>
                          mappingGenerationEditorState.setMappingToRegenerate(
                            value,
                          )
                        }
                      />
                      <StringEditor
                        isReadOnly={false}
                        propertyName={'Source Mapping'}
                        description={
                          'Provide a full path to a relational mapping' +
                          ' that is a ultimate source for M2M class mapping ' +
                          'regeneration'
                        }
                        value={mappingGenerationEditorState.sourceMapping}
                        update={(value: string | undefined): void =>
                          mappingGenerationEditorState.setSourceMapping(value)
                        }
                      />
                      <ArrayEditor
                        propertyName={'Additional M2M mappings'}
                        values={
                          mappingGenerationEditorState.m2mAdditionalMappings
                        }
                        isReadOnly={false}
                        update={(values: string[]): void =>
                          mappingGenerationEditorState.setM2mAdditionalMappings(
                            values,
                          )
                        }
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
                          onClick={(value): void => generate()}
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
                        onClick={(value): void => generate()}
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
                      inputValue={
                        editorStore.modelLoaderState.modelText as string
                      }
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
