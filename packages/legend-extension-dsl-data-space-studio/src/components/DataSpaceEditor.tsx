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
import { PanelFormSection, PanelFormTextField } from '@finos/legend-art';
import { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';
import {
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
  DataSpaceSupportCombinedInfo,
  DataSpaceSupportEmail,
} from '@finos/legend-extension-dsl-data-space/graph';
import { useEffect, useRef } from 'react';

const SUPPORT_INFO_TYPE_OPTIONS = [
  { label: 'Support Email', value: 'Email' },
  { label: 'Combined Info', value: 'CombinedInfo' },
];

interface Option {
  value: string;
  label: string;
}

export const DataSpaceEditor = observer(() => {
  const editorStore = useEditorStore();
  const typeNameRef = useRef<HTMLInputElement>(null);
  const dataSpaceEditorState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const isReadOnly = dataSpaceEditorState.isReadOnly;
  const dataSpaceElement = dataSpaceEditorState.dataSpace;

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

  const handleSupportEmailChange = (value: string | undefined) => {
    dataSpaceElement.supportInfo instanceof DataSpaceSupportEmail
      ? set_email(dataSpaceElement.supportInfo, value ?? '')
      : undefined;
  };

  const handleEmailsChange = (
    index: number,
    emailsProp: string | undefined,
  ) => {
    if (dataSpaceElement.supportInfo instanceof DataSpaceSupportCombinedInfo) {
      const emails = dataSpaceElement.supportInfo.emails ?? [];
      if (emailsProp === undefined) {
        emails.splice(index, 1);
      } else {
        emails[index] = emailsProp;
      }
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
    set_supportInfotype(dataSpaceElement, option.value);
  };

  const selectedSupportInfoType =
    dataSpaceElement.supportInfo instanceof DataSpaceSupportEmail
      ? 'Email'
      : 'CombinedInfo';

  const emails =
    dataSpaceElement.supportInfo instanceof DataSpaceSupportCombinedInfo
      ? (dataSpaceElement.supportInfo.emails ?? [])
      : [];

  const supportEmail =
    dataSpaceElement.supportInfo instanceof DataSpaceSupportEmail
      ? dataSpaceElement.supportInfo.address
      : '';

  const documentationUrl = dataSpaceElement.supportInfo?.documentationUrl ?? '';
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

  return (
    <div className="dataSpace-editor panel dataSpace-editor--dark">
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
            {selectedSupportInfoType === 'Email' && (
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
            {selectedSupportInfoType === 'CombinedInfo' && (
              <>
                <PanelFormListItems title="Support Emails">
                  {emails.map((email, index) => (
                    <PanelFormTextField
                      key={index}
                      name={`Support Email ${index + 1}`}
                      value={email}
                      update={(value) => handleEmailsChange(index, value)}
                      placeholder="Enter support email"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => handleEmailsChange(emails.length, '')}
                    disabled={isReadOnly}
                  >
                    Add Email
                  </button>
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
        </div>
      </PanelFormSection>
    </div>
  );
});
