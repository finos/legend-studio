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

import type { RawValueSpecificationVisitor } from '../../../../../../metamodels/pure/rawValueSpecification/RawValueSpecification';
import type { RawLambda } from '../../../../../../metamodels/pure/rawValueSpecification/RawLambda';
import type { RawVariableExpression } from '../../../../../../metamodels/pure/rawValueSpecification/RawVariableExpression';
import { V1_RawLambda } from '../../../model/rawValueSpecification/V1_RawLambda';
import { V1_RawVariable } from '../../../model/rawValueSpecification/V1_RawVariable';
import {
  V1_transformMultiplicity,
  V1_transformElementReference,
} from './V1_CoreTransformerHelper';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext';
import type { V1_RawValueSpecification } from '../../../model/rawValueSpecification/V1_RawValueSpecification';
import { V1_RawPrimitiveInstanceValue } from '../../../model/rawValueSpecification/V1_RawPrimitiveInstanceValue';
import type { RawPrimitiveInstanceValue } from '../../../../../../metamodels/pure/rawValueSpecification/RawPrimitiveInstanceValue';
import { pruneSourceInformation } from '../../../../../../../MetaModelUtils';

export class V1_RawValueSpecificationTransformer
  implements RawValueSpecificationVisitor<V1_RawValueSpecification>
{
  context: V1_GraphTransformerContext;

  constructor(context: V1_GraphTransformerContext) {
    this.context = context;
  }

  visit_RawLambda(rawValueSpecification: RawLambda): V1_RawValueSpecification {
    const rawLambda = new V1_RawLambda();
    // Prune source information from the lambda
    // NOTE: if in the future, source information is stored under different key,
    // e.g. { "classPointerSourceInformation": ... }
    // we will need to use the prune source information method from `V1_PureGraphManager`
    rawLambda.body = rawValueSpecification.body
      ? this.context.keepSourceInformation
        ? rawValueSpecification.body
        : pruneSourceInformation(
            rawValueSpecification.body as Record<PropertyKey, unknown>,
          )
      : undefined;
    rawLambda.parameters = rawValueSpecification.parameters
      ? this.context.keepSourceInformation
        ? rawValueSpecification.parameters
        : pruneSourceInformation(
            rawValueSpecification.parameters as Record<PropertyKey, unknown>,
          )
      : undefined;
    return rawLambda;
  }

  visit_RawVariableExpression(
    rawValueSpecification: RawVariableExpression,
  ): V1_RawValueSpecification {
    const rawVariable = new V1_RawVariable();
    rawVariable.class = V1_transformElementReference(
      rawValueSpecification.type,
    );
    rawVariable.multiplicity = V1_transformMultiplicity(
      rawValueSpecification.multiplicity,
    );
    rawVariable.name = rawValueSpecification.name;
    return rawVariable;
  }

  visit_RawPrimitiveInstanceValue(
    rawValueSpecification: RawPrimitiveInstanceValue,
  ): V1_RawValueSpecification {
    const protocol = new V1_RawPrimitiveInstanceValue();
    protocol.type = V1_transformElementReference(rawValueSpecification.type);
    protocol.multiplicity = V1_transformMultiplicity(
      rawValueSpecification.multiplicity,
    );
    protocol.values = rawValueSpecification.values;
    return protocol;
  }
}

export const V1_transformRawLambda = (
  rawLambda: RawLambda,
  context: V1_GraphTransformerContext,
): V1_RawLambda =>
  rawLambda.accept_RawValueSpecificationVisitor(
    new V1_RawValueSpecificationTransformer(context),
  ) as V1_RawLambda;
