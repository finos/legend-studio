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
  Checkbox,
  CustomSelectorInput,
  PanelContentLists,
  PanelForm,
  PanelFormListItems,
  PanelFormSection,
  PanelFormTextField,
  PlusIcon,
  TrashIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';
import {
  dataSpace_addDiagram,
  dataSpace_addElement,
  dataSpace_addExecutable,
  dataSpace_combined_setFaqUrl,
  dataSpace_combined_setSupportUrl,
  dataSpace_combined_setWebsite,
  dataSpace_email_setSupportInfoEmail,
  dataSpace_removeDiagram,
  dataSpace_removeElement,
  dataSpace_removeExecutable,
  dataSpace_setDefaultExecutionContext,
  dataSpace_setDescription,
  dataSpace_setDiagramDescription,
  dataSpace_setDiagramTitle,
  dataSpace_setDocumentationUrl,
  dataSpace_setElementExclude,
  dataSpace_setSupportInfo,
  dataSpace_setTitle,
} from '../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import {
  type DataSpaceElement,
  type DataSpaceExecutionContext,
  DataSpaceDiagram,
  DataSpaceElementPointer,
  DataSpacePackageableElementExecutable,
  DataSpaceSupportCombinedInfo,
  DataSpaceSupportEmail,
} from '@finos/legend-extension-dsl-data-space/graph';
import { type Diagram } from '@finos/legend-extension-dsl-diagram/graph';
import { PackageableElementExplicitReference } from '@finos/legend-graph';

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
  const handleAddElement = (option: {
    label: string;
    value: DataSpaceElement;
  }): void => {
    if (option && option.value && typeof option.value === 'object') {
      const element = option.value;
      const elementPointer = new DataSpaceElementPointer();
      elementPointer.element =
        PackageableElementExplicitReference.create(element);
      dataSpace_addElement(dataSpace, elementPointer);
    }
  };

  const handleRemoveElement = (element: DataSpaceElementPointer): void => {
    dataSpace_removeElement(dataSpace, element);
  };

  const handleElementExcludeChange = (
    element: DataSpaceElementPointer,
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    dataSpace_setElementExclude(element, event.target.checked);
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
  const handleAddDiagram = (option: {
    label: string;
    value: Diagram;
  }): void => {
    if (option && option.value && typeof option.value === 'object') {
      const diagramValue = option.value;
      const newDiagram = new DataSpaceDiagram();
      newDiagram.title = diagramValue.name;
      newDiagram.diagram =
        PackageableElementExplicitReference.create(diagramValue);
      dataSpace_addDiagram(dataSpace, newDiagram);
    }
  };

  const handleRemoveDiagram = (diagram: DataSpaceDiagram): void => {
    dataSpace_removeDiagram(dataSpace, diagram);
  };

  const handleDiagramTitleChange = (
    diagram: DataSpaceDiagram,
    value: string | undefined,
  ): void => {
    dataSpace_setDiagramTitle(diagram, value ?? '');
  };

  const handleDiagramDescriptionChange = (
    diagram: DataSpaceDiagram,
    value: string | undefined,
  ): void => {
    dataSpace_setDiagramDescription(diagram, value);
  };

  // SupportInfo handlers
  const handleSupportInfoTypeChange = (option: { value: string }): void => {
    if (!option || typeof option !== 'object' || !('value' in option)) {
      return;
    }
    const type = option.value;
    if (
      type === 'email' &&
      !(dataSpace.supportInfo instanceof DataSpaceSupportEmail)
    ) {
      const supportInfo = new DataSpaceSupportEmail();
      if (dataSpace.supportInfo instanceof DataSpaceSupportCombinedInfo) {
        supportInfo.address = dataSpace.supportInfo.emails?.[0] ?? '';
      }
      dataSpace_setSupportInfo(dataSpace, supportInfo);
    } else if (
      type === 'combined' &&
      !(dataSpace.supportInfo instanceof DataSpaceSupportCombinedInfo)
    ) {
      const supportInfo = new DataSpaceSupportCombinedInfo();
      if (dataSpace.supportInfo instanceof DataSpaceSupportEmail) {
        supportInfo.emails = [dataSpace.supportInfo.address];
      }
      dataSpace_setSupportInfo(dataSpace, supportInfo);
    } else {
      dataSpace_setSupportInfo(dataSpace, undefined);
    }
  };

  return (
    <PanelContentLists className="dataSpace-editor__general">
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
          <CustomSelectorInput
            options={dataSpace.executionContexts.map((context) => ({
              label: context.name,
              value: context,
            }))}
            onChange={(option: { label: string; value: unknown }) =>
              handleDefaultExecutionContextChange(option)
            }
            value={{
              label: dataSpace.defaultExecutionContext.name,
              value: dataSpace.defaultExecutionContext,
            }}
            darkMode={true}
            key={`default-execution-context-${dataSpace.defaultExecutionContext.name}`}
          />
        </PanelFormSection>
        {/* Elements Section */}
        <PanelFormSection className="dataSpace-editor__general__elements">
          <PanelFormListItems
            title="Elements"
            prompt="Add elements to include in this Data Space. Use the exclude checkbox to exclude elements."
          >
            {dataSpace.elements?.map((element, index) => (
              <div
                key={element.element.value.path}
                className="panel__content__form__section__list__item"
              >
                <div className="panel__content__form__section__list__item__content">
                  <div className="panel__content__form__section__list__item__content__label">
                    {element.element?.value?.path ?? 'Unknown Element'}
                  </div>
                  <div className="panel__content__form__section__list__item__content__actions">
                    <div className="panel__content__form__section__list__item__content__actions-exclude">
                      <Checkbox
                        disabled={dataSpaceState.isReadOnly}
                        checked={element.exclude ?? false}
                        onChange={(event) =>
                          handleElementExcludeChange(element, event)
                        }
                        size="small"
                        className="panel__content__form__section__list__item__content__actions-exclude__btn"
                      />
                      <span className="panel__content__form__section__list__item__content__actions__label">
                        Exclude
                      </span>
                    </div>
                    {!dataSpaceState.isReadOnly && (
                      <button
                        className="panel__content__form__section__list__item__content__actions__btn"
                        onClick={() => handleRemoveElement(element)}
                        tabIndex={-1}
                        title="Remove element"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!dataSpaceState.isReadOnly && (
              <div className="panel__content__form__section__list__add">
                <div className="panel__content__form__section__list__add__input">
                  <CustomSelectorInput
                    options={dataSpaceState.getDataSpaceElementOptions()}
                    onChange={handleAddElement}
                    placeholder="Select an element to add..."
                    darkMode={true}
                  />
                </div>
                <div className="panel__content__form__section__list__add__actions">
                  <button
                    className="panel__content__form__section__list__add__actions__btn"
                    tabIndex={-1}
                    title="Add element"
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
            )}
          </PanelFormListItems>
        </PanelFormSection>

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
        <PanelFormSection className="dataSpace-editor__general__diagrams">
          <div className="panel__content__form__section__header__label">
            Diagrams
          </div>
          <div className="panel__content__form__section__header__prompt">
            Add diagrams to include in this Data Space. Set a title and
            description for each diagram.
          </div>
          {dataSpace.diagrams?.map((diagram) => (
            <div
              key={diagram.diagram.value.path}
              className="panel__content__form__section__list__item"
            >
              <div className="panel__content__form__section__list__item__content">
                <div className="panel__content__form__section__header__label">
                  Diagram
                </div>
                <div className="panel__content__form__section__list__item__content__title">
                  {diagram.diagram.value.path}
                </div>
              </div>
              <div className="panel__content__form__section__list__item__form">
                <PanelFormTextField
                  name="Title"
                  value={diagram.title}
                  update={(value) => handleDiagramTitleChange(diagram, value)}
                  placeholder="Enter title"
                  className="dataSpace-editor__general__diagrams__title"
                />
                <PanelFormTextField
                  name="Description"
                  value={diagram.description ?? ''}
                  update={(value) =>
                    handleDiagramDescriptionChange(diagram, value)
                  }
                  placeholder="Enter description"
                  className="dataSpace-editor__general__diagrams__description"
                />
              </div>
              {!dataSpaceState.isReadOnly && (
                <div className="panel__content__form__section__list__item__content__actions">
                  <button
                    className="panel__content__form__section__list__item__content__actions__btn"
                    onClick={() => handleRemoveDiagram(diagram)}
                    tabIndex={-1}
                    title="Remove diagram"
                  >
                    <TrashIcon />
                  </button>
                </div>
              )}
            </div>
          ))}
          {!dataSpaceState.isReadOnly && (
            <div className="panel__content__form__section__list__add">
              <div className="panel__content__form__section__list__add__input">
                <CustomSelectorInput
                  options={dataSpaceState.getDiagramOptions()}
                  onChange={handleAddDiagram}
                  placeholder="Select a diagram to add..."
                  darkMode={true}
                />
              </div>
              <div className="panel__content__form__section__list__add__actions">
                <button
                  className="panel__content__form__section__list__add__actions__btn"
                  tabIndex={-1}
                  title="Add diagram"
                >
                  <PlusIcon />
                </button>
              </div>
            </div>
          )}
        </PanelFormSection>

        {/* Support Info Section */}
        <PanelFormSection className="dataSpace-editor__general__support-info">
          <div className="panel__content__form__section__header__label">
            Support Information
          </div>
          <div className="panel__content__form__section__header__prompt">
            Configure support information for this Data Space.
          </div>
          <CustomSelectorInput
            options={[
              { label: 'None', value: 'none' },
              { label: 'Email', value: 'email' },
              { label: 'Combined', value: 'combined' },
            ]}
            onChange={(option: { label: string; value: string }) =>
              handleSupportInfoTypeChange(option)
            }
            value={{
              label: dataSpace.supportInfo
                ? dataSpace.supportInfo instanceof DataSpaceSupportEmail
                  ? 'Email'
                  : 'Combined'
                : 'None',
              value: dataSpace.supportInfo
                ? dataSpace.supportInfo instanceof DataSpaceSupportEmail
                  ? 'email'
                  : 'combined'
                : 'none',
            }}
            darkMode={true}
          />
          {dataSpace.supportInfo ? (
            dataSpace.supportInfo instanceof DataSpaceSupportEmail ? (
              <PanelFormSection>
                <PanelFormTextField
                  name="Email Address"
                  value={dataSpace.supportInfo.address}
                  update={(value) => {
                    if (
                      dataSpace.supportInfo instanceof DataSpaceSupportEmail
                    ) {
                      dataSpace_email_setSupportInfoEmail(
                        dataSpace.supportInfo,
                        value ?? '',
                      );
                    }
                  }}
                  placeholder="Enter email address"
                />
                <PanelFormTextField
                  name="Documentation URL"
                  value={dataSpace.supportInfo.documentationUrl}
                  update={(value) => {
                    if (dataSpace.supportInfo) {
                      dataSpace_setDocumentationUrl(
                        dataSpace.supportInfo,
                        value ?? '',
                      );
                    }
                  }}
                  placeholder="Enter documentation URL"
                />
              </PanelFormSection>
            ) : dataSpace.supportInfo instanceof
              DataSpaceSupportCombinedInfo ? (
              <PanelFormSection>
                <PanelFormTextField
                  name="Documentation URL"
                  value={dataSpace.supportInfo.documentationUrl}
                  update={(value) => {
                    if (dataSpace.supportInfo) {
                      dataSpace_setDocumentationUrl(
                        dataSpace.supportInfo,
                        value ?? '',
                      );
                    }
                  }}
                  placeholder="Enter documentation URL"
                />
                <PanelFormTextField
                  name="Website"
                  value={dataSpace.supportInfo.website}
                  update={(value) => {
                    if (
                      dataSpace.supportInfo instanceof
                      DataSpaceSupportCombinedInfo
                    ) {
                      dataSpace_combined_setWebsite(
                        dataSpace.supportInfo,
                        value ?? '',
                      );
                    }
                  }}
                  placeholder="Enter website URL"
                />
                <PanelFormTextField
                  name="FAQ URL"
                  value={dataSpace.supportInfo.faqUrl}
                  update={(value) => {
                    if (
                      dataSpace.supportInfo instanceof
                      DataSpaceSupportCombinedInfo
                    ) {
                      dataSpace_combined_setFaqUrl(
                        dataSpace.supportInfo,
                        value ?? '',
                      );
                    }
                  }}
                  placeholder="Enter FAQ URL"
                />
                <PanelFormTextField
                  name="Support URL"
                  value={dataSpace.supportInfo.supportUrl}
                  update={(value) => {
                    if (
                      dataSpace.supportInfo instanceof
                      DataSpaceSupportCombinedInfo
                    ) {
                      dataSpace_combined_setSupportUrl(
                        dataSpace.supportInfo,
                        value ?? '',
                      );
                    }
                  }}
                  placeholder="Enter support URL"
                />
              </PanelFormSection>
            ) : (
              <div>Unknown support info type</div>
            )
          ) : null}
        </PanelFormSection>
      </PanelForm>
    </PanelContentLists>
  );
});
