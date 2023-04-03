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

import { observer } from 'mobx-react-lite';
import {
  ShapesIcon,
  PlayIcon,
  QuestionCircleIcon,
  clsx,
  InfoCircleIcon,
  DocumentationIcon,
  LaunchIcon,
  DataAccessIcon,
  GovernanceIcon,
  CostCircleIcon,
  DatasetIcon,
  AvailabilityIcon,
  HomeIcon,
  MenuContent,
  MenuContentItem,
  MenuIcon,
  DropdownMenu,
  DataReadyIcon,
} from '@finos/legend-art';
import {
  type DataSpaceViewerState,
  DATA_SPACE_VIEWER_ACTIVITY_MODE,
} from '../stores/DataSpaceViewerState.js';

const ActivityBarMenu = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;

    // actions
    const toggleExpandedMode = (): void =>
      dataSpaceViewerState.enableExpandedMode(
        !dataSpaceViewerState.isExpandedModeEnabled,
      );

    return (
      <>
        <div className="data-space__viewer__activity-bar__menu">
          <DropdownMenu
            className="data-space__viewer__activity-bar__menu-item"
            menuProps={{
              anchorOrigin: { vertical: 'top', horizontal: 'right' },
              transformOrigin: { vertical: 'top', horizontal: 'left' },
              elevation: 7,
            }}
            content={
              <MenuContent>
                <MenuContentItem onClick={toggleExpandedMode}>
                  {dataSpaceViewerState.isExpandedModeEnabled
                    ? 'Disable Expanded Mode'
                    : 'Enable Expanded Mode'}{' '}
                </MenuContentItem>
              </MenuContent>
            }
          >
            <MenuIcon />
          </DropdownMenu>
        </div>
      </>
    );
  },
);

interface DataSpaceViewerActivityConfig {
  mode: DATA_SPACE_VIEWER_ACTIVITY_MODE;
  title: string;
  icon: React.ReactElement;
}

export const DataSpaceViewerActivityBar = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const changeActivity =
      (activity: DATA_SPACE_VIEWER_ACTIVITY_MODE): (() => void) =>
      (): void =>
        dataSpaceViewerState.setCurrentActivity(activity);

    const wikiActivities: DataSpaceViewerActivityConfig[] = [
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.DESCRIPTION,
        title: 'Description',
        icon: (
          <HomeIcon className="data-space__viewer__activity-bar__icon--home" />
        ),
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.DIAGRAM_VIEWER,
        title: 'Diagrams',
        icon: <ShapesIcon />,
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.MODELS_DOCUMENTATION,
        title: 'Models Documentation',
        icon: <DocumentationIcon />,
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.QUICK_START,
        title: 'Quick Start',
        icon: (
          <LaunchIcon className="data-space__viewer__activity-bar__icon--launch" />
        ),
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_ACCESS,
        title: 'Data Access',
        icon: (
          <DataAccessIcon className="data-space__viewer__activity-bar__icon--access" />
        ),
      },
    ];

    const activities: DataSpaceViewerActivityConfig[] = [
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.EXECUTION_CONTEXT,
        title: 'Execution Context',
        icon: <PlayIcon />,
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_STORES,
        title: 'Data Stores',
        icon: (
          <DatasetIcon className="data-space__viewer__activity-bar__icon--dataset" />
        ),
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_AVAILABILITY,
        title: 'Data Availability',
        icon: (
          <AvailabilityIcon className="data-space__viewer__activity-bar__icon--availability" />
        ),
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_READINESS,
        title: 'Data Readiness',
        icon: (
          <DataReadyIcon className="data-space__viewer__activity-bar__icon--readiness" />
        ),
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_COST,
        title: 'Data Cost',
        icon: (
          <CostCircleIcon className="data-space__viewer__activity-bar__icon--cost" />
        ),
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_GOVERNANCE,
        title: 'Governance',
        icon: (
          <GovernanceIcon className="data-space__viewer__activity-bar__icon--governance" />
        ),
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.INFO,
        title: 'Info',
        icon: (
          <InfoCircleIcon className="data-space__viewer__activity-bar__icon--info" />
        ),
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.SUPPORT,
        title: 'Support',
        icon: (
          <QuestionCircleIcon className="data-space__viewer__activity-bar__icon--support" />
        ),
      },
    ];

    return (
      <div className="data-space__viewer__activity-bar">
        <ActivityBarMenu dataSpaceViewerState={dataSpaceViewerState} />
        <div className="data-space__viewer__activity-bar__items">
          {wikiActivities.map((activity) => (
            <button
              key={activity.mode}
              className={clsx('data-space__viewer__activity-bar__item', {
                'data-space__viewer__activity-bar__item--active':
                  dataSpaceViewerState.currentActivity === activity.mode,
              })}
              onClick={changeActivity(activity.mode)}
              tabIndex={-1}
              title={activity.title}
            >
              {activity.icon}
            </button>
          ))}
          <div className="data-space__viewer__activity-bar__divider" />
          {activities.map((activity) => (
            <button
              key={activity.mode}
              className={clsx('data-space__viewer__activity-bar__item', {
                'data-space__viewer__activity-bar__item--active':
                  dataSpaceViewerState.currentActivity === activity.mode,
              })}
              onClick={changeActivity(activity.mode)}
              tabIndex={-1}
              title={activity.title}
            >
              {activity.icon}
            </button>
          ))}
        </div>
      </div>
    );
  },
);
