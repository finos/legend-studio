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
  type ElementEditorPostDeleteAction,
  type ElementEditorPostRenameAction,
  type ClassPreviewRenderer,
  type PureGrammarParserDocumentationGetter,
  type PureGrammarParserElementDocumentationGetter,
  type PureGrammarParserKeywordSuggestionGetter,
  type PureGrammarParserElementSnippetSuggestionsGetter,
  PACKAGEABLE_ELEMENT_GROUP_BY_CATEGORY,
} from '@finos/legend-application-studio';
import { ShapesIcon } from '@finos/legend-art';
import type { Class, PackageableElement } from '@finos/legend-graph';
import { Diagram } from '../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_Diagram.js';
import { DiagramEditorState } from '../../stores/studio/DiagramEditorState.js';
import { DiagramEditor } from './DiagramEditor.js';
import { ClassDiagramPreview } from './ClassDiagramPreview.js';
import { DSL_DIAGRAM_LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../__lib__/studio/DSL_Diagram_LegendStudioDocumentation.js';
import {
  EMPTY_DIAGRAM_SNIPPET,
  getDiagramSnippetWithGeneralizationView,
  getDiagramSnippetWithOneClassView,
  getDiagramSnippetWithPropertyView,
} from '../../__lib__/studio/DSL_Diagram_LegendStudioCodeSnippet.js';
import {
  collectKeyedCommandConfigEntriesFromConfig,
  type KeyedCommandConfigEntry,
} from '@finos/legend-application';
import { DSL_DIAGRAM_LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../__lib__/studio/DSL_Diagram_LegendStudioApplicationNavigationContext.js';
import { DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_CONFIG } from '../../__lib__/studio/DSL_Diagram_LegendStudioCommand.js';
import type { PureGrammarTextSuggestion } from '@finos/legend-code-editor';
import type { DocumentationEntry } from '@finos/legend-shared';

const DIAGRAM_ELEMENT_TYPE = 'DIAGRAM';
const DIAGRAM_ELEMENT_PROJECT_EXPLORER_DND_TYPE = 'PROJECT_EXPLORER_DIAGRAM';

const PURE_GRAMMAR_DIAGRAM_PARSER_NAME = 'Diagram';
const PURE_GRAMMAR_DIAGRAM_ELEMENT_TYPE_LABEL = 'Diagram';

export class DSL_Diagram_LegendStudioApplicationPlugin
  extends LegendStudioApplicationPlugin
  implements DSL_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.applicationStudioPlugin, packageJson.version);
  }

  override getExtraKeyedCommandConfigEntries(): KeyedCommandConfigEntry[] {
    return collectKeyedCommandConfigEntriesFromConfig(
      DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_CONFIG,
    );
  }

  override getExtraRequiredDocumentationKeys(): string[] {
    return [
      DSL_DIAGRAM_LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_DIAGRAM,
      DSL_DIAGRAM_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
    ];
  }

  override getExtraClassPreviewRenderers(): ClassPreviewRenderer[] {
    return [
      (_class: Class): React.ReactNode => (
        <ClassDiagramPreview _class={_class} />
      ),
    ];
  }

  override getExtraAccessEventLoggingApplicationContextKeys(): string[] {
    return [
      DSL_DIAGRAM_LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.DIAGRAM_EDITOR,
    ];
  }

  getExtraPureGrammarKeywords(): string[] {
    return [PURE_GRAMMAR_DIAGRAM_ELEMENT_TYPE_LABEL];
  }

  getExtraSupportedElementTypes(): string[] {
    return [DIAGRAM_ELEMENT_TYPE];
  }

  getExtraSupportedElementTypesWithCategory?(): Map<string, string[]> {
    const elementTypesWithCategoryMap = new Map<string, string[]>();
    elementTypesWithCategoryMap.set(
      PACKAGEABLE_ELEMENT_GROUP_BY_CATEGORY.MODEL,
      [DIAGRAM_ELEMENT_TYPE],
    );
    return elementTypesWithCategoryMap;
  }

  getExtraElementClassifiers(): ElementClassifier[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof Diagram) {
          return DIAGRAM_ELEMENT_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraElementIconGetters(): ElementIconGetter[] {
    return [
      (type: string): React.ReactNode | undefined => {
        if (type === DIAGRAM_ELEMENT_TYPE) {
          return (
            <div className="icon color--diagram">
              <ShapesIcon />
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
        if (elementEditorState instanceof DiagramEditorState) {
          return <DiagramEditor key={elementEditorState.uuid} />;
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
        if (type === DIAGRAM_ELEMENT_TYPE) {
          return new Diagram(name);
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
        if (element instanceof Diagram) {
          return new DiagramEditorState(editorStore, element);
        }
        return undefined;
      },
    ];
  }

  getExtraDragElementClassifiers(): DragElementClassifier[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof Diagram) {
          return DIAGRAM_ELEMENT_PROJECT_EXPLORER_DND_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraPureGrammarTextEditorDragElementTypes(): string[] {
    return [DIAGRAM_ELEMENT_PROJECT_EXPLORER_DND_TYPE];
  }

  getExtraElementEditorPostRenameActions(): ElementEditorPostRenameAction[] {
    return [
      (editorStore: EditorStore, element: PackageableElement): void => {
        // rerender currently opened diagram
        if (
          editorStore.tabManagerState.currentTab instanceof DiagramEditorState
        ) {
          editorStore.tabManagerState.currentTab.renderer.render();
        }
      },
    ];
  }

  getExtraElementEditorPostDeleteActions(): ElementEditorPostDeleteAction[] {
    return [
      (editorStore: EditorStore, element: PackageableElement): void => {
        // rerender currently opened diagram
        if (
          editorStore.tabManagerState.currentTab instanceof DiagramEditorState
        ) {
          editorStore.tabManagerState.currentTab.renderer.render();
        }
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
        if (parserKeyword === PURE_GRAMMAR_DIAGRAM_PARSER_NAME) {
          if (elementKeyword === PURE_GRAMMAR_DIAGRAM_ELEMENT_TYPE_LABEL) {
            return editorStore.applicationStore.documentationService.getDocEntry(
              DSL_DIAGRAM_LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_DIAGRAM,
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
        if (parserKeyword === PURE_GRAMMAR_DIAGRAM_PARSER_NAME) {
          return editorStore.applicationStore.documentationService.getDocEntry(
            DSL_DIAGRAM_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
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
          text: PURE_GRAMMAR_DIAGRAM_PARSER_NAME,
          description: `(dsl)`,
          documentation:
            editorStore.applicationStore.documentationService.getDocEntry(
              DSL_DIAGRAM_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
            ),
          insertText: PURE_GRAMMAR_DIAGRAM_PARSER_NAME,
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
        parserKeyword === PURE_GRAMMAR_DIAGRAM_PARSER_NAME
          ? [
              {
                text: PURE_GRAMMAR_DIAGRAM_ELEMENT_TYPE_LABEL,
                description: '(blank)',
                insertText: EMPTY_DIAGRAM_SNIPPET,
              },
              {
                text: PURE_GRAMMAR_DIAGRAM_ELEMENT_TYPE_LABEL,
                description: 'with class',
                insertText: getDiagramSnippetWithOneClassView(),
              },
              {
                text: PURE_GRAMMAR_DIAGRAM_ELEMENT_TYPE_LABEL,
                description: 'with inheritance',
                insertText: getDiagramSnippetWithGeneralizationView(),
              },
              {
                text: PURE_GRAMMAR_DIAGRAM_ELEMENT_TYPE_LABEL,
                description: 'with composition',
                insertText: getDiagramSnippetWithPropertyView(),
              },
            ]
          : undefined,
    ];
  }

  getExtraGrammarTextEditorAutoFoldingElementCreatorKeywords(): string[] {
    return [PURE_GRAMMAR_DIAGRAM_PARSER_NAME];
  }
}
