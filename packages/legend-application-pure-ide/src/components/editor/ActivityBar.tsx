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
import { ACTIVITY_MODE } from '../../stores/EditorConfig.js';
import { clsx, FileAltIcon, LegendLogo, ListIcon } from '@finos/legend-art';
import { useEditorStore } from './EditorStoreProvider.js';

interface ActivityDisplay {
  mode: ACTIVITY_MODE;
  title: string;
  info?: string;
  icon: React.ReactElement;
}

export const ActivityBar = observer(() => {
  const editorStore = useEditorStore();
  const changeActivity =
    (activity: ACTIVITY_MODE): (() => void) =>
    (): void =>
      editorStore.setActiveActivity(activity);
  const activities: ActivityDisplay[] = [
    {
      mode: ACTIVITY_MODE.CONCEPT,
      title: 'Concept Explorer',
      icon: <ListIcon />,
    },
    {
      mode: ACTIVITY_MODE.FILE,
      title: 'File Explorer',
      icon: <FileAltIcon />,
    },
  ].filter((activity): activity is ActivityDisplay => Boolean(activity));

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
                editorStore.sideBarDisplayState.isOpen &&
                editorStore.activeActivity === activity.mode,
            })}
            onClick={changeActivity(activity.mode)}
            tabIndex={-1}
            title={`${activity.title}${
              activity.info ? ` - ${activity.info}` : ''
            }`}
          >
            {activity.icon}
          </button>
        ))}
      </div>
    </div>
  );
});
