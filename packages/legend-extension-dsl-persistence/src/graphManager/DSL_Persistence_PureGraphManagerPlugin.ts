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
import { Persistence } from '../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Persistence.js';
import { PersistenceContext } from '../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistenceContext.js';
import {
  observe_Persistence,
  observe_PersistenceTest,
} from './action/changeDetection/DSL_Persistence_ObserverHelper.js';
import { observe_PersistenceContext } from './action/changeDetection/DSL_PersistenceContext_ObserverHelper.js';
import {
  PureGraphManagerPlugin,
  type PackageableElement,
  type PureGrammarElementLabeler,
  type ElementObserver,
  type ObserverContext,
  TestAssertion,
  V1_AssertionStatus,
  AtomicTest,
  AtomicTestObserver,
} from '@finos/legend-graph';
import { PersistenceTest } from '../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistenceTest.js';
import type { TestableAssertion } from '../../../legend-graph/src/graphManager/PureGraphManagerPlugin.js';

export const PURE_GRAMMAR_PERSISTENCE_PARSER_NAME = 'Persistence';
export const PURE_GRAMMAR_PERSISTENCE_ELEMENT_TYPE_LABEL = 'Persistence';
export const PURE_GRAMMAR_PERSISTENCE_CONTEXT_ELEMENT_TYPE_LABEL =
  'PersistenceContext';

export class DSL_Persistence_PureGraphManagerPlugin extends PureGraphManagerPlugin {
  constructor() {
    super(packageJson.extensions.pureGraphManagerPlugin, packageJson.version);
  }

  override getExtraPureGrammarParserNames(): string[] {
    return [PURE_GRAMMAR_PERSISTENCE_PARSER_NAME];
  }

  override getExtraPureGrammarKeywords(): string[] {
    return [
      PURE_GRAMMAR_PERSISTENCE_ELEMENT_TYPE_LABEL,
      PURE_GRAMMAR_PERSISTENCE_CONTEXT_ELEMENT_TYPE_LABEL,
    ];
  }

  override getExtraPureGrammarElementLabelers(): PureGrammarElementLabeler[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof Persistence) {
          return PURE_GRAMMAR_PERSISTENCE_ELEMENT_TYPE_LABEL;
        } else if (element instanceof PersistenceContext) {
          return PURE_GRAMMAR_PERSISTENCE_CONTEXT_ELEMENT_TYPE_LABEL;
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
          return observe_Persistence(element, context);
        } else if (element instanceof PersistenceContext) {
          return observe_PersistenceContext(element);
        }
        return undefined;
      },
    ];
  }

  override getExtraTestableAssertionBuilders(): TestableAssertion[] {
    return [
      (
        atomicTest: AtomicTest,
        element: V1_AssertionStatus,
      ): TestAssertion | undefined => {
        if (atomicTest instanceof PersistenceTest) {
          for (const testBatch of atomicTest.testBatches) {
            for (const assertion of testBatch.assertions) {
              if (assertion.id === element.id) {
                return assertion;
              }
            }
          }
        }
        return undefined;
      },
    ];
  }

  override getExtraAtomicTestObservers(): AtomicTestObserver[] {
    return [
      (
        element: AtomicTest,
        context: ObserverContext,
      ): AtomicTest | undefined => {
        if (element instanceof PersistenceTest) {
          return observe_PersistenceTest(element, context);
        }
        return undefined;
      },
    ];
  }
}
