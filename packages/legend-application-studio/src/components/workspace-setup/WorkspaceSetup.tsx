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
import {
  clsx,
  AssistantIcon,
  compareLabelFn,
  GitBranchIcon,
  CustomSelectorInput,
  LongArrowRightIcon,
  DividerWithText,
  SearchIcon,
  BaseCard,
  OpenIcon,
  Dialog,
  MarkdownTextViewer,
  Modal,
} from '@finos/legend-art';
import { LEGEND_STUDIO_TEST_ID } from '../../__lib__/LegendStudioTesting.js';
import {
  type WorkspaceSetupPathParams,
  generateEditorRoute,
  LEGEND_STUDIO_ROUTE_PATTERN_TOKEN,
} from '../../__lib__/LegendStudioNavigation.js';
import { flowResult } from 'mobx';
import { useApplicationNavigationContext } from '@finos/legend-application';
import { useParams } from '@finos/legend-application/browser';
import { LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../__lib__/LegendStudioDocumentation.js';
import { CreateProjectModal } from './CreateProjectModal.js';
import { ActivityBarMenu, ColorThemeToggle } from '../editor/ActivityBar.js';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../__lib__/LegendStudioApplicationNavigationContext.js';
import { CreateWorkspaceModal } from './CreateWorkspaceModal.js';
import { RecentWorkspacesPanel } from './RecentWorkspacesPanel.js';
import {
  useLegendStudioApplicationStore,
  useLegendStudioBaseStore,
} from '../LegendStudioFrameworkProvider.js';
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
import {
  debounce,
  guaranteeNonNullable,
  type PlainObject,
} from '@finos/legend-shared';
import { Project } from '@finos/legend-server-sdlc';
import { WorkspaceSetupStore } from '../../stores/workspace-setup/WorkspaceSetupStore.js';
import { openShowcaseManager } from '../../stores/ShowcaseManagerState.js';

const WorkspaceSetupStoreContext = createContext<
  WorkspaceSetupStore | undefined
>(undefined);

export const DEFAULT_WORKSPACE_SOURCE = 'HEAD';

export const ShowcaseCard: React.FC<{ hideDocumentation?: boolean }> = (
  props,
) => {
  const applicationStore = useLegendStudioApplicationStore();
  const appDocUrl = applicationStore.documentationService.url;
  return (
    <BaseCard
      className="workspace-setup__content__card"
      cardMedia={undefined}
      cardName="Showcase Projects"
      cardContent={
        <div className="workspace-setup__content__card__content">
          Review showcase projects with sample project code and re-use existing
          code snippets to quickly build your model.{' '}
          {!props.hideDocumentation && (
            <>
              Review Studio{' '}
              <a
                href={appDocUrl}
                target="_blank"
                rel="noreferrer"
                className="workspace-setup__content__link"
              >
                documentation
              </a>
              .
            </>
          )}
        </div>
      }
      cardActions={[
        {
          title: 'Showcase explorer',
          content: (
            <div className="workspace-setup__content__card__action__icon">
              <OpenIcon />
            </div>
          ),
          action: () => openShowcaseManager(applicationStore),
        },
      ]}
      isStable={true}
    />
  );
};

export const DocumentationCard: React.FC = () => {
  const applicationStore = useLegendStudioApplicationStore();
  const appDocUrl = applicationStore.documentationService.url;
  return (
    <BaseCard
      className="workspace-setup__content__card"
      cardName="Documentation"
      cardContent={
        <div className="workspace-setup__content__card__content">
          Review Studio{' '}
          <a
            href={appDocUrl}
            target="_blank"
            rel="noreferrer"
            className="workspace-setup__content__link"
          >
            documentation
          </a>
          .
        </div>
      }
      cardActions={[
        {
          title: 'Review documentation',
          content: (
            <div className="workspace-setup__content__card__action__icon">
              <OpenIcon />
            </div>
          ),
          action: () => {
            if (appDocUrl) {
              applicationStore.navigationService.navigator.visitAddress(
                appDocUrl,
              );
            }
          },
        },
      ]}
      isStable={true}
    />
  );
};

export const ProductionCard: React.FC = () => {
  const applicationStore = useLegendStudioApplicationStore();
  const productionDocument = applicationStore.documentationService.getDocEntry(
    LEGEND_STUDIO_DOCUMENTATION_KEY.APPLICATION_PRODUCTION,
  );
  return (
    productionDocument?.title &&
    productionDocument.markdownText &&
    productionDocument.text && (
      <BaseCard
        className="workspace-setup__content__card"
        cardName={productionDocument.title}
        cardContent={productionDocument.markdownText.value}
        cardActions={[
          {
            title: productionDocument.text,
            content: (
              <div className="workspace-setup__content__card__action__icon">
                <OpenIcon />
              </div>
            ),
            action: () => {
              if (productionDocument.url) {
                applicationStore.navigationService.navigator.visitAddress(
                  productionDocument.url,
                );
              }
            },
          },
        ]}
        isStable={true}
      />
    )
  );
};

export const SandboxCard: React.FC = () => {
  const applicationStore = useLegendStudioApplicationStore();
  const sandboxDocument = applicationStore.documentationService.getDocEntry(
    LEGEND_STUDIO_DOCUMENTATION_KEY.APPLICATION_SANDBOX,
  );
  return (
    sandboxDocument?.title &&
    sandboxDocument.markdownText &&
    sandboxDocument.text && (
      <BaseCard
        className="workspace-setup__content__card"
        cardName={sandboxDocument.title}
        cardContent={sandboxDocument.markdownText.value}
        cardActions={[
          {
            title: sandboxDocument.text,
            content: (
              <div className="workspace-setup__content__card__action__icon">
                <OpenIcon />
              </div>
            ),
            action: () => {
              if (sandboxDocument.url) {
                applicationStore.navigationService.navigator.visitAddress(
                  sandboxDocument.url,
                );
              }
            },
          },
        ]}
        isStable={true}
      />
    )
  );
};

export const RuleEngagementCard: React.FC = () => {
  const applicationStore = useLegendStudioApplicationStore();
  const ruleEngagementDocument =
    applicationStore.documentationService.getDocEntry(
      LEGEND_STUDIO_DOCUMENTATION_KEY.APPLICATION_RULE_ENGAGEMENT,
    );
  return (
    ruleEngagementDocument?.title &&
    ruleEngagementDocument.markdownText &&
    ruleEngagementDocument.text && (
      <BaseCard
        className="workspace-setup__content__card"
        cardMedia={undefined}
        cardName={ruleEngagementDocument.title}
        cardContent={ruleEngagementDocument.markdownText.value}
        cardActions={[
          {
            title: ruleEngagementDocument.text,
            content: (
              <div className="workspace-setup__content__card__action__icon">
                <OpenIcon />
              </div>
            ),
            action: () => {
              if (ruleEngagementDocument.url) {
                applicationStore.navigationService.navigator.visitAddress(
                  ruleEngagementDocument.url,
                );
              }
            },
          },
        ]}
        isStable={true}
      />
    )
  );
};

const WorkspaceSetupStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendStudioApplicationStore();
  const baseStore = useLegendStudioBaseStore();
  const store = useLocalObservable(
    () => new WorkspaceSetupStore(applicationStore, baseStore.sdlcServerClient),
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

const SandboxAccessModal = observer(() => {
  const setupStore = useWorkspaceSetupStore();
  const closeModal = (): void => setupStore.setSandboxModal(false);
  const applicationStore = setupStore.applicationStore;
  const documentation = applicationStore.documentationService.getDocEntry(
    LEGEND_STUDIO_DOCUMENTATION_KEY.SETUP_CREATE_SANDBOX_UNAUTHORIZED,
  );

  return (
    <Dialog open={true} onClose={closeModal}>
      <Modal
        darkMode={
          !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        }
        className="sandbox-project-modal"
      >
        <div className="sandbox-project-modal__header">
          <div className="sandbox-project-modal__header__label">
            Create Sandbox Project
          </div>
        </div>
        <div className="sandbox-project-modal__form panel__content__form">
          <div className="panel__content__form__section sandbox-project-modal__form__unsupported">
            You do not have access to create a Sandbox Project
          </div>
        </div>
        <div className="sandbox-project-modal__content">
          {documentation?.markdownText && (
            <div className="panel__content__form__section">
              <MarkdownTextViewer value={documentation.markdownText} />
            </div>
          )}
        </div>
      </Modal>
    </Dialog>
  );
});

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
    const goButtonRef = useRef<HTMLButtonElement>(null);
    //TODO: fix logo loading issue for localhost
    const logoPath = `${applicationStore.config.baseAddress}favicon.ico`;
    const toggleAssistant = (): void =>
      applicationStore.assistantService.toggleAssistant();

    // projects
    // Build a unified option list: recent projects (that aren't already in the
    // loaded set) are prepended so users can instantly re-open common work
    // without waiting for the SDLC search to round-trip.
    const sandboxProject =
      setupStore.sandboxProject instanceof Project
        ? setupStore.sandboxProject
        : undefined;
    const sandboxProjectId = sandboxProject?.projectId;
    const loadedProjectOptions = setupStore.projects
      .filter((p) => p.projectId !== sandboxProjectId)
      .map(buildProjectOption)
      .sort(compareLabelFn);
    const loadedProjectIds = new Set(
      setupStore.projects.map((p) => p.projectId),
    );
    const recentProjectOptions: ProjectOption[] = setupStore.recentProjects
      .filter(
        (r) =>
          !loadedProjectIds.has(r.projectId) &&
          r.projectId !== sandboxProjectId,
      )
      .map((r) => {
        // Rebuild a real Project from the cached metadata; no synthetic
        // fields needed since we persist everything the schema requires.
        const stub = Project.serialization.fromJson({
          projectId: r.projectId,
          name: r.name,
          description: r.description,
          webUrl: r.webUrl,
          tags: r.tags,
        } as PlainObject<Project>);
        return { label: stub.name, value: stub };
      });
    const projectOptions: ProjectOption[] = [
      // The user's own sandbox project is fetched via a dedicated call
      // (`loadSandboxProject`) and excluded from the main search results, so
      // we surface it here as a labeled option pinned to the top of the list.
      ...(sandboxProject
        ? [
            {
              label: `${sandboxProject.name} (sandbox)`,
              value: sandboxProject,
            },
          ]
        : []),
      ...recentProjectOptions,
      ...loadedProjectOptions,
    ];
    const recentProjectIdSet = new Set(
      setupStore.recentProjects.map((p) => p.projectId),
    );
    const selectedProjectOption = setupStore.currentProject
      ? buildProjectOption(setupStore.currentProject)
      : null;

    const onProjectChange = (val: ProjectOption | null): void => {
      if (val) {
        // If the selection corresponds to a recent that hasn't been loaded
        // from search yet, fetch the project before switching.
        const isUnloadedRecent =
          !loadedProjectIds.has(val.value.projectId) &&
          recentProjectIdSet.has(val.value.projectId);
        if (isUnloadedRecent) {
          flowResult(setupStore.selectRecentProject(val.value.projectId)).catch(
            applicationStore.alertUnhandledError,
          );
        } else {
          flowResult(setupStore.changeProject(val.value)).catch(
            applicationStore.alertUnhandledError,
          );
        }
      } else {
        setupStore.resetProject();
      }
    };
    const showCreateProjectModal = (): void =>
      setupStore.setShowCreateProjectModal(true);

    const createSandboxProject = (): void => {
      flowResult(setupStore.createSandboxProject()).catch(
        applicationStore.alertUnhandledError,
      );
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
    // Recent (non-patch) workspaces for the currently selected project are
    // floated to the top of the dropdown so users can re-enter their
    // typical work without scanning the full list.
    const projectIdForRecents = setupStore.currentProject?.projectId;
    const recentWorkspaceKeys = new Set(
      projectIdForRecents
        ? setupStore.recentWorkspaces
            .filter((w) => w.projectId === projectIdForRecents)
            .map((w) => `${w.workspaceType}::${w.workspaceId}`)
        : [],
    );
    const allWorkspaceOptions = setupStore.workspaces.map(buildWorkspaceOption);
    const recentWorkspaceOptions = allWorkspaceOptions
      .filter(
        (o) =>
          o.value.source === undefined &&
          recentWorkspaceKeys.has(
            `${o.value.workspaceType}::${o.value.workspaceId}`,
          ),
      )
      .sort(compareLabelFn);
    const otherWorkspaceOptions = allWorkspaceOptions
      .filter(
        (o) =>
          o.value.source !== undefined ||
          !recentWorkspaceKeys.has(
            `${o.value.workspaceType}::${o.value.workspaceId}`,
          ),
      )
      .sort(compareLabelFn);
    const workspaceOptions = [
      ...recentWorkspaceOptions,
      ...otherWorkspaceOptions,
    ];
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
        goButtonRef.current?.focus();
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
            setupStore.currentWorkspace.source,
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
      flowResult(setupStore.loadSandboxProject()).catch(
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
              {/* Spacer so the theme toggle sits at the bottom of the strip,
                  mirroring how the editor's activity bar is laid out. */}
              <div className="activity-bar__items" />
              <ColorThemeToggle />
            </div>
            <div
              className="workspace-setup__content"
              data-testid={LEGEND_STUDIO_TEST_ID.SETUP__CONTENT}
            >
              <div className="workspace-setup__content__body">
                <div className="workspace-setup__content__main">
                  <div className="workspace-setup__title">
                    <div className="workspace-setup__logo">
                      <img
                        src={logoPath}
                        className="workspace-setup__logo__icon"
                      />
                    </div>
                    <div className="workspace-setup__title__header">
                      Welcome to Legend Studio
                    </div>
                  </div>
                  <RecentWorkspacesPanel setupStore={setupStore} />
                  <div className="workspace-setup__selectors">
                    <div className="workspace-setup__selectors__container">
                      <div className="workspace-setup__selector">
                        <div className="workspace-setup__selector__header">
                          <span>Search for an existing project</span>
                          {(setupStore.recentProjects.length > 0 ||
                            setupStore.recentWorkspaces.length > 0) && (
                            <button
                              type="button"
                              className="workspace-setup__selector__header__clear-recents"
                              tabIndex={-1}
                              onClick={() => setupStore.clearRecents()}
                              title="Clear recently-opened projects and workspaces"
                            >
                              Clear recents
                            </button>
                          )}
                        </div>
                        <div className="workspace-setup__selector__content">
                          <div
                            className="workspace-setup__selector__content__icon"
                            title="project"
                          >
                            <SearchIcon className="workspace-setup__selector__content__icon--project" />
                          </div>
                          <CustomSelectorInput
                            className="workspace-setup__selector__content__input"
                            options={projectOptions}
                            isLoading={
                              setupStore.loadProjectsState.isInProgress ||
                              setupStore.loadSandboxState.isInProgress
                            }
                            onInputChange={onProjectSearchTextChange}
                            inputValue={projectSearchText}
                            onChange={onProjectChange}
                            value={selectedProjectOption}
                            placeholder="Search for project..."
                            isClearable={true}
                            escapeClearsValue={true}
                            darkMode={
                              !applicationStore.layoutService
                                .TEMPORARY__isLightColorThemeEnabled
                            }
                            formatOptionLabel={getProjectOptionLabelFormatter(
                              applicationStore,
                              setupStore.currentProjectConfigurationStatus,
                            )}
                            optionCustomization={{
                              rowHeight: window.innerHeight * 0.03,
                            }}
                          />
                        </div>
                      </div>
                      <div className="workspace-setup__selector">
                        <div className="workspace-setup__selector__header">
                          Choose an existing workspace
                        </div>
                        <div className="workspace-setup__selector__content">
                          <div
                            className="workspace-setup__selector__content__icon"
                            title="workspace"
                          >
                            <GitBranchIcon className="workspace-setup__selector__content__icon--workspace" />
                          </div>
                          <CustomSelectorInput
                            className="workspace-setup__selector__content__input"
                            options={workspaceOptions}
                            onKeyDown={(
                              event: React.KeyboardEvent<HTMLDivElement>,
                            ) => {
                              if (event.key === 'Enter') {
                                goButtonRef.current?.focus();
                                handleProceed();
                              }
                            }}
                            disabled={
                              !setupStore.currentProject ||
                              !setupStore.currentProjectConfigurationStatus ||
                              !setupStore.currentProjectConfigurationStatus
                                .isConfigured ||
                              setupStore.loadProjectsState.isInProgress ||
                              setupStore.loadWorkspacesState.isInProgress
                            }
                            isLoading={
                              setupStore.loadWorkspacesState.isInProgress
                            }
                            onChange={onWorkspaceChange}
                            formatOptionLabel={formatWorkspaceOptionLabel}
                            value={selectedWorkspaceOption}
                            placeholder={
                              setupStore.loadWorkspacesState.isInProgress
                                ? 'Loading workspaces...'
                                : !setupStore.currentProject
                                  ? 'In order to choose a workspace, a project must be chosen'
                                  : workspaceOptions.length
                                    ? 'Choose an existing workspace'
                                    : 'You have no workspaces. Please create one to proceed...'
                            }
                            isClearable={true}
                            escapeClearsValue={true}
                            darkMode={
                              !applicationStore.layoutService
                                .TEMPORARY__isLightColorThemeEnabled
                            }
                            optionCustomization={{
                              rowHeight: window.innerHeight * 0.03,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="workspace-setup__actions-combo">
                    <div className="workspace-setup__actions">
                      <button
                        className="workspace-setup__new-workspace-btn"
                        onClick={showCreateWorkspaceModal}
                        title="Create a Workspace after choosing one project"
                        disabled={
                          !setupStore.currentProject ||
                          !setupStore.currentProjectConfigurationStatus
                            ?.isConfigured
                        }
                      >
                        {`Need to create a new workspace?`}
                      </button>
                      <div className="workspace-setup__actions__button">
                        <button
                          className="workspace-setup__go-btn btn--dark"
                          onClick={handleProceed}
                          ref={goButtonRef}
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
                          <div className="workspace-setup__go-btn__label">
                            Go
                          </div>
                          <LongArrowRightIcon className="workspace-setup__go-btn__icon" />
                        </button>
                      </div>
                      <DividerWithText className="workspace-setup__divider">
                        OR
                      </DividerWithText>
                      {setupStore.sandboxModal && <SandboxAccessModal />}
                      <div className="workspace-setup__actions__button">
                        <button
                          className="workspace-setup__new-btn btn--dark"
                          onClick={showCreateProjectModal}
                          title="Create a Project"
                        >
                          Create New Project
                        </button>
                        {setupStore.sandboxProject === true &&
                          setupStore.initState.hasCompleted &&
                          setupStore.supportsCreatingSandboxProject && (
                            <button
                              className="workspace-setup__new-btn btn--dark"
                              onClick={createSandboxProject}
                              title="Create Sandbox Project"
                            >
                              Create Sandbox Project
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="workspace-setup__content__cards">
                  <RuleEngagementCard />
                  <ShowcaseCard />
                  {/* The SandboxCard and ProductionCard will appear only if the corresponding documentation entry is added in the config.json file for each realm.*/}
                  <SandboxCard />
                  <ProductionCard />
                </div>
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
