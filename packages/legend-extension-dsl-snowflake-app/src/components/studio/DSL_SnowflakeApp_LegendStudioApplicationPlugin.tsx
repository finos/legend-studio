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

import type { PureGrammarTextSuggestion } from '@finos/legend-lego/code-editor';
import packageJson from '../../../../legend-extension-dsl-snowflake-app/package.json' assert { type: 'json' };
import {
  type DSL_LegendStudioApplicationPlugin_Extension,
  type EditorStore,
  type PureGrammarParserElementSnippetSuggestionsGetter,
  type PureGrammarParserKeywordSuggestionGetter,
  type ElementIconGetter,
  type ElementEditorState,
  type ElementEditorRenderer,
  type NewElementFromStateCreator,
  type NewElementState,
  LegendStudioApplicationPlugin,
  type ElementClassifier,
  type ElementEditorStateCreator,
  FUNCTION_PROMOTE_TYPE,
} from '@finos/legend-application-studio';
import { Snowflake_BrandIcon } from '@finos/legend-art';
import { SNOWFLAKE_APP_CODE_SNIPPET } from '../../__lib__/studio/DSL_SnowflakeApp_LegendStudioCodeSnippet.js';
import { SnowflakeAppFunctionActivatorEditor } from './SnowflakeAppFunctionActivatorEditor.js';
import { SnowflakeAppFunctionActivatorEdtiorState } from '../../stores/studio/SnowflakeAppFunctionActivatorEdtiorState.js';
import {
  ConcreteFunctionDefinition,
  type PackageableElement,
} from '@finos/legend-graph';
import { create_SnowflakeAppElement } from '../../graph/helpers/DSL_SnowflakeApp_Helper.js';
import { assertType } from '@finos/legend-shared';
import { SnowflakeApp } from '../../graph/metamodel/pure/model/packageableElements/snowflakeApp/DSL_SnowflakeApp_SnowflakeApp.js';

const PURE_GRAMMAR_SNOWFLAKE_APP_PARSER_NAME = 'Snowflake';
const PURE_GRAMMAR_SNOWFLAKE_APP_ELEMENT_TYPE_LABEL = 'SnowflakeApp';
const SNOWFLAKE_APP_ELEMENT_TYPE = 'SNOWFLAKE_APP';

export class DSL_SnowflakeApp_LegendStudioApplicationPlugin
  extends LegendStudioApplicationPlugin
  implements DSL_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.applicationStudioPlugin, packageJson.version);
  }

  getExtraElementIconGetters(): ElementIconGetter[] {
    return [
      (type: string): React.ReactNode | undefined => {
        if (type === SNOWFLAKE_APP_ELEMENT_TYPE) {
          return (
            <div className="icon color--snowflake-app">
              <Snowflake_BrandIcon />
            </div>
          );
        }
        return undefined;
      },
    ];
  }

  getExtraPureGrammarKeywords(): string[] {
    return [PURE_GRAMMAR_SNOWFLAKE_APP_ELEMENT_TYPE_LABEL];
  }

  getExtraSupportedElementTypes(): string[] {
    return [SNOWFLAKE_APP_ELEMENT_TYPE];
  }

  getExtraNewElementFromStateCreators(): NewElementFromStateCreator[] {
    return [
      (
        type: string,
        name: string,
        state: NewElementState,
        options?: {
          decorElement: PackageableElement | undefined;
        },
      ): PackageableElement | undefined => {
        if (type === FUNCTION_PROMOTE_TYPE.SNOWFLAKE_NATIVE_APP) {
          assertType(
            options?.decorElement,
            ConcreteFunctionDefinition,
            `Can't create a SnowflakeApp due to missing ConcreteFunctionDefinition`,
          );
          return create_SnowflakeAppElement(name, options.decorElement);
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
        if (element instanceof SnowflakeApp) {
          return new SnowflakeAppFunctionActivatorEdtiorState(
            editorStore,
            element,
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
          text: PURE_GRAMMAR_SNOWFLAKE_APP_PARSER_NAME,
          description: `(dsl)`,
          insertText: PURE_GRAMMAR_SNOWFLAKE_APP_PARSER_NAME,
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
        parserKeyword === PURE_GRAMMAR_SNOWFLAKE_APP_PARSER_NAME
          ? [
              {
                text: PURE_GRAMMAR_SNOWFLAKE_APP_ELEMENT_TYPE_LABEL,
                insertText: SNOWFLAKE_APP_CODE_SNIPPET,
              },
            ]
          : undefined,
    ];
  }

  getExtraElementClassifiers(): ElementClassifier[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof SnowflakeApp) {
          return SNOWFLAKE_APP_ELEMENT_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraElementEditorRenderers(): ElementEditorRenderer[] {
    return [
      (elementEditorState: ElementEditorState): React.ReactNode | undefined => {
        if (
          elementEditorState instanceof SnowflakeAppFunctionActivatorEdtiorState
        ) {
          return (
            <SnowflakeAppFunctionActivatorEditor
              key={elementEditorState.uuid}
            />
          );
        }
        return undefined;
      },
    ];
  }
}
