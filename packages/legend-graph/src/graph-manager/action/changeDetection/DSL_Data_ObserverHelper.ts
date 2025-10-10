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
  type ModelData,
  type RelationElement,
  type RelationRowTestData,
  ModelEmbeddedData,
  ModelInstanceData,
  ExternalFormatData,
  DataElementReference,
  ModelStoreData,
  RelationElementsData,
} from '../../../graph/metamodel/pure/data/EmbeddedData.js';
import {
  type RelationalCSVDataTable,
  RelationalCSVData,
} from '../../../graph/metamodel/pure/data/RelationalCSVData.js';
import type { DataElement } from '../../../graph/metamodel/pure/packageableElements/data/DataElement.js';
import type { EmbeddedData_PureGraphManagerPlugin_Extension } from '../../extensions/DSL_Data_PureGraphManagerPlugin_Extension.js';
import {
  type ObserverContext,
  observe_Abstract_PackageableElement,
  skipObserved,
  skipObservedWithContext,
} from './CoreObserverHelper.js';
import {
  observe_StereotypeReference,
  observe_TaggedValue,
} from './DomainObserverHelper.js';
import { INTERNAL__UnknownEmbeddedData } from '../../../graph/metamodel/pure/data/INTERNAL__UnknownEmbeddedData.js';

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

const observe_ModelEmbeddedData = skipObservedWithContext(
  (
    metamodel: ModelEmbeddedData,
    context: ObserverContext,
  ): ModelEmbeddedData => {
    makeObservable(metamodel, {
      model: observable,
      data: observable,
      hashCode: computed,
    });
    observe_EmbeddedData(metamodel.data, context);
    return metamodel;
  },
);

export const observe_ModelInstanceData = skipObservedWithContext(
  (
    metamodel: ModelInstanceData,
    context: ObserverContext,
  ): ModelInstanceData => {
    makeObservable(metamodel, {
      model: observable,
      instances: observable,
      hashCode: computed,
    });
    return metamodel;
  },
);

export const observe_ModelData = skipObservedWithContext(
  (metamodel: ModelData, context: ObserverContext): ModelData => {
    if (metamodel instanceof ModelEmbeddedData) {
      observe_ModelEmbeddedData(metamodel, context);
    } else if (metamodel instanceof ModelInstanceData) {
      observe_ModelInstanceData(metamodel, context);
    }
    return metamodel;
  },
);

export const observe_ModelStoreData = skipObservedWithContext(
  (metamodel: ModelStoreData, context: ObserverContext): ModelStoreData => {
    makeObservable(metamodel, {
      modelData: observable,
      hashCode: computed,
    });
    metamodel.modelData?.forEach((e) => {
      observe_ModelData(e, context);
    });
    return metamodel;
  },
);

export const observe_RelationalDataTable = skipObserved(
  (metamodel: RelationalCSVDataTable): RelationalCSVDataTable => {
    makeObservable(metamodel, {
      values: observable,
      table: observable,
      schema: observable,
      hashCode: computed,
    });
    return metamodel;
  },
);

const observe_RelationalCSVData = skipObserved(
  (metamodel: RelationalCSVData): RelationalCSVData => {
    makeObservable(metamodel, {
      tables: observable,
      hashCode: computed,
    });
    metamodel.tables.forEach(observe_RelationalDataTable);
    return metamodel;
  },
);

export const observe_RelationRowTestData = skipObserved(
  (metamodel: RelationRowTestData): RelationRowTestData => {
    makeObservable(metamodel, {
      values: observable,
    });
    return metamodel;
  },
);

export const observe_RelationElement = skipObserved(
  (metamodel: RelationElement): RelationElement => {
    makeObservable(metamodel, {
      paths: observable,
      columns: observable,
      rows: observable,
      hashCode: computed,
    });
    metamodel.rows.forEach(observe_RelationRowTestData);
    return metamodel;
  },
);

export const observe_RelationElementsData = skipObserved(
  (metamodel: RelationElementsData): RelationElementsData => {
    makeObservable(metamodel, {
      hashCode: computed,
    });
    metamodel.relationElements.forEach(observe_RelationElement);
    return metamodel;
  },
);

export const observe_INTERNAL__UnknownEmbeddedData = skipObserved(
  (metamodel: INTERNAL__UnknownEmbeddedData): INTERNAL__UnknownEmbeddedData => {
    makeObservable(metamodel, {
      content: observable.ref,
    });

    return metamodel;
  },
);

export function observe_EmbeddedData(
  metamodel: EmbeddedData,
  context: ObserverContext,
): EmbeddedData {
  if (metamodel instanceof INTERNAL__UnknownEmbeddedData) {
    return observe_INTERNAL__UnknownEmbeddedData(metamodel);
  } else if (metamodel instanceof DataElementReference) {
    return observe_DataElementReference(metamodel);
  } else if (metamodel instanceof ExternalFormatData) {
    return observe_ExternalFormatData(metamodel);
  } else if (metamodel instanceof ModelStoreData) {
    return observe_ModelStoreData(metamodel, context);
  } else if (metamodel instanceof RelationalCSVData) {
    return observe_RelationalCSVData(metamodel);
  } else if (metamodel instanceof RelationElementsData) {
    return observe_RelationElementsData(metamodel);
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
