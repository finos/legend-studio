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
  assertNonNullable,
  guaranteeType,
  assertTrue,
  guaranteeNonNullable,
} from '@finos/legend-studio-shared';
import type { RawValueSpecification } from '../../../../../../metamodels/pure/model/rawValueSpecification/RawValueSpecification';
import { RawLambda } from '../../../../../../metamodels/pure/model/rawValueSpecification/RawLambda';
import { RawVariableExpression } from '../../../../../../metamodels/pure/model/rawValueSpecification/RawVariableExpression';
import {
  RawPropertyGraphFetchTree,
  RawRootGraphFetchTree,
  RawGraphFetchTree,
} from '../../../../../../metamodels/pure/model/rawValueSpecification/RawGraphFetchTree';
import { Class } from '../../../../../../metamodels/pure/model/packageableElements/domain/Class';
import {
  OptionalPackageableElementImplicitReference,
  OptionalPackageableElementExplicitReference,
} from '../../../../../../metamodels/pure/model/packageableElements/PackageableElementReference';
import { PropertyExplicitReference } from '../../../../../../metamodels/pure/model/packageableElements/domain/PropertyReference';
import type { V1_GraphBuilderContext } from '../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import type { V1_RawValueSpecificationVisitor } from '../../../model/rawValueSpecification/V1_RawValueSpecification';
import type { V1_RawLambda } from '../../../model/rawValueSpecification/V1_RawLambda';
import type { V1_RawVariable } from '../../../model/rawValueSpecification/V1_RawVariable';
import type {
  V1_RawRootGraphFetchTree,
  V1_RawPropertyGraphFetchTree,
} from '../../../model/rawValueSpecification/V1_RawGraphFetchTree';

export class V1_ProtocolToMetaModelRawValueSpecificationVisitor
  implements V1_RawValueSpecificationVisitor<RawValueSpecification>
{
  context: V1_GraphBuilderContext;
  propertyGraphFetchTreeClass?: Class;

  constructor(context: V1_GraphBuilderContext) {
    this.context = context;
  }

  withProperyGraphFetchTreeClass(
    val: Class,
  ): V1_ProtocolToMetaModelRawValueSpecificationVisitor {
    this.propertyGraphFetchTreeClass = val;
    return this;
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

  visit_RootGraphFetchTree(
    valueSpecification: V1_RawRootGraphFetchTree,
  ): RawValueSpecification {
    assertNonNullable(
      valueSpecification.class,
      'Root graph fetch tree class is missing',
    );
    const _class = this.context.resolveClass(valueSpecification.class);
    const rootGraphFetchTree = new RawRootGraphFetchTree(_class);
    rootGraphFetchTree.subTrees = valueSpecification.subTrees.map((subTree) =>
      guaranteeType(
        subTree.accept_RawValueSpecificationVisitor(
          this.withProperyGraphFetchTreeClass(_class.value),
        ),
        RawGraphFetchTree,
      ),
    );
    return rootGraphFetchTree;
  }

  visit_PropertyGraphFetchTree(
    valueSpecification: V1_RawPropertyGraphFetchTree,
  ): RawValueSpecification {
    assertNonNullable(
      valueSpecification.property,
      'Property graph fetch tree property is missing',
    );
    const prop = PropertyExplicitReference.create(
      guaranteeNonNullable(this.propertyGraphFetchTreeClass).getProperty(
        valueSpecification.property,
      ),
    );
    const propertyGraphFetchTree = new RawPropertyGraphFetchTree(
      prop,
    ).withSubType(
      OptionalPackageableElementExplicitReference.create<Class>(undefined),
    );
    propertyGraphFetchTree.alias = valueSpecification.alias;
    const propertyType = prop.value.genericType.value.rawType;
    if (propertyType instanceof Class) {
      let _class: Class;
      if (valueSpecification.subType) {
        const _classReference = this.context.resolveClass(
          valueSpecification.subType,
        );
        propertyGraphFetchTree.withSubType(
          OptionalPackageableElementImplicitReference.create(
            _classReference.value,
            valueSpecification.subType,
            this.context.section,
            _classReference.isInferred,
          ),
        );
        _class = _classReference.value;
      } else {
        _class = propertyType;
      }
      propertyGraphFetchTree.subTrees = valueSpecification.subTrees.map(
        (subTree) =>
          guaranteeType(
            subTree.accept_RawValueSpecificationVisitor(
              this.withProperyGraphFetchTreeClass(_class),
            ),
            RawGraphFetchTree,
          ),
      );
    } else {
      assertTrue(
        !valueSpecification.subTrees.length,
        `Graph fetch tree property is not of type 'class', but it has subtrees`,
      );
    }
    return propertyGraphFetchTree;
  }
}
