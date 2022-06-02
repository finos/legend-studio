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
  type PureModel,
  type PRIMITIVE_TYPE,
  type Multiplicity,
  MULTIPLICITY_INFINITE,
  PrimitiveInstanceValue,
  TYPICAL_MULTIPLICITY_TYPE,
  GenericTypeExplicitReference,
  GenericType,
} from '@finos/legend-graph';

export const getMultiplicityDescription = (
  multiplicity: Multiplicity,
): string => {
  if (multiplicity.lowerBound === multiplicity.upperBound) {
    return `[${multiplicity.lowerBound.toString()}] - Must have exactly ${multiplicity.lowerBound.toString()} value(s)`;
  } else if (
    multiplicity.lowerBound === 0 &&
    multiplicity.upperBound === undefined
  ) {
    return `[${MULTIPLICITY_INFINITE}] - May have many values`;
  }
  return `[${multiplicity.lowerBound}..${
    multiplicity.upperBound ?? MULTIPLICITY_INFINITE
  }] - ${
    multiplicity.upperBound
      ? `Must have from ${multiplicity.lowerBound} to ${multiplicity.upperBound} value(s)`
      : `Must have at least ${multiplicity.lowerBound} values(s)`
  }`;
};

export const buildPrimitiveInstanceValue = (
  graph: PureModel,
  type: PRIMITIVE_TYPE,
  value: unknown,
): PrimitiveInstanceValue => {
  const multiplicityOne = graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  const instance = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(
      new GenericType(graph.getPrimitiveType(type)),
    ),
    multiplicityOne,
  );
  instance.values = [value];
  return instance;
};
