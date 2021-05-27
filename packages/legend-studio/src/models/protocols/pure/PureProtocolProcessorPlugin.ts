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

import { AbstractPlugin } from '@finos/legend-studio-shared';
import type { PlainObject } from '@finos/legend-studio-shared';
import type { PackageableElement } from '../../metamodels/pure/model/packageableElements/PackageableElement';
import type { V1_PackageableElement } from './v1/model/packageableElements/V1_PackageableElement';
import type { V1_ElementBuilder } from './v1/transformation/pureGraph/to/V1_ElementBuilder';
import type { V1_PureModelContextData } from './v1/model/context/V1_PureModelContextData';
import type { PureModel } from '../../metamodels/pure/graph/PureModel';
import type { Mapping } from '../../metamodels/pure/model/packageableElements/mapping/Mapping';
import type { Runtime } from '../../metamodels/pure/model/packageableElements/runtime/Runtime';

export type V1_ElementProtocolClassifierPathGetter = (
  protocol: V1_PackageableElement,
) => string | undefined;

export type V1_ElementProtocolSerializer = (
  protocol: V1_PackageableElement,
) => PlainObject<V1_PackageableElement> | undefined;

export type V1_ElementProtocolDeserializer = (
  protocol: PlainObject<V1_PackageableElement>,
) => V1_PackageableElement | undefined;

export type V1_ElementTransformer = (
  metamodel: PackageableElement,
) => V1_PackageableElement | undefined;

export type V1_ExecutionInputGetter = (
  graph: PureModel,
  mapping: Mapping,
  runtime: Runtime,
  protocolGraph: V1_PureModelContextData,
) => V1_PackageableElement[];

export abstract class PureProtocolProcessorPlugin extends AbstractPlugin {
  private readonly _$nominalTypeBrand!: 'PureProtocolProcessorPlugin';

  V1_getExtraSystemModels?(): PlainObject<V1_PureModelContextData>[];

  V1_getExtraElementBuilders?(): V1_ElementBuilder<V1_PackageableElement>[];

  V1_getExtraElementClassifierPathGetters?(): V1_ElementProtocolClassifierPathGetter[];

  V1_getExtraElementProtocolSerializers?(): V1_ElementProtocolSerializer[];

  V1_getExtraElementProtocolDeserializers?(): V1_ElementProtocolDeserializer[];

  V1_getExtraElementTransformers?(): V1_ElementTransformer[];

  V1_getExtraSourceInformationKeys?(): string[];

  /**
   * Used to specify any additional packageable elements added to the graph that is
   * used when executing a query against the engine server. We prune the graph to avoid
   * sending the server additional elements not needed for execution. This would provide a mechanism
   * to add more elements in this reduced graph.
   */
  V1_getExtraExecutionInputGetters?(): V1_ExecutionInputGetter[];
}
