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

import type { RawValueSpecification } from '../../../../../../../graph/metamodel/pure/rawValueSpecification/RawValueSpecification.js';
import { RawLambda } from '../../../../../../../graph/metamodel/pure/rawValueSpecification/RawLambda.js';
import { RawVariableExpression } from '../../../../../../../graph/metamodel/pure/rawValueSpecification/RawVariableExpression.js';
import type { V1_GraphBuilderContext } from './V1_GraphBuilderContext.js';
import type { V1_RawValueSpecificationVisitor } from '../../../model/rawValueSpecification/V1_RawValueSpecification.js';
import type { V1_RawLambda } from '../../../model/rawValueSpecification/V1_RawLambda.js';
import type { V1_RawVariable } from '../../../model/rawValueSpecification/V1_RawVariable.js';
import type { V1_RawPrimitiveInstanceValue } from '../../../model/rawValueSpecification/V1_RawPrimitiveInstanceValue.js';
import { RawPrimitiveInstanceValue } from '../../../../../../../graph/metamodel/pure/rawValueSpecification/RawPrimitiveInstanceValue.js';

export class V1_RawValueSpecificationBuilder
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
    const type = this.context.resolveType(
      valueSpecification.genericType.rawType.fullPath,
    );
    return new RawVariableExpression(
      valueSpecification.name,
      this.context.graph.getMultiplicity(
        valueSpecification.multiplicity.lowerBound,
        valueSpecification.multiplicity.upperBound,
      ),
      type,
    );
  }

  visit_PrimitiveInstanceValue(
    valueSpecification: V1_RawPrimitiveInstanceValue,
  ): RawValueSpecification {
    return new RawPrimitiveInstanceValue(
      this.context.resolveType(valueSpecification.type),
      valueSpecification.value,
    );
  }
}
