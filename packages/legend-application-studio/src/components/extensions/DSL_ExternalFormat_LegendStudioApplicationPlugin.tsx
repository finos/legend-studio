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
import { BufferIcon, SitemapIcon } from '@finos/legend-art';
import { SchemaSetEditor } from '../editor/editor-group/external-format-editor/DSL_ExternalFormat_SchemaSetElementEditor.js';
import {
  type Connection,
  type PackageableElement,
  type Store,
  PackageableElementExplicitReference,
  SchemaSet,
  Binding,
  ModelUnit,
  ExternalFormatConnection,
  UrlStream,
} from '@finos/legend-graph';
import {
  ExternalFormatConnectionEditor,
  ExternalFormatConnectionValueState,
  NewExternalFormatConnectionDriver,
} from '../editor/editor-group/external-format-editor/DSL_ExternalFormat_ExternalFormatConnectionEditor.js';
import { BindingEditor } from '../editor/editor-group/external-format-editor/DSL_ExternalFormat_BindingElementEditor.js';
import {
  guaranteeNonNullable,
  prettyCONSTName,
  type DocumentationEntry,
} from '@finos/legend-shared';
import type { ReactNode } from 'react';
import {
  type ElementEditorRenderer,
  type ElementEditorStateCreator,
  type ElementIconGetter,
  type DragElementClassifier,
  type ElementClassifier,
  type NewElementDriverCreator,
  type NewElementDriverEditorRenderer,
  type NewElementFromStateCreator,
  type PureGrammarParserElementSnippetSuggestionsGetter,
  type PureGrammarParserElementDocumentationGetter,
  type PureGrammarParserDocumentationGetter,
  type PureGrammarParserKeywordSuggestionGetter,
  LegendStudioApplicationPlugin,
  type DSL_LegendStudioApplicationPlugin_Extension,
} from '../../stores/LegendStudioApplicationPlugin.js';
import type {
  ConnectionEditorRenderer,
  ConnectionTypeOption,
  ConnectionValueEditorStateBuilder,
  DefaultConnectionValueBuilder,
  DSL_Mapping_LegendStudioApplicationPlugin_Extension,
  NewConnectionDriverCreator,
  PureGrammarConnectionLabeler,
  RuntimeConnectionTooltipTextBuilder,
} from '../../stores/extensions/DSL_Mapping_LegendStudioApplicationPlugin_Extension.js';
import type { EditorStore } from '../../stores/editor/EditorStore.js';
import type { ElementEditorState } from '../../stores/editor/editor-state/element-editor-state/ElementEditorState.js';
import { SchemaSetEditorState } from '../../stores/editor/editor-state/element-editor-state/external-format/DSL_ExternalFormat_SchemaSetEditorState.js';
import { BindingEditorState } from '../../stores/editor/editor-state/element-editor-state/external-format/DSL_ExternalFormat_BindingEditorState.js';
import type { ConnectionValueState } from '../../stores/editor/editor-state/element-editor-state/connection/ConnectionEditorState.js';
import {
  externalFormat_Binding_setContentType,
  externalFormat_urlStream_setUrl,
} from '../../stores/graph-modifier/DSL_ExternalFormat_GraphModifierHelper.js';
import { DSL_EXTERNAL_FORMAT_LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../__lib__/DSL_ExternalFormat_LegendStudioDocumentation.js';
import {
  BASIC_BINDING_SNIPPET,
  BASIC_SCHEMASET_SNIPPET,
  SCHEMASET_WITH_JSON_SCHEMA_SNIPPET,
  SCHEMASET_WITH_XML_SCHEMA_SNIPPET,
  SCHEMASET_WITH_FLAT_DATA_SCHEMA_SNIPPET,
} from '../../__lib__/DSL_ExternalFormat_LegendStudioCodeSnippet.js';
import {
  NewSchemaSetDriver,
  NewSchemaSetDriverEditor,
} from '../editor/editor-group/external-format-editor/DSL_ExternalFormat_NewSchemaSetDriver.js';
import type {
  NewConnectionValueDriver,
  NewElementDriver,
  NewElementState,
} from '../../stores/editor/NewElementState.js';
import type { PureGrammarTextSuggestion } from '@finos/legend-lego/code-editor';
import { PACKAGEABLE_ELEMENT_GROUP_BY_CATEGORY } from '../../stores/editor/utils/ModelClassifierUtils.js';

const SCHEMA_SET_ELEMENT_TYPE = 'SCHEMASET';
const SCHEMA_SET_ELEMENT_PROJECT_EXPLORER_DND_TYPE =
  'PROJECT_EXPLORER_SCHEMA_SET';
const BINDING_ELEMENT_TYPE = 'BINDING';
const BINDING_ELEMENT_PROJECT_EXPLORER_DND_TYPE = 'PROJECT_EXPLORER_BINDING';
export const EXTERNAL_FORMAT_CONNECTION = 'EXTERNAL_FORMAT_CONNECTION';

const PURE_GRAMMAR_EXTERNAL_FORMAT_PARSER_NAME = 'ExternalFormat';
const PURE_GRAMMAR_BINDING_ELEMENT_TYPE_LABEL = 'Binding';
const PURE_GRAMMAR_SCHEMA_SET_ELEMENT_TYPE_LABEL = 'SchemaSet';
const PURE_GRAMMAR_EXTERNAL_FORMAT_CONNECTION_TYPE_LABEL =
  'ExternalFormatConnection';

export class DSL_ExternalFormat_LegendStudioApplicationPlugin
  extends LegendStudioApplicationPlugin
  implements
    DSL_LegendStudioApplicationPlugin_Extension,
    DSL_Mapping_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super(
      packageJson.extensions.dsl_external_format_applicationStudioPlugin,
      packageJson.version,
    );
  }

  override getExtraRequiredDocumentationKeys(): string[] {
    return [
      DSL_EXTERNAL_FORMAT_LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_BINDING,
      DSL_EXTERNAL_FORMAT_LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_SCHEMASET,
      DSL_EXTERNAL_FORMAT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
    ];
  }

  getExtraPureGrammarKeywords(): string[] {
    return [
      PURE_GRAMMAR_BINDING_ELEMENT_TYPE_LABEL,
      PURE_GRAMMAR_SCHEMA_SET_ELEMENT_TYPE_LABEL,
      PURE_GRAMMAR_EXTERNAL_FORMAT_CONNECTION_TYPE_LABEL,
    ];
  }

  getExtraPureGrammarConnectionLabelers(): PureGrammarConnectionLabeler[] {
    return [
      (connection): string | undefined => {
        if (connection instanceof ExternalFormatConnection) {
          return PURE_GRAMMAR_EXTERNAL_FORMAT_CONNECTION_TYPE_LABEL;
        }
        return undefined;
      },
    ];
  }

  getExtraSupportedElementTypes(): string[] {
    return [SCHEMA_SET_ELEMENT_TYPE, BINDING_ELEMENT_TYPE];
  }

  getExtraSupportedElementTypesWithCategory?(): Map<string, string[]> {
    const elementTypesWithCategoryMap = new Map<string, string[]>();
    elementTypesWithCategoryMap.set(
      PACKAGEABLE_ELEMENT_GROUP_BY_CATEGORY.EXTERNAL_FORMAT,
      [SCHEMA_SET_ELEMENT_TYPE, BINDING_ELEMENT_TYPE],
    );
    return elementTypesWithCategoryMap;
  }

  getExtraElementClassifiers(): ElementClassifier[] {
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
          binding.schemaSet = undefined;
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

  getExtraDragElementClassifiers(): DragElementClassifier[] {
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
  getExtraPureGrammarTextEditorDragElementTypes(): string[] {
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
        typeOrStore: Store | string,
      ): NewConnectionValueDriver<Connection> | undefined => {
        if (typeOrStore instanceof Binding) {
          return new NewExternalFormatConnectionDriver(editorStore);
        }
        if (typeOrStore === EXTERNAL_FORMAT_CONNECTION) {
          return new NewExternalFormatConnectionDriver(editorStore);
        }
        return undefined;
      },
    ];
  }

  getExtraConnectionTypeOptions(): ConnectionTypeOption[] {
    return [
      {
        value: EXTERNAL_FORMAT_CONNECTION,
        label: prettyCONSTName(EXTERNAL_FORMAT_CONNECTION),
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
        if (parserKeyword === PURE_GRAMMAR_EXTERNAL_FORMAT_PARSER_NAME) {
          if (elementKeyword === PURE_GRAMMAR_BINDING_ELEMENT_TYPE_LABEL) {
            return editorStore.applicationStore.documentationService.getDocEntry(
              DSL_EXTERNAL_FORMAT_LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_BINDING,
            );
          } else if (
            elementKeyword === PURE_GRAMMAR_SCHEMA_SET_ELEMENT_TYPE_LABEL
          ) {
            return editorStore.applicationStore.documentationService.getDocEntry(
              DSL_EXTERNAL_FORMAT_LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_SCHEMASET,
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
        if (parserKeyword === PURE_GRAMMAR_EXTERNAL_FORMAT_PARSER_NAME) {
          return editorStore.applicationStore.documentationService.getDocEntry(
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
          description: `(dsl)`,
          documentation:
            editorStore.applicationStore.documentationService.getDocEntry(
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
