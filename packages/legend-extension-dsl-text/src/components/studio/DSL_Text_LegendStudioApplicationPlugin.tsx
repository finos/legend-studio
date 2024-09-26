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
  LegendStudioApplicationPlugin,
  type NewElementFromStateCreator,
  type EditorStore,
  type ElementEditorState,
  type ElementEditorStateCreator,
  type ElementClassifier,
  type DragElementClassifier,
  type ElementIconGetter,
  type ElementEditorRenderer,
  type DSL_LegendStudioApplicationPlugin_Extension,
  type NewElementState,
  type PureGrammarParserDocumentationGetter,
  type PureGrammarParserKeywordSuggestionGetter,
  type PureGrammarParserElementSnippetSuggestionsGetter,
  type PureGrammarParserElementDocumentationGetter,
  PACKAGEABLE_ELEMENT_GROUP_BY_CATEGORY,
} from '@finos/legend-application-studio';
import { FileIcon } from '@finos/legend-art';
import { TextEditorState } from '../../stores/studio/TextEditorState.js';
import { TextElementEditor } from './TextElementEditor.js';
import type { PackageableElement } from '@finos/legend-graph';
import { Text } from '../../graph/metamodel/pure/model/packageableElements/text/DSL_Text_Text.js';
import { DSL_TEXT_LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../__lib__/studio/DSL_Text_LegendStudioDocumentation.js';
import {
  MARKDOWN_TEXT_SNIPPET,
  PLAIN_TEXT_SNIPPET,
} from '../../__lib__/studio/DSL_Text_LegendStudioCodeSnippet.js';
import { create_TextElement } from '../../graph/helpers/DSL_Text_Helper.js';
import { DSL_TEXT_LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../__lib__/studio/DSL_Text_LegendStudioApplicationNavigationContext.js';
import type { PureGrammarTextSuggestion } from '@finos/legend-code-editor';
import type { DocumentationEntry } from '@finos/legend-shared';

const TEXT_ELEMENT_TYPE = 'TEXT';
const TEXT_ELEMENT_PROJECT_EXPLORER_DND_TYPE = 'PROJECT_EXPLORER_TEXT';

const PURE_GRAMMAR_TEXT_PARSER_NAME = 'Text';
const PURE_GRAMMAR_TEXT_ELEMENT_TYPE_LABEL = 'Text';

export class DSL_Text_LegendStudioApplicationPlugin
  extends LegendStudioApplicationPlugin
  implements DSL_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.applicationStudioPlugin, packageJson.version);
  }

  override getExtraRequiredDocumentationKeys(): string[] {
    return [
      DSL_TEXT_LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_TEXT,
      DSL_TEXT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
    ];
  }

  override getExtraAccessEventLoggingApplicationContextKeys(): string[] {
    return [
      DSL_TEXT_LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.TEXT_EDITOR,
    ];
  }

  getExtraPureGrammarKeywords(): string[] {
    return [PURE_GRAMMAR_TEXT_ELEMENT_TYPE_LABEL];
  }

  getExtraSupportedElementTypes(): string[] {
    return [TEXT_ELEMENT_TYPE];
  }

  getExtraSupportedElementTypesWithCategory?(): Map<string, string[]> {
    const elementTypesWithCategoryMap = new Map<string, string[]>();
    elementTypesWithCategoryMap.set(
      PACKAGEABLE_ELEMENT_GROUP_BY_CATEGORY.OTHER,
      [TEXT_ELEMENT_TYPE],
    );
    return elementTypesWithCategoryMap;
  }

  getExtraElementClassifiers(): ElementClassifier[] {
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

  getExtraDragElementClassifiers(): DragElementClassifier[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof Text) {
          return TEXT_ELEMENT_PROJECT_EXPLORER_DND_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraPureGrammarTextEditorDragElementTypes(): string[] {
    return [TEXT_ELEMENT_PROJECT_EXPLORER_DND_TYPE];
  }

  getExtraPureGrammarParserElementDocumentationGetters(): PureGrammarParserElementDocumentationGetter[] {
    return [
      (
        editorStore: EditorStore,
        parserKeyword: string,
        elementKeyword: string,
      ): DocumentationEntry | undefined => {
        if (parserKeyword === PURE_GRAMMAR_TEXT_PARSER_NAME) {
          if (elementKeyword === PURE_GRAMMAR_TEXT_ELEMENT_TYPE_LABEL) {
            return editorStore.applicationStore.documentationService.getDocEntry(
              DSL_TEXT_LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_TEXT,
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
        if (parserKeyword === PURE_GRAMMAR_TEXT_PARSER_NAME) {
          return editorStore.applicationStore.documentationService.getDocEntry(
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
          documentation:
            editorStore.applicationStore.documentationService.getDocEntry(
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

  getExtraGrammarTextEditorAutoFoldingElementCreatorKeywords(): string[] {
    return [PURE_GRAMMAR_TEXT_PARSER_NAME];
  }
}
