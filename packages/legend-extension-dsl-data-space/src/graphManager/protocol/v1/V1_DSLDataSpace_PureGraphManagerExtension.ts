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
  EngineRuntime,
  GraphBuilderError,
  KeyedExecutionParameter,
  MappingInclude,
  PackageableElementExplicitReference,
  PureMultiExecution,
  PureSingleExecution,
  stub_Mapping,
  stub_RawLambda,
  V1_getIncludedMappingPath,
  V1_GraphBuilderContextBuilder,
  V1_Mapping,
  V1_MAPPING_ELEMENT_PROTOCOL_TYPE,
  V1_PACKAGEABLE_RUNTIME_ELEMENT_PROTOCOL_TYPE,
  V1_PureMultiExecution,
  V1_PureSingleExecution,
  V1_Service,
  V1_SERVICE_ELEMENT_PROTOCOL_TYPE,
  V1_PackageableRuntime,
  type V1_PackageableElement,
  type PureModel,
  V1_PureGraphManager,
  PureClientVersion,
  type AbstractPureGraphManager,
} from '@finos/legend-graph';
import type { Entity } from '@finos/legend-model-storage';
import {
  assertErrorThrown,
  filterByType,
  guaranteeNonEmptyString,
  guaranteeType,
  type PlainObject,
} from '@finos/legend-shared';
import { DSLDataSpace_PureGraphManagerExtension } from '../DSLDataSpace_PureGraphManagerExtension.js';

export class V1_DSLDataSpace_PureGraphManagerExtension extends DSLDataSpace_PureGraphManagerExtension {
  declare graphManager: V1_PureGraphManager;

  constructor(graphManager: AbstractPureGraphManager) {
    super(graphManager);
    this.graphManager = guaranteeType(graphManager, V1_PureGraphManager);
  }

  getSupportedProtocolVersion(): string {
    return PureClientVersion.V1_0_0;
  }

  punch(): void {
    this.graphManager.engine.getEngineServerClient();
  }
}

// if (config instanceof V1_MappingGenConfiguration) {
//   const configInput = new V1_MappingGenerateModelInput(config, model);
//   const engineServerClient = engine.getEngineServerClient();
//   const pmcd = V1_deserializePureModelContextData(
//     await engineServerClient.postWithTracing(
//       engineServerClient.getTraceData(
//         GENERATE_MAPPING_ENGINE_TRACER_SPAN,
//       ),
//       `${engineServerClient._pure()}/modelGeneration/mappingGeneration`,
//       V1_MappingGenerateModelInput.serialization.toJson(configInput),
//       {},
//       undefined,
//       undefined,
//       { enableCompression: true },
//     ),
//   );
//   return pmcd;
// }
// return undefined;
// },
