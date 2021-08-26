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

import packageJson from '../../../../../package.json';
import { Text } from '../model/packageableElements/Text';
import type { Clazz } from '@finos/legend-shared';
import type {
  GraphPluginManager,
  PackageableElement,
} from '@finos/legend-graph';
import { PureGraphManagerPlugin } from '@finos/legend-graph';

const PURE_GRAMMAR_TEXT_PARSER_NAME = 'Text';
export const PURE_GRAMMAR_TEXT_ELEMENT_TYPE_LABEL = 'Text';

export class DSLText_PureGraphManagerPlugin extends PureGraphManagerPlugin {
  constructor() {
    super(packageJson.extensions.pureGraphManagerPlugin, packageJson.version);
  }

  install(pluginManager: GraphPluginManager): void {
    pluginManager.registerPureGraphManagerPlugin(this);
  }

  override getExtraPureGraphExtensionClasses(): Clazz<PackageableElement>[] {
    return [Text];
  }

  override getExtraPureGrammarParserNames(): string[] {
    return [PURE_GRAMMAR_TEXT_PARSER_NAME];
  }

  override getExtraPureGrammarKeywords(): string[] {
    return [PURE_GRAMMAR_TEXT_ELEMENT_TYPE_LABEL];
  }
}
