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
  ArchiveIcon,
  Dialog,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import {
  ProjectDependency,
  type ProjectConfiguration,
} from '@finos/legend-server-sdlc';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  ActionAlertActionType,
  ActionAlertType,
  EDITOR_LANGUAGE,
  TextInputEditor,
  useApplicationStore,
} from '@finos/legend-application';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../stores/LegendStudioAppEvent.js';
import {
  SNAPSHOT_VERSION_ALIAS,
  MASTER_SNAPSHOT_ALIAS,
  type ProjectData,
  compareSemVerVersions,
  generateGAVCoordinates,
  type ProjectDependencyInfo,
} from '@finos/legend-server-depot';
import { generateViewProjectRoute } from '../../../../stores/LegendStudioRouter.js';

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
    const changeGroupId: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      if (!isReadOnly) {
        projectConfig.setGroupId(event.target.value);
      }
    };
    const changeArtifactId: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      if (!isReadOnly) {
        projectConfig.setArtifactId(event.target.value);
      }
    };
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
        <div className="panel__content__form">
          <div className="panel__content__form__section">
            <div className="panel__content__form__section__header__label">
              Group ID
            </div>
            <div className="panel__content__form__section__header__prompt">
              The domain for artifacts generated as part of the project build
              pipeline and published to an artifact repository
            </div>
            <input
              className="panel__content__form__section__input"
              spellCheck={false}
              disabled={isReadOnly}
              value={projectConfig.groupId}
              onChange={changeGroupId}
            />
          </div>
        </div>
        <div className="panel__content__form">
          <div className="panel__content__form__section">
            <div className="panel__content__form__section__header__label">
              Artifact ID
            </div>
            <div className="panel__content__form__section__header__prompt">
              The identifier (within the domain specified by group ID) for
              artifacts generated as part of the project build pipeline and
              published to an artifact repository
            </div>
            <input
              className="panel__content__form__section__input"
              spellCheck={false}
              disabled={isReadOnly}
              value={projectConfig.artifactId}
              onChange={changeArtifactId}
            />
          </div>
        </div>
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
        <div className="modal modal--dark editor-modal">
          <div className="modal__header">
            <div className="modal__title">{prettyCONSTName(type)}</div>
          </div>
          <div className="modal__body">
            <div className="panel__content">
              {type === DEPENDENCY_INFO_TYPE.TREE ? (
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
            </div>

            <div className="modal__footer">
              <button
                className="btn modal__footer__close-btn"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
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
    const openProjectinArchive = (): void => {
      if (!projectDependency.isLegacyDependency) {
        const projectDependencyVersionId =
          projectDependency.versionId === MASTER_SNAPSHOT_ALIAS
            ? SNAPSHOT_VERSION_ALIAS
            : projectDependency.versionId;
        applicationStore.navigator.openNewWindow(
          `${
            applicationStore.config.baseUrl
          }view/archive/${generateGAVCoordinates(
            guaranteeNonNullable(projectDependency.groupId),
            guaranteeNonNullable(projectDependency.artifactId),
            projectDependencyVersionId,
          )}`,
        );
      }
    };
    // NOTE: This assumes that the dependant project is in the same studio instance as the current project
    // In the future, the studio instance may be part of the project data
    const openProject = (): void => {
      if (projectDependencyData) {
        applicationStore.navigator.openNewWindow(
          applicationStore.navigator.generateLocation(
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
          isLoading={configState.isFetchingAssociatedProjectsAndVersions}
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
              .isFetchingAssociatedProjectsAndVersions
          }
          darkMode={true}
        />
        <button
          className="project-dependency-editor__visit-btn btn--dark btn--sm"
          disabled={
            projectDependency.isLegacyDependency ||
            !selectedProject ||
            !selectedVersionOption ||
            !projectDependencyData
          }
          onClick={openProject}
          tabIndex={-1}
          title={'Open Project'}
        >
          <ExternalLinkSquareIcon />
        </button>
        <button
          className="project-dependency-editor__visit-btn btn--dark btn--sm"
          disabled={
            projectDependency.isLegacyDependency ||
            !selectedProject ||
            !selectedVersionOption
          }
          onClick={openProjectinArchive}
          tabIndex={-1}
          title={'Open Project in archive'}
        >
          <ArchiveIcon />
        </button>
        <button
          className="project-dependency-editor__remove-btn btn--dark btn--caution"
          disabled={isReadOnly}
          onClick={deleteValue}
          tabIndex={-1}
          title={'Close'}
        >
          <TimesIcon />
        </button>
      </div>
    );
  },
);

const ProjectDependencyActions = observer(
  (props: { config: ProjectConfigurationEditorState }) => {
    const { config } = props;
    const hasConflicts = config.dependencyInfo?.conflicts.length;
    const viewTree = (): void => {
      if (config.dependencyInfo) {
        config.setDependencyInfoModal(DEPENDENCY_INFO_TYPE.TREE);
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
          className="project-dependency-editor__tree-btn"
          tabIndex={-1}
          onClick={viewTree}
          disabled={!config.dependencyInfo}
          title={`View dependency tree`}
        >
          View Dependency Tree
        </button>

        {Boolean(hasConflicts) && (
          <button
            className="project-dependency-editor__conflicts-btn"
            tabIndex={-1}
            onClick={viewConflict}
            disabled={
              !config.dependencyInfo || !config.dependencyInfo.conflicts.length
            }
            title={`View any conflcits in your dependencies`}
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
    selectedTab === CONFIGURATION_EDITOR_TAB.PROJECT_STRUCTURE || isReadOnly;
  const updateConfigs = (): void => {
    if (editorStore.hasUnpushedChanges) {
      editorStore.setActionAlertInfo({
        message: 'You have unpushed changes',
        prompt:
          'This action will discard these changes and refresh the application',
        type: ActionAlertType.CAUTION,
        onEnter: (): void => editorStore.setBlockGlobalHotkeys(true),
        onClose: (): void => editorStore.setBlockGlobalHotkeys(false),
        actions: [
          {
            label: 'Proceed to update project dependencies',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: (): void => {
              editorStore.setIgnoreNavigationBlocking(true);
              flowResult(configState.updateConfigs()).catch(
                applicationStore.alertUnhandledError,
              );
            },
          },
          {
            label: 'Abort',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    } else {
      flowResult(configState.updateConfigs()).catch(
        applicationStore.alertUnhandledError,
      );
    }
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
      <div className="panel">
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
              configState.isUpdatingConfiguration ||
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

          {configState.dependencyInfo &&
            configState.dependencyInfoModalType && (
              <ProjectDependencyInfoModal
                configState={configState}
                info={configState.dependencyInfo}
                type={configState.dependencyInfoModalType}
              />
            )}
        </div>
      </div>
    </div>
  );
});
