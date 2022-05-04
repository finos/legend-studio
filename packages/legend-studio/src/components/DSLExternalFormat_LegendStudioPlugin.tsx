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
import { BufferIcon, SitemapIcon } from '@finos/legend-art';
import { SchemaSetEditor } from './editor/edit-panel/external-format-editor/SchemaSetElementEditor';
import {
  type Connection,
  type PackageableElement,
  type Store,
  OptionalPackageableElementExplicitReference,
  PackageableElementExplicitReference,
  SchemaSet,
  Binding,
  ModelUnit,
  ExternalFormatConnection,
  UrlStream,
  PURE_GRAMMAR_BINDING_ELEMENT_TYPE_LABEL,
  PURE_GRAMMAR_EXTERNAL_FORMAT_PARSER_NAME,
  PURE_GRAMMAR_SCHEMA_SET_ELEMENT_TYPE_LABEL,
} from '@finos/legend-graph';
import {
  ExternalFormatConnectionEditor,
  ExternalFormatConnectionValueState,
  NewExternalFormatConnectionDriver,
} from './editor/edit-panel/external-format-editor/ExternalFormatConnectionEditor';
import { BindingEditor } from './editor/edit-panel/external-format-editor/BindingElementEditor';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type { ReactNode } from 'react';
import {
  type ElementEditorRenderer,
  type ElementEditorStateCreator,
  type ElementIconGetter,
  type ElementProjectExplorerDnDTypeGetter,
  type ElementTypeGetter,
  type NewElementDriverCreator,
  type NewElementDriverEditorRenderer,
  type NewElementFromStateCreator,
  type PureGrammarParserElementSnippetSuggestionsGetter,
  type PureGrammarParserElementDocumentationGetter,
  type PureGrammarParserDocumentationGetter,
  type PureGrammarParserKeywordSuggestionGetter,
  type PureGrammarTextSuggestion,
  LegendStudioPlugin,
} from '../stores/LegendStudioPlugin';
import type {
  ConnectionEditorRenderer,
  ConnectionValueEditorStateBuilder,
  DefaultConnectionValueBuilder,
  DSLMapping_LegendStudioPlugin_Extension,
  NewConnectionDriverCreator,
  RuntimeConnectionTooltipTextBuilder,
} from '../stores/DSLMapping_LegendStudioPlugin_Extension';
import type {
  NewConnectionValueDriver,
  NewElementDriver,
  NewElementState,
} from '../stores/NewElementState';
import {
  NewSchemaSetDriver,
  NewSchemaSetDriverEditor,
} from '../stores/editor-state/element-editor-state/externalFormat/NewSchemaSetDriver';
import type { EditorStore } from '../stores/EditorStore';
import type { ElementEditorState } from '../stores/editor-state/element-editor-state/ElementEditorState';
import { SchemaSetEditorState } from '../stores/editor-state/element-editor-state/externalFormat/SchemaSetEditorState';
import { BindingEditorState } from '../stores/editor-state/element-editor-state/externalFormat/BindingEditorState';
import type { ConnectionValueState } from '../stores/editor-state/element-editor-state/connection/ConnectionEditorState';
import {
  externalFormat_Binding_setContentType,
  externalFormat_urlStream_setUrl,
} from '../stores/graphModifier/DSLExternalFormat_GraphModifierHelper';
import type { LegendApplicationDocumentationEntry } from '@finos/legend-application';
import { DSL_EXTERNAL_FORMAT_LEGEND_STUDIO_DOCUMENTATION_KEY } from './DSLExternalFormat_LegendStudioDocumentation';
import {
  BASIC_BINDING_SNIPPET,
  BASIC_SCHEMASET_SNIPPET,
  SCHEMASET_WITH_JSON_SCHEMA_SNIPPET,
  SCHEMASET_WITH_XML_SCHEMA_SNIPPET,
  SCHEMASET_WITH_FLAT_DATA_SCHEMA_SNIPPET,
} from './DSLExternalFormat_CodeSnippets';

const SCHEMA_SET_ELEMENT_TYPE = 'SCHEMASET';
const SCHEMA_SET_ELEMENT_PROJECT_EXPLORER_DND_TYPE =
  'PROJECT_EXPLORER_SCHEMA_SET';
const BINDING_ELEMENT_TYPE = 'BINDING';
const BINDING_ELEMENT_PROJECT_EXPLORER_DND_TYPE = 'PROJECT_EXPLORER_BINDING';

export class DSLExternalFormat_LegendStudioPlugin
  extends LegendStudioPlugin
  implements DSLMapping_LegendStudioPlugin_Extension
{
  constructor() {
    super(
      packageJson.extensions.dsl_external_format_studioPlugin,
      packageJson.version,
    );
  }

  getExtraSupportedElementTypes(): string[] {
    return [SCHEMA_SET_ELEMENT_TYPE, BINDING_ELEMENT_TYPE];
  }

  getExtraElementTypeGetters(): ElementTypeGetter[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof SchemaSet) {
          return SCHEMA_SET_ELEMENT_TYPE;
        } else if (element instanceof Binding) {
          return BINDING_ELEMENT_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraElementIconGetters(): ElementIconGetter[] {
    return [
      (type: string): React.ReactNode | undefined => {
        if (type === SCHEMA_SET_ELEMENT_TYPE) {
          return (
            <div className="icon icon--schema-set">
              <SitemapIcon />
            </div>
          );
        } else if (type === BINDING_ELEMENT_TYPE) {
          return (
            <div className="icon icon--binding">
              <BufferIcon />
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
        if (elementEditorState instanceof SchemaSetEditorState) {
          return <SchemaSetEditor key={elementEditorState.uuid} />;
        } else if (elementEditorState instanceof BindingEditorState) {
          return <BindingEditor key={elementEditorState.uuid} />;
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
        const externalFormatState =
          state.editorStore.graphState.graphGenerationState.externalFormatState;

        if (type === SCHEMA_SET_ELEMENT_TYPE) {
          const schemaSet = state
            .getNewElementDriver(NewSchemaSetDriver)
            .createElement(name);
          return schemaSet;
        } else if (type === BINDING_ELEMENT_TYPE) {
          const binding = new Binding(name);
          externalFormat_Binding_setContentType(
            binding,
            guaranteeNonNullable(externalFormatState.formatContentTypes[0]),
          );
          binding.schemaSet =
            OptionalPackageableElementExplicitReference.create<SchemaSet>(
              undefined,
            );
          const modelUnit = new ModelUnit();
          binding.modelUnit = modelUnit;
          return binding;
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
        if (element instanceof SchemaSet) {
          return new SchemaSetEditorState(editorStore, element);
        } else if (element instanceof Binding) {
          return new BindingEditorState(editorStore, element);
        }
        return undefined;
      },
    ];
  }

  getExtraNewElementDriverCreators(): NewElementDriverCreator[] {
    return [
      (
        editorStore: EditorStore,
        type: string,
      ): NewElementDriver<PackageableElement> | undefined => {
        if (type === SCHEMA_SET_ELEMENT_TYPE) {
          return new NewSchemaSetDriver(editorStore);
        }
        return undefined;
      },
    ];
  }

  getExtraNewElementDriverEditorRenderers(): NewElementDriverEditorRenderer[] {
    return [
      (type: string): ReactNode | undefined => {
        if (type === SCHEMA_SET_ELEMENT_TYPE) {
          return <NewSchemaSetDriverEditor />;
        }
        return undefined;
      },
    ];
  }

  getExtraElementProjectExplorerDnDTypeGetters(): ElementProjectExplorerDnDTypeGetter[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof SchemaSet) {
          return SCHEMA_SET_ELEMENT_PROJECT_EXPLORER_DND_TYPE;
        } else if (element instanceof Binding) {
          return BINDING_ELEMENT_PROJECT_EXPLORER_DND_TYPE;
        }
        return undefined;
      },
    ];
  }
  getExtraPureGrammarTextEditorDnDTypes(): string[] {
    return [
      SCHEMA_SET_ELEMENT_PROJECT_EXPLORER_DND_TYPE,
      BINDING_ELEMENT_PROJECT_EXPLORER_DND_TYPE,
    ];
  }

  getExtraRuntimeConnectionTooltipTextBuilders(): RuntimeConnectionTooltipTextBuilder[] {
    return [
      (connection: Connection): string | undefined => {
        if (connection instanceof ExternalFormatConnection) {
          return `External format connection \u2022 store ${connection.store.value.path}`;
        }
        return undefined;
      },
    ];
  }

  getExtraDefaultConnectionValueBuilders(): DefaultConnectionValueBuilder[] {
    return [
      (store: Store): Connection | undefined => {
        if (store instanceof Binding) {
          const externalFormatConnection = new ExternalFormatConnection(
            PackageableElementExplicitReference.create(store),
          );
          const urlStream = new UrlStream();
          externalFormat_urlStream_setUrl(urlStream, '');
          externalFormatConnection.externalSource = urlStream;
          return externalFormatConnection;
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
        if (connection instanceof ExternalFormatConnection) {
          return new ExternalFormatConnectionValueState(
            editorStore,
            connection,
          );
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
        if (
          connectionValueState instanceof ExternalFormatConnectionValueState
        ) {
          return (
            <ExternalFormatConnectionEditor
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
        store: Store,
      ): NewConnectionValueDriver<Connection> | undefined => {
        if (store instanceof Binding) {
          return new NewExternalFormatConnectionDriver(editorStore);
        }
        return undefined;
      },
    ];
  }

  getExtraPureGrammarParserElementDocumentationGetters(): PureGrammarParserElementDocumentationGetter[] {
    return [
      (
        editorStore: EditorStore,
        parserKeyword: string,
        elementKeyword: string,
      ): LegendApplicationDocumentationEntry | undefined => {
        if (parserKeyword === PURE_GRAMMAR_EXTERNAL_FORMAT_PARSER_NAME) {
          if (elementKeyword === PURE_GRAMMAR_BINDING_ELEMENT_TYPE_LABEL) {
            return editorStore.applicationStore.docRegistry.getEntry(
              DSL_EXTERNAL_FORMAT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_BINDING_ELEMENT,
            );
          } else if (
            elementKeyword === PURE_GRAMMAR_SCHEMA_SET_ELEMENT_TYPE_LABEL
          ) {
            return editorStore.applicationStore.docRegistry.getEntry(
              DSL_EXTERNAL_FORMAT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_SCHEMASET_ELEMENT,
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
      ): LegendApplicationDocumentationEntry | undefined => {
        if (parserKeyword === PURE_GRAMMAR_EXTERNAL_FORMAT_PARSER_NAME) {
          return editorStore.applicationStore.docRegistry.getEntry(
            DSL_EXTERNAL_FORMAT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
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
          text: PURE_GRAMMAR_EXTERNAL_FORMAT_PARSER_NAME,
          description: `DSL External Format`,
          documentation: editorStore.applicationStore.docRegistry.getEntry(
            DSL_EXTERNAL_FORMAT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
          ),
          insertText: PURE_GRAMMAR_EXTERNAL_FORMAT_PARSER_NAME,
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
        parserKeyword === PURE_GRAMMAR_EXTERNAL_FORMAT_PARSER_NAME
          ? [
              // binding
              {
                text: PURE_GRAMMAR_BINDING_ELEMENT_TYPE_LABEL,
                description: '(blank)',
                insertText: BASIC_BINDING_SNIPPET,
              },
              // schema set
              {
                text: PURE_GRAMMAR_SCHEMA_SET_ELEMENT_TYPE_LABEL,
                description: '(blank)',
                insertText: BASIC_SCHEMASET_SNIPPET,
              },
              {
                text: PURE_GRAMMAR_SCHEMA_SET_ELEMENT_TYPE_LABEL,
                description: 'with flat-data',
                insertText: SCHEMASET_WITH_FLAT_DATA_SCHEMA_SNIPPET,
              },
              {
                text: PURE_GRAMMAR_SCHEMA_SET_ELEMENT_TYPE_LABEL,
                description: 'with JSON shema',
                insertText: SCHEMASET_WITH_JSON_SCHEMA_SNIPPET,
              },
              {
                text: PURE_GRAMMAR_SCHEMA_SET_ELEMENT_TYPE_LABEL,
                description: 'with XML shema',
                insertText: SCHEMASET_WITH_XML_SCHEMA_SNIPPET,
              },
            ]
          : undefined,
    ];
  }
}
