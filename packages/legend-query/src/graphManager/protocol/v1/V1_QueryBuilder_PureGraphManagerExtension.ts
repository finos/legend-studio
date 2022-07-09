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
import { QueryBuilder_PureGraphManagerExtension } from '../QueryBuilder_PureGraphManagerExtension.js';

export class V1_QueryBuilder_PureGraphManagerExtension extends QueryBuilder_PureGraphManagerExtension {
  declare graphManager: V1_PureGraphManager;

  constructor(graphManager: AbstractPureGraphManager) {
    super(graphManager);
    this.graphManager = guaranteeType(graphManager, V1_PureGraphManager);
  }

  getSupportedProtocolVersion(): string {
    return PureClientVersion.V1_0_0;
  }

  // We could optimize this further by omitting parts of the entities we don't need
  async buildGraphForCreateQuerySetup(
    graph: PureModel,
    entities: Entity[],
    dependencyEntities: Map<string, Entity[]>,
  ): Promise<void> {
    try {
      const graphBuilderInput =
        await this.graphManager.indexEntitiesWithDependencyIntoGraph(
          graph,
          entities,
          dependencyEntities,
          (entity: Entity): boolean =>
            ((entity.content as PlainObject<V1_PackageableElement>)
              ._type as string) === V1_MAPPING_ELEMENT_PROTOCOL_TYPE ||
            ((entity.content as PlainObject<V1_PackageableElement>)
              ._type as string) ===
              V1_PACKAGEABLE_RUNTIME_ELEMENT_PROTOCOL_TYPE,
        );
      // handle mapping includes
      const mappings = [
        ...graph.ownMappings,
        ...graph.dependencyManager.mappings,
      ];
      const v1Mappings = graphBuilderInput
        .map((e) => e.data.elements.filter(filterByType(V1_Mapping)))
        .flat();
      const context = new V1_GraphBuilderContextBuilder(
        graph,
        graph,
        this.graphManager.graphBuilderExtensions,
        this.graphManager.log,
      ).build();
      // build include index for compatible runtime analysis
      v1Mappings.forEach((element) => {
        const mapping = mappings.find((e) => e.path === element.path);
        if (mapping) {
          mapping.includes = element.includedMappings.map(
            (i) =>
              new MappingInclude(
                mapping,
                context.resolveMapping(
                  guaranteeNonEmptyString(
                    V1_getIncludedMappingPath(i),
                    `Mapping include path is missing or empty`,
                  ),
                ),
              ),
          );
        }
      });
      // handle runtimes
      const runtimes = [
        ...graph.ownRuntimes,
        ...graph.dependencyManager.runtimes,
      ];
      const v1Runtimes = graphBuilderInput
        .map((e) => e.data.elements.filter(filterByType(V1_PackageableRuntime)))
        .flat();
      v1Runtimes.forEach((element) => {
        const runtime = runtimes.find((e) => e.path === element.path);
        if (runtime) {
          const runtimeValue = new EngineRuntime();
          runtime.runtimeValue = runtimeValue;
          runtimeValue.mappings = element.runtimeValue.mappings.map((mapping) =>
            context.resolveMapping(mapping.path),
          );
        }
      });
    } catch (error) {
      assertErrorThrown(error);
      /**
       * Wrap all error with `GraphBuilderError`, as we throw a lot of assertion error in the graph builder
       * But we might want to rethink this decision in the future and throw appropriate type of error
       */
      throw error instanceof GraphBuilderError
        ? error
        : new GraphBuilderError(error);
    }
  }

  // We could optimize this further by omitting parts of the entities we don't need
  // i.e service entity would only keep execution
  async buildGraphForServiceQuerySetup(
    graph: PureModel,
    entities: Entity[],
    dependencyEntities: Map<string, Entity[]>,
  ): Promise<void> {
    try {
      const graphBuilderInput =
        await this.graphManager.indexEntitiesWithDependencyIntoGraph(
          graph,
          entities,
          dependencyEntities,
          (entity: Entity): boolean =>
            ((entity.content as PlainObject<V1_PackageableElement>)
              ._type as string) === V1_SERVICE_ELEMENT_PROTOCOL_TYPE,
        );
      // handle servicess
      const services = [
        ...graph.ownServices,
        ...graph.dependencyManager.services,
      ];
      const v1Services = graphBuilderInput
        .map((e) => e.data.elements.filter(filterByType(V1_Service)))
        .flat();
      // build service multi execution keys
      v1Services.forEach((element) => {
        const service = services.find((e) => e.path === element.path);
        if (service) {
          const serviceExecution = element.execution;
          if (serviceExecution instanceof V1_PureMultiExecution) {
            const execution = new PureMultiExecution(
              serviceExecution.executionKey,
              stub_RawLambda(),
              service,
            );
            execution.executionParameters =
              serviceExecution.executionParameters.map(
                (keyedExecutionParameter) =>
                  new KeyedExecutionParameter(
                    keyedExecutionParameter.key,
                    PackageableElementExplicitReference.create(stub_Mapping()),
                    new EngineRuntime(),
                  ),
              );
            service.execution = execution;
          } else if (serviceExecution instanceof V1_PureSingleExecution) {
            service.execution = new PureSingleExecution(
              stub_RawLambda(),
              service,
              PackageableElementExplicitReference.create(stub_Mapping()),
              new EngineRuntime(),
            );
          }
        }
      });
    } catch (error) {
      assertErrorThrown(error);
      /**
       * Wrap all error with `GraphBuilderError`, as we throw a lot of assertion error in the graph builder
       * But we might want to rethink this decision in the future and throw appropriate type of error
       */
      throw error instanceof GraphBuilderError
        ? error
        : new GraphBuilderError(error);
    }
  }
}
