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

import { APPLICATION_EVENT } from '@finos/legend-application';
import type { DataCubeState } from '../DataCubeState.js';
import type { DataCubeQuerySnapshot } from './DataCubeQuerySnapshot.js';
import type { DataCubeQuerySnapshotSubscriber } from './DataCubeQuerySnapshotSubscriber.js';
import {
  LogEvent,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';

// TODO: use this when we implement undo/redo
// const DATA_CUBE_MAX_SNAPSHOT_COUNT = 100;

export class DataCubeQuerySnapshotManager {
  private readonly dataCubeState: DataCubeState;
  private readonly subscribers: DataCubeQuerySnapshotSubscriber[] = [];
  private readonly snapshots: DataCubeQuerySnapshot[] = [];

  constructor(dataCubeState: DataCubeState) {
    this.dataCubeState = dataCubeState;
  }

  get currentSnapshot(): DataCubeQuerySnapshot {
    return guaranteeNonNullable(this.snapshots[this.snapshots.length - 1]);
  }

  registerSubscriber(subscriber: DataCubeQuerySnapshotSubscriber): void {
    this.subscribers.push(subscriber);
  }

  broadcastSnapshot(snapshot: DataCubeQuerySnapshot): void {
    this.snapshots.push(snapshot);
    this.subscribers.forEach((subscriber) => {
      const currentSnapshot = subscriber.getLatestSnapshot();
      if (currentSnapshot?.uuid !== snapshot.uuid) {
        subscriber.receiveSnapshot(snapshot).catch((error: unknown) => {
          assertErrorThrown(error);
          this.dataCubeState.applicationStore.logService.error(
            LogEvent.create(
              APPLICATION_EVENT.ILLEGAL_APPLICATION_STATE_OCCURRED,
            ),
            `Error ocurred when subscribers receive and apply new snapshot should be handled gracefully`,
            error,
          );
        });
      }
    });
  }

  // TODO: replace snapshot (for minor modifications such as adjusting the cast columns)
}
