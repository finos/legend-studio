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
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { debounce, guaranteeNonNullable, isString } from '@finos/legend-shared';
import type { Project } from '@finos/legend-server-sdlc';
import {
  type WorkspaceOption,
  type ProjectOption,
  ActivityBarMenu,
  buildWorkspaceOption,
  formatWorkspaceOptionLabel,
  LEGEND_STUDIO_TEST_ID,
  useLegendStudioApplicationStore,
  buildProjectOption,
  getProjectOptionLabelFormatter,
  useLegendStudioBaseStore,
} from '@finos/legend-application-studio';
import { UpdateProjectServiceQuerySetupStore } from '../../stores/studio/UpdateProjectServiceQuerySetupStore.js';
import {
  type ProjectServiceQueryUpdaterSetupPathParams,
  generateProjectServiceQueryUpdaterRoute,
} from '../../__lib__/studio/DSL_Service_LegendStudioNavigation.js';
import { flowResult } from 'mobx';
import {
  compareLabelFn,
  CustomSelectorInput,
  Dialog,
  GitBranchIcon,
  Panel,
  PanelFormTextField,
  PanelFullContent,
  PanelLoadingIndicator,
  PlusIcon,
  PURE_ServiceIcon,
  RepoIcon,
} from '@finos/legend-art';
import type { Entity } from '@finos/legend-storage';
import { extractElementNameFromPath } from '@finos/legend-graph';
import { useParams } from '@finos/legend-application/browser';

const UpdateProjectServiceQuerySetupStoreContext = createContext<
  UpdateProjectServiceQuerySetupStore | undefined
>(undefined);

const UpdateProjectServiceQuerySetupStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendStudioApplicationStore();
  const baseStore = useLegendStudioBaseStore();
  const store = useLocalObservable(
    () =>
      new UpdateProjectServiceQuerySetupStore(
        applicationStore,
        baseStore.sdlcServerClient,
      ),
  );
  return (
    <UpdateProjectServiceQuerySetupStoreContext.Provider value={store}>
      {children}
    </UpdateProjectServiceQuerySetupStoreContext.Provider>
  );
};

const useUpdateProjectServiceQuerySetupStore =
  (): UpdateProjectServiceQuerySetupStore =>
    guaranteeNonNullable(
      useContext(UpdateProjectServiceQuerySetupStoreContext),
      `Can't find project service query updater store in context`,
    );

const withUpdateProjectServiceQuerySetupStore = (
  WrappedComponent: React.FC,
): React.FC =>
  function WithUpdateProjectServiceQuerySetupStore() {
    return (
      <UpdateProjectServiceQuerySetupStoreProvider>
        <WrappedComponent />
      </UpdateProjectServiceQuerySetupStoreProvider>
    );
  };

const CreateWorkspaceModal = observer((props: { selectedProject: Project }) => {
  const { selectedProject } = props;
  const setupStore = useUpdateProjectServiceQuerySetupStore();
  const applicationStore = useLegendStudioApplicationStore();
  const workspaceNameInputRef = useRef<HTMLInputElement>(null);
  const [workspaceName, setWorkspaceName] = useState('');

  const workspaceAlreadyExists = Boolean(
    setupStore.groupWorkspaces.find(
      (workspace) => workspace.workspaceId === workspaceName,
    ),
  );
  const createWorkspace = (): void => {
    if (
      workspaceName &&
      !workspaceAlreadyExists &&
      setupStore.currentProjectConfigurationStatus?.isConfigured
    ) {
      flowResult(
        setupStore.createWorkspace(selectedProject.projectId, workspaceName),
      ).catch(applicationStore.alertUnhandledError);
    }
  };
  const handleEnter = (): void => {
    workspaceNameInputRef.current?.focus();
  };
  const onClose = (): void => {
    setupStore.setShowCreateWorkspaceModal(false);
  };

  return (
    <Dialog
      open={setupStore.showCreateWorkspaceModal}
      onClose={onClose}
      slotProps={{
        transition: {
          onEnter: handleEnter,
        },
        paper: {
          classes: { root: 'search-modal__inner-container' },
        },
      }}
      classes={{ container: 'search-modal__container' }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          createWorkspace();
        }}
        className="modal modal--dark search-modal"
      >
        <div className="modal__title">Create New Workspace</div>
        <Panel>
          <PanelLoadingIndicator
            isLoading={setupStore.createWorkspaceState.isInProgress}
          />
          <PanelFullContent>
            <PanelFormTextField
              ref={workspaceNameInputRef}
              name="Workspace Name"
              isReadOnly={setupStore.createWorkspaceState.isInProgress}
              placeholder="MyWorkspace"
              value={workspaceName}
              update={(val: string | undefined) => setWorkspaceName(val ?? '')}
              errorMessage={
                workspaceAlreadyExists
                  ? 'Workspace with same name already exists '
                  : ''
              }
            />
          </PanelFullContent>
        </Panel>
        <div className="search-modal__actions">
          <button
            disabled={
              setupStore.createWorkspaceState.isInProgress ||
              !workspaceName ||
              workspaceAlreadyExists
            }
            className="btn btn--dark"
          >
            Create
          </button>
        </div>
      </form>
    </Dialog>
  );
});

type ServiceOption = {
  label: string;
  value: {
    name: string;
    path: string;
    urlPattern: string | undefined;
    entity: Entity;
  };
};
const buildServiceOption = (entity: Entity): ServiceOption => ({
  label: extractElementNameFromPath(entity.path),
  value: {
    name: extractElementNameFromPath(entity.path),
    path: entity.path,
    // NOTE: we don't want to assert the existence of this field even when it
    // is required in the specification of service to avoid throwing error here
    urlPattern: isString(entity.content.pattern)
      ? entity.content.pattern
      : undefined,
    entity,
  },
});
const formatServiceOptionLabel = (option: ServiceOption): React.ReactNode => (
  <div
    className="query-setup__service-option"
    title={`${option.label} - ${option.value.urlPattern ?? ''} - ${
      option.value.path
    }`}
  >
    <div className="query-setup__service-option__label">{option.label}</div>
    <div className="query-setup__service-option__path">{option.value.path}</div>
    <div className="query-setup__service-option__pattern">
      {option.value.urlPattern ?? 'no pattern'}
    </div>
  </div>
);

export const UpdateProjectServiceQuerySetup =
  withUpdateProjectServiceQuerySetupStore(
    observer(() => {
      const params = useParams<ProjectServiceQueryUpdaterSetupPathParams>();
      const { projectId } = params;
      const setupStore = useUpdateProjectServiceQuerySetupStore();
      const applicationStore = useLegendStudioApplicationStore();
      const [projectSearchText, setProjectSearchText] = useState('');

      // action
      const disableProceedButton =
        !setupStore.currentProject ||
        !setupStore.currentGroupWorkspace ||
        !setupStore.currentService ||
        !setupStore.currentProjectConfigurationStatus?.isConfigured;
      const handleProceed = (): void => {
        if (
          setupStore.currentProject &&
          setupStore.currentGroupWorkspace &&
          setupStore.currentService
        ) {
          applicationStore.navigationService.navigator.goToLocation(
            generateProjectServiceQueryUpdaterRoute(
              setupStore.currentProject.projectId,
              setupStore.currentGroupWorkspace.workspaceId,
              setupStore.currentService.path,
            ),
          );
        }
      };

      // projects
      const projectOptions = setupStore.projects.map(buildProjectOption);
      const selectedProjectOption = setupStore.currentProject
        ? buildProjectOption(setupStore.currentProject)
        : null;
      const onProjectOptionChange = (option: ProjectOption | null): void => {
        if (option) {
          flowResult(setupStore.changeProject(option.value)).catch(
            applicationStore.alertUnhandledError,
          );
        } else {
          setupStore.resetCurrentProject();
        }
      };

      // project search text
      const debouncedLoadProjects = useMemo(
        () =>
          debounce((input: string): void => {
            flowResult(setupStore.loadProjects(input)).catch(
              applicationStore.alertUnhandledError,
            );
          }, 500),
        [applicationStore, setupStore],
      );
      const onProjectSearchTextChange = (value: string): void => {
        if (value !== projectSearchText) {
          setProjectSearchText(value);
          debouncedLoadProjects.cancel();
          debouncedLoadProjects(value);
        }
      };

      // workspaces
      const workspaceOptions = setupStore.groupWorkspaces
        .map(buildWorkspaceOption)
        .sort(compareLabelFn);
      const selectedOption = setupStore.currentGroupWorkspace
        ? buildWorkspaceOption(setupStore.currentGroupWorkspace)
        : null;
      const onWorkspaceChange = (option: WorkspaceOption | null): void => {
        if (option) {
          flowResult(setupStore.changeWorkspace(option.value)).catch(
            applicationStore.alertUnhandledError,
          );
          if (!setupStore.currentProjectConfigurationStatus?.isConfigured) {
            applicationStore.notificationService.notifyIllegalState(
              `Can't edit service query as the project is not configured`,
            );
          }
        } else {
          setupStore.resetCurrentGroupWorkspace();
        }
      };
      const showCreateWorkspaceModal = (): void =>
        setupStore.setShowCreateWorkspaceModal(true);

      // services
      const serviceOptions = setupStore.services.map(buildServiceOption);
      const selectedServiceOption = setupStore.currentService
        ? buildServiceOption(setupStore.currentService)
        : null;
      const onServiceOptionChange = (option: ServiceOption | null): void => {
        if (option) {
          setupStore.changeService(option.value.entity);
          if (!setupStore.currentProjectConfigurationStatus?.isConfigured) {
            applicationStore.notificationService.notifyIllegalState(
              `Can't edit current service query as the current project is not configured`,
            );
          }
        } else {
          setupStore.resetCurrentService();
        }
      };

      useEffect(() => {
        flowResult(setupStore.loadProjects('')).catch(
          applicationStore.alertUnhandledError,
        );
      }, [setupStore, applicationStore]);

      useEffect(() => {
        setupStore.initialize(projectId);
      }, [setupStore, projectId]);

      return (
        <div className="app__page">
          <div className="service-query-setup">
            <div className="service-query-setup__body">
              <div className="activity-bar">
                <ActivityBarMenu />
              </div>
              <div
                className="service-query-setup__content"
                data-testid={LEGEND_STUDIO_TEST_ID.SETUP__CONTENT}
              >
                <div className="service-query-setup__content__main">
                  <div className="service-query-setup__title">
                    <div className="service-query-setup__title__header">
                      Update Project Service Query
                    </div>
                  </div>
                  <div className="service-query-setup__selector">
                    <div
                      className="service-query-setup__selector__icon"
                      title="service"
                    >
                      <RepoIcon className="service-query-setup__selector__icon--project" />
                    </div>
                    <CustomSelectorInput
                      className="service-query-setup__selector__input"
                      options={projectOptions}
                      isLoading={setupStore.loadProjectsState.isInProgress}
                      onInputChange={onProjectSearchTextChange}
                      inputValue={projectSearchText}
                      value={selectedProjectOption}
                      onChange={onProjectOptionChange}
                      placeholder="Search for project..."
                      darkMode={
                        !applicationStore.layoutService
                          .TEMPORARY__isLightColorThemeEnabled
                      }
                      isClearable={true}
                      escapeClearsValue={true}
                      formatOptionLabel={getProjectOptionLabelFormatter(
                        applicationStore,
                        setupStore.currentProjectConfigurationStatus,
                      )}
                    />
                  </div>
                  <div className="service-query-setup__selector">
                    <div
                      className="service-query-setup__selector__icon"
                      title="workspace"
                    >
                      <GitBranchIcon className="service-query-setup__selector__icon--workspace" />
                    </div>
                    <CustomSelectorInput
                      className="service-query-setup__selector__input"
                      options={workspaceOptions}
                      disabled={
                        !setupStore.currentProject ||
                        !setupStore.currentProjectConfigurationStatus ||
                        !setupStore.currentProjectConfigurationStatus
                          .isConfigured ||
                        setupStore.loadWorkspacesState.isInProgress
                      }
                      isLoading={setupStore.loadWorkspacesState.isInProgress}
                      onChange={onWorkspaceChange}
                      formatOptionLabel={formatWorkspaceOptionLabel}
                      value={selectedOption}
                      placeholder={
                        setupStore.loadWorkspacesState.isInProgress
                          ? 'Loading workspaces...'
                          : !setupStore.currentProject
                            ? 'In order to choose a workspace, a project must be selected'
                            : workspaceOptions.length
                              ? 'Choose an existing workspace'
                              : setupStore.loadWorkspacesState.hasFailed
                                ? `Can't fetch project workspaces. Please try again or choose another service`
                                : 'You have no workspaces. Please create one to proceed...'
                      }
                      isClearable={true}
                      escapeClearsValue={true}
                      darkMode={
                        !applicationStore.layoutService
                          .TEMPORARY__isLightColorThemeEnabled
                      }
                    />
                    <button
                      className="service-query-setup__selector__action btn--dark"
                      onClick={showCreateWorkspaceModal}
                      disabled={!setupStore.currentProject}
                      tabIndex={-1}
                      title="Create a Workspace"
                    >
                      <PlusIcon />
                    </button>
                  </div>
                  <div className="service-query-setup__selector">
                    <div
                      className="service-query-setup__selector__icon"
                      title="service"
                    >
                      <PURE_ServiceIcon />
                    </div>
                    <CustomSelectorInput
                      className="service-query-setup__selector__input"
                      disabled={
                        !setupStore.currentGroupWorkspace ||
                        !serviceOptions.length
                      }
                      options={serviceOptions}
                      value={selectedServiceOption}
                      onChange={onServiceOptionChange}
                      placeholder={
                        !setupStore.currentGroupWorkspace
                          ? 'In order to choose a service, a workspace must be chosen'
                          : serviceOptions.length
                            ? 'Choose an existing service'
                            : 'You have no services to load'
                      }
                      darkMode={
                        !applicationStore.layoutService
                          .TEMPORARY__isLightColorThemeEnabled
                      }
                      isClearable={true}
                      escapeClearsValue={true}
                      formatOptionLabel={formatServiceOptionLabel}
                    />
                  </div>
                  {setupStore.showCreateWorkspaceModal &&
                    setupStore.currentProject && (
                      <CreateWorkspaceModal
                        selectedProject={setupStore.currentProject}
                      />
                    )}
                  <div className="service-query-setup__actions">
                    <button
                      className="service-query-setup__next-btn btn--dark"
                      onClick={handleProceed}
                      disabled={disableProceedButton}
                    >
                      Edit Service Query
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div
              data-testid={LEGEND_STUDIO_TEST_ID.STATUS_BAR}
              className="editor__status-bar"
            />
          </div>
        </div>
      );
    }),
  );
