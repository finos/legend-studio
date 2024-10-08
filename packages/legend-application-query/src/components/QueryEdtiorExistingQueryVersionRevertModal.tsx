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
  BlankPanelContent,
  Modal,
  ModalBody,
  CustomSelectorInput,
  ModalFooter,
  ModalFooterButton,
} from '@finos/legend-art';
import { LATEST_VERSION_ALIAS } from '@finos/legend-server-depot';
import { compareSemVerVersions } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useState, useEffect } from 'react';
import { buildVersionOption, type VersionOption } from './QuerySetup.js';
import { generateExistingQueryEditorRoute } from '../__lib__/LegendQueryNavigation.js';
import type { ExistingQueryEditorStore } from '../stores/QueryEditorStore.js';

export const QueryEditorExistingQueryVersionRevertModal = observer(
  (props: { existingEditorStore: ExistingQueryEditorStore }) => {
    const { existingEditorStore } = props;
    const updateState = existingEditorStore.updateState;
    const applicationStore = existingEditorStore.applicationStore;
    const [queryVersion, setQueryVersion] = useState<string | undefined>(
      existingEditorStore.lightQuery.originalVersionId,
    );
    const versionOptions = [
      LATEST_VERSION_ALIAS,
      ...updateState.projectVersions,
    ]
      .slice()
      .sort((v1, v2) => compareSemVerVersions(v2, v1))
      .map(buildVersionOption);
    const selectedVersionOption = queryVersion
      ? buildVersionOption(queryVersion)
      : null;
    const onVersionOptionChange = (option: VersionOption | null) => {
      if (option?.value && option.value !== queryVersion) {
        setQueryVersion(option.value);
      }
    };
    const updateQueryVersionId = applicationStore.guardUnhandledError(
      async (): Promise<void> => {
        if (queryVersion) {
          flowResult(
            updateState.updateQueryVersionId(
              existingEditorStore.lightQuery.id,
              queryVersion,
            ),
          )
            .then(() =>
              updateState.editorStore.applicationStore.navigationService.navigator.goToLocation(
                generateExistingQueryEditorRoute(
                  existingEditorStore.lightQuery.id,
                ),
              ),
            )
            .catch(applicationStore.alertUnhandledError);
        }
      },
    );
    useEffect(() => {
      flowResult(
        updateState.fetchProjectVersions(
          existingEditorStore.lightQuery.groupId,
          existingEditorStore.lightQuery.artifactId,
        ),
      ).catch(applicationStore.alertUnhandledError);
    }, [
      applicationStore,
      existingEditorStore.lightQuery.artifactId,
      existingEditorStore.lightQuery.groupId,
      updateState,
    ]);

    return (
      <BlankPanelContent>
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="query-editor__blocking-alert"
        >
          <ModalBody>
            <div className="query-editor__blocking-alert__summary-text">
              Query is incompatible with version `
              {existingEditorStore.lightQuery.versionId}`.
              {existingEditorStore.lightQuery.originalVersionId && (
                <>
                  {' '}
                  It was initialized with version `
                  {existingEditorStore.lightQuery.originalVersionId}`.
                </>
              )}
              <div className="query-editor__blocking-alert__summary-text">
                Choose one version from dropdown to update query version.
              </div>
            </div>
            <CustomSelectorInput
              className="query-editor__version-selector"
              options={versionOptions}
              isLoading={updateState.fetchProjectVersionState.isInProgress}
              onChange={onVersionOptionChange}
              value={selectedVersionOption}
              placeholder={
                updateState.fetchProjectVersionState.isInProgress
                  ? 'Fetching project versions'
                  : 'Choose a version'
              }
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
            />
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton onClick={updateQueryVersionId} text="Update" />
          </ModalFooter>
        </Modal>
      </BlankPanelContent>
    );
  },
);
