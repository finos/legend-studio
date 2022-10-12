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

import { filterByType, Pair } from '@finos/legend-shared';
import { computed, makeObservable, observable, override } from 'mobx';
import { PackageableElementReference } from '../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import { Runtime } from '../../../graph/metamodel/pure/packageableElements/runtime/Runtime.js';
import {
  type AlloySerializationConfigInstanceValue,
  AlloySerializationConfig,
} from '../../../graph/metamodel/pure/valueSpecification/AlloySerializationConfig.js';
import {
  type RootGraphFetchTreeInstanceValue,
  type PropertyGraphFetchTreeInstanceValue,
  type GraphFetchTree,
  PropertyGraphFetchTree,
  RootGraphFetchTree,
} from '../../../graph/metamodel/pure/valueSpecification/GraphFetchTree.js';
import type {
  PrimitiveInstanceValue,
  EnumValueInstanceValue,
  RuntimeInstanceValue,
  PairInstanceValue,
  MappingInstanceValue,
  PureListInstanceValue,
  CollectionInstanceValue,
  InstanceValue,
} from '../../../graph/metamodel/pure/valueSpecification/InstanceValue.js';
import type { INTERNAL__UnknownValueSpecification } from '../../../graph/metamodel/pure/valueSpecification/INTERNAL__UnknownValueSpecification.js';
import {
  type LambdaFunctionInstanceValue,
  type FunctionType,
  LambdaFunction,
} from '../../../graph/metamodel/pure/valueSpecification/LambdaFunction.js';
import type { INTERNAL__PropagatedValue } from '../../../graph/metamodel/pure/valueSpecification/INTERNAL__PropagatedValue.js';
import type {
  FunctionExpression,
  SimpleFunctionExpression,
  AbstractPropertyExpression,
} from '../../../graph/metamodel/pure/valueSpecification/Expression.js';
import {
  type ValueSpecificationVisitor,
  ValueSpecification,
} from '../../../graph/metamodel/pure/valueSpecification/ValueSpecification.js';
import type { VariableExpression } from '../../../graph/metamodel/pure/valueSpecification/VariableExpression.js';
import {
  type ObserverContext,
  skipObservedWithContext,
  skipObserved,
  observe_PackageableElementReference,
} from './CoreObserverHelper.js';
import {
  observe_EnumValueReference,
  observe_GenericTypeReference,
  observe_PropertyReference,
} from './DomainObserverHelper.js';
import { observe_Runtime } from './DSL_Mapping_ObserverHelper.js';

const observe_Abstract_ValueSpecification = (
  metamodel: ValueSpecification,
): void => {
  makeObservable<ValueSpecification>(metamodel, {
    multiplicity: observable,
    hashCode: computed,
  });

  if (metamodel.genericType) {
    observe_GenericTypeReference(metamodel.genericType);
  }
};

export const observe_VariableExpression = skipObserved(
  (metamodel: VariableExpression): VariableExpression => {
    observe_Abstract_ValueSpecification(metamodel);

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
  (metamodel: SimpleFunctionExpression, context): SimpleFunctionExpression => {
    observe_Abstract_FunctionExpression(metamodel, context);

    if (metamodel.func) {
      observe_PackageableElementReference(metamodel.func);
    }

    return metamodel;
  },
);

export const observe_AbstractPropertyExpression = skipObservedWithContext(
  (
    metamodel: AbstractPropertyExpression,
    context,
  ): AbstractPropertyExpression => {
    observe_Abstract_FunctionExpression(metamodel, context);

    return metamodel;
  },
);

export const observe_PrimitiveInstanceValue = skipObservedWithContext(
  (metamodel: PrimitiveInstanceValue, context): PrimitiveInstanceValue => {
    observe_Abstract_InstanceValue(metamodel, context);
    makeObservable(metamodel, {
      hashCode: override,
    });

    return metamodel;
  },
);

export const observe_EnumValueInstanceValue = skipObservedWithContext(
  (metamodel: EnumValueInstanceValue, context): EnumValueInstanceValue => {
    observe_Abstract_InstanceValue(metamodel, context);
    makeObservable(metamodel, {
      hashCode: override,
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
      context,
    ): PropertyGraphFetchTreeInstanceValue => {
      observe_Abstract_InstanceValue(metamodel, context);
      makeObservable(metamodel, {
        hashCode: override,
      });

      metamodel.values
        .filter(filterByType(PropertyGraphFetchTree))
        .forEach((value) => observe_PropertyGraphFetchTree(value, context));

      return metamodel;
    },
  );

export const observe_RootGraphFetchTreeInstanceValue = skipObservedWithContext(
  (
    metamodel: RootGraphFetchTreeInstanceValue,
    context,
  ): RootGraphFetchTreeInstanceValue => {
    observe_Abstract_InstanceValue(metamodel, context);
    makeObservable(metamodel, {
      hashCode: override,
    });

    metamodel.values.forEach((value) =>
      observe_RootGraphFetchTree(value, context),
    );

    return metamodel;
  },
);

const observe_AlloySerializationConfig = skipObserved(
  (metamodel: AlloySerializationConfig) => {
    makeObservable(metamodel, {
      typeKeyName: observable,
      includeType: observable,
      includeEnumType: observable,
      removePropertiesWithNullValues: observable,
      removePropertiesWithEmptySets: observable,
      fullyQualifiedTypePath: observable,
      includeObjectReference: observable,
      hashCode: computed,
    });

    return metamodel;
  },
);

const observe_AlloySerializationConfigInstanceValue = skipObservedWithContext(
  (
    metamodel: AlloySerializationConfigInstanceValue,
    context,
  ): AlloySerializationConfigInstanceValue => {
    observe_Abstract_InstanceValue(metamodel, context);
    makeObservable(metamodel, {
      hashCode: override,
    });

    metamodel.values
      .filter(filterByType(AlloySerializationConfig))
      .forEach((value) => observe_AlloySerializationConfig(value));
    return metamodel;
  },
);

const observe_LambdaFunction = skipObservedWithContext(_observe_LambdaFunction);

const observe_LambdaFunctionInstanceValue = skipObservedWithContext(
  (
    metamodel: LambdaFunctionInstanceValue,
    context,
  ): LambdaFunctionInstanceValue => {
    observe_Abstract_InstanceValue(metamodel, context);
    makeObservable(metamodel, {
      hashCode: override,
    });

    metamodel.values
      .filter(filterByType(LambdaFunction))
      .forEach((value) => observe_LambdaFunction(value, context));

    return metamodel;
  },
);

const observe_FunctionType = skipObserved(
  (metamodel: FunctionType): FunctionType => {
    makeObservable(metamodel, {
      returnType: observable,
      parameters: observable,
      returnMultiplicity: observable,
      hashCode: computed,
    });

    // TODO? returnType? - when we make this reference
    metamodel.parameters.forEach((parameter) =>
      observe_VariableExpression(parameter),
    );

    return metamodel;
  },
);

const observe_INTERNAL__UnknownValueSpecification = skipObserved(
  (
    metamodel: INTERNAL__UnknownValueSpecification,
  ): INTERNAL__UnknownValueSpecification => {
    observe_Abstract_ValueSpecification(metamodel);

    makeObservable(metamodel, {
      content: observable.ref,
    });

    return metamodel;
  },
);

const observe_RuntimeInstanceValue = skipObservedWithContext(
  (metamodel: RuntimeInstanceValue, context): RuntimeInstanceValue => {
    observe_Abstract_InstanceValue(metamodel, context);
    makeObservable(metamodel, {
      hashCode: override,
    });

    metamodel.values
      .filter(filterByType(Runtime))
      .forEach((value) => observe_Runtime(value, context));

    return metamodel;
  },
);

const observe_PairInstanceValue = skipObservedWithContext(
  _observe_PairInstanceValue,
);

const observe_MappingInstanceValue = skipObservedWithContext(
  (metamodel: MappingInstanceValue, context): MappingInstanceValue => {
    observe_Abstract_InstanceValue(metamodel, context);
    makeObservable(metamodel, {
      hashCode: override,
    });

    metamodel.values
      .filter(filterByType(PackageableElementReference))
      .forEach(observe_PackageableElementReference);

    return metamodel;
  },
);

const observe_PureListInstanceValue = skipObservedWithContext(
  (metamodel: PureListInstanceValue, context): PureListInstanceValue => {
    observe_Abstract_InstanceValue(metamodel, context);
    makeObservable(metamodel, {
      hashCode: override,
    });

    return metamodel;
  },
);

const observe_InstanceValue = skipObservedWithContext(
  (metamodel: InstanceValue, context): InstanceValue => {
    observe_Abstract_InstanceValue(metamodel, context);

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
    observe_AlloySerializationConfigInstanceValue(
      valueSpecification,
      this.observerContext,
    );
  }

  visit_PrimitiveInstanceValue(
    valueSpecification: PrimitiveInstanceValue,
  ): void {
    observe_PrimitiveInstanceValue(valueSpecification, this.observerContext);
  }

  visit_EnumValueInstanceValue(
    valueSpecification: EnumValueInstanceValue,
  ): void {
    observe_EnumValueInstanceValue(valueSpecification, this.observerContext);
  }

  visit_RuntimeInstanceValue(valueSpecification: RuntimeInstanceValue): void {
    observe_RuntimeInstanceValue(valueSpecification, this.observerContext);
  }

  visit_PairInstanceValue(valueSpecification: PairInstanceValue): void {
    observe_PairInstanceValue(valueSpecification, this.observerContext);
  }

  visit_MappingInstanceValue(valueSpecification: MappingInstanceValue): void {
    observe_MappingInstanceValue(valueSpecification, this.observerContext);
  }

  visit_PureListInstanceValue(valueSpecification: PureListInstanceValue): void {
    observe_PureListInstanceValue(valueSpecification, this.observerContext);
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
    observe_LambdaFunctionInstanceValue(
      valueSpecification,
      this.observerContext,
    );
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
    observe_InstanceValue(valueSpecification, this.observerContext);
  }

  visit_INTERNAL__UnknownValueSpecification(
    valueSpecification: INTERNAL__UnknownValueSpecification,
  ): void {
    observe_INTERNAL__UnknownValueSpecification(valueSpecification);
  }

  visit_INTERNAL__PropagatedValue(
    valueSpecification: INTERNAL__PropagatedValue,
  ): void {
    observe_Abstract_ValueSpecification(valueSpecification);
  }
}

export const observe_ValueSpecification = skipObservedWithContext(
  (valueSpecification: ValueSpecification, context): ValueSpecification => {
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
  observe_Abstract_InstanceValue(metamodel, context);
  makeObservable(metamodel, {
    hashCode: override,
  });

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
    func: observable,
    hashCode: override,
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
    hashCode: computed,
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
  if (metamodel.subType) {
    observe_PackageableElementReference(metamodel.subType);
  }

  return metamodel;
}

function observe_Abstract_InstanceValue(
  metamodel: InstanceValue,
  context: ObserverContext,
): void {
  observe_Abstract_ValueSpecification(metamodel);

  makeObservable(metamodel, {
    values: observable,
  });

  metamodel.values
    .filter(filterByType(ValueSpecification))
    .forEach((value) => observe_ValueSpecification(value, context));
}

function _observe_LambdaFunction(
  metamodel: LambdaFunction,
  context: ObserverContext,
): LambdaFunction {
  makeObservable(metamodel, {
    functionType: observable,
    openVariables: observable,
    expressionSequence: observable,
    hashCode: computed,
  });

  observe_FunctionType(metamodel.functionType);
  metamodel.expressionSequence.forEach((e) =>
    observe_ValueSpecification(e, context),
  );

  return metamodel;
}

function _observe_PairInstanceValue(
  metamodel: PairInstanceValue,
  context: ObserverContext,
): PairInstanceValue {
  observe_Abstract_InstanceValue(metamodel, context);
  makeObservable(metamodel, {
    hashCode: override,
  });

  metamodel.values.filter(filterByType(Pair)).forEach((value) => {
    makeObservable(value, {
      first: observable,
      second: observable,
    });

    if (value.first instanceof ValueSpecification) {
      observe_ValueSpecification(value.first, context);
    }
    if (value.second instanceof ValueSpecification) {
      observe_ValueSpecification(value.second, context);
    }
  });

  return metamodel;
}

export const observe_adaptive_ValueSpecification = <
  T extends ValueSpecification,
>(
  metamodel: T,
  context: ObserverContext,
): T => {
  observe_ValueSpecification(metamodel, context);
  return metamodel;
};
