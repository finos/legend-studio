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
import { debounce, guaranteeNonNullable } from '@finos/legend-shared';
import { WorkspaceType } from '@finos/legend-server-sdlc';
import {
  type WorkspaceOption,
  ActivityBarMenu,
  buildWorkspaceOption,
  LEGEND_STUDIO_TEST_ID,
  useLegendStudioApplicationStore,
  useLegendStudioBaseStore,
} from '@finos/legend-application-studio';
import { UpdateServiceQuerySetupStore } from '../../stores/studio/UpdateServiceQuerySetupStore.js';
import type { StoreProjectData } from '@finos/legend-server-depot';
import {
  type ServiceQueryUpdaterSetupPathParams,
  generateServiceQueryUpdaterRoute,
} from '../../__lib__/studio/DSL_Service_LegendStudioNavigation.js';
import { flowResult } from 'mobx';
import {
  type ServiceInfo,
  type ServiceOption,
  buildServiceOption,
  formatServiceOptionLabel,
} from '@finos/legend-query-builder';
import {
  CircleNotchIcon,
  clsx,
  compareLabelFn,
  CustomSelectorInput,
  Dialog,
  ErrorIcon,
  GitBranchIcon,
  ModalTitle,
  Panel,
  PanelFullContent,
  PanelLoadingIndicator,
  PlusIcon,
  PURE_ServiceIcon,
  UserIcon,
  UsersIcon,
} from '@finos/legend-art';
import { useParams } from '@finos/legend-application/browser';

const UpdateServiceQuerySetupStoreContext = createContext<
  UpdateServiceQuerySetupStore | undefined
>(undefined);

const UpdateServiceQuerySetupStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendStudioApplicationStore();
  const baseStore = useLegendStudioBaseStore();
  const store = useLocalObservable(
    () =>
      new UpdateServiceQuerySetupStore(
        applicationStore,
        baseStore.sdlcServerClient,
        baseStore.depotServerClient,
      ),
  );
  return (
    <UpdateServiceQuerySetupStoreContext.Provider value={store}>
      {children}
    </UpdateServiceQuerySetupStoreContext.Provider>
  );
};

const useUpdateServiceQuerySetupStore = (): UpdateServiceQuerySetupStore =>
  guaranteeNonNullable(
    useContext(UpdateServiceQuerySetupStoreContext),
    `Can't find service query updater store in context`,
  );

const withUpdateServiceQuerySetupStore = (
  WrappedComponent: React.FC,
): React.FC =>
  function WithUpdateServiceQuerySetupStore() {
    return (
      <UpdateServiceQuerySetupStoreProvider>
        <WrappedComponent />
      </UpdateServiceQuerySetupStoreProvider>
    );
  };

const CreateWorkspaceModal = observer(
  (props: {
    selectedProject: StoreProjectData;
    selectedSnapService: ServiceInfo;
  }) => {
    const { selectedProject, selectedSnapService } = props;
    const setupStore = useUpdateServiceQuerySetupStore();
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
          setupStore.createWorkspace(
            selectedProject.projectId,
            workspaceName,
            selectedSnapService.path,
          ),
        ).catch(applicationStore.alertUnhandledError);
      }
    };
    const changeWorkspaceName: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => setWorkspaceName(event.target.value);

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
          <ModalTitle title="Create New Workspace" />
          <Panel>
            <PanelLoadingIndicator
              isLoading={setupStore.createWorkspaceState.isInProgress}
            />
            <PanelFullContent>
              <div className="input-group">
                <input
                  className="input input--dark input-group__input"
                  ref={workspaceNameInputRef}
                  spellCheck={false}
                  disabled={setupStore.createWorkspaceState.isInProgress}
                  placeholder="MyWorkspace"
                  value={workspaceName}
                  onChange={changeWorkspaceName}
                />
                {workspaceAlreadyExists && (
                  <div className="input-group__error-message">
                    Workspace with same name already exists
                  </div>
                )}
              </div>
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
  },
);

export const UpdateServiceQuerySetup = withUpdateServiceQuerySetupStore(
  observer(() => {
    const params = useParams<ServiceQueryUpdaterSetupPathParams>();
    const { serviceCoordinates } = params;
    const setupStore = useUpdateServiceQuerySetupStore();
    const applicationStore = useLegendStudioApplicationStore();
    const [serviceSearchText, setServiceSearchText] = useState('');

    // action
    const disableProceedButton =
      !setupStore.currentProject ||
      !setupStore.currentGroupWorkspace ||
      !setupStore.currentWorkspaceService ||
      !setupStore.currentProjectConfigurationStatus?.isConfigured;
    const handleProceed = (): void => {
      if (
        setupStore.currentProject &&
        setupStore.currentGroupWorkspace &&
        setupStore.currentWorkspaceService
      ) {
        applicationStore.navigationService.navigator.goToLocation(
          generateServiceQueryUpdaterRoute(
            setupStore.currentProject.groupId,
            setupStore.currentProject.artifactId,
            setupStore.currentWorkspaceService.path,
            setupStore.currentGroupWorkspace.workspaceId,
          ),
        );
      }
    };

    // services
    const serviceOptions = setupStore.services.map(buildServiceOption);
    const selectedServiceOption = setupStore.currentSnapshotService
      ? buildServiceOption(setupStore.currentSnapshotService)
      : null;
    const onServiceOptionChange = (option: ServiceOption | null): void => {
      if (option) {
        flowResult(
          setupStore.changeService(
            option.value.groupId,
            option.value.artifactId,
            option.value.path,
          ),
        ).catch(applicationStore.alertUnhandledError);
        if (!setupStore.currentProjectConfigurationStatus?.isConfigured) {
          applicationStore.notificationService.notifyIllegalState(
            `Can't edit current service query as the current project is not configured`,
          );
        }
      } else {
        setupStore.resetCurrentService();
      }
    };

    // service search text
    const debouncedLoadServices = useMemo(
      () =>
        debounce((input: string): void => {
          flowResult(setupStore.loadServices(input)).catch(
            applicationStore.alertUnhandledError,
          );
        }, 500),
      [applicationStore, setupStore],
    );
    const onServiceSearchTextChange = (value: string): void => {
      if (value !== serviceSearchText) {
        setServiceSearchText(value);
        debouncedLoadServices.cancel();
        debouncedLoadServices(value);
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
        if (setupStore.currentSnapshotService) {
          flowResult(
            setupStore.changeWorkspace(
              option.value,
              setupStore.currentSnapshotService.path,
            ),
          ).catch(applicationStore.alertUnhandledError);
          if (!setupStore.currentProjectConfigurationStatus?.isConfigured) {
            applicationStore.notificationService.notifyIllegalState(
              `Can't edit service query as the project is not configured`,
            );
          }
        }
      } else {
        setupStore.resetCurrentGroupWorkspace();
      }
    };
    const showCreateWorkspaceModal = (): void =>
      setupStore.setShowCreateWorkspaceModal(true);
    const formatWorkspaceOptionLabel = (
      option: WorkspaceOption,
    ): React.ReactNode => {
      const isCurrentOptionInvalid =
        // we can only check the current workspace
        setupStore.currentGroupWorkspace === option.value &&
        !setupStore.currentWorkspaceService &&
        !setupStore.checkWorkspaceCompatibilityState.isInProgress;
      return (
        <div
          className="workspace-selector__option"
          title={
            isCurrentOptionInvalid
              ? `Chosen workspace does not have the specified service${
                  setupStore.currentSnapshotService
                    ? ` '${setupStore.currentSnapshotService.path}'`
                    : ''
                }\nPlease choose another appropriate workspace or create and use a new workspace`
              : setupStore.checkWorkspaceCompatibilityState.isInProgress
                ? `Checking if the specified service is present in the workspace`
                : undefined
          }
        >
          <div className="workspace-selector__option__icon">
            {option.value.workspaceType === WorkspaceType.GROUP ? (
              <UsersIcon />
            ) : (
              <UserIcon />
            )}
          </div>
          <div
            className={clsx('workspace-selector__option__name', {
              'service-query-setup__workspace-selector__option__name--invalid':
                isCurrentOptionInvalid,
            })}
          >
            {option.label}
            {isCurrentOptionInvalid && <ErrorIcon />}
            {setupStore.checkWorkspaceCompatibilityState.isInProgress && (
              <CircleNotchIcon className="service-query-setup__workspace-selector__option__loading-indicator" />
            )}
          </div>
        </div>
      );
    };

    useEffect(() => {
      flowResult(setupStore.loadServices('')).catch(
        applicationStore.alertUnhandledError,
      );
    }, [setupStore, applicationStore]);

    useEffect(() => {
      setupStore.initialize(serviceCoordinates);
    }, [setupStore, serviceCoordinates]);

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
                    Update Service Query
                  </div>
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
                    options={serviceOptions}
                    isLoading={setupStore.loadServicesState.isInProgress}
                    onInputChange={onServiceSearchTextChange}
                    inputValue={serviceSearchText}
                    value={selectedServiceOption}
                    onChange={onServiceOptionChange}
                    placeholder="Search for service..."
                    darkMode={
                      !applicationStore.layoutService
                        .TEMPORARY__isLightColorThemeEnabled
                    }
                    isClearable={true}
                    escapeClearsValue={true}
                    formatOptionLabel={formatServiceOptionLabel}
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
                      !setupStore.currentSnapshotService ||
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
                          ? 'In order to choose a workspace, a project must be chosen'
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
                {setupStore.showCreateWorkspaceModal &&
                  setupStore.currentProject &&
                  setupStore.currentSnapshotService && (
                    <CreateWorkspaceModal
                      selectedProject={setupStore.currentProject}
                      selectedSnapService={setupStore.currentSnapshotService}
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
