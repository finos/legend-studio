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
} from '@finos/legend-shared';
import { DataCubeSettingKey } from '../../__lib__/DataCubeSetting.js';
import type { DataCubeEngine } from '../core/DataCubeEngine.js';
import type { DataCubeSettingService } from './DataCubeSettingService.js';
import type { DataCubeLogService } from './DataCubeLogService.js';
import { action, computed, makeObservable, observable } from 'mobx';

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

const MINIMUM_HISTORY_SIZE = 10;

export class DataCubeSnapshotService {
  private readonly _logService: DataCubeLogService;
  private readonly _settingService: DataCubeSettingService;

  private readonly _subscribers: DataCubeSnapshotSubscriber[] = [];

  private _snapshots: DataCubeSnapshot[] = []; // stack
  private _pointer = -1;
  private _historySize;

  constructor(
    logService: DataCubeLogService,
    settingService: DataCubeSettingService,
  ) {
    makeObservable<DataCubeSnapshotService, '_snapshots' | '_pointer'>(this, {
      _snapshots: observable.struct,
      _pointer: observable,
      canUndo: computed,
      canRedo: computed,
      undo: action,
      redo: action,
      adjustHistorySize: action,
      broadcastSnapshot: action,
    });
    this._logService = logService;
    this._settingService = settingService;

    this._historySize = Math.max(
      this._settingService.getNumericValue(
        DataCubeSettingKey.EDITOR__MAX_HISTORY_STACK_SIZE,
      ),
      MINIMUM_HISTORY_SIZE,
    );
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

  private propagateSnapshot(snapshot: DataCubeSnapshot): void {
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

  getCurrentSnapshot() {
    return at(this._snapshots, this._pointer);
  }

  getHistory(options?: { full?: boolean }) {
    return options?.full
      ? [...this._snapshots]
      : this._snapshots.slice(0, this._pointer + 1);
  }

  get canUndo() {
    return this._pointer > 0;
  }

  get canRedo() {
    return this._pointer < this._snapshots.length - 1;
  }

  undo() {
    // Always leave one snapshot in the stack
    this._pointer = Math.max(this._pointer - 1, 0);
    this.propagateSnapshot(this.getCurrentSnapshot());
  }

  redo() {
    this._pointer = Math.min(this._pointer + 1, this._snapshots.length - 1);
    this.propagateSnapshot(this.getCurrentSnapshot());
  }

  adjustHistorySize(size: number): void {
    let newSize = size;
    if (size <= MINIMUM_HISTORY_SIZE) {
      this._logService.logIllegalStateError(
        `Can't adjust history size to ${size}: value must be greator than ${MINIMUM_HISTORY_SIZE}`,
      );
      newSize = Math.max(size, MINIMUM_HISTORY_SIZE);
    }
    const snapshots = this.getHistory();
    if (snapshots.length > newSize) {
      this._snapshots = snapshots.slice(-newSize);
      this._pointer = Math.min(
        Math.max(this._pointer - (snapshots.length - newSize), 0),
        snapshots.length - 1,
      );
    } else {
      this._snapshots = snapshots;
      this._pointer = snapshots.length - 1;
    }
    this._historySize = newSize;
  }

  broadcastSnapshot(snapshot: DataCubeSnapshot) {
    if (!snapshot.isFinalized()) {
      this._logService.logIllegalStateError(
        `Snapshot must be finalized before broadcasting`,
      );
      return;
    }

    this._snapshots = [
      ...this._snapshots.slice(0, this._pointer + 1),
      snapshot,
    ];
    this._pointer += 1;
    // always adjust to history size after adding a new snapshot
    this.adjustHistorySize(this._historySize);

    this.propagateSnapshot(snapshot);
  }
}
