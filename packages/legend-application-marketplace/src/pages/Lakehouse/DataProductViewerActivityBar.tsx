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
  PlayIcon,
  QuestionCircleIcon,
  clsx,
  InfoCircleIcon,
  DataAccessIcon,
  GovernanceIcon,
  CostCircleIcon,
  DatasetIcon,
  AvailabilityIcon,
  HomeIcon,
  MenuContent,
  MenuContentItem,
  MenuIcon,
  ControlledDropdownMenu,
  DataReadyIcon,
  SparkleIcon,
} from '@finos/legend-art';
import { type ActivityBarItemConfig } from '@finos/legend-lego/application';
import type { DataProductViewerState } from '../../stores/lakehouse/DataProductViewerState.js';
import {
  DATA_PRODUCT_VIEWER_ACTIVITY_MODE,
  generateAnchorForActivity,
} from '../../stores/lakehouse/DataProductViewerNavigation.js';

const ActivityBarMenu = observer(
  (props: { dataSpaceViewerState: DataProductViewerState }) => {
    const { dataSpaceViewerState } = props;
    const layoutState = dataSpaceViewerState.layoutState;

    // actions
    const toggleExpandedMode = (): void =>
      layoutState.enableExpandedMode(!layoutState.isExpandedModeEnabled);

    return (
      <>
        <div className="data-space__viewer__activity-bar__menu">
          <ControlledDropdownMenu
            className="data-space__viewer__activity-bar__menu-item"
            menuProps={{
              anchorOrigin: { vertical: 'top', horizontal: 'right' },
              transformOrigin: { vertical: 'top', horizontal: 'left' },
              elevation: 7,
            }}
            content={
              <MenuContent>
                <MenuContentItem onClick={toggleExpandedMode}>
                  {layoutState.isExpandedModeEnabled
                    ? 'Disable Expanded Mode'
                    : 'Enable Expanded Mode'}
                </MenuContentItem>
              </MenuContent>
            }
          >
            <MenuIcon />
          </ControlledDropdownMenu>
        </div>
      </>
    );
  },
);

const DataProductViewerActivityBarItemExperimentalBadge: React.FC = () => (
  <div
    className="data-space__viewer__activity-bar__item__experimental-badge"
    title="This is work in progess"
  >
    <SparkleIcon />
  </div>
);

export const DataProductViewerActivityBar = observer(
  (props: { dataSpaceViewerState: DataProductViewerState }) => {
    const { dataSpaceViewerState } = props;
    const changeActivity =
      (activity: string): (() => void) =>
      (): void => {
        dataSpaceViewerState.changeZone(
          generateAnchorForActivity(activity),
          true,
        );
      };

    const wikiActivities: ActivityBarItemConfig[] = [
      {
        mode: DATA_PRODUCT_VIEWER_ACTIVITY_MODE.DESCRIPTION,
        title: 'Description',
        icon: (
          <HomeIcon className="data-space__viewer__activity-bar__icon--home" />
        ),
      },
      {
        mode: DATA_PRODUCT_VIEWER_ACTIVITY_MODE.DATA_ACCESS,
        title: 'Data Access',
        icon: (
          <DataAccessIcon className="data-space__viewer__activity-bar__icon--access" />
        ),
      },
    ];

    const activities: ActivityBarItemConfig[] = [
      {
        mode: DATA_PRODUCT_VIEWER_ACTIVITY_MODE.EXECUTION_CONTEXT,
        title: 'Execution Context',
        icon: <PlayIcon />,
      },
      {
        mode: DATA_PRODUCT_VIEWER_ACTIVITY_MODE.DATA_STORES,
        title: 'Data Stores (Work In Progress)',
        icon: (
          <>
            <DatasetIcon className="data-space__viewer__activity-bar__icon--dataset" />
            <DataProductViewerActivityBarItemExperimentalBadge />
          </>
        ),
      },
      {
        mode: DATA_PRODUCT_VIEWER_ACTIVITY_MODE.DATA_AVAILABILITY,
        title: 'Data Availability (Work In Progress)',
        icon: (
          <>
            <AvailabilityIcon className="data-space__viewer__activity-bar__icon--availability" />
            <DataProductViewerActivityBarItemExperimentalBadge />
          </>
        ),
      },
      {
        mode: DATA_PRODUCT_VIEWER_ACTIVITY_MODE.DATA_READINESS,
        title: 'Data Readiness (Work In Progress)',
        icon: (
          <>
            <DataReadyIcon className="data-space__viewer__activity-bar__icon--readiness" />
            <DataProductViewerActivityBarItemExperimentalBadge />
          </>
        ),
      },
      {
        mode: DATA_PRODUCT_VIEWER_ACTIVITY_MODE.DATA_COST,
        title: 'Data Cost (Work In Progress)',
        icon: (
          <>
            <CostCircleIcon className="data-space__viewer__activity-bar__icon--cost" />
            <DataProductViewerActivityBarItemExperimentalBadge />
          </>
        ),
      },
      {
        mode: DATA_PRODUCT_VIEWER_ACTIVITY_MODE.DATA_GOVERNANCE,
        title: 'Data Governance (Work In Progress)',
        icon: (
          <>
            <GovernanceIcon className="data-space__viewer__activity-bar__icon--governance" />
            <DataProductViewerActivityBarItemExperimentalBadge />
          </>
        ),
      },
      {
        mode: DATA_PRODUCT_VIEWER_ACTIVITY_MODE.INFO,
        title: 'Info',
        icon: (
          <InfoCircleIcon className="data-space__viewer__activity-bar__icon--info" />
        ),
      },
      {
        mode: DATA_PRODUCT_VIEWER_ACTIVITY_MODE.SUPPORT,
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
