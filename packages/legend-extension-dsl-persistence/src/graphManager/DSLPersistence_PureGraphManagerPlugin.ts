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
import { Persistence } from '../models/metamodels/pure/model/packageableElements/persistence/Persistence';
import {
  PureGraphManagerPlugin,
  type PackageableElement,
  type PureGrammarElementLabeler,
  ElementObserver,
  ObserverContext,
} from '@finos/legend-graph';
import { DataSpace } from '@finos/legend-extension-dsl-data-space/lib/models/metamodels/pure/model/packageableElements/dataSpace/DSLDataSpace_DataSpace';
import { observe_DataSpace } from '@finos/legend-extension-dsl-data-space/lib/graphManager/action/changeDetection/DSLDataSpace_ObserverHelper';
import { observe_Persistence } from './action/changeDetection/DSLPersistence_ObserverHelper';

const PURE_GRAMMAR_PERSISTENCE_PARSER_NAME = 'Persistence';
const PURE_GRAMMAR_PERSISTENCE_ELEMENT_TYPE_LABEL = 'Persistence';

export class DSLPersistence_PureGraphManagerPlugin extends PureGraphManagerPlugin {
  constructor() {
    super(packageJson.extensions.pureGraphManagerPlugin, packageJson.version);
  }

  override getExtraPureGrammarParserNames(): string[] {
    return [PURE_GRAMMAR_PERSISTENCE_PARSER_NAME];
  }

  override getExtraPureGrammarKeywords(): string[] {
    return [PURE_GRAMMAR_PERSISTENCE_ELEMENT_TYPE_LABEL];
  }

  override getExtraPureGrammarElementLabelers(): PureGrammarElementLabeler[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof Persistence) {
          return PURE_GRAMMAR_PERSISTENCE_ELEMENT_TYPE_LABEL;
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
        if (element instanceof Persistence) {
          return observe_Persistence(element);
        }
        return undefined;
      },
    ];
  }
}
