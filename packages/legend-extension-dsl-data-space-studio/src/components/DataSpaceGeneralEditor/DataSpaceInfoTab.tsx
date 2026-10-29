/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  EditorForm,
  EditorFormSection,
  useEditorStore,
} from '@finos/legend-application-studio';
import { CheckSquareIcon, clsx, SquareIcon } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { DataSpaceEditorState } from '../../stores/DataSpaceEditorState.js';
import { DataSpaceRelatedDataSpacesSection } from './DataSpaceRelatedDataSpacesSection.js';

const StatusCheckbox = (props: {
  label: string;
  hint: string;
  checked: boolean;
  isReadOnly: boolean;
  onChange: (value: boolean) => void;
}): React.ReactNode => (
  <button
    className={clsx('dataSpace-editor-checkbox', {
      'dataSpace-editor-checkbox--checked': props.checked,
    })}
    role="checkbox"
    aria-checked={props.checked}
    disabled={props.isReadOnly}
    onClick={(): void => props.onChange(!props.checked)}
  >
    {props.checked ? <CheckSquareIcon /> : <SquareIcon />}
    <span className="dataSpace-editor-checkbox__text">
      <span className="dataSpace-editor-checkbox__label">{props.label}</span>
      <span className="dataSpace-editor-checkbox__hint">{props.hint}</span>
    </span>
  </button>
);

export const DataSpaceInfoTab = observer(() => {
  const editorStore = useEditorStore();
  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const isReadOnly = dataSpaceState.isReadOnly;
  const deprecationNotice = dataSpaceState.deprecationNotice;

  return (
    <EditorForm>
      <EditorFormSection
        title="Status"
        description="How this data space is marked."
      >
        <div className="dataSpace-editor-checkboxes">
          <StatusCheckbox
            label="Verified"
            hint="Marks this data space as verified."
            checked={dataSpaceState.isVerified}
            isReadOnly={isReadOnly}
            onChange={(value): void => dataSpaceState.toggleVerified(value)}
          />
          <StatusCheckbox
            label="In development"
            hint="Marks this data space as still in development."
            checked={dataSpaceState.isInDevelopment}
            isReadOnly={isReadOnly}
            onChange={(value): void =>
              dataSpaceState.toggleInDevelopment(value)
            }
          />
          <StatusCheckbox
            label="External"
            hint="Marks this data space as externally sourced."
            checked={dataSpaceState.isExternal}
            isReadOnly={isReadOnly}
            onChange={(value): void => dataSpaceState.toggleExternal(value)}
          />
        </div>
      </EditorFormSection>
      <EditorFormSection
        title="Deprecation"
        description="A notice marks the data space as deprecated. Say what to use instead."
      >
        <label className="dataSpace-editor-field">
          <span className="dataSpace-editor-field__label">Notice</span>
          <textarea
            className="input input--dark dataSpace-editor-field__textarea"
            spellCheck={false}
            disabled={isReadOnly}
            rows={2}
            value={deprecationNotice ?? ''}
            onChange={(event): void =>
              dataSpaceState.setDeprecationNotice(
                event.target.value || undefined,
              )
            }
            placeholder="Leave empty unless the data space is deprecated, e.g. 'Use model::NewDataSpace instead.'"
          />
        </label>
        {deprecationNotice && (
          <div className="dataSpace-editor-notice-preview">
            <span className="dataSpace-editor-notice-preview__label">
              Deprecated
            </span>
            {deprecationNotice}
          </div>
        )}
      </EditorFormSection>
      <DataSpaceRelatedDataSpacesSection />
    </EditorForm>
  );
});
