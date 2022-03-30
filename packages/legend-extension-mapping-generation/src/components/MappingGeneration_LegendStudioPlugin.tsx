import packageJson from '../../package.json';
import { MappingGenerationEditor } from './MappingGenerationEditor';
import { MappingGenerationEditorState } from '../stores/MappingGenerationEditorState';
import {
  type EditorStore,
  type DSLMapping_LegendStudioPlugin_Extension,
  type ModelLoaderExtensionConfiguration,
  LegendStudioPlugin,
} from '@finos/legend-studio';
import type { Entity } from '@finos/legend-model-storage';

const GENERATION_TYPE_NAME = `RELATIONAL_MAPPING_GENERATION`;

export class MappingGeneration_LegendStudioPlugin
  extends LegendStudioPlugin
  implements DSLMapping_LegendStudioPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.studioPlugin, packageJson.version);
  }

  override getExtraModelLoaderExtensionConfigurations(): ModelLoaderExtensionConfiguration[] {
    return [
      {
        modelGenerationConfig: { key: GENERATION_TYPE_NAME },
        load: async (editorStore: EditorStore): Promise<Entity[]> => {
          const modelLoaderState = editorStore.modelLoaderState;
          if (modelLoaderState.modelText.length > 0) {
            const entities: Entity[] =
              await editorStore.graphManagerState.graphManager.pureCodeToEntities(
                modelLoaderState.modelText,
              );
            return entities;
          } else {
            editorStore.applicationStore.notifyWarning(
              'There is no generation code to import into project',
            );
            return [];
          }
        },
        renderer: (editorStore: EditorStore): React.ReactNode | undefined => {
          const state = new MappingGenerationEditorState(editorStore,
            { key: GENERATION_TYPE_NAME });
          return (
            <MappingGenerationEditor mappingGenerationEditorState={state} />
          );
        },
      },
    ];
  }
}
