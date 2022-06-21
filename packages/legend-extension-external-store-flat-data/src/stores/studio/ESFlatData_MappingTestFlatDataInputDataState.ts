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

import {
  type Runtime,
  EngineRuntime,
  PackageableElementExplicitReference,
  IdentifiedConnection,
  generateIdentifiedConnectionId,
} from '@finos/legend-graph';
import { createUrlStringFromData, ContentType } from '@finos/legend-shared';
import {
  MappingTestInputDataState,
  runtime_addIdentifiedConnection,
  runtime_addMapping,
} from '@finos/legend-application-studio';
import { FlatDataConnection } from '../../models/metamodels/pure/model/store/flatData/connection/ESFlatData_FlatDataConnection.js';
import type { FlatDataInputData } from '../../models/metamodels/pure/model/store/flatData/mapping/ESFlatData_FlatDataInputData.js';

export class MappingTestFlatDataInputDataState extends MappingTestInputDataState {
  declare inputData: FlatDataInputData;

  get runtime(): Runtime {
    const engineConfig =
      this.editorStore.graphManagerState.graphManager.TEMPORARY__getEngineConfig();
    const runtime = new EngineRuntime();
    runtime_addMapping(
      runtime,
      PackageableElementExplicitReference.create(this.mapping),
    );
    const connection = new FlatDataConnection(
      PackageableElementExplicitReference.create(
        this.inputData.sourceFlatData.value,
      ),
      createUrlStringFromData(
        this.inputData.data,
        ContentType.TEXT_PLAIN,
        engineConfig.useBase64ForAdhocConnectionDataUrls,
      ),
    );
    runtime_addIdentifiedConnection(
      runtime,
      new IdentifiedConnection(
        generateIdentifiedConnectionId(runtime),
        connection,
      ),
      this.editorStore.changeDetectionState.observerContext,
    );
    return runtime;
  }
}
