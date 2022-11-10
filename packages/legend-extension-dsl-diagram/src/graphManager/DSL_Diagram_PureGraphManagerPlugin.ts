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
import {
  PureGraphManagerPlugin,
  type ObserverContext,
  type ElementObserver,
  type PackageableElement,
  type PureGrammarElementLabeler,
} from '@finos/legend-graph';
import { observe_Diagram } from './action/changeDetection/DSL_Diagram_ObserverHelper.js';
import { Diagram } from '../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_Diagram.js';

export const PURE_GRAMMAR_DIAGRAM_PARSER_NAME = 'Diagram';
export const PURE_GRAMMAR_DIAGRAM_ELEMENT_TYPE_LABEL = 'Diagram';

export class DSL_Diagram_PureGraphManagerPlugin extends PureGraphManagerPlugin {
  constructor() {
    super(packageJson.extensions.pureGraphManagerPlugin, packageJson.version);
  }

  override getExtraPureGrammarParserNames(): string[] {
    return [PURE_GRAMMAR_DIAGRAM_PARSER_NAME];
  }

  override getExtraPureGrammarKeywords(): string[] {
    return [PURE_GRAMMAR_DIAGRAM_ELEMENT_TYPE_LABEL];
  }

  override getExtraPureGrammarElementLabelers(): PureGrammarElementLabeler[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof Diagram) {
          return PURE_GRAMMAR_DIAGRAM_ELEMENT_TYPE_LABEL;
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
        if (element instanceof Diagram) {
          return observe_Diagram(element);
        }
        return undefined;
      },
    ];
  }
}
