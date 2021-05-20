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

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import Dialog from '@material-ui/core/Dialog';
import {
  generateViewProjectRoute,
  generateViewVersionRoute,
} from '../../../stores/Router';
import {
  PanelLoadingIndicator,
  CustomSelectorInput,
} from '@finos/legend-studio-components';
import { useApplicationStore } from '../../../stores/ApplicationStore';
import { useEditorStore } from '../../../stores/EditorStore';
import { FiShare } from 'react-icons/fi';
import type { Version } from '../../../models/sdlc/models/version/Version';

const ShareModal = observer(
  (props: { open: boolean; closeModal: () => void }) => {
    const { open, closeModal } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const versions = editorStore.sdlcState.projectVersions;
    const isDispatchingAction = editorStore.sdlcState.isFetchingProjectVersions;
    const isFetchingProject = editorStore.sdlcState.isFetchingProject;
    const [selectedVersion, setSelectedVersion] =
      useState<Version | undefined>();
    const urlBase = window.location.origin;
    const projectId = editorStore.sdlcState.currentProjectId;
    const projectLink = selectedVersion
      ? `${urlBase}${applicationStore.historyApiClient.createHref({
          pathname: generateViewVersionRoute(
            applicationStore.config.sdlcServerKey,
            projectId,
            selectedVersion.id.id,
          ),
        })}`
      : `${urlBase}${applicationStore.historyApiClient.createHref({
          pathname: generateViewProjectRoute(
            applicationStore.config.sdlcServerKey,
            projectId,
          ),
        })}`;
    const copyProjectLink = (): void => {
      applicationStore
        .copyTextToClipboard(projectLink)
        .then(() =>
          applicationStore.notifySuccess('Copied project link to clipboard'),
        )
        .catch(applicationStore.alertIllegalUnhandledError)
        .finally(() => closeModal());
    };
    const renderOptions = versions.map((version) => ({
      label: version.id.id,
      value: version,
    }));
    const onSelectionChange = (
      val: { label: string; value: Version } | null,
    ): void => setSelectedVersion(val?.value);

    return (
      <Dialog onClose={closeModal} open={open}>
        <div className="modal modal--dark modal--no-padding">
          <PanelLoadingIndicator isLoading={isDispatchingAction} />
          <div className="modal__body">
            <div className="share-project__modal__info-entry">
              <div className="share-project__modal__info-entry__title">
                Version:
              </div>
              <div className="share-project__modal__info-entry__value">
                {versions.length > 0 ? (
                  <div className="share-project__modal__select">
                    <CustomSelectorInput
                      className="setup-selector__input"
                      options={renderOptions}
                      disabled={isDispatchingAction || !versions.length}
                      onChange={onSelectionChange}
                      value={
                        selectedVersion
                          ? {
                              label: selectedVersion.id.id,
                              value: selectedVersion,
                            }
                          : null
                      }
                      darkMode={true}
                    />
                  </div>
                ) : (
                  'Project has only one version'
                )}
              </div>
            </div>
            <div className="share-project__modal__info-entry">
              <div className="share-project__modal__info-entry__title">
                Link:
              </div>
              <div className="share-project__modal__info-entry__value">
                <a href={projectLink} target="_blank" rel="noopener noreferrer">
                  {projectLink}
                </a>
              </div>
            </div>
          </div>
          <div className="modal__footer">
            <button
              className="btn--wide btn--dark"
              disabled={isFetchingProject}
              onClick={copyProjectLink}
            >
              Copy Link
            </button>
          </div>
        </div>
      </Dialog>
    );
  },
);

export const ShareProjectHeaderAction = observer(() => {
  const editorStore = useEditorStore();
  const [openShareModal, setOpenShareModal] = useState(false);
  const showShareModal = (): void => setOpenShareModal(true);
  const hideShareModal = (): void => setOpenShareModal(false);

  return (
    <div className="app__header__action">
      <button
        className="share-project__btn"
        disabled={!editorStore.sdlcState.currentProject}
        title="Share..."
        onClick={showShareModal}
      >
        <FiShare />
      </button>
      {editorStore.sdlcState.currentProject && (
        <ShareModal open={openShareModal} closeModal={hideShareModal} />
      )}
    </div>
  );
});
