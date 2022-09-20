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

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { debounce, guaranteeNonNullable } from '@finos/legend-shared';
import { useSDLCServerClient } from '@finos/legend-server-sdlc';
import {
  type WorkspaceOption,
  ActivityBarMenu,
  buildWorkspaceOption,
  formatWorkspaceOptionLabel,
  LEGEND_STUDIO_TEST_ID,
  useLegendStudioApplicationStore,
} from '@finos/legend-application-studio';
import { UpdateServiceQuerySetupStore } from '../../stores/studio/UpdateServiceQuerySetupStore.js';
import { useDepotServerClient } from '@finos/legend-server-depot';
import { useParams } from 'react-router';
import {
  type ServiceQueryUpdaterSetupPathParams,
  generateServiceQueryUpdaterRoute,
} from '../../stores/studio/DSL_Service_LegendStudioRouter.js';
import { flowResult } from 'mobx';
import {
  buildServiceOption,
  formatServiceOptionLabel,
  type ServiceOption,
} from '@finos/legend-query-builder';
import {
  compareLabelFn,
  createFilter,
  CustomSelectorInput,
  GitBranchIcon,
  PlusIcon,
  PURE_ServiceIcon,
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
    const onSearchTextChange = (value: string): void => {
      if (value !== serviceSearchText) {
        setServiceSearchText(value);
        debouncedLoadServices.cancel();
        debouncedLoadServices(value);
      }
    };

    // workspaces
    const workspaceOptions = (
      setupStore.groupWorkspaces
        ? Array.from(setupStore.groupWorkspaces.values()).map(
            buildWorkspaceOption,
          )
        : []
    ).sort(compareLabelFn);
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
                    onInputChange={onSearchTextChange}
                    inputValue={serviceSearchText}
                    value={selectedServiceOption}
                    onChange={onServiceOptionChange}
                    placeholder="Search for service by name or pattern..."
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
                        ? 'Loading workspaces'
                        : !setupStore.currentSnapshotService
                        ? 'In order to select a workspace, a project must be selected'
                        : workspaceOptions.length
                        ? 'Choose an existing workspace'
                        : 'You have no workspaces. Please create one'
                    }
                    isClearable={true}
                    escapeClearsValue={true}
                    darkMode={true}
                  />
                  <button
                    className="service-query-setup__selector__action btn--dark"
                    // onClick={create}
                    tabIndex={-1}
                    title="Create a Workspace"
                  >
                    <PlusIcon />
                  </button>
                </div>
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
