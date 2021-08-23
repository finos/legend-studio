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

import packageJson from '../../package.json';
import type {
  StudioPluginManager,
  ApplicationPageRenderEntry,
} from '@finos/legend-studio';
import { EditorPlugin } from '@finos/legend-studio';
import { ProjectDashboard } from './ProjectDashboard';
import { PATH_PARAM_TOKEN_REDIRECT_URL, URLRedirector } from './URLRedirector';

export class Management_EditorPlugin extends EditorPlugin {
  constructor() {
    super(packageJson.extensions.studioPlugin, packageJson.version);
  }

  install(pluginManager: StudioPluginManager): void {
    pluginManager.registerEditorPlugin(this);
  }

  override getExtraApplicationPageRenderEntries(): ApplicationPageRenderEntry[] {
    return [
      // project dashboard
      {
        urlPattern: `/projectDashboard`,
        component: ProjectDashboard,
      },
      // URL redirector
      {
        urlPattern: `/redirect/-/:${PATH_PARAM_TOKEN_REDIRECT_URL}+/-/`,
        component: URLRedirector,
      },
    ];
  }
}
