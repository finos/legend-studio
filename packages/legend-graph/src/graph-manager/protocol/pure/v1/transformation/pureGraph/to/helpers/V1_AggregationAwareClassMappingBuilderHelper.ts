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

import type { Mapping } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext.js';
import type { V1_AggregateSetImplementationContainer } from '../../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregateSetImplementationContainer.js';
import { AggregateSetImplementationContainer } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/aggregationAware/AggregateSetImplementationContainer.js';
import type { InstanceSetImplementation } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/InstanceSetImplementation.js';
import { AggregateSpecification } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/aggregationAware/AggregateSpecification.js';
import type { V1_AggregateSpecification } from '../../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregateSpecification.js';
import type { V1_GroupByFunction } from '../../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_GroupByFunction.js';
import { GroupByFunctionSpecification } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/aggregationAware/GroupByFunctionSpecification.js';
import { AggregationFunctionSpecification } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/aggregationAware/AggregationFunctionSpecification.js';
import type { V1_AggregateFunction } from '../../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregateFunction.js';
import { V1_ClassMappingFirstPassBuilder } from '../V1_ClassMappingFirstPassBuilder.js';
import { V1_buildRawLambdaWithResolvedPaths } from './V1_ValueSpecificationPathResolver.js';

const buildGroupByFunction = (
  groupByFunction: V1_GroupByFunction,
  context: V1_GraphBuilderContext,
): GroupByFunctionSpecification => {
  const groupByFunctionSpecification = new GroupByFunctionSpecification(
    V1_buildRawLambdaWithResolvedPaths(
      groupByFunction.groupByFn.parameters,
      groupByFunction.groupByFn.body,
      context,
    ),
  );

  return groupByFunctionSpecification;
};

const buildAggregateFunction = (
  aggregationFunction: V1_AggregateFunction,
  context: V1_GraphBuilderContext,
): AggregationFunctionSpecification => {
  const mapFn = V1_buildRawLambdaWithResolvedPaths(
    aggregationFunction.mapFn.parameters,
    aggregationFunction.mapFn.body,
    context,
  );
  const aggregateFn = V1_buildRawLambdaWithResolvedPaths(
    aggregationFunction.aggregateFn.parameters,
    aggregationFunction.aggregateFn.body,
    context,
  );
  return new AggregationFunctionSpecification(mapFn, aggregateFn);
};

const buildAggregateSpecification = (
  specification: V1_AggregateSpecification,
  context: V1_GraphBuilderContext,
): AggregateSpecification => {
  const aggregateSpecification = new AggregateSpecification(
    specification.canAggregate,
  );
  aggregateSpecification.aggregateValues = specification.aggregateValues.map(
    (aggregateValue) => buildAggregateFunction(aggregateValue, context),
  );
  aggregateSpecification.groupByFunctions = specification.groupByFunctions.map(
    (groupByFunction) => buildGroupByFunction(groupByFunction, context),
  );
  return aggregateSpecification;
};

export const V1_buildAggregateContainer = (
  container: V1_AggregateSetImplementationContainer,
  context: V1_GraphBuilderContext,
  mapping: Mapping,
): AggregateSetImplementationContainer => {
  const aggregateSetImplementationContainer =
    new AggregateSetImplementationContainer(
      container.index,
      buildAggregateSpecification(container.aggregateSpecification, context),
      container.setImplementation.accept_ClassMappingVisitor(
        new V1_ClassMappingFirstPassBuilder(context, mapping),
      ) as InstanceSetImplementation,
    );

  return aggregateSetImplementationContainer;
};
