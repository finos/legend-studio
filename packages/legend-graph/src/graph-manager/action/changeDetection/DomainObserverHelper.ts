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

import { promisify } from '@finos/legend-shared';
import {
  computed,
  isObservable,
  makeObservable,
  observable,
  override,
} from 'mobx';
import type { Association } from '../../../graph/metamodel/pure/packageableElements/domain/Association.js';
import { Class } from '../../../graph/metamodel/pure/packageableElements/domain/Class.js';
import type { ConcreteFunctionDefinition } from '../../../graph/metamodel/pure/packageableElements/function/ConcreteFunctionDefinition.js';
import type { Constraint } from '../../../graph/metamodel/pure/packageableElements/domain/Constraint.js';
import type { DataType } from '../../../graph/metamodel/pure/packageableElements/domain/DataType.js';
import type { DerivedProperty } from '../../../graph/metamodel/pure/packageableElements/domain/DerivedProperty.js';
import type { Enum } from '../../../graph/metamodel/pure/packageableElements/domain/Enum.js';
import { Enumeration } from '../../../graph/metamodel/pure/packageableElements/domain/Enumeration.js';
import type { EnumValueReference } from '../../../graph/metamodel/pure/packageableElements/domain/EnumValueReference.js';
import type { GenericType } from '../../../graph/metamodel/pure/packageableElements/domain/GenericType.js';
import type { GenericTypeReference } from '../../../graph/metamodel/pure/packageableElements/domain/GenericTypeReference.js';
import {
  Measure,
  Unit,
} from '../../../graph/metamodel/pure/packageableElements/domain/Measure.js';
import { Package } from '../../../graph/metamodel/pure/packageableElements/domain/Package.js';
import type { Profile } from '../../../graph/metamodel/pure/packageableElements/domain/Profile.js';
import type { Property } from '../../../graph/metamodel/pure/packageableElements/domain/Property.js';
import type { PropertyReference } from '../../../graph/metamodel/pure/packageableElements/domain/PropertyReference.js';
import type { Stereotype } from '../../../graph/metamodel/pure/packageableElements/domain/Stereotype.js';
import type { StereotypeReference } from '../../../graph/metamodel/pure/packageableElements/domain/StereotypeReference.js';
import type { Tag } from '../../../graph/metamodel/pure/packageableElements/domain/Tag.js';
import type { TaggedValue } from '../../../graph/metamodel/pure/packageableElements/domain/TaggedValue.js';
import type { TagReference } from '../../../graph/metamodel/pure/packageableElements/domain/TagReference.js';
import type { Type } from '../../../graph/metamodel/pure/packageableElements/domain/Type.js';
import {
  DefaultCodeSection,
  ImportAwareCodeSection,
  type Section,
} from '../../../graph/metamodel/pure/packageableElements/section/Section.js';
import type { SectionIndex } from '../../../graph/metamodel/pure/packageableElements/section/SectionIndex.js';
import {
  observe_Abstract_PackageableElement,
  observe_PackageableElementReference,
  skipObserved,
  skipObservedWithContext,
  type ObserverContext,
} from './CoreObserverHelper.js';
import { observe_PackageableElement } from './PackageableElementObserver.js';
import {
  observe_RawLambda,
  observe_RawVariableExpression,
} from './RawValueSpecificationObserver.js';
import type { INTERNAL__UnknownFunctionActivator } from '../../../graph/metamodel/pure/packageableElements/function/INTERNAL__UnknownFunctionActivator.js';

const _observe_Abstract_Package = (metamodel: Package): void => {
  observe_Abstract_PackageableElement(metamodel);

  makeObservable(metamodel, {
    children: observable,
    hashCode: override,
  });
};

/**
 * NOTE: here we try to be consistent by recrusively going down the package tree
 * and observe all descendents.
 */
export const observe_Package = skipObservedWithContext(
  (metamodel: Package, context): Package => {
    _observe_Abstract_Package(metamodel);

    metamodel.children.forEach((child) => {
      if (child instanceof Package) {
        observe_Package(child, context);
      } else {
        observe_PackageableElement(child, context);
      }
    });

    return metamodel;
  },
);

export const observe_PackageTree = async (
  metamodel: Package,
  context: ObserverContext,
): Promise<Package> => {
  if (isObservable(metamodel)) {
    return metamodel;
  }

  _observe_Abstract_Package(metamodel);

  await Promise.all(
    metamodel.children.map(async (child) => {
      if (child instanceof Package) {
        await observe_PackageTree(child, context);
      } else {
        await promisify(() => observe_PackageableElement(child, context));
      }
    }),
  );

  return metamodel;
};

export const observe_StereotypeReference = skipObserved(
  (metamodel: StereotypeReference): StereotypeReference => {
    makeObservable(metamodel, {
      value: observable,
      pointerHashCode: computed,
    });

    observe_PackageableElementReference(metamodel.ownerReference);

    return metamodel;
  },
);

export const observe_TagReference = skipObserved(
  (metamodel: TagReference): TagReference => {
    makeObservable(metamodel, {
      value: observable,
      pointerHashCode: computed,
    });

    return metamodel;
  },
);

export const observe_TaggedValue = skipObserved(
  (metamodel: TaggedValue): TaggedValue => {
    makeObservable(metamodel, {
      value: observable,
      hashCode: computed,
    });

    observe_TagReference(metamodel.tag);

    return metamodel;
  },
);

export const observe_GenericType = skipObserved(
  (metamodel: GenericType): GenericType =>
    makeObservable(metamodel, {
      rawType: observable,
    }),
);

export const observe_GenericTypeReference = skipObserved(
  (metamodel: GenericTypeReference): GenericTypeReference => {
    makeObservable(metamodel, {
      value: observable,
    });

    observe_GenericType(metamodel.value);
    observe_PackageableElementReference(metamodel.ownerReference);

    return metamodel;
  },
);

// ------------------------------------- Section Index -------------------------------------

export const observe_Section = skipObserved((metamodel: Section): Section => {
  makeObservable(metamodel, {
    parserName: observable,
    elements: observable,
  });

  if (metamodel instanceof ImportAwareCodeSection) {
    makeObservable(metamodel, {
      imports: observable,
      hashCode: computed,
    });
  } else if (metamodel instanceof DefaultCodeSection) {
    makeObservable(metamodel, {
      hashCode: computed,
    });
  }
  return metamodel;
});

export const observe_SectionIndex = skipObserved(
  (metamodel: SectionIndex): SectionIndex => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<SectionIndex, '_elementHashCode'>(metamodel, {
      sections: observable,
      _elementHashCode: override,
    });

    metamodel.sections.forEach(observe_Section);

    return metamodel;
  },
);

// ------------------------------------- Profile -------------------------------------

export const observe_Stereotype = skipObserved(
  (metamodel: Stereotype): Stereotype =>
    makeObservable(metamodel, {
      value: observable,
    }),
);

export const observe_Tag = skipObserved(
  (metamodel: Tag): Tag =>
    makeObservable(metamodel, {
      value: observable,
    }),
);

export const observe_Profile = skipObserved((metamodel: Profile): Profile => {
  observe_Abstract_PackageableElement(metamodel);

  makeObservable<Profile, '_elementHashCode'>(metamodel, {
    p_stereotypes: observable,
    p_tags: observable,
    _elementHashCode: override,
  });

  metamodel.p_stereotypes.forEach(observe_Stereotype);
  metamodel.p_tags.forEach(observe_Tag);

  return metamodel;
});

// ------------------------------------- Enumeration -------------------------------------

export const observe_Enum = skipObserved((metamodel: Enum): Enum => {
  makeObservable(metamodel, {
    name: observable,
    stereotypes: observable,
    taggedValues: observable,
    hashCode: computed,
  });

  metamodel.stereotypes.forEach(observe_StereotypeReference);
  metamodel.taggedValues.forEach(observe_TaggedValue);

  return metamodel;
});

export const observe_EnumValueReference = skipObserved(
  (metamodel: EnumValueReference): EnumValueReference => {
    makeObservable(metamodel, {
      value: observable,
    });

    observe_PackageableElementReference(metamodel.ownerReference);

    return metamodel;
  },
);

export const observe_Enumeration = skipObserved(
  (metamodel: Enumeration): Enumeration => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<Enumeration, '_elementHashCode'>(metamodel, {
      values: observable,
      stereotypes: observable,
      taggedValues: observable,
      _elementHashCode: override,
    });

    metamodel.values.forEach(observe_Enum);
    metamodel.stereotypes.forEach(observe_StereotypeReference);
    metamodel.taggedValues.forEach(observe_TaggedValue);

    return metamodel;
  },
);

// ------------------------------------- Measure -------------------------------------

export const observe_Unit = skipObserved((metamodel: Unit): Unit => {
  makeObservable(metamodel, {
    measure: observable,
    conversionFunction: observable,
    hashCode: computed,
  });

  if (metamodel.conversionFunction) {
    observe_RawLambda(metamodel.conversionFunction);
  }

  return metamodel;
});

export const observe_Measure = skipObserved((metamodel: Measure): Measure => {
  observe_Abstract_PackageableElement(metamodel);

  makeObservable<Measure, '_elementHashCode'>(metamodel, {
    canonicalUnit: observable,
    nonCanonicalUnits: observable,
    _elementHashCode: override,
  });

  if (metamodel.canonicalUnit) {
    observe_Unit(metamodel.canonicalUnit);
  }
  metamodel.nonCanonicalUnits.forEach(observe_Unit);

  return metamodel;
});

// ------------------------------------- Class -------------------------------------

export const observe_Property = skipObserved(
  (metamodel: Property): Property => {
    makeObservable(metamodel, {
      name: observable,
      multiplicity: observable,
      stereotypes: observable,
      taggedValues: observable,
      hashCode: computed,
    });

    observe_GenericTypeReference(metamodel.genericType);
    metamodel.stereotypes.forEach(observe_StereotypeReference);
    metamodel.taggedValues.forEach(observe_TaggedValue);

    return metamodel;
  },
);

export const observe_DerivedProperty = skipObserved(
  (metamodel: DerivedProperty): DerivedProperty => {
    makeObservable(metamodel, {
      name: observable,
      multiplicity: observable,
      stereotypes: observable,
      taggedValues: observable,
      body: observable.ref, // only observe the reference, the object itself is not observed
      parameters: observable.ref, // only observe the reference, the object itself is not observed
      hashCode: computed,
    });

    observe_GenericTypeReference(metamodel.genericType);
    metamodel.stereotypes.forEach(observe_StereotypeReference);
    metamodel.taggedValues.forEach(observe_TaggedValue);

    return metamodel;
  },
);

export const observe_PropertyReference = skipObserved(
  (metamodel: PropertyReference): PropertyReference => {
    makeObservable(metamodel, {
      value: observable,
      pointerHashCode: computed,
    });

    observe_PackageableElementReference(metamodel.ownerReference);

    return metamodel;
  },
);

export const observe_Constraint = skipObserved(
  (metamodel: Constraint): Constraint => {
    makeObservable(metamodel, {
      name: observable,
      functionDefinition: observable,
      externalId: observable,
      enforcementLevel: observable,
      messageFunction: observable,
      hashCode: computed,
    });

    observe_RawLambda(metamodel.functionDefinition);

    if (metamodel.messageFunction) {
      observe_RawLambda(metamodel.messageFunction);
    }

    return metamodel;
  },
);

export const observe_Class = skipObserved((metamodel: Class): Class => {
  observe_Abstract_PackageableElement(metamodel);

  makeObservable<Class, '_elementHashCode'>(metamodel, {
    _subclasses: observable,
    properties: observable,
    propertiesFromAssociations: observable,
    derivedProperties: observable,
    generalizations: observable,
    constraints: observable,
    stereotypes: observable,
    taggedValues: observable,
    dispose: override,
    _elementHashCode: override,
  });

  metamodel.properties.forEach(observe_Property);
  metamodel.propertiesFromAssociations.forEach(observe_Property);
  metamodel.derivedProperties.forEach(observe_DerivedProperty);
  metamodel.generalizations.forEach(observe_GenericTypeReference);
  metamodel.constraints.forEach(observe_Constraint);
  metamodel.stereotypes.forEach(observe_StereotypeReference);
  metamodel.taggedValues.forEach(observe_TaggedValue);

  return metamodel;
});

// ------------------------------------- Association -------------------------------------

export const observe_Association = skipObserved(
  (metamodel: Association): Association => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<Association, '_elementHashCode'>(metamodel, {
      properties: observable,
      stereotypes: observable,
      taggedValues: observable,
      derivedProperties: observable,
      dispose: override,
      _elementHashCode: override,
    });

    metamodel.properties.forEach(observe_Property);
    metamodel.derivedProperties.forEach(observe_DerivedProperty);
    metamodel.stereotypes.forEach(observe_StereotypeReference);
    metamodel.taggedValues.forEach(observe_TaggedValue);

    return metamodel;
  },
);

// ------------------------------------- Function -------------------------------------

export const observe_ConcreteFunctionDefinition = skipObserved(
  (metamodel: ConcreteFunctionDefinition): ConcreteFunctionDefinition => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<ConcreteFunctionDefinition, '_elementHashCode'>(metamodel, {
      functionName: observable,
      returnMultiplicity: observable,
      parameters: observable.shallow, // only observe the list structure, each object itself is not observed
      expressionSequence: observable.ref, // only observe the reference, the object itself is not observed
      stereotypes: observable,
      taggedValues: observable,
      _elementHashCode: override,
    });

    metamodel.parameters.forEach(observe_RawVariableExpression);
    observe_PackageableElementReference(metamodel.returnType);
    metamodel.stereotypes.forEach(observe_StereotypeReference);
    metamodel.taggedValues.forEach(observe_TaggedValue);

    return metamodel;
  },
);

export const observe_INTERNAL__UnknownFunctionActivator = skipObserved(
  (
    metamodel: INTERNAL__UnknownFunctionActivator,
  ): INTERNAL__UnknownFunctionActivator => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable(metamodel, {
      content: observable.ref,
    });

    return metamodel;
  },
);

// ------------------------------------- Type -------------------------------------

export const observe_Type = skipObserved((metamodel: Type): Type => {
  if (metamodel instanceof Enumeration) {
    return observe_Enumeration(metamodel);
  } else if (metamodel instanceof Unit) {
    return observe_Unit(metamodel);
  } else if (metamodel instanceof Class) {
    return observe_Class(metamodel);
  } else if (metamodel instanceof Measure) {
    return observe_Measure(metamodel);
  }
  return metamodel;
});

export const observe_DataType = skipObserved(
  (metamodel: DataType): DataType => {
    if (metamodel instanceof Enumeration) {
      return observe_Enumeration(metamodel);
    } else if (metamodel instanceof Unit) {
      return observe_Unit(metamodel);
    }
    return metamodel;
  },
);
