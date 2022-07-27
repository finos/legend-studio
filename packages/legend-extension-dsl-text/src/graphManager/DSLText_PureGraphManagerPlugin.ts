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

import packageJson from '../../package.json';
import { Text } from '../graph/metamodel/pure/model/packageableElements/text/DSLText_Text.js';
import {
  PureGraphManagerPlugin,
  type ObserverContext,
  type ElementObserver,
  type PackageableElement,
  type PureGrammarElementLabeler,
} from '@finos/legend-graph';
import { observe_Text } from './action/changeDetection/DSLText_ObserverHelper.js';

export const PURE_GRAMMAR_TEXT_PARSER_NAME = 'Text';
export const PURE_GRAMMAR_TEXT_ELEMENT_TYPE_LABEL = 'Text';

export class DSLText_PureGraphManagerPlugin extends PureGraphManagerPlugin {
  constructor() {
    super(packageJson.extensions.pureGraphManagerPlugin, packageJson.version);
  }

  override getExtraPureGrammarParserNames(): string[] {
    return [PURE_GRAMMAR_TEXT_PARSER_NAME];
  }

  override getExtraPureGrammarKeywords(): string[] {
    return [PURE_GRAMMAR_TEXT_ELEMENT_TYPE_LABEL];
  }

  override getExtraPureGrammarElementLabelers(): PureGrammarElementLabeler[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof Text) {
          return PURE_GRAMMAR_TEXT_ELEMENT_TYPE_LABEL;
        }
        return undefined;
      },
    ];
  }

  override getExtraElementObservers(): ElementObserver[] {
    return [
      (
        element: PackageableElement,
        context: ObserverContext,
      ): PackageableElement | undefined => {
        if (element instanceof Text) {
          return observe_Text(element);
        }
        return undefined;
      },
    ];
  }
}
