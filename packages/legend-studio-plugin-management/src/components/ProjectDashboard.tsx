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
import { observer } from 'mobx-react-lite';
import {
  FaQuestionCircle,
  FaTimesCircle,
  FaCheckCircle,
  FaCircleNotch,
  FaPauseCircle,
  FaBan,
} from 'react-icons/fa';
import { PanelLoadingIndicator } from '@finos/legend-application-components';
import { flowResult } from 'mobx';
import { AppHeader, AppHeaderMenu } from '@finos/legend-studio';
import { Build, BuildStatus, ProjectType } from '@finos/legend-server-sdlc';
import {
  ProjectDashboardStoreProvider,
  useProjectDashboardStore,
} from './ProjectDashboardStoreProvider';
import { useApplicationStore } from '@finos/legend-application';

const renderBuildStatus = (data: Build): React.ReactElement => {
  switch (data.status) {
    case BuildStatus.PENDING:
      return (
        <div
          title="Pipeline is suspended"
          className="project-dashboard__group__item__build-status__indicator project-dashboard__group__item__build-status__indicator--suspended"
        >
          <FaPauseCircle />
        </div>
      );
    case BuildStatus.IN_PROGRESS:
      return (
        <div
          title="Pipeline is running"
          className="project-dashboard__group__item__build-status__indicator project-dashboard__group__item__build-status__indicator--in-progress"
        >
          <FaCircleNotch />
        </div>
      );
    case BuildStatus.SUCCEEDED:
      return (
        <div
          title="Pipeline succeeded"
          className="project-dashboard__group__item__build-status__indicator project-dashboard__group__item__build-status__indicator--succeeded"
        >
          <FaCheckCircle />
        </div>
      );
    case BuildStatus.FAILED:
      return (
        <div
          title="Pipeline failed"
          className="project-dashboard__group__item__build-status__indicator project-dashboard__group__item__build-status__indicator--failed"
        >
          <FaTimesCircle />
        </div>
      );
    case BuildStatus.CANCELED:
      return (
        <div
          title="Pipeline is canceled"
          className="project-dashboard__group__item__build-status__indicator project-dashboard__group__item__build-status__indicator--canceled"
        >
          <FaBan />
        </div>
      );
    case BuildStatus.UNKNOWN:
    default:
      return (
        <div
          title="Pipeline status is unknown"
          className="project-dashboard__group__item__build-status__indicator project-dashboard__group__item__build-status__indicator--unknown"
        >
          <FaQuestionCircle />
        </div>
      );
  }
};

const renderProjectBuildStatus = (
  data: Build | undefined | null,
): React.ReactElement => {
  if (data === undefined) {
    return (
      <div
        title="Fetching pipeline information"
        className="project-dashboard__group__item__build-status__indicator project-dashboard__group__item__build-status__indicator--fetching"
      >
        <FaCircleNotch />
      </div>
    );
  } else if (data === null) {
    return (
      <div
        title="No pipeline found"
        className="project-dashboard__group__item__build-status__indicator project-dashboard__group__item__build-status__indicator--not-found"
      >
        <FaQuestionCircle />
      </div>
    );
  } else {
    return (
      <a href={data.webURL} target="_blank" rel="noopener noreferrer">
        {renderBuildStatus(data)}
      </a>
    );
  }
};

/**
 * NOTE: this view is still under construction and likely get replaced in the future
 */
export const ProjectDashboardInner = observer(() => {
  const dashboardStore = useProjectDashboardStore();
  const applicationStore = useApplicationStore();
  const projects = dashboardStore.projects;
  const productionProjects = Array.from(projects.values()).filter(
    (project) => project.projectType === ProjectType.PRODUCTION,
  );
  const productionFailures = productionProjects
    .map((project) =>
      dashboardStore.currentBuildByProject.get(project.projectId),
    )
    .filter(
      (build) => build instanceof Build && build.status === BuildStatus.FAILED,
    );
  const prototypeProjects = Array.from(projects.values()).filter(
    (project) => project.projectType === ProjectType.PROTOTYPE,
  );
  const prototypeFailures = prototypeProjects
    .map((project) =>
      dashboardStore.currentBuildByProject.get(project.projectId),
    )
    .filter(
      (build) => build instanceof Build && build.status === BuildStatus.FAILED,
    );

  useEffect(() => {
    flowResult(dashboardStore.fetchProjects()).catch(
      applicationStore.alertIllegalUnhandledError,
    );
  }, [applicationStore, dashboardStore]);

  return (
    <div className="app__page">
      <AppHeader>
        <AppHeaderMenu />
      </AppHeader>
      <div className="app__content">
        <div className="project-dashboard">
          <PanelLoadingIndicator
            isLoading={dashboardStore.isFetchingProjects}
          />
          <div className="project-dashboard__group">
            <div className="project-dashboard__group__header">
              <div className="project-dashboard__group__header__name">
                PROD - Production
              </div>
              <div className="project-dashboard__group__header__count">
                ({productionProjects.length})
              </div>
              {Boolean(productionFailures.length) && (
                <div className="project-dashboard__group__header__failure">
                  <div
                    title="Pipeline failed"
                    className="project-dashboard__group__item__build-status__indicator project-dashboard__group__item__build-status__indicator--failed"
                  >
                    <FaTimesCircle />
                  </div>
                  <div className="project-dashboard__group__header__failure__count">
                    {productionFailures.length}
                  </div>
                </div>
              )}
            </div>
            {productionProjects.map((project) => (
              <div
                key={project.projectId}
                className="project-dashboard__group__item"
              >
                <div className="project-dashboard__group__item__build-status">
                  {renderProjectBuildStatus(
                    dashboardStore.currentBuildByProject.get(project.projectId),
                  )}
                </div>
                <div className="project-dashboard__group__item__name">
                  {project.name}
                </div>
                <div className="project-dashboard__group__item__id">
                  {project.projectId}
                </div>
              </div>
            ))}
          </div>
          <div className="project-dashboard__group">
            <div className="project-dashboard__group__header">
              <div className="project-dashboard__group__header__name">
                UAT - Prototype
              </div>
              <div className="project-dashboard__group__header__count">
                ({prototypeProjects.length})
              </div>
              {Boolean(prototypeFailures.length) && (
                <div className="project-dashboard__group__header__failure">
                  <div
                    title="Pipeline failed"
                    className="project-dashboard__group__item__build-status__indicator project-dashboard__group__item__build-status__indicator--failed"
                  >
                    <FaTimesCircle />
                  </div>
                  <div className="project-dashboard__group__header__failure__count">
                    {prototypeFailures.length}
                  </div>
                </div>
              )}
            </div>
            {prototypeProjects.map((project) => (
              <div
                key={project.projectId}
                className="project-dashboard__group__item"
              >
                <div className="project-dashboard__group__item__build-status">
                  {renderProjectBuildStatus(
                    dashboardStore.currentBuildByProject.get(project.projectId),
                  )}
                </div>
                <div className="project-dashboard__group__item__name">
                  {project.name}
                </div>
                <div className="project-dashboard__group__item__id">
                  {project.projectId}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export const ProjectDashboard: React.FC = () => (
  <ProjectDashboardStoreProvider>
    <ProjectDashboardInner />
  </ProjectDashboardStoreProvider>
);
