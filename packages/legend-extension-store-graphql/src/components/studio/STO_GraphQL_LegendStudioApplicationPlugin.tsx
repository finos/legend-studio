/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  type PureGrammarParserElementSnippetSuggestionsGetter,
  type PureGrammarParserKeywordSuggestionGetter,
  type PureGrammarParserDocumentationGetter,
  type PureGrammarParserElementDocumentationGetter,
  type MappingElementSource,
  type ConnectionTypeOption,
  type PureGrammarConnectionLabeler,
  PACKAGEABLE_ELEMENT_GROUP_BY_CATEGORY,
} from '@finos/legend-application-studio';
import { PURE_UnknownElementTypeIcon } from '@finos/legend-art';
import {
  type Connection,
  type PackageableElement,
  type Store,
  PackageableElementExplicitReference,
} from '@finos/legend-graph';
import { GraphQLStore } from '../../graph/metamodel/pure/model/packageableElements/store/graphQL/model/STO_GraphQL_GraphQLStore.js';
import { RootGraphQLInstanceSetImplementation } from '../../graph/metamodel/pure/model/packageableElements/store/graphQL/mapping/STO_GraphQL_RootGraphQLInstanceSetImplementation.js';
import { GraphQLConnection } from '../../graph/metamodel/pure/model/packageableElements/store/graphQL/connection/STO_GraphQL_GraphQLConnection.js';
import { STO_GRAPHQL_LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../__lib__/studio/STO_GraphQL_LegendStudioDocumentation.js';
import {
  BLANK_GRAPHQL_STORE_SNIPPET,
  GRAPHQL_CONNECTION_SNIPPET,
} from '../../__lib__/studio/STO_GraphQL_CodeSnippets.js';
import {
  GraphQLConnectionValueState,
  GraphQLConnectionEditor,
  NewGraphQLConnectionDriver,
} from './GraphQLElementEditor.js';
import { prettyCONSTName, type DocumentationEntry } from '@finos/legend-shared';
import type { PureGrammarTextSuggestion } from '@finos/legend-code-editor';

const GRAPHQL_STORE_ELEMENT_TYPE = 'GRAPHQL_STORE';
const GRAPHQL_STORE_ELEMENT_PROJECT_EXPLORER_DND_TYPE =
  'PROJECT_EXPLORER_GRAPHQL_STORE';
export const GRAPHQL_CONNECTION = 'GRAPHQL_CONNECTION';

const PURE_GRAMMAR_GRAPHQL_STORE_PARSER_NAME = 'GraphQL';
const PURE_GRAMMAR_GRAPHQL_STORE_ELEMENT_TYPE_LABEL = 'GraphQLStore';
const PURE_GRAMMAR_GRAPHQL_CONNECTION_TYPE_LABEL = 'GraphQLConnection';

export class STO_GraphQL_LegendStudioApplicationPlugin
  extends LegendStudioApplicationPlugin
  implements DSL_Mapping_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.applicationStudioPlugin, packageJson.version);
  }

  override getExtraRequiredDocumentationKeys(): string[] {
    return [
      STO_GRAPHQL_LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_GRAPHQL_STORE,
      STO_GRAPHQL_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
    ];
  }

  getExtraPureGrammarKeywords(): string[] {
    return [
      PURE_GRAMMAR_GRAPHQL_STORE_ELEMENT_TYPE_LABEL,
      PURE_GRAMMAR_GRAPHQL_CONNECTION_TYPE_LABEL,
    ];
  }

  getExtraPureGrammarConnectionLabelers(): PureGrammarConnectionLabeler[] {
    return [
      (connection): string | undefined => {
        if (connection instanceof GraphQLConnection) {
          return PURE_GRAMMAR_GRAPHQL_CONNECTION_TYPE_LABEL;
        }
        return undefined;
      },
    ];
  }

  getExtraSupportedElementTypes(): string[] {
    return [GRAPHQL_STORE_ELEMENT_TYPE];
  }

  getExtraSupportedElementTypesWithCategory?(): Map<string, string[]> {
    const elementTypesWithCategoryMap = new Map<string, string[]>();
    elementTypesWithCategoryMap.set(
      PACKAGEABLE_ELEMENT_GROUP_BY_CATEGORY.STORE,
      [GRAPHQL_STORE_ELEMENT_TYPE],
    );
    return elementTypesWithCategoryMap;
  }

  getExtraElementClassifiers(): ElementClassifier[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof GraphQLStore) {
          return GRAPHQL_STORE_ELEMENT_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraElementIconGetters(): ElementIconGetter[] {
    return [
      (type: string): React.ReactNode | undefined => {
        if (type === GRAPHQL_STORE_ELEMENT_TYPE) {
          return (
            <div
              className="icon"
              style={{
                color: 'var(--color-light-grey-50)',
              }}
            >
              <PURE_UnknownElementTypeIcon />
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
        if (type === GRAPHQL_STORE_ELEMENT_TYPE) {
          return new GraphQLStore(name);
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
        if (element instanceof GraphQLStore) {
          return new UnsupportedElementEditorState(editorStore, element);
        }
        return undefined;
      },
    ];
  }

  getExtraDragElementClassifiers(): DragElementClassifier[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof GraphQLStore) {
          return GRAPHQL_STORE_ELEMENT_PROJECT_EXPLORER_DND_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraPureGrammarTextEditorDragElementTypes(): string[] {
    return [GRAPHQL_STORE_ELEMENT_PROJECT_EXPLORER_DND_TYPE];
  }

  getExtraMappingElementStateCreators(): MappingElementStateCreator[] {
    return [
      (
        mappingElement: MappingElement | undefined,
        editorStore: EditorStore,
      ): MappingElementState | undefined => {
        if (
          mappingElement !== undefined &&
          mappingElement instanceof RootGraphQLInstanceSetImplementation
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
        if (mappingElement instanceof RootGraphQLInstanceSetImplementation) {
          return mappingElement.class.value;
        }
        return undefined;
      },
    ];
  }

  getExtraRuntimeConnectionTooltipTextBuilders(): RuntimeConnectionTooltipTextBuilder[] {
    return [
      (connection: Connection): string | undefined => {
        if (connection instanceof GraphQLConnection) {
          return `GraphQL connection • store ${connection.store.value.path}`;
        }
        return undefined;
      },
    ];
  }

  getExtraDefaultConnectionValueBuilders(): DefaultConnectionValueBuilder[] {
    return [
      (store: Store): Connection | undefined => {
        if (store instanceof GraphQLStore) {
          const graphQLConnection = new GraphQLConnection(
            PackageableElementExplicitReference.create(store),
          );
          graphQLConnection.url = '';
          return graphQLConnection;
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
        if (connection instanceof GraphQLConnection) {
          return new GraphQLConnectionValueState(editorStore, connection);
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
        if (connectionValueState instanceof GraphQLConnectionValueState) {
          return (
            <GraphQLConnectionEditor
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
        if (typeOrStore instanceof GraphQLStore) {
          return new NewGraphQLConnectionDriver(editorStore);
        }
        if (typeOrStore === GRAPHQL_CONNECTION) {
          return new NewGraphQLConnectionDriver(editorStore);
        }
        return undefined;
      },
    ];
  }

  getExtraNewConnectionSnippetSuggestions(): NewConnectionSnippetSuggestion[] {
    return [
      {
        text: PURE_GRAMMAR_GRAPHQL_CONNECTION_TYPE_LABEL,
        description: 'GraphQL connection',
        insertText: GRAPHQL_CONNECTION_SNIPPET,
      },
    ];
  }

  getExtraConnectionTypeOptions(): ConnectionTypeOption[] {
    return [
      {
        value: GRAPHQL_CONNECTION,
        label: prettyCONSTName(GRAPHQL_CONNECTION),
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
        if (parserKeyword === PURE_GRAMMAR_GRAPHQL_STORE_PARSER_NAME) {
          if (
            elementKeyword === PURE_GRAMMAR_GRAPHQL_STORE_ELEMENT_TYPE_LABEL
          ) {
            return editorStore.applicationStore.documentationService.getDocEntry(
              STO_GRAPHQL_LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_GRAPHQL_STORE,
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
        if (parserKeyword === PURE_GRAMMAR_GRAPHQL_STORE_PARSER_NAME) {
          return editorStore.applicationStore.documentationService.getDocEntry(
            STO_GRAPHQL_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
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
          text: PURE_GRAMMAR_GRAPHQL_STORE_PARSER_NAME,
          description: `(external store)`,
          documentation:
            editorStore.applicationStore.documentationService.getDocEntry(
              STO_GRAPHQL_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
            ),
          insertText: PURE_GRAMMAR_GRAPHQL_STORE_PARSER_NAME,
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
        parserKeyword === PURE_GRAMMAR_GRAPHQL_STORE_PARSER_NAME
          ? [
              {
                text: PURE_GRAMMAR_GRAPHQL_STORE_ELEMENT_TYPE_LABEL,
                description: '(blank)',
                insertText: BLANK_GRAPHQL_STORE_SNIPPET,
              },
            ]
          : undefined,
    ];
  }
}
