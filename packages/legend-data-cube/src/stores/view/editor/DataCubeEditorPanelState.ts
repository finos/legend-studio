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

import type { DataCubeConfiguration } from '../../core/model/DataCubeConfiguration.js';
import type { DataCubeSnapshot } from '../../core/DataCubeSnapshot.js';

export interface DataCubeQueryEditorPanelState {
  /**
   * Update the editor state based on the snapshot
   */
  applySnaphot(
    snapshot: DataCubeSnapshot,
    configuration: DataCubeConfiguration,
  ): void;

  /**
   * Build and enrich the snapshot with data from the editor state
   * @returns whether the snapshot should be updated or not
   */
  buildSnapshot(
    newSnapshot: DataCubeSnapshot,
    baseSnapshot: DataCubeSnapshot,
  ): void;
}
