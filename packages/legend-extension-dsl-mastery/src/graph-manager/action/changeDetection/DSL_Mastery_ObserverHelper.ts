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

import type { MasterRecordDefinition } from '../../../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_MasterRecordDefinition.js';
import {
  observe_Abstract_PackageableElement,
  skipObserved,
} from '@finos/legend-graph';
import { makeObservable, observable, override } from 'mobx';

// TODO: Add an observe on all the non primitives properties once form mode is enabled
export const observe_Mastery = skipObserved(
  (metamodel: MasterRecordDefinition): MasterRecordDefinition => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<MasterRecordDefinition, '_elementHashCode'>(metamodel, {
      modelClass: observable,
      identityResolution: observable,
      sources: observable,
      precedenceRules: observable,
      _elementHashCode: override,
    });

    return metamodel;
  },
);
