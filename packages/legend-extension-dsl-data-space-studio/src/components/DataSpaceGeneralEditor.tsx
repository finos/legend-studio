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

import {
  CustomSelectorInput,
  PanelFormSection,
  PanelFormTextField,
  PanelFormValidatedTextField,
  PlusIcon,
  ResizablePanelGroup,
  ResizablePanel,
  TrashIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  dataSpace_addDiagram,
  dataSpace_addElement,
  dataSpace_removeDiagram,
  dataSpace_removeElement,
  dataSpace_setDefaultExecutionContext,
  dataSpace_setDescription,
  dataSpace_setDiagramDescription,
  dataSpace_setDiagramTitle,
  dataSpace_setElementExclude,
  dataSpace_setSupportCombinedInfoFaqUrl,
  dataSpace_setSupportCombinedInfoSupportUrl,
  dataSpace_setSupportCombinedInfoWebsite,
  dataSpace_setSupportEmailAddress,
  dataSpace_setSupportInfo,
  dataSpace_setTitle,
  dataSpace_addSupportCombinedInfoEmail,
  dataSpace_removeSupportCombinedInfoEmail,
} from '../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import {
  DataSpaceSupportCombinedInfo,
  DataSpaceSupportEmail,
  PackageableElementExplicitReference,
  type DataSpaceDiagram,
  type DataSpaceElementPointer,
} from '@finos/legend-extension-dsl-data-space/graph';
import { validateEmail, validateUrl } from '../utils/ValidationUtils.js';
import { useState } from 'react';

export const DataSpaceGeneralEditor = observer(
  (props: { dataSpaceState: DataSpaceEditorState }) => {
    const { dataSpaceState } = props;
    const dataSpace = dataSpaceState.dataSpace;
    const [newEmail, setNewEmail] = useState('');

    const handleTitleChange = (val: string): void => {
      dataSpace_setTitle(dataSpace, val);
    };

    const handleDescriptionChange = (val: string): void => {
      dataSpace_setDescription(dataSpace, val);
    };

    const handleDefaultExecutionContextChange = (val: {
      label: string;
      value: string;
    }): void => {
      const executionContext = dataSpace.executionContexts.find(
        (ec) => ec.name === val.value,
      );
      if (executionContext) {
        dataSpace_setDefaultExecutionContext(dataSpace, executionContext);
      }
    };

    const handleAddElement = (val: {
      label: string;
      value: DataSpaceElementPointer['element']['value'];
    }): void => {
      const elementPointer = new DataSpaceElementPointer();
      elementPointer.element = new PackageableElementExplicitReference();
      elementPointer.element.value = val.value;
      dataSpace_addElement(dataSpace, elementPointer);
    };

    const handleRemoveElement = (element: DataSpaceElementPointer): void => {
      dataSpace_removeElement(dataSpace, element);
    };

    const handleElementExcludeChange = (
      element: DataSpaceElementPointer,
      exclude: boolean,
    ): void => {
      dataSpace_setElementExclude(element, exclude);
    };

    const handleAddDiagram = (val: {
      label: string;
      value: DataSpaceDiagram['diagram']['value'];
    }): void => {
      const newDiagram = new DataSpaceDiagram();
      newDiagram.diagram = new PackageableElementExplicitReference();
      newDiagram.diagram.value = val.value;
      newDiagram.title = val.value.name;
      dataSpace_addDiagram(dataSpace, newDiagram);
    };

    const handleRemoveDiagram = (diagram: DataSpaceDiagram): void => {
      dataSpace_removeDiagram(dataSpace, diagram);
    };

    const handleDiagramTitleChange = (
      diagram: DataSpaceDiagram,
      title: string,
    ): void => {
      dataSpace_setDiagramTitle(diagram, title);
    };

    const handleDiagramDescriptionChange = (
      diagram: DataSpaceDiagram,
      description: string,
    ): void => {
      dataSpace_setDiagramDescription(diagram, description);
    };

    // Support Info handlers
    const handleSupportInfoTypeChange = (val: {
      label: string;
      value: string;
    }): void => {
      if (val.value === 'none') {
        dataSpace_setSupportInfo(dataSpace, undefined);
      } else if (val.value === 'email') {
        // Convert from Combined to Email if needed
        if (
          dataSpace.supportInfo instanceof DataSpaceSupportCombinedInfo &&
          dataSpace.supportInfo.emails?.length
        ) {
          const emailSupportInfo = new DataSpaceSupportEmail();
          emailSupportInfo.address = dataSpace.supportInfo.emails[0] ?? '';
          emailSupportInfo.documentationUrl =
            dataSpace.supportInfo.documentationUrl;
          dataSpace_setSupportInfo(dataSpace, emailSupportInfo);
        } else if (!dataSpace.supportInfo) {
          // Create new Email support info
          const emailSupportInfo = new DataSpaceSupportEmail();
          emailSupportInfo.address = '';
          dataSpace_setSupportInfo(dataSpace, emailSupportInfo);
        }
      } else if (val.value === 'combined') {
        // Convert from Email to Combined if needed
        if (dataSpace.supportInfo instanceof DataSpaceSupportEmail) {
          const combinedSupportInfo = new DataSpaceSupportCombinedInfo();
          combinedSupportInfo.emails = [dataSpace.supportInfo.address];
          combinedSupportInfo.documentationUrl =
            dataSpace.supportInfo.documentationUrl;
          dataSpace_setSupportInfo(dataSpace, combinedSupportInfo);
        } else if (!dataSpace.supportInfo) {
          // Create new Combined support info
          const combinedSupportInfo = new DataSpaceSupportCombinedInfo();
          combinedSupportInfo.emails = [];
          dataSpace_setSupportInfo(dataSpace, combinedSupportInfo);
        }
      }
    };

    const handleSupportEmailAddressChange = (address: string): void => {
      if (dataSpace.supportInfo instanceof DataSpaceSupportEmail) {
        dataSpace_setSupportEmailAddress(dataSpace.supportInfo, address);
      }
    };

    const handleSupportCombinedInfoWebsiteChange = (website: string): void => {
      if (dataSpace.supportInfo instanceof DataSpaceSupportCombinedInfo) {
        dataSpace_setSupportCombinedInfoWebsite(
          dataSpace.supportInfo,
          website || undefined,
        );
      }
    };

    const handleSupportCombinedInfoFaqUrlChange = (faqUrl: string): void => {
      if (dataSpace.supportInfo instanceof DataSpaceSupportCombinedInfo) {
        dataSpace_setSupportCombinedInfoFaqUrl(
          dataSpace.supportInfo,
          faqUrl || undefined,
        );
      }
    };

    const handleSupportCombinedInfoSupportUrlChange = (
      supportUrl: string,
    ): void => {
      if (dataSpace.supportInfo instanceof DataSpaceSupportCombinedInfo) {
        dataSpace_setSupportCombinedInfoSupportUrl(
          dataSpace.supportInfo,
          supportUrl || undefined,
        );
      }
    };

    const handleAddSupportCombinedInfoEmail = (): void => {
      if (
        dataSpace.supportInfo instanceof DataSpaceSupportCombinedInfo &&
        newEmail
      ) {
        dataSpace_addSupportCombinedInfoEmail(dataSpace.supportInfo, newEmail);
        setNewEmail('');
      }
    };

    const handleRemoveSupportCombinedInfoEmail = (email: string): void => {
      if (dataSpace.supportInfo instanceof DataSpaceSupportCombinedInfo) {
        dataSpace_removeSupportCombinedInfoEmail(dataSpace.supportInfo, email);
      }
    };

    return (
      <div className="dataSpace-editor__general">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel>
            <div className="panel">
              <div className="panel__header">
                <div className="panel__header__title">General</div>
              </div>
              <div className="panel__content">
                <div className="panel__content__form">
                  <PanelFormSection>
                    <div className="panel__content__form__section__header__label">
                      Title
                    </div>
                    <PanelFormTextField
                      value={dataSpace.title ?? ''}
                      onChange={handleTitleChange}
                      placeholder="Enter title..."
                    />
                  </PanelFormSection>
                  <PanelFormSection>
                    <div className="panel__content__form__section__header__label">
                      Description
                    </div>
                    <PanelFormTextField
                      value={dataSpace.description ?? ''}
                      onChange={handleDescriptionChange}
                      placeholder="Enter description..."
                      isTextArea={true}
                    />
                  </PanelFormSection>
                  <PanelFormSection>
                    <div className="panel__content__form__section__header__label">
                      Default Execution Context
                    </div>
                    <CustomSelectorInput
                      options={dataSpace.executionContexts.map((ec) => ({
                        label: ec.name,
                        value: ec.name,
                      }))}
                      onChange={handleDefaultExecutionContextChange}
                      value={
                        dataSpace.defaultExecutionContext
                          ? {
                              label: dataSpace.defaultExecutionContext.name,
                              value: dataSpace.defaultExecutionContext.name,
                            }
                          : undefined
                      }
                      placeholder="Select default execution context..."
                      darkMode={true}
                    />
                  </PanelFormSection>
                  <PanelFormSection className="dataSpace-editor__general__elements">
                    <div className="panel__content__form__section__header__label">
                      Elements
                    </div>
                    <div className="panel__content__form__section__list">
                      {dataSpace.elements?.map((element) => (
                        <div
                          key={element.element.value.path}
                          className="panel__content__form__section__list__item"
                        >
                          <div className="panel__content__form__section__list__item__content">
                            <div className="panel__content__form__section__list__item__content__label">
                              {element.element.value.path}
                            </div>
                            <div className="panel__content__form__section__list__item__content__actions">
                              <div className="panel__content__form__section__list__item__content__actions-exclude">
                                <input
                                  type="checkbox"
                                  checked={element.exclude ?? false}
                                  onChange={(e) =>
                                    handleElementExcludeChange(
                                      element,
                                      e.target.checked,
                                    )
                                  }
                                />
                                <div className="panel__content__form__section__list__item__content__actions__label">
                                  Exclude
                                </div>
                              </div>
                              <button
                                className="panel__content__form__section__list__item__content__actions__btn"
                                onClick={() => handleRemoveElement(element)}
                                tabIndex={-1}
                                title="Remove element"
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="panel__content__form__section__list__add">
                        <div className="panel__content__form__section__list__add__input">
                          <CustomSelectorInput
                            options={dataSpaceState.getDataSpaceElementOptions()}
                            onChange={handleAddElement}
                            placeholder="Select element to add..."
                            darkMode={true}
                          />
                        </div>
                      </div>
                    </div>
                  </PanelFormSection>
                  <PanelFormSection className="dataSpace-editor__general__diagrams">
                    <div className="panel__content__form__section__header__label">
                      Diagrams
                    </div>
                    <div className="panel__content__form__section__list">
                      {dataSpace.diagrams?.map((diagram) => (
                        <div
                          key={diagram.diagram.value.path}
                          className="panel__content__form__section__list__item"
                        >
                          <div className="panel__content__form__section__list__item__content">
                            <div className="panel__content__form__section__list__item__content__label">
                              {diagram.diagram.value.path}
                            </div>
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
                          </div>
                          <div className="panel__content__form__section__list__item__form">
                            <PanelFormSection>
                              <div className="panel__content__form__section__header__label">
                                Title
                              </div>
                              <PanelFormTextField
                                className="dataSpace-editor__general__diagrams__title"
                                value={diagram.title ?? ''}
                                onChange={(val) =>
                                  handleDiagramTitleChange(diagram, val)
                                }
                                placeholder="Enter title..."
                              />
                            </PanelFormSection>
                            <PanelFormSection>
                              <div className="panel__content__form__section__header__label">
                                Description
                              </div>
                              <PanelFormTextField
                                className="dataSpace-editor__general__diagrams__description"
                                value={diagram.description ?? ''}
                                onChange={(val) =>
                                  handleDiagramDescriptionChange(diagram, val)
                                }
                                placeholder="Enter description..."
                              />
                            </PanelFormSection>
                          </div>
                        </div>
                      ))}
                      <div className="panel__content__form__section__list__add">
                        <div className="panel__content__form__section__list__add__input">
                          <CustomSelectorInput
                            options={dataSpaceState.getDiagramOptions()}
                            onChange={handleAddDiagram}
                            placeholder="Select diagram to add..."
                            darkMode={true}
                          />
                        </div>
                      </div>
                    </div>
                  </PanelFormSection>
                  <PanelFormSection className="dataSpace-editor__general__support-info">
                    <div className="panel__content__form__section__header__label">
                      Support Information
                    </div>
                    <CustomSelectorInput
                      options={[
                        { label: 'None', value: 'none' },
                        { label: 'Email', value: 'email' },
                        { label: 'Combined', value: 'combined' },
                      ]}
                      onChange={handleSupportInfoTypeChange}
                      value={{
                        label: dataSpace.supportInfo
                          ? dataSpace.supportInfo instanceof
                            DataSpaceSupportEmail
                            ? 'Email'
                            : 'Combined'
                          : 'None',
                        value: dataSpace.supportInfo
                          ? dataSpace.supportInfo instanceof
                            DataSpaceSupportEmail
                            ? 'email'
                            : 'combined'
                          : 'none',
                      }}
                      placeholder="Select support info type..."
                      darkMode={true}
                    />
                    {dataSpace.supportInfo instanceof DataSpaceSupportEmail && (
                      <div className="dataSpace-editor__general__support-info__email">
                        <PanelFormSection>
                          <div className="panel__content__form__section__header__label">
                            Email Address
                          </div>
                          <PanelFormValidatedTextField
                            value={dataSpace.supportInfo.address}
                            onChange={handleSupportEmailAddressChange}
                            placeholder="Enter email address..."
                            validator={validateEmail}
                          />
                        </PanelFormSection>
                      </div>
                    )}
                    {dataSpace.supportInfo instanceof
                      DataSpaceSupportCombinedInfo && (
                      <div className="dataSpace-editor__general__support-info__combined">
                        <PanelFormSection>
                          <div className="panel__content__form__section__header__label">
                            Email Addresses
                          </div>
                          <div className="panel__content__form__section__list">
                            {dataSpace.supportInfo.emails?.map((email, idx) => (
                              <div
                                key={`email-${guaranteeNonNullable(idx)}`}
                                className="panel__content__form__section__list__item"
                              >
                                <div className="panel__content__form__section__list__item__content">
                                  <div className="panel__content__form__section__list__item__content__label">
                                    {email}
                                  </div>
                                  <div className="panel__content__form__section__list__item__content__actions">
                                    <button
                                      className="panel__content__form__section__list__item__content__actions__btn"
                                      onClick={() =>
                                        handleRemoveSupportCombinedInfoEmail(
                                          email,
                                        )
                                      }
                                      tabIndex={-1}
                                      title="Remove email"
                                    >
                                      <TrashIcon />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <div className="panel__content__form__section__list__add">
                              <div className="panel__content__form__section__list__add__input">
                                <PanelFormValidatedTextField
                                  value={newEmail}
                                  onChange={setNewEmail}
                                  placeholder="Enter email address..."
                                  validator={validateEmail}
                                />
                              </div>
                              <div className="panel__content__form__section__list__add__actions">
                                <button
                                  className="panel__content__form__section__list__add__actions__btn"
                                  onClick={handleAddSupportCombinedInfoEmail}
                                  tabIndex={-1}
                                  title="Add email"
                                  disabled={
                                    !newEmail ||
                                    validateEmail(newEmail) !== undefined
                                  }
                                >
                                  <PlusIcon />
                                </button>
                              </div>
                            </div>
                          </div>
                        </PanelFormSection>
                        <PanelFormSection>
                          <div className="panel__content__form__section__header__label">
                            Website
                          </div>
                          <PanelFormValidatedTextField
                            value={dataSpace.supportInfo.website ?? ''}
                            onChange={handleSupportCombinedInfoWebsiteChange}
                            placeholder="Enter website URL..."
                            validator={validateUrl}
                          />
                        </PanelFormSection>
                        <PanelFormSection>
                          <div className="panel__content__form__section__header__label">
                            FAQ URL
                          </div>
                          <PanelFormValidatedTextField
                            value={dataSpace.supportInfo.faqUrl ?? ''}
                            onChange={handleSupportCombinedInfoFaqUrlChange}
                            placeholder="Enter FAQ URL..."
                            validator={validateUrl}
                          />
                        </PanelFormSection>
                        <PanelFormSection>
                          <div className="panel__content__form__section__header__label">
                            Support URL
                          </div>
                          <PanelFormValidatedTextField
                            value={dataSpace.supportInfo.supportUrl ?? ''}
                            onChange={handleSupportCombinedInfoSupportUrlChange}
                            placeholder="Enter support URL..."
                            validator={validateUrl}
                          />
                        </PanelFormSection>
                      </div>
                    )}
                  </PanelFormSection>
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);
