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

import type { Mapping } from '../../../../../../../metamodels/pure/model/packageableElements/mapping/Mapping';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import { RawLambda } from '../../../../../../../metamodels/pure/model/rawValueSpecification/RawLambda';
import type { V1_AggregateSetImplementationContainer } from '../../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregateSetImplementationContainer';
import { AggregateSetImplementationContainer } from '../../../../../../../metamodels/pure/model/packageableElements/mapping/aggregationAware/AggregateSetImplementationContainer';
import type { InstanceSetImplementation } from '../../../../../../../metamodels/pure/model/packageableElements/mapping/InstanceSetImplementation';
import { AggregateSpecification } from '../../../../../../../metamodels/pure/model/packageableElements/mapping/aggregationAware/AggregateSpecification';
import type { V1_AggregateSpecification } from '../../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregateSpecification';
import type { V1_GroupByFunction } from '../../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_GroupByFunction';
import { GroupByFunctionSpecification } from '../../../../../../../metamodels/pure/model/packageableElements/mapping/aggregationAware/GroupByFunctionSpecification';
import { AggregationFunctionSpecification } from '../../../../../../../metamodels/pure/model/packageableElements/mapping/aggregationAware/AggregationFunctionSpecification';
import type { V1_AggregateFunction } from '../../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregateFunction';
import { V1_ProtocolToMetaModelClassMappingFirstPassVisitor } from '../V1_ProtocolToMetaModelClassMappingFirstPassVisitor';

export const V1_processGroupByFunction = (
  groupByFunction: V1_GroupByFunction,
): GroupByFunctionSpecification => {
  const groupByFunctionSpecification = new GroupByFunctionSpecification(
    new RawLambda(
      groupByFunction.groupByFn.parameters,
      groupByFunction.groupByFn.body,
    ),
  );

  return groupByFunctionSpecification;
};

export const V1_processAggregateFunction = (
  aggregationFunction: V1_AggregateFunction,
): AggregationFunctionSpecification => {
  const mapFn = new RawLambda(
    aggregationFunction.mapFn.parameters,
    aggregationFunction.mapFn.body,
  );
  const aggregateFn = new RawLambda(
    aggregationFunction.aggregateFn.parameters,
    aggregationFunction.aggregateFn.body,
  );
  return new AggregationFunctionSpecification(mapFn, aggregateFn);
};

export const V1_processAggregateSpecification = (
  specification: V1_AggregateSpecification,
): AggregateSpecification => {
  const aggregateSpecification = new AggregateSpecification(
    specification.canAggregate,
  );
  aggregateSpecification.aggregateValues = specification.aggregateValues.map(
    (aggregateValue) => V1_processAggregateFunction(aggregateValue),
  );
  aggregateSpecification.groupByFunctions = specification.groupByFunctions.map(
    (groupByFunction) => V1_processGroupByFunction(groupByFunction),
  );
  return aggregateSpecification;
};

export const V1_processAggregateContainer = (
  container: V1_AggregateSetImplementationContainer,
  context: V1_GraphBuilderContext,
  mapping: Mapping,
): AggregateSetImplementationContainer => {
  const aggregateSetImplementationContainer = new AggregateSetImplementationContainer(
    container.index,
    V1_processAggregateSpecification(container.aggregateSpecification),
    container.setImplementation.accept_ClassMappingVisitor(
      new V1_ProtocolToMetaModelClassMappingFirstPassVisitor(context, mapping),
    ) as InstanceSetImplementation,
  );

  return aggregateSetImplementationContainer;
};
