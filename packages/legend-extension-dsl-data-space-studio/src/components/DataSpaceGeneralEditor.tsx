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

import { useEditorStore } from '@finos/legend-application-studio';
import {
  CustomSelectorInput,
  PanelContentLists,
  PanelForm,
  PanelFormSection,
  PanelFormTextField,
  type SelectOption,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import type {
  OnChangeValue,
  ActionMeta,
  PropsValue,
  Props,
} from 'react-select';
import { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';
import {
  dataSpace_addDiagram,
  dataSpace_addElement,
  dataSpace_addExecutable,
  dataSpace_removeDiagram,
  dataSpace_removeElement,
  dataSpace_removeExecutable,
  dataSpace_setDefaultExecutionContext,
  dataSpace_setDescription,
  dataSpace_setSupportInfo,
  dataSpace_setTitle,
} from '../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import {
  type DataSpaceExecutionContext,
  DataSpaceDiagram,
  DataSpaceElementPointer,
  DataSpacePackageableElementExecutable,
  DataSpaceSupportCombinedInfo,
  DataSpaceSupportEmail,
} from '@finos/legend-extension-dsl-data-space/graph';

import { getObjectIdentityKey, toJSForReact } from '../utils/ReactMobXUtils.js';

// Create a MobX-aware wrapper for CustomSelectorInput that handles reference changes
const MobXAwareCustomSelectorInput = observer(
  <Option extends SelectOption, IsMulti extends boolean = false>(props: {
    options: readonly Option[];
    onChange: (option: any) => void;
    value?: any;
    className?: string;
    allowCreating?: boolean;
    noMatchMessage?: string;
    disabled?: boolean;
    darkMode?: boolean;
    hasError?: boolean;
    optionCustomization?: { rowHeight?: number };
    onPaste?: React.ClipboardEventHandler<HTMLInputElement>;
    inputName?: string;
    placeholder?: string;
    components?: Record<string, React.ComponentType<any>>;
    inputRef?: React.Ref<any>;
  }) => {
    // Force re-render when value reference changes
    const valueRef = useRef(props.value);
    const [modeChangeCounter, setModeChangeCounter] = useState(0);

    // Listen for mode changes
    useEffect(() => {
      const handleModeChange = (): void => {
        setModeChangeCounter((prev) => prev + 1);
      };

      // Subscribe to mode change events if available
      if (window.addEventListener) {
        window.addEventListener('editor-mode-changed', handleModeChange);

        return () => {
          window.removeEventListener('editor-mode-changed', handleModeChange);
        };
      }
      return undefined;
    }, []);

    // Force re-render when value reference changes
    useEffect(() => {
      if (valueRef.current !== props.value) {
        valueRef.current = props.value;
        setModeChangeCounter((prev) => prev + 1);
      }
    }, [props.value]);

    return (
      <CustomSelectorInput {...props} key={`mobx-aware-${modeChangeCounter}`} />
    );
  },
);
export const DataSpaceGeneralEditor = observer(() => {
  const editorStore = useEditorStore();

  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const dataSpace = dataSpaceState.dataSpace;

  // Basic properties handlers
  const handleTitleChange = (value: string | undefined): void => {
    dataSpace_setTitle(dataSpace, value);
  };

  const handleDescriptionChange = (value: string | undefined): void => {
    dataSpace_setDescription(dataSpace, value);
  };

  // DefaultExecutionContext handler
  const handleDefaultExecutionContextChange = (option: {
    label: string;
    value: unknown;
  }): void => {
    if (option && option.value && typeof option.value === 'object') {
      const context = option.value as DataSpaceExecutionContext;
      dataSpace_setDefaultExecutionContext(dataSpace, context);
    }
  };

  // Elements handlers
  const handleAddElement = (): void => {
    const newElement = new DataSpaceElementPointer();
    dataSpace_addElement(dataSpace, newElement);
  };

  const handleRemoveElement = (index: number): void => {
    dataSpace_removeElement(dataSpace, index);
  };

  // Executables handlers
  const handleAddExecutable = (): void => {
    const newExecutable = new DataSpacePackageableElementExecutable();
    newExecutable.title = `Executable ${dataSpace.executables?.length ?? 0 + 1}`;
    dataSpace_addExecutable(dataSpace, newExecutable);
  };

  const handleRemoveExecutable = (index: number): void => {
    dataSpace_removeExecutable(dataSpace, index);
  };

  // Diagrams handlers
  const handleAddDiagram = (): void => {
    const newDiagram = new DataSpaceDiagram();
    newDiagram.title = `Diagram ${dataSpace.diagrams?.length ?? 0 + 1}`;
    dataSpace_addDiagram(dataSpace, newDiagram);
  };

  const handleRemoveDiagram = (index: number): void => {
    dataSpace_removeDiagram(dataSpace, index);
  };

  // SupportInfo handlers
  const handleSupportInfoTypeChange = (option: { value: unknown }): void => {
    if (!option || typeof option !== 'object' || !('value' in option)) {
      return;
    }
    const type = option.value as string;
    if (type === 'email') {
      const supportInfo = new DataSpaceSupportEmail();
      dataSpace_setSupportInfo(dataSpace, supportInfo);
    } else if (type === 'combined') {
      const supportInfo = new DataSpaceSupportCombinedInfo();
      dataSpace_setSupportInfo(dataSpace, supportInfo);
    } else {
      dataSpace_setSupportInfo(dataSpace, undefined);
    }
  };

  return (
    <PanelContentLists className="service-editor__general">
      <PanelForm>
        {/* Basic Properties Section */}
        <PanelFormSection>
          <PanelFormTextField
            name="Data Space Title"
            value={dataSpace.title ?? ''}
            prompt="Data Space title is the unique identifier for this Data Space."
            update={handleTitleChange}
            placeholder="Enter title"
          />
        </PanelFormSection>

        <PanelFormSection>
          <PanelFormTextField
            name="Data Space Description"
            value={dataSpace.description ?? ''}
            prompt="Provide a description for this Data Space."
            update={handleDescriptionChange}
            placeholder="Enter description"
          />
        </PanelFormSection>
        {/* Default Execution Context Section */}
        <PanelFormSection>
          <div className="panel__content__form__section__header__label">
            Default Execution Context
          </div>
          <div className="panel__content__form__section__header__prompt">
            Select the default execution context for this Data Space.
          </div>
          <MobXAwareCustomSelectorInput
            options={dataSpace.executionContexts.map((context) => ({
              label: context.name,
              value: context,
            }))}
            onChange={(option) => handleDefaultExecutionContextChange(option)}
            value={{
              label: dataSpace.defaultExecutionContext.name,
              value: dataSpace.defaultExecutionContext,
            }}
            darkMode={true}
          />
        </PanelFormSection>
        {/* Elements Section */}
        {/* <PanelFormListItems title="Elements">
            {formElement.elements?.map((element, index) => (
              <div
                key={index}
                className="panel__content__form__section__list__item"
              >
                <div className="panel__content__form__section__header__label">
                  Element {index + 1}
                </div>
                <div className="panel__content__form__section__checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={element.exclude ?? false}
                      onChange={(e) => {
                        if (
                          formElement.elements &&
                          formElement.elements[index]
                        ) {
                          formElement.elements[index].exclude =
                            e.target.checked;
                        }
                      }}
                    />
                    Exclude
                  </label>
                </div>
                <button
                  className="panel__content__form__section__button"
                  onClick={() => handleRemoveElement(index)}
                >
                  Remove
                </button>
              </div>
            )) ?? <div>No elements defined</div>}
            <button
              className="panel__content__form__section__button"
              onClick={handleAddElement}
            >
              Add Element
            </button>
          </PanelFormListItems> */}

        {/* Executables Section */}
        {/* <PanelFormListItems title="Executables">
            {formElement.executables?.map((executable, index) => (
              <div
                key={index}
                className="panel__content__form__section__list__item"
              >
                <PanelFormTextField
                  name={`Executable ${index + 1} Title`}
                  value={executable.title}
                  update={(value) => {
                    if (
                      formElement.executables &&
                      formElement.executables[index]
                    ) {
                      formElement.executables[index].title = value ?? '';
                    }
                  }}
                  placeholder="Enter title"
                />
                <PanelFormTextField
                  name={`Executable ${index + 1} Description`}
                  value={executable.description ?? ''}
                  update={(value) => {
                    if (
                      formElement.executables &&
                      formElement.executables[index]
                    ) {
                      formElement.executables[index].description = value;
                    }
                  }}
                  placeholder="Enter description"
                />
                <button
                  className="panel__content__form__section__button"
                  onClick={() => handleRemoveExecutable(index)}
                >
                  Remove
                </button>
              </div>
            )) ?? <div>No executables defined</div>}
            <button
              className="panel__content__form__section__button"
              onClick={handleAddExecutable}
            >
              Add Executable
            </button>
          </PanelFormListItems> */}

        {/* Diagrams Section */}
        {/* <PanelFormListItems title="Diagrams">
            {formElement.diagrams?.map((diagram, index) => (
              <div
                key={index}
                className="panel__content__form__section__list__item"
              >
                <PanelFormTextField
                  name={`Diagram ${index + 1} Title`}
                  value={diagram.title}
                  update={(value) => {
                    if (formElement.diagrams && formElement.diagrams[index]) {
                      formElement.diagrams[index].title = value ?? '';
                    }
                  }}
                  placeholder="Enter title"
                />
                <PanelFormTextField
                  name={`Diagram ${index + 1} Description`}
                  value={diagram.description ?? ''}
                  update={(value) => {
                    if (formElement.diagrams && formElement.diagrams[index]) {
                      formElement.diagrams[index].description = value;
                    }
                  }}
                  placeholder="Enter description"
                />
                <button
                  className="panel__content__form__section__button"
                  onClick={() => handleRemoveDiagram(index)}
                >
                  Remove
                </button>
              </div>
            )) ?? <div>No diagrams defined</div>}
            <button
              className="panel__content__form__section__button"
              onClick={handleAddDiagram}
            >
              Add Diagram
            </button>
          </PanelFormListItems> */}

        {/* Support Info Section */}
        {/* <PanelFormListItems title="Support Information">
            <div className="panel__content__form__section__header__prompt">
              Configure support information for this Data Space.
            </div>
            <CustomSelectorInput
              options={[
                { label: 'None', value: 'none' },
                { label: 'Email', value: 'email' },
                { label: 'Combined', value: 'combined' },
              ]}
              onChange={(option: { label: string; value: unknown }) =>
                handleSupportInfoTypeChange(option)
              }
              value={{
                label: formElement.supportInfo
                  ? dataSpaceState.dataSpaceElementBuilder.isDataSpaceSupportEmail(
                      formElement.supportInfo,
                    )
                    ? 'Email'
                    : 'Combined'
                  : 'None',
                value: formElement.supportInfo
                  ? dataSpaceState.dataSpaceElementBuilder.isDataSpaceSupportEmail(
                      formElement.supportInfo,
                    )
                    ? 'email'
                    : 'combined'
                  : 'none',
              }}
              darkMode={true}
            />
            {formElement.supportInfo && (
              <div className="panel__content__form__section__list__item">
                {dataSpaceState.dataSpaceElementBuilder.isDataSpaceSupportEmail(
                  formElement.supportInfo,
                ) ? (
                  <PanelFormTextField
                    name="Email Address"
                    value={formElement.supportInfo.address}
                    update={(value) => {
                      if (
                        dataSpaceState.dataSpaceElementBuilder.isDataSpaceSupportEmail(
                          formElement.supportInfo,
                        )
                      ) {
                        formElement.supportInfo.address = value ?? '';
                      }
                    }}
                    placeholder="Enter email address"
                  />
                ) : (
                  <div>
                    <PanelFormTextField
                      name="Website"
                      value={
                        dataSpaceState.dataSpaceElementBuilder.isDataSpaceSupportCombinedInfo(
                          formElement.supportInfo,
                        )
                          ? (formElement.supportInfo.website ?? '')
                          : ''
                      }
                      update={(value) => {
                        if (
                          formElement.supportInfo &&
                          dataSpaceState.dataSpaceElementBuilder.isDataSpaceSupportCombinedInfo(
                            formElement.supportInfo,
                          )
                        ) {
                          formElement.supportInfo.website = value;
                        }
                      }}
                      placeholder="Enter website URL"
                    />
                    <PanelFormTextField
                      name="FAQ URL"
                      value={
                        dataSpaceState.dataSpaceElementBuilder.isDataSpaceSupportCombinedInfo(
                          formElement.supportInfo,
                        )
                          ? (formElement.supportInfo.faqUrl ?? '')
                          : ''
                      }
                      update={(value) => {
                        if (
                          formElement.supportInfo &&
                          dataSpaceState.dataSpaceElementBuilder.isDataSpaceSupportCombinedInfo(
                            formElement.supportInfo,
                          )
                        ) {
                          formElement.supportInfo.faqUrl = value;
                        }
                      }}
                      placeholder="Enter FAQ URL"
                    />
                    <PanelFormTextField
                      name="Support URL"
                      value={
                        dataSpaceState.dataSpaceElementBuilder.isDataSpaceSupportCombinedInfo(
                          formElement.supportInfo,
                        )
                          ? (formElement.supportInfo.supportUrl ?? '')
                          : ''
                      }
                      update={(value) => {
                        if (
                          formElement.supportInfo &&
                          dataSpaceState.dataSpaceElementBuilder.isDataSpaceSupportCombinedInfo(
                            formElement.supportInfo,
                          )
                        ) {
                          formElement.supportInfo.supportUrl = value;
                        }
                      }}
                      placeholder="Enter support URL"
                    />
                    <PanelFormTextField
                      name="Documentation URL"
                      value={formElement.supportInfo.documentationUrl ?? ''}
                      update={(value) => {
                        if (formElement.supportInfo) {
                          formElement.supportInfo.documentationUrl = value;
                        }
                      }}
                      placeholder="Enter documentation URL"
                    />
                  </div>
                )}
              </div>
            )}
          </PanelFormListItems> */}
      </PanelForm>
    </PanelContentLists>
  );
});
