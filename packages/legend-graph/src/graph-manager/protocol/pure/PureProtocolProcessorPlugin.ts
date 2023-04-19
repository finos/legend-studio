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

import { AbstractPlugin, type PlainObject } from '@finos/legend-shared';
import type { PackageableElement } from '../../../graph/metamodel/pure/packageableElements/PackageableElement.js';
import type { V1_PackageableElement } from './v1/model/packageableElements/V1_PackageableElement.js';
import type { V1_ElementBuilder } from './v1/transformation/pureGraph/to/V1_ElementBuilder.js';
import type { V1_PureModelContextData } from './v1/model/context/V1_PureModelContextData.js';
import type { PureModel } from '../../../graph/PureModel.js';
import type { Mapping } from '../../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import type { Runtime } from '../../../graph/metamodel/pure/packageableElements/runtime/Runtime.js';
import type { V1_GraphTransformerContext } from './v1/transformation/pureGraph/from/V1_GraphTransformerContext.js';
import type { V1_ValueSpecification } from './v1/model/valueSpecification/V1_ValueSpecification.js';
import type { V1_GraphBuilderContext } from './v1/transformation/pureGraph/to/V1_GraphBuilderContext.js';
import type { V1_ProcessingContext } from './v1/transformation/pureGraph/to/helpers/V1_ProcessingContext.js';
import type { SimpleFunctionExpression } from '../../../graph/metamodel/pure/valueSpecification/Expression.js';
import type { ValueSpecification } from '../../../graph/metamodel/pure/valueSpecification/ValueSpecification.js';
import type { GraphManagerPluginManager } from '../../GraphManagerPluginManager.js';
import type { Type } from '../../../graph/metamodel/pure/packageableElements/domain/Type.js';
import type {
  V1_DatasetEntitlementReport,
  V1_DatasetSpecification,
} from './v1/engine/analytics/V1_StoreEntitlementAnalysis.js';
import type {
  DatasetEntitlementReport,
  DatasetSpecification,
} from '../../action/analytics/StoreEntitlementAnalysis.js';

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
) => SimpleFunctionExpression | undefined;

export type V1_ExecutionInputCollector = (
  graph: PureModel,
  mapping: Mapping | undefined,
  runtime: Runtime | undefined,
  protocolGraph: V1_PureModelContextData,
) => V1_PackageableElement[];

export type V1_MappingModelCoverageAnalysisInputCollector = (
  graph: PureModel,
  protocolGraph: V1_PureModelContextData,
) => V1_PackageableElement[];

export type V1_MappingModelRuntimeCompatibilityAnalysisInputCollector = (
  graph: PureModel,
  protocolGraph: V1_PureModelContextData,
) => V1_PackageableElement[];

export type V1_PropertyExpressionTypeInferrer = (
  variable: ValueSpecification | undefined,
) => Type | undefined;

export type V1_ClassInstanceValueBuilder = (
  protocol: unknown,
  type: string,
  context: V1_GraphBuilderContext,
) => unknown | undefined;

export type V1_ClassInstanceValueTransformer = (
  metamodel: unknown,
  context: V1_GraphTransformerContext,
) => unknown | undefined;

export type V1_ClassInstanceValueProtocolSerializer = (
  protocol: unknown,
  plugins: PureProtocolProcessorPlugin[],
) => PlainObject | undefined;

export type V1_ClassInstanceValueProtocolDeserializer = (
  json: PlainObject,
  type: string,
  plugins: PureProtocolProcessorPlugin[],
) => unknown | undefined;

export type V1_DatasetSpecificationSerializer = (
  protocol: V1_DatasetSpecification,
  plugins: PureProtocolProcessorPlugin[],
) => PlainObject<V1_DatasetSpecification> | undefined;

export type V1_DatasetSpecificationDeserializer = (
  json: PlainObject<V1_DatasetSpecification>,
  plugins: PureProtocolProcessorPlugin[],
) => V1_DatasetSpecification | undefined;

export type V1_DatasetEntitlementReportDeserializer = (
  json: PlainObject<V1_DatasetEntitlementReport>,
  plugins: PureProtocolProcessorPlugin[],
) => V1_DatasetEntitlementReport | undefined;

export type V1_DatasetSpecificationBuilder = (
  protocol: V1_DatasetSpecification,
  plugins: PureProtocolProcessorPlugin[],
) => DatasetSpecification | undefined;

export type V1_DatasetSpecificationTransformer = (
  metamodel: DatasetSpecification,
  plugins: PureProtocolProcessorPlugin[],
) => V1_DatasetSpecification | undefined;

export type V1_DatasetEntitlementReportBuilder = (
  protocol: V1_DatasetEntitlementReport,
  plugins: PureProtocolProcessorPlugin[],
) => DatasetEntitlementReport | undefined;

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
  /**
   * This helps to better type-check for this empty abtract type
   * See https://github.com/finos/legend-studio/blob/master/docs/technical/typescript-usage.md#understand-typescript-structual-type-system
   */
  private readonly _$nominalTypeBrand!: 'PureProtocolProcessorPlugin';

  install(pluginManager: GraphManagerPluginManager): void {
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
   * Get the list of methods to derive the classifier path of a packageable element.
   */
  V1_getExtraElementClassifierPathGetters?(): V1_ElementProtocolClassifierPathGetter[];

  /**
   * Get the list of builders for packageable element: i.e. protocol model -> metamodel.
   */
  V1_getExtraElementBuilders?(): V1_ElementBuilder<V1_PackageableElement>[];

  /**
   * Get the list of transformers for packageable element: i.e. metamodel -> protocol model.
   */
  V1_getExtraElementTransformers?(): V1_ElementTransformer[];

  /**
   * Get the list of serializers for packageable element: i.e. protocol model -> JSON.
   */
  V1_getExtraElementProtocolSerializers?(): V1_ElementProtocolSerializer[];

  /**
   * Get the list of de-serializers for packageable element: i.e. JSON -> protocol model.
   */
  V1_getExtraElementProtocolDeserializers?(): V1_ElementProtocolDeserializer[];

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
   * In particular, these collectors are used to produce the minimal graph that is needed for such execution.
   */
  V1_getExtraExecutionInputCollectors?(): V1_ExecutionInputCollector[];

  /**
   * Get the list of collectors of graph elements to build the input for mapping model-coverage analysis.
   *
   * In particular, these collectors are used to produce the minimal graph that is needed for such analysis.
   */
  V1_getExtraMappingModelCoverageAnalysisInputCollectors?(): V1_MappingModelCoverageAnalysisInputCollector[];

  /**
   * Get the list of type inferrers for property expression.
   */
  V1_getExtraPropertyExpressionTypeInferrers?(): V1_PropertyExpressionTypeInferrer[];

  /**
   * Get the list of builders for class instance value.
   */
  V1_getExtraClassInstanceValueBuilders?(): V1_ClassInstanceValueBuilder[];

  /**
   * Get the list of transformers for class instance value.
   */
  V1_getExtraClassInstanceValueTransformers?(): V1_ClassInstanceValueTransformer[];

  /**
   * Get the list of serializers for class instance value.
   */
  V1_getExtraClassInstanceValueProtocolDeserializers?(): V1_ClassInstanceValueProtocolDeserializer[];

  /**
   * Get the list of deserializers for class instance value.
   */
  V1_getExtraClassInstanceValueProtocolSerializers?(): V1_ClassInstanceValueProtocolSerializer[];

  /**
   * Get the list of serializers for dataset specification.
   */
  V1_getExtraDatasetSpecificationProtocolSerializers?(): V1_DatasetSpecificationSerializer[];

  /**
   * Get the list of serializers for dataset specification.
   */
  V1_getExtraDatasetSpecificationProtocolDeserializers?(): V1_DatasetSpecificationDeserializer[];

  /**
   * Get the list of serializers for dataset entitlement report.
   */
  V1_getExtraDatasetEntitlementReportProtocolDeserializers?(): V1_DatasetEntitlementReportDeserializer[];

  /**
   * Get the list of builders for dataset specification.
   */
  V1_getExtraDatasetSpecificationBuilders?(): V1_DatasetSpecificationBuilder[];

  /**
   * Get the list of transformers for dataset specification.
   */
  V1_getExtraDatasetSpecificationTransformers?(): V1_DatasetSpecificationTransformer[];

  /**
   * Get the list of builders for dataset entitlement report.
   */
  V1_getExtraDatasetEntitlementReportBuilders?(): V1_DatasetEntitlementReportBuilder[];
}
