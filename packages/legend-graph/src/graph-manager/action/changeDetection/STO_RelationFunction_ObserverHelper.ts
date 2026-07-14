/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { computed, makeObservable, observable } from 'mobx';
import type { EmbeddedRelationFunctionPropertyMapping } from '../../../graph/metamodel/pure/packageableElements/mapping/relationFunction/EmbeddedRelationFunctionPropertyMapping.js';
import type { InlineEmbeddedRelationFunctionPropertyMapping } from '../../../graph/metamodel/pure/packageableElements/mapping/relationFunction/InlineEmbeddedRelationFunctionPropertyMapping.js';
import type { RelationFunctionPropertyMapping } from '../../../graph/metamodel/pure/packageableElements/mapping/relationFunction/RelationFunctionPropertyMapping.js';
import { skipObservedWithContext } from './CoreObserverHelper.js';
import {
  observe_Abstract_InstanceSetImplementation,
  observe_Abstract_PropertyMapping,
  observe_RelationColumn,
  observe_SetImplementation,
} from './DSL_Mapping_ObserverHelper.js';
import { observe_BindingTransformer } from './DSL_ExternalFormat_ObserverHelper.js';

export const observe_RelationFunctionPropertyMapping = skipObservedWithContext(
  (
    metamodel: RelationFunctionPropertyMapping,
    context,
  ): RelationFunctionPropertyMapping => {
    observe_Abstract_PropertyMapping(metamodel, context);

    makeObservable(metamodel, {
      column: observable,
      bindingTransformer: observable,
      transformer: observable,
      hashCode: computed,
    });

    observe_RelationColumn(metamodel.column);
    if (metamodel.bindingTransformer) {
      observe_BindingTransformer(metamodel.bindingTransformer);
    }

    return metamodel;
  },
);

export const observe_EmbeddedRelationFunctionPropertyMapping =
  skipObservedWithContext(
    (
      metamodel: EmbeddedRelationFunctionPropertyMapping,
      context,
    ): EmbeddedRelationFunctionPropertyMapping => {
      observe_Abstract_PropertyMapping(metamodel, context);
      observe_Abstract_InstanceSetImplementation(metamodel, context);

      makeObservable(metamodel, {
        rootInstanceSetImplementation: observable,
        hashCode: computed,
      });

      return metamodel;
    },
  );

export const observe_InlineEmbeddedRelationFunctionPropertyMapping =
  skipObservedWithContext(
    (
      metamodel: InlineEmbeddedRelationFunctionPropertyMapping,
      context,
    ): InlineEmbeddedRelationFunctionPropertyMapping => {
      observe_Abstract_PropertyMapping(metamodel, context);
      observe_Abstract_InstanceSetImplementation(metamodel, context);

      makeObservable(metamodel, {
        inlineSetImplementation: observable,
      });

      observe_SetImplementation(metamodel.inlineSetImplementation, context);

      return metamodel;
    },
  );
