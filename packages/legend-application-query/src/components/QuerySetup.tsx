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
  SearchIcon,
  UserIcon,
  QuestionCircleIcon,
  CogIcon,
  MoreHorizontalIcon,
  DropdownMenu,
  PencilIcon,
  ChevronDownThinIcon,
  CircleIcon,
  MenuContent,
  MenuContentItem,
  MenuContentItemIcon,
  MenuContentItemLabel,
  CheckIcon,
  MenuContentDivider,
} from '@finos/legend-art';
import {
  debounce,
  getNullableFirstElement,
  getQueryParameters,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  generateMappingQueryCreatorRoute,
  generateExistingQueryEditorRoute,
  generateServiceQueryCreatorRoute,
  LEGEND_QUERY_SETUP_QUERY_PARAM_TOKEN,
  type QuerySetupQueryParams,
} from '../stores/LegendQueryRouter.js';
import {
  type QuerySetupState,
  type ServiceExecutionOption,
  CreateMappingQuerySetupState,
  EditExistingQuerySetupState,
  CloneServiceQuerySetupState,
  UpdateExistingServiceQuerySetupState,
  LoadProjectServiceQuerySetupState,
  QueryProductionizationSetupState,
} from '../stores/QuerySetupStore.js';
import {
  useQuerySetupStore,
  withQuerySetupStore,
} from './QuerySetupStoreProvider.js';
import {
  type ProjectData,
  LATEST_VERSION_ALIAS,
  SNAPSHOT_VERSION_ALIAS,
} from '@finos/legend-server-depot';
import { compareSemVerVersions } from '@finos/legend-storage';
import type { Mapping, PackageableRuntime } from '@finos/legend-graph';
import {
  type PackageableElementOption,
  useApplicationStore,
  buildElementOption,
  EDITOR_LANGUAGE,
  TextInputEditor,
} from '@finos/legend-application';
import {
  type ServiceOption,
  type QueryOption,
  buildServiceOption,
  formatServiceOptionLabel,
  buildQueryOption,
} from '@finos/legend-query-builder';
import { useLegendQueryApplicationStore } from './LegendQueryBaseStoreProvider.js';
import type { QuerySetupActionConfiguration } from '../stores/LegendQueryApplicationPlugin.js';

const EditExistingQuerySetup = observer(
  (props: { querySetupState: EditExistingQuerySetupState }) => {
    const { querySetupState } = props;
    const applicationStore = useApplicationStore();
    const setupStore = useQuerySetupStore();
    const querySearchRef = useRef<SelectComponent>(null);
    const [searchText, setSearchText] = useState('');

    // actions
    const back = (): void => {
      setupStore.setSetupState(undefined);
    };
    const next = (): void => {
      if (querySetupState.currentQuery) {
        applicationStore.navigator.goToLocation(
          generateExistingQueryEditorRoute(querySetupState.currentQuery.id),
        );
      }
    };
    const canProceed = querySetupState.currentQuery;

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
        setupStore.graphManagerState.graphManager
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
          <div
            className="query-setup__existing-query__query-option__label"
            title={option.label}
          >
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

    // show current user queries only
    const toggleShowCurrentUserQueriesOnly = (): void => {
      querySetupState.setShowCurrentUserQueriesOnly(
        !querySetupState.showCurrentUserQueriesOnly,
      );
      debouncedLoadQueries.cancel();
      debouncedLoadQueries(searchText);
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
            title="Edit query"
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
          <div className="query-setup__existing-query__preview">
            <PanelLoadingIndicator
              isLoading={querySetupState.loadQueryState.isInProgress}
            />
            {querySetupState.currentQuery && (
              <>
                {!querySetupState.currentQueryInfo && (
                  <BlankPanelContent>{`Can't preview query`}</BlankPanelContent>
                )}
                {querySetupState.currentQueryInfo && (
                  <TextInputEditor
                    inputValue={querySetupState.currentQueryInfo.content}
                    isReadOnly={true}
                    language={EDITOR_LANGUAGE.PURE}
                    showMiniMap={false}
                    hideGutter={true}
                  />
                )}
              </>
            )}
            {!querySetupState.currentQuery && (
              <BlankPanelContent>No query to preview</BlankPanelContent>
            )}
          </div>
        </div>
      </div>
    );
  },
);

const QueryProductionizationSetup = observer(
  (props: { querySetupState: QueryProductionizationSetupState }) => {
    const { querySetupState } = props;
    const applicationStore = useApplicationStore();
    const setupStore = useQuerySetupStore();
    const querySearchRef = useRef<SelectComponent>(null);
    const [searchText, setSearchText] = useState('');

    // actions
    const back = (): void => {
      setupStore.setSetupState(undefined);
    };
    const next = (): void => {
      if (querySetupState.currentQuery) {
        querySetupState
          .loadQueryProductionizer()
          .catch(applicationStore.alertUnhandledError);
      }
    };
    const canProceed = querySetupState.currentQuery;

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
      <div className="query-setup__wizard query-setup__productionize-query">
        <div className="query-setup__wizard__header query-setup__productionize-query__header">
          <button
            className="query-setup__wizard__header__btn"
            onClick={back}
            title="Back to Main Menu"
          >
            <ArrowLeftIcon />
          </button>
          <div className="query-setup__wizard__header__title">
            Productionizing an existing query...
          </div>
          <button
            className={clsx('query-setup__wizard__header__btn', {
              'query-setup__wizard__header__btn--ready': canProceed,
            })}
            onClick={next}
            disabled={!canProceed}
            title="Productionize query"
          >
            <ArrowRightIcon />
          </button>
        </div>
        <div className="query-setup__wizard__content">
          <div className="query-setup__wizard__group query-setup__wizard__group--inline">
            <div className="query-setup__wizard__group__title">
              <SearchIcon />
            </div>
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
            />
          </div>
          <div className="query-setup__productionize-query__preview">
            <PanelLoadingIndicator
              isLoading={querySetupState.loadQueryState.isInProgress}
            />
            {querySetupState.currentQuery && (
              <>
                {!querySetupState.currentQueryInfo && (
                  <BlankPanelContent>{`Can't preview query`}</BlankPanelContent>
                )}
                {querySetupState.currentQueryInfo && (
                  <TextInputEditor
                    inputValue={querySetupState.currentQueryInfo.content}
                    isReadOnly={true}
                    language={EDITOR_LANGUAGE.PURE}
                    showMiniMap={false}
                    hideGutter={true}
                  />
                )}
              </>
            )}
            {!querySetupState.currentQuery && (
              <BlankPanelContent>No query to preview</BlankPanelContent>
            )}
          </div>
        </div>
      </div>
    );
  },
);

export const UpdateExistingServiceQuerySetup = observer(
  (props: { querySetupState: UpdateExistingServiceQuerySetupState }) => {
    const { querySetupState } = props;
    const applicationStore = useLegendQueryApplicationStore();
    const setupStore = useQuerySetupStore();
    const serviceSearchRef = useRef<SelectComponent>(null);
    const [searchText, setSearchText] = useState('');

    const back = (): void => {
      setupStore.setSetupState(undefined);
    };

    const serviceOptions = querySetupState.services.map(buildServiceOption);
    const onServiceOptionChange = (option: ServiceOption): void => {
      querySetupState
        .loadServiceUpdater(option.value)
        .catch(applicationStore.alertUnhandledError);
    };

    // search text
    const debouncedLoadServices = useMemo(
      () =>
        debounce((input: string): void => {
          flowResult(querySetupState.loadServices(input)).catch(
            applicationStore.alertUnhandledError,
          );
        }, 500),
      [applicationStore, querySetupState],
    );
    const onSearchTextChange = (value: string): void => {
      if (value !== searchText) {
        setSearchText(value);
        debouncedLoadServices.cancel();
        debouncedLoadServices(value);
      }
    };

    useEffect(() => {
      flowResult(querySetupState.loadServices('')).catch(
        applicationStore.alertUnhandledError,
      );
    }, [querySetupState, applicationStore]);

    useEffect(() => {
      serviceSearchRef.current?.focus();
    }, []);

    return (
      <div className="query-setup__wizard query-setup__existing-service-query">
        <div className="query-setup__wizard__header query-setup__existing-service-query__header">
          <button
            className="query-setup__wizard__header__btn"
            onClick={back}
            title="Back to Main Menu"
          >
            <ArrowLeftIcon />
          </button>
          <div className="query-setup__wizard__header__title">
            Updating an existing service query...
          </div>
        </div>
        <div className="query-setup__wizard__content">
          <div className="query-setup__wizard__group query-setup__wizard__group--inline query-setup__existing-service-query__search-bar">
            <div className="query-setup__wizard__group__title">
              <SearchIcon />
            </div>
            <CustomSelectorInput
              ref={serviceSearchRef}
              className="query-setup__wizard__selector"
              options={serviceOptions}
              isLoading={querySetupState.loadServicesState.isInProgress}
              onInputChange={onSearchTextChange}
              inputValue={searchText}
              onChange={onServiceOptionChange}
              placeholder="Search for service..."
              darkMode={true}
              formatOptionLabel={formatServiceOptionLabel}
            />
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

const LoadProjectServiceQuerySetup = observer(
  (props: { querySetupState: LoadProjectServiceQuerySetupState }) => {
    const { querySetupState } = props;
    const applicationStore = useApplicationStore();
    const setupStore = useQuerySetupStore();
    const back = (): void => {
      setupStore.setSetupState(undefined);
    };

    // project
    const projectOptions = querySetupState.projects.map(buildProjectOption);
    const projectSelectorPlaceholder = querySetupState.loadProjectsState
      .isInProgress
      ? 'Loading projects'
      : querySetupState.loadProjectsState.hasFailed
      ? 'Error fetching projects'
      : querySetupState.projects.length
      ? 'Choose a project'
      : 'You have no projects, please create or acquire access for at least one';
    const onProjectOptionChange = (option: ProjectOption): void => {
      querySetupState
        .loadProjectServiceUpdater(option.value)
        .catch(applicationStore.alertUnhandledError);
    };

    useEffect(() => {
      flowResult(querySetupState.loadProjects()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [querySetupState, applicationStore]);

    return (
      <div className="query-setup__wizard query-setup__existing-service-query">
        <div className="query-setup__wizard__header query-setup__service-query__header">
          <button
            className="query-setup__wizard__header__btn"
            onClick={back}
            title="Back to Main Menu"
          >
            <ArrowLeftIcon />
          </button>
          <div className="query-setup__wizard__header__title">
            Load service query from a project...
          </div>
        </div>
        <div className="query-setup__wizard__content">
          <div className="query-setup__wizard__group query-setup__wizard__group--inline query-setup__existing-service-query__search-bar">
            <CustomSelectorInput
              className="query-setup__wizard__selector"
              options={projectOptions}
              disabled={
                querySetupState.loadProjectsState.isInProgress ||
                !projectOptions.length
              }
              isLoading={querySetupState.loadProjectsState.isInProgress}
              onChange={onProjectOptionChange}
              placeholder={projectSelectorPlaceholder}
              darkMode={true}
            />
          </div>
        </div>
      </div>
    );
  },
);

const CloneServiceQuerySetup = observer(
  (props: { querySetupState: CloneServiceQuerySetupState }) => {
    const { querySetupState } = props;
    const applicationStore = useApplicationStore();
    const setupStore = useQuerySetupStore();

    // actions
    const back = (): void => {
      setupStore.setSetupState(undefined);
    };
    const next = (): void => {
      if (
        querySetupState.currentProject &&
        querySetupState.currentVersionId &&
        querySetupState.currentServiceExecutionOption
      ) {
        applicationStore.navigator.goToLocation(
          generateServiceQueryCreatorRoute(
            querySetupState.currentProject.groupId,
            querySetupState.currentProject.artifactId,
            querySetupState.currentVersionId,
            querySetupState.currentServiceExecutionOption.service.path,
            querySetupState.currentServiceExecutionOption.key,
          ),
        );
      }
    };
    const canProceed =
      querySetupState.currentProject &&
      querySetupState.currentVersionId &&
      querySetupState.currentServiceExecutionOption;

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
        querySetupState.setCurrentServiceExecutionOption(undefined);
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
    const onVersionOptionChange = async (
      option: VersionOption | null,
    ): Promise<void> => {
      if (option?.value !== querySetupState.currentVersionId) {
        querySetupState.setCurrentVersionId(option?.value);
        // cascade
        querySetupState.setCurrentServiceExecutionOption(undefined);
        if (
          querySetupState.currentProject &&
          querySetupState.currentVersionId
        ) {
          await flowResult(
            querySetupState.loadServiceExecutionOptions(
              querySetupState.currentProject,
              querySetupState.currentVersionId,
            ),
          ).catch(applicationStore.alertUnhandledError);
        }
      }
    };

    // service and key
    const serviceExecutionOptions = querySetupState.serviceExecutionOptions.map(
      (option) => ({
        label: `${option.service.name}${option.key ? ` [${option.key}]` : ''}`,
        value: option,
      }),
    );
    const selectedServiceExecutionOption =
      querySetupState.currentServiceExecutionOption
        ? {
            label: `${
              querySetupState.currentServiceExecutionOption.service.name
            }${
              querySetupState.currentServiceExecutionOption.key
                ? ` [${querySetupState.currentServiceExecutionOption.key}]`
                : ''
            }`,
            value: querySetupState.currentServiceExecutionOption,
          }
        : null;
    const serviceExecutionSelectorPlaceholder = serviceExecutionOptions.length
      ? 'Choose a service'
      : 'No service available';
    const onServiceExecutionOptionChange = (
      option: { value: ServiceExecutionOption } | null,
    ): void => {
      querySetupState.setCurrentServiceExecutionOption(
        option?.value ?? undefined,
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
            Clone an existing service query...
          </div>
          <button
            className={clsx('query-setup__wizard__header__btn', {
              'query-setup__wizard__header__btn--ready': canProceed,
            })}
            onClick={next}
            disabled={!canProceed}
            title="Create a new query"
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
              !querySetupState.loadServiceExecutionsState.hasSucceeded) && (
              <div className="query-setup__service-query__graph__loader">
                <PanelLoadingIndicator
                  isLoading={
                    Boolean(querySetupState.currentProject) &&
                    Boolean(querySetupState.currentVersionId) &&
                    !querySetupState.loadServiceExecutionsState.isInProgress
                  }
                />
                <BlankPanelContent>
                  {querySetupState.loadServiceExecutionsState.isInProgress
                    ? `Surveying service executions...`
                    : querySetupState.loadServiceExecutionsState.hasFailed
                    ? `Can't load service executions`
                    : 'Project and version must be specified'}
                </BlankPanelContent>
              </div>
            )}
            {querySetupState.currentProject &&
              querySetupState.currentVersionId &&
              querySetupState.loadServiceExecutionsState.hasSucceeded && (
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
                      value={selectedServiceExecutionOption}
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

const CreateMappingQuerySetup = observer(
  (props: { querySetupState: CreateMappingQuerySetupState }) => {
    const { querySetupState } = props;
    const applicationStore = useApplicationStore();
    const setupStore = useQuerySetupStore();

    // actions
    const back = (): void => {
      setupStore.setSetupState(undefined);
    };
    const next = (): void => {
      if (
        querySetupState.currentProject &&
        querySetupState.currentVersionId &&
        querySetupState.currentMapping &&
        querySetupState.currentRuntime
      ) {
        applicationStore.navigator.goToLocation(
          generateMappingQueryCreatorRoute(
            querySetupState.currentProject.groupId,
            querySetupState.currentProject.artifactId,
            querySetupState.currentVersionId,
            querySetupState.currentMapping.path,
            querySetupState.currentRuntime.path,
          ),
        );
      }
    };
    const canProceed =
      querySetupState.currentProject &&
      querySetupState.currentVersionId &&
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
    const onVersionOptionChange = async (
      option: VersionOption | null,
    ): Promise<void> => {
      if (option?.value !== querySetupState.currentVersionId) {
        querySetupState.setCurrentVersionId(option?.value);
        // cascade
        querySetupState.setCurrentMapping(undefined);
        querySetupState.setCurrentRuntime(undefined);
        if (
          querySetupState.currentProject &&
          querySetupState.currentVersionId
        ) {
          await flowResult(
            querySetupState.surveyMappingRuntimeCompatibility(
              querySetupState.currentProject,
              querySetupState.currentVersionId,
            ),
          ).catch(applicationStore.alertUnhandledError);
        }
      }
    };

    // mapping
    const mappingOptions =
      querySetupState.mappingRuntimeCompatibilitySurveyResult.map((result) =>
        buildElementOption(result.mapping),
      );
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
        querySetupState.setCurrentRuntime(
          getNullableFirstElement(querySetupState.compatibleRuntimes),
        );
      } else {
        querySetupState.setCurrentRuntime(undefined);
      }
    };

    // runtime
    const runtimeOptions =
      querySetupState.compatibleRuntimes.map(buildElementOption);
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
            title="Create a new query"
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
              !querySetupState.surveyMappingRuntimeCompatibilityState
                .hasSucceeded) && (
              <div className="query-setup__create-query__graph__loader">
                <PanelLoadingIndicator
                  isLoading={
                    Boolean(querySetupState.currentProject) &&
                    Boolean(querySetupState.currentVersionId) &&
                    !querySetupState.surveyMappingRuntimeCompatibilityState
                      .hasSucceeded
                  }
                />
                <BlankPanelContent>
                  {querySetupState.surveyMappingRuntimeCompatibilityState
                    .isInProgress
                    ? `Surveying runtime and mapping compatibility...`
                    : querySetupState.surveyMappingRuntimeCompatibilityState
                        .hasFailed
                    ? `Can't load runtime and mapping`
                    : 'Project and version must be specified'}
                </BlankPanelContent>
              </div>
            )}
            {querySetupState.currentProject &&
              querySetupState.currentVersionId &&
              querySetupState.surveyMappingRuntimeCompatibilityState
                .hasSucceeded && (
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

const QuerySetupAction = observer(
  (props: { action: QuerySetupActionConfiguration }) => {
    const { action } = props;
    const setupStore = useQuerySetupStore();
    const applicationStore = useApplicationStore();
    const onClick = (): void => {
      action.action(setupStore).catch(applicationStore.alertUnhandledError);
    };

    if (!setupStore.showAdvancedActions && action.isAdvanced) {
      return null;
    }
    return (
      <button
        className={clsx('query-setup__landing-page__action', action.className, {
          'query-setup__landing-page__action--advanced': action.isAdvanced,
        })}
        tabIndex={-1}
        onClick={onClick}
      >
        <div className="query-setup__landing-page__action__icon">
          {action.icon}
        </div>
        <div className="query-setup__landing-page__action__label">
          {action.label}
        </div>
      </button>
    );
  },
);

const QuerySetupActionGroupConfigMenu = observer(() => {
  const setupStore = useQuerySetupStore();
  const toggleShowAdvancedActions = (): void =>
    setupStore.setShowAdvancedActions(!setupStore.showAdvancedActions);
  const toggleShowAllGroups = (): void =>
    setupStore.setShowAllGroups(!setupStore.showAllGroups);
  const reset = (): void => setupStore.resetConfig();

  return (
    <MenuContent className="query-setup__landing-page__config-menu">
      <MenuContentItem onClick={toggleShowAdvancedActions}>
        <MenuContentItemIcon>
          {setupStore.showAdvancedActions ? <CheckIcon /> : null}
        </MenuContentItemIcon>
        <MenuContentItemLabel>Show advanced actions</MenuContentItemLabel>
      </MenuContentItem>
      <MenuContentItem onClick={toggleShowAllGroups}>
        <MenuContentItemIcon>
          {setupStore.showAllGroups ? <CheckIcon /> : null}
        </MenuContentItemIcon>
        <MenuContentItemLabel>Show all action groups</MenuContentItemLabel>
      </MenuContentItem>
      <MenuContentDivider />
      <MenuContentItem>Focus on action group:</MenuContentItem>
      <MenuContentItem onClick={() => setupStore.setTagToFocus(undefined)}>
        <MenuContentItemIcon>
          {!setupStore.tagToFocus ? <CheckIcon /> : null}
        </MenuContentItemIcon>
        <MenuContentItemLabel>(none)</MenuContentItemLabel>
      </MenuContentItem>
      {setupStore.tags.map((groupKey) => (
        <MenuContentItem
          key={groupKey}
          onClick={() => setupStore.setTagToFocus(groupKey)}
        >
          <MenuContentItemIcon>
            {setupStore.tagToFocus === groupKey ? <CheckIcon /> : null}
          </MenuContentItemIcon>
          <MenuContentItemLabel>{groupKey}</MenuContentItemLabel>
        </MenuContentItem>
      ))}
      <MenuContentDivider />
      <MenuContentItem onClick={reset} disabled={!setupStore.isCustomized}>
        Reset
      </MenuContentItem>
    </MenuContent>
  );
});

const QuerySetupActionGroup = observer(
  (props: { tag?: string | undefined }) => {
    const { tag } = props;
    const setupStore = useQuerySetupStore();
    const actions = setupStore.actions.filter((action) => action.tag === tag);
    const createActions = actions.filter((action) => action.isCreateAction);
    const editActions = actions.filter((action) => !action.isCreateAction);
    const showAdvancedActions = (): void =>
      setupStore.setShowAdvancedActions(true);

    return (
      <div
        className={clsx('query-setup__landing-page__action-group', {
          'query-setup__landing-page__action-group--with-tag': Boolean(tag),
        })}
      >
        {tag && (
          <div className="query-setup__landing-page__action-group__tag">
            {tag}
          </div>
        )}
        <div className="query-setup__landing-page__action-group__header">
          {(!tag || setupStore.tagToFocus === tag) && (
            <DropdownMenu
              className="query-setup__landing-page__action-group__config"
              title="Show settings..."
              content={<QuerySetupActionGroupConfigMenu />}
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                transformOrigin: { vertical: 'top', horizontal: 'left' },
              }}
            >
              <CogIcon />
              {setupStore.isCustomized && (
                <div className="query-setup__landing-page__action-group__config__status">
                  <CircleIcon />
                </div>
              )}
            </DropdownMenu>
          )}
        </div>
        <div className="query-setup__landing-page__action-group__body">
          <div className="query-setup__landing-page__action-group__body__column">
            {editActions.map((action) => (
              <QuerySetupAction key={action.key} action={action} />
            ))}
          </div>
          <div className="query-setup__landing-page__action-group__body__column">
            {createActions.map((action) => (
              <QuerySetupAction key={action.key} action={action} />
            ))}
          </div>
        </div>
        <div className="query-setup__landing-page__action-group__footer">
          <div className="query-setup__landing-page__action-group__footer__content">
            {!setupStore.showAdvancedActions && (
              <button
                className="query-setup__landing-page__action-group__footer__btn"
                onClick={showAdvancedActions}
                tabIndex={-1}
                title="Show advanced actions"
              >
                <MoreHorizontalIcon />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  },
);

const QuerySetupLandingPage = observer(() => {
  const setupStore = useQuerySetupStore();
  const applicationStore = useLegendQueryApplicationStore();
  const params = getQueryParameters<QuerySetupQueryParams>(
    applicationStore.navigator.getCurrentAddress(),
    true,
  );
  const showAdvancedActions =
    params[LEGEND_QUERY_SETUP_QUERY_PARAM_TOKEN.SHOW_ADVANCED_ACTIONS];
  const showAllGroups =
    params[LEGEND_QUERY_SETUP_QUERY_PARAM_TOKEN.SHOW_ALL_GROUPS];
  const tagToFocus = params[LEGEND_QUERY_SETUP_QUERY_PARAM_TOKEN.TAG];
  const goToStudio = (): void =>
    applicationStore.navigator.visitAddress(applicationStore.config.studioUrl);
  const showAllActionGroup = (): void => setupStore.setShowAllGroups(true);

  useEffect(() => {
    setupStore.initialize(showAdvancedActions, showAllGroups, tagToFocus);
  }, [setupStore, showAdvancedActions, showAllGroups, tagToFocus]);

  return (
    <div className="query-setup__landing-page">
      {setupStore.initState.hasCompleted && (
        <>
          <div className="query-setup__landing-page__title">
            What do you want to do today
            <QuestionCircleIcon
              className="query-setup__landing-page__title__question-mark"
              title="Choose one of the option below to start"
            />
          </div>
          <div className="query-setup__landing-page__actions">
            {setupStore.tagToFocus && (
              <QuerySetupActionGroup tag={setupStore.tagToFocus} />
            )}
            {!setupStore.tagToFocus && (
              <>
                <QuerySetupActionGroup />
                {setupStore.showAllGroups && (
                  <>
                    {setupStore.tags.map((tag) => (
                      <QuerySetupActionGroup key={tag} tag={tag} />
                    ))}
                    <div className="query-setup__landing-page__action-group query-setup__landing-page__action-group--studio">
                      <div className="query-setup__landing-page__action-group__tag">
                        Studio
                      </div>
                      <div className="query-setup__landing-page__action-group__header" />
                      <div className="query-setup__landing-page__action-group__body">
                        <button
                          className="query-setup__landing-page__action query-setup__landing-page__action--studio"
                          onClick={goToStudio}
                          tabIndex={-1}
                        >
                          <div className="query-setup__landing-page__action__icon">
                            <PencilIcon />
                          </div>
                          <div className="query-setup__landing-page__action__label">
                            Open Legend Studio
                          </div>
                        </button>
                      </div>
                      <div className="query-setup__landing-page__action-group__footer" />
                    </div>
                  </>
                )}
                {!setupStore.showAllGroups && (
                  <div className="query-setup__landing-page__footer">
                    <button
                      className="query-setup__landing-page__footer__more-btn"
                      onClick={showAllActionGroup}
                      tabIndex={-1}
                      title="Show all action groups"
                    >
                      <ChevronDownThinIcon />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
});

export const QuerySetup = withQuerySetupStore(
  observer(() => {
    const setupStore = useQuerySetupStore();
    const querySetupState = setupStore.querySetupState;
    const renderQuerySetupScreen = (
      setupState: QuerySetupState,
    ): React.ReactNode => {
      if (setupState instanceof EditExistingQuerySetupState) {
        return <EditExistingQuerySetup querySetupState={setupState} />;
      } else if (setupState instanceof CreateMappingQuerySetupState) {
        return <CreateMappingQuerySetup querySetupState={setupState} />;
      } else if (setupState instanceof CloneServiceQuerySetupState) {
        return <CloneServiceQuerySetup querySetupState={setupState} />;
      } else if (setupState instanceof UpdateExistingServiceQuerySetupState) {
        return <UpdateExistingServiceQuerySetup querySetupState={setupState} />;
      } else if (setupState instanceof LoadProjectServiceQuerySetupState) {
        return <LoadProjectServiceQuerySetup querySetupState={setupState} />;
      } else if (setupState instanceof QueryProductionizationSetupState) {
        return <QueryProductionizationSetup querySetupState={setupState} />;
      }
      const extraQuerySetupRenderers = setupStore.pluginManager
        .getApplicationPlugins()
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
      <>
        <PanelLoadingIndicator isLoading={setupStore.initState.isInProgress} />
        <div className="query-setup">
          {!querySetupState && <QuerySetupLandingPage />}
          {querySetupState && renderQuerySetupScreen(querySetupState)}
        </div>
      </>
    );
  }),
);
