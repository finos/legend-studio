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

import type { RawValueSpecification } from '../../../../../../metamodels/pure/rawValueSpecification/RawValueSpecification';
import { RawLambda } from '../../../../../../metamodels/pure/rawValueSpecification/RawLambda';
import { RawVariableExpression } from '../../../../../../metamodels/pure/rawValueSpecification/RawVariableExpression';
import type { V1_GraphBuilderContext } from '../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import type { V1_RawValueSpecificationVisitor } from '../../../model/rawValueSpecification/V1_RawValueSpecification';
import type { V1_RawLambda } from '../../../model/rawValueSpecification/V1_RawLambda';
import type { V1_RawVariable } from '../../../model/rawValueSpecification/V1_RawVariable';
import type { V1_RawInstanceValue } from '../../../model/rawValueSpecification/V1_RawInstanceValue';
import { RawInstanceValue } from '../../../../../../metamodels/pure/rawValueSpecification/RawInstanceValue';

export class V1_ProtocolToMetaModelRawValueSpecificationBuilder
  implements V1_RawValueSpecificationVisitor<RawValueSpecification>
{
  context: V1_GraphBuilderContext;

  constructor(context: V1_GraphBuilderContext) {
    this.context = context;
  }

  visit_Lambda(valueSpecification: V1_RawLambda): RawValueSpecification {
    return new RawLambda(
      valueSpecification.parameters,
      valueSpecification.body,
    );
  }

  visit_Variable(valueSpecification: V1_RawVariable): RawValueSpecification {
    const multiplicity = this.context.graph.getMultiplicity(
      valueSpecification.multiplicity.lowerBound,
      valueSpecification.multiplicity.upperBound,
    );
    const type = this.context.resolveType(valueSpecification.class);
    return new RawVariableExpression(
      valueSpecification.name,
      multiplicity,
      type,
    );
  }

  visit_InstanceValue(
    valueSpecification: V1_RawInstanceValue,
  ): RawValueSpecification {
    const multiplicity = this.context.graph.getMultiplicity(
      valueSpecification.multiplicity.lowerBound,
      valueSpecification.multiplicity.upperBound,
    );
    const type = this.context.resolveType(valueSpecification.type);
    return new RawInstanceValue(type, multiplicity, valueSpecification.values);
  }
}
