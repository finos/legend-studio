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

import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { ServicePureExecutionState } from '../../../../stores/editor/editor-state/element-editor-state/service/ServiceExecutionState.js';
import {
  Dialog,
  PanelLoadingIndicator,
  PlayIcon,
  ControlledDropdownMenu,
  MenuContent,
  CaretDownIcon,
  MenuContentItem,
  PauseCircleIcon,
  PencilIcon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
} from '@finos/legend-art';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  returnUndefOnError,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  type Service,
  KeyedExecutionParameter,
  MultiExecutionParameters,
  PureExecution,
} from '@finos/legend-graph';
import {
  type QueryBuilderState,
  ServiceQueryBuilderState,
  LambdaParameterValuesEditor,
  QueryBuilderTextEditorMode,
  QueryLoaderDialog,
  ExecutionPlanViewer,
  QueryBuilderAdvancedWorkflowState,
  QueryBuilderActionConfig,
} from '@finos/legend-query-builder';
import { ProjectViewerEditorMode } from '../../../../stores/project-view/ProjectViewerEditorMode.js';
import { useLegendStudioApplicationStore } from '../../../LegendStudioFrameworkProvider.js';
import {
  SNAPSHOT_ALIAS,
  SNAPSHOT_VERSION_ALIAS,
} from '@finos/legend-server-depot';
import type { ProjectGAVCoordinates } from '@finos/legend-storage';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { EXTERNAL_APPLICATION_NAVIGATION__generateServiceQueryCreatorUrl } from '../../../../__lib__/LegendStudioNavigation.js';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';
import { pureExecution_setFunction } from '../../../../stores/graph-modifier/DSL_Service_GraphModifierHelper.js';
import { ServiceEditorState } from '../../../../stores/editor/editor-state/element-editor-state/service/ServiceEditorState.js';

const ServiceExecutionResultViewer = observer(
  (props: { executionState: ServicePureExecutionState }) => {
    const { executionState } = props;
    const applicationStore = executionState.editorStore.applicationStore;
    // execution
    const executionResultText = executionState.executionResultText;
    const closeExecutionResultViewer = (): void =>
      executionState.setExecutionResultText(undefined);

    return (
      <Dialog
        open={Boolean(executionResultText)}
        onClose={closeExecutionResultViewer}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="editor-modal"
        >
          <ModalHeader title="Execution Result" />
          <ModalBody>
            <CodeEditor
              inputValue={executionResultText ?? ''}
              isReadOnly={true}
              language={CODE_EDITOR_LANGUAGE.JSON}
            />
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              className="modal__footer__close-btn"
              onClick={closeExecutionResultViewer}
              text="Close"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

export const ServiceExecutionQueryEditor = observer(
  (props: {
    executionState: ServicePureExecutionState;
    isReadOnly: boolean;
  }) => {
    const { executionState, isReadOnly } = props;
    const applicationStore = useLegendStudioApplicationStore();
    const editorStore = useEditorStore();
    const queryState = executionState.queryState;
    const embeddedQueryBuilderState = editorStore.embeddedQueryBuilderState;
    const service = executionState.serviceEditorState.service;
    // actions
    const editWithQueryBuilder = (openInTextMode = false): (() => void) =>
      applicationStore.guardUnhandledError(async () => {
        const selectedExecutionState =
          executionState.selectedExecutionContextState;
        await flowResult(
          embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration({
            setupQueryBuilderState: async (): Promise<QueryBuilderState> => {
              const sourceInfo = {
                service: service.path,
                ...editorStore.editorMode.getSourceInfo(),
              };
              const queryBuilderState = new ServiceQueryBuilderState(
                embeddedQueryBuilderState.editorStore.applicationStore,
                embeddedQueryBuilderState.editorStore.graphManagerState,
                QueryBuilderAdvancedWorkflowState.INSTANCE,
                QueryBuilderActionConfig.INSTANCE,
                service,
                undefined,
                selectedExecutionState?.executionContext instanceof
                KeyedExecutionParameter
                  ? selectedExecutionState.executionContext.key
                  : undefined,
                undefined,
                undefined,
                embeddedQueryBuilderState.editorStore.applicationStore.config.options.queryBuilderConfig,
                sourceInfo,
              );
              queryBuilderState.initializeWithQuery(
                executionState.execution.func,
              );
              if (openInTextMode) {
                queryBuilderState.textEditorState.openModal(
                  QueryBuilderTextEditorMode.TEXT,
                );
              }
              return queryBuilderState;
            },
            actionConfigs: [
              {
                key: 'save-query-btn',
                renderer: (
                  queryBuilderState: QueryBuilderState,
                ): React.ReactNode => {
                  const save = applicationStore.guardUnhandledError(
                    async () => {
                      try {
                        const rawLambda = queryBuilderState.buildQuery();
                        await flowResult(
                          executionState.queryState.updateLamba(rawLambda),
                        );
                        applicationStore.notificationService.notifySuccess(
                          `Service query is updated`,
                        );
                        embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration(
                          undefined,
                        );
                      } catch (error) {
                        assertErrorThrown(error);
                        applicationStore.notificationService.notifyError(
                          `Can't save query: ${error.message}`,
                        );
                      }
                    },
                  );

                  return (
                    <button
                      className="query-builder__dialog__header__custom-action"
                      tabIndex={-1}
                      disabled={isReadOnly}
                      onClick={save}
                    >
                      Save Query
                    </button>
                  );
                },
              },
            ],
            disableCompile: true,
          }),
        );
        executionState.setOpeningQueryEditor(false);
        return;
      });

    const importQuery = (): void =>
      queryState.queryLoaderState.setQueryLoaderDialogOpen(true);

    const runQuery = applicationStore.guardUnhandledError(() =>
      flowResult(executionState.handleRunQuery()),
    );

    const executionIsRunning =
      executionState.isRunningQuery || executionState.isGeneratingPlan;

    const cancelQuery = applicationStore.guardUnhandledError(() =>
      flowResult(executionState.cancelQuery()),
    );

    const generatePlan = applicationStore.guardUnhandledError(() =>
      flowResult(executionState.generatePlan(false)),
    );

    const debugPlanGeneration = applicationStore.guardUnhandledError(() =>
      flowResult(executionState.generatePlan(true)),
    );

    const openQueryInLegendQuery = (): void => {
      if (!applicationStore.config.queryApplicationUrl) {
        return;
      }
      let projectGAV: ProjectGAVCoordinates;
      if (editorStore.editorMode instanceof ProjectViewerEditorMode) {
        const viewerEditorMode = editorStore.editorMode;
        // for Achive mode
        if (viewerEditorMode.viewerStore.projectGAVCoordinates) {
          projectGAV = viewerEditorMode.viewerStore.projectGAVCoordinates;
        } else {
          // for other viewer modes, if no version we use project `HEAD`
          projectGAV = {
            groupId:
              editorStore.projectConfigurationEditorState
                .currentProjectConfiguration.groupId,
            artifactId:
              editorStore.projectConfigurationEditorState
                .currentProjectConfiguration.artifactId,
            versionId:
              viewerEditorMode.viewerStore.version?.id.id ??
              SNAPSHOT_VERSION_ALIAS,
          };
        }
      } else {
        const currentWorkSpaceId =
          editorStore.sdlcState.currentWorkspace?.workspaceId;
        projectGAV = {
          groupId:
            editorStore.projectConfigurationEditorState
              .currentProjectConfiguration.groupId,
          artifactId:
            editorStore.projectConfigurationEditorState
              .currentProjectConfiguration.artifactId,
          versionId: editorStore.sdlcState.projectPublishedVersions.includes(
            `${currentWorkSpaceId}-${SNAPSHOT_ALIAS}`,
          )
            ? `${currentWorkSpaceId}-${SNAPSHOT_ALIAS}`
            : SNAPSHOT_VERSION_ALIAS,
        };
      }
      applicationStore.navigationService.navigator.visitAddress(
        EXTERNAL_APPLICATION_NAVIGATION__generateServiceQueryCreatorUrl(
          applicationStore.config.queryApplicationUrl,
          projectGAV.groupId,
          projectGAV.artifactId,
          projectGAV.versionId,
          service.path,
        ),
      );
    };

    // convert to string
    useEffect(() => {
      flowResult(
        queryState.convertLambdaObjectToGrammarString({ pretty: true }),
      ).catch(applicationStore.alertUnhandledError);
    }, [applicationStore, queryState]);

    return (
      <div className="panel service-execution-query-editor">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label service-editor__execution__label--query">
              query
            </div>
          </div>
          <div className="panel__header__actions">
            <div className="btn__dropdown-combo btn__dropdown-combo--primary">
              <button
                className="btn__dropdown-combo__label"
                onClick={editWithQueryBuilder()}
                title="Edit Query"
                tabIndex={-1}
              >
                <PencilIcon className="btn__dropdown-combo__label__icon" />
                <div className="btn__dropdown-combo__label__title">
                  Edit Query
                </div>
              </button>
              <ControlledDropdownMenu
                className="btn__dropdown-combo__dropdown-btn"
                content={
                  <MenuContent>
                    <MenuContentItem
                      className="btn__dropdown-combo__option"
                      onClick={editWithQueryBuilder(true)}
                    >
                      Text Mode
                    </MenuContentItem>
                  </MenuContent>
                }
                menuProps={{
                  anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                  transformOrigin: { vertical: 'top', horizontal: 'right' },
                }}
              >
                <CaretDownIcon />
              </ControlledDropdownMenu>
            </div>
            <div className="btn__dropdown-combo btn__dropdown-combo--primary">
              {executionState.isRunningQuery ? (
                <button
                  className="btn__dropdown-combo__canceler"
                  onClick={cancelQuery}
                  tabIndex={-1}
                >
                  <div className="btn--dark btn--caution btn__dropdown-combo__canceler__label">
                    <PauseCircleIcon className="btn__dropdown-combo__canceler__label__icon" />
                    <div className="btn__dropdown-combo__canceler__label__title">
                      Stop
                    </div>
                  </div>
                </button>
              ) : (
                <>
                  <button
                    className="btn__dropdown-combo__label"
                    onClick={runQuery}
                    title="Run Query"
                    disabled={executionIsRunning}
                    tabIndex={-1}
                  >
                    <PlayIcon className="btn__dropdown-combo__label__icon" />
                    <div className="btn__dropdown-combo__label__title">
                      Run Query
                    </div>
                  </button>
                  <ControlledDropdownMenu
                    className="btn__dropdown-combo__dropdown-btn"
                    disabled={executionIsRunning}
                    content={
                      <MenuContent>
                        <MenuContentItem
                          className="btn__dropdown-combo__option"
                          onClick={generatePlan}
                        >
                          Generate Plan
                        </MenuContentItem>
                        <MenuContentItem
                          className="btn__dropdown-combo__option"
                          onClick={debugPlanGeneration}
                        >
                          Debug
                        </MenuContentItem>
                      </MenuContent>
                    }
                    menuProps={{
                      anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                      transformOrigin: { vertical: 'top', horizontal: 'right' },
                    }}
                  >
                    <CaretDownIcon />
                  </ControlledDropdownMenu>
                </>
              )}
            </div>
            <ControlledDropdownMenu
              className="btn__dropdown-combo"
              disabled={executionIsRunning}
              content={
                <MenuContent>
                  <MenuContentItem
                    className="btn__dropdown-combo__option"
                    onClick={importQuery}
                  >
                    Import Query
                  </MenuContentItem>
                  <MenuContentItem
                    className="btn__dropdown-combo__option"
                    onClick={openQueryInLegendQuery}
                    disabled={!applicationStore.config.queryApplicationUrl}
                  >
                    Create an Ad-hoc Query
                  </MenuContentItem>
                </MenuContent>
              }
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
              }}
            >
              <div className="btn__dropdown-combo__label">
                <div className="btn__dropdown-combo__label__title">
                  Advanced
                </div>
              </div>
              <div className="btn__dropdown-combo__dropdown-btn">
                <CaretDownIcon />
              </div>
            </ControlledDropdownMenu>
          </div>
        </div>
        <div className="panel__content property-mapping-editor__entry__container">
          <PanelLoadingIndicator
            isLoading={
              executionState.isOpeningQueryEditor || executionIsRunning
            }
          />
          <div className="service-execution-query-editor__content">
            <CodeEditor
              inputValue={queryState.lambdaString}
              isReadOnly={true}
              language={CODE_EDITOR_LANGUAGE.PURE}
            />
          </div>
          {queryState.queryLoaderState.isQueryLoaderDialogOpen && (
            <QueryLoaderDialog
              queryLoaderState={queryState.queryLoaderState}
              title="import query"
            />
          )}
          <ExecutionPlanViewer
            executionPlanState={executionState.executionPlanState}
          />
          <ServiceExecutionResultViewer executionState={executionState} />
          {executionState.parametersState.parameterValuesEditorState
            .showModal && (
            <LambdaParameterValuesEditor
              graph={executionState.editorStore.graphManagerState.graph}
              observerContext={
                executionState.editorStore.changeDetectionState.observerContext
              }
              lambdaParametersState={executionState.parametersState}
            />
          )}
        </div>
      </div>
    );
  },
);

export const queryService = async (
  service: Service,
  editorStore: EditorStore,
): Promise<void> => {
  const embeddedQueryBuilderState = editorStore.embeddedQueryBuilderState;
  const applicationStore = editorStore.applicationStore;
  const execution =
    service.execution instanceof PureExecution ? service.execution : undefined;
  const selectedExec =
    execution instanceof MultiExecutionParameters
      ? execution.singleExecutionParameters[0]?.key
      : undefined;
  const sourceInfo = {
    service: service.path,
    ...editorStore.editorMode.getSourceInfo(),
  };
  await flowResult(
    embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration({
      setupQueryBuilderState: async (): Promise<QueryBuilderState> => {
        const queryBuilderState = new ServiceQueryBuilderState(
          embeddedQueryBuilderState.editorStore.applicationStore,
          embeddedQueryBuilderState.editorStore.graphManagerState,
          QueryBuilderAdvancedWorkflowState.INSTANCE,
          QueryBuilderActionConfig.INSTANCE,
          service,
          undefined,
          selectedExec,
          undefined,
          undefined,
          embeddedQueryBuilderState.editorStore.applicationStore.config.options.queryBuilderConfig,
          sourceInfo,
        );
        if (execution) {
          queryBuilderState.initializeWithQuery(execution.func);
        }
        return queryBuilderState;
      },
      actionConfigs: [
        {
          key: 'save-query-btn',
          renderer: (queryBuilderState: QueryBuilderState): React.ReactNode => {
            const save = applicationStore.guardUnhandledError(async () => {
              try {
                const rawLambda = queryBuilderState.buildQuery();
                const serviceState = returnUndefOnError(() =>
                  editorStore.tabManagerState.getCurrentEditorState(
                    ServiceEditorState,
                  ),
                );
                if (
                  serviceState?.service === service &&
                  serviceState.executionState instanceof
                    ServicePureExecutionState
                ) {
                  await flowResult(
                    serviceState.executionState.queryState.updateLamba(
                      rawLambda,
                    ),
                  );
                } else {
                  pureExecution_setFunction(
                    guaranteeNonNullable(
                      execution,
                      'Service execution expected to be a pure execution',
                    ),
                    rawLambda,
                  );
                }
                applicationStore.notificationService.notifySuccess(
                  `Service query is updated`,
                );
                embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration(
                  undefined,
                );
              } catch (error) {
                assertErrorThrown(error);
                applicationStore.notificationService.notifyError(
                  `Can't save query: ${error.message}`,
                );
              }
            });
            return (
              <button
                className="query-builder__dialog__header__custom-action"
                tabIndex={-1}
                disabled={editorStore.disableGraphEditing}
                onClick={save}
              >
                Save Query
              </button>
            );
          },
        },
      ],
    }),
  );
};
