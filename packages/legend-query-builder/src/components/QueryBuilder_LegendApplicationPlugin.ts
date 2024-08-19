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
  collectKeyedCommandConfigEntriesFromConfig,
  collectSettingConfigurationEntriesFromConfig,
  LegendApplicationPlugin,
  type SettingConfigurationEntry,
  type KeyedCommandConfigEntry,
  type LegendApplicationPluginManager,
  type LegendApplicationSetup,
} from '@finos/legend-application';
import packageJson from '../../package.json' with { type: 'json' };
import { QUERY_BUILDER_SETTING_CONFIG } from '../__lib__/QueryBuilderSetting.js';
import { QUERY_BUILDER_COMMAND_CONFIG } from '../stores/QueryBuilderCommand.js';
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';
import { configureDataGridComponent } from '@finos/legend-lego/data-grid';
import { Chart as ChartJS, ArcElement, Tooltip, LinearScale } from 'chart.js';

export type CheckEntitlementEditorRender = (
  queryBuilderState: QueryBuilderState,
) => React.ReactNode | undefined;

export class QueryBuilder_LegendApplicationPlugin extends LegendApplicationPlugin {
  static NAME = packageJson.extensions.applicationPlugin;

  constructor() {
    super(QueryBuilder_LegendApplicationPlugin.NAME, packageJson.version);
  }

  install(
    pluginManager: LegendApplicationPluginManager<LegendApplicationPlugin>,
  ): void {
    pluginManager.registerApplicationPlugin(this);
  }

  override getExtraApplicationSetups(): LegendApplicationSetup[] {
    return [
      async (applicationStore) => {
        configureDataGridComponent();

        // configure chart component
        ChartJS.register(
          ArcElement,
          Tooltip,
          // NOTE: this is a workaround for a production bundle problem where LinearScale seems to be required
          // in only production build
          // See https://github.com/chartjs/Chart.js/issues/10895
          // See https://github.com/chartjs/Chart.js/issues/11157#issue-1592988375
          LinearScale,
        );
      },
    ];
  }

  override getExtraKeyedCommandConfigEntries(): KeyedCommandConfigEntry[] {
    return collectKeyedCommandConfigEntriesFromConfig(
      QUERY_BUILDER_COMMAND_CONFIG,
    );
  }

  override getExtraSettingConfigurationEntries(): SettingConfigurationEntry[] {
    return collectSettingConfigurationEntriesFromConfig(
      QUERY_BUILDER_SETTING_CONFIG,
    );
  }
}
