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

import packageJson from '../../../package.json' with { type: 'json' };
import {
  UnsupportedElementEditorState,
  UnsupportedInstanceSetImplementationState,
  LegendStudioApplicationPlugin,
  type NewElementFromStateCreator,
  type RuntimeConnectionTooltipTextBuilder,
  type NewConnectionSnippetSuggestion,
  type ConnectionValueState,
  type ConnectionEditorRenderer,
  type ConnectionValueEditorStateBuilder,
  type NewConnectionDriverCreator,
  type EditorStore,
  type ElementEditorState,
  type ElementEditorStateCreator,
  type ElementClassifier,
  type DragElementClassifier,
  type DefaultConnectionValueBuilder,
  type NewConnectionValueDriver,
  type NewElementState,
  type DSL_Mapping_LegendStudioApplicationPlugin_Extension,
  type MappingElementStateCreator,
  type MappingElement,
  type MappingElementState,
  type MappingElementSourceExtractor,
  type ElementIconGetter,
  type DSL_Data_LegendStudioApplicationPlugin_Extension,
  type EmbeddedDataTypeOption,
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
  type ConnectionTypeOption,
  type PureGrammarConnectionLabeler,
  type EmbeddedDataTypeFromConnectionMatcher,
  type StoreTestDataCreators,
  type EmbeddedDataCloner,
  PACKAGEABLE_ELEMENT_GROUP_BY_CATEGORY,
} from '@finos/legend-application-studio';
import { SwaggerIcon } from '@finos/legend-art';
import {
  type Connection,
  type EmbeddedData,
  type PackageableElement,
  type Store,
  type SetImplementation,
  PackageableElementExplicitReference,
  StoreTestData,
} from '@finos/legend-graph';
import { ServiceStore } from '../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_ServiceStore.js';
import { RootServiceInstanceSetImplementation } from '../../graph/metamodel/pure/model/packageableElements/store/serviceStore/mapping/STO_ServiceStore_RootServiceInstanceSetImplementation.js';
import { ServiceStoreConnection } from '../../graph/metamodel/pure/model/packageableElements/store/serviceStore/connection/STO_ServiceStore_ServiceStoreConnection.js';
import { EXTERNAL_STORE_SERVICE_LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../__lib__/studio/STO_ServiceStore_LegendStudioDocumentation.js';
import {
  BLANK_SERVICE_STORE_SNIPPET,
  SERVICE_STORE_EMBEDDED_DATA,
  SERVICE_STORE_WITH_DESCRIPTION,
  SERVICE_STORE_WITH_SERVICE,
  SERVICE_STORE_WITH_SERVICE_GROUP,
  SERVICE_STORE_CONNECTION_SNIPPET,
} from '../../__lib__/studio/STO_ServiceStore_CodeSnippets.js';
import { ServiceStoreEmbeddedData } from '../../graph/metamodel/pure/model/data/STO_ServiceStore_ServiceStoreEmbeddedData.js';
import { ServiceStoreEmbeddedDataState } from '../../stores/studio/STO_ServiceStore_ServiceStoreEmbeddedDataEditorState.js';
import { ServiceStoreEmbeddedDataEditor } from './ServiceStoreEmbeddedDataEditor.js';
import {
  ServiceStoreConnectionValueState,
  ServiceStoreConnectionEditor,
  NewServiceStoreConnectionDriver,
} from './ServiceStoreElementEditor.js';
import { prettyCONSTName, type DocumentationEntry } from '@finos/legend-shared';
import type { PureGrammarTextSuggestion } from '@finos/legend-code-editor';

const SERVICE_STORE_ELEMENT_TYPE = 'SERVICE_STORE';
const SERVICE_STORE_ELEMENT_PROJECT_EXPLORER_DND_TYPE =
  'PROJECT_EXPLORER_SERVICE_STORE';
const SERVICE_STORE_EMBEDDED_DATA_TYPE = 'ServiceStore';
export const SERVICE_STORE_CONNECTION = 'SERVICE_STORE_CONNECTION';

const PURE_GRAMMAR_SERVICE_STORE_PARSER_NAME = 'ServiceStore';
const PURE_GRAMMAR_SERVICE_STORE_ELEMENT_TYPE_LABEL = 'ServiceStore';
const PURE_GRAMMAR_SERVICE_STORE_CONNECTION_TYPE_LABEL =
  'ServiceStoreConnection';
const PURE_GRAMMAR_SERVICE_STORE_SERVICE_GROUP_LABEL = 'ServiceGroup';

export class STO_ServiceStore_LegendStudioApplicationPlugin
  extends LegendStudioApplicationPlugin
  implements
    DSL_Mapping_LegendStudioApplicationPlugin_Extension,
    DSL_Data_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.applicationStudioPlugin, packageJson.version);
  }

  override getExtraRequiredDocumentationKeys(): string[] {
    return [
      EXTERNAL_STORE_SERVICE_LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_SERVICE_STORE,
      EXTERNAL_STORE_SERVICE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
    ];
  }

  getExtraPureGrammarKeywords(): string[] {
    return [
      PURE_GRAMMAR_SERVICE_STORE_ELEMENT_TYPE_LABEL,
      PURE_GRAMMAR_SERVICE_STORE_CONNECTION_TYPE_LABEL,
      PURE_GRAMMAR_SERVICE_STORE_SERVICE_GROUP_LABEL,
    ];
  }

  getExtraPureGrammarConnectionLabelers(): PureGrammarConnectionLabeler[] {
    return [
      (connection): string | undefined => {
        if (connection instanceof ServiceStoreConnection) {
          return PURE_GRAMMAR_SERVICE_STORE_CONNECTION_TYPE_LABEL;
        }
        return undefined;
      },
    ];
  }

  getExtraSupportedElementTypes(): string[] {
    return [SERVICE_STORE_ELEMENT_TYPE];
  }

  getExtraSupportedElementTypesWithCategory?(): Map<string, string[]> {
    const elementTypesWithCategoryMap = new Map<string, string[]>();
    elementTypesWithCategoryMap.set(
      PACKAGEABLE_ELEMENT_GROUP_BY_CATEGORY.STORE,
      [SERVICE_STORE_ELEMENT_TYPE],
    );
    return elementTypesWithCategoryMap;
  }

  getExtraElementClassifiers(): ElementClassifier[] {
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

  getExtraDragElementClassifiers(): DragElementClassifier[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof ServiceStore) {
          return SERVICE_STORE_ELEMENT_PROJECT_EXPLORER_DND_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraPureGrammarTextEditorDragElementTypes(): string[] {
    return [SERVICE_STORE_ELEMENT_PROJECT_EXPLORER_DND_TYPE];
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
      (mappingElement: MappingElement): MappingElementSource => {
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

  getExtraDefaultConnectionValueBuilders(): DefaultConnectionValueBuilder[] {
    return [
      (store: Store): Connection | undefined => {
        if (store instanceof ServiceStore) {
          const serviceStoreConnection = new ServiceStoreConnection(
            PackageableElementExplicitReference.create(store),
          );
          serviceStoreConnection.baseUrl = '';
          return serviceStoreConnection;
        }
        return undefined;
      },
    ];
  }

  getExtraConnectionValueEditorStateBuilders(): ConnectionValueEditorStateBuilder[] {
    return [
      (
        editorStore: EditorStore,
        connection: Connection,
      ): ConnectionValueState | undefined => {
        if (connection instanceof ServiceStoreConnection) {
          return new ServiceStoreConnectionValueState(editorStore, connection);
        }
        return undefined;
      },
    ];
  }

  getExtraConnectionEditorRenderers(): ConnectionEditorRenderer[] {
    return [
      (
        connectionValueState: ConnectionValueState,
        isReadOnly: boolean,
      ): React.ReactNode | undefined => {
        if (connectionValueState instanceof ServiceStoreConnectionValueState) {
          return (
            <ServiceStoreConnectionEditor
              connectionValueState={connectionValueState}
              isReadOnly={isReadOnly}
            />
          );
        }
        return undefined;
      },
    ];
  }

  getExtraNewConnectionDriverCreators(): NewConnectionDriverCreator[] {
    return [
      (
        editorStore: EditorStore,
        typeOrStore: Store | string,
      ): NewConnectionValueDriver<Connection> | undefined => {
        if (typeOrStore instanceof ServiceStore) {
          return new NewServiceStoreConnectionDriver(editorStore);
        }
        if (typeOrStore === SERVICE_STORE_CONNECTION) {
          return new NewServiceStoreConnectionDriver(editorStore);
        }
        return undefined;
      },
    ];
  }

  getExtraNewConnectionSnippetSuggestions(): NewConnectionSnippetSuggestion[] {
    return [
      {
        text: PURE_GRAMMAR_SERVICE_STORE_CONNECTION_TYPE_LABEL,
        description: 'service store connection',
        insertText: SERVICE_STORE_CONNECTION_SNIPPET,
      },
    ];
  }

  getExtraConnectionTypeOptions(): ConnectionTypeOption[] {
    return [
      {
        value: SERVICE_STORE_CONNECTION,
        label: prettyCONSTName(SERVICE_STORE_CONNECTION),
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
              EXTERNAL_STORE_SERVICE_LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_SERVICE_STORE,
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

  getExtraEmbeddedDataCloners(): EmbeddedDataCloner[] {
    return [
      (embeddedData: EmbeddedData): EmbeddedData | undefined => {
        if (embeddedData instanceof ServiceStoreEmbeddedData) {
          const serviceStoreEmbeddedData = new ServiceStoreEmbeddedData();
          // TODO walk embedded data and clone
          return serviceStoreEmbeddedData;
        }
        return undefined;
      },
    ];
  }

  getExtraEmbeddedDataTypeFromConnectionMatchers(): EmbeddedDataTypeFromConnectionMatcher[] {
    return [
      (connection: Connection): string | undefined => {
        if (connection instanceof ServiceStoreConnection) {
          return SERVICE_STORE_EMBEDDED_DATA_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraStoreTestDataCreators(): StoreTestDataCreators[] {
    return [
      (setImpl: SetImplementation): StoreTestData | undefined => {
        if (setImpl instanceof RootServiceInstanceSetImplementation) {
          const storeTestData = new StoreTestData();
          storeTestData.data = new ServiceStoreEmbeddedData();
          const serviceMapping = setImpl.servicesMapping[0];
          if (serviceMapping) {
            storeTestData.store = PackageableElementExplicitReference.create(
              serviceMapping.service.owner,
            );
          }
          return storeTestData;
        }
        return undefined;
      },
    ];
  }
}
