/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { UnsupportedOperationError, assertNonNullable, guaranteeType, assertTrue, guaranteeNonNullable } from 'Utilities/GeneralUtil';
import { ValueSpecification as MM_ValueSpecification } from 'MM/model/valueSpecification/ValueSpecification';
import { PropertyGraphFetchTree as MM_PropertyGraphFetchTree, RootGraphFetchTree as MM_RootGraphFetchTree, GraphFetchTree as MM_GraphFetchTree } from 'MM/model/valueSpecification/raw/graph/GraphFetchTree';
import { Class as MM_Class } from 'MM/model/packageableElements/domain/Class';
import { OptionalPackageableElementImplicitReference as MM_OptionalPackageableElementImplicitReference, OptionalPackageableElementExplicitReference as MM_OptionalPackageableElementExplicitReference } from 'MM/model/packageableElements/PackageableElementReference';
import { PropertyExplicitReference as MM_PropertyExplicitReference } from 'MM/model/packageableElements/domain/PropertyReference';
import { GraphBuilderContext } from './GraphBuilderContext';
import { ValueSpecificationVisitor } from 'V1/model/valueSpecification/ValueSpecification';
import { Lambda } from 'V1/model/valueSpecification/raw/Lambda';
import { Variable } from 'V1/model/valueSpecification/Variable';
import { RootGraphFetchTree, PropertyGraphFetchTree } from 'V1/model/valueSpecification/raw/GraphFetchTree';

export class ProtocolToMetaModelValueSpecificationVisitor implements ValueSpecificationVisitor<MM_ValueSpecification> {
  context: GraphBuilderContext;
  propertyGraphFetchTreeClass?: MM_Class;

  constructor(context: GraphBuilderContext,) {
    this.context = context;
  }

  withProperyGraphFetchTreeClass(val: MM_Class): ProtocolToMetaModelValueSpecificationVisitor {
    this.propertyGraphFetchTreeClass = val;
    return this;
  }

  visit_Lambda(valueSpecification: Lambda): MM_ValueSpecification {
    throw new UnsupportedOperationError(`Lambda processing is currently not supported`);
  }

  visit_Variable(valueSpecification: Variable): MM_ValueSpecification {
    throw new Error('Method not implemented.');
  }

  visit_RootGraphFetchTree(valueSpecification: RootGraphFetchTree): MM_ValueSpecification {
    assertNonNullable(valueSpecification.class, 'Root graph fetch tree class is missing');
    const _class = this.context.resolveClass(valueSpecification.class);
    const rootGraphFetchTree = new MM_RootGraphFetchTree(_class);
    rootGraphFetchTree.subTrees = valueSpecification.subTrees.map(subTree => guaranteeType(subTree.accept_ValueSpecificationVisitor(this.withProperyGraphFetchTreeClass(_class.value)), MM_GraphFetchTree));
    return rootGraphFetchTree;
  }

  visit_PropertyGraphFetchTree(valueSpecification: PropertyGraphFetchTree): MM_ValueSpecification {
    assertNonNullable(valueSpecification.property, 'Property graph fetch tree property is missing');
    const prop = MM_PropertyExplicitReference.create(guaranteeNonNullable(this.propertyGraphFetchTreeClass).getProperty(valueSpecification.property));
    const propertyGraphFetchTree = new MM_PropertyGraphFetchTree(prop).withSubType(MM_OptionalPackageableElementExplicitReference.create<MM_Class>(undefined));
    propertyGraphFetchTree.alias = valueSpecification.alias;
    const propertyType = prop.value.genericType.value.rawType;
    if (propertyType instanceof MM_Class) {
      let _class: MM_Class;
      if (valueSpecification.subType) {
        const _classReference = this.context.resolveClass(valueSpecification.subType);
        propertyGraphFetchTree.withSubType(MM_OptionalPackageableElementImplicitReference.create(_classReference.value, valueSpecification.subType, this.context.section, _classReference.isResolvedFromAutoImports));
        _class = _classReference.value;
      } else {
        _class = propertyType;
      }
      propertyGraphFetchTree.subTrees = valueSpecification.subTrees.map(subTree => guaranteeType(subTree.accept_ValueSpecificationVisitor(this.withProperyGraphFetchTreeClass(_class)), MM_GraphFetchTree));
    } else {
      assertTrue(!valueSpecification.subTrees.length, `Graph fetch tree property is not of type 'class', but it has subtrees`);
    }
    return propertyGraphFetchTree;
  }
}
