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

import { useEffect } from 'react';
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
  ExclamationTriangleIcon,
  PanelFormSection,
  PanelListItem,
  Button,
  PencilEditIcon,
  PanelDivider,
  PanelHeaderActionItem,
  PanelHeaderActions,
  PanelContent,
  PanelHeader,
  PanelContentLists,
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
import {
  ActionAlertActionType,
  ActionAlertType,
  shouldDisplayVirtualAssistantDocumentationEntry,
  useApplicationStore,
} from '@finos/legend-application';
import { ProjectDependencyEditor } from './ProjectDependencyEditor.js';
import { LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../../../__lib__/LegendStudioDocumentation.js';
import {
  DocumentationLink,
  DocumentationPreview,
} from '@finos/legend-lego/application';
import type { StoreProjectData } from '@finos/legend-server-depot';

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

    return (
      <PanelContentLists>
        <div className="project-configuration-editor__project__structure__version">
          <div className="project-configuration-editor__project__structure__version__label">
            <div className="project-configuration-editor__project__structure__version__label__status">
              {isProjectStructureVersionOutdated ? (
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
              {`PROJECT STRUCTURE VERSION ${projectConfig.projectStructureVersion.fullVersion}`}
            </div>
          </div>
          {isProjectStructureVersionOutdated && latestVersion && (
            <button
              className="project-configuration-editor__project__structure__version__update-btn"
              disabled={isReadOnly}
              onClick={updateVersion}
              tabIndex={-1}
              title={`Current project structure is outdated. Click to update to the latest version (v${latestVersion.fullVersion}})`}
            >
              Update to version{' '}
              {editorStore.projectConfigurationEditorState.isInEmbeddedMode
                ? latestVersion.version
                : latestVersion.fullVersion}
            </button>
          )}
        </div>

        <PanelForm>
          <PanelFormSection>
            <div className="panel__content__form__section__header__label">
              Group ID
            </div>
            <div className="panel__content__form__section__header__prompt">
              The domain for artifacts generated as part of the project build
              pipeline and published to an artifact repository
            </div>
            <PanelListItem>
              <div className="input-group project-configuration-editor__input">
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
                {isGroupIdChanged && (
                  <DocumentationLink
                    documentationKey={
                      LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_UPDATE_PROJECT_GAV_COORDINATES
                    }
                  />
                )}
              </div>
            </PanelListItem>
          </PanelFormSection>
          <PanelFormSection>
            <div className="panel__content__form__section__header__label">
              Artifact ID
            </div>
            <div className="panel__content__form__section__header__prompt">
              The identifier (within the domain specified by group ID) for
              artifacts generated as part of the project build pipeline and
              published to an artifact repository
            </div>
            <PanelListItem>
              <div className="input-group project-configuration-editor__input">
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
                {isArtifactIdChanged && (
                  <DocumentationLink
                    documentationKey={
                      LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_HOW_TO_UPDATE_PROJECT_GAV_COORDINATES
                    }
                  />
                )}
              </div>
            </PanelListItem>
          </PanelFormSection>
        </PanelForm>
      </PanelContentLists>
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

const PlatformDependencyEditor = observer(
  (props: { platform: PlatformConfiguration }) => {
    const { platform } = props;

    return (
      <div className="platform-configurations-editor__dependency">
        <div className="platform-configurations-editor__dependency__label">
          <div className="platform-configurations-editor__dependency__label__status"></div>
          <div className="platform-configurations-editor__dependency__label__text">
            {platform.name}
          </div>
          <input
            className="input input--dark"
            onChange={(event) => {
              platform.setVersion(event.target.value);
            }}
            value={platform.version}
            spellCheck={false}
          />
        </div>
      </div>
    );
  },
);

const ProjectPlatformVersionEditor = observer(
  (props: { projectConfig: ProjectConfiguration; isReadOnly: boolean }) => {
    const { projectConfig, isReadOnly } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();

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

    const toggleManualOverwrite = (): void => {
      if (!editorStore.projectConfigurationEditorState.manualOverwrite) {
        applicationStore.alertService.setActionAlertInfo({
          message:
            'Clicking this will allow you to not just override and freeze platform versions but to input custom platform versions you would like manually and is not usually recommended except to temporarily unblock your project',
          prompt: 'Do you want to proceed?',
          type: ActionAlertType.CAUTION,
          actions: [
            {
              label: 'Continue',
              type: ActionAlertActionType.PROCEED_WITH_CAUTION,
              handler: (): void =>
                editorStore.projectConfigurationEditorState.setManualOverwrite(
                  true,
                ),
            },
            {
              label: 'Cancel',
              type: ActionAlertActionType.PROCEED,
              default: true,
            },
          ],
        });
      } else {
        editorStore.projectConfigurationEditorState.setManualOverwrite(false);
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
              LEGEND_STUDIO_DOCUMENTATION_KEY.QUESTION_WHEN_TO_CONFIGURE_PLATFORM_VERSIONS
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

              <div className="platform-configurations-editor__dependencies__header__right">
                <PanelListItem>
                  {platformConfigurations &&
                    !isUpToDate &&
                    !editorStore.projectConfigurationEditorState
                      .manualOverwrite && (
                      <div>
                        <button
                          className="btn btn--dark"
                          tabIndex={-1}
                          onClick={updateLatestToLatestVersion}
                        >
                          Update to the current latest platform version
                        </button>
                      </div>
                    )}
                  <Button
                    className={clsx(
                      'project-configuration-editor__manual-btn',
                      {
                        'project-configuration-editor__manual-btn--active':
                          editorStore.projectConfigurationEditorState
                            .manualOverwrite,
                      },
                    )}
                    title="Manually overwrite platform configurations"
                    disabled={isReadOnly}
                    onClick={toggleManualOverwrite}
                  >
                    <PencilEditIcon />
                  </Button>
                </PanelListItem>
              </div>
            </div>
            <div className="platform-configurations-editor__dependencies__content">
              {editorStore.projectConfigurationEditorState.manualOverwrite ? (
                <>
                  {!platformConfigurations &&
                    defaultPlatforms?.map((p) => (
                      <PlatformDependencyEditor key={p.name} platform={p} />
                    ))}
                  {platformConfigurations?.map((p) => (
                    <PlatformDependencyEditor key={p.name} platform={p} />
                  ))}

                  <PanelDivider />
                  <PanelListItem>
                    <Button
                      className="project-configuration-editor__manual-overwrite-btn"
                      disabled={isReadOnly}
                      onClick={() => {
                        editorStore.projectConfigurationEditorState.setManualOverwrite(
                          false,
                        );
                      }}
                      title="Cancel manual override"
                      text="Cancel"
                    />

                    <Button
                      className="project-configuration-editor__manual-overwrite-btn"
                      disabled={isReadOnly}
                      onClick={() => {
                        if (!platformConfigurations) {
                          projectConfig.setPlatformConfigurations(
                            defaultPlatforms,
                          );
                        } else {
                          projectConfig.setPlatformConfigurations(
                            platformConfigurations,
                          );
                        }

                        editorStore.projectConfigurationEditorState.setManualOverwrite(
                          false,
                        );
                      }}
                      text="Manual override"
                    />
                  </PanelListItem>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </PanelForm>
      </Panel>
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
          const currentProjects = Array.from(configState.projects.values());
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
