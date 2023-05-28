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
import packageJson from '../../../package.json';
import {
  LegendStudioApplicationPlugin,
  type DSL_LegendStudioApplicationPlugin_Extension,
  type EditorStore,
  type PureGrammarParserElementSnippetSuggestionsGetter,
  type PureGrammarParserKeywordSuggestionGetter,
  type ElementIconGetter,
} from '@finos/legend-application-studio';
import { SNOWFLAKE_APP_CODE_SNIPPET } from '../../__lib__/studio/DSL_SnowflakeApp_LegendStudioCodeSnippet.js';
import {
  INTERNAL__UnknownFunctionActivator,
  type PackageableElement,
} from '@finos/legend-graph';
import { Snowflake_BrandIcon } from '@finos/legend-art';

const PURE_GRAMMAR_SNOWFLAKE_APP_PARSER_NAME = 'Snowflake';
const PURE_GRAMMAR_SNOWFLAKE_APP_ELEMENT_TYPE_LABEL = 'SnowflakeApp';

export class DSL_SnowflakeApp_LegendStudioApplicationPlugin
  extends LegendStudioApplicationPlugin
  implements DSL_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super(
      packageJson.extensions.dsl_snowflake_app_applicationStudioPlugin,
      packageJson.version,
    );
  }

  getExtraElementIconGetters(): ElementIconGetter[] {
    return [
      (
        type: string,
        element: PackageableElement | undefined,
      ): React.ReactNode | undefined => {
        // NOTE: this is temporary until we fully support snowflake app element
        if (
          element instanceof INTERNAL__UnknownFunctionActivator &&
          element.content._type === 'snowflakeApp'
        ) {
          return <Snowflake_BrandIcon className="icon__snowflake-app" />;
        }
        return undefined;
      },
    ];
  }

  getExtraPureGrammarKeywords(): string[] {
    return [PURE_GRAMMAR_SNOWFLAKE_APP_ELEMENT_TYPE_LABEL];
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
}
