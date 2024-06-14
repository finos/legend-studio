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
  Dialog,
  Modal,
  ModalTitle,
  Panel,
  PanelFullContent,
} from '@finos/legend-art';
import {
  MASTER_SNAPSHOT_ALIAS,
  SNAPSHOT_VERSION_ALIAS,
} from '@finos/legend-server-depot';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { type QueryEditorStore } from '../../stores/QueryEditorStore.js';
import type {
  DataSpace,
  DataSpaceExecutionContext,
} from '@finos/legend-extension-dsl-data-space/graph';
import { EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl } from '../../__lib__/LegendQueryNavigation.js';

export const QueryEditorDataspaceInfoModal = observer(
  (props: {
    editorStore: QueryEditorStore;
    dataspace: DataSpace;
    executionContext: DataSpaceExecutionContext;
    open: boolean;
    closeModal: () => void;
  }) => {
    const { editorStore, dataspace, executionContext, open, closeModal } =
      props;

    const visitElement = (path: string): void => {
      const projectInfo = editorStore.getProjectInfo();
      if (projectInfo) {
        editorStore.applicationStore.navigationService.navigator.visitAddress(
          EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
            editorStore.applicationStore.config.studioApplicationUrl,
            guaranteeNonNullable(projectInfo.groupId),
            guaranteeNonNullable(projectInfo.artifactId),
            projectInfo.versionId === MASTER_SNAPSHOT_ALIAS
              ? SNAPSHOT_VERSION_ALIAS
              : projectInfo.versionId,
            path,
          ),
        );
      }
    };

    return (
      <Dialog
        open={open}
        onClose={closeModal}
        classes={{ container: 'dataspace-info-modal__container' }}
        PaperProps={{
          classes: { root: 'dataspace-info-modal__inner-container' },
        }}
      >
        <Modal
          darkMode={
            !editorStore.applicationStore.layoutService
              .TEMPORARY__isLightColorThemeEnabled
          }
          className="dataspace-info-modal"
        >
          <ModalTitle title="About Dataspace" />
          <Panel>
            <PanelFullContent>
              <div className="dataspace-info-modal__field">
                <div className="dataspace-info-modal__field__label">Name</div>
                <div className="dataspace-info-modal__field__value">
                  {dataspace.title}
                </div>
              </div>
              <div className="dataspace-info-modal__field">
                <div className="dataspace-info-modal__field__label">
                  Execution Context
                </div>
                <div className="dataspace-info-modal__field__value">
                  {executionContext.name}
                </div>
              </div>
              <div className="dataspace-info-modal__field">
                <div className="dataspace-info-modal__field__label">
                  Mapping
                </div>
                <div
                  className="dataspace-info-modal__field__value dataspace-info-modal__field__value--linkable"
                  onClick={() =>
                    visitElement(executionContext.mapping.value.path)
                  }
                >
                  {executionContext.mapping.value.name}
                </div>
              </div>
              <div className="dataspace-info-modal__field">
                <div className="dataspace-info-modal__field__label">
                  Runtime
                </div>
                <div
                  className="dataspace-info-modal__field__value  dataspace-info-modal__field__value--linkable"
                  onClick={() =>
                    visitElement(executionContext.defaultRuntime.value.path)
                  }
                >
                  {executionContext.defaultRuntime.value.name}
                </div>
              </div>
              <div className="dataspace-info-modal__field">
                <div className="dataspace-info-modal__field__label">
                  Configuration
                </div>
                <div
                  className="dataspace-info-modal__field__value dataspace-info-modal__field__value--linkable"
                  onClick={() => visitElement(dataspace.path)}
                >
                  Show Dataspace Configuration
                </div>
              </div>
              {dataspace.supportInfo?.documentationUrl && (
                <div className="dataspace-info-modal__field">
                  <div className="dataspace-info-modal__field__label">
                    Support Email
                  </div>
                  <a
                    className="dataspace-info-modal__field__value dataspace-info-modal__field__value--linkable"
                    href={`mailto:${dataspace.supportInfo.documentationUrl}`}
                  >
                    {dataspace.supportInfo.documentationUrl}
                  </a>
                </div>
              )}
            </PanelFullContent>
          </Panel>
        </Modal>
      </Dialog>
    );
  },
);
