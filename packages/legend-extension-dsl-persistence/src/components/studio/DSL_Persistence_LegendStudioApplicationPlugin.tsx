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
import { MeteorIcon, PuzzlePieceIcon } from '@finos/legend-art';
import type { PackageableElement } from '@finos/legend-graph';
import {
  LegendStudioApplicationPlugin,
  UnsupportedElementEditorState,
  type DSL_LegendStudioApplicationPlugin_Extension,
  type EditorStore,
  type ElementEditorState,
  type ElementEditorStateCreator,
  type ElementIconGetter,
  type DragElementClassifier,
  type ElementClassifier,
  type NewElementFromStateCreator,
  type NewElementState,
  type PureGrammarParserElementSnippetSuggestionsGetter,
  type PureGrammarParserKeywordSuggestionGetter,
  type PureGrammarParserElementDocumentationGetter,
  type PureGrammarParserDocumentationGetter,
  type ElementTypeLabelGetter,
  PACKAGEABLE_ELEMENT_GROUP_BY_CATEGORY,
} from '@finos/legend-application-studio';
import { Persistence } from '../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Persistence.js';
import { PersistenceContext } from '../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistenceContext.js';
import {
  BLANK_PERSISTENCE_CONTEXT_SNIPPET,
  BLANK_PERSISTENCE_SNIPPET,
} from '../../__lib__/studio/DSL_Persistence_LegendStudioCodeSnippet.js';
import { DSL_PERSISTENCE_LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../__lib__/studio/DSL_Persistence_LegendStudioDocumentation.js';
import type { PureGrammarTextSuggestion } from '@finos/legend-lego/code-editor';
import type { DocumentationEntry } from '@finos/legend-shared';

const PERSISTENCE_ELEMENT_TYPE = 'PERSISTENCE';
const PERSISTENCE_CONTEXT_ELEMENT_TYPE = 'PERSISTENCE_CONTEXT';

const PERSISTENCE_ELEMENT_PROJECT_EXPLORER_DND_TYPE =
  'PROJECT_EXPLORER_PERSISTENCE';
const PERSISTENCE_CONTEXT_ELEMENT_PROJECT_EXPLORER_DND_TYPE =
  'PROJECT_EXPLORER_PERSISTENCE_CONTEXT';

const PURE_GRAMMAR_PERSISTENCE_PARSER_NAME = 'Persistence';
const PURE_GRAMMAR_PERSISTENCE_ELEMENT_TYPE_LABEL = 'Persistence';
const PURE_GRAMMAR_PERSISTENCE_CONTEXT_ELEMENT_TYPE_LABEL =
  'PersistenceContext';

export class DSL_Persistence_LegendStudioApplicationPlugin
  extends LegendStudioApplicationPlugin
  implements DSL_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.applicationStudioPlugin, packageJson.version);
  }

  override getExtraRequiredDocumentationKeys(): string[] {
    return [
      DSL_PERSISTENCE_LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_PERSISTENCE,
      DSL_PERSISTENCE_LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_PERSISTENCE_CONTEXT,
      DSL_PERSISTENCE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
    ];
  }

  getExtraPureGrammarKeywords(): string[] {
    return [
      PURE_GRAMMAR_PERSISTENCE_ELEMENT_TYPE_LABEL,
      PURE_GRAMMAR_PERSISTENCE_CONTEXT_ELEMENT_TYPE_LABEL,
    ];
  }

  getExtraSupportedElementTypes(): string[] {
    return [PERSISTENCE_ELEMENT_TYPE, PERSISTENCE_CONTEXT_ELEMENT_TYPE];
  }

  getExtraSupportedElementTypesWithCategory?(): Map<string, string[]> {
    const elementTypesWithCategoryMap = new Map<string, string[]>();
    elementTypesWithCategoryMap.set(
      PACKAGEABLE_ELEMENT_GROUP_BY_CATEGORY.OTHER,
      [PERSISTENCE_ELEMENT_TYPE, PERSISTENCE_CONTEXT_ELEMENT_TYPE],
    );
    return elementTypesWithCategoryMap;
  }

  getExtraElementClassifiers(): ElementClassifier[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof Persistence) {
          return PERSISTENCE_ELEMENT_TYPE;
        } else if (element instanceof PersistenceContext) {
          return PERSISTENCE_CONTEXT_ELEMENT_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraElementIconGetters(): ElementIconGetter[] {
    return [
      (type: string): React.ReactNode | undefined => {
        if (type === PERSISTENCE_ELEMENT_TYPE) {
          return (
            <div className="icon icon--persistence">
              <MeteorIcon />
            </div>
          );
        } else if (type === PERSISTENCE_CONTEXT_ELEMENT_TYPE) {
          return (
            <div className="icon icon--persistence-context">
              <PuzzlePieceIcon />
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
        if (type === PERSISTENCE_ELEMENT_TYPE) {
          return new Persistence(name);
        } else if (type === PERSISTENCE_CONTEXT_ELEMENT_TYPE) {
          return new PersistenceContext(name);
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
        if (
          element instanceof Persistence ||
          element instanceof PersistenceContext
        ) {
          return new UnsupportedElementEditorState(editorStore, element);
        }
        return undefined;
      },
    ];
  }

  getExtraDragElementClassifiers(): DragElementClassifier[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof Persistence) {
          return PERSISTENCE_ELEMENT_PROJECT_EXPLORER_DND_TYPE;
        } else if (element instanceof PersistenceContext) {
          return PERSISTENCE_CONTEXT_ELEMENT_PROJECT_EXPLORER_DND_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraPureGrammarTextEditorDragElementTypes(): string[] {
    return [
      PERSISTENCE_ELEMENT_PROJECT_EXPLORER_DND_TYPE,
      PERSISTENCE_CONTEXT_ELEMENT_PROJECT_EXPLORER_DND_TYPE,
    ];
  }

  getExtraPureGrammarParserElementDocumentationGetters(): PureGrammarParserElementDocumentationGetter[] {
    return [
      (
        editorStore: EditorStore,
        parserKeyword: string,
        elementKeyword: string,
      ): DocumentationEntry | undefined => {
        if (parserKeyword === PURE_GRAMMAR_PERSISTENCE_PARSER_NAME) {
          if (elementKeyword === PURE_GRAMMAR_PERSISTENCE_ELEMENT_TYPE_LABEL) {
            return editorStore.applicationStore.documentationService.getDocEntry(
              DSL_PERSISTENCE_LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_PERSISTENCE,
            );
          } else if (
            elementKeyword ===
            PURE_GRAMMAR_PERSISTENCE_CONTEXT_ELEMENT_TYPE_LABEL
          ) {
            return editorStore.applicationStore.documentationService.getDocEntry(
              DSL_PERSISTENCE_LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_PERSISTENCE_CONTEXT,
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
        if (parserKeyword === PURE_GRAMMAR_PERSISTENCE_PARSER_NAME) {
          return editorStore.applicationStore.documentationService.getDocEntry(
            DSL_PERSISTENCE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
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
          text: PURE_GRAMMAR_PERSISTENCE_PARSER_NAME,
          description: `(dsl)`,
          documentation:
            editorStore.applicationStore.documentationService.getDocEntry(
              DSL_PERSISTENCE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
            ),
          insertText: PURE_GRAMMAR_PERSISTENCE_PARSER_NAME,
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
        parserKeyword === PURE_GRAMMAR_PERSISTENCE_PARSER_NAME
          ? [
              {
                text: PURE_GRAMMAR_PERSISTENCE_ELEMENT_TYPE_LABEL,
                description: '(blank)',
                insertText: BLANK_PERSISTENCE_SNIPPET,
              },
              {
                text: PURE_GRAMMAR_PERSISTENCE_CONTEXT_ELEMENT_TYPE_LABEL,
                description: '(blank)',
                insertText: BLANK_PERSISTENCE_CONTEXT_SNIPPET,
              },
            ]
          : undefined,
    ];
  }

  getExtraElementTypeLabelGetters(): ElementTypeLabelGetter[] {
    return [
      (type: string): string | undefined => {
        if (type === PERSISTENCE_CONTEXT_ELEMENT_TYPE) {
          return 'Persistence Context';
        }
        return undefined;
      },
    ];
  }
}
