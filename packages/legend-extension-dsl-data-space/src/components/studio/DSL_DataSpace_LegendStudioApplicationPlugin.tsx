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

import packageJson from '../../../package.json' assert { type: 'json' };
import {
  type NewElementFromStateCreator,
  type ElementClassifier,
  type DragElementClassifier,
  type ElementIconGetter,
  type DSL_LegendStudioApplicationPlugin_Extension,
  type NewElementState,
  type ElementEditorStateCreator,
  type EditorStore,
  type ElementEditorState,
  type PureGrammarParserElementDocumentationGetter,
  type PureGrammarParserDocumentationGetter,
  type PureGrammarParserKeywordSuggestionGetter,
  type PureGrammarParserElementSnippetSuggestionsGetter,
  UnsupportedElementEditorState,
  LegendStudioApplicationPlugin,
  type ExplorerContextMenuItemRendererConfiguration,
  type EditorExtensionStateBuilder,
  type EditorExtensionComponentRendererConfiguration,
} from '@finos/legend-application-studio';
import {
  PackageableElementExplicitReference,
  stub_Mapping,
  stub_PackageableRuntime,
  type PackageableElement,
} from '@finos/legend-graph';
import {
  DataSpace,
  DataSpaceExecutionContext,
} from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import { DSL_DATA_SPACE_LEGEND_STUDIO_DOCUMENTATION_KEY } from '../../__lib__/studio/DSL_DataSpace_LegendStudioDocumentation.js';
import { SIMPLE_DATA_SPACE_SNIPPET } from '../../__lib__/studio/DSL_DataSpace_LegendStudioCodeSnippet.js';
import type { DocumentationEntry } from '@finos/legend-application';
import { DataSpaceIcon } from '../DSL_DataSpace_Icon.js';
import { DataSpacePreviewState } from '../../stores/studio/DataSpacePreviewState.js';
import {
  DataSpacePreviewDialog,
  DataSpacePreviewAction,
} from './DataSpacePreviewAction.js';
import type { PureGrammarTextSuggestion } from '@finos/legend-lego/code-editor';

const DATA_SPACE_ELEMENT_TYPE = 'DATA SPACE';
const DATA_SPACE_ELEMENT_PROJECT_EXPLORER_DND_TYPE =
  'PROJECT_EXPLORER_DATA_SPACE';

const PURE_GRAMMAR_DATA_SPACE_PARSER_NAME = 'DataSpace';
const PURE_GRAMMAR_DATA_SPACE_ELEMENT_TYPE_LABEL = 'DataSpace';

export class DSL_DataSpace_LegendStudioApplicationPlugin
  extends LegendStudioApplicationPlugin
  implements DSL_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.applicationStudioPlugin, packageJson.version);
  }

  override getExtraRequiredDocumentationKeys(): string[] {
    return [
      DSL_DATA_SPACE_LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_DATA_SPACE,
      DSL_DATA_SPACE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER,
    ];
  }

  override getExtraExplorerContextMenuItemRendererConfigurations(): ExplorerContextMenuItemRendererConfiguration[] {
    return [
      {
        key: 'data-space-preview',
        renderer: (editorStore, element) => {
          if (element instanceof DataSpace) {
            return <DataSpacePreviewAction dataSpace={element} />;
          }
          return undefined;
        },
      },
    ];
  }

  override getExtraEditorExtensionStateBuilders(): EditorExtensionStateBuilder[] {
    return [(editorStore) => new DataSpacePreviewState(editorStore)];
  }

  override getExtraEditorExtensionComponentRendererConfigurations(): EditorExtensionComponentRendererConfiguration[] {
    return [
      {
        key: 'data-space-preview',
        renderer: (editorStore) => <DataSpacePreviewDialog />,
      },
    ];
  }

  getExtraPureGrammarKeywords(): string[] {
    return [PURE_GRAMMAR_DATA_SPACE_ELEMENT_TYPE_LABEL];
  }

  getExtraSupportedElementTypes(): string[] {
    return [DATA_SPACE_ELEMENT_TYPE];
  }

  getExtraElementClassifiers(): ElementClassifier[] {
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
          return <DataSpaceIcon />;
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
          const dataSpaceExecutionContext = new DataSpaceExecutionContext();
          dataSpaceExecutionContext.name = 'dummyContext';
          dataSpaceExecutionContext.mapping =
            PackageableElementExplicitReference.create(stub_Mapping());
          dataSpaceExecutionContext.defaultRuntime =
            PackageableElementExplicitReference.create(
              stub_PackageableRuntime(),
            );
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

  getExtraDragElementClassifiers(): DragElementClassifier[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof DataSpace) {
          return DATA_SPACE_ELEMENT_PROJECT_EXPLORER_DND_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraPureGrammarTextEditorDragElementTypes(): string[] {
    return [DATA_SPACE_ELEMENT_PROJECT_EXPLORER_DND_TYPE];
  }

  getExtraPureGrammarParserElementDocumentationGetters(): PureGrammarParserElementDocumentationGetter[] {
    return [
      (
        editorStore: EditorStore,
        parserKeyword: string,
        elementKeyword: string,
      ): DocumentationEntry | undefined => {
        if (parserKeyword === PURE_GRAMMAR_DATA_SPACE_PARSER_NAME) {
          if (elementKeyword === PURE_GRAMMAR_DATA_SPACE_ELEMENT_TYPE_LABEL) {
            return editorStore.applicationStore.documentationService.getDocEntry(
              DSL_DATA_SPACE_LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_DATA_SPACE,
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
        if (parserKeyword === PURE_GRAMMAR_DATA_SPACE_PARSER_NAME) {
          return editorStore.applicationStore.documentationService.getDocEntry(
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
          documentation:
            editorStore.applicationStore.documentationService.getDocEntry(
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
                insertText: SIMPLE_DATA_SPACE_SNIPPET,
              },
            ]
          : undefined,
    ];
  }
}
