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

import { action, makeObservable, observable } from 'mobx';
import type { DataCubeState } from '../DataCubeState.js';
import { DataCubeQuerySnapshotSubscriber } from './DataCubeQuerySnapshotSubscriber.js';
import type { DataCubeQuerySnapshot } from './DataCubeQuerySnapshot.js';
import type { DataCubeQuery } from '../../../server/DataCubeQuery.js';
import { formatDate } from '@finos/legend-shared';
import { DEFAULT_REPORT_NAME } from './DataCubeQueryEngine.js';

export class DataCubeCoreState extends DataCubeQuerySnapshotSubscriber {
  baseQuery!: DataCubeQuery;
  name = DEFAULT_REPORT_NAME;
  private startTime?: number | undefined;

  constructor(dataCube: DataCubeState) {
    super(dataCube);

    makeObservable(this, {
      name: observable,
      setName: action,
    });
  }

  setName(val: string): void {
    this.name = val;
  }

  override async applySnapshot(
    snapshot: DataCubeQuerySnapshot,
    previousSnapshot: DataCubeQuerySnapshot | undefined,
  ): Promise<void> {
    const data = snapshot.data;
    this.setName(data.name);
    if (!this.startTime) {
      this.startTime = snapshot.timestamp;
    }
    this.application.layoutService.setWindowTitle(
      `\u229E ${data.name}${this.startTime ? ` - ${formatDate(new Date(this.startTime), 'HH:mm:ss EEE MMM dd yyyy')}` : ''}`,
    );
  }

  override async initialize(): Promise<void> {
    // do nothing
  }
}
