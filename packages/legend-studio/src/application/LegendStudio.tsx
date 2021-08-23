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

import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { configure as configureReactHotkeys } from 'react-hotkeys';
import { LegendStudioApplication } from '../components/LegendStudioApplication';
import { StudioPluginManager } from './StudioPluginManager';
import {
  LegendApplication,
  setupLegendApplicationUILibrary,
  WebApplicationNavigatorProvider,
} from '@finos/legend-application';
import type { Log } from '@finos/legend-shared';

const setupLegendStudioUILibrary = async (
  pluginManager: StudioPluginManager,
  log: Log,
): Promise<void> => {
  await setupLegendApplicationUILibrary(pluginManager, log);

  configureReactHotkeys({
    // By default, `react-hotkeys` will avoid capturing keys from input tags like <input>, <textarea>, <select>
    // We want to listen to hotkey from every where in the app so we disable that
    // See https://github.com/greena13/react-hotkeys#ignoring-events
    ignoreTags: [],
  });

  await Promise.all(
    pluginManager
      .getStudioPlugins()
      .flatMap((plugin) => plugin.getExtraApplicationSetups?.() ?? [])
      .map((setup) => setup(pluginManager)),
  );
};

export class LegendStudio extends LegendApplication {
  declare pluginManager: StudioPluginManager;

  static create(): LegendStudio {
    return new LegendStudio(StudioPluginManager.create());
  }

  async loadApplication(): Promise<void> {
    // Setup React application libraries
    await setupLegendStudioUILibrary(this.pluginManager, this.log);

    // Render React application
    const root = ((): Element => {
      let rootEl = document.getElementsByTagName('root').length
        ? document.getElementsByTagName('root')[0]
        : undefined;
      if (!rootEl) {
        rootEl = document.createElement('root');
        document.body.appendChild(rootEl);
      }
      return rootEl;
    })();

    ReactDOM.render(
      // TODO: would be great if we can have <React.StrictMode> here but since Mobx React is not ready for
      // concurrency yet, we would have to wait until @next become official
      // See https://github.com/mobxjs/mobx-react-lite/issues/53
      <BrowserRouter basename={this.baseUrl}>
        <WebApplicationNavigatorProvider>
          <LegendStudioApplication
            config={this.appConfig}
            pluginManager={this.pluginManager}
            log={this.log}
          />
        </WebApplicationNavigatorProvider>
      </BrowserRouter>,
      root,
    );
  }
}
