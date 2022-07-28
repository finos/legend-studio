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

import type { ProjectData } from '@finos/legend-server-depot';
import { SDLCServerClient } from '@finos/legend-server-sdlc';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import type { SDLCInstance } from '../application/LegendQueryApplicationConfig.js';
import type { QueryEditorStore } from './QueryEditorStore.js';

export type SDLCInstanceOption = {
  label: string;
  value: SDLCInstance;
};

export class QuerySDLCState {
  queryEditorStore: QueryEditorStore;
  sdlcInstances: SDLCInstance[] = [];
  sdlcServer: SDLCServerClient;
  depotProject: ProjectData | undefined;

  constructor(queryEditorStore: QueryEditorStore) {
    makeObservable(this, {
      depotProject: observable,
      setDepotProject: action,
    });
    this.queryEditorStore = queryEditorStore;
    this.sdlcInstances =
      this.queryEditorStore.applicationStore.config.sdlcInstances;
    const defaultSdlc =
      this.queryEditorStore.applicationStore.config.defaultSdlc;
    this.sdlcServer = new SDLCServerClient({
      env: defaultSdlc.key,
      serverUrl: defaultSdlc.url,
    });
  }

  get sdlcInstanceOptions(): SDLCInstanceOption[] {
    return this.sdlcInstances.map((sdlc) => ({
      label: sdlc.label,
      value: sdlc,
    }));
  }

  setDepotProject(project: ProjectData | undefined): void {
    this.depotProject = project;
  }

  setSdlServer(instance: SDLCInstance): void {
    this.sdlcServer.setBaseUrl(instance.url);
  }

  get selectedOption(): SDLCInstanceOption {
    const url = this.sdlcServer.baseUrl;
    const sdlcInstance = guaranteeNonNullable(
      this.sdlcInstances.find((s) => s.url === url),
    );
    return {
      value: sdlcInstance,
      label: sdlcInstance.label,
    };
  }
}
