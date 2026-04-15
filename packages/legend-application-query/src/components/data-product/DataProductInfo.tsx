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
  isSnapshotVersion,
  SNAPSHOT_VERSION_ALIAS,
  StoreProjectData,
  VersionedProjectData,
} from '@finos/legend-server-depot';
import { observer } from 'mobx-react-lite';
import { type QueryEditorStore } from '../../stores/QueryEditorStore.js';
import {
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateMarketplaceDataProductUrl,
} from '../../__lib__/LegendQueryNavigation.js';
import { flowResult } from 'mobx';
import { assertErrorThrown } from '@finos/legend-shared';
import {
  type DataProduct,
  FunctionAccessPoint,
  LakehouseAccessPoint,
  LakehouseRuntime,
} from '@finos/legend-graph';
import {
  type DataProductQueryBuilderState,
  ModelAccessPointDataProductExecutionState,
} from '@finos/legend-query-builder';
import { LegendQueryDataProductQueryBuilderState } from '../../stores/data-product/query-builder/LegendQueryDataProductQueryBuilderState.js';

export const QueryEditorDataProductInfoModal = observer(
  (props: {
    editorStore: QueryEditorStore;
    dataProduct: DataProduct;
    queryBuilderState: DataProductQueryBuilderState;
    open: boolean;
    closeModal: () => void;
  }) => {
    const { editorStore, dataProduct, queryBuilderState, open, closeModal } =
      props;
    const projectInfo = editorStore.getProjectInfo();
    const executionState = queryBuilderState.executionState;

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

    const accessPointGroup =
      executionState instanceof ModelAccessPointDataProductExecutionState
        ? executionState.exectionValue
        : undefined;
    const mapping = executionState.mapping;
    const selectedRuntime =
      executionState instanceof ModelAccessPointDataProductExecutionState
        ? executionState.selectedRuntime
        : undefined;
    const accessPoints = accessPointGroup?.accessPoints ?? [];
    const supportEmails = dataProduct.supportInfo?.emails ?? [];

    const deploymentId =
      queryBuilderState.dataProductArtifact?.dataProduct.deploymentId;
    const versionId = projectInfo?.versionId;
    const isSnapshotVer =
      versionId !== undefined &&
      (isSnapshotVersion(versionId) || versionId === SNAPSHOT_VERSION_ALIAS);
    const marketplaceUrl = isSnapshotVer
      ? editorStore.applicationStore.config.marketplaceProductionParallelUrl
      : editorStore.applicationStore.config.marketplaceApplicationUrl;
    const canOpenInMarketplace =
      queryBuilderState instanceof LegendQueryDataProductQueryBuilderState &&
      deploymentId !== undefined &&
      marketplaceUrl !== undefined;

    const openInMarketplace = (): void => {
      if (canOpenInMarketplace && marketplaceUrl && deploymentId) {
        editorStore.applicationStore.navigationService.navigator.visitAddress(
          EXTERNAL_APPLICATION_NAVIGATION__generateMarketplaceDataProductUrl(
            marketplaceUrl,
            dataProduct.name,
            deploymentId,
          ),
        );
      }
    };

    const getAccessPointTypeLabel = (
      ap: (typeof accessPoints)[number],
    ): string => {
      if (ap instanceof FunctionAccessPoint) {
        return 'Function';
      }
      if (ap instanceof LakehouseAccessPoint) {
        return 'Lakehouse';
      }
      return 'Unknown';
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
            <ModalTitle title="About Data Product" />
            {canOpenInMarketplace && (
              <button
                className="btn--dark dataspace-info-modal__header__open-btn"
                title="Open Data Product in Marketplace"
                onClick={openInMarketplace}
              >
                Open Data Product
              </button>
            )}
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
                  {dataProduct.title ?? dataProduct.name}
                </div>
              </div>
              {accessPointGroup && (
                <div className="dataspace-info-modal__field">
                  <div className="dataspace-info-modal__field__label">
                    Access Point Group
                  </div>
                  <div className="dataspace-info-modal__field__value">
                    {accessPointGroup.title ?? accessPointGroup.id}
                  </div>
                </div>
              )}
              {mapping && (
                <div className="dataspace-info-modal__field">
                  <div className="dataspace-info-modal__field__label">
                    Mapping
                  </div>
                  <div
                    className="dataspace-info-modal__field__value dataspace-info-modal__field__value--linkable"
                    onClick={() => flowResult(visitElement(mapping.path))}
                  >
                    {mapping.name}
                  </div>
                </div>
              )}
              {selectedRuntime &&
                selectedRuntime.runtimeValue instanceof LakehouseRuntime && (
                  <>
                    {selectedRuntime.runtimeValue.environment && (
                      <div className="dataspace-info-modal__field">
                        <div className="dataspace-info-modal__field__label">
                          Environment
                        </div>
                        <div className="dataspace-info-modal__field__value">
                          {selectedRuntime.runtimeValue.environment}
                        </div>
                      </div>
                    )}
                    {selectedRuntime.runtimeValue.warehouse && (
                      <div className="dataspace-info-modal__field">
                        <div className="dataspace-info-modal__field__label">
                          Warehouse
                        </div>
                        <div className="dataspace-info-modal__field__value">
                          {selectedRuntime.runtimeValue.warehouse}
                        </div>
                      </div>
                    )}
                  </>
                )}
              {accessPoints.length > 0 && (
                <>
                  {accessPoints.map((ap) => (
                    <div className="dataspace-info-modal__field" key={ap.id}>
                      <div className="dataspace-info-modal__field__label">
                        Access Point
                      </div>
                      <div className="dataspace-info-modal__field__value">
                        {`${ap.title ?? ap.id} (${getAccessPointTypeLabel(ap)})`}
                      </div>
                    </div>
                  ))}
                </>
              )}
              <div className="dataspace-info-modal__field">
                <div className="dataspace-info-modal__field__label">
                  Configuration
                </div>
                <div
                  className="dataspace-info-modal__field__value dataspace-info-modal__field__value--linkable"
                  onClick={() => flowResult(visitElement(dataProduct.path))}
                >
                  Show Data Product Configuration
                </div>
              </div>
              {supportEmails.map((email) => (
                <div
                  className="dataspace-info-modal__field"
                  key={email.address}
                >
                  <div className="dataspace-info-modal__field__label">
                    Support Email
                  </div>
                  <a
                    className="dataspace-info-modal__field__value dataspace-info-modal__field__value--linkable"
                    href={`mailto:${email.address}`}
                  >
                    {email.address}
                  </a>
                </div>
              ))}
            </PanelFullContent>
          </Panel>
        </Modal>
      </Dialog>
    );
  },
);
