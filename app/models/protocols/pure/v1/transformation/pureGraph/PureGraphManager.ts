/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { flow } from 'mobx';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { Entity } from 'SDLC/entity/Entity';
import { ROOT_PACKAGE_NAME, SOURCE_INFORMATION_KEY } from 'MetaModelConst';
import { promisify, UnsupportedOperationError, recursiveOmit, assertTrue, guaranteeType } from 'Utilities/GeneralUtil';
import { ProjectDependencyMetadata } from 'SDLC/configuration/ProjectDependency';
import { ExecuteInput } from 'EXEC/execution/ExecuteInput';
import { GraphError, SystemGraphProcessingError, DependencyGraphProcessingError } from 'MetaModelUtility';
import { deserialize } from 'serializr';
import { AbstractPureGraphManager as MM_AbstractPureGraphManager, PureModelContextDataObject as MM_PureModelContextDataObject } from 'MM/AbstractPureGraphManager';
import { Mapping as MM_Mapping } from 'MM/model/packageableElements/mapping/Mapping';
import { Runtime as MM_Runtime } from 'MM/model/packageableElements/runtime/Runtime';
import { PackageableElement as MM_PackageableElement, PACKAGEABLE_ELEMENT_TYPE as MM_PACKAGEABLE_ELEMENT_TYPE } from 'MM/model/packageableElements/PackageableElement';
import { PureModel as MM_PureModel, CoreModel as MM_CoreModel, SystemModel as MM_SystemModel } from 'MM/PureModel';
import { BasicModel as MM_BasicPureModel, BasicModel as MM_BasicModel } from 'MM/BasicModel';
import { GraphFreezer as MM_GraphFreezer } from 'MM/freezer/GraphFreezer';
import { DependencyManager as MM_DependencyManager } from 'MM/DependencyManager';
import { Class as MM_Class } from 'MM/model/packageableElements/domain/Class';
import { Lambda as MM_Lambda } from 'MM/model/valueSpecification/raw/Lambda';
import { RootGraphFetchTree as MM_RootGraphFetchTree, GraphFetchTree as MM_GraphFetchTree } from 'MM/model/valueSpecification/raw/graph/GraphFetchTree';
import { PureModelContextData } from 'V1/model/context/PureModelContextData';
import { PackageableElementSerializer } from 'V1/transformation/pureGraph/serializer/PackageableElementSerializer';
import { Mapping } from 'V1/model/packageableElements/mapping/Mapping';
import { PackageableElementType, PackageableElement } from 'V1/model/packageableElements/PackageableElement';
import { ProtocolToMetaModelGraphFirstPassVisitor } from './ProtocolToMetaModelGraphFirstPassVisitor';
import { ProtocolToMetaModelGraphSecondPassVisitor } from './ProtocolToMetaModelGraphSecondPassVisitor';
import { ProtocolToMetaModelGraphThirdPassVisitor } from './ProtocolToMetaModelGraphThirdPassVisitor';
import { ProtocolToMetaModelGraphFourthPassVisitor } from './ProtocolToMetaModelGraphFourthPassVisitor';
import { ProtocolToMetaModelGraphFifthPassVisitor } from './ProtocolToMetaModelGraphFifthPassVisitor';
import { DependencyDisambiguator } from './dependencyDisambiguator/DependencyDisambiguator';
import { BaseExecutionContext } from 'V1/model/valueSpecification/raw/executionContext/ExecutionContext';
import { serializeRuntime } from './serializer/RuntimeSerializerHelper';
import { GraphBuilderContext, GraphBuilderContextBuilder } from 'V1/transformation/pureGraph/GraphBuilderContext';
import { ValueSpecification, FunctionValueSpecification, ValueSpecificationType, GraphFetchValueSpecification, ClassValueSpecification } from 'V1/model/valueSpecification/ValueSpecification';
import { RootGraphFetchTree } from 'V1/model/valueSpecification/raw/GraphFetchTree';
import { ProtocolToMetaModelValueSpecificationVisitor } from 'V1/transformation/pureGraph/ProtocolToMetaModelValueSpecificationVisitor';
import { serializeValueSpecification } from 'V1/transformation/pureGraph/serializer/ValueSpecificationSerializer';
import { Profile } from 'V1/model/packageableElements/domain/Profile';
import { Enumeration } from 'V1/model/packageableElements/domain/Enumeration';
import { Class } from 'V1/model/packageableElements/domain/Class';
import { ConcreteFunctionDefinition } from 'V1/model/packageableElements/function/ConcreteFunctionDefinition';
import { Measure } from 'V1/model/packageableElements/domain/Measure';
import { Association } from 'V1/model/packageableElements/domain/Association';
import { Store } from 'V1/model/packageableElements/store/Store';
import { Connection } from 'V1/model/packageableElements/connection/Connection';
import { Runtime } from 'V1/model/packageableElements/runtime/Runtime';
import { Text } from 'V1/model/packageableElements/text/Text';
import { FileGeneration } from 'V1/model/packageableElements/fileGeneration/FileGeneration';
import { Diagram } from 'V1/model/packageableElements/diagram/Diagram';
import { GenerationSpecification } from 'V1/model/packageableElements/generationSpecification/GenerationSpecification';
import { SectionIndex } from 'V1/model/packageableElements/section/SectionIndex';

// NOTE: this interface is somewhat naive since `model` is of type `BasicPureModel`,
// so this can only be used for pre-processing/indexing
// we might need to change model to PureModel in the future when we support other use case
interface ProcessingInput {
  model: MM_BasicPureModel;
  data: PureModelContextData;
  parentElementPath?: string;
}

export class PureGraphManager extends MM_AbstractPureGraphManager {

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  buildSystem = flow(function* (this: PureGraphManager, coreModel: MM_CoreModel, systemModel: MM_SystemModel, systemEntities: Entity[], legalModel: MM_BasicModel, legalEntities: Entity[], quiet?: boolean) {
    const startTime = Date.now();
    // Create a dummy graph for system processing. This is to ensure system model does not depend on the main graph
    const graph = new MM_PureModel(coreModel, systemModel, legalModel);
    try {
      // System
      const systemData = new PureModelContextData();
      yield systemData.build(systemEntities);
      const systemProcessingInput: ProcessingInput = { model: systemModel, data: systemData };
      yield this.preProcess(graph, [systemProcessingInput]);
      // NOTE: right now we only have profile and enumeration for system, we might need to generalize this step in the future
      yield this.loadTypes(graph, [systemProcessingInput]);
      yield this.postProcess(graph, [systemProcessingInput]);
      if (!quiet) { Log.info(LOG_EVENT.GRAPH_SYSTEM_BUILT, Date.now() - startTime, 'ms', `[profile: ${systemModel.profiles.length}, enumeration: ${systemModel.enumerations.length}]`) }

      /**
       * Legal
       * TODO: remove when we're done with `isInDemo` flag, also we don't need to time this as it should be minimal
       */
      const legalData = new PureModelContextData();
      yield legalData.build(legalEntities);
      const legalProcessingInput: ProcessingInput = { model: legalModel, data: legalData };
      yield this.preProcess(graph, [legalProcessingInput]);
      yield this.loadTexts(graph, [legalProcessingInput]);
      yield this.postProcess(graph, [legalProcessingInput]);

      legalModel.setIsBuilt(true);
      systemModel.setIsBuilt(true);
    } catch (error) {
      systemModel.setFailedToBuild(true);
      if (!quiet) { Log.info(LOG_EVENT.GRAPH_BUILD_FAILED, '[ERROR]', Date.now() - startTime, 'ms') }
      throw new SystemGraphProcessingError(error);
    }
  });

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  buildDependencies = flow(function* (this: PureGraphManager, coreModel: MM_CoreModel, systemModel: MM_SystemModel, legalModel: MM_BasicModel, dependencyManager: MM_DependencyManager, dependencyMetadataMap: Map<string, ProjectDependencyMetadata>, quiet?: boolean) {
    const startTime = Date.now();
    dependencyManager.setIsBuilt(false);
    // Create a dummy graph for system processing. This is to ensure dependency models do not depend on the main graph
    const graph = new MM_PureModel(coreModel, systemModel, legalModel);
    graph.setDependencyManager(dependencyManager);
    try {
      dependencyManager.initialize(dependencyMetadataMap);
      // Parse/Build Data
      const dependencyDataMap = new Map<string, PureModelContextData>();
      const dependencyKeys = Array.from(dependencyMetadataMap.keys());
      yield Promise.all(Array.from(dependencyMetadataMap.entries()).map(([dependencyKey, projectDependencyMetadata]) => {
        const projectModelData = new PureModelContextData();
        dependencyDataMap.set(dependencyKey, projectModelData);
        return projectModelData.build(projectDependencyMetadata.entities);
      }));

      const reservedPaths = legalModel.allElements.map(e => e.path)
        .concat(systemModel.allElements.map(e => e.path))
        .concat(coreModel.allElements.map(e => e.path));
      // Pre-process dependent element paths
      // NOTE: we process the dependent element paths after serializing the entities and before building the metamodel graph.
      // This is by design as it isolates the dependency entity path process logic here and save us the trouble of poking
      // metamodel graph later to update.
      Array.from(dependencyDataMap.entries()).forEach(([dependencyKey, pureModelContextData]) => {
        const dependencyMetadata = dependencyMetadataMap.get(dependencyKey);
        if (dependencyMetadata?.processVersionPackage) {
          pureModelContextData.elements.forEach(element => element.accept_PackageableElementVisitor(new DependencyDisambiguator({
            versionPrefix: dependencyKey,
            allDependencyKeys: dependencyKeys,
            reservedPaths,
            projectEntityPaths: dependencyMetadata.entities.map(entity => entity.path)
          })));
        }
      });

      const preprocessingFinishedTime = Date.now();
      if (!quiet) { Log.info(LOG_EVENT.GRAPH_DEPENDENCIES_PREPROCESSED, preprocessingFinishedTime - startTime, 'ms') }

      const processingInput: ProcessingInput[] = Array.from(dependencyDataMap.entries()).map(([dependencyKey, dependencyData]) => ({ data: dependencyData, model: graph.dependencyManager.getModel(dependencyKey) }));
      yield this.preProcess(graph, processingInput);
      // NOTE: we might need to process sectionIndex when we support unresolved element paths in dependencies

      yield this.loadTypes(graph, processingInput);
      yield this.loadStores(graph, processingInput);
      yield this.loadMappings(graph, processingInput);
      yield this.loadConnections(graph, processingInput);
      yield this.loadRuntimes(graph, processingInput);
      yield this.loadDiagrams(graph, processingInput);
      yield this.loadTexts(graph, processingInput);
      yield this.loadFileGenerations(graph, processingInput);
      yield this.loadGenerationSpecificationss(graph, processingInput);

      yield this.postProcess(graph, processingInput);
      const processingFinishedTime = Date.now();
      if (!quiet) { Log.info(LOG_EVENT.GRAPH_DEPENDENCIES_PROCESSED, processingFinishedTime - preprocessingFinishedTime, 'ms') }

      dependencyManager.setIsBuilt(true);
      if (!quiet) { Log.info(LOG_EVENT.GRAPH_DEPENDENCIES_BUILT, '[TOTAL]', Date.now() - startTime, 'ms') }
    } catch (error) {
      if (!quiet) { Log.info(LOG_EVENT.GRAPH_BUILD_FAILED, '[ERROR]', Date.now() - startTime, 'ms') }
      dependencyManager.setFailedToBuild(true);
      throw new DependencyGraphProcessingError(error);
    }
  });

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  build = flow(function* (this: PureGraphManager, graph: MM_PureModel, entities: Entity[], options?: { quiet?: boolean; TEMP_retainSection?: boolean }) {
    if (!options?.quiet) { Log.info(LOG_EVENT.GRAPH_BUILD_STARTED) }
    let stepStartTime = Date.now();
    let stepFinishedTime;
    const startTime = stepStartTime;
    try {
      // Parse/Build Data
      const data = new PureModelContextData();
      yield data.build(entities);

      const processingInput = [{ model: graph, data }];
      stepFinishedTime = Date.now();
      if (!options?.quiet) { Log.info(LOG_EVENT.GRAPH_BUILD_DATA_MODEL_PARSED, stepFinishedTime - stepStartTime, 'ms') }
      stepStartTime = stepFinishedTime;

      // Pre-process: Create and Index Elements
      yield this.preProcess(graph, processingInput);
      stepFinishedTime = Date.now();
      if (!options?.quiet) { Log.info(LOG_EVENT.GRAPH_BUILD_ELEMENTS_INDEXED, stepFinishedTime - stepStartTime, 'ms', `[element: ${data.elements.length}]`) }
      stepStartTime = stepFinishedTime;

      // Section index
      yield this.loadSectionIndex(graph, processingInput);
      stepFinishedTime = Date.now();
      if (!options?.quiet) { Log.info(LOG_EVENT.GRAPH_BUILD_DOMAIN_LOADED, stepFinishedTime - stepStartTime, 'ms', `[sectionIndex: ${graph.sectionIndices.length}]`) }
      stepStartTime = stepFinishedTime;

      // Types
      yield this.loadTypes(graph, processingInput);
      stepFinishedTime = Date.now();
      if (!options?.quiet) {
        Log.info(LOG_EVENT.GRAPH_BUILD_DOMAIN_LOADED, stepFinishedTime - stepStartTime, 'ms',
          `[class: ${graph.classes.length}, enumeration: ${graph.enumerations.length}, association: ${graph.associations.length}, profile: ${graph.profiles.length}, functions: ${graph.functions.length}]`
        );
      }
      stepStartTime = stepFinishedTime;

      // Stores
      yield this.loadStores(graph, processingInput);
      stepFinishedTime = Date.now();
      // TODO: we might want to detail out the number of stores by type
      if (!options?.quiet) { Log.info(LOG_EVENT.GRAPH_BUILD_STORES_LOADED, stepFinishedTime - stepStartTime, 'ms', `[store: ${graph.stores.length}]`) }
      stepStartTime = stepFinishedTime;

      // Mappings
      yield this.loadMappings(graph, processingInput);
      stepFinishedTime = Date.now();
      if (!options?.quiet) { Log.info(LOG_EVENT.GRAPH_BUILD_MAPPINGS_LOADED, stepFinishedTime - stepStartTime, 'ms', `[mapping: ${graph.mappings.length}]`) }
      stepStartTime = stepFinishedTime;

      // Connections
      yield this.loadConnections(graph, processingInput);
      stepFinishedTime = Date.now();
      if (!options?.quiet) { Log.info(LOG_EVENT.GRAPH_BUILD_CONNECTIONS_LOADED, stepFinishedTime - stepStartTime, 'ms', `[connection: ${graph.connections.length}]`) }
      stepStartTime = stepFinishedTime;

      // Runtimes
      yield this.loadRuntimes(graph, processingInput);
      stepFinishedTime = Date.now();
      if (!options?.quiet) { Log.info(LOG_EVENT.GRAPH_BUILD_RUNTIMES_LOADED, stepFinishedTime - stepStartTime, 'ms', `[runtime: ${graph.runtimes.length}]`) }
      stepStartTime = stepFinishedTime;

      // Diagrams
      yield this.loadDiagrams(graph, processingInput);
      stepFinishedTime = Date.now();
      if (!options?.quiet) { Log.info(LOG_EVENT.GRAPH_BUILD_DIAGRAMS_LOADED, stepFinishedTime - stepStartTime, 'ms', `[diagram: ${graph.diagrams.length}]`) }
      stepStartTime = stepFinishedTime;

      // File Generation
      yield this.loadFileGenerations(graph, processingInput);
      stepFinishedTime = Date.now();
      if (!options?.quiet) { Log.info(LOG_EVENT.GRAPH_BUILD_FILE_GENERATIONS_LOADED, stepFinishedTime - stepStartTime, 'ms', `[text: ${graph.texts.length}]`) }
      stepStartTime = stepFinishedTime;

      // Generation Tree
      yield this.loadGenerationSpecificationss(graph, processingInput);
      stepFinishedTime = Date.now();
      if (!options?.quiet) { Log.info(LOG_EVENT.GRAPH_BUILD_GENERATION_TREE_LOADED, stepFinishedTime - stepStartTime, 'ms', `[text: ${graph.texts.length}]`) }
      stepStartTime = stepFinishedTime;

      // Text Elements
      yield this.loadTexts(graph, processingInput);
      stepFinishedTime = Date.now();
      if (!options?.quiet) { Log.info(LOG_EVENT.GRAPH_BUILD_TEXTS_LOADED, stepFinishedTime - stepStartTime, 'ms', `[text: ${graph.texts.length}]`) }

      // Post-processing: Freezing Immutable Elements
      yield this.postProcess(graph, processingInput, options?.TEMP_retainSection);
      graph.setIsBuilt(true);
      if (!options?.quiet) { Log.info(LOG_EVENT.GRAPH_BUILT, '[TOTAL]', Date.now() - startTime, 'ms') }
    } catch (error) {
      if (!options?.quiet) { Log.info(LOG_EVENT.GRAPH_BUILD_FAILED, '[ERROR]', Date.now() - startTime, 'ms') }
      graph.setFailedToBuild(true);
      /**
       * Wrap all error with `GraphError`, as we throw a lot of assertion error in the graph builder
       * But we might want to rethink this decision in the future and throw appropriate type of error
       */
      throw error instanceof GraphError ? error : new GraphError(error);
    }
  });

  buildGenerations = flow(function* (this: PureGraphManager, graph: MM_PureModel, generatedEntities: Map<string, Entity[]>, options?: { quiet?: boolean; TEMP_retainSection?: boolean }) {
    const stepStartTime = Date.now();
    const generatedModel = graph.generationModel;
    generatedModel.setIsBuilt(false);
    generatedModel.setFailedToBuild(false);
    try {
      if (!options?.quiet) { Log.info(LOG_EVENT.GRAPH_BUILD_DATA_MODEL_PARSED) }
      const generatedDataMap = new Map<string, PureModelContextData>();
      yield Promise.all(Array.from(generatedEntities.entries()).map(([generationParentPath, entities]) => {
        const generatedData = new PureModelContextData();
        generatedDataMap.set(generationParentPath, generatedData);
        return generatedData.build(entities);
      }));
      const processingInput = Array.from(generatedDataMap.entries()).map(([generationParentPath, generatedData]) => ({ parentElementPath: generationParentPath, data: generatedData, model: generatedModel }));
      // Pre-process: Create and Index Elements
      yield this.preProcess(graph, processingInput);
      yield this.loadTypes(graph, processingInput);
      yield this.loadStores(graph, processingInput);
      yield this.loadMappings(graph, processingInput);
      yield this.loadConnections(graph, processingInput);
      yield this.loadRuntimes(graph, processingInput);
      yield this.loadDiagrams(graph, processingInput);
      yield this.loadFileGenerations(graph, processingInput);
      yield this.loadGenerationSpecificationss(graph, processingInput);
      yield this.loadTexts(graph, processingInput);
      yield this.postProcess(graph, processingInput, options?.TEMP_retainSection);
      generatedModel.setIsBuilt(true);
      if (!options?.quiet) { Log.info(LOG_EVENT.GRAPH_GENERATIONS_BUILT, Date.now() - stepStartTime, `${graph.generationModel.allElements.length} generated elements processed`, 'ms') }
    } catch (error) {
      if (!options?.quiet) { Log.info(LOG_EVENT.GRAPH_BUILD_FAILED, Date.now() - stepStartTime, 'ms') }
      generatedModel.setFailedToBuild(true);
      /**
       * Wrap all error with `GraphError`, as we throw a lot of assertion error in the graph builder
       * But we might want to rethink this decision in the future and throw appropriate type of error
       */
      throw error instanceof GraphError ? error : new GraphError(error);
    }
  });

  private getContext(graph: MM_PureModel, element: PackageableElement): GraphBuilderContext {
    return new GraphBuilderContextBuilder(graph).withElement(element).build();
  }

  private preProcess = flow(function* (this: PureGraphManager, graph: MM_PureModel, inputs: ProcessingInput[]) {
    yield Promise.all(inputs.flatMap(input => input.data.elements.map(element => promisify(() => element.accept_PackageableElementVisitor(new ProtocolToMetaModelGraphFirstPassVisitor(this.getContext(graph, element), input.model))))));
  });

  private postProcess = flow(function* (this: PureGraphManager, graph: MM_PureModel, inputs: ProcessingInput[], TEMP_retainSection?: boolean) {
    yield Promise.all(inputs.flatMap(input => input.data.elements.map(el => promisify(() => {
      const element = graph.getElement(el.path);
      if (input.parentElementPath) {
        element.generationParentElement = graph.getElement(input.parentElementPath);
      }
      const isElementReadOnly = Boolean(element.getRoot().path !== ROOT_PACKAGE_NAME.MAIN);
      if (isElementReadOnly) {
        element.freeze();
        element.accept_PackageableElementVisitor(new MM_GraphFreezer());
      }
    }))));
    /**
     * For now, we delete the section index. We are able to read both resolved and unresolved element paths
     * but when we write (serialize) we write only resolved paths. In the future once the issue with dependency is solved we will
     * perserve the element path both resolved and unresolved
     */
    if (!TEMP_retainSection) {
      graph.deleteSectionIndex();
    }
  });

  private loadTypes = flow(function* (this: PureGraphManager, graph: MM_PureModel, inputs: ProcessingInput[]) {
    // Second pass
    yield Promise.all(inputs.flatMap(input => input.data.elements.filter(element => element instanceof Profile).map(element => promisify(() => element.accept_PackageableElementVisitor(new ProtocolToMetaModelGraphSecondPassVisitor(this.getContext(graph, element)))))));
    yield Promise.all(inputs.flatMap(input => input.data.elements.filter(element => element instanceof Class).map(element => promisify(() => element.accept_PackageableElementVisitor(new ProtocolToMetaModelGraphSecondPassVisitor(this.getContext(graph, element)))))));
    yield Promise.all(inputs.flatMap(input => input.data.elements.filter(element => element instanceof Enumeration).map(element => promisify(() => element.accept_PackageableElementVisitor(new ProtocolToMetaModelGraphSecondPassVisitor(this.getContext(graph, element)))))));
    yield Promise.all(inputs.flatMap(input => input.data.elements.filter(element => element instanceof Measure).map(element => promisify(() => element.accept_PackageableElementVisitor(new ProtocolToMetaModelGraphSecondPassVisitor(this.getContext(graph, element), input.model))))));
    yield Promise.all(inputs.flatMap(input => input.data.elements.filter(element => element instanceof ConcreteFunctionDefinition).map(element => promisify(() => element.accept_PackageableElementVisitor(new ProtocolToMetaModelGraphSecondPassVisitor(this.getContext(graph, element)))))));
    // Third pass
    yield Promise.all(inputs.flatMap(input => input.data.elements.filter(element => element instanceof Class).map(element => promisify(() => element.accept_PackageableElementVisitor(new ProtocolToMetaModelGraphThirdPassVisitor(this.getContext(graph, element)))))));
    yield Promise.all(inputs.flatMap(input => input.data.elements.filter(element => element instanceof Association).map(element => promisify(() => element.accept_PackageableElementVisitor(new ProtocolToMetaModelGraphThirdPassVisitor(this.getContext(graph, element)))))));
    // Fifth pass
    yield Promise.all(inputs.flatMap(input => input.data.elements.filter(element => element instanceof Class).map(element => promisify(() => element.accept_PackageableElementVisitor(new ProtocolToMetaModelGraphFifthPassVisitor(this.getContext(graph, element)))))));
  });

  private loadStores = flow(function* (this: PureGraphManager, graph: MM_PureModel, inputs: ProcessingInput[]) {
    yield Promise.all(inputs.flatMap(input => input.data.elements.filter(element => element instanceof Store).map(element => promisify(() => element.accept_PackageableElementVisitor(new ProtocolToMetaModelGraphSecondPassVisitor(this.getContext(graph, element)))))));
  })

  private loadMappings = flow(function* (this: PureGraphManager, graph: MM_PureModel, inputs: ProcessingInput[]) {
    yield Promise.all(inputs.flatMap(input => input.data.elements.filter(element => element instanceof Mapping).map(element => promisify(() => element.accept_PackageableElementVisitor(new ProtocolToMetaModelGraphSecondPassVisitor(this.getContext(graph, element)))))));
    yield Promise.all(inputs.flatMap(input => input.data.elements.filter(element => element instanceof Mapping).map(element => promisify(() => element.accept_PackageableElementVisitor(new ProtocolToMetaModelGraphThirdPassVisitor(this.getContext(graph, element)))))));
    yield Promise.all(inputs.flatMap(input => input.data.elements.filter(element => element instanceof Mapping).map(element => promisify(() => element.accept_PackageableElementVisitor(new ProtocolToMetaModelGraphFourthPassVisitor(this.getContext(graph, element)))))));
  });

  private loadConnections = flow(function* (this: PureGraphManager, graph: MM_PureModel, inputs: ProcessingInput[]) {
    yield Promise.all(inputs.flatMap(input => input.data.elements.filter(element => element instanceof Connection).map(element => promisify(() => element.accept_PackageableElementVisitor(new ProtocolToMetaModelGraphSecondPassVisitor(this.getContext(graph, element)))))));
  });

  private loadRuntimes = flow(function* (this: PureGraphManager, graph: MM_PureModel, inputs: ProcessingInput[]) {
    yield Promise.all(inputs.flatMap(input => input.data.elements.filter(element => element instanceof Runtime).map(element => promisify(() => element.accept_PackageableElementVisitor(new ProtocolToMetaModelGraphSecondPassVisitor(this.getContext(graph, element)))))));
  });

  private loadDiagrams = flow(function* (this: PureGraphManager, graph: MM_PureModel, inputs: ProcessingInput[]) {
    yield Promise.all(inputs.flatMap(input => input.data.elements.filter(element => element instanceof Diagram).map(element => promisify(() => element.accept_PackageableElementVisitor(new ProtocolToMetaModelGraphSecondPassVisitor(this.getContext(graph, element)))))));
  })

  private loadTexts = flow(function* (this: PureGraphManager, graph: MM_PureModel, inputs: ProcessingInput[]) {
    yield Promise.all(inputs.flatMap(input => input.data.elements.filter(element => element instanceof Text).map(element => promisify(() => element.accept_PackageableElementVisitor(new ProtocolToMetaModelGraphSecondPassVisitor(this.getContext(graph, element)))))));
  })

  private loadFileGenerations = flow(function* (this: PureGraphManager, graph: MM_PureModel, inputs: ProcessingInput[]) {
    yield Promise.all(inputs.flatMap(input => input.data.elements.filter(element => element instanceof FileGeneration).map(element => promisify(() => element.accept_PackageableElementVisitor(new ProtocolToMetaModelGraphSecondPassVisitor(this.getContext(graph, element)))))));
  })

  private loadGenerationSpecificationss = flow(function* (this: PureGraphManager, graph: MM_PureModel, inputs: ProcessingInput[]) {
    yield Promise.all(inputs.flatMap(input => input.data.elements.filter(element => element instanceof GenerationSpecification).map(element => promisify(() => element.accept_PackageableElementVisitor(new ProtocolToMetaModelGraphSecondPassVisitor(this.getContext(graph, element)))))));
  })

  private loadSectionIndex = flow(function* (this: PureGraphManager, graph: MM_PureModel, inputs: ProcessingInput[]) {
    yield Promise.all(inputs.flatMap(input => input.data.elements.filter(element => element instanceof SectionIndex).map(element => promisify(() => element.accept_PackageableElementVisitor(new ProtocolToMetaModelGraphSecondPassVisitor(this.getContext(graph, element)))))));
  })

  getPackageableElementProtocol = <T>(element: MM_PackageableElement): T => element.accept_PackageableElementVisitor(new PackageableElementSerializer()) as unknown as T

  createBareModelData(): MM_PureModelContextDataObject {
    return new PureModelContextData();
  }

  createExecutionInput = (graph: MM_PureModel, mapping: MM_Mapping, lambda: Record<PropertyKey, unknown>, runtime: MM_Runtime, clientVersion: string): ExecuteInput => {
    /**
     * NOTE: to lessen network load, we might need to think of a way to only include relevant part of the pure model context data here
     *
     * Graph data models can be classified based on dependency hieararchy:
     * 1. Building blocks: models that all other models depend on: e.g. domain models, connections, etc.
     * 2. Consumers: models that depends on other models: e.g. mapping, service, etc.
     * 3. Unrelated: models that depends on nothing and vice versa: e.g. text
     *
     * It would be great if we can provide a way to walk the mapping to select only relevant part, but the problem is we cannot really walk the lambda
     * object to identify relevant classes yet. so the more economical way to to base on the classification above and the knowledge about hierarchy between
     * models (e.g. service can use mapping, runtime, connection, store, etc.) we can roughly prune the graph model data by group. Following is an example
     * for mapping used for execution, but this can generalized if we introduce hierarchy/ranking for model type
     *
     * TODO: we need to account for mapping include when we support it
     */
    const graphData = this.combineGraphModelData(this.getGraphModelData(graph), this.getCompileContextModelData(graph));
    /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
    const prunedGraphData = this.createBareModelData();
    prunedGraphData.elements = graphData.elements.filter(element =>
      element instanceof Class
      || element instanceof Enumeration
      || element instanceof Profile
      || element instanceof Association
      || element instanceof ConcreteFunctionDefinition
      || element instanceof Measure
      || element instanceof Store
      || element instanceof Connection
    );
    prunedGraphData.elements.push(this.getPackageableElementProtocol<Mapping>(mapping));
    // NOTE: for execution, we usually will just assume that we send the connections embedded in the runtime value, since we don't want the user to have to create
    // packageable runtime and connection just to play with execution.
    return new ExecuteInput(clientVersion, lambda, mapping.path, serializeRuntime(runtime), prunedGraphData, new BaseExecutionContext() as unknown as Record<PropertyKey, unknown>);
  }

  getHashInfoAndModelDataFromEntities = async (entities: Entity[]): Promise<[Map<string, string>, MM_PureModelContextDataObject]> => {
    const hashMap = new Map<string, string>();
    const pureModelContextData = new PureModelContextData();
    await pureModelContextData.build(entities);
    await Promise.all(pureModelContextData.elements.map(element => promisify(() => hashMap.set(element.path, element.hashCode))));
    return [hashMap, pureModelContextData];
  }

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  getTypeFromProtocolType = (type: string): MM_PACKAGEABLE_ELEMENT_TYPE => {
    switch (type) {
      case PackageableElementType.CLASS: return MM_PACKAGEABLE_ELEMENT_TYPE.CLASS;
      case PackageableElementType.ASSOCIATION: return MM_PACKAGEABLE_ELEMENT_TYPE.ASSOCIATION;
      case PackageableElementType.ENUMERATION: return MM_PACKAGEABLE_ELEMENT_TYPE.ENUMERATION;
      case PackageableElementType.MEASURE: return MM_PACKAGEABLE_ELEMENT_TYPE.MEASURE;
      case PackageableElementType.PROFILE: return MM_PACKAGEABLE_ELEMENT_TYPE.PROFILE;
      case PackageableElementType.FUNCTION: return MM_PACKAGEABLE_ELEMENT_TYPE.FUNCTION;
      case PackageableElementType.MAPPING: return MM_PACKAGEABLE_ELEMENT_TYPE.MAPPING;
      case PackageableElementType.DIAGRAM: return MM_PACKAGEABLE_ELEMENT_TYPE.DIAGRAM;
      case PackageableElementType.TEXT: return MM_PACKAGEABLE_ELEMENT_TYPE.TEXT;
      case PackageableElementType.CONNECTION: return MM_PACKAGEABLE_ELEMENT_TYPE.CONNECTION;
      case PackageableElementType.RUNTIME: return MM_PACKAGEABLE_ELEMENT_TYPE.RUNTIME;
      case PackageableElementType.FILE_GENERATION: return MM_PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION;
      case PackageableElementType.GENERATION_SPECIFICATION: return MM_PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION;
      case PackageableElementType.SECTION_INDEX: return MM_PACKAGEABLE_ELEMENT_TYPE.SECTION_INDEX;
      default: throw new UnsupportedOperationError(`Unsupported protocol type '${type}'`);
    }
  }

  getGraphModelData = (graph: MM_PureModel): MM_PureModelContextDataObject => {
    const startTime = Date.now();
    const graphData = this.createBareModelData();
    graphData.elements = graph.allElements.map(e => this.getPackageableElementProtocol(e));
    Log.info(LOG_EVENT.GRAPH_META_MODEL_TO_PROTOCOL_TRANSFORMED, Date.now() - startTime, 'ms');
    return graphData;
  }

  getCompileContextModelData = (graph: MM_PureModel): MM_PureModelContextDataObject => {
    const startTime = Date.now();
    const graphData = this.createBareModelData();
    const dependencyManager = graph.dependencyManager;
    const generatedModel = graph.generationModel;
    graphData.elements = [...dependencyManager.allElements, ...generatedModel.allElements].map(e => this.getPackageableElementProtocol(e));
    Log.info(LOG_EVENT.GRAPH_COMPILE_CONTEXT_COLLECTED, Date.now() - startTime, 'ms');
    return graphData;
  }

  combineGraphModelData = (graphData1: MM_PureModelContextDataObject, graphData2: MM_PureModelContextDataObject): MM_PureModelContextDataObject => {
    const graphData = this.createBareModelData();
    graphData.elements = [...graphData1.elements, ...graphData2.elements];
    return graphData;
  }

  buildModelDataFromEntities = (entities: Entity[]): MM_PureModelContextDataObject => {
    const graphData = this.createBareModelData();
    graphData.elements = entities.map(e => e.content);
    return graphData;
  }

  /**
   * As mentioned, this method is needed because sometimes we want to parse and store protocol from grammar
   * However, we want to prune away the source information. There is no realy good way to do this, other than
   * hard-coding the source informations fields like this. We should cleanup these in the backend and use
   * pointer instead so source information is coupled with the value instead of having custom-name source information
   * field like these, polluting the protocol models.
   */
  pruneSourceInformation = (object: Record<PropertyKey, unknown>): Record<PropertyKey, unknown> => recursiveOmit(object, [
    SOURCE_INFORMATION_KEY,
    // connection
    'elementSourceInformation',
    'classSourceInformation',
    // diagram
    'classSourceInformation',
    'sourceViewSourceInformation',
    'targetViewSourceInformation',
    // domain
    'profileSourceInformation',
    'propertyTypeSourceInformation',
    // file generation
    'typeSourceInformation',
    // mapping
    'classSourceInformation',
    'sourceClassSourceInformation',
    'enumMappingIdSourceInformation',
    // service
    'mappingSourceInformation'
  ])

  HACKY_createParameterObject(name: string, type: string): object {
    return {
      '_type': 'var',
      'class': type,
      'multiplicity': {
        'lowerBound': 1,
        'upperBound': 1
      },
      'name': name,
    };
  }

  HACKY_createGraphFetchLambda(graphFetchTree: MM_GraphFetchTree, _class: MM_Class): MM_Lambda {
    const fetchTreeJson = serializeValueSpecification(graphFetchTree);
    return new MM_Lambda(
      [],
      [{
        '_type': 'func',
        'function': 'serialize',
        'parameters': [
          {
            '_type': 'func',
            'function': 'graphFetchChecked',
            'parameters': [
              {
                '_type': 'func',
                'function': 'getAll',
                'parameters': [
                  {
                    '_type': 'class',
                    'fullPath': _class.path
                  }
                ]
              },
              fetchTreeJson
            ]
          },
          fetchTreeJson
        ]
      }]
    );
  }

  HACKY_createGetAllLambda(_class: MM_Class): MM_Lambda {
    return new MM_Lambda(
      [],
      [{
        '_type': 'func',
        'function': 'getAll',
        'parameters': [
          {
            '_type': 'class',
            'fullPath': _class.path
          }
        ]
      }]
    );
  }

  HACKY_createAssertLambda(assertData: string): MM_Lambda {
    return new MM_Lambda(
      [
        {
          '_type': 'var',
          'class': 'meta::pure::mapping::Result',
          'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
          'name': 'res'
        }
      ],
      [
        {
          '_type': 'func',
          'function': 'equal',
          'parameters': [
            {
              '_type': 'func',
              'function': 'cast',
              'parameters': [
                {
                  '_type': 'property',
                  'parameters': [{ '_type': 'var', 'name': 'res' }],
                  'property': 'values'
                },
                { '_type': 'hackedClass', 'fullPath': 'String' }
              ]
            },
            {
              '_type': 'string',
              'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
              'values': [
                assertData
              ]
            }
          ]
        }
      ]
    );
  }

  HACKY_extractCheckedModelToModelAssertionResult(query: MM_Lambda): string | undefined {
    try {
      // TODO: for JSON surgery work like this, we might want to move this to ProtocolUtil
      const json = (((query.body as unknown[])[0] as FunctionValueSpecification).parameters[1] as { values: (string | undefined)[] }).values[0];
      assertTrue(typeof json === 'string', `Expected value of type 'string'`);
      return json;
    } catch (error) {
      return undefined;
    }
  }

  HACKY_extractAssertionString(query: MM_Lambda): string | undefined {
    const json = this.HACKY_extractCheckedModelToModelAssertionResult(query);
    if (!json) {
      /** Add other assertion cases if we read others */
    }
    return json;
  }

  HACKY_deriveGraphFetchTreeContentFromQuery(query: MM_Lambda, graph: MM_PureModel, parentElement?: MM_PackageableElement): MM_Class | MM_RootGraphFetchTree | undefined {
    try {
      assertTrue(Boolean(query.body));
      assertTrue(!(query.parameters as object[]).length);
      const body = query.body as object[];
      assertTrue(body.length === 1);
      assertTrue((body[0] as ValueSpecification)._type === ValueSpecificationType.FUNCTION);
      assertTrue((body[0] as FunctionValueSpecification).function === 'serialize');
      const parameters = (body[0] as FunctionValueSpecification).parameters;
      assertTrue(parameters.length !== 0);
      if (parameters.length === 2) {
        assertTrue((parameters[0] as ValueSpecification)._type === ValueSpecificationType.FUNCTION);
        assertTrue((parameters[0] as FunctionValueSpecification).function === 'graphFetchChecked');
        assertTrue((parameters[0] as FunctionValueSpecification).parameters.length === 2);
        assertTrue(((parameters[0] as FunctionValueSpecification).parameters[0] as ValueSpecification)._type === ValueSpecificationType.FUNCTION);
        assertTrue(((parameters[0] as FunctionValueSpecification).parameters[0] as FunctionValueSpecification).function === 'getAll');
        assertTrue((((parameters[0] as FunctionValueSpecification).parameters[0] as FunctionValueSpecification).parameters as ValueSpecification[]).length === 1);
        assertTrue((((parameters[0] as FunctionValueSpecification).parameters[0] as FunctionValueSpecification).parameters as ValueSpecification[])[0]._type === ValueSpecificationType.CLASS);
        assertTrue(((parameters[0] as FunctionValueSpecification).parameters[1] as ValueSpecification)._type === ValueSpecificationType.ROOT_GRAPH_FETCH_TREE);
        assertTrue((parameters[1] as ValueSpecification)._type === ValueSpecificationType.ROOT_GRAPH_FETCH_TREE);
        const data = parameters[1] as GraphFetchValueSpecification;
        assertTrue(data._type === ValueSpecificationType.ROOT_GRAPH_FETCH_TREE);
        const treeProtocol = deserialize(RootGraphFetchTree, data);
        const context = new GraphBuilderContextBuilder(graph).withSection(parentElement ? graph.getSection(parentElement.path) : undefined).build();
        return guaranteeType(treeProtocol.accept_ValueSpecificationVisitor(new ProtocolToMetaModelValueSpecificationVisitor(context)), MM_RootGraphFetchTree);
      } else if (parameters.length === 1) {
        assertTrue((parameters[0] as ValueSpecification)._type === ValueSpecificationType.CLASS);
        const data = parameters[0] as ClassValueSpecification;
        return graph.getClass(data.fullPath);
      }
      return undefined;
    } catch (error) {
      error.message = `Can't extract graph fetch tree content from query:\n${error.message}`;
      Log.warn(error);
      return undefined;
    }
  }

  HACKY_isGetAllLambda(query: MM_Lambda): boolean {
    try {
      assertTrue(Boolean(query.body));
      assertTrue(!(query.parameters as object[]).length);
      const body = query.body as object[];
      assertTrue(body.length === 1);
      assertTrue((body[0] as ValueSpecification)._type === ValueSpecificationType.FUNCTION);
      assertTrue((body[0] as FunctionValueSpecification).function === 'serialize');
      const parameters = (body[0] as FunctionValueSpecification).parameters;
      assertTrue(parameters.length === 1);
      assertTrue((parameters[0] as ValueSpecification)._type === ValueSpecificationType.CLASS);
      return true;
    } catch {
      return false;
    }
  }
}
