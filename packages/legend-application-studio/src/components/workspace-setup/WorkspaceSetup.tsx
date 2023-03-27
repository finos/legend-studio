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
import {
  clsx,
  MarkdownTextViewer,
  AssistantIcon,
  compareLabelFn,
  PlusIcon,
  GitBranchIcon,
  CustomSelectorInput,
  RepoIcon,
} from '@finos/legend-art';
import { LEGEND_STUDIO_TEST_ID } from '../../application/LegendStudioTesting.js';
import {
  type WorkspaceSetupPathParams,
  generateEditorRoute,
  LEGEND_STUDIO_ROUTE_PATTERN_TOKEN,
} from '../../application/LegendStudioNavigation.js';
import { flowResult } from 'mobx';
import {
  DocumentationLink,
  useApplicationNavigationContext,
  useParams,
} from '@finos/legend-application';
import { LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../application/LegendStudioDocumentation.js';
import { CreateProjectModal } from './CreateProjectModal.js';
import { ActivityBarMenu } from '../editor/ActivityBar.js';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../application/LegendStudioApplicationNavigationContext.js';
import { CreateWorkspaceModal } from './CreateWorkspaceModal.js';
import { useLegendStudioApplicationStore } from '../LegendStudioBaseStoreProvider.js';
import {
  type ProjectOption,
  buildProjectOption,
  getProjectOptionLabelFormatter,
} from './ProjectSelectorUtils.js';
import {
  type WorkspaceOption,
  buildWorkspaceOption,
  formatWorkspaceOptionLabel,
} from './WorkspaceSelectorUtils.js';
import { debounce, guaranteeNonNullable } from '@finos/legend-shared';
import { WorkspaceSetupStore } from '../../stores/workspace-setup/WorkspaceSetupStore.js';
import { useSDLCServerClient } from '@finos/legend-server-sdlc';

const WorkspaceSetupStoreContext = createContext<
  WorkspaceSetupStore | undefined
>(undefined);

const WorkspaceSetupStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendStudioApplicationStore();
  const sdlcServerClient = useSDLCServerClient();
  const store = useLocalObservable(
    () => new WorkspaceSetupStore(applicationStore, sdlcServerClient),
  );
  return (
    <WorkspaceSetupStoreContext.Provider value={store}>
      {children}
    </WorkspaceSetupStoreContext.Provider>
  );
};

export const useWorkspaceSetupStore = (): WorkspaceSetupStore =>
  guaranteeNonNullable(
    useContext(WorkspaceSetupStoreContext),
    `Can't find workspace setup store in context`,
  );

const withWorkspaceSetupStore = (WrappedComponent: React.FC): React.FC =>
  function WithWorkspaceSetupStore() {
    return (
      <WorkspaceSetupStoreProvider>
        <WrappedComponent />
      </WorkspaceSetupStoreProvider>
    );
  };

export const WorkspaceSetup = withWorkspaceSetupStore(
  observer(() => {
    const params = useParams<WorkspaceSetupPathParams>();
    const projectId = params[LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.PROJECT_ID];
    const workspaceId = params[LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.WORKSPACE_ID];
    const groupWorkspaceId =
      params[LEGEND_STUDIO_ROUTE_PATTERN_TOKEN.GROUP_WORKSPACE_ID];
    const setupStore = useWorkspaceSetupStore();
    const applicationStore = useLegendStudioApplicationStore();
    const [projectSearchText, setProjectSearchText] = useState('');

    const toggleAssistant = (): void =>
      applicationStore.assistantService.toggleAssistant();
    const documentation = applicationStore.documentationService.getDocEntry(
      LEGEND_STUDIO_DOCUMENTATION_KEY.SETUP_WORKSPACE,
    );

    // projects
    const projectOptions = setupStore.projects
      .map(buildProjectOption)
      .sort(compareLabelFn);
    const selectedProjectOption = setupStore.currentProject
      ? buildProjectOption(setupStore.currentProject)
      : null;

    const onProjectChange = (val: ProjectOption | null): void => {
      if (val) {
        flowResult(setupStore.changeProject(val.value)).catch(
          applicationStore.alertUnhandledError,
        );
      } else {
        setupStore.resetProject();
      }
    };
    const showCreateProjectModal = (): void =>
      setupStore.setShowCreateProjectModal(true);

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
    const workspaceOptions = setupStore.workspaces
      .map(buildWorkspaceOption)
      .sort(compareLabelFn);
    const selectedWorkspaceOption = setupStore.currentWorkspace
      ? buildWorkspaceOption(setupStore.currentWorkspace)
      : null;

    const onWorkspaceChange = (val: WorkspaceOption | null): void => {
      if (val) {
        setupStore.changeWorkspace(val.value);
        if (!setupStore.currentProjectConfigurationStatus?.isConfigured) {
          applicationStore.notificationService.notifyIllegalState(
            `Can't edit current workspace as the current project is not configured`,
          );
        }
      } else {
        setupStore.resetWorkspace();
      }
    };
    const showCreateWorkspaceModal = (): void =>
      setupStore.setShowCreateWorkspaceModal(true);

    const handleProceed = (): void => {
      if (setupStore.currentProject && setupStore.currentWorkspace) {
        applicationStore.navigationService.navigator.goToLocation(
          generateEditorRoute(
            setupStore.currentProject.projectId,
            setupStore.currentWorkspace.workspaceId,
            setupStore.currentWorkspace.workspaceType,
          ),
        );
      }
    };

    useEffect(() => {
      flowResult(
        setupStore.initialize(projectId, workspaceId, groupWorkspaceId),
      ).catch(applicationStore.alertUnhandledError);
    }, [
      setupStore,
      applicationStore,
      projectId,
      workspaceId,
      groupWorkspaceId,
    ]);

    useEffect(() => {
      flowResult(setupStore.loadProjects('')).catch(
        applicationStore.alertUnhandledError,
      );
    }, [setupStore, applicationStore]);

    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.SETUP,
    );

    return (
      <div className="app__page">
        <div className="workspace-setup">
          <div className="workspace-setup__body">
            <div className="activity-bar">
              <ActivityBarMenu />
            </div>
            <div
              className="workspace-setup__content"
              data-testid={LEGEND_STUDIO_TEST_ID.SETUP__CONTENT}
            >
              <div className="workspace-setup__content__main">
                <div className="workspace-setup__title">
                  <div className="workspace-setup__title__header">
                    Setup Workspace
                    <DocumentationLink
                      className="workspace-setup__doc__setup-workspace"
                      documentationKey={
                        LEGEND_STUDIO_DOCUMENTATION_KEY.SETUP_WORKSPACE
                      }
                    />
                  </div>
                  {documentation?.markdownText && (
                    <div className="workspace-setup__title__documentation">
                      <MarkdownTextViewer value={documentation.markdownText} />
                    </div>
                  )}
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleProceed();
                  }}
                >
                  <div className="workspace-setup__selector">
                    <div
                      className="workspace-setup__selector__icon"
                      title="project"
                    >
                      <RepoIcon className="workspace-setup__selector__icon--project" />
                    </div>
                    <CustomSelectorInput
                      className="workspace-setup__selector__input"
                      options={projectOptions}
                      isLoading={setupStore.loadProjectsState.isInProgress}
                      onInputChange={onProjectSearchTextChange}
                      inputValue={projectSearchText}
                      onChange={onProjectChange}
                      value={selectedProjectOption}
                      placeholder="Search for project..."
                      isClearable={true}
                      escapeClearsValue={true}
                      darkMode={true}
                      formatOptionLabel={getProjectOptionLabelFormatter(
                        applicationStore,
                        setupStore.currentProjectConfigurationStatus,
                      )}
                    />
                    <button
                      className="workspace-setup__selector__action btn--dark"
                      onClick={showCreateProjectModal}
                      tabIndex={-1}
                      type="button" // prevent this toggler being activated on form submission
                      title="Create a Project"
                    >
                      <PlusIcon />
                    </button>
                  </div>
                  <div className="workspace-setup__selector">
                    <div
                      className="workspace-setup__selector__icon"
                      title="workspace"
                    >
                      <GitBranchIcon className="workspace-setup__selector__icon--workspace" />
                    </div>
                    <CustomSelectorInput
                      className="workspace-setup__selector__input"
                      options={workspaceOptions}
                      disabled={
                        !setupStore.currentProject ||
                        !setupStore.currentProjectConfigurationStatus ||
                        !setupStore.currentProjectConfigurationStatus
                          .isConfigured ||
                        setupStore.loadProjectsState.isInProgress ||
                        setupStore.loadWorkspacesState.isInProgress
                      }
                      isLoading={setupStore.loadWorkspacesState.isInProgress}
                      onChange={onWorkspaceChange}
                      formatOptionLabel={formatWorkspaceOptionLabel}
                      value={selectedWorkspaceOption}
                      placeholder={
                        setupStore.loadWorkspacesState.isInProgress
                          ? 'Loading workspaces...'
                          : !setupStore.currentProject
                          ? 'In order to select a workspace, a project must be selected'
                          : workspaceOptions.length
                          ? 'Choose an existing workspace'
                          : 'You have no workspaces. Please create one to proceed...'
                      }
                      isClearable={true}
                      escapeClearsValue={true}
                      darkMode={true}
                    />
                    <button
                      className="workspace-setup__selector__action btn--dark"
                      onClick={showCreateWorkspaceModal}
                      disabled={
                        !setupStore.currentProject ||
                        !setupStore.currentProjectConfigurationStatus ||
                        !setupStore.currentProjectConfigurationStatus
                          .isConfigured
                      }
                      tabIndex={-1}
                      type="button" // prevent this toggler being activated on form submission
                      title="Create a Workspace"
                    >
                      <PlusIcon />
                    </button>
                  </div>
                  <div className="workspace-setup__actions">
                    <button
                      className="workspace-setup__next-btn btn--dark"
                      onClick={handleProceed}
                      disabled={
                        !setupStore.currentProject ||
                        !setupStore.currentProjectConfigurationStatus ||
                        !setupStore.currentProjectConfigurationStatus
                          .isConfigured ||
                        !setupStore.currentWorkspace ||
                        setupStore.createWorkspaceState.isInProgress ||
                        setupStore.createOrImportProjectState.isInProgress
                      }
                    >
                      Edit Workspace
                    </button>
                  </div>
                </form>
                {/* NOTE: We do this to reset the initial state of the modals */}
                {setupStore.showCreateProjectModal && <CreateProjectModal />}
                {setupStore.showCreateWorkspaceModal &&
                  setupStore.currentProject && (
                    <CreateWorkspaceModal
                      selectedProject={setupStore.currentProject}
                    />
                  )}
              </div>
            </div>
          </div>

          <div
            data-testid={LEGEND_STUDIO_TEST_ID.STATUS_BAR}
            className="editor__status-bar"
          >
            <div className="editor__status-bar__left"></div>
            <div className="editor__status-bar__right">
              <button
                className={clsx(
                  'editor__status-bar__action editor__status-bar__action__toggler',
                  {
                    'editor__status-bar__action__toggler--active':
                      !applicationStore.assistantService.isHidden,
                  },
                )}
                onClick={toggleAssistant}
                tabIndex={-1}
                title="Toggle assistant"
              >
                <AssistantIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }),
);
