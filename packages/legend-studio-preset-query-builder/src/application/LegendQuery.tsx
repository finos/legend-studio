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
  LegendApplication,
  setupLegendStudioUILibrary,
  PluginManager,
} from '@finos/legend-studio';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { LegendQueryApplication } from '../components/standalone/LegendQueryApplication';

export class LegendQuery extends LegendApplication {
  declare pluginManager: PluginManager;

  static create(): LegendQuery {
    return new LegendQuery(PluginManager.create());
  }

  async loadApplication(): Promise<void> {
    // Setup React application libraries
    await setupLegendStudioUILibrary(this.pluginManager);

    // TODO: we can remove this in the future when we modularize core a bit better
    // especially application config
    this.appConfig.setSDLCServerKey('-');
    this.appConfig.setConfigured(true);

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
      <BrowserRouter basename={this.baseUrl}>
        <LegendQueryApplication
          config={this.appConfig}
          pluginManager={this.pluginManager}
        />
      </BrowserRouter>,
      root,
    );
  }
}
