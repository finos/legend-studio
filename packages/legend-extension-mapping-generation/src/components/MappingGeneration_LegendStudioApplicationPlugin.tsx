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

import packageJson from '../../package.json';
import { MappingGenerationEditor } from './MappingGenerationEditor.js';
import { MappingGenerationEditorState } from '../stores/MappingGenerationEditorState.js';
import {
  type EditorStore,
  type DSLMapping_LegendStudioApplicationPlugin_Extension,
  type ModelLoaderExtensionConfiguration,
  LegendStudioApplicationPlugin,
} from '@finos/legend-studio';
import type { Entity } from '@finos/legend-model-storage';
import { EntityChangeType } from '@finos/legend-server-sdlc';

const GENERATION_TYPE_NAME = `RELATIONAL_MAPPING_GENERATION`;

export class MappingGeneration_LegendStudioApplicationPlugin
  extends LegendStudioApplicationPlugin
  implements DSLMapping_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.applicationStudioPlugin, packageJson.version);
  }

  override getExtraModelLoaderExtensionConfigurations(): ModelLoaderExtensionConfiguration[] {
    return [
      {
        modelGenerationConfig: { key: GENERATION_TYPE_NAME },
        load: async (editorStore: EditorStore): Promise<void> => {
          const modelLoaderState = editorStore.modelLoaderState;
          if (modelLoaderState.modelText.length > 0) {
            const entities: Entity[] =
              await editorStore.graphManagerState.graphManager.pureCodeToEntities(
                modelLoaderState.modelText,
              );
            const newEntities = entities.map((e) => ({
              type: EntityChangeType.CREATE,
              entityPath: e.path,
              content: e.content,
            }));
            await editorStore.graphState.loadEntityChangesToGraph(
              newEntities,
              undefined,
            );
            editorStore.applicationStore.notifySuccess(
              'Generated elements imported into project',
            );
          } else {
            editorStore.applicationStore.notifyWarning(
              'There is no generation code to import into project',
            );
          }
        },
        renderer: (editorStore: EditorStore): React.ReactNode | undefined => {
          const state = new MappingGenerationEditorState(editorStore, {
            key: GENERATION_TYPE_NAME,
          });
          return (
            <MappingGenerationEditor mappingGenerationEditorState={state} />
          );
        },
      },
    ];
  }
}
