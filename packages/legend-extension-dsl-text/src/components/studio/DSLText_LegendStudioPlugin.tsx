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

import packageJson from '../../../package.json';
import {
  LegendStudioPlugin,
  type NewElementFromStateCreator,
  type EditorStore,
  type ElementEditorState,
  type ElementEditorStateCreator,
  type ElementTypeGetter,
  type ElementProjectExplorerDnDTypeGetter,
  type ElementIconGetter,
  type ElementEditorRenderer,
  type DSL_LegendStudioPlugin_Extension,
  type NewElementState,
  type PureGrammarParserDocumentationGetter,
  type PureGrammarParserKeywordSuggestionGetter,
  type PureGrammarTextSuggestion,
  type PureGrammarParserElementSnippetSuggestionsGetter,
  type PureGrammarParserElementDocumentationGetter,
} from '@finos/legend-studio';
import { FileIcon } from '@finos/legend-art';
import { TextEditorState } from '../../stores/studio/TextEditorState';
import { TextElementEditor } from './TextElementEditor';
import type { PackageableElement } from '@finos/legend-graph';
import { Text } from '../../models/metamodels/pure/model/packageableElements/text/DSLText_Text';
import {
  collectKeyedDocumnetationEntriesFromConfig,
  type LegendApplicationDocumentationEntry,
  type LegendApplicationKeyedDocumentationEntry,
} from '@finos/legend-application';
import {
  DSL_TEXT_DOCUMENTATION_ENTRIES,
  DSL_TEXT_LEGEND_STUDIO_DOCUMENTATION_KEY,
} from './DSLText_LegendStudioDocumentation';
import {
  PURE_GRAMMAR_TEXT_ELEMENT_TYPE_LABEL,
  PURE_GRAMMAR_TEXT_PARSER_NAME,
} from '../../graphManager/DSLText_PureGraphManagerPlugin';
import {
  MARKDOWN_TEXT_SNIPPET,
  PLAIN_TEXT_SNIPPET,
} from './DSLText_CodeSnippets';
import { create_TextElement } from '../../helper/DSLText_Helper';

const TEXT_ELEMENT_TYPE = 'TEXT';
const TEXT_ELEMENT_PROJECT_EXPLORER_DND_TYPE = 'PROJECT_EXPLORER_TEXT';

export class DSLText_LegendStudioPlugin
  extends LegendStudioPlugin
  implements DSL_LegendStudioPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.studioPlugin, packageJson.version);
  }

  override getExtraKeyedDocumentationEntries(): LegendApplicationKeyedDocumentationEntry[] {
    return collectKeyedDocumnetationEntriesFromConfig(
      DSL_TEXT_DOCUMENTATION_ENTRIES,
    );
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
          return create_TextElement(name);
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

  getExtraPureGrammarTextEditorDnDTypes(): string[] {
    return [TEXT_ELEMENT_PROJECT_EXPLORER_DND_TYPE];
  }

  getExtraPureGrammarParserElementDocumentationGetters(): PureGrammarParserElementDocumentationGetter[] {
    return [
      (
        editorStore: EditorStore,
        parserKeyword: string,
        elementKeyword: string,
      ): LegendApplicationDocumentationEntry | undefined => {
        if (parserKeyword === PURE_GRAMMAR_TEXT_PARSER_NAME) {
          if (elementKeyword === PURE_GRAMMAR_TEXT_ELEMENT_TYPE_LABEL) {
            return editorStore.applicationStore.docRegistry.getEntry(
              DSL_TEXT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_TEXT_ELEMENT,
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
        if (parserKeyword === PURE_GRAMMAR_TEXT_PARSER_NAME) {
          return editorStore.applicationStore.docRegistry.getEntry(
            DSL_TEXT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
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
          text: PURE_GRAMMAR_TEXT_PARSER_NAME,
          description: `(dsl)`,
          documentation: editorStore.applicationStore.docRegistry.getEntry(
            DSL_TEXT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
          ),
          insertText: PURE_GRAMMAR_TEXT_PARSER_NAME,
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
        parserKeyword === PURE_GRAMMAR_TEXT_PARSER_NAME
          ? [
              {
                text: PURE_GRAMMAR_TEXT_ELEMENT_TYPE_LABEL,
                description: 'plain text',
                insertText: PLAIN_TEXT_SNIPPET,
              },
              {
                text: PURE_GRAMMAR_TEXT_ELEMENT_TYPE_LABEL,
                description: 'markdown',
                insertText: MARKDOWN_TEXT_SNIPPET,
              },
            ]
          : undefined,
    ];
  }
}
