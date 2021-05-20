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

import { toJS } from 'mobx';
import type {
  RawPropertyGraphFetchTree,
  RawRootGraphFetchTree,
} from '../../../../../../metamodels/pure/model/rawValueSpecification/RawGraphFetchTree';
import type { RawValueSpecificationVisitor } from '../../../../../../metamodels/pure/model/rawValueSpecification/RawValueSpecification';
import type { RawLambda } from '../../../../../../metamodels/pure/model/rawValueSpecification/RawLambda';
import type { RawVariableExpression } from '../../../../../../metamodels/pure/model/rawValueSpecification/RawVariableExpression';
import type { V1_RawValueSpecification } from '../../../model/rawValueSpecification/V1_RawValueSpecification';
import { V1_RawLambda } from '../../../model/rawValueSpecification/V1_RawLambda';
import { V1_RawVariable } from '../../../model/rawValueSpecification/V1_RawVariable';
import {
  V1_transformOptionalElementReference,
  V1_transformMultiplicity,
  V1_transformElementReference,
} from './V1_CoreTransformerHelper';
import type { V1_RawGraphFetchTree } from '../../../model/rawValueSpecification/V1_RawGraphFetchTree';
import {
  V1_RawPropertyGraphFetchTree,
  V1_RawRootGraphFetchTree,
} from '../../../model/rawValueSpecification/V1_RawGraphFetchTree';

export class V1_RawValueSpecificationTransformer
  implements RawValueSpecificationVisitor<V1_RawValueSpecification>
{
  visit_RawLambda(rawValueSpecification: RawLambda): V1_RawValueSpecification {
    const rawLambda = new V1_RawLambda();
    rawLambda.body = toJS(rawValueSpecification.body);
    rawLambda.parameters = toJS(rawValueSpecification.parameters);
    return rawLambda;
  }

  visit_RawVariable(
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

  visit_RawRootGraphFetchTree(
    rawValueSpecification: RawRootGraphFetchTree,
  ): V1_RawValueSpecification {
    const rawRrootGraphFetchTree = new V1_RawRootGraphFetchTree();
    rawRrootGraphFetchTree.class = V1_transformElementReference(
      rawValueSpecification.class,
    );
    rawRrootGraphFetchTree.subTrees = rawValueSpecification.subTrees.map(
      (subTree) =>
        subTree.accept_ValueSpecificationVisitor(this) as V1_RawGraphFetchTree,
    );
    return rawRrootGraphFetchTree;
  }

  visit_RawPropertyGraphFetchTree(
    rawValueSpecification: RawPropertyGraphFetchTree,
  ): V1_RawValueSpecification {
    const rawPropertyGraphFetchTree = new V1_RawPropertyGraphFetchTree();
    rawPropertyGraphFetchTree.alias = rawValueSpecification.alias;
    rawPropertyGraphFetchTree.property =
      rawValueSpecification.property.value.name;
    rawPropertyGraphFetchTree.parameters =
      rawValueSpecification.parameters.map(toJS);
    rawPropertyGraphFetchTree.subTrees = rawValueSpecification.subTrees.map(
      (subTree) =>
        subTree.accept_ValueSpecificationVisitor(this) as V1_RawGraphFetchTree,
    );
    rawPropertyGraphFetchTree.subType = V1_transformOptionalElementReference(
      rawValueSpecification.subType,
    );
    return rawPropertyGraphFetchTree;
  }
}

export const V1_transformRawLambda = (rawLambda: RawLambda): V1_RawLambda =>
  rawLambda.accept_ValueSpecificationVisitor(
    new V1_RawValueSpecificationTransformer(),
  ) as V1_RawLambda;
