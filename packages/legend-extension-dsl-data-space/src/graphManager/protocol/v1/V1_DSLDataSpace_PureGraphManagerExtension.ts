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

import { getDiagram } from '@finos/legend-extension-dsl-diagram';
import {
  PureModel,
  V1_PureGraphManager,
  PureClientVersion,
  type AbstractPureGraphManager,
  CoreModel,
  SystemModel,
  V1_Mapping,
  resolvePackagePathAndElementName,
  V1_PureModelContextType,
  V1_PackageableRuntime,
  V1_EngineRuntime,
} from '@finos/legend-graph';
import type { Entity } from '@finos/legend-model-storage';
import {
  ActionState,
  guaranteeNonEmptyString,
  guaranteeNonNullable,
  guaranteeType,
  uniq,
  type PlainObject,
} from '@finos/legend-shared';
import { DataSpaceSupportEmail } from '../../../models/metamodels/pure/model/packageableElements/dataSpace/DSLDataSpace_DataSpace.js';
import { V1_DataSpaceSupportEmail } from '../../../models/protocols/pure/v1/model/packageableElements/dataSpace/V1_DSLDataSpace_DataSpace.js';
import {
  DataSpaceAnalysisResult,
  DataSpaceExecutionContextAnalysisResult,
  DataSpaceStereotypeInfo,
  DataSpaceTaggedValueInfo,
} from '../../action/analytics/DataSpaceAnalysis.js';
import { DSLDataSpace_PureGraphManagerExtension } from '../DSLDataSpace_PureGraphManagerExtension.js';
import { V1_DataSpaceAnalysisResult } from './engine/analytics/V1_DataSpaceAnalysis.js';

const ANALYZE_DATA_SPACE_TRACE = 'analyze data space';

export class V1_DSLDataSpace_PureGraphManagerExtension extends DSLDataSpace_PureGraphManagerExtension {
  declare graphManager: V1_PureGraphManager;

  constructor(graphManager: AbstractPureGraphManager) {
    super(graphManager);
    this.graphManager = guaranteeType(graphManager, V1_PureGraphManager);
  }

  getSupportedProtocolVersion(): string {
    return PureClientVersion.V1_0_0;
  }

  async analyzeDataSpace(
    dataSpacePath: string,
    entities: Entity[],
    dependencyEntitiesIndex: Map<string, Entity[]>,
  ): Promise<DataSpaceAnalysisResult> {
    // prepare graph data for analysis
    // NOTE: we don't do serialization roundtrip here to save time
    const graphDataForAnalysis = {
      _type: V1_PureModelContextType.DATA,
      elements: Array.from(dependencyEntitiesIndex.values())
        .flat()
        .concat(entities)
        .map((entity) => entity.content),
    };

    const engineServerClient = this.graphManager.engine.getEngineServerClient();
    const analysisResult = V1_DataSpaceAnalysisResult.serialization.fromJson(
      await engineServerClient.postWithTracing<
        PlainObject<V1_DataSpaceAnalysisResult>
      >(
        engineServerClient.getTraceData(ANALYZE_DATA_SPACE_TRACE),
        `${engineServerClient._pure()}/analytics/dataSpace/render`,
        {
          clientVersion: V1_PureGraphManager.TARGET_PROTOCOL_VERSION,
          dataSpace: dataSpacePath,
          model: graphDataForAnalysis,
        },
        {},
        undefined,
        undefined,
        { enableCompression: true },
      ),
    );

    const result = new DataSpaceAnalysisResult();
    result.name = analysisResult.name;
    result.package = analysisResult.package;
    result.path = analysisResult.path;
    result.description = analysisResult.description;

    result.taggedValues = analysisResult.taggedValues.map((taggedValue) => {
      const info = new DataSpaceTaggedValueInfo();
      info.profile = taggedValue.profile;
      info.tag = taggedValue.value;
      info.value = taggedValue.value;
      return info;
    });
    result.stereotypes = analysisResult.stereotypes.map((stereotype) => {
      const info = new DataSpaceStereotypeInfo();
      info.profile = stereotype.profile;
      info.value = stereotype.value;
      return info;
    });

    if (analysisResult.supportInfo) {
      if (analysisResult.supportInfo instanceof V1_DataSpaceSupportEmail) {
        const supportEmail = new DataSpaceSupportEmail();
        supportEmail.address = guaranteeNonEmptyString(
          analysisResult.supportInfo.address,
          `Data space support email 'address' field is missing or empty`,
        );
        result.supportInfo = supportEmail;
      }
      // NOTE: we will relax the check and not throw here for unknown support info type
    }

    // create an empty graph
    const extensionElementClasses = this.graphManager.pluginManager
      .getPureGraphPlugins()
      .flatMap((plugin) => plugin.getExtraPureGraphExtensionClasses?.() ?? []);
    const systemModel = new SystemModel(extensionElementClasses);
    const coreModel = new CoreModel(extensionElementClasses);
    await this.graphManager.buildSystem(
      coreModel,
      systemModel,
      ActionState.create(),
      {},
    );
    systemModel.initializeAutoImports();
    const graph = new PureModel(
      coreModel,
      systemModel,
      this.graphManager.pluginManager.getPureGraphPlugins(),
    );

    // Create dummy mappings and runtimes
    // TODO?: these stubbed mappings and runtimes are not really useful that useful, so either we should
    // simplify the model here or potentially refactor the backend analytics endpoint to return these as model
    const mappingModels = uniq(
      analysisResult.executionContexts.map((context) => context.mapping),
    ).map((path) => {
      const mapping = new V1_Mapping();
      const [packagePath, name] = resolvePackagePathAndElementName(path);
      mapping.package = packagePath;
      mapping.name = name;
      return mapping;
    });
    const runtimeModels = uniq(
      analysisResult.executionContexts
        .map((context) => context.defaultRuntime)
        .concat(
          analysisResult.executionContexts.flatMap(
            (val) => val.compatibleRuntimes,
          ),
        ),
    ).map((path) => {
      const runtime = new V1_PackageableRuntime();
      const [packagePath, name] = resolvePackagePathAndElementName(path);
      runtime.package = packagePath;
      runtime.name = name;
      runtime.runtimeValue = new V1_EngineRuntime();
      return runtime;
    });

    // prepare the model context data
    // scan for models coming from system so we don't duplicate them when building the graph
    const graphEntities = analysisResult.model.elements
      .concat(mappingModels)
      .concat(runtimeModels)
      // NOTE: if an element could be found in the graph already it means it comes from system
      // so we could rid of it
      .filter((el) => !graph.getNullableElement(el.path, false))
      .map((el) => this.graphManager.elementProtocolToEntity(el));

    await this.graphManager.buildGraph(
      graph,
      graphEntities,
      ActionState.create(),
    );

    // build execution context info
    result.executionContextsIndex = new Map<
      string,
      DataSpaceExecutionContextAnalysisResult
    >();
    analysisResult.executionContexts.forEach((context) => {
      const contextAnalysisResult =
        new DataSpaceExecutionContextAnalysisResult();
      contextAnalysisResult.name = context.name;
      contextAnalysisResult.description = context.description;
      contextAnalysisResult.mapping = graph.getMapping(context.mapping);
      contextAnalysisResult.defaultRuntime = graph.getRuntime(
        context.defaultRuntime,
      );
      contextAnalysisResult.compatibleRuntimes = context.compatibleRuntimes.map(
        (runtime) => graph.getRuntime(runtime),
      );
      result.executionContextsIndex.set(
        contextAnalysisResult.name,
        contextAnalysisResult,
      );
    });
    result.defaultExecutionContext = guaranteeNonNullable(
      result.executionContextsIndex.get(analysisResult.defaultExecutionContext),
    );

    // find featured diagrams
    result.featuredDiagrams = analysisResult.featuredDiagrams.map((path) =>
      getDiagram(path, graph),
    );

    return result;
  }
}
