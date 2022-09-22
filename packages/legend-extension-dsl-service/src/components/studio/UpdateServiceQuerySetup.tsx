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
import { useSDLCServerClient, WorkspaceType } from '@finos/legend-server-sdlc';
import {
  type WorkspaceOption,
  ActivityBarMenu,
  buildWorkspaceOption,
  LEGEND_STUDIO_TEST_ID,
  useLegendStudioApplicationStore,
} from '@finos/legend-application-studio';
import { UpdateServiceQuerySetupStore } from '../../stores/studio/UpdateServiceQuerySetupStore.js';
import {
  type ProjectData,
  useDepotServerClient,
} from '@finos/legend-server-depot';
import { useParams } from 'react-router';
import {
  type ServiceQueryUpdaterSetupPathParams,
  generateServiceQueryUpdaterRoute,
} from '../../stores/studio/DSL_Service_LegendStudioRouter.js';
import { flowResult } from 'mobx';
import {
  type ServiceInfo,
  type ServiceOption,
  buildServiceOption,
  formatServiceOptionLabel,
} from '@finos/legend-query-builder';
import {
  clsx,
  compareLabelFn,
  createFilter,
  CustomSelectorInput,
  Dialog,
  ErrorIcon,
  GitBranchIcon,
  Panel,
  PanelLoadingIndicator,
  PlusIcon,
  PURE_ServiceIcon,
  UserIcon,
  UsersIcon,
} from '@finos/legend-art';

const UpdateServiceQuerySetupStoreContext = createContext<
  UpdateServiceQuerySetupStore | undefined
>(undefined);

const UpdateServiceQuerySetupStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendStudioApplicationStore();
  const sdlcServerClient = useSDLCServerClient();
  const depotServerClient = useDepotServerClient();
  const store = useLocalObservable(
    () =>
      new UpdateServiceQuerySetupStore(
        applicationStore,
        sdlcServerClient,
        depotServerClient,
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
    selectedProject: ProjectData;
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
      if (workspaceName && !workspaceAlreadyExists) {
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
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      createWorkspace();
    };

    return (
      <Dialog
        open={setupStore.showCreateWorkspaceModal}
        onClose={onClose}
        TransitionProps={{
          onEnter: handleEnter,
        }}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <form
          onSubmit={handleSubmit}
          className="modal modal--dark search-modal"
        >
          <div className="modal__title">Create New Workspace</div>
          <Panel>
            <PanelLoadingIndicator
              isLoading={setupStore.createWorkspaceState.isInProgress}
            />
            <div className="panel__content--full">
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
            </div>
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
      !setupStore.currentWorkspaceService;
    const handleProceed = (): void => {
      if (
        setupStore.currentProject &&
        setupStore.currentGroupWorkspace &&
        setupStore.currentWorkspaceService
      ) {
        applicationStore.navigator.goTo(
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
      } else {
        setupStore.resetCurrentService();
      }
    };
    const serviceFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: ServiceOption): string =>
        // NOTE: account for label, path, and URL pattern
        `${option.label} - ${option.value.urlPattern ?? ''} - ${
          option.value.path
        }`,
    });

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
        }
      } else {
        setupStore.resetCurrentGroupWorkspace();
      }
    };
    const showCreateWorkspaceModal = (): void =>
      setupStore.setShowCreateWorkspaceModal(true);
    const formatWorkspaceOptionLabel = (
      option: WorkspaceOption,
    ): React.ReactNode => (
      <div
        className="workspace-selector__option"
        title={
          setupStore.currentGroupWorkspace &&
          !setupStore.currentWorkspaceService
            ? `Selected workspace does not have the specified service${
                setupStore.currentSnapshotService
                  ? ` '${setupStore.currentSnapshotService.path}'`
                  : ''
              }\nPlease select another appropriate workspace or create and use a new workspace`
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
              setupStore.currentGroupWorkspace &&
              !setupStore.currentWorkspaceService,
          })}
        >
          {option.label}
          <ErrorIcon />
        </div>
      </div>
    );

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
                    darkMode={true}
                    isClearable={true}
                    escapeClearsValue={true}
                    filterOption={serviceFilterOption}
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
                        ? 'In order to select a workspace, a project must be selected'
                        : workspaceOptions.length
                        ? 'Choose an existing workspace'
                        : setupStore.loadWorkspacesState.hasFailed
                        ? `Can't fetch project workspaces. Please try again or select another service`
                        : 'You have no workspaces. Please create one to proceed...'
                    }
                    isClearable={true}
                    escapeClearsValue={true}
                    darkMode={true}
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
