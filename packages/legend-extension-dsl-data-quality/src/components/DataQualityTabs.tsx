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

import {
  type DataQualityState,
  DATA_QUALITY_TAB,
} from './states/DataQualityState.js';
import { observer } from 'mobx-react-lite';
import { clsx } from '@finos/legend-art';
import { prettyCONSTName } from '@finos/legend-shared';
import { DataQualityConstraintsSelection } from './DataQualityConstraintsSelection.js';
import { DataQualityResultPanel } from './DataQualityResultPanel.js';
import { DataQualityFilterPanel } from './DataQualityFilterPanel.js';
import { type DSL_DataQuality_LegendStudioPlugin_Extension } from './DSL_DataQuality_LegendStudioPlugin_Extension.js';

export const DataQualityTabs = observer(
  (props: { dataQualityState: DataQualityState }) => {
    const { dataQualityState } = props;
    const { selectedTab } = dataQualityState;
    const changeTab =
      (tab: string): (() => void) =>
      (): void =>
        dataQualityState.setSelectedTab(tab);

    const tabsToRender = dataQualityState.tabsToShow;
    const renderTabs = (): React.ReactNode => {
      switch (selectedTab) {
        case DATA_QUALITY_TAB.CONSTRAINTS_SELECTION:
          return (
            <DataQualityConstraintsSelection
              dataQualityState={dataQualityState}
            />
          );
        case DATA_QUALITY_TAB.FILTER:
          return (
            <DataQualityFilterPanel
              filterState={
                dataQualityState.dataQualityQueryBuilderState.filterState
              }
              dataQualityState={dataQualityState}
            />
          );
        case DATA_QUALITY_TAB.TRIAL_RUNS:
          return <DataQualityResultPanel dataQualityState={dataQualityState} />;
        default: {
          if (selectedTab) {
            const extraTabRenderers = dataQualityState.editorStore.pluginManager
              .getApplicationPlugins()
              .flatMap(
                (plugin) =>
                  (
                    plugin as DSL_DataQuality_LegendStudioPlugin_Extension
                  ).getComponentRenderers?.() ?? [],
              );
            for (const extraTabRenderer of extraTabRenderers) {
              const componentToRender = extraTabRenderer(
                selectedTab,
                dataQualityState,
              );
              if (componentToRender) {
                return componentToRender;
              }
            }
          }
          return undefined;
        }
      }
    };

    return (
      <div className="panel">
        <div className="panel__header">
          <div className="uml-element-editor__tabs">
            {tabsToRender.map((tab) => (
              <div
                key={tab}
                onClick={changeTab(tab)}
                className={clsx('data-quality__tab', {
                  'data-quality__tab--active': tab === selectedTab,
                })}
              >
                {prettyCONSTName(tab)}
              </div>
            ))}
          </div>
        </div>
        <div className="panel__content">{renderTabs()}</div>
      </div>
    );
  },
);
