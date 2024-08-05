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
  CustomSelectorInput,
  ErrorIcon,
  PanelFormListItems,
  PanelFormSection,
  PanelFormTextField,
  PencilIcon,
  TimesIcon,
} from '@finos/legend-art';
import {
  DATASPACE_TAB,
  DataSpaceEditorState,
  SUPPORT_INFO_TYPE,
} from '../stores/DataSpaceEditorState.js';
import {
  set_defaultExecutionContext,
  set_description,
  set_documentationUrl,
  set_email,
  set_emails,
  set_faqUrl,
  set_supportInfotype,
  set_supportUrl,
  set_title,
  set_website,
} from '../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import {
  DataSpaceExecutionContext,
  DataSpaceSupportCombinedInfo,
  DataSpaceSupportEmail,
} from '@finos/legend-extension-dsl-data-space/graph';
import { useEffect, useRef, useState } from 'react';
import { DataSpaceExecutionContextTab } from './DataSpaceExecutionContextTab.js';

const SUPPORT_INFO_TYPE_OPTIONS = [
  { label: 'Support Email', value: SUPPORT_INFO_TYPE.EMAIL },
  { label: 'Combined Info', value: SUPPORT_INFO_TYPE.COMBINED_INFO },
];

const TAB_OPTIONS = [
  { label: 'General', value: DATASPACE_TAB.GENERAL },
  { label: 'Execution Context', value: DATASPACE_TAB.EXECUTION_CONTEXT },
];

interface Option {
  value: SUPPORT_INFO_TYPE | DATASPACE_TAB;
  label: string;
}
interface ExecutionContextOption {
  value: DataSpaceExecutionContext;
  label: string;
}

export const DataSpaceEditor = observer(() => {
  const editorStore = useEditorStore();
  const typeNameRef = useRef<HTMLInputElement>(null);
  const dataSpaceEditorState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const isReadOnly = dataSpaceEditorState.isReadOnly;
  const dataSpaceElement = dataSpaceEditorState.dataSpace;
  const [emailsInputValue, setEmailsInputValue] = useState<string>('');
  const [showEmailsEditInput, setShowEmailsEditInput] = useState<
    boolean | number
  >(false);

  useEffect(() => {
    if (!isReadOnly) {
      typeNameRef.current?.focus();
    }
  }, [isReadOnly]);

  const handleTitleChange = (value: string | undefined): void => {
    set_title(dataSpaceElement, value);
  };

  const handleDescriptionChange = (value: string | undefined): void => {
    set_description(dataSpaceElement, value);
  };

  const handleTabChange = (option: Option) => {
    dataSpaceEditorState.setSelectedTab(option.value as DATASPACE_TAB);
  };

  const handleSupportEmailChange = (value: string | undefined) => {
    if (dataSpaceElement.supportInfo instanceof DataSpaceSupportEmail) {
      set_email(dataSpaceElement.supportInfo, value ?? '');
    }
  };

  const handleEmailsChange = (emails: string[]) => {
    if (dataSpaceElement.supportInfo instanceof DataSpaceSupportCombinedInfo) {
      set_emails(dataSpaceElement.supportInfo, emails);
    }
  };

  const handleWebsiteUrlChange = (website: string | undefined) => {
    if (dataSpaceElement.supportInfo instanceof DataSpaceSupportCombinedInfo) {
      set_website(dataSpaceElement.supportInfo, website ?? '');
    }
  };

  const handleFaqUrlChange = (faqUrl: string | undefined) => {
    if (dataSpaceElement.supportInfo instanceof DataSpaceSupportCombinedInfo) {
      set_faqUrl(dataSpaceElement.supportInfo, faqUrl ?? '');
    }
  };

  const handleSupportUrlChange = (supportUrl: string | undefined) => {
    if (dataSpaceElement.supportInfo instanceof DataSpaceSupportCombinedInfo) {
      set_supportUrl(dataSpaceElement.supportInfo, supportUrl ?? '');
    }
  };

  const handleDocumentationUrlChange = (
    documentationUrl: string | undefined,
  ) => {
    if (dataSpaceElement.supportInfo) {
      set_documentationUrl(
        dataSpaceElement.supportInfo,
        documentationUrl ?? '',
      );
    }
  };

  const handleSupportInfoTypeChange = (option: Option) => {
    dataSpaceEditorState.setSelectedSupportInfoType(
      option.value as SUPPORT_INFO_TYPE,
    );
    set_supportInfotype(dataSpaceElement, option.value);
  };

  const handleExecutionContextChange = (option: ExecutionContextOption) => {
    const context = option.value;
    if (context) {
      dataSpaceEditorState.setDefaultExecutionContext(context);
      dataSpaceEditorState.setSelectedExecutionContext(context);
      dataSpaceEditorState.setSelectedTab(DATASPACE_TAB.EXECUTION_CONTEXT);
    }
  };

  const selectedTab = dataSpaceEditorState.selectedTab;
  const selectedSupportInfoType = dataSpaceEditorState.selectedSupportInfoType;

  const documentationUrl = dataSpaceElement.supportInfo?.documentationUrl ?? '';
  const supportEmail =
    dataSpaceElement.supportInfo instanceof DataSpaceSupportEmail
      ? dataSpaceElement.supportInfo.address
      : '';

  const emails =
    dataSpaceElement.supportInfo instanceof DataSpaceSupportCombinedInfo
      ? (dataSpaceElement.supportInfo.emails ?? [])
      : [];

  const websiteUrl =
    dataSpaceElement.supportInfo instanceof DataSpaceSupportCombinedInfo
      ? (dataSpaceElement.supportInfo.website ?? '')
      : '';
  const faqUrl =
    dataSpaceElement.supportInfo instanceof DataSpaceSupportCombinedInfo
      ? (dataSpaceElement.supportInfo.faqUrl ?? '')
      : '';
  const supportUrl =
    dataSpaceElement.supportInfo instanceof DataSpaceSupportCombinedInfo
      ? (dataSpaceElement.supportInfo.supportUrl ?? '')
      : '';

  const executionContextOptions = dataSpaceElement.executionContexts.map(
    (context) => ({
      label: context.name,
      value: context,
    }),
  );

  // const showAddEmailInput = (): void => setShowEmailsEditInput(true);
  const hideAddOrEditEmailInput = (): void => {
    setShowEmailsEditInput(false);
    setEmailsInputValue('');
  };

  const changeEmailInputValue: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => setEmailsInputValue(event.target.value);

  const addEmail = (): void => {
    if (emailsInputValue && !isReadOnly && !emails.includes(emailsInputValue)) {
      handleEmailsChange([...emails, emailsInputValue]);
    }
    hideAddOrEditEmailInput();
  };

  const updateEmail =
    (index: number): (() => void) =>
    (): void => {
      if (
        emailsInputValue &&
        !isReadOnly &&
        !emails.includes(emailsInputValue)
      ) {
        const updatedEmails = [...emails];
        updatedEmails[index] = emailsInputValue;
        handleEmailsChange(updatedEmails);
      }
    };

  const deleteEmail =
    (index: number): (() => void) =>
    (): void => {
      if (!isReadOnly) {
        const updatedEmails = emails.filter((_, idx) => idx !== index);
        handleEmailsChange(updatedEmails);
      }
    };

  return (
    <div className="dataSpace-editor panel dataSpace-editor--dark">
      <CustomSelectorInput
        options={TAB_OPTIONS}
        onChange={handleTabChange}
        value={TAB_OPTIONS.find((option) => option.value === selectedTab)}
        disabled={isReadOnly}
      />
      {selectedTab === DATASPACE_TAB.GENERAL && (
        <PanelFormSection>
          <div className="panel__content__form">
            <div className="panel__content__form__section">
              <PanelFormTextField
                name="Data Space Title"
                value={dataSpaceElement.title ?? ''}
                prompt="Data Space title is the user facing name for the Data Space. It's used in downstream applications as the default identifier for this Data Space. When not provided, the DataSpace name property is used."
                update={handleTitleChange}
                placeholder="Enter title"
              />
            </div>
          </div>
          <div className="panel__content__form">
            <div className="panel__content__form__section">
              <PanelFormTextField
                name="Data Space Description"
                value={dataSpaceElement.description ?? ''}
                update={handleDescriptionChange}
                placeholder="Enter Description"
              />
            </div>
          </div>
        </PanelFormSection>
      )}

      <PanelFormSection>
        <div className="panel__content__form">
          <PanelFormListItems title="Support Information">
            <CustomSelectorInput
              options={SUPPORT_INFO_TYPE_OPTIONS}
              onChange={handleSupportInfoTypeChange}
              value={SUPPORT_INFO_TYPE_OPTIONS.find(
                (option) => option.value === selectedSupportInfoType,
              )}
              disabled={isReadOnly}
            />
            {selectedSupportInfoType === SUPPORT_INFO_TYPE.EMAIL && (
              <>
                <PanelFormTextField
                  name="Support Email"
                  value={supportEmail}
                  update={handleSupportEmailChange}
                  placeholder="Enter support email"
                />
                <PanelFormTextField
                  name="Documentation URL"
                  value={documentationUrl}
                  update={handleDocumentationUrlChange}
                  placeholder="Enter documentation URL"
                />
              </>
            )}
            {selectedSupportInfoType === SUPPORT_INFO_TYPE.COMBINED_INFO && (
              <>
                <PanelFormListItems title="Support Emails">
                  {emails.map((email, index) => (
                    <div
                      key={email}
                      className={
                        showEmailsEditInput === index
                          ? 'panel__content__form__section__list__new-item'
                          : 'panel__content__form__section__list__item'
                      }
                    >
                      {showEmailsEditInput === index ? (
                        <>
                          <input
                            title="emai Input"
                            className="panel__content__form__section__input panel__content__form__section__list__new-item__input"
                            spellCheck={false}
                            disabled={isReadOnly}
                            value={emailsInputValue}
                            onChange={changeEmailInputValue}
                          />
                          <div className="panel__content__form__section__list__new-item__actions">
                            <button
                              title="savebtn"
                              className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                              disabled={
                                isReadOnly || emails.includes(emailsInputValue)
                              }
                              onClick={updateEmail(index)}
                              tabIndex={-1}
                            >
                              Save
                            </button>
                            <button
                              title="cancelbtn"
                              className="panel__content__form__section__list__new-item__cancel-btn btn btn--dark"
                              disabled={isReadOnly}
                              onClick={hideAddOrEditEmailInput}
                              tabIndex={-1}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="panel__content__form__section__list__item__value">
                            {email}
                          </div>
                          <div className="panel__content__form__section__list__item__actions">
                            <button
                              title="showbtn"
                              className="panel__content__form__section__list__item__edit-btn"
                              disabled={isReadOnly}
                              onClick={() => setShowEmailsEditInput(index)}
                              tabIndex={-1}
                            >
                              <PencilIcon />
                            </button>
                            <button
                              title="deletebtn"
                              className="panel__content__form__section__list__item__remove-btn"
                              disabled={isReadOnly}
                              onClick={deleteEmail(index)}
                              tabIndex={-1}
                            >
                              <TimesIcon />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {showEmailsEditInput === true && (
                    <div className="panel__content__form__section__list__new-item">
                      <input
                        title="email input"
                        className="panel__content__form__section__input panel__content__form__section__list__new-item__input"
                        spellCheck={false}
                        disabled={isReadOnly}
                        value={emailsInputValue}
                        onChange={changeEmailInputValue}
                      />
                      <div className="panel__content__form__section__list__new-item__actions">
                        <button
                          title="addbtn"
                          className="panel__content__form__section__list__new-item__add-btn btn btn--dark"
                          disabled={
                            isReadOnly || emails.includes(emailsInputValue)
                          }
                          onClick={addEmail}
                          tabIndex={-1}
                        >
                          Add
                        </button>
                        <button
                          title="deletebtn"
                          className="panel__content__form__section__list__new-item__cancel-btn btn btn--dark"
                          disabled={isReadOnly}
                          onClick={hideAddOrEditEmailInput}
                          tabIndex={-1}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {emails.length === 0 && showEmailsEditInput !== true && (
                    <div className="service-editor__owner__validation">
                      <ErrorIcon />
                      <div className="service-editor__owner__validation-label">
                        Add at least one email
                      </div>
                    </div>
                  )}
                </PanelFormListItems>
                <PanelFormTextField
                  name="Website URL"
                  value={websiteUrl}
                  update={handleWebsiteUrlChange}
                  placeholder="Enter website URL"
                />
                <PanelFormTextField
                  name="FAQ URL"
                  value={faqUrl}
                  update={handleFaqUrlChange}
                  placeholder="Enter FAQ URL"
                />
                <PanelFormTextField
                  name="Support URL"
                  value={supportUrl}
                  update={handleSupportUrlChange}
                  placeholder="Enter support URL"
                />
                <PanelFormTextField
                  name="Documentation URL"
                  value={documentationUrl}
                  update={handleDocumentationUrlChange}
                  placeholder="Enter documentation URL"
                />
              </>
            )}
          </PanelFormListItems>
          {/* <PanelFormListItems> */}
          <CustomSelectorInput
            options={executionContextOptions}
            onChange={handleExecutionContextChange}
            value={executionContextOptions.find(
              (option) =>
                option.value === dataSpaceElement.defaultExecutionContext,
            )}
            disabled={isReadOnly}
            title="Select Execution Context"
            placeholder="Select Execution Context"
          />
        </div>
      </PanelFormSection>
      <div className="dataSpace-editor panel dataSpace-editor--dark">
        <CustomSelectorInput
          options={executionContextOptions}
          onChange={handleExecutionContextChange}
          value={executionContextOptions.find(
            (option) =>
              option.value === dataSpaceElement.defaultExecutionContext,
          )}
          disabled={isReadOnly}
          title="Select Execution Context"
          placeholder="Select Execution Context"
        />
      </div>

      {dataSpaceEditorState.selectedTab === DATASPACE_TAB.EXECUTION_CONTEXT && (
        <DataSpaceExecutionContextTab
          dataSpaceEditorState={dataSpaceEditorState}
        />
      )}
    </div>
  );
});
