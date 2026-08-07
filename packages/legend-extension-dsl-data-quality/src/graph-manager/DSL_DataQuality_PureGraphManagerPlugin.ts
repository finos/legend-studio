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
import packageJson from '../../package.json' with { type: 'json' };
import {
  type AtomicTest,
  type AtomicTestObserver,
  type ElementObserver,
  type PureGraphManagerExtensionBuilder,
  type ObserverContext,
  type PackageableElement,
  PureGraphManagerPlugin,
  type Testable_PureGraphManagerPlugin_Extension,
} from '@finos/legend-graph';
import {
  DataQualityClassValidationsConfiguration,
  DataQualityServiceValidationConfiguration,
  DataQualityRelationValidationConfiguration,
  DataQualityRelationComparisonConfiguration,
} from '../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import {
  DataQualityRelationComparisonTest,
  DataQualityRelationValidationTest,
} from '../graph/metamodel/pure/packageableElements/data-quality/DataQualityTest.js';
import {
  observe_DataQualityConstraintsConfiguration,
  observe_DataQualityServiceValidationConfiguration,
  observe_DataQualityRelationValidationConfiguration,
  observe_DataQualityRelationComparisonConfiguration,
  observe_DataQualityRelationComparisonTest,
  observe_DataQualityRelationValidationTest,
} from './action/changeDetection/DSL_DataQuality_ObserverHelper.js';
import { DSL_DataQuality_buildGraphManagerExtension } from './protocol/pure/DSL_DataQuality_buildGraphManagerExtension.js';

export class DSL_DataQuality_PureGraphManagerPlugin
  extends PureGraphManagerPlugin
  implements Testable_PureGraphManagerPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.pureGraphManagerPlugin, packageJson.version);
  }

  override getExtraElementObservers(): ElementObserver[] {
    return [
      (
        element: PackageableElement,
        context: ObserverContext,
      ): PackageableElement | undefined => {
        if (element instanceof DataQualityClassValidationsConfiguration) {
          return observe_DataQualityConstraintsConfiguration(element);
        }
        if (element instanceof DataQualityServiceValidationConfiguration) {
          return observe_DataQualityServiceValidationConfiguration(element);
        }
        if (element instanceof DataQualityRelationValidationConfiguration) {
          return observe_DataQualityRelationValidationConfiguration(
            element,
            context,
          );
        }
        if (element instanceof DataQualityRelationComparisonConfiguration) {
          return observe_DataQualityRelationComparisonConfiguration(
            element,
            context,
          );
        }
        return undefined;
      },
    ];
  }

  getExtraAtomicTestObservers(): AtomicTestObserver[] {
    return [
      (element: AtomicTest): AtomicTest | undefined => {
        if (element instanceof DataQualityRelationValidationTest) {
          return observe_DataQualityRelationValidationTest(element);
        }
        if (element instanceof DataQualityRelationComparisonTest) {
          return observe_DataQualityRelationComparisonTest(element);
        }
        return undefined;
      },
    ];
  }

  override getExtraPureGraphManagerExtensionBuilders(): PureGraphManagerExtensionBuilder[] {
    return [DSL_DataQuality_buildGraphManagerExtension];
  }
}
