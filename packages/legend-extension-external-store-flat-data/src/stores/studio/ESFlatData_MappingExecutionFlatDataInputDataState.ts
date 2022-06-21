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
  type Mapping,
  PackageableElementExplicitReference,
  type InputData,
  type EngineRuntime,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  createUrlStringFromData,
  ContentType,
} from '@finos/legend-shared';
import {
  type EditorStore,
  MappingExecutionInputDataState,
  createRuntimeForExecution,
} from '@finos/legend-application-studio';
import { makeObservable, computed } from 'mobx';
import { FlatDataConnection } from '../../models/metamodels/pure/model/store/flatData/connection/ESFlatData_FlatDataConnection.js';
import { FlatDataInputData } from '../../models/metamodels/pure/model/store/flatData/mapping/ESFlatData_FlatDataInputData.js';
import type { RootFlatDataRecordType } from '../../models/metamodels/pure/model/store/flatData/model/ESFlatData_FlatDataDataType.js';

export class MappingExecutionFlatDataInputDataState extends MappingExecutionInputDataState {
  declare inputData: FlatDataInputData;

  constructor(
    editorStore: EditorStore,
    mapping: Mapping,
    rootFlatDataRecordType: RootFlatDataRecordType,
  ) {
    super(
      editorStore,
      mapping,
      new FlatDataInputData(
        PackageableElementExplicitReference.create(
          guaranteeNonNullable(rootFlatDataRecordType._OWNER._OWNER),
        ),
        '',
      ),
    );

    makeObservable(this, {
      isValid: computed,
    });
  }

  get isValid(): boolean {
    return true;
  }

  get runtime(): EngineRuntime {
    const engineConfig =
      this.editorStore.graphManagerState.graphManager.TEMPORARY__getEngineConfig();
    return createRuntimeForExecution(
      this.mapping,
      new FlatDataConnection(
        PackageableElementExplicitReference.create(
          guaranteeNonNullable(this.inputData.sourceFlatData.value),
        ),
        createUrlStringFromData(
          this.inputData.data,
          ContentType.TEXT_PLAIN,
          engineConfig.useBase64ForAdhocConnectionDataUrls,
        ),
      ),
      this.editorStore,
    );
  }

  buildInputDataForTest(): InputData {
    return new FlatDataInputData(
      PackageableElementExplicitReference.create(
        guaranteeNonNullable(this.inputData.sourceFlatData.value),
      ),
      this.inputData.data,
    );
  }
}
