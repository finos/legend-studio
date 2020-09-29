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

import { primitive, createSimpleSchema, serialize, custom, alias, SKIP } from 'serializr';
import { PropertyReference as MM_PropertyReference } from 'MM/model/packageableElements/domain/PropertyReference';
import { PropertyGraphFetchTree as MM_PropertyGraphFetchTree, RootGraphFetchTree as MM_RootGraphFetchTree } from 'MM/model/valueSpecification/raw/graph/GraphFetchTree';
import { ValueSpecificationVisitor as MM_ValueSpecificationVisitor, ValueSpecification as MM_ValueSpecification } from 'MM/model/valueSpecification/ValueSpecification';
import { Lambda as MM_Lambda } from 'MM/model/valueSpecification/raw/Lambda';
import { VariableExpression as MM_VariableExpression } from 'MM/model/valueSpecification/VariableExpression';
import { SKIP_FN, constant, elementReferenceSerializer, plainSerializer, optionalElementReferenceSerializer, usingModelSchema, multiplicitySchema, optionalPrimitiveSerializer, optionalPlainSerializer } from './CoreSerializerHelper';
import { ValueSpecificationType } from 'V1/model/valueSpecification/ValueSpecification';

const propertyGraphFetchTreeSchema = createSimpleSchema({
  _type: constant(ValueSpecificationType.PROPERTY_GRAPH_FETCH_TREE),
  alias: optionalPrimitiveSerializer,
  parameters: plainSerializer,
  property: custom((val: MM_PropertyReference) => val.value.name, SKIP_FN),
  subTrees: constant([]),
  subType: optionalElementReferenceSerializer,
});

const rootGraphFetchTreeSchema = createSimpleSchema({
  _type: constant(ValueSpecificationType.ROOT_GRAPH_FETCH_TREE),
  class: elementReferenceSerializer,
  subTrees: constant([]),
});

const variableSchema = createSimpleSchema({
  _type: constant(ValueSpecificationType.VARIABLE),
  type: alias('class', elementReferenceSerializer),
  multiplicity: usingModelSchema(multiplicitySchema),
  name: primitive(),
});

const lambdaSchema = createSimpleSchema({
  _type: constant(ValueSpecificationType.LAMBDA),
  body: optionalPlainSerializer,
  parameters: optionalPlainSerializer,
});

class ValueSpecificationSerializer implements MM_ValueSpecificationVisitor<object> {
  visit_Lambda(valueSpecification: MM_Lambda): Record<PropertyKey, unknown> {
    return serialize(lambdaSchema, valueSpecification);
  }

  visit_Variable(valueSpecification: MM_VariableExpression): Record<PropertyKey, unknown> {
    return serialize(variableSchema, valueSpecification);
  }

  visit_RootGraphFetchTree(valueSpecification: MM_RootGraphFetchTree): Record<PropertyKey, unknown> {
    const obj = serialize(rootGraphFetchTreeSchema, valueSpecification) as Record<PropertyKey, unknown>;
    obj.subTrees = valueSpecification.subTrees.map(subTree => subTree.accept_ValueSpecificationVisitor(this));
    return obj;
  }

  visit_PropertyGraphFetchTree(valueSpecification: MM_PropertyGraphFetchTree): Record<PropertyKey, unknown> {
    const obj = serialize(propertyGraphFetchTreeSchema, valueSpecification) as Record<PropertyKey, unknown>;
    obj.subTrees = valueSpecification.subTrees.map(subTree => subTree.accept_ValueSpecificationVisitor(this));
    return obj;
  }
}

export const serializeValueSpecification = (valueSpecification: MM_ValueSpecification): Record<PropertyKey, unknown> => valueSpecification.accept_ValueSpecificationVisitor(new ValueSpecificationSerializer());
export const valueSpecificationSerializer = custom(serializeValueSpecification, SKIP_FN);
export const optionalValueSpecificationSerializer = custom((valueSpecification: MM_ValueSpecification | undefined) => valueSpecification ? serializeValueSpecification(valueSpecification) : SKIP, SKIP_FN);
