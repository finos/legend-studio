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

import type { Mapping } from '../../../../../../../metamodels/pure/packageableElements/mapping/Mapping';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import type { V1_AggregateSetImplementationContainer } from '../../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregateSetImplementationContainer';
import { AggregateSetImplementationContainer } from '../../../../../../../metamodels/pure/packageableElements/mapping/aggregationAware/AggregateSetImplementationContainer';
import type { InstanceSetImplementation } from '../../../../../../../metamodels/pure/packageableElements/mapping/InstanceSetImplementation';
import { AggregateSpecification } from '../../../../../../../metamodels/pure/packageableElements/mapping/aggregationAware/AggregateSpecification';
import type { V1_AggregateSpecification } from '../../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregateSpecification';
import type { V1_GroupByFunction } from '../../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_GroupByFunction';
import { GroupByFunctionSpecification } from '../../../../../../../metamodels/pure/packageableElements/mapping/aggregationAware/GroupByFunctionSpecification';
import { AggregationFunctionSpecification } from '../../../../../../../metamodels/pure/packageableElements/mapping/aggregationAware/AggregationFunctionSpecification';
import type { V1_AggregateFunction } from '../../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregateFunction';
import { V1_ProtocolToMetaModelClassMappingFirstPassBuilder } from '../V1_ProtocolToMetaModelClassMappingFirstPassBuilder';
import { V1_resolvePathsInRawLambda } from './V1_RawPathLambdaResolver';

const buildGroupByFunction = (
  groupByFunction: V1_GroupByFunction,
  context: V1_GraphBuilderContext,
): GroupByFunctionSpecification => {
  const groupByFunctionSpecification = new GroupByFunctionSpecification(
    V1_resolvePathsInRawLambda(
      context,
      groupByFunction.groupByFn.parameters,
      groupByFunction.groupByFn.body,
    ),
  );

  return groupByFunctionSpecification;
};

const buildAggregateFunction = (
  aggregationFunction: V1_AggregateFunction,
  context: V1_GraphBuilderContext,
): AggregationFunctionSpecification => {
  const mapFn = V1_resolvePathsInRawLambda(
    context,
    aggregationFunction.mapFn.parameters,
    aggregationFunction.mapFn.body,
  );
  const aggregateFn = V1_resolvePathsInRawLambda(
    context,
    aggregationFunction.aggregateFn.parameters,
    aggregationFunction.aggregateFn.body,
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
        new V1_ProtocolToMetaModelClassMappingFirstPassBuilder(
          context,
          mapping,
        ),
      ) as InstanceSetImplementation,
    );

  return aggregateSetImplementationContainer;
};
