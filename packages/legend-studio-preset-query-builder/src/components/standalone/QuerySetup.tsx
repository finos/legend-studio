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

import type {
  LightQuery,
  Mapping,
  PackageableElementSelectOption,
  PackageableRuntime,
  ProjectMetadata,
} from '@finos/legend-studio';
import { useApplicationStore } from '@finos/legend-studio';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BlankPanelContent,
  clsx,
  CustomSelectorInput,
  PanelLoadingIndicator,
  PencilIcon,
  PlusIcon,
  RobotIcon,
  UserIcon,
} from '@finos/legend-studio-components';
import { debounce } from '@finos/legend-studio-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { FaQuestionCircle } from 'react-icons/fa';
import {
  generateCreateQueryRoute,
  generateExistingQueryRoute,
  generateServiceQueryRoute,
} from '../../stores/LegendQueryRouter';
import type { ServiceExecutionOption } from '../../stores/QuerySetupStore';
import {
  CreateQuerySetupState,
  ExistingQuerySetupState,
  QuerySetupStoreProvider,
  ServiceQuerySetupState,
  useQuerySetupStore,
} from '../../stores/QuerySetupStore';
import {
  CreateQueryInfoState,
  ExistingQueryInfoState,
  ServiceQueryInfoState,
  useQueryStore,
} from '../../stores/QueryStore';

type QueryOption = { label: string; value: LightQuery };
const buildQueryOption = (query: LightQuery): QueryOption => ({
  label: query.name,
  value: query,
});

const ExistingQuerySetup = observer(
  (props: { querySetupState: ExistingQuerySetupState }) => {
    const { querySetupState } = props;
    const applicationStore = useApplicationStore();
    const setupStore = useQuerySetupStore();
    const queryStore = useQueryStore();
    const [searchText, setSearchText] = useState('');
    const back = (): void => {
      setupStore.setSetupState(undefined);
      querySetupState.setCurrentQuery(undefined);
      setupStore.queryStore.editorStore.graphState.resetGraph();
    };
    const next = (): void => {
      if (querySetupState.currentQuery) {
        queryStore.setQueryInfoState(
          new ExistingQueryInfoState(
            querySetupState.queryStore,
            querySetupState.currentQuery,
          ),
        );
        applicationStore.historyApiClient.push(
          generateExistingQueryRoute(querySetupState.currentQuery.id),
        );
      }
      setupStore.setSetupState(undefined);
    };
    const canProceed = querySetupState.currentQuery;

    // show current user queries only
    const toggleShowCurrentUserQueriesOnly = (): void => {
      querySetupState.setShowCurrentUserQueriesOnly(
        !querySetupState.showCurrentUserQueriesOnly,
      );
      flowResult(querySetupState.loadQueries(searchText)).catch(
        applicationStore.alertIllegalUnhandledError,
      );
    };

    // query
    const queryOptions = querySetupState.queries.map(buildQueryOption);
    const selectedQueryOption = querySetupState.currentQuery
      ? buildQueryOption(querySetupState.currentQuery)
      : null;
    const onQueryOptionChange = (option: QueryOption | null): void => {
      if (option?.value !== querySetupState.currentQuery?.id) {
        querySetupState.setCurrentQuery(option?.value.id);
      }
    };
    const formatQueryOptionLabel = (option: QueryOption): React.ReactNode => {
      const deleteQuery: React.MouseEventHandler<HTMLButtonElement> = (
        event,
      ) => {
        event.preventDefault();
        event.stopPropagation();
        queryStore.editorStore.graphState.graphManager
          .deleteQuery(option.value.id)
          .then(() =>
            flowResult(querySetupState.loadQueries('')).catch(
              applicationStore.alertIllegalUnhandledError,
            ),
          )
          .catch(applicationStore.alertIllegalUnhandledError);
      };
      if (option.value.id === querySetupState.currentQuery?.id) {
        return option.label;
      }
      return (
        <div className="query-setup__existing-query__query-option">
          <div className="query-setup__existing-query__query-option__label">
            {option.label}
          </div>
          {querySetupState.showCurrentUserQueriesOnly && (
            <button
              className="query-setup__existing-query__query-option__action"
              tabIndex={-1}
              onClick={deleteQuery}
            >
              Delete
            </button>
          )}
          {!querySetupState.showCurrentUserQueriesOnly &&
            Boolean(option.value.owner) && (
              <div
                className={clsx(
                  'query-setup__existing-query__query-option__user',
                  {
                    'query-setup__existing-query__query-option__user--mine':
                      option.value.isCurrentUserQuery,
                  },
                )}
              >
                {option.value.isCurrentUserQuery ? 'mine' : option.value.owner}
              </div>
            )}
        </div>
      );
    };

    // search text
    const debouncedLoadQueries = useMemo(
      () =>
        debounce((input: string): void => {
          flowResult(querySetupState.loadQueries(input)).catch(
            applicationStore.alertIllegalUnhandledError,
          );
        }, 500),
      [applicationStore, querySetupState],
    );
    const onSearchTextChange = (value: string): void => {
      if (value !== searchText) {
        setSearchText(value);
        debouncedLoadQueries.cancel();
        debouncedLoadQueries(value);
      }
    };

    useEffect(() => {
      flowResult(querySetupState.loadQueries('')).catch(
        applicationStore.alertIllegalUnhandledError,
      );
    }, [querySetupState, applicationStore]);

    return (
      <div className="query-setup__wizard query-setup__existing-query">
        <div className="query-setup__wizard__header query-setup__existing-query__header">
          <button
            className="query-setup__wizard__header__btn"
            onClick={back}
            title="Back to Main Menu"
          >
            <ArrowLeftIcon />
          </button>
          <div className="query-setup__wizard__header__title">
            Loading an existing query...
          </div>
          <button
            className={clsx('query-setup__wizard__header__btn', {
              'query-setup__wizard__header__btn--ready': canProceed,
            })}
            onClick={next}
            disabled={!canProceed}
            title="Proceed"
          >
            <ArrowRightIcon />
          </button>
        </div>
        <div className="query-setup__wizard__content">
          <div className="query-setup__wizard__group">
            <div className="query-setup__wizard__group__title">Query</div>
            <div className="query-setup__existing-query__input">
              <CustomSelectorInput
                className="query-setup__wizard__selector"
                options={queryOptions}
                isLoading={querySetupState.loadQueriesState.isInProgress}
                onInputChange={onSearchTextChange}
                inputValue={searchText}
                onChange={onQueryOptionChange}
                value={selectedQueryOption}
                placeholder="Search for query by name..."
                isClearable={true}
                escapeClearsValue={true}
                darkMode={true}
                formatOptionLabel={formatQueryOptionLabel}
              />
              <button
                className={clsx('query-setup__existing-query__btn', {
                  'query-setup__existing-query__btn--active':
                    querySetupState.showCurrentUserQueriesOnly,
                })}
                tabIndex={-1}
                title={`[${
                  querySetupState.showCurrentUserQueriesOnly ? 'on' : 'off'
                }] Toggle show only queries of current user`}
                onClick={toggleShowCurrentUserQueriesOnly}
              >
                <UserIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

type ProjectOption = { label: string; value: ProjectMetadata };
const buildProjectOption = (project: ProjectMetadata): ProjectOption => ({
  label: project.projectId,
  value: project,
});

type VersionOption = { label: string; value: string };
const buildVersionOption = (version: string): VersionOption => ({
  label: version,
  value: version,
});

const ServiceQuerySetup = observer(
  (props: { querySetupState: ServiceQuerySetupState }) => {
    const { querySetupState } = props;
    const applicationStore = useApplicationStore();
    const setupStore = useQuerySetupStore();
    const queryStore = useQueryStore();
    const back = (): void => {
      setupStore.setSetupState(undefined);
      querySetupState.setCurrentVersionId(undefined);
      querySetupState.setCurrentProjectMetadata(undefined);
      setupStore.queryStore.editorStore.graphState.resetGraph();
    };
    const next = (): void => {
      if (
        querySetupState.currentProjectMetadata &&
        querySetupState.currentVersionId &&
        querySetupState.currentService
      ) {
        queryStore.setQueryInfoState(
          new ServiceQueryInfoState(
            querySetupState.queryStore,
            querySetupState.currentProjectMetadata,
            querySetupState.currentVersionId,
            querySetupState.currentService,
            querySetupState.currentServiceExecutionKey,
          ),
        );
        applicationStore.historyApiClient.push(
          generateServiceQueryRoute(
            querySetupState.currentProjectMetadata.projectId,
            querySetupState.currentVersionId,
            querySetupState.currentService.path,
            querySetupState.currentServiceExecutionKey,
          ),
        );
      }
      setupStore.setSetupState(undefined);
    };
    const canProceed =
      querySetupState.currentProjectMetadata &&
      querySetupState.currentVersionId &&
      queryStore.editorStore.graphState.graph.buildState.hasSucceeded &&
      !queryStore.editorStore.graphState.isInitializingGraph &&
      querySetupState.currentService;

    // project
    const projectOptions =
      querySetupState.projectMetadatas.map(buildProjectOption);
    const selectedProjectOption = querySetupState.currentProjectMetadata
      ? buildProjectOption(querySetupState.currentProjectMetadata)
      : null;
    const projectSelectorPlaceholder = querySetupState.loadProjectMetadataState
      .isInProgress
      ? 'Loading projects'
      : querySetupState.loadProjectMetadataState.hasFailed
      ? 'Error fetching projects'
      : querySetupState.projectMetadatas.length
      ? 'Choose a project'
      : 'You have no projects, please create or acquire access for at least one';
    const onProjectOptionChange = (option: ProjectOption | null): void => {
      if (option?.value !== querySetupState.currentProjectMetadata) {
        querySetupState.setCurrentProjectMetadata(option?.value);
        // cascade
        querySetupState.setCurrentVersionId(undefined);
        querySetupState.setCurrentServiceExecution(undefined, undefined);
        if (querySetupState.currentProjectMetadata) {
          flowResult(querySetupState.loadProjectVersions()).catch(
            applicationStore.alertIllegalUnhandledError,
          );
        }
      }
    };

    // version
    const versionOptions = (
      querySetupState.currentProjectMetadata?.versions ?? []
    ).map(buildVersionOption);
    const selectedVersionOption = querySetupState.currentVersionId
      ? buildVersionOption(querySetupState.currentVersionId)
      : null;
    const versionSelectorPlaceholder = querySetupState.loadVersionsState
      .isInProgress
      ? 'Loading versions'
      : !querySetupState.currentProjectMetadata
      ? 'No project selected'
      : querySetupState.loadVersionsState.hasFailed
      ? 'Error fetching versions'
      : querySetupState.currentProjectMetadata.versions.length
      ? 'Choose a version'
      : 'The specified project has no published version';
    const onVersionOptionChange = (option: VersionOption | null): void => {
      if (option?.value !== querySetupState.currentVersionId) {
        querySetupState.setCurrentVersionId(option?.value);
        // cascade
        queryStore.editorStore.graphState.resetGraph();
        querySetupState.setCurrentServiceExecution(undefined, undefined);
        if (
          querySetupState.currentProjectMetadata &&
          querySetupState.currentVersionId
        ) {
          flowResult(
            queryStore.buildGraph(
              querySetupState.currentProjectMetadata,
              querySetupState.currentVersionId,
            ),
          ).catch(applicationStore.alertIllegalUnhandledError);
        }
      }
    };

    // service and key
    const serviceExecutionOptions = querySetupState.serviceExecutionOptions;
    const selectedServiceExecutionOptions = querySetupState.currentService
      ? {
          label: `${querySetupState.currentService.name}${
            querySetupState.currentServiceExecutionKey
              ? ` [${querySetupState.currentServiceExecutionKey}]`
              : ''
          }`,
          value: querySetupState.currentServiceExecutionKey
            ? {
                service: querySetupState.currentService,
                key: querySetupState.currentServiceExecutionKey,
              }
            : { service: querySetupState.currentService },
        }
      : null;
    const serviceExecutionSelectorPlaceholder = serviceExecutionOptions.length
      ? 'Choose a service'
      : 'No service available';
    const onServiceExecutionOptionChange = (
      option: ServiceExecutionOption | null,
    ): void => {
      querySetupState.setCurrentServiceExecution(
        option?.value.service,
        option?.value.key,
      );
    };

    useEffect(() => {
      flowResult(querySetupState.loadProjects()).catch(
        applicationStore.alertIllegalUnhandledError,
      );
    }, [querySetupState, applicationStore]);

    return (
      <div className="query-setup__wizard query-setup__service-query">
        <div className="query-setup__wizard__header query-setup__service-query__header">
          <button
            className="query-setup__wizard__header__btn"
            onClick={back}
            title="Back to Main Menu"
          >
            <ArrowLeftIcon />
          </button>
          <div className="query-setup__wizard__header__title">
            Loading a service query...
          </div>
          <button
            className={clsx('query-setup__wizard__header__btn', {
              'query-setup__wizard__header__btn--ready': canProceed,
            })}
            onClick={next}
            disabled={!canProceed}
            title="Proceed"
          >
            <ArrowRightIcon />
          </button>
        </div>
        <div className="query-setup__wizard__content">
          <div className="query-setup__service-query__project">
            <div className="query-setup__wizard__group">
              <div className="query-setup__wizard__group__title">Project</div>
              <CustomSelectorInput
                className="query-setup__wizard__selector"
                options={projectOptions}
                disabled={
                  querySetupState.loadProjectMetadataState.isInProgress ||
                  !projectOptions.length
                }
                isLoading={
                  querySetupState.loadProjectMetadataState.isInProgress
                }
                onChange={onProjectOptionChange}
                value={selectedProjectOption}
                placeholder={projectSelectorPlaceholder}
                isClearable={true}
                escapeClearsValue={true}
                darkMode={true}
              />
            </div>
            <div className="query-setup__wizard__group">
              <div className="query-setup__wizard__group__title">Version</div>
              <CustomSelectorInput
                className="query-setup__wizard__selector"
                options={versionOptions}
                disabled={
                  !querySetupState.currentProjectMetadata ||
                  querySetupState.loadVersionsState.isInProgress ||
                  !versionOptions.length
                }
                isLoading={querySetupState.loadVersionsState.isInProgress}
                onChange={onVersionOptionChange}
                value={selectedVersionOption}
                placeholder={versionSelectorPlaceholder}
                isClearable={true}
                escapeClearsValue={true}
                darkMode={true}
              />
            </div>
          </div>
          <div className="query-setup__service-query__graph">
            {(!querySetupState.currentProjectMetadata ||
              !querySetupState.currentVersionId ||
              !queryStore.editorStore.graphState.graph.buildState
                .hasSucceeded ||
              queryStore.editorStore.graphState.isInitializingGraph) && (
              <div className="query-setup__service-query__graph__loader">
                <PanelLoadingIndicator
                  isLoading={
                    Boolean(querySetupState.currentProjectMetadata) &&
                    Boolean(querySetupState.currentVersionId) &&
                    !queryStore.editorStore.graphState.graph.buildState
                      .hasSucceeded &&
                    !queryStore.editorStore.graphState.isInitializingGraph
                  }
                />
                <BlankPanelContent>
                  {queryStore.editorStore.graphState.graph.buildState.hasFailed
                    ? `Can't build graph`
                    : queryStore.editorStore.graphState.isInitializingGraph
                    ? `Building graph...`
                    : 'Project and version must be specified'}
                </BlankPanelContent>
              </div>
            )}
            {querySetupState.currentProjectMetadata &&
              querySetupState.currentVersionId &&
              queryStore.editorStore.graphState.graph.buildState.hasSucceeded &&
              !queryStore.editorStore.graphState.isInitializingGraph && (
                <>
                  <div className="query-setup__wizard__group">
                    <div className="query-setup__wizard__group__title">
                      Service
                    </div>
                    <CustomSelectorInput
                      className="query-setup__wizard__selector"
                      options={serviceExecutionOptions}
                      disabled={!serviceExecutionOptions.length}
                      onChange={onServiceExecutionOptionChange}
                      value={selectedServiceExecutionOptions}
                      placeholder={serviceExecutionSelectorPlaceholder}
                      isClearable={true}
                      escapeClearsValue={true}
                      darkMode={true}
                    />
                  </div>
                </>
              )}
          </div>
        </div>
      </div>
    );
  },
);

const CreateQuerySetup = observer(
  (props: { querySetupState: CreateQuerySetupState }) => {
    const { querySetupState } = props;
    const applicationStore = useApplicationStore();
    const setupStore = useQuerySetupStore();
    const queryStore = useQueryStore();
    const back = (): void => {
      setupStore.setSetupState(undefined);
      querySetupState.setCurrentVersionId(undefined);
      querySetupState.setCurrentProjectMetadata(undefined);
      setupStore.queryStore.editorStore.graphState.resetGraph();
    };
    const next = (): void => {
      if (
        querySetupState.currentProjectMetadata &&
        querySetupState.currentVersionId &&
        querySetupState.currentMapping &&
        querySetupState.currentRuntime
      ) {
        queryStore.setQueryInfoState(
          new CreateQueryInfoState(
            querySetupState.queryStore,
            querySetupState.currentProjectMetadata,
            querySetupState.currentVersionId,
            querySetupState.currentMapping,
            querySetupState.currentRuntime,
          ),
        );
        applicationStore.historyApiClient.push(
          generateCreateQueryRoute(
            querySetupState.currentProjectMetadata.projectId,
            querySetupState.currentVersionId,
            querySetupState.currentMapping.path,
            querySetupState.currentRuntime.path,
          ),
        );
      }
      setupStore.setSetupState(undefined);
    };
    const canProceed =
      querySetupState.currentProjectMetadata &&
      querySetupState.currentVersionId &&
      queryStore.editorStore.graphState.graph.buildState.hasSucceeded &&
      !queryStore.editorStore.graphState.isInitializingGraph &&
      querySetupState.currentMapping &&
      querySetupState.currentRuntime;

    // project
    const projectOptions =
      querySetupState.projectMetadatas.map(buildProjectOption);
    const selectedProjectOption = querySetupState.currentProjectMetadata
      ? buildProjectOption(querySetupState.currentProjectMetadata)
      : null;
    const projectSelectorPlaceholder = querySetupState.loadProjectMetadataState
      .isInProgress
      ? 'Loading projects'
      : querySetupState.loadProjectMetadataState.hasFailed
      ? 'Error fetching projects'
      : querySetupState.projectMetadatas.length
      ? 'Choose a project'
      : 'You have no projects, please create or acquire access for at least one';
    const onProjectOptionChange = (option: ProjectOption | null): void => {
      if (option?.value !== querySetupState.currentProjectMetadata) {
        querySetupState.setCurrentProjectMetadata(option?.value);
        // cascade
        querySetupState.setCurrentVersionId(undefined);
        querySetupState.setCurrentMapping(undefined);
        querySetupState.setCurrentRuntime(undefined);
        if (querySetupState.currentProjectMetadata) {
          flowResult(querySetupState.loadProjectVersions()).catch(
            applicationStore.alertIllegalUnhandledError,
          );
        }
      }
    };

    // version
    const versionOptions = (
      querySetupState.currentProjectMetadata?.versions ?? []
    ).map(buildVersionOption);
    const selectedVersionOption = querySetupState.currentVersionId
      ? buildVersionOption(querySetupState.currentVersionId)
      : null;
    const versionSelectorPlaceholder = querySetupState.loadVersionsState
      .isInProgress
      ? 'Loading versions'
      : !querySetupState.currentProjectMetadata
      ? 'No project selected'
      : querySetupState.loadVersionsState.hasFailed
      ? 'Error fetching versions'
      : querySetupState.currentProjectMetadata.versions.length
      ? 'Choose a version'
      : 'The specified project has no published version';
    const onVersionOptionChange = (option: VersionOption | null): void => {
      if (option?.value !== querySetupState.currentVersionId) {
        querySetupState.setCurrentVersionId(option?.value);
        // cascade
        queryStore.editorStore.graphState.resetGraph();
        querySetupState.setCurrentMapping(undefined);
        querySetupState.setCurrentRuntime(undefined);
        if (
          querySetupState.currentProjectMetadata &&
          querySetupState.currentVersionId
        ) {
          flowResult(
            queryStore.buildGraph(
              querySetupState.currentProjectMetadata,
              querySetupState.currentVersionId,
            ),
          ).catch(applicationStore.alertIllegalUnhandledError);
        }
      }
    };

    // mapping
    const mappingOptions = queryStore.editorStore.mappingOptions;
    const selectedMappingOption = querySetupState.currentMapping
      ? {
          label: querySetupState.currentMapping.name,
          value: querySetupState.currentMapping,
        }
      : null;
    const mappingSelectorPlaceholder = mappingOptions.length
      ? 'Choose a mapping'
      : 'No mapping available';
    const onMappingOptionChange = (
      option: PackageableElementSelectOption<Mapping> | null,
    ): void => {
      querySetupState.setCurrentMapping(option?.value);
      // cascade
      if (querySetupState.currentMapping) {
        if (querySetupState.runtimeOptions.length) {
          querySetupState.setCurrentRuntime(
            querySetupState.runtimeOptions[0].value,
          );
        }
      } else {
        querySetupState.setCurrentRuntime(undefined);
      }
    };

    // runtime
    const runtimeOptions = querySetupState.runtimeOptions;
    const selectedRuntimeOption = querySetupState.currentRuntime
      ? {
          label: querySetupState.currentRuntime.name,
          value: querySetupState.currentRuntime,
        }
      : null;
    const runtimeSelectorPlaceholder = !querySetupState.currentMapping
      ? 'No mapping specified'
      : runtimeOptions.length
      ? 'Choose a runtime'
      : 'No runtime available';
    const onRuntimeOptionChange = (
      option: PackageableElementSelectOption<PackageableRuntime> | null,
    ): void => {
      querySetupState.setCurrentRuntime(option?.value);
    };

    useEffect(() => {
      flowResult(querySetupState.loadProjects()).catch(
        applicationStore.alertIllegalUnhandledError,
      );
    }, [querySetupState, applicationStore]);

    return (
      <div className="query-setup__wizard query-setup__create-query">
        <div className="query-setup__wizard__header query-setup__create-query__header">
          <button
            className="query-setup__wizard__header__btn"
            onClick={back}
            title="Back to Main Menu"
          >
            <ArrowLeftIcon />
          </button>
          <div className="query-setup__wizard__header__title">
            Creating a new query...
          </div>
          <button
            className={clsx('query-setup__wizard__header__btn', {
              'query-setup__wizard__header__btn--ready': canProceed,
            })}
            onClick={next}
            disabled={!canProceed}
            title="Proceed"
          >
            <ArrowRightIcon />
          </button>
        </div>
        <div className="query-setup__wizard__content">
          <div className="query-setup__create-query__project">
            <div className="query-setup__wizard__group">
              <div className="query-setup__wizard__group__title">Project</div>
              <CustomSelectorInput
                className="query-setup__wizard__selector"
                options={projectOptions}
                disabled={
                  querySetupState.loadProjectMetadataState.isInProgress ||
                  !projectOptions.length
                }
                isLoading={
                  querySetupState.loadProjectMetadataState.isInProgress
                }
                onChange={onProjectOptionChange}
                value={selectedProjectOption}
                placeholder={projectSelectorPlaceholder}
                isClearable={true}
                escapeClearsValue={true}
                darkMode={true}
              />
            </div>
            <div className="query-setup__wizard__group">
              <div className="query-setup__wizard__group__title">Version</div>
              <CustomSelectorInput
                className="query-setup__wizard__selector"
                options={versionOptions}
                disabled={
                  !querySetupState.currentProjectMetadata ||
                  querySetupState.loadVersionsState.isInProgress ||
                  !versionOptions.length
                }
                isLoading={querySetupState.loadVersionsState.isInProgress}
                onChange={onVersionOptionChange}
                value={selectedVersionOption}
                placeholder={versionSelectorPlaceholder}
                isClearable={true}
                escapeClearsValue={true}
                darkMode={true}
              />
            </div>
          </div>
          <div className="query-setup__create-query__graph">
            {(!querySetupState.currentProjectMetadata ||
              !querySetupState.currentVersionId ||
              !queryStore.editorStore.graphState.graph.buildState
                .hasSucceeded ||
              queryStore.editorStore.graphState.isInitializingGraph) && (
              <div className="query-setup__create-query__graph__loader">
                <PanelLoadingIndicator
                  isLoading={
                    Boolean(querySetupState.currentProjectMetadata) &&
                    Boolean(querySetupState.currentVersionId) &&
                    !queryStore.editorStore.graphState.graph.buildState
                      .hasSucceeded &&
                    !queryStore.editorStore.graphState.isInitializingGraph
                  }
                />
                <BlankPanelContent>
                  {queryStore.editorStore.graphState.graph.buildState.hasFailed
                    ? `Can't build graph`
                    : queryStore.editorStore.graphState.isInitializingGraph
                    ? `Building graph...`
                    : 'Project and version must be specified'}
                </BlankPanelContent>
              </div>
            )}
            {querySetupState.currentProjectMetadata &&
              querySetupState.currentVersionId &&
              queryStore.editorStore.graphState.graph.buildState.hasSucceeded &&
              !queryStore.editorStore.graphState.isInitializingGraph && (
                <>
                  <div className="query-setup__wizard__group">
                    <div className="query-setup__wizard__group__title">
                      Mapping
                    </div>
                    <CustomSelectorInput
                      className="query-setup__wizard__selector"
                      options={mappingOptions}
                      disabled={!mappingOptions.length}
                      onChange={onMappingOptionChange}
                      value={selectedMappingOption}
                      placeholder={mappingSelectorPlaceholder}
                      isClearable={true}
                      escapeClearsValue={true}
                      darkMode={true}
                    />
                  </div>
                  <div className="query-setup__wizard__group">
                    <div className="query-setup__wizard__group__title">
                      Runtime
                    </div>
                    <CustomSelectorInput
                      className="query-setup__wizard__selector"
                      options={runtimeOptions}
                      disabled={
                        !mappingOptions.length ||
                        !querySetupState.currentMapping
                      }
                      onChange={onRuntimeOptionChange}
                      value={selectedRuntimeOption}
                      placeholder={runtimeSelectorPlaceholder}
                      isClearable={true}
                      escapeClearsValue={true}
                      darkMode={true}
                    />
                  </div>
                </>
              )}
          </div>
        </div>
      </div>
    );
  },
);

const QuerySetupLandingPage = observer(() => {
  const setupStore = useQuerySetupStore();
  const queryStore = useQueryStore();
  const editQuery = (): void =>
    setupStore.setSetupState(new ExistingQuerySetupState(queryStore));
  const loadServiceQuery = (): void =>
    setupStore.setSetupState(new ServiceQuerySetupState(queryStore));
  const createQuery = (): void =>
    setupStore.setSetupState(new CreateQuerySetupState(queryStore));

  useEffect(() => {
    setupStore.init();
  }, [setupStore]);

  return (
    <div className="query-setup__landing-page">
      <div className="query-setup__landing-page__title">
        What do you want to do today
        <FaQuestionCircle
          className="query-setup__landing-page__title__question-mark"
          title="Choose one of the option below to start"
        />
      </div>
      <div className="query-setup__landing-page__options">
        <button
          className="query-setup__landing-page__option query-setup__landing-page__option--existing-query"
          onClick={editQuery}
        >
          <div className="query-setup__landing-page__option__icon">
            <PencilIcon className="query-setup__landing-page__icon--edit" />
          </div>
          <div className="query-setup__landing-page__option__label">
            Load an existing query
          </div>
        </button>
        <button
          className="query-setup__landing-page__option query-setup__landing-page__option--service-query"
          onClick={loadServiceQuery}
        >
          <div className="query-setup__landing-page__option__icon">
            <RobotIcon />
          </div>
          <div className="query-setup__landing-page__option__label">
            Load query from a service
          </div>
        </button>
        <button
          className="query-setup__landing-page__option query-setup__landing-page__option--create-query"
          onClick={createQuery}
        >
          <div className="query-setup__landing-page__option__icon">
            <PlusIcon />
          </div>
          <div className="query-setup__landing-page__option__label">
            Create a new query
          </div>
        </button>
      </div>
    </div>
  );
});

const QuerySetupInner = observer(() => {
  const setupStore = useQuerySetupStore();
  const querySetupState = setupStore.querySetupState;

  return (
    <div className="query-setup">
      {!querySetupState && <QuerySetupLandingPage />}
      {querySetupState instanceof ExistingQuerySetupState && (
        <ExistingQuerySetup querySetupState={querySetupState} />
      )}
      {querySetupState instanceof ServiceQuerySetupState && (
        <ServiceQuerySetup querySetupState={querySetupState} />
      )}
      {querySetupState instanceof CreateQuerySetupState && (
        <CreateQuerySetup querySetupState={querySetupState} />
      )}
    </div>
  );
});

export const QuerySetup: React.FC = () => (
  <QuerySetupStoreProvider>
    <DndProvider backend={HTML5Backend}>
      <QuerySetupInner />
    </DndProvider>
  </QuerySetupStoreProvider>
);
