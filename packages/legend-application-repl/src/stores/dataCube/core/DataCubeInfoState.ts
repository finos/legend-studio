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
import type { DataCubeViewState } from '../DataCubeViewState.js';
import { DataCubeQuerySnapshotController } from './DataCubeQuerySnapshotManager.js';
import type { DataCubeQuerySnapshot } from './DataCubeQuerySnapshot.js';
import type { DataCubeQuery } from '../../../server/DataCubeQuery.js';
import { formatDate } from '@finos/legend-shared';
import { DEFAULT_REPORT_NAME } from './DataCubeQueryEngine.js';

/**
 * Unlike other query editor state, this state does not support making any
 * modification to the query, it simplies subscribe to extract information
 * from the latest snapshot to help display latest static info about the query.
 */
export class DataCubeInfoState extends DataCubeQuerySnapshotController {
  baseQuery!: DataCubeQuery;
  name = DEFAULT_REPORT_NAME;
  private editionStartTime?: number | undefined;

  constructor(view: DataCubeViewState) {
    super(view);

    makeObservable<DataCubeInfoState, 'setName'>(this, {
      name: observable,
      setName: action,
    });
  }

  private setName(val: string) {
    this.name = val;
  }

  override async applySnapshot(
    snapshot: DataCubeQuerySnapshot,
    previousSnapshot: DataCubeQuerySnapshot | undefined,
  ) {
    const data = snapshot.data;
    this.setName(data.name);
    if (!this.editionStartTime) {
      this.editionStartTime = snapshot.timestamp;
    }
    this.application.layoutService.setWindowTitle(
      `\u229E ${data.name}${this.editionStartTime ? ` - ${formatDate(new Date(this.editionStartTime), 'HH:mm:ss EEE MMM dd yyyy')}` : ''}`,
    );
  }
}
