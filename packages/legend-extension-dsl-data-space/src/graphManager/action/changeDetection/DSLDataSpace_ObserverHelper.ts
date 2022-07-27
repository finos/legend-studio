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

import {
  observe_Abstract_PackageableElement,
  observe_StereotypeReference,
  observe_TaggedValue,
  skipObserved,
} from '@finos/legend-graph';
import { makeObservable, override } from 'mobx';
import type { DataSpace } from '../../../graph/metamodel/pure/model/packageableElements/dataSpace/DSLDataSpace_DataSpace.js';

export const observe_DataSpace = skipObserved(
  (metamodel: DataSpace): DataSpace => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<DataSpace, '_elementHashCode'>(metamodel, {
      _elementHashCode: override,
    });

    // TODO
    // metamodel.executionContexts.forEach(observe_DataSpaceExecutionContext);
    // observe_DataSpaceExecutionContext(metamodel.defaultExecutionContext);
    // if (metamodel.supportInfo) {
    //   observe_DataSpaceSupportInfo(metamodel.supportInfo);
    // }
    metamodel.stereotypes.forEach(observe_StereotypeReference);
    metamodel.taggedValues.forEach(observe_TaggedValue);

    return metamodel;
  },
);
