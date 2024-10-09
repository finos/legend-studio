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
  ArrowLeftIcon,
  ArrowRightIcon,
  BlankPanelContent,
  clsx,
  CustomSelectorInput,
  PanelLoadingIndicator,
} from '@finos/legend-art';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  compareSemVerVersions,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { useContext, useEffect, useState } from 'react';
import {
  generateQuerySetupRoute,
  generateServiceQueryCreatorRoute,
} from '../__lib__/LegendQueryNavigation.js';
import { LATEST_VERSION_ALIAS } from '@finos/legend-server-depot';
import { useApplicationStore } from '@finos/legend-application';
import {
  useLegendQueryApplicationStore,
  useLegendQueryBaseStore,
} from './LegendQueryFrameworkProvider.js';
import {
  CloneServiceQuerySetupStore,
  type ServiceExecutionOption,
} from '../stores/CloneServiceQuerySetupStore.js';
import {
  BaseQuerySetup,
  BaseQuerySetupStoreContext,
  buildProjectOption,
  buildVersionOption,
  type ProjectOption,
  type VersionOption,
} from './QuerySetup.js';

const CloneServiceQuerySetupStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendQueryApplicationStore();
  const baseStore = useLegendQueryBaseStore();
  const store = useLocalObservable(
    () =>
      new CloneServiceQuerySetupStore(
        applicationStore,
        baseStore.depotServerClient,
      ),
  );
  return (
    <BaseQuerySetupStoreContext.Provider value={store}>
      {children}
    </BaseQuerySetupStoreContext.Provider>
  );
};

const useCloneServiceQuerySetupStore = (): CloneServiceQuerySetupStore =>
  guaranteeType(
    useContext(BaseQuerySetupStoreContext),
    CloneServiceQuerySetupStore,
    `Can't find query setup store in context`,
  );

const CloneQueryServiceSetupContent = observer(() => {
  const applicationStore = useApplicationStore();
  const querySetupState = useCloneServiceQuerySetupStore();
  const depotServerClient = querySetupState.depotServerClient;

  const [fetchSelectedProjectVersionsStatus] = useState(ActionState.create());

  // actions
  const back = (): void => {
    applicationStore.navigationService.navigator.goToLocation(
      generateQuerySetupRoute(),
    );
  };
  const next = (): void => {
    if (
      querySetupState.currentProject &&
      querySetupState.currentVersionId &&
      querySetupState.currentServiceExecutionOption
    ) {
      applicationStore.navigationService.navigator.goToLocation(
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
  const onProjectOptionChange = async (
    option: ProjectOption | null,
  ): Promise<void> => {
    if (option?.value !== querySetupState.currentProject) {
      querySetupState.setCurrentProject(option?.value);
      // cascade
      querySetupState.setCurrentVersionId(undefined);
      querySetupState.setCurrentServiceExecutionOption(undefined);
      querySetupState.setCurrentProjectVersions([]);
      try {
        fetchSelectedProjectVersionsStatus.inProgress();
        const versions = await depotServerClient.getVersions(
          guaranteeNonNullable(option?.value.groupId),
          guaranteeNonNullable(option?.value.artifactId),
          true,
        );
        querySetupState.setCurrentProjectVersions(versions);
      } catch (error) {
        assertErrorThrown(error);
        applicationStore.notificationService.notifyError(error);
      } finally {
        fetchSelectedProjectVersionsStatus.reset();
      }
    }
  };

  // version
  const versionOptions = [
    LATEST_VERSION_ALIAS,
    ...(querySetupState.currentProjectVersions ?? []),
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
      if (querySetupState.currentProject && querySetupState.currentVersionId) {
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
              onChange={(option: ProjectOption | null) => {
                onProjectOptionChange(option).catch(
                  applicationStore.alertUnhandledError,
                );
              }}
              value={selectedProjectOption}
              placeholder={projectSelectorPlaceholder}
              isClearable={true}
              escapeClearsValue={true}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
            />
          </div>
          <div className="query-setup__wizard__group">
            <div className="query-setup__wizard__group__title">Version</div>
            <CustomSelectorInput
              className="query-setup__wizard__selector"
              options={versionOptions}
              disabled={!querySetupState.currentProject}
              isLoading={fetchSelectedProjectVersionsStatus.isInProgress}
              onChange={(option: VersionOption | null) => {
                onVersionOptionChange(option).catch(
                  applicationStore.alertUnhandledError,
                );
              }}
              value={selectedVersionOption}
              placeholder={
                fetchSelectedProjectVersionsStatus.isInProgress
                  ? 'Fetching project versions'
                  : versionSelectorPlaceholder
              }
              isClearable={true}
              escapeClearsValue={true}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
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
                    darkMode={
                      !applicationStore.layoutService
                        .TEMPORARY__isLightColorThemeEnabled
                    }
                  />
                </div>
              </>
            )}
        </div>
      </div>
    </div>
  );
});

export const CloneQueryServiceSetup: React.FC = () => (
  <CloneServiceQuerySetupStoreProvider>
    <BaseQuerySetup>
      <CloneQueryServiceSetupContent />
    </BaseQuerySetup>
  </CloneServiceQuerySetupStoreProvider>
);
