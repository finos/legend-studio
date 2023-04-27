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
import { ACTIVITY_MODE } from '../stores/PureIDEConfig.js';
import { clsx, FileAltIcon, LegendLogo, ListIcon } from '@finos/legend-art';
import { usePureIDEStore } from './PureIDEStoreProvider.js';
import type { ActivityBarItemConfig } from '@finos/legend-lego/application';

export const ActivityBar = observer(() => {
  const ideStore = usePureIDEStore();
  const changeActivity =
    (activity: string): (() => void) =>
    (): void =>
      ideStore.setActiveActivity(activity);
  const activities: ActivityBarItemConfig[] = (
    [
      {
        mode: ACTIVITY_MODE.CONCEPT_EXPLORER,
        title: 'Concept Explorer',
        icon: <ListIcon />,
      },
      {
        mode: ACTIVITY_MODE.FILE_EXPLORER,
        title: 'File Explorer',
        icon: <FileAltIcon />,
      },
    ] as ActivityBarItemConfig[]
  ).filter((activity): activity is ActivityBarItemConfig => Boolean(activity));

  return (
    <div className="activity-bar">
      <div className="activity-bar__logo">
        <LegendLogo />
      </div>
      <div className="activity-bar__items">
        {activities.map((activity) => (
          <button
            key={activity.mode}
            className={clsx('activity-bar__item', {
              'activity-bar__item--active':
                ideStore.sideBarDisplayState.isOpen &&
                ideStore.activeActivity === activity.mode,
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
});
