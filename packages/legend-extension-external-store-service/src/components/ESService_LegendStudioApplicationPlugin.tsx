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
  LegendStudioApplicationPlugin,
  UnsupportedElementEditorState,
  UnsupportedInstanceSetImplementationState,
  type NewElementFromStateCreator,
  type RuntimeConnectionTooltipTextBuilder,
  type EditorStore,
  type ElementEditorState,
  type ElementEditorStateCreator,
  type ElementTypeGetter,
  type ElementProjectExplorerDnDTypeGetter,
  type NewElementState,
  type DSLMapping_LegendStudioApplicationPlugin_Extension,
  type SetImplemtationClassifier,
  type MappingElementStateCreator,
  type MappingElement,
  type MappingElementState,
  type MappingElementSourceExtractor,
  type ElementIconGetter,
  type DSLData_LegendStudioApplicationPlugin_Extension,
  type EmbeddedDataTypeOption,
  type PureGrammarTextSuggestion,
  type PureGrammarParserElementSnippetSuggestionsGetter,
  type PureGrammarParserKeywordSuggestionGetter,
  type PureGrammarParserDocumentationGetter,
  type PureGrammarParserElementDocumentationGetter,
  type EmbeddedDataSnippetSuggestion,
  type EmbeddedDataEditorStateBuilder,
  type EmbeddedDataState,
  type EmbeddedDataEditorRenderer,
  type EmbeddedDataCreator,
  type MappingElementSource,
} from '@finos/legend-application-studio';
import { SwaggerIcon } from '@finos/legend-art';
import type {
  Connection,
  EmbeddedData,
  PackageableElement,
  SetImplementation,
} from '@finos/legend-graph';
import { ServiceStore } from '../models/metamodels/pure/model/packageableElements/store/serviceStore/model/ESService_ServiceStore.js';
import { RootServiceInstanceSetImplementation } from '../models/metamodels/pure/model/packageableElements/store/serviceStore/mapping/ESService_RootServiceInstanceSetImplementation.js';
import { ServiceStoreConnection } from '../models/metamodels/pure/model/packageableElements/store/serviceStore/connection/ESService_ServiceStoreConnection.js';
import {
  PURE_GRAMMAR_SERVICE_STORE_ELEMENT_TYPE_LABEL,
  PURE_GRAMMAR_SERVICE_STORE_PARSER_NAME,
} from '../graphManager/ESService_PureGraphManagerPlugin.js';
import { EXTERNAL_STORE_SERVICE_LEGEND_STUDIO_DOCUMENTATION_KEY } from './ESService_LegendStudioDocumentation.js';
import {
  BLANK_SERVICE_STORE_SNIPPET,
  SERVICE_STORE_EMBEDDED_DATA,
  SERVICE_STORE_WITH_DESCRIPTION,
  SERVICE_STORE_WITH_SERVICE,
  SERVICE_STORE_WITH_SERVICE_GROUP,
} from './ESService_CodeSnippets.js';
import { ServiceStoreEmbeddedData } from '../models/metamodels/pure/model/data/ESService_ServiceStoreEmbeddedData.js';
import { ServiceStoreEmbeddedDataState } from '../stores/studio/ESService_ServiceStoreEmbeddedDataEditorState.js';
import { ServiceStoreEmbeddedDataEditor } from './ESService_ServiceStoreEmbeddedData.js';
import type { DocumentationEntry } from '@finos/legend-application';

const SERVICE_STORE_ELEMENT_TYPE = 'SERVICE_STORE';
const SERVICE_STORE_ELEMENT_PROJECT_EXPLORER_DND_TYPE =
  'PROJECT_EXPLORER_SERVICE_STORE';
const SERVICE_STORE_MAPPING_TYPE = 'serviceStore';
const SERVICE_STORE_EMBEDDED_DATA_TYPE = 'ServiceStore';

export class ESService_LegendStudioApplicationPlugin
  extends LegendStudioApplicationPlugin
  implements
    DSLMapping_LegendStudioApplicationPlugin_Extension,
    DSLData_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.applicationStudioPlugin, packageJson.version);
  }

  override getExtraRequiredDocumentationKeys(): string[] {
    return [
      EXTERNAL_STORE_SERVICE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_SERVICE_STORE,
      EXTERNAL_STORE_SERVICE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
    ];
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

  getExtraPureGrammarTextEditorDnDTypes(): string[] {
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

  getExtraMappingElementSourceExtractors(): MappingElementSourceExtractor[] {
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

  getExtraEmbeddedDataTypeOptions(): EmbeddedDataTypeOption[] {
    return [
      {
        value: SERVICE_STORE_EMBEDDED_DATA_TYPE,
        label: SERVICE_STORE_EMBEDDED_DATA_TYPE,
      },
    ];
  }

  getExtraPureGrammarParserElementDocumentationGetters(): PureGrammarParserElementDocumentationGetter[] {
    return [
      (
        editorStore: EditorStore,
        parserKeyword: string,
        elementKeyword: string,
      ): DocumentationEntry | undefined => {
        if (parserKeyword === PURE_GRAMMAR_SERVICE_STORE_PARSER_NAME) {
          if (
            elementKeyword === PURE_GRAMMAR_SERVICE_STORE_ELEMENT_TYPE_LABEL
          ) {
            return editorStore.applicationStore.documentationService.getDocEntry(
              EXTERNAL_STORE_SERVICE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_SERVICE_STORE,
            );
          }
        }
        return undefined;
      },
    ];
  }

  getExtraPureGrammarParserDocumentationGetters(): PureGrammarParserDocumentationGetter[] {
    return [
      (
        editorStore: EditorStore,
        parserKeyword: string,
      ): DocumentationEntry | undefined => {
        if (parserKeyword === PURE_GRAMMAR_SERVICE_STORE_PARSER_NAME) {
          return editorStore.applicationStore.documentationService.getDocEntry(
            EXTERNAL_STORE_SERVICE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
          );
        }
        return undefined;
      },
    ];
  }

  getExtraPureGrammarParserKeywordSuggestionGetters(): PureGrammarParserKeywordSuggestionGetter[] {
    return [
      (editorStore: EditorStore): PureGrammarTextSuggestion[] => [
        {
          text: PURE_GRAMMAR_SERVICE_STORE_PARSER_NAME,
          description: `(external store)`,
          documentation:
            editorStore.applicationStore.documentationService.getDocEntry(
              EXTERNAL_STORE_SERVICE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
            ),
          insertText: PURE_GRAMMAR_SERVICE_STORE_PARSER_NAME,
        },
      ],
    ];
  }

  getExtraPureGrammarParserElementSnippetSuggestionsGetters(): PureGrammarParserElementSnippetSuggestionsGetter[] {
    return [
      (
        editorStore: EditorStore,
        parserKeyword: string,
      ): PureGrammarTextSuggestion[] | undefined =>
        parserKeyword === PURE_GRAMMAR_SERVICE_STORE_PARSER_NAME
          ? [
              {
                text: PURE_GRAMMAR_SERVICE_STORE_ELEMENT_TYPE_LABEL,
                description: '(blank)',
                insertText: BLANK_SERVICE_STORE_SNIPPET,
              },
              {
                text: PURE_GRAMMAR_SERVICE_STORE_ELEMENT_TYPE_LABEL,
                description: 'with service',
                insertText: SERVICE_STORE_WITH_SERVICE,
              },
              {
                text: PURE_GRAMMAR_SERVICE_STORE_ELEMENT_TYPE_LABEL,
                description: 'with service group',
                insertText: SERVICE_STORE_WITH_SERVICE_GROUP,
              },
              {
                text: PURE_GRAMMAR_SERVICE_STORE_ELEMENT_TYPE_LABEL,
                description: 'with description',
                insertText: SERVICE_STORE_WITH_DESCRIPTION,
              },
            ]
          : undefined,
    ];
  }

  getExtraEmbeddedDataSnippetSuggestions(): EmbeddedDataSnippetSuggestion[] {
    return [
      {
        description: 'using service store',
        text: SERVICE_STORE_EMBEDDED_DATA,
      },
    ];
  }

  getExtraEmbeddedDataEditorStateBuilders(): EmbeddedDataEditorStateBuilder[] {
    return [
      (
        editorStore: EditorStore,
        embeddedData: EmbeddedData,
      ): EmbeddedDataState | undefined => {
        if (embeddedData instanceof ServiceStoreEmbeddedData) {
          return new ServiceStoreEmbeddedDataState(editorStore, embeddedData);
        }
        return undefined;
      },
    ];
  }

  getExtraEmbeddedDataEditorRenderers(): EmbeddedDataEditorRenderer[] {
    return [
      (
        embeddedDataState: EmbeddedDataState,
        isReadOnly: boolean,
      ): React.ReactNode | undefined => {
        if (embeddedDataState instanceof ServiceStoreEmbeddedDataState) {
          return (
            <ServiceStoreEmbeddedDataEditor
              serviceStoreEmbeddedDataState={embeddedDataState}
              isReadOnly={isReadOnly}
            />
          );
        }
        return undefined;
      },
    ];
  }

  getExtraEmbeddedDataCreators(): EmbeddedDataCreator[] {
    return [
      (embeddedDataType: string): EmbeddedData | undefined => {
        if (embeddedDataType === SERVICE_STORE_EMBEDDED_DATA_TYPE) {
          const serviceStoreEmbeddedData = new ServiceStoreEmbeddedData();
          return serviceStoreEmbeddedData;
        }
        return undefined;
      },
    ];
  }
}
