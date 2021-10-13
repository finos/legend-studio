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
import {
  StudioPlugin,
  UnsupportedElementEditorState,
} from '@finos/legend-studio';
import type {
  StudioPluginManager,
  NewElementFromStateCreator,
  EditorStore,
  ElementEditorState,
  ElementEditorStateCreator,
  ElementTypeGetter,
  ElementProjectExplorerDnDTypeGetter,
  DSL_StudioPlugin_Extension,
  NewElementState,
} from '@finos/legend-studio';
import type { PackageableElement } from '@finos/legend-graph';
import { ServiceStore } from '../models/metamodels/pure/model/packageableElements/store/serviceStore/model/ServiceStore';

const SERVICE_STORE_ELEMENT_TYPE = 'SERVICESTORE';
const SERVICE_STORE_ELEMENT_PROJECT_EXPLORER_DND_TYPE =
  'PROJECT_EXPLORER_SERVICE_STORE';

export class DSLServiceStore_StudioPlugin
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
    return [SERVICE_STORE_ELEMENT_TYPE];
  }

  getExtraElementTypeGetters(): ElementTypeGetter[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof ServiceStore) {
          return SERVICE_STORE_ELEMENT_TYPE;
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
        if (type === SERVICE_STORE_ELEMENT_TYPE) {
          return new ServiceStore(name);
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
        if (element instanceof ServiceStore) {
          return new UnsupportedElementEditorState(editorStore, element);
        }
        return undefined;
      },
    ];
  }

  getExtraElementProjectExplorerDnDTypeGetters(): ElementProjectExplorerDnDTypeGetter[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof ServiceStore) {
          return SERVICE_STORE_ELEMENT_PROJECT_EXPLORER_DND_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraGrammarTextEditorDnDTypes(): string[] {
    return [SERVICE_STORE_ELEMENT_PROJECT_EXPLORER_DND_TYPE];
  }
}
