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

import type { DataCubeQuerySnapshot } from './DataCubeQuerySnapshot.js';
import type { DataCubeQuerySnapshotManager } from './DataCubeQuerySnapshotManager.js';

export abstract class DataCubeQuerySnapshotSubscriber {
  readonly manager: DataCubeQuerySnapshotManager;
  private latestSnapshot: DataCubeQuerySnapshot | undefined;

  constructor(snapshotManager: DataCubeQuerySnapshotManager) {
    this.manager = snapshotManager;
  }

  abstract applySnapshot(snapshot: DataCubeQuerySnapshot): Promise<void>;

  async receiveSnapshot(snapshot: DataCubeQuerySnapshot): Promise<void> {
    this.latestSnapshot = snapshot;
    await this.applySnapshot(snapshot);
  }

  publishSnapshot(snapshot: DataCubeQuerySnapshot): void {
    this.latestSnapshot = snapshot;
    this.manager.broadcastSnapshot(snapshot);
  }

  getLatestSnapshot(): DataCubeQuerySnapshot | undefined {
    return this.latestSnapshot;
  }
}
