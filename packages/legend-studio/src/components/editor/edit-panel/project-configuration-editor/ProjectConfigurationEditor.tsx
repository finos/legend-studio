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

import { useEffect, useMemo } from 'react';
import {
  LogEvent,
  debounce,
  prettyCONSTName,
  compareLabelFn,
  assertErrorThrown,
} from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import {
  FaPlus,
  FaTimes,
  FaCheckCircle,
  FaExclamationCircle,
} from 'react-icons/fa';
import {
  ProjectConfigurationEditorState,
  CONFIGURATION_EDITOR_TAB,
} from '../../../../stores/editor-state/ProjectConfigurationEditorState';
import type { SelectComponent } from '@finos/legend-art';
import { clsx, CustomSelectorInput } from '@finos/legend-art';
import { flowResult } from 'mobx';
import { ProjectDependency } from '@finos/legend-server-sdlc';
import type {
  ProjectConfiguration,
  Version,
  Project,
} from '@finos/legend-server-sdlc';
import { useEditorStore } from '../../EditorStoreProvider';
import {
  ActionAlertActionType,
  ActionAlertType,
  useApplicationStore,
} from '@finos/legend-application';
import { STUDIO_LOG_EVENT } from '../../../../stores/StudioLogEvent';

interface VersionOption {
  label: string;
  value: string;
}

const buildVersionOption = (version: Version): VersionOption => ({
  label: version.id.id,
  value: version.id.id,
});

interface ProjectOption {
  label: string;
  value: string;
}

const buildProjectOption = (project: Project): ProjectOption => ({
  label: project.name,
  value: project.projectId,
});

const ProjectDependencyVersionSelector = observer(
  (
    props: {
      projectDependency: ProjectDependency;
      selectedVersionOption: VersionOption | null;
      versionOptions: VersionOption[] | null;
      disabled: boolean;
    },
    ref: React.Ref<SelectComponent>,
  ) => {
    const editorStore = useEditorStore();
    const logger = editorStore.applicationStore.log;
    const {
      projectDependency,
      disabled,
      selectedVersionOption,
      versionOptions,
    } = props;
    const onSelectionChange = (val: ProjectOption | null): void => {
      if (
        (val !== null || selectedVersionOption !== null) &&
        (!val ||
          !selectedVersionOption ||
          val.value !== selectedVersionOption.value)
      ) {
        try {
          projectDependency.setVersionId(val?.value ?? '');
        } catch (error) {
          assertErrorThrown(error);
          logger.error(
            LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
            error,
          );
        }
      }
    };
    const projectSelectorPlaceholder = !projectDependency.projectId.length
      ? 'Choose project'
      : disabled
      ? 'No project version found. Please create a new one.'
      : 'Select version';
    return (
      <CustomSelectorInput
        className="project-dependency-editor__selector"
        ref={ref}
        options={versionOptions}
        isClearable={true}
        escapeClearsValue={true}
        onChange={onSelectionChange}
        value={selectedVersionOption}
        disabled={disabled}
        placeholder={projectSelectorPlaceholder}
        isLoading={
          editorStore.projectConfigurationEditorState
            .isFetchingAssociatedProjectsAndVersions
        }
        darkMode={true}
      />
    );
  },
  { forwardRef: true },
);

const ProjectDependencyProjectQuerySelector = observer(
  (
    props: {
      projectDependency: ProjectDependency;
      selectedProjectOption: ProjectOption | null;
      disabled: boolean;
    },
    ref: React.Ref<SelectComponent>,
  ) => {
    const { projectDependency, selectedProjectOption, disabled } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const configurationEditorState =
      editorStore.projectConfigurationEditorState;
    const debouncedQueryProject = useMemo(
      () =>
        debounce((input: string): void => {
          flowResult(configurationEditorState.queryProjects(input)).catch(
            applicationStore.alertIllegalUnhandledError,
          );
        }, 500),
      [applicationStore, configurationEditorState],
    );
    const options = Array.from(configurationEditorState.projects.values())
      .map(buildProjectOption)
      .sort(compareLabelFn);
    const onSelectionChange = (val: ProjectOption | null): void => {
      if (
        (val !== null || selectedProjectOption !== null) &&
        (!val ||
          !selectedProjectOption ||
          val.value !== selectedProjectOption.value)
      ) {
        projectDependency.setProjectId(val?.value ?? '');
        if (val && !configurationEditorState.versionsByProject.get(val.value)) {
          flowResult(
            configurationEditorState.getProjectVersions(val.value),
          ).catch(applicationStore.alertIllegalUnhandledError);
        }
      }
    };

    return (
      <CustomSelectorInput
        className="project-dependency-editor__selector"
        ref={ref}
        disabled={disabled}
        options={options}
        isClearable={true}
        escapeClearsValue={true}
        onChange={onSelectionChange}
        value={selectedProjectOption}
        onInputChange={debouncedQueryProject}
        isLoading={
          configurationEditorState.isFetchingAssociatedProjectsAndVersions ||
          configurationEditorState.isQueryingProjects
        }
        darkMode={true}
      />
    );
  },
  { forwardRef: true },
);

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
    const updateVersion = applicationStore.guaranteeSafeAction(() =>
      flowResult(
        editorStore.projectConfigurationEditorState.updateToLatestStructure(),
      ),
    );

    return (
      <div className="panel__content__lists">
        <div className="project-configuration-editor__project__structure__version">
          <div className="project-configuration-editor__project__structure__version__label">
            <div className="project-configuration-editor__project__structure__version__label__status">
              {isVersionOutdated ? (
                <FaExclamationCircle
                  className="project-configuration-editor__project__structure__version__label__status--outdated"
                  title="Project structure is outdated"
                />
              ) : (
                <FaCheckCircle
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

const ProjectDependencyEditor = observer(
  (props: {
    projectDependency: ProjectDependency;
    deleteValue: () => void;
    isReadOnly: boolean;
  }) => {
    const editorStore = useEditorStore();
    const configurationEditorState =
      editorStore.projectConfigurationEditorState;
    const { projectDependency, deleteValue, isReadOnly } = props;
    const version = projectDependency.versionId;
    const selectedProject = configurationEditorState.projects.get(
      projectDependency.projectId,
    );
    const selectedProjectOption = selectedProject
      ? buildProjectOption(selectedProject)
      : null;
    const versionMap = configurationEditorState.versionsByProject.get(
      projectDependency.projectId,
    );
    const versionOptions = versionMap
      ? Array.from(versionMap.values()).map(buildVersionOption)
      : [];
    const selectedVersion: Version | undefined = versionMap?.get(version.id);
    const selectedVersionOption = selectedVersion
      ? buildVersionOption(selectedVersion)
      : null;
    const versionDisabled =
      Boolean(
        (versionMap && !versionMap.size) || !projectDependency.projectId.length,
      ) ||
      !configurationEditorState.associatedProjectsAndVersionsFetched ||
      isReadOnly;
    const projectDisabled =
      !configurationEditorState.associatedProjectsAndVersionsFetched ||
      configurationEditorState.isReadOnly;
    return (
      <div className="project-dependency-editor">
        <ProjectDependencyProjectQuerySelector
          projectDependency={projectDependency}
          selectedProjectOption={selectedProjectOption}
          disabled={projectDisabled}
        />
        <ProjectDependencyVersionSelector
          projectDependency={projectDependency}
          selectedVersionOption={selectedVersionOption}
          versionOptions={versionOptions}
          disabled={versionDisabled}
        />
        <button
          className="project-dependency-editor__remove-btn"
          disabled={isReadOnly}
          onClick={deleteValue}
          tabIndex={-1}
          title={'Close'}
        >
          <FaTimes />
        </button>
      </div>
    );
  },
);

export const ProjectConfigurationEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const configurationEditorState = editorStore.getCurrentEditorState(
    ProjectConfigurationEditorState,
  );
  const sdlcState = editorStore.sdlcState;
  const isReadOnly = editorStore.isInViewerMode;
  const selectedTab = configurationEditorState.selectedTab;
  const tabs = [
    CONFIGURATION_EDITOR_TAB.PROJECT_STRUCTURE,
    CONFIGURATION_EDITOR_TAB.PROJECT_DEPENDENCIES,
  ];
  const changeTab =
    (tab: CONFIGURATION_EDITOR_TAB): (() => void) =>
    (): void =>
      configurationEditorState.setSelectedTab(tab);
  let addButtonTitle = '';
  switch (selectedTab) {
    case CONFIGURATION_EDITOR_TAB.PROJECT_DEPENDENCIES:
      addButtonTitle = 'Add project dependencies';
      break;
    default:
      break;
  }
  const currentProjectConfiguration =
    configurationEditorState.currentProjectConfiguration;
  const deleteProjectDependency =
    (val: ProjectDependency): (() => void) =>
    (): void =>
      currentProjectConfiguration.deleteProjectDependency(val);
  const addValue = (): void => {
    if (!isReadOnly) {
      if (selectedTab === CONFIGURATION_EDITOR_TAB.PROJECT_DEPENDENCIES) {
        currentProjectConfiguration.addProjectDependency(
          new ProjectDependency(''),
        );
      }
    }
  };
  const disableAddButton =
    selectedTab === CONFIGURATION_EDITOR_TAB.PROJECT_STRUCTURE || isReadOnly;
  const updateConfigs = (): void => {
    if (editorStore.hasUnsyncedChanges) {
      editorStore.setActionAltertInfo({
        message: 'You have unsynced changes',
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
              flowResult(configurationEditorState.updateConfigs()).catch(
                applicationStore.alertIllegalUnhandledError,
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
      flowResult(configurationEditorState.updateConfigs()).catch(
        applicationStore.alertIllegalUnhandledError,
      );
    }
  };

  useEffect(() => {
    if (
      configurationEditorState.projectConfiguration &&
      !configurationEditorState.associatedProjectsAndVersionsFetched
    ) {
      flowResult(
        configurationEditorState.fectchAssociatedProjectsAndVersions(
          configurationEditorState.projectConfiguration,
        ),
      ).catch(applicationStore.alertIllegalUnhandledError);
    }
  }, [applicationStore, configurationEditorState]);

  if (!configurationEditorState.projectConfiguration) {
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
              currentProjectConfiguration.hashCode ===
                configurationEditorState.originalConfig.hashCode
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
              <div
                key={tab}
                onClick={changeTab(tab)}
                className={clsx('project-configuration-editor__tab', {
                  'project-configuration-editor__tab--active':
                    tab === selectedTab,
                })}
              >
                {prettyCONSTName(tab)}
              </div>
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
              <FaPlus />
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
              {currentProjectConfiguration.projectDependencies.map(
                (projectDependency) => (
                  <ProjectDependencyEditor
                    key={projectDependency.uuid}
                    projectDependency={projectDependency}
                    deleteValue={deleteProjectDependency(projectDependency)}
                    isReadOnly={isReadOnly}
                  />
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
