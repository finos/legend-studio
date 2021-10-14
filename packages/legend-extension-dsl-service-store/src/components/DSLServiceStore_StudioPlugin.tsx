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
  NewElementState,
  DSLMapping_StudioPlugin_Extension,
  SetImplemtationType,
  CreateMappingElementState,
  MappingElementSources,
} from '@finos/legend-studio';
import type { PackageableElement } from '@finos/legend-graph';
import { ServiceStore } from '../models/metamodels/pure/model/packageableElements/store/serviceStore/model/ServiceStore';
import type { SetImplementation } from '@finos/legend-graph';
import { RootServiceInstanceSetImplementation } from '../models/metamodels/pure/model/packageableElements/store/serviceStore/mapping/RootServiceInstanceSetImplementation';
import type { MappingElement } from '@finos/legend-studio';
import type { MappingElementState } from '@finos/legend-studio';
import { UnsupportedInstanceSetImplementationState } from '@finos/legend-studio';
import type { MappingElementSource } from '@finos/legend-studio';
import {Class} from "@finos/legend-graph";

const SERVICE_STORE_ELEMENT_TYPE = 'SERVICESTORE';
const SERVICE_STORE_ELEMENT_PROJECT_EXPLORER_DND_TYPE =
  'PROJECT_EXPLORER_SERVICE_STORE';
const SERVICE_STORE_MAPPING_TYPE = 'serviceStore';

export class DSLServiceStore_StudioPlugin
  extends StudioPlugin
  implements DSLMapping_StudioPlugin_Extension
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

  getExtraSetImplementationTypes(): SetImplemtationType[] {
    return [
      (setImplementation: SetImplementation): string | undefined => {
        if (setImplementation instanceof RootServiceInstanceSetImplementation) {
          return SERVICE_STORE_MAPPING_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraCreateMappingElementStates(): CreateMappingElementState[] {
    return [
      (
        mappingElement: MappingElement | undefined,
        editorStore: EditorStore,
      ): MappingElementState | undefined => {
        if (
          mappingElement !== undefined &&
          mappingElement instanceof RootServiceInstanceSetImplementation
        ) {
          return new UnsupportedInstanceSetImplementationState(
            editorStore,
            mappingElement,
          );
        }
        return undefined;
      },
    ];
  }

  getExtraMappingElementSources(): MappingElementSources[] {
    return [
      (mappingElement: MappingElement): MappingElementSource | undefined => {
        if (mappingElement instanceof RootServiceInstanceSetImplementation) {
          return mappingElement.class.value;
        }
        return undefined;
      },
    ];
  }
}
