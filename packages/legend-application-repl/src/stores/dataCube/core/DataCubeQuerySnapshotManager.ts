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
  APPLICATION_EVENT,
  type GenericLegendApplicationStore,
} from '@finos/legend-application';
import type { DataCubeState } from '../DataCubeState.js';
import type { DataCubeQuerySnapshot } from './DataCubeQuerySnapshot.js';
import {
  IllegalStateError,
  LogEvent,
  assertErrorThrown,
  deepDiff,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { DataCubeQuery } from '../../../server/DataCubeQuery.js';

// TODO: set a stack depth when we implement undo/redo
// const DATA_CUBE_MAX_SNAPSHOT_COUNT = 100;

interface DataCubeQuerySnapshotSubscriber {
  getLatestSnapshot(): DataCubeQuerySnapshot | undefined;
  receiveSnapshot(snapshot: DataCubeQuerySnapshot): Promise<void>;
}

export abstract class DataCubeQuerySnapshotController
  implements DataCubeQuerySnapshotSubscriber
{
  readonly dataCube!: DataCubeState;
  readonly application!: GenericLegendApplicationStore;

  private latestSnapshot: DataCubeQuerySnapshot | undefined;

  constructor(dataCube: DataCubeState) {
    this.dataCube = dataCube;
    this.application = dataCube.application;
  }

  abstract applySnapshot(
    snapshot: DataCubeQuerySnapshot,
    previousSnapshot: DataCubeQuerySnapshot | undefined,
  ): Promise<void>;

  async receiveSnapshot(snapshot: DataCubeQuerySnapshot) {
    const previousSnapshot = this.latestSnapshot;
    this.latestSnapshot = snapshot;
    await this.applySnapshot(snapshot, previousSnapshot);
  }

  publishSnapshot(snapshot: DataCubeQuerySnapshot) {
    if (this.dataCube.engine.enableDebugMode) {
      this.application.debugProcess(
        `New Snapshot`,
        '\nSnapshot',
        snapshot,
        '\nPrevious Snapshot',
        this.latestSnapshot ?? {},
        '\nDiff',
        deepDiff(snapshot, this.latestSnapshot ?? {}),
      );
    }
    this.latestSnapshot = snapshot;
    this.dataCube.snapshotManager.broadcastSnapshot(snapshot);
  }

  getLatestSnapshot() {
    return this.latestSnapshot;
  }
}

export class DataCubeQuerySnapshotManager {
  private readonly dataCube: DataCubeState;
  private readonly subscribers: DataCubeQuerySnapshotSubscriber[] = [];
  private readonly snapshots: DataCubeQuerySnapshot[] = [];

  private _initialSnapshot: DataCubeQuerySnapshot | undefined;
  private _initialQuery: DataCubeQuery | undefined;

  constructor(dataCube: DataCubeState) {
    this.dataCube = dataCube;
  }

  get currentSnapshot() {
    return guaranteeNonNullable(this.snapshots[this.snapshots.length - 1]);
  }

  registerSubscriber(subscriber: DataCubeQuerySnapshotSubscriber) {
    this.subscribers.push(subscriber);
  }

  initialize(
    initialSnapshot: DataCubeQuerySnapshot,
    initialQuery: DataCubeQuery,
  ) {
    if (this._initialSnapshot || this._initialQuery) {
      throw new IllegalStateError(
        `Snapshot manager has already been initialized`,
      );
    }
    this._initialSnapshot = initialSnapshot;
    this._initialQuery = initialQuery;
  }

  get initialSnapshot() {
    return guaranteeNonNullable(
      this._initialSnapshot,
      `Snapshot manager has not been initialized`,
    );
  }

  get initialQuery() {
    return guaranteeNonNullable(
      this._initialQuery,
      `Snapshot manager has not been initialized`,
    );
  }

  broadcastSnapshot(snapshot: DataCubeQuerySnapshot) {
    if (!snapshot.isFinalized()) {
      this.dataCube.application.logService.error(
        LogEvent.create(APPLICATION_EVENT.ILLEGAL_APPLICATION_STATE_OCCURRED),
        `Snapshot must be finalized before broadcasting`,
      );
      return;
    }
    this.snapshots.push(snapshot);
    this.subscribers.forEach((subscriber) => {
      const currentSnapshot = subscriber.getLatestSnapshot();
      if (currentSnapshot?.uuid !== snapshot.uuid) {
        subscriber.receiveSnapshot(snapshot).catch((error: unknown) => {
          assertErrorThrown(error);
          this.dataCube.application.logService.error(
            LogEvent.create(
              APPLICATION_EVENT.ILLEGAL_APPLICATION_STATE_OCCURRED,
            ),
            `Error occured while subscribers receiving and applying new snapshot should be handled gracefully`,
            error,
          );
        });
      }
    });
  }

  // TODO: replace snapshot (for minor modifications such as adjusting the cast columns)
}
