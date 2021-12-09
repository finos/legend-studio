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
  LegendStudioPlugin,
  UnsupportedElementEditorState,
  UnsupportedInstanceSetImplementationState,
} from '@finos/legend-studio';
import type {
  NewElementFromStateCreator,
  RuntimeConnectionTooltipTextBuilder,
  EditorStore,
  ElementEditorState,
  ElementEditorStateCreator,
  ElementTypeGetter,
  ElementProjectExplorerDnDTypeGetter,
  NewElementState,
  DSLMapping_LegendStudioPlugin_Extension,
  SetImplemtationClassifier,
  MappingElementStateCreator,
  MappingElement,
  MappingElementState,
  MappingElementSourceGetter,
  MappingElementSource,
  ElementIconGetter,
} from '@finos/legend-studio';
import { SwaggerIcon } from '@finos/legend-art';
import type {
  Connection,
  PackageableElement,
  SetImplementation,
} from '@finos/legend-graph';
import { ServiceStore } from '../models/metamodels/pure/model/packageableElements/store/serviceStore/model/ServiceStore';
import { RootServiceInstanceSetImplementation } from '../models/metamodels/pure/model/packageableElements/store/serviceStore/mapping/RootServiceInstanceSetImplementation';
import { ServiceStoreConnection } from '../models/metamodels/pure/model/packageableElements/store/serviceStore/connection/ServiceStoreConnection';

const SERVICE_STORE_ELEMENT_TYPE = 'SERVICE_STORE';
const SERVICE_STORE_ELEMENT_PROJECT_EXPLORER_DND_TYPE =
  'PROJECT_EXPLORER_SERVICE_STORE';
const SERVICE_STORE_MAPPING_TYPE = 'serviceStore';

export class ESService_LegendStudioPlugin
  extends LegendStudioPlugin
  implements DSLMapping_LegendStudioPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.studioPlugin, packageJson.version);
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

  getExtraElementIconGetters(): ElementIconGetter[] {
    return [
      (type: string): React.ReactNode | undefined => {
        if (type === SERVICE_STORE_ELEMENT_TYPE) {
          return (
            <div
              className="icon"
              style={{
                color: 'var(--color-light-grey-50)',
              }}
            >
              <SwaggerIcon />
            </div>
          );
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

  getExtraSetImplementationClassifiers(): SetImplemtationClassifier[] {
    return [
      (setImplementation: SetImplementation): string | undefined => {
        if (setImplementation instanceof RootServiceInstanceSetImplementation) {
          return SERVICE_STORE_MAPPING_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraMappingElementStateCreators(): MappingElementStateCreator[] {
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

  getExtraMappingElementSourceGetters(): MappingElementSourceGetter[] {
    return [
      (mappingElement: MappingElement): MappingElementSource | undefined => {
        if (mappingElement instanceof RootServiceInstanceSetImplementation) {
          return mappingElement.class.value;
        }
        return undefined;
      },
    ];
  }

  getExtraRuntimeConnectionTooltipTextBuilders(): RuntimeConnectionTooltipTextBuilder[] {
    return [
      (connection: Connection): string | undefined => {
        if (connection instanceof ServiceStoreConnection) {
          return `Service store connection \u2022 store ${connection.store.value.path}`;
        }
        return undefined;
      },
    ];
  }
}
