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
  MappingIncludeMapping,
  V1_GraphBuilderContextBuilder,
  V1_Mapping,
  V1_MAPPING_ELEMENT_PROTOCOL_TYPE,
  V1_PACKAGEABLE_RUNTIME_ELEMENT_PROTOCOL_TYPE,
  V1_PureMultiExecution,
  V1_Service,
  V1_PackageableRuntime,
  type PureModel,
  V1_PureGraphManager,
  PureClientVersion,
  type AbstractPureGraphManager,
  type V1_EngineRuntime,
  CORE_PURE_PATH,
  getAllIncludedMappings,
  V1_MappingIncludeMapping,
} from '@finos/legend-graph';
import type { EntitiesWithOrigin, Entity } from '@finos/legend-storage';
import {
  assertErrorThrown,
  filterByType,
  guaranteeNonEmptyString,
  guaranteeType,
  type PlainObject,
  isNonNullable,
} from '@finos/legend-shared';
import { MappingRuntimeCompatibilityAnalysisResult } from '../../../action/analytics/MappingRuntimeCompatibilityAnalysis.js';
import { ServiceExecutionAnalysisResult } from '../../../action/analytics/ServiceExecutionAnalysis.js';
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
    dependencyEntitiesIndex: Map<string, EntitiesWithOrigin>,
  ): Promise<void> {
    try {
      const graphBuilderInput = await this.graphManager.indexLightGraph(
        graph,
        entities,
        dependencyEntitiesIndex,
        (entity: Entity): boolean =>
          (entity.content._type as string) ===
            V1_MAPPING_ELEMENT_PROTOCOL_TYPE ||
          (entity.content._type as string) ===
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
        this.graphManager.logService,
      ).build();
      // build include index for compatible runtime analysis
      v1Mappings.forEach((element) => {
        const mapping = mappings.find((e) => e.path === element.path);
        if (mapping) {
          mapping.includes = element.includedMappings
            .map((mappingInclude) => {
              // TODO : handle for mapping include data product
              if (mappingInclude instanceof V1_MappingIncludeMapping) {
                return new MappingIncludeMapping(
                  mapping,
                  context.resolveMapping(
                    guaranteeNonEmptyString(
                      mappingInclude.includedMapping,
                      `Mapping include path is missing or empty`,
                    ),
                  ),
                );
              }
              return undefined;
            })
            .filter(isNonNullable);
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

  async surveyMappingRuntimeCompatibility(
    entities: Entity[],
    dependencyEntitiesIndex: Map<string, EntitiesWithOrigin>,
  ): Promise<MappingRuntimeCompatibilityAnalysisResult[]> {
    const result: MappingRuntimeCompatibilityAnalysisResult[] = [];
    const graph = await this.graphManager.createBasicGraph({
      initializeSystem: false,
    });

    const graphBuilderInput = await this.graphManager.indexLightGraph(
      graph,
      entities,
      dependencyEntitiesIndex,
      (entity: Entity): boolean =>
        ([CORE_PURE_PATH.MAPPING, CORE_PURE_PATH.RUNTIME] as string[]).includes(
          entity.classifierPath,
        ),
      // NOTE: small optimization since we only need to survey runtimes and mappings
      (entity: Entity): Entity => {
        if (entity.classifierPath === CORE_PURE_PATH.MAPPING) {
          entity.content = {
            _type: entity.content._type,
            name: entity.content.name,
            package: entity.content.package,
            includes: entity.content.includes,
          };
        } else if (entity.classifierPath === CORE_PURE_PATH.RUNTIME) {
          entity.content = {
            _type: entity.content._type,
            name: entity.content.name,
            package: entity.content.package,
            runtimeValue: {
              mappings: (
                entity.content.runtimeValue as
                  | PlainObject<V1_EngineRuntime>
                  | undefined
              )?.mappings,
            },
          };
        }
        return entity;
      },
    );

    const context = new V1_GraphBuilderContextBuilder(
      graph,
      graph,
      this.graphManager.graphBuilderExtensions,
      this.graphManager.logService,
    ).build();

    graphBuilderInput
      .map((element) => element.data.elements.filter(filterByType(V1_Mapping)))
      .flat()
      .forEach((element) => {
        const mapping = graph.getNullableMapping(element.path);
        if (mapping) {
          mapping.includes = element.includedMappings
            .map((mappingInclude) => {
              // TODO : handle for mapping include data product
              if (mappingInclude instanceof V1_MappingIncludeMapping) {
                return new MappingIncludeMapping(
                  mapping,
                  context.resolveMapping(
                    guaranteeNonEmptyString(
                      mappingInclude.includedMapping,
                      `Mapping include path is missing or empty`,
                    ),
                  ),
                );
              }
              return undefined;
            })
            .filter(isNonNullable);
        }
      });

    graphBuilderInput
      .map((element) =>
        element.data.elements.filter(filterByType(V1_PackageableRuntime)),
      )
      .flat()
      .forEach((element) => {
        const runtime = graph.getNullableRuntime(element.path);
        if (runtime) {
          const runtimeValue = new EngineRuntime();
          runtime.runtimeValue = runtimeValue;
          runtimeValue.mappings = element.runtimeValue.mappings.map((mapping) =>
            context.resolveMapping(mapping.path),
          );
        }
      });

    graph.mappings.forEach((mapping) => {
      const mappingRuntimeCompatibilityAnalysisResult =
        new MappingRuntimeCompatibilityAnalysisResult();
      mappingRuntimeCompatibilityAnalysisResult.mapping = mapping;
      mappingRuntimeCompatibilityAnalysisResult.runtimes =
        // If the runtime claims to cover some mappings which include the specified mapping,
        // then we deem the runtime to be compatible with the such mapping
        graph.runtimes.filter((runtime) =>
          runtime.runtimeValue.mappings
            .map((mappingReference) => [
              mappingReference.value,
              ...getAllIncludedMappings(mappingReference.value),
            ])
            .flat()
            .includes(mapping),
        );
      result.push(mappingRuntimeCompatibilityAnalysisResult);
    });

    return result;
  }

  async surveyServiceExecution(
    entities: Entity[],
    dependencyEntitiesIndex: Map<string, EntitiesWithOrigin>,
  ): Promise<ServiceExecutionAnalysisResult[]> {
    const result: ServiceExecutionAnalysisResult[] = [];
    const graph = await this.graphManager.createBasicGraph({
      initializeSystem: false,
    });

    const graphBuilderInput = await this.graphManager.indexLightGraph(
      graph,
      entities,
      dependencyEntitiesIndex,
      (entity: Entity): boolean =>
        entity.classifierPath === CORE_PURE_PATH.SERVICE,
      // NOTE: small optimization since we only need to inspect services' execution context
      (entity: Entity): Entity => {
        if (entity.classifierPath === CORE_PURE_PATH.SERVICE) {
          entity.content = {
            _type: entity.content._type,
            name: entity.content.name,
            package: entity.content.package,
            execution: entity.content.execution,
          };
        }
        return entity;
      },
    );
    graphBuilderInput
      .map((element) => element.data.elements.filter(filterByType(V1_Service)))
      .flat()
      .forEach((protocol) => {
        const service = graph.getNullableService(protocol.path);
        if (service) {
          const serviceAnalysisResult = new ServiceExecutionAnalysisResult();
          serviceAnalysisResult.service = service;
          if (protocol.execution instanceof V1_PureMultiExecution) {
            serviceAnalysisResult.executionKeys =
              protocol.execution.executionParameters?.map((param) => param.key);
          }
          result.push(serviceAnalysisResult);
        }
      });
    return result;
  }
}
