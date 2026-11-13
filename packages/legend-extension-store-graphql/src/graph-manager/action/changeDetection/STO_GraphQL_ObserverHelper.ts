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

import {
  observe_Abstract_PackageableElement,
  observe_Abstract_Connection,
  observe_Abstract_InstanceSetImplementation,
  skipObserved,
  skipObservedWithContext,
} from '@finos/legend-graph';
import { computed, makeObservable, observable, override } from 'mobx';
import type { GraphQLStore } from '../../../graph/metamodel/pure/model/packageableElements/store/graphQL/model/STO_GraphQL_GraphQLStore.js';
import type { GraphQLConnection } from '../../../graph/metamodel/pure/model/packageableElements/store/graphQL/connection/STO_GraphQL_GraphQLConnection.js';
import type { RootGraphQLInstanceSetImplementation } from '../../../graph/metamodel/pure/model/packageableElements/store/graphQL/mapping/STO_GraphQL_RootGraphQLInstanceSetImplementation.js';

// ------------------------------------- Store -------------------------------------

export const observe_GraphQLStore = skipObserved(
  (metamodel: GraphQLStore): GraphQLStore => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<GraphQLStore, '_elementHashCode'>(metamodel, {
      schema: observable.ref,
      _elementHashCode: override,
    });

    return metamodel;
  },
);

// ------------------------------------- Connection -------------------------------------

export const observe_GraphQLConnection = skipObserved(
  (metamodel: GraphQLConnection): GraphQLConnection => {
    observe_Abstract_Connection(metamodel);

    makeObservable(metamodel, {
      url: observable,
      authenticationSpecification: observable.ref,
      hashCode: computed,
    });

    return metamodel;
  },
);

// ------------------------------------- Mapping -------------------------------------

export const observe_RootGraphQLInstanceSetImplementation =
  skipObservedWithContext(
    (
      metamodel: RootGraphQLInstanceSetImplementation,
      context,
    ): RootGraphQLInstanceSetImplementation => {
      observe_Abstract_InstanceSetImplementation(metamodel, context);

      makeObservable(metamodel, {
        storePath: observable,
        typeName: observable,
        bindingPath: observable,
        joinAccessorQualifiedProperty: observable,
        hashCode: computed,
      });

      return metamodel;
    },
  );
