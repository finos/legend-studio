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

import { useEffect, useRef } from 'react';
import {
  LogEvent,
  prettyCONSTName,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import {
  ProjectConfigurationEditorState,
  CONFIGURATION_EDITOR_TAB,
  DEPENDENCY_INFO_TYPE,
  getDependencyTreeStringFromInfo,
  getConflictsString,
} from '../../../../stores/editor-state/ProjectConfigurationEditorState.js';
import {
  type SelectComponent,
  compareLabelFn,
  clsx,
  CustomSelectorInput,
  PlusIcon,
  TimesIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExternalLinkSquareIcon,
  Dialog,
  Panel,
  PanelForm,
  PanelFormTextField,
  CheckSquareIcon,
  SquareIcon,
  ExclamationTriangleIcon,
  DropdownMenu,
  CaretDownIcon,
  MenuContentItem,
  MenuContent,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PanelLoadingIndicator,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import {
  type Platform,
  PlatformConfiguration,
  ProjectDependency,
  type ProjectConfiguration,
} from '@finos/legend-server-sdlc';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  DocumentationPreview,
  EDITOR_LANGUAGE,
  LEGEND_APPLICATION_DOCUMENTATION_KEY,
  TextInputEditor,
  useApplicationStore,
} from '@finos/legend-application';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../stores/LegendStudioAppEvent.js';
import {
  SNAPSHOT_VERSION_ALIAS,
  MASTER_SNAPSHOT_ALIAS,
  type ProjectData,
  type ProjectDependencyInfo,
} from '@finos/legend-server-depot';
import {
  generateViewProjectByGAVRoute,
  generateViewProjectRoute,
} from '../../../../stores/LegendStudioRouter.js';
import { compareSemVerVersions } from '@finos/legend-storage';

interface VersionOption {
  label: string;
  value: string;
}
interface ProjectOption {
  label: string;
  value: ProjectData;
}

const buildProjectOption = (project: ProjectData): ProjectOption => ({
  label: project.coordinates,
  value: project,
});

const ProjectStructureEditor = observer(
  (props: { projectConfig: ProjectConfiguration; isReadOnly: boolean }) => {
    const { projectConfig, isReadOnly } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const latestVersion =
      editorStore.projectConfigurationEditorState.latestProjectStructureVersion;
    const currentProjectExtensionVersion =
      projectConfig.projectStructureVersion.extensionVersion ?? -1;
    const latestProjectExtensionVersion = latestVersion?.extensionVersion ?? -1;
    const isVersionOutdated =
      latestVersion &&
      (latestVersion.version > projectConfig.projectStructureVersion.version ||
        latestProjectExtensionVersion > currentProjectExtensionVersion);
    const updateVersion = (): void => {
      flowResult(
        editorStore.projectConfigurationEditorState.updateToLatestStructure(),
      ).catch(applicationStore.alertUnhandledError);
    };

    return (
      <div className="panel__content__lists">
        <div className="project-configuration-editor__project__structure__version">
          <div className="project-configuration-editor__project__structure__version__label">
            <div className="project-configuration-editor__project__structure__version__label__status">
              {isVersionOutdated ? (
                <ExclamationCircleIcon
                  className="project-configuration-editor__project__structure__version__label__status--outdated"
                  title="Project structure is outdated"
                />
              ) : (
                <CheckCircleIcon
                  className="project-configuration-editor__project__structure__version__label__status--up-to-date"
                  title="Project structure is up to date"
                />
              )}
            </div>
            <div className="project-configuration-editor__project__structure__version__label__text">
              PROJECT STRUCTURE VERSION{' '}
              {` ${projectConfig.projectStructureVersion.fullVersion}`}
            </div>
          </div>
          {isVersionOutdated && (
            <button
              className="project-configuration-editor__project__structure__version__update-btn"
              disabled={isReadOnly}
              onClick={updateVersion}
              tabIndex={-1}
              title={`Current project structure is outdated. Click to update to the latest version (v${latestVersion.fullVersion}})`}
            >
              Update to version {latestVersion.fullVersion}
            </button>
          )}
        </div>

        <PanelForm>
          <PanelFormTextField
            isReadOnly={isReadOnly}
            value={projectConfig.groupId}
            name="Group ID"
            prompt="The domain for artifacts generated as part of the project build
              pipeline and published to an artifact repository"
            update={(value: string | undefined): void =>
              projectConfig.setGroupId(value ?? '')
            }
          />
          <PanelFormTextField
            isReadOnly={isReadOnly}
            value={projectConfig.artifactId}
            name="Artifact ID"
            prompt="The identifier (within the domain specified by group ID) for
              artifacts generated as part of the project build pipeline and
              published to an artifact repository"
            update={(value: string | undefined): void =>
              projectConfig.setArtifactId(value ?? '')
            }
          />
        </PanelForm>
      </div>
    );
  },
);

const formatOptionLabel = (option: ProjectOption): React.ReactNode => (
  <div className="project-dependency-editor__label">
    <div className="project-dependency-editor__label__tag">
      {option.value.projectId}
    </div>
    <div className="project-dependency-editor__label__name">
      {option.value.coordinates}
    </div>
  </div>
);

const ProjectDependencyInfoModal = observer(
  (props: {
    configState: ProjectConfigurationEditorState;
    info: ProjectDependencyInfo;
    type: DEPENDENCY_INFO_TYPE;
  }) => {
    const { configState, info, type } = props;
    const closeModal = (): void =>
      configState.setDependencyInfoModal(undefined);
    return (
      <Dialog
        open={Boolean(configState.dependencyInfoModalType)}
        onClose={closeModal}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal darkMode={true} className="editor-modal">
          <ModalHeader title={type} />
          <ModalBody>
            {type === DEPENDENCY_INFO_TYPE.DEPENDENCY_TREE ? (
              <TextInputEditor
                inputValue={getDependencyTreeStringFromInfo(info)}
                isReadOnly={true}
                language={EDITOR_LANGUAGE.TEXT}
                showMiniMap={true}
              />
            ) : (
              <TextInputEditor
                inputValue={getConflictsString(info)}
                isReadOnly={true}
                language={EDITOR_LANGUAGE.TEXT}
                showMiniMap={true}
              />
            )}
          </ModalBody>
          <ModalFooter>
            <button
              className="btn modal__footer__close-btn"
              onClick={closeModal}
            >
              Close
            </button>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const ProjectDependencyEditor = observer(
  (props: {
    projectDependency: ProjectDependency;
    deleteValue: () => void;
    isReadOnly: boolean;
    projects: Map<string, ProjectData>;
  }) => {
    // init
    const { projectDependency, deleteValue, isReadOnly, projects } = props;
    const projectDependencyData = projects.get(projectDependency.projectId);
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const projectSelectorRef = useRef<SelectComponent>(null);
    const versionSelectorRef = useRef<SelectComponent>(null);
    const configState = editorStore.projectConfigurationEditorState;
    // project
    const selectedProject = configState.projects.get(
      projectDependency.projectId,
    );
    const selectedProjectOption = selectedProject
      ? buildProjectOption(selectedProject)
      : null;
    const projectDisabled =
      !configState.associatedProjectsAndVersionsFetched ||
      configState.isReadOnly;
    const projectsOptions = Array.from(configState.projects.values())
      .map(buildProjectOption)
      .sort(compareLabelFn);
    const onProjectSelectionChange = (val: ProjectOption | null): void => {
      if (
        (val !== null || selectedProjectOption !== null) &&
        (!val ||
          !selectedProjectOption ||
          val.value !== selectedProjectOption.value)
      ) {
        projectDependency.setProjectId(val?.value.coordinates ?? '');
        if (val) {
          projectDependency.setVersionId(val.value.latestVersion);
          flowResult(configState.fetchDependencyInfo()).catch(
            applicationStore.alertUnhandledError,
          );
        }
      }
    };
    // version
    const version = projectDependency.versionId;
    const versions = selectedProject?.versions ?? [];
    let versionOptions = versions
      .slice()
      .sort((v1, v2) => compareSemVerVersions(v2, v1))
      .map((v) => ({ value: v, label: v }));
    versionOptions = [
      { label: SNAPSHOT_VERSION_ALIAS, value: MASTER_SNAPSHOT_ALIAS },
      ...versionOptions,
    ];
    const selectedVersionOption: VersionOption | null =
      versionOptions.find((v) => v.value === version) ?? null;
    const versionDisabled =
      Boolean(!versions.length || !projectDependency.projectId.length) ||
      !configState.associatedProjectsAndVersionsFetched ||
      isReadOnly;

    const onVersionSelectionChange = (val: VersionOption | null): void => {
      if (
        (val !== null || selectedVersionOption !== null) &&
        (!val ||
          !selectedVersionOption ||
          val.value !== selectedVersionOption.value)
      ) {
        try {
          projectDependency.setVersionId(val?.value ?? '');
          flowResult(configState.fetchDependencyInfo()).catch(
            applicationStore.alertUnhandledError,
          );
        } catch (error) {
          assertErrorThrown(error);
          applicationStore.log.error(
            LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
            error,
          );
        }
      }
    };
    const viewProject = (): void => {
      if (!projectDependency.isLegacyDependency) {
        applicationStore.navigator.visitAddress(
          applicationStore.navigator.generateAddress(
            generateViewProjectByGAVRoute(
              guaranteeNonNullable(projectDependency.groupId),
              guaranteeNonNullable(projectDependency.artifactId),
              projectDependency.versionId === MASTER_SNAPSHOT_ALIAS
                ? SNAPSHOT_VERSION_ALIAS
                : projectDependency.versionId,
            ),
          ),
        );
      }
    };
    // NOTE: This assumes that the dependant project is in the same studio instance as the current project
    // In the future, the studio instance may be part of the project data
    const viewSDLCProject = (): void => {
      if (projectDependencyData) {
        applicationStore.navigator.visitAddress(
          applicationStore.navigator.generateAddress(
            generateViewProjectRoute(projectDependencyData.projectId),
          ),
        );
      }
    };
    const projectSelectorPlaceholder = !projectDependency.projectId.length
      ? 'Choose project'
      : versionDisabled
      ? 'No project version found. Please create a new one.'
      : 'Select version';

    return (
      <div className="project-dependency-editor">
        <CustomSelectorInput
          className="project-dependency-editor__selector"
          ref={projectSelectorRef}
          disabled={projectDisabled}
          options={projectsOptions}
          isClearable={true}
          escapeClearsValue={true}
          onChange={onProjectSelectionChange}
          value={selectedProjectOption}
          isLoading={configState.fetchingProjectVersionsState.isInProgress}
          formatOptionLabel={formatOptionLabel}
          darkMode={true}
        />
        <CustomSelectorInput
          className="project-dependency-editor__selector"
          ref={versionSelectorRef}
          options={versionOptions}
          isClearable={true}
          escapeClearsValue={true}
          onChange={onVersionSelectionChange}
          value={selectedVersionOption}
          disabled={versionDisabled}
          placeholder={projectSelectorPlaceholder}
          isLoading={
            editorStore.projectConfigurationEditorState
              .fetchingProjectVersionsState.isInProgress
          }
          darkMode={true}
        />
        <div className="project-dependency-editor__visit-project-btn">
          <button
            className="project-dependency-editor__visit-project-btn__btn btn--dark"
            disabled={
              projectDependency.isLegacyDependency ||
              !selectedProject ||
              !selectedVersionOption
            }
            onClick={viewProject}
            tabIndex={-1}
            title="View project"
          >
            <ExternalLinkSquareIcon />
          </button>
          <DropdownMenu
            className="project-dependency-editor__visit-project-btn__dropdown-trigger btn--dark"
            content={
              <MenuContent>
                <MenuContentItem
                  disabled={
                    projectDependency.isLegacyDependency ||
                    !selectedProject ||
                    !selectedVersionOption ||
                    !projectDependencyData
                  }
                  onClick={viewSDLCProject}
                >
                  View SDLC project
                </MenuContentItem>
              </MenuContent>
            }
          >
            <CaretDownIcon title="Show more options..." />
          </DropdownMenu>
        </div>
        <button
          className="project-dependency-editor__remove-btn btn--dark btn--caution"
          disabled={isReadOnly}
          onClick={deleteValue}
          tabIndex={-1}
          title="Close"
        >
          <TimesIcon />
        </button>
      </div>
    );
  },
);

const PlatformDependencyViewer = observer(
  (props: {
    platform: PlatformConfiguration;
    isDefault: boolean;
    isLatestVersion?: boolean | undefined;
  }) => {
    const { platform, isDefault, isLatestVersion } = props;

    return (
      <div className="platform-configurations-editor__dependency">
        <div className="platform-configurations-editor__dependency__label">
          <div className="platform-configurations-editor__dependency__label__status">
            {isDefault && (
              <CheckCircleIcon
                className="platform-configurations-editor__dependency__label__status--default"
                title="Platform version is up to date"
              />
            )}
            {isLatestVersion !== undefined &&
              (isLatestVersion ? (
                <CheckCircleIcon
                  className="platform-configurations-editor__dependency__label__status--up-to-date"
                  title="Platform version is up to date"
                />
              ) : (
                <ExclamationTriangleIcon
                  className="platform-configurations-editor__dependency__label__status--outdated"
                  title="Platform version is outdated"
                />
              ))}
          </div>
          <div className="platform-configurations-editor__dependency__label__text">
            {platform.name}
          </div>
          <div
            className={clsx(
              'platform-configurations-editor__dependency__label__version',
            )}
          >
            {platform.version}
          </div>
        </div>
      </div>
    );
  },
);

const ProjectPlatformVersionEditor = observer(
  (props: { projectConfig: ProjectConfiguration; isReadOnly: boolean }) => {
    const { projectConfig, isReadOnly } = props;
    const editorStore = useEditorStore();

    const convertPlatformtoPlatformConfiguration = (
      platforms: Platform[] | undefined,
    ): PlatformConfiguration[] | undefined => {
      if (platforms) {
        return platforms.map(
          (platform) =>
            new PlatformConfiguration(platform.name, platform.platformVersion),
        );
      } else {
        return undefined;
      }
    };

    const platformConfigurations = projectConfig.platformConfigurations;
    const defaultPlatforms = convertPlatformtoPlatformConfiguration(
      editorStore.sdlcServerClient.platforms,
    );
    const isUpToDate = platformConfigurations?.every(
      (conf) =>
        defaultPlatforms?.find((p) => p.name === conf.name)?.version ===
        conf.version,
    );
    const updateLatestToLatestVersion = (): void => {
      if (platformConfigurations && defaultPlatforms) {
        projectConfig.setPlatformConfigurations(
          platformConfigurations.map((conf) => {
            const matchingPlatformConfig = defaultPlatforms.find(
              (p) => p.name === conf.name,
            );
            if (matchingPlatformConfig) {
              return matchingPlatformConfig;
            }
            return conf;
          }),
        );
      }
    };

    const toggleOverridePlatformConfigurations = (): void => {
      if (!projectConfig.platformConfigurations) {
        projectConfig.setPlatformConfigurations(defaultPlatforms);
      } else {
        projectConfig.setPlatformConfigurations(undefined);
      }
    };

    return (
      <Panel>
        <PanelForm>
          <DocumentationPreview
            text="By default, your project will use the latest platform
              dependencies' versions (e.g. engine, sdlc, etc.) in the pipeline.
              This might be undesirable when you want to produce stable
              artifacts; in this case, you can freeze the platform dependencies'
              versions"
            documentationKey={
              LEGEND_APPLICATION_DOCUMENTATION_KEY.QUESTION_WHEN_TO_CONFIGURE_PLATFORM_VERSIONS
            }
          />
          <div className="platform-configurations-editor__dependencies">
            <div className="platform-configurations-editor__dependencies__header">
              <div className="platform-configurations-editor__dependencies__header__left">
                <div
                  className="platform-configurations-editor__toggler"
                  onClick={toggleOverridePlatformConfigurations}
                >
                  <button
                    className={clsx(
                      'platform-configurations-editor__toggler__btn',
                      {
                        'platform-configurations-editor__toggler__btn--toggled':
                          Boolean(platformConfigurations),
                      },
                    )}
                    disabled={isReadOnly}
                    tabIndex={-1}
                  >
                    {platformConfigurations ? (
                      <CheckSquareIcon />
                    ) : (
                      <SquareIcon />
                    )}
                  </button>
                  <div className="platform-configurations-editor__toggler__prompt">
                    {`Override platform dependencies' versions`}
                  </div>
                </div>
              </div>
              {platformConfigurations && !isUpToDate && (
                <div className="platform-configurations-editor__dependencies__header__right">
                  <button
                    className="btn btn--dark"
                    tabIndex={-1}
                    onClick={updateLatestToLatestVersion}
                  >
                    Update to the current latest platform version
                  </button>
                </div>
              )}
            </div>
            <div className="platform-configurations-editor__dependencies__content">
              {!platformConfigurations &&
                defaultPlatforms?.map((p) => (
                  <PlatformDependencyViewer
                    key={p.name}
                    isDefault={true}
                    platform={p}
                  />
                ))}
              {platformConfigurations?.map((p) => (
                <PlatformDependencyViewer
                  key={p.name}
                  platform={p}
                  isDefault={false}
                  isLatestVersion={isUpToDate}
                />
              ))}
            </div>
          </div>
        </PanelForm>
      </Panel>
    );
  },
);

const ProjectDependencyActions = observer(
  (props: { config: ProjectConfigurationEditorState }) => {
    const { config } = props;
    const hasConflicts = config.dependencyInfo?.conflicts.length;
    const viewTree = (): void => {
      if (config.dependencyInfo) {
        config.setDependencyInfoModal(DEPENDENCY_INFO_TYPE.DEPENDENCY_TREE);
      }
    };
    const viewConflict = (): void => {
      if (config.dependencyInfo) {
        config.setDependencyInfoModal(DEPENDENCY_INFO_TYPE.CONFLICTS);
      }
    };
    return (
      <div className="project-dependency-editor__info">
        <button
          className="btn btn--dark"
          tabIndex={-1}
          onClick={viewTree}
          disabled={!config.dependencyInfo}
          title="View dependency tree"
        >
          View Dependency Tree
        </button>

        {Boolean(hasConflicts) && (
          <button
            className="project-dependency-editor__conflicts-btn"
            tabIndex={-1}
            onClick={viewConflict}
            disabled={!config.dependencyInfo?.conflicts.length}
            title="View any conflicts in your dependencies"
          >
            View Conflicts
          </button>
        )}
      </div>
    );
  },
);

export const ProjectConfigurationEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const configState = editorStore.getCurrentEditorState(
    ProjectConfigurationEditorState,
  );
  const sdlcState = editorStore.sdlcState;
  const isReadOnly = editorStore.isInViewerMode;
  const selectedTab = configState.selectedTab;
  const tabs = [
    CONFIGURATION_EDITOR_TAB.PROJECT_STRUCTURE,
    CONFIGURATION_EDITOR_TAB.PROJECT_DEPENDENCIES,
    CONFIGURATION_EDITOR_TAB.PLATFORM_CONFIGURATIONS,
  ];
  const changeTab =
    (tab: CONFIGURATION_EDITOR_TAB): (() => void) =>
    (): void =>
      configState.setSelectedTab(tab);
  let addButtonTitle = '';
  switch (selectedTab) {
    case CONFIGURATION_EDITOR_TAB.PROJECT_DEPENDENCIES:
      addButtonTitle = 'Add project dependencies';
      break;
    default:
      break;
  }
  const currentProjectConfiguration = configState.currentProjectConfiguration;
  const deleteProjectDependency =
    (val: ProjectDependency): (() => void) =>
    (): void => {
      currentProjectConfiguration.deleteProjectDependency(val);
      flowResult(configState.fetchDependencyInfo()).catch(
        applicationStore.alertUnhandledError,
      );
    };
  const addValue = (): void => {
    if (!isReadOnly) {
      if (selectedTab === CONFIGURATION_EDITOR_TAB.PROJECT_DEPENDENCIES) {
        const currentProjects = Array.from(configState.projects.values());
        if (currentProjects.length) {
          const projectToAdd = currentProjects[0] as ProjectData;
          const dependencyToAdd = new ProjectDependency(
            projectToAdd.coordinates,
          );
          dependencyToAdd.setVersionId(projectToAdd.latestVersion);
          currentProjectConfiguration.addProjectDependency(dependencyToAdd);
          flowResult(configState.fetchDependencyInfo()).catch(
            applicationStore.alertUnhandledError,
          );
        } else {
          currentProjectConfiguration.addProjectDependency(
            new ProjectDependency(''),
          );
        }
      }
    }
  };
  const disableAddButton =
    selectedTab !== CONFIGURATION_EDITOR_TAB.PROJECT_DEPENDENCIES || isReadOnly;
  const isLoading =
    configState.updatingConfigurationState.isInProgress ||
    configState.fetchingProjectVersionsState.isInProgress ||
    configState.fetchingDependencyInfoState.isInProgress;
  const updateConfigs = (): void => {
    editorStore.localChangesState.alertUnsavedChanges((): void => {
      flowResult(configState.updateConfigs()).catch(
        applicationStore.alertUnhandledError,
      );
    });
  };
  useEffect(() => {
    if (
      configState.projectConfiguration &&
      selectedTab === CONFIGURATION_EDITOR_TAB.PROJECT_DEPENDENCIES &&
      !configState.associatedProjectsAndVersionsFetched
    ) {
      flowResult(configState.fectchAssociatedProjectsAndVersions()).catch(
        applicationStore.alertUnhandledError,
      );
      flowResult(configState.fetchDependencyInfo()).catch(
        applicationStore.alertUnhandledError,
      );
    }
  }, [applicationStore, configState, selectedTab]);

  if (!configState.projectConfiguration) {
    return null;
  }
  return (
    <div className="project-configuration-editor">
      <Panel>
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">
              project configuration
            </div>
            <div className="panel__header__title__content">
              {sdlcState.currentProject?.name ?? '(unknown)'}
            </div>
          </div>
          <button
            // TODO: remove this ugly button when we integrate project configuration into change detection flow
            className="project-configuration-editor__update-btn"
            disabled={
              isReadOnly ||
              configState.updatingConfigurationState.isInProgress ||
              currentProjectConfiguration.hashCode ===
                configState.originalConfig.hashCode
            }
            onClick={updateConfigs}
            tabIndex={-1}
          >
            Update
          </button>
        </div>
        <div className="panel__header project-configuration-editor__tabs__header">
          <div className="project-configuration-editor__tabs">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={changeTab(tab)}
                className={clsx('project-configuration-editor__tab', {
                  'project-configuration-editor__tab--active':
                    tab === selectedTab,
                })}
              >
                {prettyCONSTName(tab)}
              </button>
            ))}
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              disabled={disableAddButton}
              tabIndex={-1}
              onClick={addValue}
              title={addButtonTitle}
            >
              <PlusIcon />
            </button>
          </div>
        </div>
        <div className="panel__content project-configuration-editor__content">
          {selectedTab === CONFIGURATION_EDITOR_TAB.PROJECT_STRUCTURE && (
            <ProjectStructureEditor
              projectConfig={currentProjectConfiguration}
              isReadOnly={isReadOnly}
            />
          )}
          {selectedTab === CONFIGURATION_EDITOR_TAB.PROJECT_DEPENDENCIES && (
            <div className="panel__content__lists">
              <PanelLoadingIndicator isLoading={isLoading} />
              <div className="project-dependency-editor__progress-msg">
                {configState.updatingConfigurationState.isInProgress
                  ? `Updating configuration...`
                  : configState.fetchingProjectVersionsState.isInProgress
                  ? `Fetching dependency versions`
                  : 'Updating project dependency tree and potential conflicts'}
              </div>
              <ProjectDependencyActions config={configState} />
              {currentProjectConfiguration.projectDependencies.map(
                (projectDependency) => (
                  <ProjectDependencyEditor
                    key={projectDependency._UUID}
                    projectDependency={projectDependency}
                    deleteValue={deleteProjectDependency(projectDependency)}
                    isReadOnly={isReadOnly}
                    projects={configState.projects}
                  />
                ),
              )}
            </div>
          )}
          {selectedTab === CONFIGURATION_EDITOR_TAB.PLATFORM_CONFIGURATIONS && (
            <ProjectPlatformVersionEditor
              projectConfig={currentProjectConfiguration}
              isReadOnly={isReadOnly}
            />
          )}
          {configState.dependencyInfo &&
            configState.dependencyInfoModalType && (
              <ProjectDependencyInfoModal
                configState={configState}
                info={configState.dependencyInfo}
                type={configState.dependencyInfoModalType}
              />
            )}
        </div>
      </Panel>
    </div>
  );
});
