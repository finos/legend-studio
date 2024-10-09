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
  getNullableFirstEntry,
  guaranteeNonNullable,
  guaranteeType,
  compareSemVerVersions,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { useContext, useEffect, useState } from 'react';
import {
  generateMappingQueryCreatorRoute,
  generateQuerySetupRoute,
} from '../__lib__/LegendQueryNavigation.js';
import { LATEST_VERSION_ALIAS } from '@finos/legend-server-depot';
import { useApplicationStore } from '@finos/legend-application';
import {
  useLegendQueryApplicationStore,
  useLegendQueryBaseStore,
} from './LegendQueryFrameworkProvider.js';
import { CreateMappingQuerySetupStore } from '../stores/CreateMappingQuerySetupStore.js';
import {
  BaseQuerySetup,
  BaseQuerySetupStoreContext,
  buildProjectOption,
  buildVersionOption,
  type ProjectOption,
  type VersionOption,
} from './QuerySetup.js';
import type { Mapping, PackageableRuntime } from '@finos/legend-graph';
import {
  buildElementOption,
  getPackageableElementOptionFormatter,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';

const CreateMappingQuerySetupStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendQueryApplicationStore();
  const baseStore = useLegendQueryBaseStore();
  const store = useLocalObservable(
    () =>
      new CreateMappingQuerySetupStore(
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

const useCreateMappingQuerySetupStore = (): CreateMappingQuerySetupStore =>
  guaranteeType(
    useContext(BaseQuerySetupStoreContext),
    CreateMappingQuerySetupStore,
    `Can't find query setup store in context`,
  );

const CreateMappingQuerySetupContent = observer(() => {
  const setupStore = useCreateMappingQuerySetupStore();
  const applicationStore = useApplicationStore();
  const depotServerClient = setupStore.depotServerClient;

  const [fetchSelectedProjectVersionsStatus] = useState(ActionState.create());

  // actions
  const back = (): void => {
    applicationStore.navigationService.navigator.goToLocation(
      generateQuerySetupRoute(),
    );
  };
  const next = (): void => {
    if (
      setupStore.currentProject &&
      setupStore.currentVersionId &&
      setupStore.currentMapping &&
      setupStore.currentRuntime
    ) {
      applicationStore.navigationService.navigator.goToLocation(
        generateMappingQueryCreatorRoute(
          setupStore.currentProject.groupId,
          setupStore.currentProject.artifactId,
          setupStore.currentVersionId,
          setupStore.currentMapping.path,
          setupStore.currentRuntime.path,
        ),
      );
    }
  };
  const canProceed =
    setupStore.currentProject &&
    setupStore.currentVersionId &&
    setupStore.currentMapping &&
    setupStore.currentRuntime;

  // project
  const projectOptions = setupStore.projects.map(buildProjectOption);
  const selectedProjectOption = setupStore.currentProject
    ? buildProjectOption(setupStore.currentProject)
    : null;
  const projectSelectorPlaceholder = setupStore.loadProjectsState.isInProgress
    ? 'Loading projects'
    : setupStore.loadProjectsState.hasFailed
      ? 'Error fetching projects'
      : setupStore.projects.length
        ? 'Choose a project'
        : 'You have no projects, please create or acquire access for at least one';
  const onProjectOptionChange = async (
    option: ProjectOption | null,
  ): Promise<void> => {
    if (option?.value !== setupStore.currentProject) {
      setupStore.setCurrentProject(option?.value);
      // cascade
      setupStore.setCurrentVersionId(undefined);
      setupStore.setCurrentMapping(undefined);
      setupStore.setCurrentRuntime(undefined);
      setupStore.setCurrentProjectVersions([]);
      try {
        fetchSelectedProjectVersionsStatus.inProgress();
        const versions = await depotServerClient.getVersions(
          guaranteeNonNullable(option?.value.groupId),
          guaranteeNonNullable(option?.value.artifactId),
          true,
        );
        setupStore.setCurrentProjectVersions(versions);
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
    ...(setupStore.currentProjectVersions ?? []),
  ]
    .slice()
    .sort((v1, v2) => compareSemVerVersions(v2, v1))
    .map(buildVersionOption);
  const selectedVersionOption = setupStore.currentVersionId
    ? buildVersionOption(setupStore.currentVersionId)
    : null;
  const versionSelectorPlaceholder = !setupStore.currentProject
    ? 'No project selected'
    : 'Choose a version';
  const onVersionOptionChange = async (
    option: VersionOption | null,
  ): Promise<void> => {
    if (option?.value !== setupStore.currentVersionId) {
      setupStore.setCurrentVersionId(option?.value);
      // cascade
      setupStore.setCurrentMapping(undefined);
      setupStore.setCurrentRuntime(undefined);
      if (setupStore.currentProject && setupStore.currentVersionId) {
        await flowResult(
          setupStore.surveyMappingRuntimeCompatibility(
            setupStore.currentProject,
            setupStore.currentVersionId,
          ),
        ).catch(applicationStore.alertUnhandledError);
      }
    }
  };

  // mapping
  const mappingOptions = setupStore.mappingRuntimeCompatibilitySurveyResult.map(
    (result) => buildElementOption(result.mapping),
  );
  const selectedMappingOption = setupStore.currentMapping
    ? {
        label: setupStore.currentMapping.name,
        value: setupStore.currentMapping,
      }
    : null;
  const onMappingOptionChange = (
    option: PackageableElementOption<Mapping> | null,
  ): void => {
    setupStore.setCurrentMapping(option?.value);
    // cascade
    if (setupStore.currentMapping) {
      setupStore.setCurrentRuntime(
        getNullableFirstEntry(setupStore.compatibleRuntimes),
      );
    } else {
      setupStore.setCurrentRuntime(undefined);
    }
  };

  // runtime
  const runtimeOptions = setupStore.compatibleRuntimes.map(buildElementOption);
  const selectedRuntimeOption = setupStore.currentRuntime
    ? {
        label: setupStore.currentRuntime.name,
        value: setupStore.currentRuntime,
      }
    : null;
  const runtimeSelectorPlaceholder = !setupStore.currentMapping
    ? 'No mapping specified'
    : runtimeOptions.length
      ? 'Choose a runtime'
      : 'No runtime available';
  const onRuntimeOptionChange = (
    option: PackageableElementOption<PackageableRuntime> | null,
  ): void => {
    setupStore.setCurrentRuntime(option?.value);
  };

  useEffect(() => {
    flowResult(setupStore.loadProjects()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [setupStore, applicationStore]);

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
                setupStore.loadProjectsState.isInProgress ||
                !projectOptions.length
              }
              isLoading={setupStore.loadProjectsState.isInProgress}
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
              disabled={!setupStore.currentProject}
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
        <div className="query-setup__create-query__graph">
          {(!setupStore.currentProject ||
            !setupStore.currentVersionId ||
            !setupStore.surveyMappingRuntimeCompatibilityState
              .hasSucceeded) && (
            <div className="query-setup__create-query__graph__loader">
              <PanelLoadingIndicator
                isLoading={
                  Boolean(setupStore.currentProject) &&
                  Boolean(setupStore.currentVersionId) &&
                  !setupStore.surveyMappingRuntimeCompatibilityState
                    .hasSucceeded
                }
              />
              <BlankPanelContent>
                {setupStore.surveyMappingRuntimeCompatibilityState.isInProgress
                  ? `Surveying runtime and mapping compatibility...`
                  : setupStore.surveyMappingRuntimeCompatibilityState.hasFailed
                    ? `Can't load runtime and mapping`
                    : 'Project and version must be specified'}
              </BlankPanelContent>
            </div>
          )}
          {setupStore.currentProject &&
            setupStore.currentVersionId &&
            setupStore.surveyMappingRuntimeCompatibilityState.hasSucceeded && (
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
                    placeholder={
                      mappingOptions.length
                        ? 'Choose a mapping'
                        : 'No mapping available'
                    }
                    isClearable={true}
                    escapeClearsValue={true}
                    darkMode={
                      !applicationStore.layoutService
                        .TEMPORARY__isLightColorThemeEnabled
                    }
                    formatOptionLabel={getPackageableElementOptionFormatter({
                      darkMode:
                        !applicationStore.layoutService
                          .TEMPORARY__isLightColorThemeEnabled,
                    })}
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
                      !mappingOptions.length || !setupStore.currentMapping
                    }
                    onChange={onRuntimeOptionChange}
                    value={selectedRuntimeOption}
                    placeholder={runtimeSelectorPlaceholder}
                    isClearable={true}
                    escapeClearsValue={true}
                    darkMode={
                      !applicationStore.layoutService
                        .TEMPORARY__isLightColorThemeEnabled
                    }
                    formatOptionLabel={getPackageableElementOptionFormatter({
                      darkMode:
                        !applicationStore.layoutService
                          .TEMPORARY__isLightColorThemeEnabled,
                    })}
                  />
                </div>
              </>
            )}
        </div>
      </div>
    </div>
  );
});

export const CreateMappingQuerySetup: React.FC = () => (
  <CreateMappingQuerySetupStoreProvider>
    <BaseQuerySetup>
      <CreateMappingQuerySetupContent />
    </BaseQuerySetup>
  </CreateMappingQuerySetupStoreProvider>
);
