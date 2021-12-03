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

import { AbstractPlugin } from '@finos/legend-shared';
import type { PlainObject } from '@finos/legend-shared';
import type { PackageableElement } from '../../metamodels/pure/packageableElements/PackageableElement';
import type { V1_PackageableElement } from './v1/model/packageableElements/V1_PackageableElement';
import type { V1_ElementBuilder } from './v1/transformation/pureGraph/to/V1_ElementBuilder';
import type { V1_PureModelContextData } from './v1/model/context/V1_PureModelContextData';
import type { PureModel } from '../../../graph/PureModel';
import type { Mapping } from '../../metamodels/pure/packageableElements/mapping/Mapping';
import type { Runtime } from '../../metamodels/pure/packageableElements/runtime/Runtime';
import type { V1_GraphTransformerContext } from './v1/transformation/pureGraph/from/V1_GraphTransformerContext';
import type { V1_ValueSpecification } from './v1/model/valueSpecification/V1_ValueSpecification';
import type { V1_GraphBuilderContext } from './v1/transformation/pureGraph/to/V1_GraphBuilderContext';
import type { V1_ProcessingContext } from './v1/transformation/pureGraph/to/helpers/V1_ProcessingContext';
import type { SimpleFunctionExpression } from '../../metamodels/pure/valueSpecification/SimpleFunctionExpression';
import type { ValueSpecification } from '../../metamodels/pure/valueSpecification/ValueSpecification';
import type { GraphPluginManager } from '../../../GraphPluginManager';

export type V1_ElementProtocolClassifierPathGetter = (
  protocol: V1_PackageableElement,
) => string | undefined;

export type V1_ElementTransformer = (
  metamodel: PackageableElement,
  context: V1_GraphTransformerContext,
) => V1_PackageableElement | undefined;

export type V1_ElementProtocolSerializer = (
  protocol: V1_PackageableElement,
  plugins: PureProtocolProcessorPlugin[],
) => PlainObject<V1_PackageableElement> | undefined;

export type V1_ElementProtocolDeserializer = (
  protocol: PlainObject<V1_PackageableElement>,
  plugins: PureProtocolProcessorPlugin[],
) => V1_PackageableElement | undefined;

export type V1_FunctionExpressionBuilder = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
) => [SimpleFunctionExpression, ValueSpecification[]] | undefined;

export type V1_ExecutionInputGetter = (
  graph: PureModel,
  mapping: Mapping,
  runtime: Runtime,
  protocolGraph: V1_PureModelContextData,
) => V1_PackageableElement[];

/**
 * Plugins for protocol processors. Technically, this is a sub-part of `PureGraphManagerPlugin`
 * but due to the way we encapsulate the protocol code and the way we organize graph managers,
 * we want to keep `PureGraphManagerPlugin` to operate at metamodel level where as this allows
 * extension mechanism on the protocol models.
 *
 * When we introduce another version of protocol models, e.g. v2_0_0, we would just add another set
 * of plugin methods here without having to modify the abstract layer of graph manager.
 */
export abstract class PureProtocolProcessorPlugin extends AbstractPlugin {
  private readonly _$nominalTypeBrand!: 'PureProtocolProcessorPlugin';

  install(pluginManager: GraphPluginManager): void {
    pluginManager.registerPureProtocolProcessorPlugin(this);
  }

  /**
   * Get the list of supported system element models.
   *
   * NOTE: since this set of element is meant to be kept small at the moment,
   * we can store them as part of the codebase; however, when this set grows,
   * we should consider having a backend exposed an end point to collect these models.
   */
  V1_getExtraSystemModels?(): PlainObject<V1_PureModelContextData>[];

  /**
   * Get the list of builders for a packageable element: i.e. protocol model -> metamodel.
   */
  V1_getExtraElementBuilders?(): V1_ElementBuilder<V1_PackageableElement>[];

  /**
   * Get the list of methods to derive the classifier path of a packageable element.
   */
  V1_getExtraElementClassifierPathGetters?(): V1_ElementProtocolClassifierPathGetter[];

  /**
   * Get the list of serializers for a packageable element: i.e. protocol model -> JSON.
   */
  V1_getExtraElementProtocolSerializers?(): V1_ElementProtocolSerializer[];

  /**
   * Get the list of de-serializers for a packageable element: i.e. JSON -> protocol model.
   */
  V1_getExtraElementProtocolDeserializers?(): V1_ElementProtocolDeserializer[];

  /**
   * Get the list of transformers for a packageable element: i.e. metamodel -> protocol model.
   */
  V1_getExtraElementTransformers?(): V1_ElementTransformer[];

  /**
   * Get the list of fields in element JSON which hold source information
   * (a product of the grammar parsing process).
   */
  V1_getExtraSourceInformationKeys?(): string[];

  /**
   * Get the list of builders for function expression.
   *
   * NOTE: this process is complicated, as it involes advanced procedures like type inferencing,
   * function matching, handling generics, etc. so our graph manager never intends to even try to
   * do this. However, occassionally, when there is needs to understand some particular lambda
   * (such as while building a query), we would need this method.
   */
  V1_getExtraFunctionExpressionBuilders?(): V1_FunctionExpressionBuilder[];

  /**
   * Get the list of collectors of graph elements to build execution input.
   *
   * In particular, such collector is used to specify any additional packageable elements
   * added to the graph that is used when executing a query against the engine server.
   * We prune the graph to avoid sending the server additional elements not needed for execution.
   * This would provide a mechanism to add more elements in this reduced graph.
   */
  V1_getExtraExecutionInputGetters?(): V1_ExecutionInputGetter[];
}
