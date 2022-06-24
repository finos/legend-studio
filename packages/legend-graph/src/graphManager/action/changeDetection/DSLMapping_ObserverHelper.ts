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
} from '../../../models/metamodels/pure/packageableElements/connection/Connection.js';
import type { PackageableConnection } from '../../../models/metamodels/pure/packageableElements/connection/PackageableConnection.js';
import type { AggregationAwarePropertyMapping } from '../../../models/metamodels/pure/packageableElements/mapping/aggregationAware/AggregationAwarePropertyMapping.js';
import type { AggregationAwareSetImplementation } from '../../../models/metamodels/pure/packageableElements/mapping/aggregationAware/AggregationAwareSetImplementation.js';
import type { AssociationImplementation } from '../../../models/metamodels/pure/packageableElements/mapping/AssociationImplementation.js';
import type { EnumerationMapping } from '../../../models/metamodels/pure/packageableElements/mapping/EnumerationMapping.js';
import type {
  EnumValueMapping,
  SourceValue,
} from '../../../models/metamodels/pure/packageableElements/mapping/EnumValueMapping.js';
import { ExpectedOutputMappingTestAssert } from '../../../models/metamodels/pure/packageableElements/mapping/ExpectedOutputMappingTestAssert.js';
import type { InferableMappingElementIdValue } from '../../../models/metamodels/pure/packageableElements/mapping/InferableMappingElementId.js';
import type { InferableMappingElementRoot } from '../../../models/metamodels/pure/packageableElements/mapping/InferableMappingElementRoot.js';
import type { InputData } from '../../../models/metamodels/pure/packageableElements/mapping/InputData.js';
import type { InstanceSetImplementation } from '../../../models/metamodels/pure/packageableElements/mapping/InstanceSetImplementation.js';
import type { LocalMappingPropertyInfo } from '../../../models/metamodels/pure/packageableElements/mapping/LocalMappingPropertyInfo.js';
import type { Mapping } from '../../../models/metamodels/pure/packageableElements/mapping/Mapping.js';
import type { MappingClass } from '../../../models/metamodels/pure/packageableElements/mapping/MappingClass.js';
import type { MappingInclude } from '../../../models/metamodels/pure/packageableElements/mapping/MappingInclude.js';
import type { MappingTest } from '../../../models/metamodels/pure/packageableElements/mapping/MappingTest.js';
import type { MappingTestAssert } from '../../../models/metamodels/pure/packageableElements/mapping/MappingTestAssert.js';
import type { MergeOperationSetImplementation } from '../../../models/metamodels/pure/packageableElements/mapping/MergeOperationSetImplementation.js';
import type { OperationSetImplementation } from '../../../models/metamodels/pure/packageableElements/mapping/OperationSetImplementation.js';
import type {
  PropertyMapping,
  PropertyMappingVisitor,
} from '../../../models/metamodels/pure/packageableElements/mapping/PropertyMapping.js';
import type {
  SetImplementation,
  SetImplementationVisitor,
} from '../../../models/metamodels/pure/packageableElements/mapping/SetImplementation.js';
import type { SetImplementationContainer } from '../../../models/metamodels/pure/packageableElements/mapping/SetImplementationContainer.js';
import type { SetImplementationReference } from '../../../models/metamodels/pure/packageableElements/mapping/SetImplementationReference.js';
import type { SubstituteStore } from '../../../models/metamodels/pure/packageableElements/mapping/SubstituteStore.js';
import type { TEMPORARY__UnresolvedSetImplementation } from '../../../models/metamodels/pure/packageableElements/mapping/TEMPORARY__UnresolvedSetImplementation.js';
import type { XStorePropertyMapping } from '../../../models/metamodels/pure/packageableElements/mapping/xStore/XStorePropertyMapping.js';
import type { PackageableRuntime } from '../../../models/metamodels/pure/packageableElements/runtime/PackageableRuntime.js';
import {
  EngineRuntime,
  RuntimePointer,
  type IdentifiedConnection,
  type Runtime,
  type StoreConnections,
} from '../../../models/metamodels/pure/packageableElements/runtime/Runtime.js';
import type { FlatDataConnection } from '../../../models/metamodels/pure/packageableElements/store/flatData/connection/FlatDataConnection.js';
import type { EmbeddedFlatDataPropertyMapping } from '../../../models/metamodels/pure/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping.js';
import { FlatDataInputData } from '../../../models/metamodels/pure/packageableElements/store/flatData/mapping/FlatDataInputData.js';
import type { FlatDataInstanceSetImplementation } from '../../../models/metamodels/pure/packageableElements/store/flatData/mapping/FlatDataInstanceSetImplementation.js';
import type { FlatDataPropertyMapping } from '../../../models/metamodels/pure/packageableElements/store/flatData/mapping/FlatDataPropertyMapping.js';
import type { JsonModelConnection } from '../../../models/metamodels/pure/packageableElements/store/modelToModel/connection/JsonModelConnection.js';
import type { ModelChainConnection } from '../../../models/metamodels/pure/packageableElements/store/modelToModel/connection/ModelChainConnection.js';
import type { XmlModelConnection } from '../../../models/metamodels/pure/packageableElements/store/modelToModel/connection/XmlModelConnection.js';
import { ObjectInputData } from '../../../models/metamodels/pure/packageableElements/store/modelToModel/mapping/ObjectInputData.js';
import type { PureInstanceSetImplementation } from '../../../models/metamodels/pure/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation.js';
import type { PurePropertyMapping } from '../../../models/metamodels/pure/packageableElements/store/modelToModel/mapping/PurePropertyMapping.js';
import type { RelationalDatabaseConnection } from '../../../models/metamodels/pure/packageableElements/store/relational/connection/RelationalDatabaseConnection.js';
import type { EmbeddedRelationalInstanceSetImplementation } from '../../../models/metamodels/pure/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation.js';
import type { InlineEmbeddedRelationalInstanceSetImplementation } from '../../../models/metamodels/pure/packageableElements/store/relational/mapping/InlineEmbeddedRelationalInstanceSetImplementation.js';
import type { OtherwiseEmbeddedRelationalInstanceSetImplementation } from '../../../models/metamodels/pure/packageableElements/store/relational/mapping/OtherwiseEmbeddedRelationalInstanceSetImplementation.js';
import { RelationalInputData } from '../../../models/metamodels/pure/packageableElements/store/relational/mapping/RelationalInputData.js';
import type { RelationalInstanceSetImplementation } from '../../../models/metamodels/pure/packageableElements/store/relational/mapping/RelationalInstanceSetImplementation.js';
import type { RelationalPropertyMapping } from '../../../models/metamodels/pure/packageableElements/store/relational/mapping/RelationalPropertyMapping.js';
import type { RootRelationalInstanceSetImplementation } from '../../../models/metamodels/pure/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation.js';
import type { Store } from '../../../models/metamodels/pure/packageableElements/store/Store.js';
import type { DSLMapping_PureGraphManagerPlugin_Extension } from '../../DSLMapping_PureGraphManagerPlugin_Extension.js';
import {
  type ObserverContext,
  observe_Abstract_PackageableElement,
  observe_PackageableElementReference,
  skipObserved,
  skipObservedWithContext,
  observe_Multiplicity,
  observe_OptionalPackageableElementReference,
} from './CoreObserverHelper.js';
import {
  observe_EnumValueReference,
  observe_PropertyReference,
} from './DomainObserverHelper.js';
import { observe_RawLambda } from './RawValueSpecificationObserver.js';
import {
  observe_EmbeddedFlatDataPropertyMapping,
  observe_FlatDataConnection,
  observe_FlatDataInputData,
  observe_FlatDataInstanceSetImplementation,
  observe_FlatDataPropertyMapping,
} from './StoreFlatData_ObserverHelper.js';
import {
  observe_EmbeddedRelationalInstanceSetImplementation,
  observe_InlineEmbeddedRelationalInstanceSetImplementation,
  observe_OtherwiseEmbeddedRelationalInstanceSetImplementation,
  observe_RelationalDatabaseConnection,
  observe_RelationalInputData,
  observe_RelationalInstanceSetImplementation,
  observe_RelationalPropertyMapping,
  observe_RootRelationalInstanceSetImplementation,
} from './StoreRelational_ObserverHelper.js';

// ------------------------------------- Store -------------------------------------

export const observe_Abstract_Store = (metamodel: Store): void => {
  observe_Abstract_PackageableElement(metamodel);

  makeObservable(metamodel, {
    includes: observable,
  });

  metamodel.includes.forEach(observe_PackageableElementReference);
};

// ------------------------------------- Mapping -------------------------------------

export const observe_LocalMappingPropertyInfo = skipObserved(
  (metamodel: LocalMappingPropertyInfo): LocalMappingPropertyInfo => {
    makeObservable(metamodel, {
      localMappingProperty: observable,
      localMappingPropertyType: observable,
      localMappingPropertyMultiplicity: observable,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.localMappingPropertyType);
    observe_Multiplicity(metamodel.localMappingPropertyMultiplicity);

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
  // TODO: source
  // TODO: target
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

    // TODO transformer?: EnumerationMapping | undefined;
    observe_RawLambda(metamodel.transform);

    return metamodel;
  },
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
          plugin as DSLMapping_PureGraphManagerPlugin_Extension
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

export const observe_SetImplementationReference = skipObserved(
  (metamodel: SetImplementationReference): SetImplementationReference => {
    makeObservable(metamodel, {
      value: observable,
    });

    observe_PackageableElementReference(metamodel.ownerReference);

    return metamodel;
  },
);

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

    observe_OptionalPackageableElementReference(metamodel.srcClass);
    if (metamodel.filter) {
      observe_RawLambda(metamodel.filter);
    }

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
          plugin as DSLMapping_PureGraphManagerPlugin_Extension
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

  visit_TEMPORARY__UnresolvedSetImplementation(
    setImplementation: TEMPORARY__UnresolvedSetImplementation,
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
    makeObservable(metamodel, {
      included: observable,
      storeSubstitutions: observable,
    });

    observe_PackageableElementReference(metamodel.included);
    metamodel.storeSubstitutions.forEach(observe_SubstituteStore);

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
    observe_OptionalPackageableElementReference(metamodel.sourceType);
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
  (metamodel: ObjectInputData): ObjectInputData => {
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
  metamodel: InputData,
  context: ObserverContext,
): InputData => {
  if (metamodel instanceof ObjectInputData) {
    return observe_ObjectInputData(metamodel);
  } else if (metamodel instanceof FlatDataInputData) {
    return observe_FlatDataInputData(metamodel);
  } else if (metamodel instanceof RelationalInputData) {
    return observe_RelationalInputData(metamodel);
  }
  const extraObservers = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as DSLMapping_PureGraphManagerPlugin_Extension
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
    metamodel: ExpectedOutputMappingTestAssert,
  ): ExpectedOutputMappingTestAssert =>
    makeObservable(metamodel, {
      expectedOutput: observable,
      hashCode: computed,
    }),
);

export const observe_MappingTestAssert = (
  metamodel: MappingTestAssert,
  context: ObserverContext,
): MappingTestAssert => {
  if (metamodel instanceof ExpectedOutputMappingTestAssert) {
    return observe_ExpectedOutputMappingTestAssert(metamodel);
  }
  return metamodel;
};

export const observe_MappingTest = skipObservedWithContext(
  (metamodel: MappingTest, context): MappingTest => {
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
      tests: observable,
      _elementHashCode: override,
    });

    metamodel.includes.forEach(observe_MappingInclude);
    metamodel.classMappings.forEach((classMapping) =>
      observe_SetImplementation(classMapping, context),
    );
    metamodel.enumerationMappings.forEach(observe_EnumerationMapping);
    metamodel.associationMappings.forEach((associationMapping) =>
      observe_AssociationImplementation(associationMapping, context),
    );
    metamodel.tests.forEach((test) => observe_MappingTest(test, context));

    return metamodel;
  },
);

// ------------------------------------- Connection -------------------------------------

export const observe_Abstract_Connection = (metamodel: Connection): void => {
  makeObservable(metamodel, {
    store: observable,
  });

  observe_PackageableElementReference(metamodel.store);
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

class ConnectionObserver implements ConnectionVisitor<void> {
  observerContext: ObserverContext;

  constructor(observerContext: ObserverContext) {
    this.observerContext = observerContext;
  }

  visit_Connection(connection: Connection): void {
    const extraObservers = this.observerContext.plugins.flatMap(
      (plugin) =>
        (
          plugin as DSLMapping_PureGraphManagerPlugin_Extension
        ).getExtraConnectionObservers?.() ?? [],
    );
    for (const observer of extraObservers) {
      const observedConnection = observer(connection, this.observerContext);
      if (observedConnection) {
        return;
      }
    }
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
