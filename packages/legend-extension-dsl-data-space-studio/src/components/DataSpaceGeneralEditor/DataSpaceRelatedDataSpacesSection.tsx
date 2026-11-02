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
  EditorFormSection,
  useEditorStore,
} from '@finos/legend-application-studio';
import { CustomSelectorInput, PlusIcon, TimesIcon } from '@finos/legend-art';
import { type ResolvedDataSpaceEntityWithOrigin } from '@finos/legend-extension-dsl-data-space/application';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { DataSpaceEditorState } from '../../stores/DataSpaceEditorState.js';

export const DataSpaceRelatedDataSpacesSection = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = editorStore.applicationStore;
  const darkMode =
    !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const isReadOnly = dataSpaceState.isReadOnly;
  const rows = dataSpaceState.relatedDataSpaceRows;
  const [isAdding, setIsAdding] = useState(false);

  return (
    <EditorFormSection
      title="Related data spaces"
      description="Other data spaces people may want, listed under Related Data Spaces."
    >
      {rows.length ? (
        <div className="dataSpace-editor-table dataSpace-editor-table--related">
          {rows.map((row) => (
            <div key={row.id} className="dataSpace-editor-table__row">
              <div className="dataSpace-editor-table__element">
                <span className="dataSpace-editor-table__element__name">
                  {row.label}
                </span>
              </div>
              <button
                className="dataSpace-editor-table__remove-btn"
                disabled={isReadOnly}
                onClick={(): void =>
                  dataSpaceState.removeRelatedDataSpaceRow(row)
                }
                title="Remove this related data space"
              >
                <TimesIcon />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="dataSpace-editor-table__empty">
          No related data spaces.
        </div>
      )}
      {isAdding ? (
        <div className="dataSpace-editor-add-picker">
          <CustomSelectorInput
            options={dataSpaceState.getRelatedDataSpaceOptions()}
            onChange={(option: {
              label: string;
              value: ResolvedDataSpaceEntityWithOrigin;
            }): void => {
              dataSpaceState.addRelatedDataSpace(option.value);
              setIsAdding(false);
            }}
            placeholder={
              dataSpaceState.loadRelatedDataSpacesState.isInProgress
                ? 'Loading data spaces...'
                : 'Choose a data space to add...'
            }
            isLoading={dataSpaceState.loadRelatedDataSpacesState.isInProgress}
            darkMode={darkMode}
            autoFocus={true}
            openMenuOnFocus={true}
          />
          <button
            className="dataSpace-editor-add-picker__cancel"
            onClick={(): void => setIsAdding(false)}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          className="dataSpace-editor-add-btn"
          disabled={isReadOnly}
          onClick={(): void => setIsAdding(true)}
        >
          <PlusIcon />
          Add related data space
        </button>
      )}
    </EditorFormSection>
  );
});
