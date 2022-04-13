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

import { computed, makeObservable, observable } from 'mobx';
import type { AlloySerializationConfigInstanceValue } from '../../../models/metamodels/pure/valueSpecification/AlloySerializationConfig';
import {
  type RootGraphFetchTreeInstanceValue,
  type PropertyGraphFetchTreeInstanceValue,
  type GraphFetchTree,
  PropertyGraphFetchTree,
  RootGraphFetchTree,
} from '../../../models/metamodels/pure/valueSpecification/GraphFetchTree';
import type {
  PrimitiveInstanceValue,
  EnumValueInstanceValue,
  RuntimeInstanceValue,
  PairInstanceValue,
  MappingInstanceValue,
  PureListInstanceValue,
  CollectionInstanceValue,
  InstanceValue,
} from '../../../models/metamodels/pure/valueSpecification/InstanceValue';
import type { INTERNAL__UnknownValueSpecification } from '../../../models/metamodels/pure/valueSpecification/INTERNAL__UnknownValueSpecification';
import type { LambdaFunctionInstanceValue } from '../../../models/metamodels/pure/valueSpecification/LambdaFunction';
import type {
  FunctionExpression,
  SimpleFunctionExpression,
  AbstractPropertyExpression,
} from '../../../models/metamodels/pure/valueSpecification/SimpleFunctionExpression';
import type {
  ValueSpecification,
  ValueSpecificationVisitor,
} from '../../../models/metamodels/pure/valueSpecification/ValueSpecification';
import type { VariableExpression } from '../../../models/metamodels/pure/valueSpecification/VariableExpression';
import {
  type ObserverContext,
  skipObservedWithContext,
  skipObserved,
  observe_OptionalPackageableElementReference,
  observe_Multiplicity,
} from './CoreObserverHelper';
import {
  observe_EnumValueReference,
  observe_GenericTypeReference,
  observe_PropertyReference,
} from './DomainObserverHelper';

const observe_Abstract_ValueSpecification = (
  metamodel: ValueSpecification,
): void => {
  observe_Multiplicity(metamodel.multiplicity);
  makeObservable<ValueSpecification>(metamodel, {
    multiplicity: observable,
  });
};

export const observe_VariableExpression = skipObserved(
  (metamodel: VariableExpression): VariableExpression => {
    observe_Abstract_ValueSpecification(metamodel);
    if (metamodel.genericType) {
      observe_GenericTypeReference(metamodel.genericType);
    }

    makeObservable<VariableExpression>(metamodel, {
      name: observable,
      genericType: observable,
    });

    return metamodel;
  },
);

export const observe_FunctionExpression = skipObservedWithContext(
  observe_Abstract_FunctionExpression,
);
export const observe_SimpleFunctionExpression = skipObservedWithContext(
  observe_Abstract_FunctionExpression,
);
export const observe_AbstractPropertyExpression = skipObservedWithContext(
  observe_Abstract_FunctionExpression,
);

export const observe_PrimitiveInstanceValue = skipObserved(
  (metamodel: PrimitiveInstanceValue): PrimitiveInstanceValue => {
    observe_Abstract_ValueSpecification(metamodel);

    makeObservable<PrimitiveInstanceValue>(metamodel, {
      genericType: observable,
      values: observable,
    });

    observe_GenericTypeReference(metamodel.genericType);

    return metamodel;
  },
);

export const observe_EnumValueInstanceValue = skipObserved(
  (metamodel: EnumValueInstanceValue): EnumValueInstanceValue => {
    observe_Abstract_ValueSpecification(metamodel);

    makeObservable<EnumValueInstanceValue>(metamodel, {
      genericType: observable,
      values: observable,
    });

    metamodel.values.forEach(observe_EnumValueReference);

    return metamodel;
  },
);

export const observe_CollectionInstanceValue = skipObservedWithContext(
  _observe_CollectionInstanceValue,
);

export const observe_GraphFetchTree = skipObservedWithContext(
  observe_Abstract_GraphFetchTree,
);
export const observe_PropertyGraphFetchTree = skipObservedWithContext(
  _observe_PropertyGraphFetchTree,
);
export const observe_RootGraphFetchTree = skipObservedWithContext(
  observe_Abstract_GraphFetchTree,
);

export const observe_PropertyGraphFetchTreeInstanceValue =
  skipObservedWithContext(
    (
      metamodel: PropertyGraphFetchTreeInstanceValue,
      context: ObserverContext,
    ): PropertyGraphFetchTreeInstanceValue => {
      observe_Abstract_ValueSpecification(metamodel);

      metamodel.values.forEach((value) =>
        observe_PropertyGraphFetchTree(value, context),
      );

      return metamodel;
    },
  );

export const observe_RootGraphFetchTreeInstanceValue = skipObservedWithContext(
  (
    metamodel: RootGraphFetchTreeInstanceValue,
    context: ObserverContext,
  ): RootGraphFetchTreeInstanceValue => {
    observe_Abstract_ValueSpecification(metamodel);

    metamodel.values.forEach((value) =>
      observe_RootGraphFetchTree(value, context),
    );

    return metamodel;
  },
);

class ValueSpecificationObserver implements ValueSpecificationVisitor<void> {
  observerContext: ObserverContext;

  constructor(observerContext: ObserverContext) {
    this.observerContext = observerContext;
  }

  visit_RootGraphFetchTreeInstanceValue(
    valueSpecification: RootGraphFetchTreeInstanceValue,
  ): void {
    observe_RootGraphFetchTreeInstanceValue(
      valueSpecification,
      this.observerContext,
    );
  }

  visit_PropertyGraphFetchTreeInstanceValue(
    valueSpecification: PropertyGraphFetchTreeInstanceValue,
  ): void {
    observe_PropertyGraphFetchTreeInstanceValue(
      valueSpecification,
      this.observerContext,
    );
  }

  visit_AlloySerializationConfigInstanceValue(
    valueSpecification: AlloySerializationConfigInstanceValue,
  ): void {
    observe_Abstract_ValueSpecification(valueSpecification);
  }

  visit_PrimitiveInstanceValue(
    valueSpecification: PrimitiveInstanceValue,
  ): void {
    observe_PrimitiveInstanceValue(valueSpecification);
  }

  visit_EnumValueInstanceValue(
    valueSpecification: EnumValueInstanceValue,
  ): void {
    observe_EnumValueInstanceValue(valueSpecification);
  }

  visit_RuntimeInstanceValue(valueSpecification: RuntimeInstanceValue): void {
    observe_Abstract_ValueSpecification(valueSpecification);
  }

  visit_PairInstanceValue(valueSpecification: PairInstanceValue): void {
    observe_Abstract_ValueSpecification(valueSpecification);
  }

  visit_MappingInstanceValue(valueSpecification: MappingInstanceValue): void {
    observe_Abstract_ValueSpecification(valueSpecification);
  }

  visit_PureListInsanceValue(valueSpecification: PureListInstanceValue): void {
    observe_Abstract_ValueSpecification(valueSpecification);
  }

  visit_CollectionInstanceValue(
    valueSpecification: CollectionInstanceValue,
  ): void {
    observe_CollectionInstanceValue(valueSpecification, this.observerContext);
  }

  visit_FunctionExpression(valueSpecification: FunctionExpression): void {
    observe_FunctionExpression(valueSpecification, this.observerContext);
  }

  visit_SimpleFunctionExpression(
    valueSpecification: SimpleFunctionExpression,
  ): void {
    observe_SimpleFunctionExpression(valueSpecification, this.observerContext);
  }

  visit_VariableExpression(valueSpecification: VariableExpression): void {
    observe_VariableExpression(valueSpecification);
  }

  visit_LambdaFunctionInstanceValue(
    valueSpecification: LambdaFunctionInstanceValue,
  ): void {
    observe_Abstract_ValueSpecification(valueSpecification);
  }

  visit_AbstractPropertyExpression(
    valueSpecification: AbstractPropertyExpression,
  ): void {
    observe_AbstractPropertyExpression(
      valueSpecification,
      this.observerContext,
    );
  }

  visit_InstanceValue(valueSpecification: InstanceValue): void {
    observe_Abstract_ValueSpecification(valueSpecification);
  }

  visit_INTERNAL__UnknownValueSpecification(
    valueSpecification: INTERNAL__UnknownValueSpecification,
  ): void {
    observe_Abstract_ValueSpecification(valueSpecification);
  }
}

export const observe_ValueSpecification = skipObservedWithContext(
  (
    valueSpecification: ValueSpecification,
    context: ObserverContext,
  ): ValueSpecification => {
    valueSpecification.accept_ValueSpecificationVisitor(
      new ValueSpecificationObserver(context),
    );

    return valueSpecification;
  },
);

function _observe_CollectionInstanceValue(
  metamodel: CollectionInstanceValue,
  context: ObserverContext,
): CollectionInstanceValue {
  observe_Abstract_ValueSpecification(metamodel);

  makeObservable<CollectionInstanceValue>(metamodel, {
    genericType: observable,
    values: observable,
  });

  metamodel.values.forEach((value) =>
    observe_ValueSpecification(value, context),
  );

  return metamodel;
}

function observe_Abstract_FunctionExpression(
  metamodel: FunctionExpression,
  context: ObserverContext,
): FunctionExpression {
  observe_Abstract_ValueSpecification(metamodel);

  makeObservable(metamodel, {
    functionName: observable,
    parametersValues: observable,
    classifierGenericType: observable,
  });

  metamodel.parametersValues.forEach((value) =>
    observe_ValueSpecification(value, context),
  );

  return metamodel;
}

function observe_Abstract_GraphFetchTree(
  metamodel: GraphFetchTree,
  context: ObserverContext,
): GraphFetchTree {
  makeObservable(metamodel, {
    subTrees: observable,
    isEmpty: computed,
  });

  metamodel.subTrees.forEach((subTree) => {
    if (subTree instanceof PropertyGraphFetchTree) {
      observe_PropertyGraphFetchTree(subTree, context);
    } else if (subTree instanceof RootGraphFetchTree) {
      observe_RootGraphFetchTree(subTree, context);
    } else {
      observe_GraphFetchTree(subTree, context);
    }
  });

  return metamodel;
}

function _observe_PropertyGraphFetchTree(
  metamodel: PropertyGraphFetchTree,
  context: ObserverContext,
): PropertyGraphFetchTree {
  observe_Abstract_GraphFetchTree(metamodel, context);

  makeObservable(metamodel, {
    alias: observable,
    parameters: observable,
    subType: observable,
  });

  observe_PropertyReference(metamodel.property);
  metamodel.parameters.forEach((value) =>
    observe_ValueSpecification(value, context),
  );
  observe_OptionalPackageableElementReference(metamodel.subType);

  return metamodel;
}
