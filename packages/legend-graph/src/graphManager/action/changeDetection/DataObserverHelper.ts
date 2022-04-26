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
import {
  type EmbeddedData,
  ExternalFormatData,
  DataElementReference,
  ModelStoreData,
} from '../../../models/metamodels/pure/data/EmbeddedData';
import type { DataElement } from '../../../models/metamodels/pure/packageableElements/data/DataElement';
import type { EmbeddedData_PureGraphManagerPlugin_Extension } from '../../EmbeddedData_PureGraphManagerPlugin_Extension';
import {
  type ObserverContext,
  observe_Abstract_PackageableElement,
  skipObserved,
  skipObservedWithContext,
} from './CoreObserverHelper';
import {
  observe_StereotypeReference,
  observe_TaggedValue,
} from './DomainObserverHelper';

export const observe_ExternalFormatData = skipObserved(
  (metamodel: ExternalFormatData): ExternalFormatData => {
    makeObservable(metamodel, {
      contentType: observable,
      data: observable,
      hashCode: computed,
    });

    return metamodel;
  },
);

export const observe_DataElementReference = skipObserved(
  (metamodel: DataElementReference): DataElementReference => {
    makeObservable(metamodel, {
      dataElement: observable,
      hashCode: computed,
    });

    return metamodel;
  },
);

export const observe_ModelStoreData = skipObserved(
  (metamodel: ModelStoreData): ModelStoreData => {
    makeObservable(metamodel, {
      instances: observable,
      hashCode: computed,
    });

    return metamodel;
  },
);

export function observe_EmbeddedData(
  metamodel: EmbeddedData,
  context: ObserverContext,
): EmbeddedData {
  if (metamodel instanceof DataElementReference) {
    return observe_DataElementReference(metamodel);
  } else if (metamodel instanceof ExternalFormatData) {
    return observe_ExternalFormatData(metamodel);
  } else if (metamodel instanceof ModelStoreData) {
    return observe_ModelStoreData(metamodel);
  }
  const extraEmbeddedDataObservers = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as EmbeddedData_PureGraphManagerPlugin_Extension
      ).getExtraEmbeddedDataObservers?.() ?? [],
  );
  for (const observer of extraEmbeddedDataObservers) {
    const observedEmbeddedData = observer(metamodel, context);
    if (observedEmbeddedData) {
      return observedEmbeddedData;
    }
  }
  return metamodel;
}

export const observe_DataElement = skipObservedWithContext(
  (metamodel: DataElement, context: ObserverContext): DataElement => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<DataElement, '_elementHashCode'>(metamodel, {
      stereotypes: observable,
      taggedValues: observable,
      data: observable,
      _elementHashCode: override,
    });
    metamodel.stereotypes.forEach(observe_StereotypeReference);
    metamodel.taggedValues.forEach(observe_TaggedValue);
    observe_EmbeddedData(metamodel.data, context);
    return metamodel;
  },
);
