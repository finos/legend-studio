import { action, flowResult, makeObservable, observable } from 'mobx';
import {
  type EditorStore,
  LEGEND_STUDIO_LOG_EVENT_TYPE,
} from '@finos/legend-studio';
import {
  type V1_PureGraphManager,
  V1_entitiesToPureModelContextData,
  V1_PureModelContextData,
} from '@finos/legend-graph';
import { V1_MappingGenConfiguration } from '../models/protocols/pure/v1/model/V1_MappingGenConfiguration';
import { V1_generateRelationalMapping } from '../models/protocols/pure/v1/engine/V1_MappingGeneration_Engine';
import { assertErrorThrown, LogEvent } from '@finos/legend-shared';

export class MappingGenerationEditorState {
  editorStore: EditorStore;
  sourceMapping?: string | undefined;
  mappingToRegenerate?: string | undefined;
  mappingNewName?: string | undefined;
  storeNewName?: string | undefined;
  m2mAdditionalMappings: string[] = [];
  isGenerating = false;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
    makeObservable(this, {
      sourceMapping: observable,
      mappingToRegenerate: observable,
      mappingNewName: observable,
      storeNewName: observable,
      m2mAdditionalMappings: observable,
      isGenerating: observable,
      setSourceMapping: action,
      setMappingToRegenerate: action,
      setMappingName: action,
      setStoreName: action,
      setM2mAdditionalMappings: action,
    });
  }

  setSourceMapping(sourceMapping: string | undefined): void {
    this.sourceMapping = sourceMapping;
  }

  setMappingToRegenerate(mappingToRegenerate: string | undefined): void {
    this.mappingToRegenerate = mappingToRegenerate;
  }

  setMappingName(mappingNewName: string | undefined): void {
    this.mappingNewName = mappingNewName;
  }

  setStoreName(storeNewName: string | undefined): void {
    this.storeNewName = storeNewName;
  }

  setM2mAdditionalMappings(m2mAdditionalMappings: string[]): void {
    this.m2mAdditionalMappings = m2mAdditionalMappings;
  }

  generate = async (): Promise<void> => {
    try {
      this.isGenerating = true;
      const engine = (
        this.editorStore.graphManagerState.graphManager as V1_PureGraphManager
      ).engine;
      this.editorStore.modelLoaderState.setModelText('');
      const config = new V1_MappingGenConfiguration(
        this.sourceMapping,
        this.mappingToRegenerate,
        this.mappingNewName,
        this.storeNewName,
        this.m2mAdditionalMappings,
      );

      const model = await this.transformModelToPureModelContext();
      // const model = (this.editorStore.graphManagerState.graphManager as V1_PureGraphManager).getFullGraphModelData(this.editorStore.graphManagerState.graph);
      const pmcd = await V1_generateRelationalMapping(engine, config, model);

      const generatedModelGrammar = await flowResult(
        engine.pureModelContextDataToPureCode(pmcd),
      );

      this.editorStore.modelLoaderState.setModelText(generatedModelGrammar);
      this.isGenerating = false;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_LOG_EVENT_TYPE.GENERATION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.isGenerating = false;
    }
  };

  private transformModelToPureModelContext =
    async (): Promise<V1_PureModelContextData> => {
      const transformedEntities =
        this.editorStore.graphManagerState.graph.allOwnElements.map((element) =>
          this.editorStore.graphManagerState.graphManager.elementToEntity(
            element,
          ),
        );
      const graphData = new V1_PureModelContextData();
      await V1_entitiesToPureModelContextData(
        transformedEntities,
        graphData,
        this.editorStore.graphManagerState.graphManager.pluginManager.getPureProtocolProcessorPlugins(),
      );
      return graphData;
    };
}
