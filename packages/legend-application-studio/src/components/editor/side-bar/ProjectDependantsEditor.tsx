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
import {
  useApplicationStore,
  generateExtensionUrlPattern,
} from '@finos/legend-application';
import {
  PanelListItem,
  Badge,
  DropdownMenu,
  MenuContent,
  MenuContentItem,
  CaretDownIcon,
  PanelLoadingIndicator,
  PanelDivider,
  PanelFormSection,
  Panel,
  InfoCircleIcon,
} from '@finos/legend-art';
import {
  MASTER_SNAPSHOT_ALIAS,
  SNAPSHOT_VERSION_ALIAS,
  type ProjectVersionPlatformDependency,
} from '@finos/legend-server-depot';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { PROJECT_OVERVIEW_ACTIVITY_MODE } from '../../../stores/sidebar-state/ProjectOverviewState.js';
import { useEditorStore } from '../EditorStoreProvider.js';
import {
  generateDependencyDashboardRoute,
  generateViewProjectByGAVRoute,
  generateViewVersionRoute,
} from '../../../stores/LegendStudioRouter.js';

const ProjectDependantEditor = observer(
  (props: { dependant: ProjectVersionPlatformDependency }) => {
    const { dependant } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const configState = editorStore.projectConfigurationEditorState;

    const viewProject = (
      dependency: ProjectVersionPlatformDependency,
    ): void => {
      applicationStore.navigationService.navigator.visitAddress(
        applicationStore.navigationService.navigator.generateAddress(
          generateViewProjectByGAVRoute(
            dependency.groupId,
            dependency.artifactId,
            dependency.versionId === MASTER_SNAPSHOT_ALIAS
              ? SNAPSHOT_VERSION_ALIAS
              : dependency.versionId,
          ),
        ),
      );
    };
    // NOTE: This assumes that the dependant project is in the same studio instance as the current project
    // In the future, the studio instance may be part of the project data
    const viewSDLCProject = (
      dependency: ProjectVersionPlatformDependency,
    ): void => {
      if (dependency.projectId && dependency.versionId) {
        applicationStore.navigationService.navigator.visitAddress(
          applicationStore.navigationService.navigator.generateAddress(
            generateViewVersionRoute(
              dependency.projectId,
              dependency.versionId,
            ),
          ),
        );
      }
    };

    return (
      <div
        className="project-dependency-editor"
        key={dependant.artifactId + dependant.groupId}
      >
        <PanelListItem className="panel__content__form__list__item--expand-width">
          <div className="project-dependency-editor">
            <div className="project-overview__dependants__label">
              <div className="project-overview__dependants__label__tag">
                {dependant.projectId ?? 'UAT-52849100'}
              </div>
              <div className="project-overview__dependants__label__name">
                {generateGAVCoordinates(
                  dependant.groupId,
                  dependant.artifactId,
                  undefined,
                )}
                <Badge
                  className="badge--right"
                  tooltip={`Depends on parent project ${configState.currentProjectConfiguration.projectId} version ${dependant.dependency.versionId}`}
                  title={dependant.dependency.versionId}
                />
              </div>
            </div>
          </div>
          <DropdownMenu
            className="project-dependency-editor__visit-project-btn__dropdown-trigger btn--medium"
            content={
              <MenuContent>
                <MenuContentItem
                  onClick={() => viewProject(dependant)}
                  title="View project"
                >
                  Project
                </MenuContentItem>

                <MenuContentItem
                  title="View SDLC project"
                  disabled={!dependant.projectId || !dependant.versionId}
                  onClick={() => viewSDLCProject(dependant)}
                >
                  SDLC project
                </MenuContentItem>
              </MenuContent>
            }
          >
            Go to...
            <CaretDownIcon title="Show more options..." />
          </DropdownMenu>
        </PanelListItem>
      </div>
    );
  },
);

export const ProjectDependantsEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const projectOverviewState = editorStore.projectOverviewState;
  const configState = editorStore.projectConfigurationEditorState;
  const dependantEditorState = projectOverviewState.projectDependantEditorState;
  const dependants = dependantEditorState.dependants;
  const isLoading =
    dependantEditorState.fetchingDependantInfoState.isInProgress;

  useEffect(() => {
    flowResult(projectOverviewState.fetchDependants()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [applicationStore, projectOverviewState]);

  return (
    <Panel className="side-bar__panel project-overview__panel">
      <div className="panel__header">
        <div className="panel__header__title">
          <div className="panel__header__title__content">
            {PROJECT_OVERVIEW_ACTIVITY_MODE.DEPENDANTS}
          </div>
          <div
            className="side-bar__panel__title__info"
            title={`List of projects that depend on current project (${projectOverviewState.sdlcState.currentProject?.projectId})`}
          >
            <InfoCircleIcon />
          </div>
        </div>
        <div className="side-bar__panel__header__changes-count">
          {projectOverviewState.projectDependantEditorState.dependants
            ?.length ?? 0}
        </div>
      </div>

      <PanelFormSection>
        <div className="panel__content__lists">
          <PanelLoadingIndicator isLoading={isLoading} />
          {isLoading && (
            <div className="project-dependency-editor__progress-msg">
              Fetching dependant versions
            </div>
          )}
          {dependants?.map((dependant: ProjectVersionPlatformDependency) => (
            <ProjectDependantEditor
              key={dependant.groupId + dependant.artifactId}
              dependant={dependant}
            />
          ))}
          <PanelDivider />
          <button
            className="btn btn--dark"
            tabIndex={-1}
            onClick={() => {
              applicationStore.navigationService.navigator.visitAddress(
                generateExtensionUrlPattern(
                  generateDependencyDashboardRoute(
                    configState.currentProjectConfiguration.projectId,
                    configState.currentProjectConfiguration.groupId,
                    configState.currentProjectConfiguration.artifactId,
                    undefined,
                    undefined,
                  ),
                ),
              );
            }}
            title="Open dependants dashboard"
          >
            Open Dependants Dashboard
          </button>
        </div>
      </PanelFormSection>
    </Panel>
  );
});
