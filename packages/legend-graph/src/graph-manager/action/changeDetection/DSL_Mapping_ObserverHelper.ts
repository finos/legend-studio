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

import { computed, makeObservable, observable, override } from 'mobx';
import type {
  Connection,
  ConnectionPointer,
  ConnectionVisitor,
} from '../../../graph/metamodel/pure/packageableElements/connection/Connection.js';
import type { PackageableConnection } from '../../../graph/metamodel/pure/packageableElements/connection/PackageableConnection.js';
import type { AggregationAwarePropertyMapping } from '../../../graph/metamodel/pure/packageableElements/mapping/aggregationAware/AggregationAwarePropertyMapping.js';
import type { AggregationAwareSetImplementation } from '../../../graph/metamodel/pure/packageableElements/mapping/aggregationAware/AggregationAwareSetImplementation.js';
import type { AssociationImplementation } from '../../../graph/metamodel/pure/packageableElements/mapping/AssociationImplementation.js';
import type { EnumerationMapping } from '../../../graph/metamodel/pure/packageableElements/mapping/EnumerationMapping.js';
import type { EnumerationMappingReference } from '../../../graph/metamodel/pure/packageableElements/mapping/EnumerationMappingReference.js';
import type {
  EnumValueMapping,
  SourceValue,
} from '../../../graph/metamodel/pure/packageableElements/mapping/EnumValueMapping.js';
import type { InferableMappingElementIdValue } from '../../../graph/metamodel/pure/packageableElements/mapping/InferableMappingElementId.js';
import type { InferableMappingElementRoot } from '../../../graph/metamodel/pure/packageableElements/mapping/InferableMappingElementRoot.js';
import type { InstanceSetImplementation } from '../../../graph/metamodel/pure/packageableElements/mapping/InstanceSetImplementation.js';
import type { LocalMappingPropertyInfo } from '../../../graph/metamodel/pure/packageableElements/mapping/LocalMappingPropertyInfo.js';
import type { Mapping } from '../../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import type { MappingClass } from '../../../graph/metamodel/pure/packageableElements/mapping/MappingClass.js';
import type { MappingInclude } from '../../../graph/metamodel/pure/packageableElements/mapping/MappingInclude.js';
import { MappingIncludeMapping } from '../../../graph/metamodel/pure/packageableElements/mapping/MappingIncludeMapping.js';
import {
  type DEPRECATED__MappingTest,
  type DEPRECATED__InputData,
  type DEPRECATED__MappingTestAssert,
  DEPRECATED__ExpectedOutputMappingTestAssert,
  DEPRECATED__ObjectInputData,
  DEPRECATED__FlatDataInputData,
  DEPRECATED__RelationalInputData,
} from '../../../graph/metamodel/pure/packageableElements/mapping/DEPRECATED__MappingTest.js';
import type { MergeOperationSetImplementation } from '../../../graph/metamodel/pure/packageableElements/mapping/MergeOperationSetImplementation.js';
import type { OperationSetImplementation } from '../../../graph/metamodel/pure/packageableElements/mapping/OperationSetImplementation.js';
import type {
  PropertyMapping,
  PropertyMappingVisitor,
} from '../../../graph/metamodel/pure/packageableElements/mapping/PropertyMapping.js';
import type {
  SetImplementation,
  SetImplementationVisitor,
} from '../../../graph/metamodel/pure/packageableElements/mapping/SetImplementation.js';
import type { SetImplementationContainer } from '../../../graph/metamodel/pure/packageableElements/mapping/SetImplementationContainer.js';
import type { SetImplementationReference } from '../../../graph/metamodel/pure/packageableElements/mapping/SetImplementationReference.js';
import type { SubstituteStore } from '../../../graph/metamodel/pure/packageableElements/mapping/SubstituteStore.js';
import type { INTERNAL__UnresolvedSetImplementation } from '../../../graph/metamodel/pure/packageableElements/mapping/INTERNAL__UnresolvedSetImplementation.js';
import type { XStorePropertyMapping } from '../../../graph/metamodel/pure/packageableElements/mapping/xStore/XStorePropertyMapping.js';
import type { PackageableRuntime } from '../../../graph/metamodel/pure/packageableElements/runtime/PackageableRuntime.js';
import {
  EngineRuntime,
  RuntimePointer,
  type IdentifiedConnection,
  type Runtime,
  type StoreConnections,
} from '../../../graph/metamodel/pure/packageableElements/runtime/Runtime.js';
import type { FlatDataConnection } from '../../../graph/metamodel/pure/packageableElements/store/flatData/connection/FlatDataConnection.js';
import type { EmbeddedFlatDataPropertyMapping } from '../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping.js';
import type { FlatDataInstanceSetImplementation } from '../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/FlatDataInstanceSetImplementation.js';
import type { FlatDataPropertyMapping } from '../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/FlatDataPropertyMapping.js';
import type { JsonModelConnection } from '../../../graph/metamodel/pure/packageableElements/store/modelToModel/connection/JsonModelConnection.js';
import type { ModelChainConnection } from '../../../graph/metamodel/pure/packageableElements/store/modelToModel/connection/ModelChainConnection.js';
import type { XmlModelConnection } from '../../../graph/metamodel/pure/packageableElements/store/modelToModel/connection/XmlModelConnection.js';
import type { PureInstanceSetImplementation } from '../../../graph/metamodel/pure/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation.js';
import type { PurePropertyMapping } from '../../../graph/metamodel/pure/packageableElements/store/modelToModel/mapping/PurePropertyMapping.js';
import type { RelationalDatabaseConnection } from '../../../graph/metamodel/pure/packageableElements/store/relational/connection/RelationalDatabaseConnection.js';
import type { EmbeddedRelationalInstanceSetImplementation } from '../../../graph/metamodel/pure/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation.js';
import type { InlineEmbeddedRelationalInstanceSetImplementation } from '../../../graph/metamodel/pure/packageableElements/store/relational/mapping/InlineEmbeddedRelationalInstanceSetImplementation.js';
import type { OtherwiseEmbeddedRelationalInstanceSetImplementation } from '../../../graph/metamodel/pure/packageableElements/store/relational/mapping/OtherwiseEmbeddedRelationalInstanceSetImplementation.js';
import type { RelationalInstanceSetImplementation } from '../../../graph/metamodel/pure/packageableElements/store/relational/mapping/RelationalInstanceSetImplementation.js';
import type { RelationalPropertyMapping } from '../../../graph/metamodel/pure/packageableElements/store/relational/mapping/RelationalPropertyMapping.js';
import type { RootRelationalInstanceSetImplementation } from '../../../graph/metamodel/pure/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation.js';
import type { Store } from '../../../graph/metamodel/pure/packageableElements/store/Store.js';
import type { DSL_Mapping_PureGraphManagerPlugin_Extension } from '../../extensions/DSL_Mapping_PureGraphManagerPlugin_Extension.js';
import {
  type ObserverContext,
  observe_Abstract_PackageableElement,
  observe_PackageableElementReference,
  skipObserved,
  skipObservedWithContext,
} from './CoreObserverHelper.js';
import {
  observe_EnumValueReference,
  observe_PropertyReference,
} from './DomainObserverHelper.js';
import { observe_RawLambda } from './RawValueSpecificationObserver.js';
import {
  observe_EmbeddedFlatDataPropertyMapping,
  observe_FlatDataAssociationPropertyMapping,
  observe_FlatDataConnection,
  observe_FlatDataInputData,
  observe_FlatDataInstanceSetImplementation,
  observe_FlatDataPropertyMapping,
} from './STO_FlatData_ObserverHelper.js';
import {
  observe_EmbeddedRelationalInstanceSetImplementation,
  observe_InlineEmbeddedRelationalInstanceSetImplementation,
  observe_OtherwiseEmbeddedRelationalInstanceSetImplementation,
  observe_RelationalDatabaseConnection,
  observe_RelationalInputData,
  observe_RelationalInstanceSetImplementation,
  observe_RelationalPropertyMapping,
  observe_RootRelationalInstanceSetImplementation,
} from './STO_Relational_ObserverHelper.js';
import type { FlatDataAssociationPropertyMapping } from '../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/FlatDataAssociationPropertyMapping.js';
import type { MappingTest } from '../../../graph/metamodel/pure/packageableElements/mapping/MappingTest.js';
import {
  observe_AtomicTest,
  observe_TestAssertion,
  observe_TestSuite,
} from './Testable_ObserverHelper.js';
import type { MappingTestSuite } from '../../../graph/metamodel/pure/packageableElements/mapping/MappingTestSuite.js';
import type { StoreTestData } from '../../../graph/metamodel/pure/packageableElements/mapping/MappingStoreTestData.js';
import { observe_EmbeddedData } from './DSL_Data_ObserverHelper.js';
import type { INTERNAL__UnknownConnection } from '../../../graph/metamodel/pure/packageableElements/connection/INTERNAL__UnknownConnection.js';
import type { INTERNAL__UnknownPropertyMapping } from '../../../graph/metamodel/pure/packageableElements/mapping/INTERNAL__UnknownPropertyMapping.js';
import type { INTERNAL__UnknownSetImplementation } from '../../../graph/metamodel/pure/packageableElements/mapping/INTERNAL__UnknownSetImplementation.js';
import type { INTERNAL__UnknownStore } from '../../../graph/metamodel/pure/packageableElements/store/INTERNAL__UnknownStore.js';

// ------------------------------------- Store -------------------------------------

export const observe_Abstract_Store = (metamodel: Store): void => {
  observe_Abstract_PackageableElement(metamodel);

  makeObservable(metamodel, {
    includes: observable,
  });

  metamodel.includes.forEach(observe_PackageableElementReference);
};

export const observe_INTERNAL__UnknownStore = skipObserved(
  (metamodel: INTERNAL__UnknownStore): INTERNAL__UnknownStore => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable(metamodel, {
      content: observable.ref,
    });

    return metamodel;
  },
);

// ------------------------------------- TestSuite -----------------------------------

export const observe_MappingStoreTestData = skipObservedWithContext(
  (metamodel: StoreTestData, context: ObserverContext): StoreTestData => {
    makeObservable(metamodel, {
      store: observable,
      data: observable,
      hashCode: computed,
    });

    observe_EmbeddedData(metamodel.data, context);

    return metamodel;
  },
);

export const observe_MappingTest = skipObservedWithContext(
  (metamodel: MappingTest, context: ObserverContext): MappingTest => {
    makeObservable(metamodel, {
      id: observable,
      assertions: observable,
      doc: observable,
      storeTestData: observable,
      hashCode: computed,
    });
    metamodel.assertions.forEach(observe_TestAssertion);
    metamodel.storeTestData.forEach((testData) =>
      observe_MappingStoreTestData(testData, context),
    );
    return metamodel;
  },
);

export const observe_MappingTestSuite = skipObservedWithContext(
  (metamodel: MappingTestSuite, context: ObserverContext): MappingTestSuite => {
    makeObservable(metamodel, {
      id: observable,
      tests: observable,
      func: observable,
      hashCode: computed,
    });

    metamodel.tests.forEach((test) => observe_AtomicTest(test, context));
    observe_RawLambda(metamodel.func);
    return metamodel;
  },
);

// ------------------------------------- Mapping -------------------------------------

export const observe_EnumerationMappingReference = skipObserved(
  (metamodel: EnumerationMappingReference): EnumerationMappingReference => {
    makeObservable(metamodel, {
      value: observable,
      valueForSerialization: computed,
    });

    observe_PackageableElementReference(metamodel.ownerReference);

    return metamodel;
  },
);

export const observe_SetImplementationReference = skipObserved(
  (metamodel: SetImplementationReference): SetImplementationReference => {
    makeObservable(metamodel, {
      value: observable,
    });

    observe_PackageableElementReference(metamodel.ownerReference);

    return metamodel;
  },
);

export const observe_LocalMappingPropertyInfo = skipObserved(
  (metamodel: LocalMappingPropertyInfo): LocalMappingPropertyInfo => {
    makeObservable(metamodel, {
      localMappingProperty: observable,
      localMappingPropertyType: observable,
      localMappingPropertyMultiplicity: observable,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.localMappingPropertyType);

    return metamodel;
  },
);

export const observe_Abstract_PropertyMapping = (
  metamodel: PropertyMapping,
  context: ObserverContext,
): void => {
  makeObservable(metamodel, {
    sourceSetImplementation: observable,
    targetSetImplementation: observable,
  });

  observe_PropertyReference(metamodel.property);
  observe_SetImplementationReference(metamodel.sourceSetImplementation);
  if (metamodel.targetSetImplementation) {
    observe_SetImplementationReference(metamodel.targetSetImplementation);
  }
  if (metamodel.localMappingProperty) {
    observe_LocalMappingPropertyInfo(metamodel.localMappingProperty);
  }
};

export const observe_PurePropertyMapping = skipObservedWithContext(
  (metamodel: PurePropertyMapping, context) => {
    observe_Abstract_PropertyMapping(metamodel, context);

    makeObservable(metamodel, {
      transformer: observable,
      transform: observable,
      explodeProperty: observable,
      hashCode: computed,
    });

    if (metamodel.transformer) {
      observe_EnumerationMappingReference(metamodel.transformer);
    }
    observe_RawLambda(metamodel.transform);

    return metamodel;
  },
);

const observe_INTERNAL__UnknownPropertyMapping = skipObserved(
  (
    metamodel: INTERNAL__UnknownPropertyMapping,
  ): INTERNAL__UnknownPropertyMapping =>
    makeObservable(metamodel, {
      content: observable.ref,
    }),
);

class PropertyMappingObserver implements PropertyMappingVisitor<void> {
  observerContext: ObserverContext;

  constructor(observerContext: ObserverContext) {
    this.observerContext = observerContext;
  }

  visit_PropertyMapping(propertyMapping: PropertyMapping): void {
    const extraPropertyMappingObservers = this.observerContext.plugins.flatMap(
      (plugin) =>
        (
          plugin as DSL_Mapping_PureGraphManagerPlugin_Extension
        ).getExtraPropertyMappingObservers?.() ?? [],
    );
    for (const observer of extraPropertyMappingObservers) {
      const observedPropertyMapping = observer(
        propertyMapping,
        this.observerContext,
      );
      if (observedPropertyMapping) {
        return;
      }
    }
  }

  visit_INTERNAL__UnknownPropertyMapping(
    propertyMapping: INTERNAL__UnknownPropertyMapping,
  ): void {
    observe_INTERNAL__UnknownPropertyMapping(propertyMapping);
  }

  visit_PurePropertyMapping(propertyMapping: PurePropertyMapping): void {
    observe_PurePropertyMapping(propertyMapping, this.observerContext);
  }

  visit_FlatDataPropertyMapping(
    propertyMapping: FlatDataPropertyMapping,
  ): void {
    observe_FlatDataPropertyMapping(propertyMapping, this.observerContext);
  }

  visit_EmbeddedFlatDataPropertyMapping(
    propertyMapping: EmbeddedFlatDataPropertyMapping,
  ): void {
    observe_EmbeddedFlatDataPropertyMapping(
      propertyMapping,
      this.observerContext,
    );
  }

  visit_RelationalPropertyMapping(
    propertyMapping: RelationalPropertyMapping,
  ): void {
    observe_RelationalPropertyMapping(propertyMapping, this.observerContext);
  }

  visit_FlatDataAssociationPropertyMapping(
    propertyMapping: FlatDataAssociationPropertyMapping,
  ): void {
    observe_FlatDataAssociationPropertyMapping(
      propertyMapping,
      this.observerContext,
    );
  }

  visit_EmbeddedRelationalPropertyMapping(
    propertyMapping: EmbeddedRelationalInstanceSetImplementation,
  ): void {
    observe_EmbeddedRelationalInstanceSetImplementation(
      propertyMapping,
      this.observerContext,
    );
  }

  visit_InlineEmbeddedRelationalPropertyMapping(
    propertyMapping: InlineEmbeddedRelationalInstanceSetImplementation,
  ): void {
    observe_InlineEmbeddedRelationalInstanceSetImplementation(
      propertyMapping,
      this.observerContext,
    );
  }

  visit_OtherwiseEmbeddedRelationalPropertyMapping(
    propertyMapping: OtherwiseEmbeddedRelationalInstanceSetImplementation,
  ): void {
    observe_OtherwiseEmbeddedRelationalInstanceSetImplementation(
      propertyMapping,
      this.observerContext,
    );
  }

  visit_AggregationAwarePropertyMapping(
    propertyMapping: AggregationAwarePropertyMapping,
  ): void {
    // TODO
  }

  visit_XStorePropertyMapping(propertyMapping: XStorePropertyMapping): void {
    // TODO
  }
}

export const observe_PropertyMapping = (
  metamodel: PropertyMapping,
  context: ObserverContext,
): PropertyMapping => {
  metamodel.accept_PropertyMappingVisitor(new PropertyMappingObserver(context));
  return metamodel;
};

export const observe_InferableMappingElementIdValue = skipObserved(
  (metamodel: InferableMappingElementIdValue): InferableMappingElementIdValue =>
    makeObservable(metamodel, {
      isDefault: computed,
      valueForSerialization: computed,
    }),
);

export const observe_InferableMappingElementRoot = skipObserved(
  (metamodel: InferableMappingElementRoot): InferableMappingElementRoot =>
    makeObservable(metamodel, {
      valueForSerialization: computed,
    }),
);

const observe_Abstract_SetImplementation = (
  metamodel: SetImplementation,
): void => {
  makeObservable(metamodel, {
    root: observable,
  });

  observe_PackageableElementReference(metamodel.class);
  observe_InferableMappingElementIdValue(metamodel.id);
  observe_InferableMappingElementRoot(metamodel.root);
};

const observe_MappingClass = skipObserved(
  (metamodel: MappingClass): MappingClass => {
    makeObservable(metamodel, {
      setImplementation: observable,
      class: observable,
      properties: observable,
    });

    // TODO

    return metamodel;
  },
);

export const observe_Abstract_InstanceSetImplementation = (
  metamodel: InstanceSetImplementation,
  context: ObserverContext,
): void => {
  observe_Abstract_SetImplementation(metamodel);

  makeObservable(metamodel, {
    mappingClass: observable,
    propertyMappings: observable,
  });

  if (metamodel.mappingClass) {
    observe_MappingClass(metamodel.mappingClass);
  }
  metamodel.propertyMappings.forEach((propertyMapping: PropertyMapping) =>
    observe_PropertyMapping(propertyMapping, context),
  );
};

export const observe_SetImplementationContainer = skipObserved(
  (metamodel: SetImplementationContainer): SetImplementationContainer => {
    makeObservable(metamodel, {});

    observe_SetImplementationReference(metamodel.setImplementation);

    return metamodel;
  },
);

export const observe_Abstract_OperationSetImplementation = (
  metamodel: OperationSetImplementation,
): void => {
  observe_Abstract_SetImplementation(metamodel);

  makeObservable(metamodel, {
    parameters: observable,
    operation: observable,
    hashCode: computed,
  });

  metamodel.parameters.forEach(observe_SetImplementationContainer);
};

export const observe_OperationSetImplementation = skipObserved(
  (metamodel: OperationSetImplementation): OperationSetImplementation => {
    observe_Abstract_OperationSetImplementation(metamodel);

    return metamodel;
  },
);

export const observe_MergeOperationSetImplementation = skipObserved(
  (
    metamodel: MergeOperationSetImplementation,
  ): MergeOperationSetImplementation => {
    observe_Abstract_OperationSetImplementation(metamodel);

    makeObservable(metamodel, {
      validationFunction: observable,
    });

    observe_RawLambda(metamodel.validationFunction);

    return metamodel;
  },
);

export const observe_PureInstanceSetImplementation = skipObservedWithContext(
  (
    metamodel: PureInstanceSetImplementation,
    context,
  ): PureInstanceSetImplementation => {
    observe_Abstract_InstanceSetImplementation(metamodel, context);

    makeObservable(metamodel, {
      filter: observable,
      hashCode: computed,
    });

    if (metamodel.srcClass) {
      observe_PackageableElementReference(metamodel.srcClass);
    }
    if (metamodel.filter) {
      observe_RawLambda(metamodel.filter);
    }

    return metamodel;
  },
);

const observe_INTERNAL__UnknownSetImplementation = skipObserved(
  (
    metamodel: INTERNAL__UnknownSetImplementation,
  ): INTERNAL__UnknownSetImplementation => {
    observe_Abstract_SetImplementation(metamodel);

    makeObservable(metamodel, {
      content: observable.ref,
    });

    return metamodel;
  },
);

class SetImplementationObserver implements SetImplementationVisitor<void> {
  observerContext: ObserverContext;

  constructor(observerContext: ObserverContext) {
    this.observerContext = observerContext;
  }

  visit_SetImplementation(setImplementation: InstanceSetImplementation): void {
    const extraObservers = this.observerContext.plugins.flatMap(
      (plugin) =>
        (
          plugin as DSL_Mapping_PureGraphManagerPlugin_Extension
        ).getExtraSetImplementationObservers?.() ?? [],
    );
    for (const observer of extraObservers) {
      const observedSetImplementation = observer(
        setImplementation,
        this.observerContext,
      );
      if (observedSetImplementation) {
        return;
      }
    }
  }

  visit_INTERNAL__UnknownSetImplementation(
    setImplementation: INTERNAL__UnknownSetImplementation,
  ): void {
    observe_INTERNAL__UnknownSetImplementation(setImplementation);
  }

  visit_MergeOperationSetImplementation(
    setImplementation: MergeOperationSetImplementation,
  ): void {
    observe_MergeOperationSetImplementation(setImplementation);
  }

  visit_OperationSetImplementation(
    setImplementation: OperationSetImplementation,
  ): void {
    observe_OperationSetImplementation(setImplementation);
  }

  visit_PureInstanceSetImplementation(
    setImplementation: PureInstanceSetImplementation,
  ): void {
    observe_PureInstanceSetImplementation(
      setImplementation,
      this.observerContext,
    );
  }

  visit_FlatDataInstanceSetImplementation(
    setImplementation: FlatDataInstanceSetImplementation,
  ): void {
    observe_FlatDataInstanceSetImplementation(
      setImplementation,
      this.observerContext,
    );
  }

  visit_EmbeddedFlatDataSetImplementation(
    setImplementation: EmbeddedFlatDataPropertyMapping,
  ): void {
    return;
  }

  visit_RelationalInstanceSetImplementation(
    setImplementation: RelationalInstanceSetImplementation,
  ): void {
    observe_RelationalInstanceSetImplementation(
      setImplementation,
      this.observerContext,
    );
  }

  visit_RootRelationalInstanceSetImplementation(
    setImplementation: RootRelationalInstanceSetImplementation,
  ): void {
    observe_RootRelationalInstanceSetImplementation(
      setImplementation,
      this.observerContext,
    );
  }

  visit_AggregationAwareSetImplementation(
    setImplementation: AggregationAwareSetImplementation,
  ): void {
    // TODO
  }

  visit_INTERNAL__UnresolvedSetImplementation(
    setImplementation: INTERNAL__UnresolvedSetImplementation,
  ): void {
    return;
  }
}

export const observe_SetImplementation = (
  metamodel: SetImplementation,
  context: ObserverContext,
): SetImplementation => {
  metamodel.accept_SetImplementationVisitor(
    new SetImplementationObserver(context),
  );
  return metamodel;
};

export const observe_SubstituteStore = skipObserved(
  (metamodel: SubstituteStore): SubstituteStore => {
    makeObservable(metamodel, {
      original: observable,
      substitute: observable,
    });

    observe_PackageableElementReference(metamodel.original);
    observe_PackageableElementReference(metamodel.substitute);

    return metamodel;
  },
);

export const observe_MappingInclude = skipObserved(
  (metamodel: MappingInclude): MappingInclude => {
    // TODO: handle for mapping include data product
    if (metamodel instanceof MappingIncludeMapping) {
      makeObservable(metamodel, {
        included: observable,
        storeSubstitutions: observable,
      });

      observe_PackageableElementReference(metamodel.included);
      metamodel.storeSubstitutions.forEach(observe_SubstituteStore);

      return metamodel;
    }
    return metamodel;
  },
);

export const observe_SourceValue = skipObserved(
  (metamodel: SourceValue): SourceValue =>
    makeObservable(metamodel, {
      value: observable,
    }),
);

export const observe_EnumValueMapping = skipObserved(
  (metamodel: EnumValueMapping): EnumValueMapping => {
    makeObservable(metamodel, {
      sourceValues: observable,
      hashCode: computed,
    });

    observe_EnumValueReference(metamodel.enum);
    metamodel.sourceValues.forEach(observe_SourceValue);

    return metamodel;
  },
);

export const observe_EnumerationMapping = skipObserved(
  (metamodel: EnumerationMapping): EnumerationMapping => {
    makeObservable(metamodel, {
      sourceType: observable,
      enumValueMappings: observable,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.enumeration);
    observe_InferableMappingElementIdValue(metamodel.id);
    if (metamodel.sourceType) {
      observe_PackageableElementReference(metamodel.sourceType);
    }
    metamodel.enumValueMappings.forEach(observe_EnumValueMapping);

    return metamodel;
  },
);

export const observe_AssociationImplementation = skipObservedWithContext(
  (
    metamodel: AssociationImplementation,
    context,
  ): AssociationImplementation => {
    makeObservable(metamodel, {
      id: observable,
      stores: observable,
      propertyMappings: observable,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.association);
    observe_InferableMappingElementIdValue(metamodel.id);
    metamodel.stores.forEach(observe_PackageableElementReference);
    metamodel.propertyMappings.forEach((propertyMapping) =>
      observe_PropertyMapping(propertyMapping, context),
    );

    return metamodel;
  },
);

export const observe_ObjectInputData = skipObserved(
  (metamodel: DEPRECATED__ObjectInputData): DEPRECATED__ObjectInputData => {
    makeObservable(metamodel, {
      inputType: observable,
      data: observable,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.sourceClass);

    return metamodel;
  },
);

export const observe_InputData = (
  metamodel: DEPRECATED__InputData,
  context: ObserverContext,
): DEPRECATED__InputData => {
  if (metamodel instanceof DEPRECATED__ObjectInputData) {
    return observe_ObjectInputData(metamodel);
  } else if (metamodel instanceof DEPRECATED__FlatDataInputData) {
    return observe_FlatDataInputData(metamodel);
  } else if (metamodel instanceof DEPRECATED__RelationalInputData) {
    return observe_RelationalInputData(metamodel);
  }
  const extraObservers = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mapping_PureGraphManagerPlugin_Extension
      ).getExtraMappingTestInputDataObservers?.() ?? [],
  );
  for (const observer of extraObservers) {
    const observed = observer(metamodel, context);
    if (observed) {
      return observed;
    }
  }
  return metamodel;
};

export const observe_ExpectedOutputMappingTestAssert = skipObserved(
  (
    metamodel: DEPRECATED__ExpectedOutputMappingTestAssert,
  ): DEPRECATED__ExpectedOutputMappingTestAssert =>
    makeObservable(metamodel, {
      expectedOutput: observable,
      hashCode: computed,
    }),
);

export const observe_MappingTestAssert = (
  metamodel: DEPRECATED__MappingTestAssert,
  context: ObserverContext,
): DEPRECATED__MappingTestAssert => {
  if (metamodel instanceof DEPRECATED__ExpectedOutputMappingTestAssert) {
    return observe_ExpectedOutputMappingTestAssert(metamodel);
  }
  return metamodel;
};

export const observe_MappingTest_Legacy = skipObservedWithContext(
  (metamodel: DEPRECATED__MappingTest, context): DEPRECATED__MappingTest => {
    makeObservable(metamodel, {
      name: observable,
      query: observable,
      inputData: observable,
      assert: observable,
      hashCode: computed,
    });

    observe_RawLambda(metamodel.query);
    metamodel.inputData.forEach((inputData) =>
      observe_InputData(inputData, context),
    );
    observe_MappingTestAssert(metamodel.assert, context);

    return metamodel;
  },
);

export const observe_Mapping = skipObservedWithContext(
  (metamodel: Mapping, context): Mapping => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<Mapping, '_elementHashCode'>(metamodel, {
      includes: observable,
      classMappings: observable,
      enumerationMappings: observable,
      associationMappings: observable,
      test: observable,
      tests: observable,
      _elementHashCode: override,
    });

    // TODO: create extension mechanism to observe mapping includes when we build editor for this
    metamodel.includes.forEach(observe_MappingInclude);
    metamodel.classMappings.forEach((classMapping) =>
      observe_SetImplementation(classMapping, context),
    );
    metamodel.enumerationMappings.forEach(observe_EnumerationMapping);
    metamodel.associationMappings.forEach((associationMapping) =>
      observe_AssociationImplementation(associationMapping, context),
    );
    metamodel.test.forEach((t) => observe_MappingTest_Legacy(t, context));
    metamodel.tests.forEach((testSuite) =>
      observe_TestSuite(testSuite, context),
    );
    return metamodel;
  },
);

// ------------------------------------- Connection -------------------------------------

export const observe_Abstract_Connection = (metamodel: Connection): void => {
  makeObservable(metamodel, {
    store: observable,
  });
  if (metamodel.store) {
    observe_PackageableElementReference(metamodel.store);
  }
};

export const observe_ConnectionPointer = skipObserved(
  (metamodel: ConnectionPointer): ConnectionPointer => {
    observe_Abstract_Connection(metamodel);

    makeObservable(metamodel, {
      hashCode: computed,
    });

    return metamodel;
  },
);

export const observe_JsonModelConnection = skipObserved(
  (metamodel: JsonModelConnection): JsonModelConnection => {
    observe_Abstract_Connection(metamodel);

    makeObservable(metamodel, {
      url: observable,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.class);

    return metamodel;
  },
);

export const observe_XmlModelConnection = skipObserved(
  (metamodel: XmlModelConnection): XmlModelConnection => {
    observe_Abstract_Connection(metamodel);

    makeObservable(metamodel, {
      url: observable,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.class);

    return metamodel;
  },
);

export const observe_ModelChainConnection = skipObserved(
  (metamodel: ModelChainConnection): ModelChainConnection => {
    observe_Abstract_Connection(metamodel);

    makeObservable(metamodel, { mappings: observable, hashCode: computed });

    metamodel.mappings.forEach(observe_PackageableElementReference);

    return metamodel;
  },
);

const observe_INTERNAL__UnknownConnection = skipObserved(
  (metamodel: INTERNAL__UnknownConnection): INTERNAL__UnknownConnection => {
    observe_Abstract_Connection(metamodel);

    makeObservable(metamodel, {
      content: observable.ref,
      hashCode: computed,
    });

    return metamodel;
  },
);

class ConnectionObserver implements ConnectionVisitor<void> {
  observerContext: ObserverContext;

  constructor(observerContext: ObserverContext) {
    this.observerContext = observerContext;
  }

  visit_Connection(connection: Connection): void {
    const extraObservers = this.observerContext.plugins.flatMap(
      (plugin) =>
        (
          plugin as DSL_Mapping_PureGraphManagerPlugin_Extension
        ).getExtraConnectionObservers?.() ?? [],
    );
    for (const observer of extraObservers) {
      const observedConnection = observer(connection, this.observerContext);
      if (observedConnection) {
        return;
      }
    }
  }

  visit_INTERNAL__UnknownConnection(
    connection: INTERNAL__UnknownConnection,
  ): void {
    observe_INTERNAL__UnknownConnection(connection);
  }

  visit_ConnectionPointer(connection: ConnectionPointer): void {
    observe_ConnectionPointer(connection);
  }

  visit_ModelChainConnection(connection: ModelChainConnection): void {
    observe_ModelChainConnection(connection);
  }

  visit_JsonModelConnection(connection: JsonModelConnection): void {
    observe_JsonModelConnection(connection);
  }

  visit_XmlModelConnection(connection: XmlModelConnection): void {
    observe_XmlModelConnection(connection);
  }

  visit_FlatDataConnection(connection: FlatDataConnection): void {
    observe_FlatDataConnection(connection);
  }

  visit_RelationalDatabaseConnection(
    connection: RelationalDatabaseConnection,
  ): void {
    observe_RelationalDatabaseConnection(connection, this.observerContext);
  }
}

export const observe_Connection = (
  metamodel: Connection,
  context: ObserverContext,
): Connection => {
  metamodel.accept_ConnectionVisitor(new ConnectionObserver(context));
  return metamodel;
};

export const observe_PackageableConnection = skipObservedWithContext(
  (metamodel: PackageableConnection, context): PackageableConnection => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<PackageableConnection, '_elementHashCode'>(metamodel, {
      connectionValue: observable,
      _elementHashCode: override,
    });

    observe_Connection(metamodel.connectionValue, context);

    return metamodel;
  },
);

// ------------------------------------- Runtime -------------------------------------

export const observe_IdentifiedConnection = skipObservedWithContext(
  (metamodel: IdentifiedConnection, context): IdentifiedConnection => {
    makeObservable(metamodel, {
      id: observable,
      connection: observable,
      hashCode: computed,
    });

    observe_Connection(metamodel.connection, context);

    return metamodel;
  },
);

export const observe_StoreConnections = skipObservedWithContext(
  (metamodel: StoreConnections, context): StoreConnections => {
    makeObservable(metamodel, {
      storeConnections: observable,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.store);
    metamodel.storeConnections.forEach((connection) =>
      observe_IdentifiedConnection(connection, context),
    );

    return metamodel;
  },
);

export const observe_EngineRuntime = skipObservedWithContext(
  (metamodel: EngineRuntime, context): EngineRuntime => {
    makeObservable(metamodel, {
      mappings: observable,
      connections: observable,
      hashCode: computed,
    });

    metamodel.mappings.forEach(observe_PackageableElementReference);
    metamodel.connections.forEach((storeConnections) =>
      observe_StoreConnections(storeConnections, context),
    );

    return metamodel;
  },
);

export const observe_RuntimePointer = skipObserved(
  (metamodel: RuntimePointer): RuntimePointer => {
    makeObservable(metamodel, {
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.packageableRuntime);

    return metamodel;
  },
);

export const observe_Runtime = (
  metamodel: Runtime,
  context: ObserverContext,
): Runtime => {
  if (metamodel instanceof RuntimePointer) {
    return observe_RuntimePointer(metamodel);
  } else if (metamodel instanceof EngineRuntime) {
    return observe_EngineRuntime(metamodel, context);
  }
  return metamodel;
};

export const observe_PackageableRuntime = skipObservedWithContext(
  (metamodel: PackageableRuntime, context): PackageableRuntime => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<PackageableRuntime, '_elementHashCode'>(metamodel, {
      runtimeValue: observable,
      _elementHashCode: override,
    });

    observe_EngineRuntime(metamodel.runtimeValue, context);

    return metamodel;
  },
);
