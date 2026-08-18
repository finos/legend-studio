/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import { clsx, HomeIcon, PlayIcon, SitemapIcon } from '@finos/legend-art';
import { DATA_SPACE_TAB } from '../../stores/DataSpaceEditorState.js';

const SIDEBAR_TABS = [
  { tab: DATA_SPACE_TAB.HOME, icon: <HomeIcon /> },
  { tab: DATA_SPACE_TAB.EXECUTION_CONTEXTS, icon: <SitemapIcon /> },
  { tab: DATA_SPACE_TAB.EXECUTABLES, icon: <PlayIcon /> },
];

export const DataSpaceSidebar = observer(
  (props: {
    selectedTab: DATA_SPACE_TAB;
    setSelectedTab: (tab: DATA_SPACE_TAB) => void;
  }) => {
    const { selectedTab, setSelectedTab } = props;
    return (
      <div
        className="data-space__viewer__activity-bar dataSpace-editor__sidebar"
        style={{ position: 'static', maxHeight: '100%' }}
      >
        <div className="data-space__viewer__activity-bar__items">
          {SIDEBAR_TABS.map((item) => (
            <button
              key={item.tab}
              className={clsx('data-space__viewer__activity-bar__item', {
                'data-space__viewer__activity-bar__item--active':
                  selectedTab === item.tab,
              })}
              onClick={(): void => setSelectedTab(item.tab)}
              tabIndex={-1}
              title={item.tab}
            >
              {item.icon}
              <span className="dataSpace-editor__sidebar__item__label">
                {item.tab}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  },
);
