import packageJson from '../../package.json';
import { MappingGenerationEditor } from './MappingGenerationEditor';
import { MappingGenerationEditorState } from '../stores/MappingGenerationEditorState';
import {
  type EditorStore,
  type DSLMapping_LegendStudioPlugin_Extension,
  type ModelLoaderExtensionConfiguration,
  LegendStudioPlugin,
} from '@finos/legend-studio';
import { assertErrorThrown, LogEvent } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-model-storage';

const GENERATION_TYPE_NAME = `RELATIONAL_MAPPING_GENERATION`;
const GENERATION_TYPE_FAILURE = `RELATIONAL_MAPPING_GENERATION_FAILURE`;

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
        key: GENERATION_TYPE_NAME,
        load: async (editorStore: EditorStore): Promise<void> => {
          const modelLoaderState = editorStore.modelLoaderState;
          try {
            modelLoaderState.isLoadingModel = true;
            if (modelLoaderState.modelText.length > 0) {
              const entities: Entity[] =
                await editorStore.graphManagerState.graphManager.pureCodeToEntities(
                  modelLoaderState.modelText,
                );
              const message = `loading entities from ${
                editorStore.applicationStore.config.appName
              } [${modelLoaderState.replace ? `potentially affected ` : ''} ${
                entities.length
              } entities]`;
              await editorStore.sdlcServerClient.updateEntities(
                editorStore.sdlcState.activeProject.projectId,
                editorStore.sdlcState.activeWorkspace,
                {
                  replace: modelLoaderState.replace,
                  entities,
                  message,
                },
              );
              editorStore.applicationStore.notifySuccess(
                'Generated elements imported into project',
              );
              editorStore.modelLoaderState.setModelText('');
            } else {
              editorStore.applicationStore.notifyWarning(
                'There is no generation code to import into project',
              );
            }
          } catch (error) {
            assertErrorThrown(error);
            editorStore.applicationStore.log.error(
              LogEvent.create(GENERATION_TYPE_FAILURE),
              error,
            );
            editorStore.applicationStore.notifyError(error);
          } finally {
            modelLoaderState.isLoadingModel = false;
          }
        },
        renderer: (editorStore: EditorStore): React.ReactNode | undefined => {
          const state = new MappingGenerationEditorState(editorStore);
          return (
            <MappingGenerationEditor mappingGenerationEditorState={state} />
          );
        },
      },
    ];
  }
}
