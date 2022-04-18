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
  type SelectComponent,
  ArrowLeftIcon,
  ArrowRightIcon,
  BlankPanelContent,
  clsx,
  CustomSelectorInput,
  PanelLoadingIndicator,
  PencilIcon,
  PlusIcon,
  RobotIcon,
  SearchIcon,
  UserIcon,
  QuestionCircleIcon,
} from '@finos/legend-art';
import { debounce, isNonNullable } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  generateCreateQueryRoute,
  generateExistingQueryRoute,
  generateServiceQueryRoute,
} from '../stores/LegendQueryRouter';
import {
  type QuerySetupState,
  type ServiceExecutionOption,
  CreateQuerySetupState,
  ExistingQuerySetupState,
  ServiceQuerySetupState,
} from '../stores/QuerySetupStore';
import {
  CreateQueryInfoState,
  ExistingQueryInfoState,
  ServiceQueryInfoState,
} from '../stores/LegendQueryStore';
import {
  QuerySetupStoreProvider,
  useQuerySetupStore,
} from './QuerySetupStoreProvider';
import { useLegendQueryStore } from './LegendQueryStoreProvider';
import {
  type ProjectData,
  LATEST_VERSION_ALIAS,
  SNAPSHOT_VERSION_ALIAS,
  compareSemVerVersions,
} from '@finos/legend-server-depot';
import type {
  LightQuery,
  Mapping,
  PackageableRuntime,
} from '@finos/legend-graph';
import {
  type PackageableElementOption,
  useApplicationStore,
} from '@finos/legend-application';

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
    const queryStore = useLegendQueryStore();
    const querySearchRef = useRef<SelectComponent>(null);
    const [searchText, setSearchText] = useState('');
    const back = (): void => {
      setupStore.setSetupState(undefined);
      querySetupState.setCurrentQuery(undefined);
      setupStore.queryStore.graphManagerState.resetGraph();
    };
    const next = (): void => {
      if (querySetupState.currentQuery) {
        queryStore.setQueryInfoState(
          new ExistingQueryInfoState(
            querySetupState.queryStore,
            querySetupState.currentQuery,
          ),
        );
        applicationStore.navigator.goTo(
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
        applicationStore.alertUnhandledError,
      );
    };

    // query
    const queryOptions = querySetupState.queries.map(buildQueryOption);
    const selectedQueryOption = querySetupState.currentQuery
      ? buildQueryOption(querySetupState.currentQuery)
      : null;
    const onQueryOptionChange = (option: QueryOption | null): void => {
      if (option?.value !== querySetupState.currentQuery) {
        querySetupState.setCurrentQuery(option?.value.id);
      }
    };
    const formatQueryOptionLabel = (option: QueryOption): React.ReactNode => {
      const deleteQuery: React.MouseEventHandler<HTMLButtonElement> = (
        event,
      ) => {
        event.preventDefault();
        event.stopPropagation();
        queryStore.graphManagerState.graphManager
          .deleteQuery(option.value.id)
          .then(() =>
            flowResult(querySetupState.loadQueries('')).catch(
              applicationStore.alertUnhandledError,
            ),
          )
          .catch(applicationStore.alertUnhandledError);
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
            applicationStore.alertUnhandledError,
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
        applicationStore.alertUnhandledError,
      );
    }, [querySetupState, applicationStore]);

    useEffect(() => {
      querySearchRef.current?.focus();
    }, []);

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
          <div className="query-setup__wizard__group query-setup__wizard__group--inline">
            <div className="query-setup__wizard__group__title">
              <SearchIcon />
            </div>
            <div className="query-setup__existing-query__input">
              <CustomSelectorInput
                ref={querySearchRef}
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

type ProjectOption = { label: string; value: ProjectData };
const buildProjectOption = (project: ProjectData): ProjectOption => ({
  label: `${project.groupId}.${project.artifactId}`,
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
    const queryStore = useLegendQueryStore();
    const back = (): void => {
      setupStore.setSetupState(undefined);
      querySetupState.setCurrentVersionId(undefined);
      querySetupState.setCurrentProject(undefined);
      queryStore.setQueryInfoState(undefined);
      setupStore.queryStore.graphManagerState.resetGraph();
    };
    const next = (): void => {
      if (
        querySetupState.currentProject &&
        querySetupState.currentVersionId &&
        querySetupState.currentService
      ) {
        queryStore.setQueryInfoState(
          new ServiceQueryInfoState(
            querySetupState.queryStore,
            querySetupState.currentProject,
            querySetupState.currentVersionId,
            querySetupState.currentService,
            querySetupState.currentServiceExecutionKey,
          ),
        );
        applicationStore.navigator.goTo(
          generateServiceQueryRoute(
            querySetupState.currentProject.groupId,
            querySetupState.currentProject.artifactId,
            querySetupState.currentVersionId,
            querySetupState.currentService.path,
            querySetupState.currentServiceExecutionKey,
          ),
        );
      }
      setupStore.setSetupState(undefined);
    };
    const canProceed =
      querySetupState.currentProject &&
      querySetupState.currentVersionId &&
      queryStore.graphManagerState.graph.buildState.hasSucceeded &&
      querySetupState.currentService;

    // project
    const projectOptions = querySetupState.projects.map(buildProjectOption);
    const selectedProjectOption = querySetupState.currentProject
      ? buildProjectOption(querySetupState.currentProject)
      : null;
    const projectSelectorPlaceholder = querySetupState.loadProjectsState
      .isInProgress
      ? 'Loading projects'
      : querySetupState.loadProjectsState.hasFailed
      ? 'Error fetching projects'
      : querySetupState.projects.length
      ? 'Choose a project'
      : 'You have no projects, please create or acquire access for at least one';
    const onProjectOptionChange = (option: ProjectOption | null): void => {
      if (option?.value !== querySetupState.currentProject) {
        querySetupState.setCurrentProject(option?.value);
        // cascade
        querySetupState.setCurrentVersionId(undefined);
        querySetupState.setCurrentServiceExecution(undefined, undefined);
      }
    };

    // version
    const versionOptions = [
      LATEST_VERSION_ALIAS,
      SNAPSHOT_VERSION_ALIAS,
      ...(querySetupState.currentProject?.versions ?? []),
    ].map(buildVersionOption);
    const selectedVersionOption = querySetupState.currentVersionId
      ? buildVersionOption(querySetupState.currentVersionId)
      : null;
    const versionSelectorPlaceholder = !querySetupState.currentProject
      ? 'No project selected'
      : 'Choose a version';
    const onVersionOptionChange = (option: VersionOption | null): void => {
      if (option?.value !== querySetupState.currentVersionId) {
        querySetupState.setCurrentVersionId(option?.value);
        // cascade
        queryStore.graphManagerState.resetGraph();
        querySetupState.setCurrentServiceExecution(undefined, undefined);
        if (
          querySetupState.currentProject &&
          querySetupState.currentVersionId
        ) {
          flowResult(
            queryStore.buildGraphForServiceQuerySetup(
              querySetupState.currentProject,
              querySetupState.currentVersionId,
            ),
          ).catch(applicationStore.alertUnhandledError);
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
        applicationStore.alertUnhandledError,
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
                  querySetupState.loadProjectsState.isInProgress ||
                  !projectOptions.length
                }
                isLoading={querySetupState.loadProjectsState.isInProgress}
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
                disabled={!querySetupState.currentProject}
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
            {(!querySetupState.currentProject ||
              !querySetupState.currentVersionId ||
              !queryStore.graphManagerState.graph.buildState.hasSucceeded) && (
              <div className="query-setup__service-query__graph__loader">
                <PanelLoadingIndicator
                  isLoading={
                    Boolean(querySetupState.currentProject) &&
                    Boolean(querySetupState.currentVersionId) &&
                    !queryStore.graphManagerState.graph.buildState.hasSucceeded
                  }
                />
                {queryStore.buildGraphState.isInProgress && (
                  <BlankPanelContent>
                    {queryStore.buildGraphState.message ??
                      queryStore.graphManagerState.graph.systemModel.buildState
                        .message ??
                      queryStore.graphManagerState.graph.dependencyManager
                        .buildState.message ??
                      queryStore.graphManagerState.graph.generationModel
                        .buildState.message ??
                      queryStore.graphManagerState.graph.buildState.message}
                  </BlankPanelContent>
                )}
                {!queryStore.buildGraphState.isInProgress && (
                  <BlankPanelContent>
                    {queryStore.graphManagerState.graph.buildState.hasFailed
                      ? `Can't build graph`
                      : 'Project and version must be specified'}
                  </BlankPanelContent>
                )}
              </div>
            )}
            {querySetupState.currentProject &&
              querySetupState.currentVersionId &&
              queryStore.graphManagerState.graph.buildState.hasSucceeded && (
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
    const queryStore = useLegendQueryStore();
    const back = (): void => {
      setupStore.setSetupState(undefined);
      querySetupState.setCurrentVersionId(undefined);
      querySetupState.setCurrentProject(undefined);
      queryStore.setQueryInfoState(undefined);
      setupStore.queryStore.graphManagerState.resetGraph();
    };
    const next = (): void => {
      if (
        querySetupState.currentProject &&
        querySetupState.currentVersionId &&
        querySetupState.currentMapping &&
        querySetupState.currentRuntime
      ) {
        queryStore.setQueryInfoState(
          new CreateQueryInfoState(
            querySetupState.queryStore,
            querySetupState.currentProject,
            querySetupState.currentVersionId,
            querySetupState.currentMapping,
            querySetupState.currentRuntime,
          ),
        );
        applicationStore.navigator.goTo(
          generateCreateQueryRoute(
            querySetupState.currentProject.groupId,
            querySetupState.currentProject.artifactId,
            querySetupState.currentVersionId,
            querySetupState.currentMapping.path,
            querySetupState.currentRuntime.path,
            undefined,
          ),
        );
      }
      setupStore.setSetupState(undefined);
    };
    const canProceed =
      querySetupState.currentProject &&
      querySetupState.currentVersionId &&
      queryStore.graphManagerState.graph.buildState.hasSucceeded &&
      querySetupState.currentMapping &&
      querySetupState.currentRuntime;

    // project
    const projectOptions = querySetupState.projects.map(buildProjectOption);
    const selectedProjectOption = querySetupState.currentProject
      ? buildProjectOption(querySetupState.currentProject)
      : null;
    const projectSelectorPlaceholder = querySetupState.loadProjectsState
      .isInProgress
      ? 'Loading projects'
      : querySetupState.loadProjectsState.hasFailed
      ? 'Error fetching projects'
      : querySetupState.projects.length
      ? 'Choose a project'
      : 'You have no projects, please create or acquire access for at least one';
    const onProjectOptionChange = (option: ProjectOption | null): void => {
      if (option?.value !== querySetupState.currentProject) {
        querySetupState.setCurrentProject(option?.value);
        // cascade
        querySetupState.setCurrentVersionId(undefined);
        querySetupState.setCurrentMapping(undefined);
        querySetupState.setCurrentRuntime(undefined);
      }
    };

    // version
    const versionOptions = [
      LATEST_VERSION_ALIAS,
      SNAPSHOT_VERSION_ALIAS,
      ...(querySetupState.currentProject?.versions ?? []),
    ]
      .slice()
      .sort((v1, v2) => compareSemVerVersions(v2, v1))
      .map(buildVersionOption);
    const selectedVersionOption = querySetupState.currentVersionId
      ? buildVersionOption(querySetupState.currentVersionId)
      : null;
    const versionSelectorPlaceholder = !querySetupState.currentProject
      ? 'No project selected'
      : 'Choose a version';
    const onVersionOptionChange = (option: VersionOption | null): void => {
      if (option?.value !== querySetupState.currentVersionId) {
        querySetupState.setCurrentVersionId(option?.value);
        // cascade
        queryStore.graphManagerState.resetGraph();
        querySetupState.setCurrentMapping(undefined);
        querySetupState.setCurrentRuntime(undefined);
        if (
          querySetupState.currentProject &&
          querySetupState.currentVersionId
        ) {
          flowResult(
            queryStore.buildGraphForCreateQuerySetup(
              querySetupState.currentProject,
              querySetupState.currentVersionId,
            ),
          ).catch(applicationStore.alertUnhandledError);
        }
      }
    };

    // mapping
    const mappingOptions = queryStore.queryBuilderState.mappingOptions;
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
      option: PackageableElementOption<Mapping> | null,
    ): void => {
      querySetupState.setCurrentMapping(option?.value);
      // cascade
      if (querySetupState.currentMapping) {
        if (querySetupState.runtimeOptions.length) {
          querySetupState.setCurrentRuntime(
            (
              querySetupState
                .runtimeOptions[0] as PackageableElementOption<PackageableRuntime>
            ).value,
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
      option: PackageableElementOption<PackageableRuntime> | null,
    ): void => {
      querySetupState.setCurrentRuntime(option?.value);
    };

    useEffect(() => {
      flowResult(querySetupState.loadProjects()).catch(
        applicationStore.alertUnhandledError,
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
                  querySetupState.loadProjectsState.isInProgress ||
                  !projectOptions.length
                }
                isLoading={querySetupState.loadProjectsState.isInProgress}
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
                disabled={!querySetupState.currentProject}
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
            {(!querySetupState.currentProject ||
              !querySetupState.currentVersionId ||
              !queryStore.graphManagerState.graph.buildState.hasSucceeded) && (
              <div className="query-setup__create-query__graph__loader">
                <PanelLoadingIndicator
                  isLoading={
                    Boolean(querySetupState.currentProject) &&
                    Boolean(querySetupState.currentVersionId) &&
                    !queryStore.graphManagerState.graph.buildState.hasSucceeded
                  }
                />
                {queryStore.buildGraphState.isInProgress && (
                  <BlankPanelContent>
                    {queryStore.buildGraphState.message ??
                      queryStore.graphManagerState.graph.systemModel.buildState
                        .message ??
                      queryStore.graphManagerState.graph.dependencyManager
                        .buildState.message ??
                      queryStore.graphManagerState.graph.generationModel
                        .buildState.message ??
                      queryStore.graphManagerState.graph.buildState.message}
                  </BlankPanelContent>
                )}
                {!queryStore.buildGraphState.isInProgress && (
                  <BlankPanelContent>
                    {queryStore.graphManagerState.graph.buildState.hasFailed
                      ? `Can't build graph`
                      : 'Project and version must be specified'}
                  </BlankPanelContent>
                )}
              </div>
            )}
            {querySetupState.currentProject &&
              querySetupState.currentVersionId &&
              queryStore.graphManagerState.graph.buildState.hasSucceeded && (
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
  const queryStore = useLegendQueryStore();
  const extraQuerySetupOptions = queryStore.pluginManager
    .getQueryPlugins()
    .flatMap(
      (plugin) =>
        plugin.getExtraQuerySetupOptionRendererConfigurations?.() ?? [],
    )
    .filter(isNonNullable)
    .map((config) => (
      <Fragment key={config.key}>{config.renderer(setupStore)}</Fragment>
    ));
  const editQuery = (): void =>
    setupStore.setSetupState(new ExistingQuerySetupState(setupStore));
  const loadServiceQuery = (): void =>
    setupStore.setSetupState(new ServiceQuerySetupState(setupStore));
  const createQuery = (): void =>
    setupStore.setSetupState(new CreateQuerySetupState(setupStore));

  useEffect(() => {
    setupStore.initialize();
  }, [setupStore]);

  return (
    <div className="query-setup__landing-page">
      <div className="query-setup__landing-page__title">
        What do you want to do today
        <QuestionCircleIcon
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
        {extraQuerySetupOptions}
        <button
          className="query-setup__landing-page__option query-setup__landing-page__option--advanced query-setup__landing-page__option--service-query"
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
          className="query-setup__landing-page__option query-setup__landing-page__option--advanced query-setup__landing-page__option--create-query"
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
  const queryStore = useLegendQueryStore();
  const querySetupState = setupStore.querySetupState;
  const renderQuerySetupScreen = (
    setupState: QuerySetupState,
  ): React.ReactNode => {
    if (setupState instanceof ExistingQuerySetupState) {
      return <ExistingQuerySetup querySetupState={setupState} />;
    } else if (setupState instanceof ServiceQuerySetupState) {
      return <ServiceQuerySetup querySetupState={setupState} />;
    } else if (setupState instanceof CreateQuerySetupState) {
      return <CreateQuerySetup querySetupState={setupState} />;
    }
    const extraQuerySetupRenderers = queryStore.pluginManager
      .getQueryPlugins()
      .flatMap((plugin) => plugin.getExtraQuerySetupRenderers?.() ?? []);
    for (const querySetupRenderer of extraQuerySetupRenderers) {
      const elementEditor = querySetupRenderer(setupState);
      if (elementEditor) {
        return elementEditor;
      }
    }
    return null;
  };

  return (
    <div className="query-setup">
      {!querySetupState && <QuerySetupLandingPage />}
      {querySetupState && renderQuerySetupScreen(querySetupState)}
    </div>
  );
});

export const QuerySetup: React.FC = () => (
  <QuerySetupStoreProvider>
    <QuerySetupInner />
  </QuerySetupStoreProvider>
);
