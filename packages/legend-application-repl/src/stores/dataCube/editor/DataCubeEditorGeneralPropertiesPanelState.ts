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
import type { DataCubeQuerySnapshot } from '../core/DataCubeQuerySnapshot.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';

export class DataCubeEditorGeneralPropertiesPanelState
  implements DataCubeQueryEditorPanelState
{
  readonly dataCube!: DataCubeState;
  name = '';
  limit = -1;

  constructor(dataCube: DataCubeState) {
    this.dataCube = dataCube;

    makeObservable(this, {
      name: observable,
      setName: action,

      limit: observable,
      setLimit: action,
    });
  }

  setName(val: string): void {
    this.name = val;
  }

  setLimit(val: number | undefined): void {
    this.limit = Math.round(val === undefined || val < 0 ? -1 : val);
  }

  applySnaphot(snapshot: DataCubeQuerySnapshot): void {
    this.setName(snapshot.data.name);
    this.setLimit(snapshot.data.limit);
  }

  buildSnapshot(
    newSnapshot: DataCubeQuerySnapshot,
    baseSnapshot: DataCubeQuerySnapshot,
  ): boolean {
    const data = baseSnapshot.data;
    // name
    if (this.name !== data.name) {
      data.name = this.name;
      return true;
    }

    // limit
    if (data.limit === undefined) {
      if (this.limit !== -1) {
        data.limit = this.limit;
        return true;
      }
    } else {
      if (this.limit !== data.limit) {
        data.limit = this.limit;
        return true;
      }
    }

    return false;
  }
}
