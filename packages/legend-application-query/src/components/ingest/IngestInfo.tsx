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
  LATEST_VERSION_ALIAS,
  StoreProjectData,
  VersionedProjectData,
} from '@finos/legend-server-depot';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import { assertErrorThrown } from '@finos/legend-shared';
import { LakehouseRuntime } from '@finos/legend-graph';
import type { QueryEditorStore } from '../../stores/QueryEditorStore.js';
import type { IngestLegendQueryBuilderState } from '../../stores/ingest/IngestLegendQueryBuilderState.js';
import { EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl } from '../../__lib__/LegendQueryNavigation.js';

/**
 * "About Ingest" info modal, mirroring `QueryEditorDataProductInfoModal`.
 * Surfaces the project GAV, the ingest name + currently selected data set,
 * the adhoc lakehouse runtime (environment + warehouse), and a link to the
 * ingest definition's configuration in Studio.
 */
export const QueryEditorIngestInfoModal = observer(
  (props: {
    editorStore: QueryEditorStore;
    queryBuilderState: IngestLegendQueryBuilderState;
    open: boolean;
    closeModal: () => void;
  }) => {
    const { editorStore, queryBuilderState, open, closeModal } = props;
    const projectInfo = editorStore.getProjectInfo();
    const ingestDefinition = queryBuilderState.ingestDefinition;
    const lakehouseRuntime = queryBuilderState.lakehouseRuntime;

    /**
     * Open the given element path (or the project root if `undefined`) in
     * Studio's SDLC project view. Mirrors `DataProductInfo.visitElement`.
     */
    const visitElement = async (path: string | undefined): Promise<void> => {
      try {
        if (projectInfo) {
          const project = StoreProjectData.serialization.fromJson(
            await editorStore.depotServerClient.getProject(
              projectInfo.groupId,
              projectInfo.artifactId,
            ),
          );
          const versionId =
            projectInfo.versionId === LATEST_VERSION_ALIAS
              ? VersionedProjectData.serialization.fromJson(
                  await editorStore.depotServerClient.getLatestVersion(
                    projectInfo.groupId,
                    projectInfo.artifactId,
                  ),
                ).versionId
              : projectInfo.versionId;
          editorStore.applicationStore.navigationService.navigator.visitAddress(
            EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl(
              editorStore.applicationStore.config.studioApplicationUrl,
              project.projectId,
              versionId,
              path,
            ),
          );
        }
      } catch (error) {
        assertErrorThrown(error);
        editorStore.applicationStore.notificationService.notifyError(
          path
            ? `Can't visit element of path: '${path}'`
            : `Can't visit project`,
        );
      }
    };

    return (
      <Dialog
        open={open}
        onClose={closeModal}
        classes={{ container: 'dataspace-info-modal__container' }}
        slotProps={{
          paper: {
            classes: { root: 'dataspace-info-modal__inner-container' },
          },
        }}
      >
        <Modal
          darkMode={
            !editorStore.applicationStore.layoutService
              .TEMPORARY__isLightColorThemeEnabled
          }
          className="dataspace-info-modal"
        >
          <div className="dataspace-info-modal__header">
            <ModalTitle title="About Ingest" />
          </div>
          <Panel>
            <PanelFullContent>
              {projectInfo && (
                <div className="dataspace-info-modal__field">
                  <div className="dataspace-info-modal__field__label">
                    Project
                  </div>
                  <div
                    className="dataspace-info-modal__field__value dataspace-info-modal__field__value--linkable"
                    onClick={() => flowResult(visitElement(undefined))}
                  >
                    {`${projectInfo.groupId}:${projectInfo.artifactId}:${projectInfo.versionId}`}
                  </div>
                </div>
              )}
              <div className="dataspace-info-modal__field">
                <div className="dataspace-info-modal__field__label">Name</div>
                <div className="dataspace-info-modal__field__value">
                  {ingestDefinition.name}
                </div>
              </div>
              <div className="dataspace-info-modal__field">
                <div className="dataspace-info-modal__field__label">Path</div>
                <div className="dataspace-info-modal__field__value">
                  {ingestDefinition.path}
                </div>
              </div>
              {queryBuilderState.dataSet && (
                <div className="dataspace-info-modal__field">
                  <div className="dataspace-info-modal__field__label">
                    Data Set
                  </div>
                  <div className="dataspace-info-modal__field__value">
                    {queryBuilderState.dataSet}
                  </div>
                </div>
              )}
              {lakehouseRuntime instanceof LakehouseRuntime && (
                <>
                  {lakehouseRuntime.environment && (
                    <div className="dataspace-info-modal__field">
                      <div className="dataspace-info-modal__field__label">
                        Environment
                      </div>
                      <div className="dataspace-info-modal__field__value">
                        {lakehouseRuntime.environment}
                      </div>
                    </div>
                  )}
                  {lakehouseRuntime.warehouse && (
                    <div className="dataspace-info-modal__field">
                      <div className="dataspace-info-modal__field__label">
                        Warehouse
                      </div>
                      <div className="dataspace-info-modal__field__value">
                        {lakehouseRuntime.warehouse}
                      </div>
                    </div>
                  )}
                </>
              )}
              <div className="dataspace-info-modal__field">
                <div className="dataspace-info-modal__field__label">
                  Configuration
                </div>
                <div
                  className="dataspace-info-modal__field__value dataspace-info-modal__field__value--linkable"
                  onClick={() =>
                    flowResult(visitElement(ingestDefinition.path))
                  }
                >
                  Show Ingest Configuration
                </div>
              </div>
            </PanelFullContent>
          </Panel>
        </Modal>
      </Dialog>
    );
  },
);
