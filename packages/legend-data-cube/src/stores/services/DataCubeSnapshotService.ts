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

import type { DataCubeSnapshot } from '../core/DataCubeSnapshot.js';
import {
  IllegalStateError,
  assertErrorThrown,
  at,
  deepDiff,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { DataCubeSpecification } from '../core/model/DataCubeSpecification.js';
import { DataCubeSettingKey } from '../../__lib__/DataCubeSetting.js';
import type { DataCubeEngine } from '../core/DataCubeEngine.js';
import type { DataCubeSettingService } from './DataCubeSettingService.js';
import type { DataCubeLogService } from './DataCubeLogService.js';

// TODO: set a stack depth when we implement undo/redo
// const DATA_CUBE_MAX_SNAPSHOT_COUNT = 100;

interface DataCubeSnapshotSubscriber {
  getSnapshotSubscriberName(): string;
  getLatestSnapshot(): DataCubeSnapshot | undefined;
  receiveSnapshot(snapshot: DataCubeSnapshot): Promise<void>;
}

export abstract class DataCubeSnapshotController
  implements DataCubeSnapshotSubscriber
{
  protected readonly _engine: DataCubeEngine;
  protected readonly _settingService: DataCubeSettingService;
  protected readonly _snapshotService: DataCubeSnapshotService;

  private _latestSnapshot: DataCubeSnapshot | undefined;

  constructor(
    engine: DataCubeEngine,
    settingService: DataCubeSettingService,
    snapshotService: DataCubeSnapshotService,
  ) {
    this._engine = engine;
    this._settingService = settingService;
    this._snapshotService = snapshotService;
  }

  abstract getSnapshotSubscriberName(): string;

  getLatestSnapshot() {
    return this._latestSnapshot;
  }

  async receiveSnapshot(snapshot: DataCubeSnapshot) {
    const previousSnapshot = this._latestSnapshot;
    this._latestSnapshot = snapshot;

    // NOTE: fully clone the snapshot before applying it to avoid any potential
    // mutation of the snapshot by the subscriber
    await this.applySnapshot(snapshot.INTERNAL__fullClone(), previousSnapshot);
  }

  abstract applySnapshot(
    snapshot: DataCubeSnapshot,
    previousSnapshot: DataCubeSnapshot | undefined,
  ): Promise<void>;

  publishSnapshot(snapshot: DataCubeSnapshot) {
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
        ['Snapshot', snapshot.serialize()],
        ['Previous Snapshot', previousSnapshot?.serialize()],
        ['Diff', deepDiff(previousSnapshot ?? {}, snapshot)],
      );
    }

    this._snapshotService.broadcastSnapshot(snapshot);
  }
}

export class DataCubeSnapshotService {
  private readonly _engine: DataCubeEngine;
  private readonly _logService: DataCubeLogService;

  private readonly _subscribers: DataCubeSnapshotSubscriber[] = [];
  private readonly _snapshots: DataCubeSnapshot[] = []; // stack
  private _initialSnapshot: DataCubeSnapshot | undefined;
  private _initialSpecification: DataCubeSpecification | undefined;

  constructor(engine: DataCubeEngine, logService: DataCubeLogService) {
    this._engine = engine;
    this._logService = logService;
  }

  get currentSnapshot() {
    return at(this._snapshots, this._snapshots.length - 1);
  }

  registerSubscriber(subscriber: DataCubeSnapshotSubscriber) {
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

  initialize(snapshot: DataCubeSnapshot, specification: DataCubeSpecification) {
    if (this._initialSnapshot || this._initialSpecification) {
      throw new IllegalStateError(
        `Snapshot manager has already been initialized`,
      );
    }
    this._initialSnapshot = snapshot;
    this._initialSpecification = specification;
  }

  get initialSnapshot() {
    return guaranteeNonNullable(
      this._initialSnapshot,
      `Snapshot manager has not been initialized`,
    );
  }

  get initialQuery() {
    return guaranteeNonNullable(
      this._initialSpecification,
      `Snapshot manager has not been initialized`,
    );
  }

  broadcastSnapshot(snapshot: DataCubeSnapshot) {
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
