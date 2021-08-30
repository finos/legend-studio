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
import { StudioPlugin } from '@finos/legend-studio';
import type {
  StudioPluginManager,
  NewElementFromStateCreator,
  EditorStore,
  ElementEditorState,
  ElementEditorStateCreator,
  ElementTypeGetter,
  ElementProjectExplorerDnDTypeGetter,
  ElementIconGetter,
  ElementEditorRenderer,
  DSL_StudioPlugin_Extension,
  NewElementState,
} from '@finos/legend-studio';
import { FileIcon } from '@finos/legend-art';
import { TextEditorState } from '../stores/TextEditorState';
import { TextElementEditor } from './TextElementEditor';
import type { PackageableElement } from '@finos/legend-graph';
import { Text } from '../models/metamodels/pure/model/packageableElements/Text';

const TEXT_ELEMENT_TYPE = 'TEXT';
const TEXT_ELEMENT_PROJECT_EXPLORER_DND_TYPE = 'PROJECT_EXPLORER_TEXT';

export class DSLText_StudioPlugin
  extends StudioPlugin
  implements DSL_StudioPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.studioPlugin, packageJson.version);
  }

  install(pluginManager: StudioPluginManager): void {
    pluginManager.registerStudioPlugin(this);
  }

  getExtraSupportedElementTypes(): string[] {
    return [TEXT_ELEMENT_TYPE];
  }

  getExtraElementTypeGetters(): ElementTypeGetter[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof Text) {
          return TEXT_ELEMENT_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraElementIconGetters(): ElementIconGetter[] {
    return [
      (type: string): React.ReactNode | undefined => {
        if (type === TEXT_ELEMENT_TYPE) {
          return (
            <div className="icon icon--text-element">
              <FileIcon />
            </div>
          );
        }
        return undefined;
      },
    ];
  }

  getExtraElementEditorRenderers(): ElementEditorRenderer[] {
    return [
      (elementEditorState: ElementEditorState): React.ReactNode | undefined => {
        if (elementEditorState instanceof TextEditorState) {
          return <TextElementEditor key={elementEditorState.uuid} />;
        }
        return undefined;
      },
    ];
  }

  getExtraNewElementFromStateCreators(): NewElementFromStateCreator[] {
    return [
      (
        type: string,
        name: string,
        state: NewElementState,
      ): PackageableElement | undefined => {
        if (type === TEXT_ELEMENT_TYPE) {
          return new Text(name);
        }
        return undefined;
      },
    ];
  }

  getExtraElementEditorStateCreators(): ElementEditorStateCreator[] {
    return [
      (
        editorStore: EditorStore,
        element: PackageableElement,
      ): ElementEditorState | undefined => {
        if (element instanceof Text) {
          return new TextEditorState(editorStore, element);
        }
        return undefined;
      },
    ];
  }

  getExtraElementProjectExplorerDnDTypeGetters(): ElementProjectExplorerDnDTypeGetter[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof Text) {
          return TEXT_ELEMENT_PROJECT_EXPLORER_DND_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraGrammarTextEditorDnDTypes(): string[] {
    return [TEXT_ELEMENT_PROJECT_EXPLORER_DND_TYPE];
  }
}
