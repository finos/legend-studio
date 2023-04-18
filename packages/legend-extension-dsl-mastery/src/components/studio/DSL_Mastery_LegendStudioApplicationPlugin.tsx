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
import { PiedPiperSquareIcon } from '@finos/legend-art';
import type { PackageableElement } from '@finos/legend-graph';
import {
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
  type ElementTypeLabelGetter,
  LegendStudioApplicationPlugin,
  UnsupportedElementEditorState,
} from '@finos/legend-application-studio';
import { MasterRecordDefinition } from '../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_MasterRecordDefinition.js';
import { SIMPLE_MASTER_RECORD_DEFINITION_SNIPPET } from '../../__lib__/studio/DSL_Mastery_LegendStudioCodeSnippet.js';
import {
  PURE_GRAMMAR_MASTERY_ELEMENT_TYPE_LABEL,
  PURE_GRAMMAR_MASTERY_PARSER_NAME,
} from '../../graph-manager/DSL_Mastery_PureGraphManagerPlugin.js';
import type { PureGrammarTextSuggestion } from '@finos/legend-lego/code-editor';

const MASTERY_ELEMENT_TYPE = 'MASTERY';
const MASTERY_CONTEXT_ELEMENT_TYPE = 'MASTERY_CONTEXT';
const MASTERY_ELEMENT_PROJECT_EXPLORER_DND_TYPE = 'PROJECT_EXPLORER_MASTERY';

export class DSL_Mastery_LegendStudioApplicationPlugin
  extends LegendStudioApplicationPlugin
  implements DSL_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.applicationStudioPlugin, packageJson.version);
  }

  getExtraSupportedElementTypes(): string[] {
    return [MASTERY_ELEMENT_TYPE];
  }

  getExtraElementClassifiers(): ElementClassifier[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof MasterRecordDefinition) {
          return MASTERY_ELEMENT_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraElementIconGetters(): ElementIconGetter[] {
    return [
      (type: string): React.ReactNode | undefined => {
        if (type === MASTERY_ELEMENT_TYPE) {
          return (
            <div className="icon icon--mastery">
              <PiedPiperSquareIcon />
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
        if (type === MASTERY_ELEMENT_TYPE) {
          return new MasterRecordDefinition(name);
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
        if (element instanceof MasterRecordDefinition) {
          return new UnsupportedElementEditorState(editorStore, element);
        }
        return undefined;
      },
    ];
  }

  getExtraDragElementClassifiers(): DragElementClassifier[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof MasterRecordDefinition) {
          return MASTERY_ELEMENT_PROJECT_EXPLORER_DND_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraPureGrammarTextEditorDragElementTypes(): string[] {
    return [MASTERY_ELEMENT_PROJECT_EXPLORER_DND_TYPE];
  }

  getExtraPureGrammarParserElementSnippetSuggestionsGetters(): PureGrammarParserElementSnippetSuggestionsGetter[] {
    return [
      (
        editorStore: EditorStore,
        parserKeyword: string,
      ): PureGrammarTextSuggestion[] | undefined =>
        parserKeyword === PURE_GRAMMAR_MASTERY_PARSER_NAME
          ? [
              {
                text: PURE_GRAMMAR_MASTERY_ELEMENT_TYPE_LABEL,
                insertText: SIMPLE_MASTER_RECORD_DEFINITION_SNIPPET,
              },
            ]
          : undefined,
    ];
  }

  getExtraElementTypeLabelGetters(): ElementTypeLabelGetter[] {
    return [
      (type: string): string | undefined => {
        if (type === MASTERY_CONTEXT_ELEMENT_TYPE) {
          return 'Mastery Context';
        }
        return undefined;
      },
    ];
  }
}
