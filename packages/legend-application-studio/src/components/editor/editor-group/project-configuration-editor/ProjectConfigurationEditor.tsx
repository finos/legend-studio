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

import { useEffect, useState } from 'react';
import { isNonNullable, prettyCONSTName } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import {
  ProjectConfigurationEditorState,
  CONFIGURATION_EDITOR_TAB,
  projectTypeTabFilter,
} from '../../../../stores/editor/editor-state/project-configuration-editor-state/ProjectConfigurationEditorState.js';
import {
  clsx,
  PlusIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  Panel,
  PanelForm,
  CheckSquareIcon,
  SquareIcon,
  PencilEditIcon,
  PanelHeaderActionItem,
  PanelHeaderActions,
  PanelContent,
  PanelHeader,
  PanelLoadingIndicator,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import {
  type Platform,
  type ProjectConfiguration,
  type ProjectStructureVersion,
  PlatformConfiguration,
  ProjectDependency,
  ProjectType,
} from '@finos/legend-server-sdlc';
import { useEditorStore } from '../../EditorStoreProvider.js';
import { EditorForm, EditorFormSection } from '../EditorForm.js';
import {
  ActionAlertActionType,
  ActionAlertType,
  shouldDisplayVirtualAssistantDocumentationEntry,
  useApplicationStore,
} from '@finos/legend-application';
import { ProjectDependencyEditor } from './ProjectDependencyEditor.js';
import { LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../../../__lib__/LegendStudioDocumentation.js';
import { DocumentationLink } from '@finos/legend-lego/application';
import type { StoreProjectData } from '@finos/legend-server-depot';
import { generateGAVCoordinates } from '@finos/legend-storage';

const isProjectConfigurationVersionOutdated = (
  projectConfig: ProjectConfiguration,
  latestVersion: ProjectStructureVersion | undefined,
  isEmbeddedMode: boolean,
): boolean => {
  if (!latestVersion) {
    return false;
  }
  const mainVersionOutdated =
    latestVersion.version > projectConfig.projectStructureVersion.version;
  if (isEmbeddedMode) {
    return mainVersionOutdated;
  }
  const currentProjectExtensionVersion =
    projectConfig.projectStructureVersion.extensionVersion ?? -1;
  const latestProjectExtensionVersion = latestVersion.extensionVersion ?? -1;
  return (
    mainVersionOutdated ||
    latestProjectExtensionVersion > currentProjectExtensionVersion
  );
};

const ProjectStructureEditor = observer(
  (props: { projectConfig: ProjectConfiguration; isReadOnly: boolean }) => {
    const { projectConfig, isReadOnly } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const latestVersion =
      editorStore.projectConfigurationEditorState.latestProjectStructureVersion;
    const isProjectStructureVersionOutdated =
      isProjectConfigurationVersionOutdated(
        projectConfig,
        latestVersion,
        editorStore.projectConfigurationEditorState.isInEmbeddedMode,
      );
    const isGroupIdChanged =
      editorStore.projectConfigurationEditorState.isGroupIdChanged;
    const isArtifactIdChanged =
      editorStore.projectConfigurationEditorState.isArtifactIdChanged;

    const updateVersion = (): void => {
      flowResult(
        editorStore.projectConfigurationEditorState.updateToLatestStructure(),
      ).catch(applicationStore.alertUnhandledError);
    };

    const changeGroupId: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      const stringValue = event.target.value;
      projectConfig.setGroupId(stringValue);
    };

    const changeArtifactId: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      const stringValue = event.target.value;
      projectConfig.setArtifactId(stringValue);
    };

    const coordinates = generateGAVCoordinates(
      projectConfig.groupId,
      projectConfig.artifactId,
      undefined,
    );
    const latestLabel = latestVersion
      ? editorStore.projectConfigurationEditorState.isInEmbeddedMode
        ? `${latestVersion.version}`
        : latestVersion.fullVersion
      : undefined;

    return (
      <EditorForm>
        <EditorFormSection
          title="Coordinates"
          description="How this project is identified when its versions are published. Other projects depend on it by these coordinates."
        >
          <div className="project-structure-editor__coordinates">
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Group ID
              </div>
              <div className="panel__content__form__section__header__prompt">
                The domain the project publishes under, e.g. org.finos.legend
              </div>
              <input
                className={clsx(
                  'input input--dark input-group__input panel__content__form__section__input input--full',
                  { 'input--caution': isGroupIdChanged },
                )}
                title="Group ID"
                spellCheck={false}
                disabled={isReadOnly}
                value={projectConfig.groupId}
                onChange={changeGroupId}
              />
            </div>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Artifact ID
              </div>
              <div className="panel__content__form__section__header__prompt">
                The project&apos;s name within that domain
              </div>
              <input
                className={clsx(
                  'input input--dark input-group__input panel__content__form__section__input input--full',
                  { 'input--caution': isArtifactIdChanged },
                )}
                title="Artifact ID"
                spellCheck={false}
                disabled={isReadOnly}
                value={projectConfig.artifactId}
                onChange={changeArtifactId}
              />
            </div>
          </div>
          <div className="project-structure-editor__published-as">
            <span>Published as</span>
            <code>{coordinates}</code>
          </div>
          {(isGroupIdChanged || isArtifactIdChanged) && (
            <div className="project-structure-editor__warning">
              Changing the coordinates starts a new artifact: earlier versions
              stay under the old coordinates, and projects that depend on this
              one must be updated.
              <DocumentationLink
                documentationKey={
                  LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_UPDATE_PROJECT_GAV_COORDINATES
                }
              />
            </div>
          )}
        </EditorFormSection>
        <EditorFormSection
          title="Project structure"
          description="The layout of the project's build. Newer versions bring build fixes and support for newer features."
        >
          <div className="project-structure-editor__version">
            <div className="project-structure-editor__version__current">
              <span className="project-structure-editor__version__label">
                Version
              </span>
              <span className="project-structure-editor__version__value">
                {projectConfig.projectStructureVersion.fullVersion}
              </span>
              {isProjectStructureVersionOutdated ? (
                <span className="project-structure-editor__status project-structure-editor__status--outdated">
                  <ExclamationCircleIcon />
                  {latestLabel ? `${latestLabel} available` : 'Outdated'}
                </span>
              ) : (
                <span className="project-structure-editor__status project-structure-editor__status--current">
                  <CheckCircleIcon />
                  Up to date
                </span>
              )}
            </div>
            {isProjectStructureVersionOutdated && latestLabel && (
              <button
                className="project-structure-editor__update-btn"
                disabled={isReadOnly}
                onClick={updateVersion}
                tabIndex={-1}
                title={`Update the project structure to version ${latestLabel}`}
              >
                Update to {latestLabel}
              </button>
            )}
          </div>
        </EditorFormSection>
      </EditorForm>
    );
  },
);

/**
 * The newest release of each platform, as listed by the SDLC server.
 */
const getLatestPlatformVersions = (
  platforms: Platform[] | undefined,
): PlatformConfiguration[] =>
  (platforms ?? []).map(
    (platform) =>
      new PlatformConfiguration(platform.name, platform.platformVersion),
  );

const PlatformVersionMode = (props: {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onSelect: () => void;
}): React.ReactNode => {
  const { title, description, checked, disabled, onSelect } = props;
  return (
    <label
      className={clsx('platform-versions__mode', {
        'platform-versions__mode--checked': checked,
        'platform-versions__mode--disabled': disabled,
      })}
    >
      <input
        type="radio"
        name="platform-versions-mode"
        className="platform-versions__mode__radio"
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
      />
      <span className="platform-versions__mode__text">
        <span className="platform-versions__mode__title">{title}</span>
        <span className="platform-versions__mode__description">
          {description}
        </span>
      </span>
    </label>
  );
};

const PlatformVersionsHeader = (): React.ReactNode => (
  <div className="platform-versions__row platform-versions__row--header">
    <div>Platform</div>
    <div>Version</div>
    <div>Status</div>
  </div>
);

const PlatformVersionsTable = observer(
  (props: {
    projectConfig: ProjectConfiguration;
    latestVersions: PlatformConfiguration[];
    isReadOnly: boolean;
  }) => {
    const { projectConfig, latestVersions, isReadOnly } = props;
    const frozenVersions = projectConfig.platformConfigurations;
    const updateToLatest = (
      name: string | undefined,
      version: string,
    ): void => {
      if (frozenVersions) {
        projectConfig.setPlatformConfigurations(
          frozenVersions.map((platform) =>
            platform.name === name
              ? new PlatformConfiguration(name, version)
              : platform,
          ),
        );
      }
    };
    const platforms = frozenVersions ?? latestVersions;

    if (!platforms.length) {
      return (
        <div className="platform-versions__empty">
          The SDLC server lists no platforms.
        </div>
      );
    }
    return (
      <div className="platform-versions">
        <PlatformVersionsHeader />
        {platforms.map((platform) => {
          const latestVersion = latestVersions.find(
            (latest) => latest.name === platform.name,
          )?.version;
          return (
            <div key={platform._UUID} className="platform-versions__row">
              <div className="platform-versions__name">{platform.name}</div>
              <div className="platform-versions__version">
                {platform.version}
              </div>
              <div className="platform-versions__status">
                {!frozenVersions ? (
                  <span className="platform-versions__badge">Latest</span>
                ) : latestVersion === undefined ? null : latestVersion ===
                  platform.version ? (
                  <span className="platform-versions__badge platform-versions__badge--current">
                    <CheckCircleIcon />
                    Up to date
                  </span>
                ) : (
                  <button
                    className="platform-versions__update-btn"
                    disabled={isReadOnly}
                    onClick={(): void =>
                      updateToLatest(platform.name, latestVersion)
                    }
                    title={`Freeze ${platform.name} at ${latestVersion}`}
                  >
                    {latestVersion} available
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  },
);

const ManualPlatformVersionsEditor = observer(
  (props: {
    projectConfig: ProjectConfiguration;
    latestVersions: PlatformConfiguration[];
    isReadOnly: boolean;
  }) => {
    const { projectConfig, latestVersions, isReadOnly } = props;
    const editorStore = useEditorStore();
    // edit copies, so the configuration only changes when the versions are applied
    const [draft] = useState(() =>
      (projectConfig.platformConfigurations ?? latestVersions).map(
        (platform) =>
          new PlatformConfiguration(platform.name, platform.version),
      ),
    );
    const close = (): void =>
      editorStore.projectConfigurationEditorState.setManualOverwrite(false);
    const apply = (): void => {
      projectConfig.setPlatformConfigurations(draft);
      close();
    };

    return (
      <>
        <div className="platform-versions">
          <PlatformVersionsHeader />
          {draft.map((platform) => (
            <div key={platform._UUID} className="platform-versions__row">
              <div className="platform-versions__name">{platform.name}</div>
              <input
                className="input input--dark platform-versions__input"
                title={`${platform.name} version`}
                value={platform.version ?? ''}
                spellCheck={false}
                disabled={isReadOnly}
                onChange={(event): void =>
                  platform.setVersion(event.target.value)
                }
              />
              <div className="platform-versions__status" />
            </div>
          ))}
        </div>
        <div className="platform-versions__footer platform-versions__footer--manual">
          <span className="platform-versions__footer__hint">
            Versions entered by hand stay frozen until you change them. Use this
            only to unblock your project for a while.
          </span>
          <button className="platform-versions__secondary-btn" onClick={close}>
            Cancel
          </button>
          <button
            className="platform-versions__primary-btn"
            disabled={isReadOnly}
            onClick={apply}
          >
            Freeze at these versions
          </button>
        </div>
      </>
    );
  },
);

const ProjectPlatformVersionEditor = observer(
  (props: { projectConfig: ProjectConfiguration; isReadOnly: boolean }) => {
    const { projectConfig, isReadOnly } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const configState = editorStore.projectConfigurationEditorState;
    const isManual = configState.manualOverwrite;
    const latestVersions = getLatestPlatformVersions(
      editorStore.sdlcServerClient.platforms,
    );
    const frozenVersions = projectConfig.platformConfigurations;
    const hasOutdatedVersions = Boolean(
      frozenVersions?.some((platform) => {
        const latestVersion = latestVersions.find(
          (latest) => latest.name === platform.name,
        )?.version;
        return (
          latestVersion !== undefined && latestVersion !== platform.version
        );
      }),
    );

    const useLatestVersions = (): void =>
      projectConfig.setPlatformConfigurations(undefined);
    const freezeVersions = (): void =>
      projectConfig.setPlatformConfigurations(latestVersions);
    const updateAllToLatest = (): void => {
      if (frozenVersions) {
        projectConfig.setPlatformConfigurations(
          frozenVersions.map(
            (platform) =>
              latestVersions.find((latest) => latest.name === platform.name) ??
              platform,
          ),
        );
      }
    };
    const enterVersionsManually = (): void => {
      applicationStore.alertService.setActionAlertInfo({
        message:
          'Entering platform versions by hand freezes them at whatever you type. This is not recommended, except to unblock your project for a while.',
        prompt: 'Do you want to proceed?',
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Continue',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: (): void => configState.setManualOverwrite(true),
          },
          {
            label: 'Cancel',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    };

    return (
      <EditorForm>
        <EditorFormSection
          title="Platform versions"
          description="The versions of the Legend platform (engine, SDLC, and so on) your project's pipeline builds with."
          actions={
            <DocumentationLink
              documentationKey={
                LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_WHEN_TO_CONFIGURE_PLATFORM_VERSIONS
              }
            />
          }
        >
          <div className="platform-versions__modes">
            <PlatformVersionMode
              title="Use the latest versions"
              description="Recommended. Every build uses the newest platform release."
              checked={!frozenVersions}
              disabled={isReadOnly || isManual}
              onSelect={useLatestVersions}
            />
            <PlatformVersionMode
              title="Freeze versions"
              description="Builds keep the versions below until you change them, so your artifacts stay stable."
              checked={Boolean(frozenVersions)}
              disabled={isReadOnly || isManual || !latestVersions.length}
              onSelect={freezeVersions}
            />
          </div>
          {isManual ? (
            <ManualPlatformVersionsEditor
              projectConfig={projectConfig}
              latestVersions={latestVersions}
              isReadOnly={isReadOnly}
            />
          ) : (
            <>
              <PlatformVersionsTable
                projectConfig={projectConfig}
                latestVersions={latestVersions}
                isReadOnly={isReadOnly}
              />
              <div className="platform-versions__footer">
                {hasOutdatedVersions && (
                  <button
                    className="platform-versions__primary-btn"
                    disabled={isReadOnly}
                    onClick={updateAllToLatest}
                  >
                    Update all to latest
                  </button>
                )}
                <button
                  className="platform-versions__manual-btn"
                  disabled={isReadOnly}
                  onClick={enterVersionsManually}
                >
                  <PencilEditIcon />
                  Enter versions manually
                </button>
              </div>
            </>
          )}
        </EditorFormSection>
      </EditorForm>
    );
  },
);

const ProjectAdvancedEditor = observer(
  (props: {
    projectConfig: ProjectConfiguration;
    isReadOnly: boolean;
    configState: ProjectConfigurationEditorState;
  }) => {
    const { projectConfig, isReadOnly, configState } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const currentProjectType = projectConfig.projectType ?? ProjectType.MANAGED;
    const isEmbeddedMode = currentProjectType === ProjectType.EMBEDDED;
    const managedModeBlurb =
      'Managed Projects are managed by our SDLC server, which includes managing the build and deployment of your project.This enables rich features such as releasing and dependency management work within our ecosystem.This is the recommended mode and should not be changed unless your customized build is robust to handle these operations and you are aware of the different features our managed mode provides.';
    const embeddedModeBlurb =
      'Embedded Projects have their own customized build. The build is managed directly on the underlying version system (gitlab, github etc) and the owners of the projects are responsible for managing their build and incorporating the necessary steps to enable features such as releasing and dependency management. Our SDLC server still manages the file structure of where the elements entities are located and correlate with the project structure version.';
    const managedToEmbedded =
      'You are about to change from managed to embedded project type. This will cause your build files (pom, ci etc) to no longer be managed by our SDLC process. Your element folder structure will remain managed by us but your build will become your responsibility. Please ensure you understand the risks of changing over before continuing.';
    const embeddedToManaged =
      'You are about to change from embedded to managed project type. Your build will now be managed by our SDLC sever in addition to your element folder structure. Your current build files will all be deleted and replaces with our own. Please ensure you understand the risks of changing over before continuing.';
    const runDependencyMessage = `In addition to running your own tests, you can also configure to run all tests in your dependency projects.  This should be rarely used and mostly helped mitigate when you have override your dependencies. You should aim to have most of your tests in your current project.`;
    const toggleRunDependency = (): void => {
      const newVal = !projectConfig.runDependencyTests;
      if (
        !newVal &&
        configState.originalConfig.runDependencyTests === undefined
      ) {
        projectConfig.setRunDependencyTests(undefined);
      } else {
        projectConfig.setRunDependencyTests(newVal);
      }
    };
    const changeProjectType = (): void => {
      applicationStore.alertService.setActionAlertInfo({
        message: `${isEmbeddedMode ? embeddedToManaged : managedToEmbedded}`,
        prompt: 'Do you want to proceed?',
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Continue',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: () => {
              flowResult(
                editorStore.projectConfigurationEditorState.changeProjectType(),
              ).catch(applicationStore.alertUnhandledError);
            },
          },
          {
            label: 'Cancel',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    };

    return (
      <Panel>
        <PanelForm>
          <div className="panel__content__form__section__header__label">
            {`Dependency Tests`}
          </div>
          <div className="documentation-preview">
            <div className="documentation-preview__text">
              <div className="project-configuration-editor__advanced__project-type__info">
                {runDependencyMessage}
              </div>
            </div>
          </div>
          <div className="platform-configurations-editor__dependencies">
            <div className="platform-configurations-editor__dependencies__header">
              <div className="platform-configurations-editor__dependencies__header__left">
                <div
                  className="platform-configurations-editor__toggler"
                  onClick={toggleRunDependency}
                >
                  <button
                    className={clsx(
                      'platform-configurations-editor__toggler__btn',
                      {
                        'platform-configurations-editor__toggler__btn--toggled':
                          Boolean(projectConfig.runDependencyTests),
                      },
                    )}
                    disabled={isReadOnly}
                    tabIndex={-1}
                  >
                    {projectConfig.runDependencyTests ? (
                      <CheckSquareIcon />
                    ) : (
                      <SquareIcon />
                    )}
                  </button>
                  <div className="platform-configurations-editor__toggler__prompt">
                    {`Run Dependency Tests`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PanelForm>
        <PanelForm>
          <div className="panel__content__form__section__header__label">
            {`Project Type: ${prettyCONSTName(currentProjectType)} `}
          </div>
          <div className="documentation-preview">
            <div className="documentation-preview__text">
              <div className="project-configuration-editor__advanced__project-type__info">
                {managedModeBlurb}
              </div>
              <div className="project-configuration-editor__advanced__project-type__info">
                {embeddedModeBlurb}
              </div>
            </div>

            <div className="documentation-preview__hint">
              <DocumentationLink
                documentationKey={
                  LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_WHAT_IS_EMBEDDED_MODE_PROJECT_TYPE
                }
              />
            </div>
          </div>
          <div className="platform-configurations-editor__dependencies">
            <div className="platform-configurations-editor__dependencies__header">
              <button
                className="btn--dark btn--conflict btn--important project-configuration-editor__advanced__caution__btn"
                onClick={changeProjectType}
                tabIndex={-1}
              >
                {`Change to ${
                  isEmbeddedMode ? 'Managed Type' : 'Embedded Type'
                }`}
              </button>
            </div>
          </div>
        </PanelForm>
      </Panel>
    );
  },
);

export const ProjectConfigurationEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const configState = editorStore.tabManagerState.getCurrentEditorState(
    ProjectConfigurationEditorState,
  );
  const projectType =
    configState.currentProjectConfiguration.projectType ?? ProjectType.MANAGED;
  const sdlcState = editorStore.sdlcState;
  const isReadOnly = editorStore.isInViewerMode;
  const selectedTab = configState.selectedTab;
  const dependencyEditorState = configState.projectDependencyEditorState;
  const tabs = [
    CONFIGURATION_EDITOR_TAB.PROJECT_STRUCTURE,
    CONFIGURATION_EDITOR_TAB.PROJECT_DEPENDENCIES,
    CONFIGURATION_EDITOR_TAB.PLATFORM_CONFIGURATIONS,
    CONFIGURATION_EDITOR_TAB.ADVANCED,
  ].filter((tab) => projectTypeTabFilter(projectType, tab));
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
  const addValue = applicationStore.guardUnhandledError(
    async (): Promise<void> => {
      if (!isReadOnly) {
        if (selectedTab === CONFIGURATION_EDITOR_TAB.PROJECT_DEPENDENCIES) {
          const currentProjectCoordinates = generateGAVCoordinates(
            currentProjectConfiguration.groupId,
            currentProjectConfiguration.artifactId,
            undefined,
          );
          const currentProjects = Array.from(
            configState.projects.values(),
          ).filter(
            (project) => project.coordinates !== currentProjectCoordinates,
          );
          if (currentProjects.length) {
            const projectToAdd = currentProjects[0] as StoreProjectData;
            const dependencyToAdd = new ProjectDependency(
              projectToAdd.coordinates,
            );
            const versions = await editorStore.depotServerClient.getVersions(
              projectToAdd.groupId,
              projectToAdd.artifactId,
              true,
            );
            configState.versions.set(dependencyToAdd.projectId, versions);
            dependencyToAdd.setVersionId(versions[0] ?? '');
            currentProjectConfiguration.addProjectDependency(dependencyToAdd);
            flowResult(
              configState.projectDependencyEditorState.fetchDependencyReport(),
            ).catch(applicationStore.alertUnhandledError);
          } else {
            currentProjectConfiguration.addProjectDependency(
              new ProjectDependency(''),
            );
          }
        }
      }
    },
  );
  const disableAddButton =
    selectedTab !== CONFIGURATION_EDITOR_TAB.PROJECT_DEPENDENCIES || isReadOnly;

  const updateGavConfigs = (): void => {
    const documentationEntry =
      applicationStore.documentationService.getDocEntry(
        LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_UPDATE_PROJECT_GAV_COORDINATES,
      );

    editorStore.applicationStore.alertService.setActionAlertInfo({
      message:
        'Please be cautious that modifying group ID or artifact ID (GAV coordinates) can potentially have a big downstream impact. Be aware that the project will lose all previous versions; also, any dependant projects can break too if the coordinates are not changed in a controlled way.',
      type: ActionAlertType.STANDARD,
      prompt: documentationEntry
        ? 'Please see the instructions for more guidance'
        : undefined,
      actions: [
        {
          label: (
            <>
              Acknowledge and Proceed
              <DocumentationLink
                documentationKey={
                  LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_UPDATE_PROJECT_GAV_COORDINATES
                }
              />
            </>
          ),
          type: ActionAlertActionType.PROCEED_WITH_CAUTION,
          handler: (): void => {
            editorStore.localChangesState.alertUnsavedChanges((): void => {
              flowResult(configState.updateConfigs()).catch(
                applicationStore.alertUnhandledError,
              );
            });
          },
        },
        documentationEntry && {
          label: 'View Instructions',
          default: true,
          type: ActionAlertActionType.PROCEED,
          handler: (): void => {
            if (
              shouldDisplayVirtualAssistantDocumentationEntry(
                documentationEntry,
              )
            ) {
              applicationStore.assistantService.openDocumentationEntry(
                documentationEntry.key,
              );
            } else if (documentationEntry.url) {
              applicationStore.navigationService.navigator.visitAddress(
                documentationEntry.url,
              );
            }
          },
        },
        {
          label: 'Cancel',
          type: ActionAlertActionType.PROCEED,
        },
      ].filter(isNonNullable),
    });
  };

  const updateConfigs = (): void => {
    if (configState.isArtifactIdChanged || configState.isGroupIdChanged) {
      updateGavConfigs();
    } else {
      editorStore.localChangesState.alertUnsavedChanges((): void => {
        flowResult(configState.updateConfigs()).catch(
          applicationStore.alertUnhandledError,
        );
      });
    }
  };
  useEffect(() => {
    if (
      configState.projectConfiguration &&
      selectedTab === CONFIGURATION_EDITOR_TAB.PROJECT_DEPENDENCIES &&
      !configState.associatedProjectsAndVersionsFetched
    ) {
      Promise.all([
        flowResult(configState.fectchAssociatedProjectsAndVersions()),
        flowResult(
          configState.projectDependencyEditorState.fetchDependencyReport(),
        ),
      ]).catch(applicationStore.alertUnhandledError);
    }
  }, [applicationStore, configState, selectedTab]);

  if (!configState.projectConfiguration) {
    return null;
  }
  const hasConfigChanges =
    currentProjectConfiguration.hashCode !==
    configState.originalConfig.hashCode;
  const isLoading =
    configState.updatingConfigurationState.isInProgress ||
    configState.fetchingProjectVersionsState.isInProgress ||
    dependencyEditorState.fetchingDependencyInfoState.isInProgress;
  return (
    <div className="project-configuration-editor">
      <Panel>
        <PanelHeader>
          <div className="panel__header__title">
            <div className="panel__header__title__label">
              project configuration
            </div>
            <div className="panel__header__title__content">
              {sdlcState.currentProject?.name ?? '(unknown)'}
            </div>
          </div>
          <div className="project-configuration-editor__save">
            {hasConfigChanges && (
              <span className="project-configuration-editor__save__hint">
                Unsaved configuration changes
              </span>
            )}
            <button
              // TODO: remove this button when we integrate project configuration into change detection flow
              className={clsx('project-configuration-editor__save__btn', {
                'project-configuration-editor__save__btn--active':
                  hasConfigChanges,
              })}
              disabled={
                isReadOnly ||
                configState.updatingConfigurationState.isInProgress ||
                !hasConfigChanges
              }
              onClick={updateConfigs}
              tabIndex={-1}
              title={
                hasConfigChanges
                  ? 'Save the configuration changes to the workspace'
                  : 'No configuration changes to save'
              }
            >
              Update configuration
            </button>
          </div>
        </PanelHeader>
        <PanelHeader className="project-configuration-editor__tabs__header">
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
          <PanelHeaderActions>
            <PanelHeaderActionItem
              disabled={disableAddButton}
              onClick={addValue}
              title={addButtonTitle}
            >
              <PlusIcon />
            </PanelHeaderActionItem>
          </PanelHeaderActions>
        </PanelHeader>
        <PanelContent className="project-configuration-editor__content">
          <PanelLoadingIndicator isLoading={isLoading} />
          {selectedTab === CONFIGURATION_EDITOR_TAB.PROJECT_STRUCTURE && (
            <ProjectStructureEditor
              projectConfig={currentProjectConfiguration}
              isReadOnly={isReadOnly}
            />
          )}
          {selectedTab === CONFIGURATION_EDITOR_TAB.PROJECT_DEPENDENCIES && (
            <ProjectDependencyEditor />
          )}
          {selectedTab === CONFIGURATION_EDITOR_TAB.PLATFORM_CONFIGURATIONS && (
            <ProjectPlatformVersionEditor
              projectConfig={currentProjectConfiguration}
              isReadOnly={isReadOnly}
            />
          )}
          {selectedTab === CONFIGURATION_EDITOR_TAB.ADVANCED && (
            <ProjectAdvancedEditor
              projectConfig={currentProjectConfiguration}
              configState={configState}
              isReadOnly={isReadOnly}
            />
          )}
        </PanelContent>
      </Panel>
    </div>
  );
});
