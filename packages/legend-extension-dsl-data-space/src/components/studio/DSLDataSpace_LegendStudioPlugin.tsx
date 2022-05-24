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
  type NewElementFromStateCreator,
  type ElementTypeGetter,
  type ElementProjectExplorerDnDTypeGetter,
  type ElementIconGetter,
  type DSL_LegendStudioPlugin_Extension,
  type NewElementState,
  type ElementEditorStateCreator,
  type EditorStore,
  type ElementEditorState,
  type PureGrammarParserElementDocumentationGetter,
  type PureGrammarParserDocumentationGetter,
  type PureGrammarParserKeywordSuggestionGetter,
  type PureGrammarTextSuggestion,
  type PureGrammarParserElementSnippetSuggestionsGetter,
  UnsupportedElementEditorState,
  LegendStudioPlugin,
} from '@finos/legend-studio';
import { SquareIcon } from '@finos/legend-art';
import type { PackageableElement } from '@finos/legend-graph';
import {
  DataSpace,
  DataSpaceExecutionContext,
} from '../../models/metamodels/pure/model/packageableElements/dataSpace/DSLDataSpace_DataSpace';
import { LATEST_VERSION_ALIAS } from '@finos/legend-server-depot';
import {
  collectKeyedDocumnetationEntriesFromConfig,
  type LegendApplicationDocumentationEntry,
  type LegendApplicationKeyedDocumentationEntry,
} from '@finos/legend-application';
import {
  DSL_DATA_SPACE_DOCUMENTATION_ENTRIES,
  DSL_DATA_SPACE_LEGEND_STUDIO_DOCUMENTATION_KEY,
} from './DSLDataSpace_LegendStudioDocumentation';
import {
  PURE_GRAMMAR_DATA_SPACE_ELEMENT_TYPE_LABEL,
  PURE_GRAMMAR_DATA_SPACE_PARSER_NAME,
} from '../../graphManager/DSLDataSpace_PureGraphManagerPlugin';
import { SIMPLE_DATA_SPACE_SNIPPET } from './DSLDataSpace_CodeSnippets';

const DATA_SPACE_ELEMENT_TYPE = 'DATA SPACE';
const DATA_SPACE_ELEMENT_PROJECT_EXPLORER_DND_TYPE =
  'PROJECT_EXPLORER_DATA_SPACE';

export class DSLDataSpace_LegendStudioPlugin
  extends LegendStudioPlugin
  implements DSL_LegendStudioPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.studioPlugin, packageJson.version);
  }

  override getExtraKeyedDocumentationEntries(): LegendApplicationKeyedDocumentationEntry[] {
    return collectKeyedDocumnetationEntriesFromConfig(
      DSL_DATA_SPACE_DOCUMENTATION_ENTRIES,
    );
  }

  getExtraSupportedElementTypes(): string[] {
    return [DATA_SPACE_ELEMENT_TYPE];
  }

  getExtraElementTypeGetters(): ElementTypeGetter[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof DataSpace) {
          return DATA_SPACE_ELEMENT_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraElementIconGetters(): ElementIconGetter[] {
    return [
      (type: string): React.ReactNode | undefined => {
        if (type === DATA_SPACE_ELEMENT_TYPE) {
          return (
            <div className="icon icon--data-space">
              <SquareIcon />
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
        if (type === DATA_SPACE_ELEMENT_TYPE) {
          const dataSpace = new DataSpace(name);
          dataSpace.groupId =
            state.editorStore.projectConfigurationEditorState.currentProjectConfiguration.groupId;
          dataSpace.artifactId =
            state.editorStore.projectConfigurationEditorState.currentProjectConfiguration.artifactId;
          dataSpace.versionId = LATEST_VERSION_ALIAS;
          const dataSpaceExecutionContext = new DataSpaceExecutionContext();
          dataSpaceExecutionContext.name = 'dummyContext';
          dataSpaceExecutionContext.mapping = 'dummyMapping';
          dataSpaceExecutionContext.defaultRuntime = 'dummyRuntime';
          dataSpace.executionContexts = [dataSpaceExecutionContext];
          dataSpace.defaultExecutionContext = dataSpaceExecutionContext;
          return dataSpace;
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
        if (element instanceof DataSpace) {
          return new UnsupportedElementEditorState(editorStore, element);
        }
        return undefined;
      },
    ];
  }

  getExtraElementProjectExplorerDnDTypeGetters(): ElementProjectExplorerDnDTypeGetter[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof DataSpace) {
          return DATA_SPACE_ELEMENT_PROJECT_EXPLORER_DND_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraPureGrammarTextEditorDnDTypes(): string[] {
    return [DATA_SPACE_ELEMENT_PROJECT_EXPLORER_DND_TYPE];
  }

  getExtraPureGrammarParserElementDocumentationGetters(): PureGrammarParserElementDocumentationGetter[] {
    return [
      (
        editorStore: EditorStore,
        parserKeyword: string,
        elementKeyword: string,
      ): LegendApplicationDocumentationEntry | undefined => {
        if (parserKeyword === PURE_GRAMMAR_DATA_SPACE_PARSER_NAME) {
          if (elementKeyword === PURE_GRAMMAR_DATA_SPACE_ELEMENT_TYPE_LABEL) {
            return editorStore.applicationStore.docRegistry.getEntry(
              DSL_DATA_SPACE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_DATA_SPACE,
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
        if (parserKeyword === PURE_GRAMMAR_DATA_SPACE_PARSER_NAME) {
          return editorStore.applicationStore.docRegistry.getEntry(
            DSL_DATA_SPACE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
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
          text: PURE_GRAMMAR_DATA_SPACE_PARSER_NAME,
          description: `(dsl)`,
          documentation: editorStore.applicationStore.docRegistry.getEntry(
            DSL_DATA_SPACE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
          ),
          insertText: PURE_GRAMMAR_DATA_SPACE_PARSER_NAME,
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
        parserKeyword === PURE_GRAMMAR_DATA_SPACE_PARSER_NAME
          ? [
              {
                text: PURE_GRAMMAR_DATA_SPACE_ELEMENT_TYPE_LABEL,
                description: 'simple',
                insertText: SIMPLE_DATA_SPACE_SNIPPET,
              },
            ]
          : undefined,
    ];
  }
}
