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
import { type DataCubeSnapshot } from '../../core/DataCubeSnapshot.js';
import type { DataCubeQueryEditorPanelState } from './DataCubeEditorPanelState.js';
import type { DataCubeEditorState } from './DataCubeEditorState.js';
import { DataCubeEditorMutableConfiguration } from './DataCubeEditorMutableConfiguration.js';
import type { DataCubeConfiguration } from '../../core/model/DataCubeConfiguration.js';

export class DataCubeEditorGeneralPropertiesPanelState
  implements DataCubeQueryEditorPanelState
{
  limit: number | undefined = undefined;
  configuration = new DataCubeEditorMutableConfiguration();

  constructor(editor: DataCubeEditorState) {
    makeObservable(this, {
      configuration: observable,

      limit: observable,
      setLimit: action,

      applySnaphot: action,
    });
  }

  setLimit(val: number | undefined): void {
    this.limit = val;
  }

  applySnaphot(
    snapshot: DataCubeSnapshot,
    configuration: DataCubeConfiguration,
  ) {
    this.setLimit(
      snapshot.data.limit !== undefined && snapshot.data.limit >= 0
        ? snapshot.data.limit
        : undefined,
    );
    this.configuration = DataCubeEditorMutableConfiguration.create(
      snapshot.data.configuration,
    );
  }

  buildSnapshot(newSnapshot: DataCubeSnapshot, baseSnapshot: DataCubeSnapshot) {
    const data = newSnapshot.data;
    data.limit =
      this.limit === undefined || this.limit < 0 ? undefined : this.limit;
    data.configuration = this.configuration.serialize();
  }
}
