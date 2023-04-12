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

import { useEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import type {
  ServicePureExecutionQueryState,
  ServicePureExecutionState,
} from '../../../../stores/editor/editor-state/element-editor-state/service/ServiceExecutionState.js';
import {
  Dialog,
  type SelectComponent,
  BlankPanelContent,
  clsx,
  CustomSelectorInput,
  PanelLoadingIndicator,
  PlayIcon,
  DropdownMenu,
  MenuContent,
  CaretDownIcon,
  MenuContentItem,
  PauseCircleIcon,
  PencilIcon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  MoreVerticalIcon,
} from '@finos/legend-art';
import {
  assertErrorThrown,
  debounce,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  CODE_EDITOR_LANGUAGE,
  useApplicationStore,
} from '@finos/legend-application';
import {
  type LightQuery,
  isStubbed_PackageableElement,
  isStubbed_RawLambda,
  KeyedExecutionParameter,
} from '@finos/legend-graph';
import {
  type QueryBuilderState,
  ServiceQueryBuilderState,
  LambdaParameterValuesEditor,
  QueryBuilderTextEditorMode,
  ExecutionPlanViewer,
} from '@finos/legend-query-builder';
import { ProjectViewerEditorMode } from '../../../../stores/project-view/ProjectViewerEditorMode.js';
import { useLegendStudioApplicationStore } from '../../../LegendStudioBaseStoreProvider.js';
import { WorkspaceType } from '@finos/legend-server-sdlc';
import { SNAPSHOT_VERSION_ALIAS } from '@finos/legend-server-depot';
import type { ProjectGAVCoordinates } from '@finos/legend-storage';
import { CodeEditor } from '@finos/legend-lego/code-editor';

const ServiceExecutionResultViewer = observer(
  (props: { executionState: ServicePureExecutionState }) => {
    const { executionState } = props;
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
        <Modal darkMode={true} className="editor-modal">
          <ModalHeader title="Execution Result" />
          <ModalBody>
            <CodeEditor
              inputValue={executionResultText ?? ''}
              isReadOnly={true}
              language={CODE_EDITOR_LANGUAGE.JSON}
              showMiniMap={true}
            />
          </ModalBody>
          <ModalFooter>
            <button
              className="btn modal__footer__close-btn"
              onClick={closeExecutionResultViewer}
            >
              Close
            </button>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

type QueryOption = { label: string; value: LightQuery };
const buildQueryOption = (query: LightQuery): QueryOption => ({
  label: query.name,
  value: query,
});

const ServiceExecutionQueryImporter = observer(
  (props: { queryState: ServicePureExecutionQueryState }) => {
    const { queryState } = props;
    const applicationStore = useApplicationStore();
    const queryFinderRef = useRef<SelectComponent>(null);
    const closeQueryImporter = (): void =>
      queryState.setOpenQueryImporter(false);
    const handleEnterQueryImporter = (): void =>
      queryFinderRef.current?.focus();

    // query finder
    const [searchText, setSearchText] = useState('');
    const queryOptions = queryState.queries.map(buildQueryOption);
    const selectedQueryOption = queryState.selectedQueryInfo
      ? {
          label: queryState.selectedQueryInfo.query.name,
          value: queryState.selectedQueryInfo.query,
        }
      : null;
    const onQueryOptionChange = (option: QueryOption | null): void => {
      if (option?.value !== queryState.selectedQueryInfo?.query.id) {
        flowResult(queryState.setSelectedQueryInfo(option?.value)).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };
    const formatQueryOptionLabel = (option: QueryOption): React.ReactNode => (
      <div className="service-query-importer__query-option">
        <div className="service-query-importer__query-option__label">
          {option.label}
        </div>
        {Boolean(option.value.owner) && (
          <div
            className={clsx('service-query-importer__query-option__user', {
              'service-query-importer__query-option__user--mine':
                option.value.isCurrentUserQuery,
            })}
          >
            {option.value.isCurrentUserQuery ? 'mine' : option.value.owner}
          </div>
        )}
      </div>
    );

    const debouncedLoadQueries = useMemo(
      () =>
        debounce((input: string): void => {
          flowResult(queryState.loadQueries(input)).catch(
            applicationStore.alertUnhandledError,
          );
        }, 500),
      [applicationStore, queryState],
    );
    const onSearchTextChange = (value: string): void => {
      if (value !== searchText) {
        setSearchText(value);
        debouncedLoadQueries.cancel();
        debouncedLoadQueries(value);
      }
    };
    const importQuery = (): void => {
      flowResult(queryState.importQuery()).catch(
        applicationStore.alertUnhandledError,
      );
    };

    useEffect(() => {
      flowResult(queryState.loadQueries('')).catch(
        applicationStore.alertUnhandledError,
      );
    }, [queryState, applicationStore]);

    return (
      <Dialog
        open={queryState.openQueryImporter}
        onClose={closeQueryImporter}
        TransitionProps={{
          onEnter: handleEnterQueryImporter,
        }}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <Modal darkMode={true} className="search-modal">
          <ModalTitle title="Import Query" />
          <CustomSelectorInput
            ref={queryFinderRef}
            options={queryOptions}
            isLoading={queryState.loadQueriesState.isInProgress}
            onInputChange={onSearchTextChange}
            inputValue={searchText}
            onChange={onQueryOptionChange}
            value={selectedQueryOption}
            placeholder="Search for a query by name..."
            darkMode={true}
            isClearable={true}
            formatOptionLabel={formatQueryOptionLabel}
          />
          <div className="service-query-importer__query-preview">
            <PanelLoadingIndicator
              isLoading={queryState.loadQueryInfoState.isInProgress}
            />
            {queryState.selectedQueryInfo && (
              <CodeEditor
                inputValue={queryState.selectedQueryInfo.content}
                isReadOnly={true}
                language={CODE_EDITOR_LANGUAGE.PURE}
                showMiniMap={false}
                hideGutter={true}
              />
            )}
            {!queryState.selectedQueryInfo && (
              <BlankPanelContent>No query to preview</BlankPanelContent>
            )}
          </div>
          <div className="search-modal__actions">
            <button
              className="btn btn--dark"
              disabled={!queryState.selectedQueryInfo}
              onClick={importQuery}
            >
              Import
            </button>
          </div>
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
        if (selectedExecutionState?.executionContext.mapping === undefined) {
          applicationStore.notificationService.notifyError(
            'Editing query without runtime and mapping is unsupported via query builder, please leverage the text mode to edit query',
          );
          executionState.setOpeningQueryEditor(false);
        } else {
          const mapping = selectedExecutionState.executionContext.mapping.value;
          if (!isStubbed_PackageableElement(mapping)) {
            await flowResult(
              embeddedQueryBuilderState.setEmbeddedQueryBuilderConfiguration({
                setupQueryBuilderState: (): QueryBuilderState => {
                  const queryBuilderState = new ServiceQueryBuilderState(
                    embeddedQueryBuilderState.editorStore.applicationStore,
                    embeddedQueryBuilderState.editorStore.graphManagerState,
                    service,
                    undefined,
                    selectedExecutionState.executionContext instanceof
                    KeyedExecutionParameter
                      ? selectedExecutionState.executionContext.key
                      : undefined,
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
                disableCompile: isStubbed_RawLambda(
                  executionState.queryState.query,
                ),
              }),
            );
            executionState.setOpeningQueryEditor(false);
            return;
          }
          applicationStore.notificationService.notifyWarning(
            'Please specify a mapping and a runtime for the execution context to edit with query builder',
          );
          executionState.setOpeningQueryEditor(false);
        }
      });

    const importQuery = (): void => {
      queryState.setOpenQueryImporter(true);
    };

    const runQuery = applicationStore.guardUnhandledError(() =>
      flowResult(executionState.handleRunQuery()),
    );

    const executionIsRunning =
      executionState.isRunningQuery ||
      executionState.isGeneratingPlan ||
      executionState.isGeneratingPlan;

    const cancelQuery = (): void => {
      executionState.setIsRunningQuery(false);
      executionState.setQueryRunPromise(undefined);
    };

    const generatePlan = applicationStore.guardUnhandledError(() =>
      flowResult(executionState.generatePlan(false)),
    );

    const debugPlanGeneration = applicationStore.guardUnhandledError(() =>
      flowResult(executionState.generatePlan(true)),
    );

    const openQueryInLegendQuery = (): void => {
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
        projectGAV = {
          groupId:
            editorStore.projectConfigurationEditorState
              .currentProjectConfiguration.groupId,
          artifactId:
            editorStore.projectConfigurationEditorState
              .currentProjectConfiguration.artifactId,
          versionId: SNAPSHOT_VERSION_ALIAS,
        };
      }
      applicationStore.navigationService.navigator.visitAddress(
        executionState.generateServiceQueryCreatorRoute(
          guaranteeNonNullable(applicationStore.config.queryApplicationUrl),
          projectGAV.groupId,
          projectGAV.artifactId,
          projectGAV.versionId,
          service.path,
        ),
      );
    };

    const openQueryInServiceExtension = (): void => {
      applicationStore.navigationService.navigator.visitAddress(
        applicationStore.navigationService.navigator.generateAddress(
          executionState.generateProjectServiceQueryUpdaterRoute(
            editorStore.projectConfigurationEditorState
              .currentProjectConfiguration.projectId,

            editorStore.sdlcState.activeWorkspace.workspaceId,

            service.path,
          ),
        ),
      );
    };

    // convert to string
    useEffect(() => {
      flowResult(queryState.convertLambdaObjectToGrammarString(true)).catch(
        applicationStore.alertUnhandledError,
      );
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
            <div className="service-editor__execution__action-btn">
              <button
                className="service-editor__execution__action-btn__label service-editor__execution__action-btn__label--primary"
                onClick={editWithQueryBuilder()}
                title="Edit Query"
                tabIndex={-1}
              >
                <PencilIcon className="service-editor__execution__action-btn__label__icon" />
                <div className="service-editor__execution__action-btn__label__title">
                  Edit Query
                </div>
              </button>
              <DropdownMenu
                className="service-editor__execution__action-btn__dropdown-btn service-editor__execution__action-btn__dropdown-btn--primary"
                content={
                  <MenuContent>
                    <MenuContentItem
                      className="service-editor__execution__action-btn__option"
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
              </DropdownMenu>
            </div>
            {executionState.isRunningQuery ? (
              <button
                className="service-editor__execution__stop-btn"
                onClick={cancelQuery}
                tabIndex={-1}
              >
                <div className="btn--dark btn--caution service-editor__execution__stop-btn__label">
                  <PauseCircleIcon className="service-editor__execution__stop-btn__label__icon" />
                  <div className="service-editor__execution__stop-btn__label__title">
                    Stop
                  </div>
                </div>
              </button>
            ) : (
              <div className="service-editor__execution__action-btn">
                <button
                  className="service-editor__execution__action-btn__label"
                  onClick={runQuery}
                  title="Run Query"
                  disabled={executionIsRunning}
                  tabIndex={-1}
                >
                  <PlayIcon className="service-editor__execution__action-btn__label__icon" />
                  <div className="service-editor__execution__action-btn__label__title">
                    Run Query
                  </div>
                </button>
                <DropdownMenu
                  className="service-editor__execution__action-btn__dropdown-btn"
                  disabled={executionIsRunning}
                  content={
                    <MenuContent>
                      <MenuContentItem
                        className="service-editor__execution__action-btn__option"
                        onClick={generatePlan}
                      >
                        Generate Plan
                      </MenuContentItem>
                      <MenuContentItem
                        className="service-editor__execution__action-btn__option"
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
                </DropdownMenu>
              </div>
            )}
            <div>
              <DropdownMenu
                className="service-editor__execution__advanced-btn"
                disabled={executionIsRunning}
                content={
                  <MenuContent>
                    <MenuContentItem
                      className="service-editor__execution__advanced-btn__option"
                      onClick={importQuery}
                    >
                      Import Query
                    </MenuContentItem>
                    <MenuContentItem
                      className="service-editor__execution__advanced-btn__option"
                      onClick={openQueryInLegendQuery}
                      disabled={!applicationStore.config.queryApplicationUrl}
                    >
                      Open in Legend Query
                    </MenuContentItem>
                    <MenuContentItem
                      className="service-editor__execution__advanced-btn__option"
                      onClick={openQueryInServiceExtension}
                      disabled={
                        editorStore.sdlcState.currentWorkspace
                          ?.workspaceType !== WorkspaceType.GROUP
                      }
                    >
                      Open in Service Extension
                    </MenuContentItem>
                  </MenuContent>
                }
                menuProps={{
                  anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                  transformOrigin: { vertical: 'top', horizontal: 'right' },
                }}
              >
                <div className="service-editor__execution__advanced-btn__label">
                  <MoreVerticalIcon className="service-editor__execution__advanced-btn__label__icon" />
                  Advanced
                </div>
                <div className="service-editor__execution__advanced-btn__icon">
                  <CaretDownIcon />
                </div>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div className="panel__content property-mapping-editor__entry__container">
          <PanelLoadingIndicator
            isLoading={
              executionState.isOpeningQueryEditor || executionIsRunning
            }
          />
          <div
            className="service-execution-query-editor__content"
            title="Double click to edit in query builder"
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              editWithQueryBuilder()();
            }}
          >
            <CodeEditor
              inputValue={queryState.lambdaString}
              isReadOnly={true}
              language={CODE_EDITOR_LANGUAGE.PURE}
              showMiniMap={true}
            />
          </div>
          <ExecutionPlanViewer
            executionPlanState={executionState.executionPlanState}
          />
          <ServiceExecutionResultViewer executionState={executionState} />
          {queryState.openQueryImporter && (
            <ServiceExecutionQueryImporter queryState={queryState} />
          )}
          {executionState.parameterState.parameterValuesEditorState
            .showModal && (
            <LambdaParameterValuesEditor
              graph={executionState.editorStore.graphManagerState.graph}
              observerContext={
                executionState.editorStore.changeDetectionState.observerContext
              }
              lambdaParametersState={executionState.parameterState}
            />
          )}
        </div>
      </div>
    );
  },
);
