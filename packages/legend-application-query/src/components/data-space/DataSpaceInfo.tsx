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
import { type QueryEditorStore } from '../../stores/QueryEditorStore.js';
import {
  type DataSpace,
  type DataSpaceExecutionContext,
  DataSpaceQueryBuilderState,
  DataSpaceSupportEmail,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateTaxonomyDataspaceViewUrl,
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

    const dataSpaceAnalysisResult =
      editorStore.queryBuilderState instanceof DataSpaceQueryBuilderState
        ? editorStore.queryBuilderState.dataSpaceAnalysisResult
        : undefined;
    const dataSpaceMedata = dataSpaceAnalysisResult?.executionContextsIndex.get(
      executionContext.name,
    )?.runtimeMetadata;
    const connection =
      executionContext.defaultRuntime.value.runtimeValue.connections.length > 0
        ? executionContext.defaultRuntime.value.runtimeValue.connections[0]
            ?.storeConnections?.[0]?.connection instanceof ConnectionPointer
          ? executionContext.defaultRuntime.value.runtimeValue.connections[0]
              ?.storeConnections?.[0]?.connection
          : undefined
        : undefined;
    const connectionPath = connection
      ? connection.packageableConnection.value.path
      : dataSpaceMedata
        ? dataSpaceMedata.connectionPath
        : undefined;
    const connectionType =
      connection &&
      connection.packageableConnection.value.connectionValue instanceof
        RelationalDatabaseConnection
        ? connection.packageableConnection.value.connectionValue.type
        : dataSpaceMedata
          ? dataSpaceMedata.connectionType
          : undefined;
    const storePath =
      connection?.store?.value.path ?? dataSpaceMedata?.storePath;

    const openInTaxonomy = (): void => {
      if (
        projectInfo &&
        editorStore.applicationStore.config.taxonomyApplicationUrl
      ) {
        editorStore.applicationStore.navigationService.navigator.visitAddress(
          EXTERNAL_APPLICATION_NAVIGATION__generateTaxonomyDataspaceViewUrl(
            editorStore.applicationStore.config.taxonomyApplicationUrl,
            projectInfo.groupId,
            projectInfo.artifactId,
            projectInfo.versionId,
            dataspace.path,
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
          <div className="dataspace-info-modal__header">
            <ModalTitle title="About Dataspace" />
            <button
              className="btn--dark dataspace-info-modal__header__open-btn"
              title="Close"
              disabled={
                !(
                  editorStore.applicationStore.config.taxonomyApplicationUrl &&
                  projectInfo
                )
              }
              onClick={openInTaxonomy}
            >
              Open Dataspace
            </button>
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
                  {dataspace.title ?? dataspace.name}
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
              {(connection || dataSpaceMedata) && (
                <>
                  {storePath && (
                    <div className="dataspace-info-modal__field">
                      <div className="dataspace-info-modal__field__label">
                        Store
                      </div>
                      <div
                        className="dataspace-info-modal__field__value dataspace-info-modal__field__value--linkable"
                        onClick={() => {
                          flowResult(visitElement(storePath));
                        }}
                      >
                        {connection?.store?.value.name ?? storePath}
                      </div>
                    </div>
                  )}
                  <div className="dataspace-info-modal__field">
                    <div className="dataspace-info-modal__field__label">
                      Connection
                    </div>
                    <div
                      className="dataspace-info-modal__field__value dataspace-info-modal__field__value--linkable"
                      onClick={() => {
                        if (connectionPath) {
                          flowResult(visitElement(connectionPath));
                        }
                      }}
                    >
                      {connection &&
                      connection.packageableConnection.value
                        .connectionValue instanceof RelationalDatabaseConnection
                        ? `${connection.packageableConnection.value.name}:${connection.packageableConnection.value.connectionValue.type}`
                        : connection
                          ? connection.packageableConnection.value.name
                          : connectionPath && connectionType
                            ? `${connectionPath}:${connectionType}`
                            : connectionPath
                              ? `${connectionPath}`
                              : `${connectionType}`}
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
