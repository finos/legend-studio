/**
 * Copyright (c) 2025-present, Goldman Sachs
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
  type ConcreteFunctionDefinition,
  type RelationColumn,
  type RelationFunctionInstanceSetImplementation,
  observe_ConcreteFunctionDefinitionWithoutTests,
} from '@finos/legend-graph';
import { action } from 'mobx';

export const relationFunction_setRelationFunction = action(
  (
    setImplementation: RelationFunctionInstanceSetImplementation,
    relationFunction: ConcreteFunctionDefinition,
  ): void => {
    setImplementation.relationFunction =
      observe_ConcreteFunctionDefinitionWithoutTests(relationFunction);
  },
);

export const isStubbed_RelationColumn = (column: RelationColumn): boolean =>
  !column.name && !column.type;
