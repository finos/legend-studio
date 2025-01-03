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

import type { DataCubeQuerySnapshot } from '../core/DataCubeQuerySnapshot.js';
import {
  IllegalStateError,
  assertErrorThrown,
  deepDiff,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { DataCubeQuery } from '../core/model/DataCubeQuery.js';
import { DataCubeSettingKey } from '../../__lib__/DataCubeSetting.js';
import type { DataCubeEngine } from '../core/DataCubeEngine.js';
import type { DataCubeSettingService } from './DataCubeSettingService.js';
import type { DataCubeLogService } from './DataCubeLogService.js';

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
  protected readonly _engine: DataCubeEngine;
  protected readonly _settingService: DataCubeSettingService;
  protected readonly _snapshotService: DataCubeQuerySnapshotService;

  private _latestSnapshot: DataCubeQuerySnapshot | undefined;

  constructor(
    engine: DataCubeEngine,
    settingService: DataCubeSettingService,
    snapshotService: DataCubeQuerySnapshotService,
  ) {
    this._engine = engine;
    this._settingService = settingService;
    this._snapshotService = snapshotService;
  }

  abstract getSnapshotSubscriberName(): string;

  getLatestSnapshot() {
    return this._latestSnapshot;
  }

  async receiveSnapshot(snapshot: DataCubeQuerySnapshot) {
    const previousSnapshot = this._latestSnapshot;
    this._latestSnapshot = snapshot;

    // NOTE: fully clone the snapshot before applying it to avoid any potential
    // mutation of the snapshot by the subscriber
    await this.applySnapshot(snapshot.INTERNAL__fullClone(), previousSnapshot);
  }

  abstract applySnapshot(
    snapshot: DataCubeQuerySnapshot,
    previousSnapshot: DataCubeQuerySnapshot | undefined,
  ): Promise<void>;

  publishSnapshot(snapshot: DataCubeQuerySnapshot) {
    const previousSnapshot = this._latestSnapshot;
    this._latestSnapshot = snapshot;

    if (
      this._settingService.getBooleanValue(
        DataCubeSettingKey.DEBUGGER__ENABLE_DEBUG_MODE,
      )
    ) {
      this._engine.debugProcess(
        `New Snapshot`,
        ['Publisher', this.getSnapshotSubscriberName()],
        ['Snapshot', snapshot],
        ['Previous Snapshot', previousSnapshot],
        ['Diff', deepDiff(previousSnapshot ?? {}, snapshot)],
      );
    }

    this._snapshotService.broadcastSnapshot(snapshot);
  }
}

export class DataCubeQuerySnapshotService {
  private readonly _engine: DataCubeEngine;
  private readonly _logService: DataCubeLogService;

  private readonly _subscribers: DataCubeQuerySnapshotSubscriber[] = [];
  private readonly _snapshots: DataCubeQuerySnapshot[] = []; // stack
  private _initialSnapshot: DataCubeQuerySnapshot | undefined;
  private _initialQuery: DataCubeQuery | undefined;

  constructor(engine: DataCubeEngine, logService: DataCubeLogService) {
    this._engine = engine;
    this._logService = logService;
  }

  get currentSnapshot() {
    return guaranteeNonNullable(this._snapshots[this._snapshots.length - 1]);
  }

  registerSubscriber(subscriber: DataCubeQuerySnapshotSubscriber) {
    const existingSubscriber = this._subscribers.find(
      (sub) =>
        sub.getSnapshotSubscriberName() ===
        subscriber.getSnapshotSubscriberName(),
    );
    if (existingSubscriber) {
      // eslint-disable-next-line no-process-env
      if (process.env.NODE_ENV === 'development') {
        this._logService.logDebug(
          `Subscriber with name '${subscriber.getSnapshotSubscriberName()}' already exists`,
        );
      } else {
        throw new IllegalStateError(
          `Subscriber with name '${subscriber.getSnapshotSubscriberName()}' already exists`,
        );
      }
    }
    this._subscribers.push(subscriber);
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
      this._logService.logIllegalStateError(
        `Snapshot must be finalized before broadcasting`,
      );
      return;
    }
    this._snapshots.push(snapshot);
    this._subscribers.forEach((subscriber) => {
      const currentSnapshot = subscriber.getLatestSnapshot();
      if (currentSnapshot?.uuid !== snapshot.uuid) {
        subscriber.receiveSnapshot(snapshot).catch((error: unknown) => {
          assertErrorThrown(error);
          this._logService.logIllegalStateError(
            `Error occured while subscribers receiving and applying new snapshot should be handled gracefully`,
            error,
          );
        });
      }
    });
  }
}
