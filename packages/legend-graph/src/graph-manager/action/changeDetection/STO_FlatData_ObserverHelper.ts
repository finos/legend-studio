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
import type { FlatDataConnection } from '../../../graph/metamodel/pure/packageableElements/store/flatData/connection/FlatDataConnection.js';
import type { FlatDataInstanceSetImplementation } from '../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/FlatDataInstanceSetImplementation.js';
import type { FlatData } from '../../../graph/metamodel/pure/packageableElements/store/flatData/model/FlatData.js';
import {
  type FlatDataRecordField,
  type FlatDataDataType,
  FlatDataBoolean,
  FlatDataRecordType,
  FlatDataDate,
  FlatDataNumber,
  FlatDataString,
} from '../../../graph/metamodel/pure/packageableElements/store/flatData/model/FlatDataDataType.js';
import type { FlatDataProperty } from '../../../graph/metamodel/pure/packageableElements/store/flatData/model/FlatDataProperty.js';
import type { FlatDataSection } from '../../../graph/metamodel/pure/packageableElements/store/flatData/model/FlatDataSection.js';
import type { RootFlatDataRecordTypeReference } from '../../../graph/metamodel/pure/packageableElements/store/flatData/model/RootFlatDataRecordTypeReference.js';
import {
  observe_Abstract_PackageableElement,
  observe_PackageableElementReference,
  skipObserved,
  skipObservedWithContext,
} from './CoreObserverHelper.js';
import {
  observe_Abstract_InstanceSetImplementation,
  observe_Abstract_PropertyMapping,
} from './DSL_Mapping_ObserverHelper.js';
import { observe_RawLambda } from './RawValueSpecificationObserver.js';
import type { FlatDataAssociationPropertyMapping } from '../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/FlatDataAssociationPropertyMapping.js';
import type { EmbeddedFlatDataPropertyMapping } from '../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping.js';
import type { FlatDataPropertyMapping } from '../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/FlatDataPropertyMapping.js';
import type { FlatDataSectionReference } from '../../../graph/metamodel/pure/packageableElements/store/flatData/model/FlatDataSectionReference.js';
import type { DEPRECATED__FlatDataInputData } from '../../../graph/metamodel/pure/packageableElements/mapping/DEPRECATED__MappingTest.js';

// ------------------------------------- Store -------------------------------------

export const observe_FlatDataDataType = (
  metamodel: FlatDataDataType,
): FlatDataDataType => {
  if (metamodel instanceof FlatDataBoolean) {
    return makeObservable(metamodel, {
      trueString: observable,
      falseString: observable,
      hashCode: computed,
    });
  } else if (
    metamodel instanceof FlatDataString ||
    metamodel instanceof FlatDataNumber
  ) {
    return makeObservable(metamodel, {
      hashCode: computed,
    });
  } else if (metamodel instanceof FlatDataDate) {
    return makeObservable(metamodel, {
      dateFormat: observable,
      timeZone: observable,
      hashCode: computed,
    });
  } else if (metamodel instanceof FlatDataRecordType) {
    return skipObserved(_observe_FlatDataRecordType)(metamodel);
  }
  return metamodel;
};

export const observe_FlatDataAssociationPropertyMapping =
  skipObservedWithContext(
    (
      metamodel: FlatDataAssociationPropertyMapping,
      context,
    ): FlatDataAssociationPropertyMapping => {
      observe_Abstract_PropertyMapping(metamodel, context);

      makeObservable(metamodel, {
        flatData: observable,
        sectionName: observable,
        hashCode: computed,
      });

      return metamodel;
    },
  );

export const observe_FlatDataRecordField = skipObserved(
  (metamodel: FlatDataRecordField): FlatDataRecordField => {
    makeObservable(metamodel, {
      label: observable,
      flatDataDataType: observable,
      optional: observable,
      address: observable,
      hashCode: computed,
    });

    observe_FlatDataDataType(metamodel.flatDataDataType);

    return metamodel;
  },
);

function _observe_FlatDataRecordType(
  metamodel: FlatDataRecordType,
): FlatDataRecordType {
  makeObservable(metamodel, {
    fields: observable,
    hashCode: computed,
  });

  metamodel.fields.forEach(observe_FlatDataRecordField);

  return metamodel;
}

export const observe_FlatDataRecordType = skipObserved(
  _observe_FlatDataRecordType,
);

export const observe_RootFlatDataRecordType = skipObserved(
  _observe_FlatDataRecordType,
);

export const observe_FlatDataProperty = skipObserved(
  (metamodel: FlatDataProperty): FlatDataProperty => {
    makeObservable(metamodel, {
      name: observable,
      value: observable,
      hashCode: computed,
    });

    return metamodel;
  },
);

export const observe_FlatDataSection = skipObserved(
  (metamodel: FlatDataSection): FlatDataSection => {
    makeObservable(metamodel, {
      driverId: observable,
      name: observable,
      sectionProperties: observable,
      recordType: observable,
      hashCode: computed,
    });

    metamodel.sectionProperties.forEach(observe_FlatDataProperty);
    if (metamodel.recordType) {
      observe_RootFlatDataRecordType(metamodel.recordType);
    }

    return metamodel;
  },
);

export const observe_FlatDataSectionReference = skipObserved(
  (metamodel: FlatDataSectionReference): FlatDataSectionReference => {
    makeObservable(metamodel, {
      value: observable,
      pointerHashCode: computed,
    });

    observe_PackageableElementReference(metamodel.ownerReference);

    return metamodel;
  },
);

export const observe_FlatData = skipObserved(
  (metamodel: FlatData): FlatData => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<FlatData, '_elementHashCode'>(metamodel, {
      sections: observable,
      _elementHashCode: override,
    });

    metamodel.sections.forEach(observe_FlatDataSection);

    return metamodel;
  },
);

// ------------------------------------- Mapping -------------------------------------

export const observe_RootFlatDataRecordTypeReference = skipObserved(
  (
    metamodel: RootFlatDataRecordTypeReference,
  ): RootFlatDataRecordTypeReference => {
    makeObservable(metamodel, {
      value: observable,
    });

    observe_PackageableElementReference(metamodel.ownerReference);

    return metamodel;
  },
);

export const observe_FlatDataInstanceSetImplementation =
  skipObservedWithContext(
    (
      metamodel: FlatDataInstanceSetImplementation,
      context,
    ): FlatDataInstanceSetImplementation => {
      observe_Abstract_InstanceSetImplementation(metamodel, context);

      makeObservable(metamodel, {
        filter: observable,
        hashCode: computed,
      });

      observe_RootFlatDataRecordTypeReference(metamodel.sourceRootRecordType);
      if (metamodel.filter) {
        observe_RawLambda(metamodel.filter);
      }

      return metamodel;
    },
  );

export const observe_EmbeddedFlatDataPropertyMapping = skipObservedWithContext(
  (
    metamodel: EmbeddedFlatDataPropertyMapping,
    context,
  ): EmbeddedFlatDataPropertyMapping => {
    observe_Abstract_PropertyMapping(metamodel, context);
    observe_Abstract_InstanceSetImplementation(metamodel, context);

    makeObservable(metamodel, {
      rootInstanceSetImplementation: observable,
      hashCode: computed,
    });

    return metamodel;
  },
);

export const observe_FlatDataPropertyMapping = skipObservedWithContext(
  (metamodel: FlatDataPropertyMapping, context): FlatDataPropertyMapping => {
    observe_Abstract_PropertyMapping(metamodel, context);

    makeObservable(metamodel, {
      transformer: observable,
      transform: observable,
      hashCode: computed,
    });

    // TODO transformer?: EnumerationMapping | undefined;
    observe_RawLambda(metamodel.transform);

    return metamodel;
  },
);

export const observe_FlatDataInputData = skipObserved(
  (metamodel: DEPRECATED__FlatDataInputData): DEPRECATED__FlatDataInputData => {
    makeObservable(metamodel, {
      data: observable,
      hashCode: computed,
    });

    observe_PackageableElementReference(metamodel.sourceFlatData);

    return metamodel;
  },
);

// ------------------------------------- Connection -------------------------------------

export const observe_FlatDataConnection = skipObserved(
  (metamodel: FlatDataConnection): FlatDataConnection => {
    makeObservable(metamodel, {
      url: observable,
      hashCode: computed,
    });

    return metamodel;
  },
);
