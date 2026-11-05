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

import { clsx, PlusIcon, TimesIcon, WarningIcon } from '@finos/legend-art';
import {
  DataSpaceSupportEmail,
  DataSpaceSupportCombinedInfo,
} from '@finos/legend-extension-dsl-data-space/graph';
import { observer } from 'mobx-react-lite';
import {
  dataSpace_email_setSupportInfoEmail,
  dataSpace_setDocumentationUrl,
  dataSpace_combined_setWebsite,
  dataSpace_combined_setFaqUrl,
  dataSpace_combined_setSupportUrl,
  dataSpace_combined_addEmail,
  dataSpace_combined_deleteEmail,
  dataSpace_setSupportInfo,
} from '../../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import {
  EditorFormSection,
  useEditorStore,
} from '@finos/legend-application-studio';
import { DataSpaceEditorState } from '../../stores/DataSpaceEditorState.js';
import { useState } from 'react';

type SupportInfoKind = 'none' | 'email' | 'combined';

const SupportLinkField = (props: {
  label: string;
  value: string | undefined;
  placeholder: string;
  isReadOnly: boolean;
  onChange: (value: string) => void;
}): React.ReactNode => (
  <label className="dataSpace-editor-field">
    <span className="dataSpace-editor-field__label">{props.label}</span>
    <input
      className="input input--dark dataSpace-editor-field__input"
      spellCheck={false}
      disabled={props.isReadOnly}
      value={props.value ?? ''}
      onChange={(event): void => props.onChange(event.target.value)}
      placeholder={props.placeholder}
    />
  </label>
);

export const DataSpaceSupportInfoSection = observer(() => {
  const editorStore = useEditorStore();
  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const dataSpace = dataSpaceState.dataSpace;
  const isReadOnly = dataSpaceState.isReadOnly;
  const supportInfo = dataSpace.supportInfo;
  const [newEmail, setNewEmail] = useState('');

  const kind: SupportInfoKind =
    supportInfo instanceof DataSpaceSupportCombinedInfo
      ? 'combined'
      : supportInfo instanceof DataSpaceSupportEmail
        ? 'email'
        : 'none';

  const changeKind = (type: SupportInfoKind): void => {
    if (type === kind) {
      return;
    }
    if (type === 'combined') {
      const combined = new DataSpaceSupportCombinedInfo();
      if (supportInfo instanceof DataSpaceSupportEmail) {
        combined.emails = supportInfo.address ? [supportInfo.address] : [];
        combined.documentationUrl = supportInfo.documentationUrl;
      }
      dataSpace_setSupportInfo(dataSpace, combined);
    } else if (type === 'email') {
      const email = new DataSpaceSupportEmail();
      if (supportInfo instanceof DataSpaceSupportCombinedInfo) {
        email.address = supportInfo.emails?.[0] ?? '';
        email.documentationUrl = supportInfo.documentationUrl;
      }
      dataSpace_setSupportInfo(dataSpace, email);
    } else {
      dataSpace_setSupportInfo(dataSpace, undefined);
    }
  };
  const addEmail = (): void => {
    const email = newEmail.trim();
    if (
      email &&
      supportInfo instanceof DataSpaceSupportCombinedInfo &&
      !supportInfo.emails?.includes(email)
    ) {
      dataSpace_combined_addEmail(supportInfo, email);
    }
    setNewEmail('');
  };
  // the single-email form is kept for data spaces that already use it
  const kinds: { kind: SupportInfoKind; label: string }[] = [
    { kind: 'none', label: 'None' },
    ...(kind === 'email'
      ? [{ kind: 'email' as const, label: 'Email only' }]
      : []),
    { kind: 'combined', label: 'Contacts and links' },
  ];

  return (
    <EditorFormSection
      title="Support"
      description="Who to contact about this data space, and where to read more."
    >
      <div className="dataSpace-editor-segmented dataSpace-editor-segmented--large">
        {kinds.map((option) => (
          <button
            key={option.kind}
            className={clsx('dataSpace-editor-segmented__option', {
              'dataSpace-editor-segmented__option--active':
                kind === option.kind,
            })}
            disabled={isReadOnly}
            aria-pressed={kind === option.kind}
            onClick={(): void => changeKind(option.kind)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {supportInfo instanceof DataSpaceSupportCombinedInfo && (
        <>
          <div className="dataSpace-editor-field">
            <span className="dataSpace-editor-field__label">Contacts</span>
            <div className="dataSpace-editor-chips">
              {(supportInfo.emails ?? []).map((email) => (
                <span key={email} className="dataSpace-editor-chips__chip">
                  {email}
                  {!isReadOnly && (
                    <button
                      className="dataSpace-editor-chips__remove"
                      onClick={(): void =>
                        dataSpace_combined_deleteEmail(supportInfo, email)
                      }
                      title={`Remove ${email}`}
                    >
                      <TimesIcon />
                    </button>
                  )}
                </span>
              ))}
              {!isReadOnly && (
                <span className="dataSpace-editor-chips__new">
                  <input
                    className="dataSpace-editor-chips__input"
                    type="email"
                    spellCheck={false}
                    value={newEmail}
                    onChange={(event): void => setNewEmail(event.target.value)}
                    onKeyDown={(event): void => {
                      if (event.key === 'Enter') {
                        addEmail();
                      }
                    }}
                    placeholder="Add an email, then Enter"
                  />
                  {newEmail && (
                    <button
                      className="dataSpace-editor-chips__add"
                      onClick={addEmail}
                      title="Add this email"
                    >
                      <PlusIcon />
                    </button>
                  )}
                </span>
              )}
            </div>
            {!supportInfo.emails?.length && (
              <span className="dataSpace-editor-field__error">
                <WarningIcon />
                At least one email is required
              </span>
            )}
          </div>
          <div className="dataSpace-editor-grid">
            <SupportLinkField
              label="Documentation"
              value={supportInfo.documentationUrl}
              placeholder="https://"
              isReadOnly={isReadOnly}
              onChange={(value): void =>
                dataSpace_setDocumentationUrl(supportInfo, value)
              }
            />
            <SupportLinkField
              label="Website"
              value={supportInfo.website}
              placeholder="https://"
              isReadOnly={isReadOnly}
              onChange={(value): void =>
                dataSpace_combined_setWebsite(supportInfo, value)
              }
            />
            <SupportLinkField
              label="FAQ"
              value={supportInfo.faqUrl}
              placeholder="https://"
              isReadOnly={isReadOnly}
              onChange={(value): void =>
                dataSpace_combined_setFaqUrl(supportInfo, value)
              }
            />
            <SupportLinkField
              label="Support page"
              value={supportInfo.supportUrl}
              placeholder="https://"
              isReadOnly={isReadOnly}
              onChange={(value): void =>
                dataSpace_combined_setSupportUrl(supportInfo, value)
              }
            />
          </div>
        </>
      )}
      {supportInfo instanceof DataSpaceSupportEmail && (
        <div className="dataSpace-editor-grid">
          <SupportLinkField
            label="Email"
            value={supportInfo.address}
            placeholder="team@example.com"
            isReadOnly={isReadOnly}
            onChange={(value): void =>
              dataSpace_email_setSupportInfoEmail(supportInfo, value)
            }
          />
          <SupportLinkField
            label="Documentation"
            value={supportInfo.documentationUrl}
            placeholder="https://"
            isReadOnly={isReadOnly}
            onChange={(value): void =>
              dataSpace_setDocumentationUrl(supportInfo, value)
            }
          />
        </div>
      )}
      {!supportInfo && (
        <div className="dataSpace-editor-table__empty">
          No support information: people who open this data space won&apos;t see
          who to contact.
        </div>
      )}
    </EditorFormSection>
  );
});
