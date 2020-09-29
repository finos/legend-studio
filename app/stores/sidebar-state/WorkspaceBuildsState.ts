/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { observable, flow } from 'mobx';
import { deserialize } from 'serializr';
import { sdlcClient } from 'API/SdlcClient';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { Build } from 'SDLC/build/Build';
import { EditorStore } from 'Stores/EditorStore';
import { EditorSdlcState } from 'Stores/EditorSdlcState';

export class WorkspaceBuildsState {
  editorStore: EditorStore;
  sdlcState: EditorSdlcState;
  @observable isFetchingBuilds = false;
  @observable builds: Build[] = [];

  constructor(editorStore: EditorStore, sdlcState: EditorSdlcState) {
    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
  }

  fetchAllWorkspaceBuilds = flow(function* (this: WorkspaceBuildsState) {
    try {
      this.isFetchingBuilds = true;
      // NOTE: this network call can take a while, so we might consider limiting the number of builds to 10 or so
      const builds = (yield sdlcClient.getBuilds(this.sdlcState.currentProjectId, this.sdlcState.currentWorkspaceId, undefined, undefined, undefined)) as unknown as Build[];
      this.builds = builds.map(build => deserialize(Build, build));
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isFetchingBuilds = false;
    }
  });
}
