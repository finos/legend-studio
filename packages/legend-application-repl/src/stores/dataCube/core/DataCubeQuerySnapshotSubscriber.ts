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

import { deepDiff } from '@finos/legend-shared';
import type { LegendREPLApplicationStore } from '../../LegendREPLBaseStore.js';
import type { DataCubeState } from '../DataCubeState.js';
import type { DataCubeQuerySnapshot } from './DataCubeQuerySnapshot.js';

export abstract class DataCubeQuerySnapshotSubscriber {
  readonly dataCube!: DataCubeState;
  readonly application!: LegendREPLApplicationStore;

  private latestSnapshot: DataCubeQuerySnapshot | undefined;

  constructor(dataCube: DataCubeState) {
    this.dataCube = dataCube;
    this.application = dataCube.application;
  }

  abstract applySnapshot(
    snapshot: DataCubeQuerySnapshot,
    previousSnapshot: DataCubeQuerySnapshot | undefined,
  ): Promise<void>;
  abstract initialize(): Promise<void>;

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
