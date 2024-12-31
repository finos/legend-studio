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

import type { DataCubeViewState } from './DataCubeViewState.js';
import type { DataCubeQuerySnapshot } from '../core/DataCubeQuerySnapshot.js';
import {
  IllegalStateError,
  assertErrorThrown,
  deepDiff,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { DataCubeQuery } from '../core/models/DataCubeQuery.js';
import { DataCubeSettingKey } from '../core/DataCubeSetting.js';

// TODO: set a stack depth when we implement undo/redo
// const DATA_CUBE_MAX_SNAPSHOT_COUNT = 100;

interface DataCubeQuerySnapshotSubscriber {
  getSnapshotSubscriberName(): string;
  getLatestSnapshot(): DataCubeQuerySnapshot | undefined;
  receiveSnapshot(snapshot: DataCubeQuerySnapshot): Promise<void>;
}

export abstract class DataCubeQuerySnapshotController
  implements DataCubeQuerySnapshotSubscriber
{
  readonly view!: DataCubeViewState;

  private latestSnapshot: DataCubeQuerySnapshot | undefined;

  constructor(view: DataCubeViewState) {
    this.view = view;
  }

  abstract getSnapshotSubscriberName(): string;

  abstract applySnapshot(
    snapshot: DataCubeQuerySnapshot,
    previousSnapshot: DataCubeQuerySnapshot | undefined,
  ): Promise<void>;

  async receiveSnapshot(snapshot: DataCubeQuerySnapshot) {
    const previousSnapshot = this.latestSnapshot;
    this.latestSnapshot = snapshot;

    // NOTE: fully clone the snapshot before applying it to avoid any potential
    // mutation of the snapshot by the subscriber
    await this.applySnapshot(snapshot.INTERNAL__fullClone(), previousSnapshot);
  }

  publishSnapshot(snapshot: DataCubeQuerySnapshot) {
    const previousSnapshot = this.latestSnapshot;
    this.latestSnapshot = snapshot;

    if (
      this.view.dataCube.settings.getBooleanValue(
        DataCubeSettingKey.DEBUGGER__ENABLE_DEBUG_MODE,
      )
    ) {
      this.view.engine.debugProcess(
        `New Snapshot`,
        ['Publisher', this.getSnapshotSubscriberName()],
        ['Snapshot', snapshot],
        ['Previous Snapshot', previousSnapshot],
        ['Diff', deepDiff(previousSnapshot ?? {}, snapshot)],
      );
    }

    this.view.snapshotManager.broadcastSnapshot(snapshot);
  }

  getLatestSnapshot() {
    return this.latestSnapshot;
  }
}

export class DataCubeQuerySnapshotManager {
  private readonly view: DataCubeViewState;
  private readonly subscribers: DataCubeQuerySnapshotSubscriber[] = [];
  private readonly snapshots: DataCubeQuerySnapshot[] = [];

  private _initialSnapshot: DataCubeQuerySnapshot | undefined;
  private _initialQuery: DataCubeQuery | undefined;

  constructor(view: DataCubeViewState) {
    this.view = view;
  }

  get currentSnapshot() {
    return guaranteeNonNullable(this.snapshots[this.snapshots.length - 1]);
  }

  registerSubscriber(subscriber: DataCubeQuerySnapshotSubscriber) {
    const existingSubscriber = this.subscribers.find(
      (sub) =>
        sub.getSnapshotSubscriberName() ===
        subscriber.getSnapshotSubscriberName(),
    );
    if (existingSubscriber) {
      // eslint-disable-next-line no-process-env
      if (process.env.NODE_ENV === 'development') {
        this.view.engine.logDebug(
          `Subscriber with name '${subscriber.getSnapshotSubscriberName()}' already exists`,
        );
      } else {
        throw new IllegalStateError(
          `Subscriber with name '${subscriber.getSnapshotSubscriberName()}' already exists`,
        );
      }
    }
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
      this.view.engine.logIllegalStateError(
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
          this.view.engine.logIllegalStateError(
            `Error occured while subscribers receiving and applying new snapshot should be handled gracefully`,
            error,
          );
        });
      }
    });
  }

  // TODO: replace snapshot (for minor modifications such as adjusting the cast columns)
}
