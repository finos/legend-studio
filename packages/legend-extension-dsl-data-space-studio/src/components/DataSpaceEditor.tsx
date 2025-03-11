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

import { observer } from 'mobx-react-lite';
import { useEditorStore } from '@finos/legend-application-studio';
import {
  Panel,
  PanelContent,
  PanelHeader,
  PanelFormTextField,
  PanelFormListItems,
  PanelFormSection,
  CustomSelectorInput,
} from '@finos/legend-art';
import {
  DataSpaceExecutionContext,
  DataSpaceSupportCombinedInfo,
  DataSpaceSupportEmail,
  DataSpacePackageableElementExecutable,
} from '@finos/legend-extension-dsl-data-space/graph';
import { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';
import {
  set_title,
  set_description,
  set_defaultExecutionContext,
  add_executionContext,
  remove_executionContext,
  add_element,
  remove_element,
  add_executable,
  remove_executable,
  add_diagram,
  remove_diagram,
  set_executionContext_name,
  set_executionContext_title,
  set_executionContext_description,
  set_supportInfo,
} from '../stores/studio/DSL_DataSpace_GraphModifierHelper.js';

export const DataSpaceEditor = observer(() => {
  const editorStore = useEditorStore();

  const formEditorState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);

  const formElement = formEditorState.dataSpace;

  // Basic properties handlers
  const handleTitleChange = (value: string | undefined): void => {
    set_title(formElement, value);
  };

  const handleDescriptionChange = (value: string | undefined): void => {
    set_description(formElement, value);
  };

  // ExecutionContexts handlers
  const handleAddExecutionContext = (): void => {
    const newExecutionContext =
      new formEditorState.dataSpaceElementBuilder.DataSpaceExecutionContext();
    newExecutionContext.name = `context_${formElement.executionContexts.length + 1}`;
    add_executionContext(formElement, newExecutionContext);
  };

  const handleRemoveExecutionContext = (index: number): void => {
    remove_executionContext(formElement, index);
  };

  const handleExecutionContextNameChange = (
    index: number,
    value: string,
  ): void => {
    const context = formElement.executionContexts[index];
    if (context) {
      set_executionContext_name(context, value);
    }
  };

  const handleExecutionContextTitleChange = (
    index: number,
    value: string | undefined,
  ): void => {
    const context = formElement.executionContexts[index];
    if (context) {
      set_executionContext_title(context, value);
    }
  };

  const handleExecutionContextDescriptionChange = (
    index: number,
    value: string | undefined,
  ): void => {
    const context = formElement.executionContexts[index];
    if (context) {
      set_executionContext_description(context, value);
    }
  };

  // DefaultExecutionContext handler
  const handleDefaultExecutionContextChange = (option: {
    value: unknown;
  }): void => {
    if (
      option &&
      typeof option === 'object' &&
      'value' in option &&
      option.value &&
      typeof option.value === 'object'
    ) {
      const context = option.value as DataSpaceExecutionContext;
      set_defaultExecutionContext(formElement, context);
    }
  };

  // Elements handlers
  const handleAddElement = (): void => {
    const newElement =
      new formEditorState.dataSpaceElementBuilder.DataSpaceElementPointer();
    add_element(formElement, newElement);
  };

  const handleRemoveElement = (index: number): void => {
    remove_element(formElement, index);
  };

  // Executables handlers
  const handleAddExecutable = (): void => {
    const newExecutable =
      new formEditorState.dataSpaceElementBuilder.DataSpacePackageableElementExecutable();
    newExecutable.title = `Executable ${formElement.executables?.length ?? 0 + 1}`;
    add_executable(formElement, newExecutable);
  };

  const handleRemoveExecutable = (index: number): void => {
    remove_executable(formElement, index);
  };

  // Diagrams handlers
  const handleAddDiagram = (): void => {
    const newDiagram =
      new formEditorState.dataSpaceElementBuilder.DataSpaceDiagram();
    newDiagram.title = `Diagram ${formElement.diagrams?.length ?? 0 + 1}`;
    add_diagram(formElement, newDiagram);
  };

  const handleRemoveDiagram = (index: number): void => {
    remove_diagram(formElement, index);
  };

  // SupportInfo handlers
  const handleSupportInfoTypeChange = (option: { value: unknown }): void => {
    if (!option || typeof option !== 'object' || !('value' in option)) {
      return;
    }
    const type = option.value as string;
    if (type === 'email') {
      const supportInfo =
        new formEditorState.dataSpaceElementBuilder.DataSpaceSupportEmail();
      set_supportInfo(formElement, supportInfo);
    } else if (type === 'combined') {
      const supportInfo =
        new formEditorState.dataSpaceElementBuilder.DataSpaceSupportCombinedInfo();
      set_supportInfo(formElement, supportInfo);
    } else {
      set_supportInfo(formElement, undefined);
    }
  };

  return (
    <Panel className="dataSpace-editor panel dataSpace-editor--dark">
      <PanelHeader title="Data Space Editor" />
      <PanelContent>
        <div className="panel__content__form">
          {/* Basic Properties Section */}
          <PanelFormSection>
            <PanelFormTextField
              name="Data Space Title"
              value={formElement.title ?? ''}
              prompt="Data Space title is the user facing name for the Data Space. It is used in downstream applications as the default identifier for this Data Space. When not provided, the DataSpace name property is used."
              update={handleTitleChange}
              placeholder="Enter title"
            />
          </PanelFormSection>

          <PanelFormSection>
            <PanelFormTextField
              name="Data Space Description"
              value={formElement.description ?? ''}
              prompt="Provide a description for this Data Space."
              update={handleDescriptionChange}
              placeholder="Enter description"
            />
          </PanelFormSection>

          {/* Execution Contexts Section */}
          <PanelFormListItems title="Execution Contexts">
            {formElement.executionContexts.map((context, index) => (
              <div
                key={index}
                className="panel__content__form__section__list__item"
              >
                <PanelFormTextField
                  name={`Context ${index + 1} Name`}
                  value={context.name}
                  update={(value) =>
                    handleExecutionContextNameChange(index, value ?? '')
                  }
                  placeholder="Enter name"
                />
                <PanelFormTextField
                  name={`Context ${index + 1} Title`}
                  value={context.title ?? ''}
                  update={(value) =>
                    handleExecutionContextTitleChange(index, value)
                  }
                  placeholder="Enter title"
                />
                <PanelFormTextField
                  name={`Context ${index + 1} Description`}
                  value={context.description ?? ''}
                  update={(value) =>
                    handleExecutionContextDescriptionChange(index, value)
                  }
                  placeholder="Enter description"
                />
                <button
                  className="panel__content__form__section__button"
                  onClick={() => handleRemoveExecutionContext(index)}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              className="panel__content__form__section__button"
              onClick={handleAddExecutionContext}
            >
              Add Execution Context
            </button>
          </PanelFormListItems>

          {/* Default Execution Context Section */}
          <PanelFormSection>
            <div className="panel__content__form__section__header__label">
              Default Execution Context
            </div>
            <div className="panel__content__form__section__header__prompt">
              Select the default execution context for this Data Space.
            </div>
            <CustomSelectorInput
              options={formElement.executionContexts.map((context) => ({
                label: context.name,
                value: context,
              }))}
              onChange={(option: { label: string; value: unknown }) =>
                handleDefaultExecutionContextChange(option)
              }
              value={{
                label: formElement.defaultExecutionContext.name,
                value: formElement.defaultExecutionContext,
              }}
            />
          </PanelFormSection>

          {/* Elements Section */}
          <PanelFormListItems title="Elements">
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
          </PanelFormListItems>

          {/* Executables Section */}
          <PanelFormListItems title="Executables">
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
          </PanelFormListItems>

          {/* Diagrams Section */}
          <PanelFormListItems title="Diagrams">
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
          </PanelFormListItems>

          {/* Support Info Section */}
          <PanelFormListItems title="Support Information">
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
                  ? formEditorState.dataSpaceElementBuilder.isDataSpaceSupportEmail(
                      formElement.supportInfo,
                    )
                    ? 'Email'
                    : 'Combined'
                  : 'None',
                value: formElement.supportInfo
                  ? formEditorState.dataSpaceElementBuilder.isDataSpaceSupportEmail(
                      formElement.supportInfo,
                    )
                    ? 'email'
                    : 'combined'
                  : 'none',
              }}
            />
            {formElement.supportInfo && (
              <div className="panel__content__form__section__list__item">
                {/* Support Info properties editing UI based on type */}
                {formEditorState.dataSpaceElementBuilder.isDataSpaceSupportEmail(
                  formElement.supportInfo,
                ) ? (
                  <PanelFormTextField
                    name="Email Address"
                    value={formElement.supportInfo.address}
                    update={(value) => {
                      if (
                        formEditorState.dataSpaceElementBuilder.isDataSpaceSupportEmail(
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
                    {/* Combined support info editing UI */}
                    <PanelFormTextField
                      name="Website"
                      value={
                        formEditorState.dataSpaceElementBuilder.isDataSpaceSupportCombinedInfo(
                          formElement.supportInfo,
                        )
                          ? (formElement.supportInfo.website ?? '')
                          : ''
                      }
                      update={(value) => {
                        if (
                          formElement.supportInfo &&
                          formEditorState.dataSpaceElementBuilder.isDataSpaceSupportCombinedInfo(
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
                        formEditorState.dataSpaceElementBuilder.isDataSpaceSupportCombinedInfo(
                          formElement.supportInfo,
                        )
                          ? (formElement.supportInfo.faqUrl ?? '')
                          : ''
                      }
                      update={(value) => {
                        if (
                          formElement.supportInfo &&
                          formEditorState.dataSpaceElementBuilder.isDataSpaceSupportCombinedInfo(
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
                        formEditorState.dataSpaceElementBuilder.isDataSpaceSupportCombinedInfo(
                          formElement.supportInfo,
                        )
                          ? (formElement.supportInfo.supportUrl ?? '')
                          : ''
                      }
                      update={(value) => {
                        if (
                          formElement.supportInfo &&
                          formEditorState.dataSpaceElementBuilder.isDataSpaceSupportCombinedInfo(
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
          </PanelFormListItems>
        </div>
      </PanelContent>
    </Panel>
  );
});
