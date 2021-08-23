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

import type { AbstractPlugin, AbstractPreset } from '@finos/legend-shared';
import { Log, AbstractPluginManager } from '@finos/legend-shared';
import type { PureGraphManagerPlugin } from './graphManager/PureGraphManagerPlugin';
import { GraphManagerState } from './GraphManagerState';
import { GraphManagerStateProvider } from './GraphManagerStateProvider';
import type { GraphPluginManager } from './GraphPluginManager';
import type { PureProtocolProcessorPlugin } from './models/protocols/pure/PureProtocolProcessorPlugin';

export class TEST__GraphPluginManager
  extends AbstractPluginManager
  implements GraphPluginManager
{
  override usePlugins(plugins: AbstractPlugin[]): AbstractPluginManager {
    return this;
  }
  override usePresets(presets: AbstractPreset[]): AbstractPluginManager {
    return this;
  }
  override configure(configData: Record<PropertyKey, object>): void {
    // do nothing
  }
  override install(): void {
    // do nothing
  }
  registerPureGraphManagerPlugin(plugin: PureGraphManagerPlugin): void {
    // do nothing
  }
  registerPureProtocolProcessorPlugin(
    plugin: PureProtocolProcessorPlugin,
  ): void {
    // do nothing
  }
  getPureGraphManagerPlugins(): PureGraphManagerPlugin[] {
    return [];
  }
  getPureProtocolProcessorPlugins(): PureProtocolProcessorPlugin[] {
    return [];
  }
}

export const TEST__getTestGraphManagerState = (
  pluginManager?: GraphPluginManager,
): GraphManagerState =>
  new GraphManagerState(
    pluginManager ?? new TEST__GraphPluginManager(),
    new Log(),
  );

export const TEST__provideMockedGraphManagerState = (customization?: {
  mock?: GraphManagerState;
  pluginManager?: GraphPluginManager;
}): GraphManagerState => {
  const value =
    customization?.mock ??
    TEST__getTestGraphManagerState(customization?.pluginManager);
  const MockedGraphManagerStateProvider = require('./GraphManagerStateProvider'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  MockedGraphManagerStateProvider.useGraphManagerState = jest.fn();
  MockedGraphManagerStateProvider.useGraphManagerState.mockReturnValue(value);
  return value;
};

export const TEST__GraphManagerStateProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => (
  <GraphManagerStateProvider
    pluginManager={new TEST__GraphPluginManager()}
    log={new Log()}
  >
    {children}
  </GraphManagerStateProvider>
);
