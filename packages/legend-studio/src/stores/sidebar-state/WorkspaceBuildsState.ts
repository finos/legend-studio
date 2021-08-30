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

import { makeAutoObservable } from 'mobx';
import { STUDIO_LOG_EVENT } from '../../stores/StudioLogEvent';
import type { EditorStore } from '../EditorStore';
import type { EditorSdlcState } from '../EditorSdlcState';
import type { GeneratorFn, PlainObject } from '@finos/legend-shared';
import { assertErrorThrown, LogEvent } from '@finos/legend-shared';
import { Build } from '@finos/legend-server-sdlc';

export class WorkspaceBuildsState {
  editorStore: EditorStore;
  sdlcState: EditorSdlcState;
  isFetchingBuilds = false;
  builds: Build[] = [];

  constructor(editorStore: EditorStore, sdlcState: EditorSdlcState) {
    makeAutoObservable(this, {
      editorStore: false,
      sdlcState: false,
    });

    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
  }

  *fetchAllWorkspaceBuilds(): GeneratorFn<void> {
    try {
      this.isFetchingBuilds = true;
      // NOTE: this network call can take a while, so we might consider limiting the number of builds to 10 or so
      this.builds = (
        (yield this.editorStore.sdlcServerClient.getBuilds(
          this.sdlcState.currentProjectId,
          this.sdlcState.currentWorkspaceId,
          undefined,
          undefined,
          undefined,
        )) as PlainObject<Build>[]
      ).map((build) => Build.serialization.fromJson(build));
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isFetchingBuilds = false;
    }
  }
}
