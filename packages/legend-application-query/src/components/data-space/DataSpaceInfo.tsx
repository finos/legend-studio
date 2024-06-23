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
import { StoreProjectData } from '@finos/legend-server-depot';
import { observer } from 'mobx-react-lite';
import { type QueryEditorStore } from '../../stores/QueryEditorStore.js';
import {
  type DataSpace,
  type DataSpaceExecutionContext,
  DataSpaceSupportEmail,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl,
} from '../../__lib__/LegendQueryNavigation.js';
import { flowResult } from 'mobx';
import { assertErrorThrown } from '@finos/legend-shared';
import {
  ConnectionPointer,
  RelationalDatabaseConnection,
} from '@finos/legend-graph';

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
    const projectInfo = editorStore.getProjectInfo();
    const visitElement = async (path: string): Promise<void> => {
      try {
        if (projectInfo) {
          const project = StoreProjectData.serialization.fromJson(
            await editorStore.depotServerClient.getProject(
              projectInfo.groupId,
              projectInfo.artifactId,
            ),
          );
          editorStore.applicationStore.navigationService.navigator.visitAddress(
            EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl(
              editorStore.applicationStore.config.studioApplicationUrl,
              project.projectId,
              path,
            ),
          );
        }
      } catch (error) {
        assertErrorThrown(error);
        editorStore.applicationStore.notificationService.notifyError(
          `Can't visit element of path: '${path}'`,
        );
      }
    };

    const connection =
      executionContext.defaultRuntime.value.runtimeValue.connections[0]
        ?.storeConnections[0]?.connection instanceof ConnectionPointer
        ? executionContext.defaultRuntime.value.runtimeValue.connections[0]
            ?.storeConnections[0]?.connection
        : undefined;

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
              {projectInfo && (
                <div className="dataspace-info-modal__field">
                  <div className="dataspace-info-modal__field__label">
                    Project
                  </div>
                  <div
                    className="dataspace-info-modal__field__value dataspace-info-modal__field__value--linkable"
                    onClick={() => {
                      try {
                        editorStore.applicationStore.navigationService.navigator.visitAddress(
                          EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
                            editorStore.applicationStore.config
                              .studioApplicationUrl,
                            projectInfo.groupId,
                            projectInfo.artifactId,
                            projectInfo.versionId,
                            undefined,
                          ),
                        );
                      } catch (error) {
                        assertErrorThrown(error);
                        editorStore.applicationStore.notificationService.notifyError(
                          `Can't visit project: '${projectInfo.groupId}:${projectInfo.artifactId}:${projectInfo.versionId}'`,
                        );
                      }
                    }}
                  >
                    {`${projectInfo.groupId}:${projectInfo.artifactId}:${projectInfo.versionId}`}
                  </div>
                </div>
              )}
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
                    flowResult(
                      visitElement(executionContext.mapping.value.path),
                    )
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
                  className="dataspace-info-modal__field__value dataspace-info-modal__field__value--linkable"
                  onClick={() =>
                    flowResult(
                      visitElement(executionContext.defaultRuntime.value.path),
                    )
                  }
                >
                  {executionContext.defaultRuntime.value.name}
                </div>
              </div>
              {connection && (
                <>
                  {connection.store && (
                    <div className="dataspace-info-modal__field">
                      <div className="dataspace-info-modal__field__label">
                        Store
                      </div>
                      <div
                        className="dataspace-info-modal__field__value  dataspace-info-modal__field__value--linkable"
                        onClick={() => {
                          if (connection.store) {
                            flowResult(
                              visitElement(connection.store.value.path),
                            );
                          }
                        }}
                      >
                        {connection.store.value.name}
                      </div>
                    </div>
                  )}
                  <div className="dataspace-info-modal__field">
                    <div className="dataspace-info-modal__field__label">
                      Connection
                    </div>
                    <div
                      className="dataspace-info-modal__field__value  dataspace-info-modal__field__value--linkable"
                      onClick={() =>
                        flowResult(
                          visitElement(
                            connection.packageableConnection.value.path,
                          ),
                        )
                      }
                    >
                      {connection.packageableConnection.value
                        .connectionValue instanceof RelationalDatabaseConnection
                        ? `${connection.packageableConnection.value.name}:${connection.packageableConnection.value.connectionValue.type}`
                        : connection.packageableConnection.value.name}
                    </div>
                  </div>
                </>
              )}
              <div className="dataspace-info-modal__field">
                <div className="dataspace-info-modal__field__label">
                  Configuration
                </div>
                <div
                  className="dataspace-info-modal__field__value dataspace-info-modal__field__value--linkable"
                  onClick={() => flowResult(visitElement(dataspace.path))}
                >
                  Show Dataspace Configuration
                </div>
              </div>
              {dataspace.supportInfo instanceof DataSpaceSupportEmail && (
                <div className="dataspace-info-modal__field">
                  <div className="dataspace-info-modal__field__label">
                    Support Email
                  </div>
                  <a
                    className="dataspace-info-modal__field__value dataspace-info-modal__field__value--linkable"
                    href={`mailto:${dataspace.supportInfo.address}`}
                  >
                    {dataspace.supportInfo.address}
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
