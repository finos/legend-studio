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

import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  type EmbeddedData,
  DataElementReference,
  ExternalFormatData,
  ModelStoreData,
} from '../../../../../../metamodels/pure/data/EmbeddedData';
import type { DataElement } from '../../../../../../metamodels/pure/packageableElements/data/DataElement';
import type { DSLData_PureProtocolProcessorPlugin_Extension } from '../../../../DSLData_PureProtocolProcessorPlugin_Extension';
import {
  type V1_EmbeddedData,
  V1_DataElementReference,
  V1_ExternalFormatData,
  V1_ModelStoreData,
} from '../../../model/data/V1_EmbeddedData';
import { V1_DataElement } from '../../../model/packageableElements/data/V1_DataElement';
import { V1_initPackageableElement } from './V1_CoreTransformerHelper';
import {
  V1_transformStereotype,
  V1_transformTaggedValue,
} from './V1_DomainTransformer';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext';

// ----------------------------------------------- DATA ----------------------------------------

export const V1_transformModelStoreData = (
  element: ModelStoreData,
): V1_ModelStoreData => {
  const modelStoreDataElement = new V1_ModelStoreData();
  const v1Instances = new Map<string, object>();
  Array.from(element.instances.entries()).forEach((e) =>
    v1Instances.set(e[0].path, e[1]),
  );
  modelStoreDataElement.instances = v1Instances;
  return modelStoreDataElement;
};

export const V1_transformExternalFormatData = (
  element: ExternalFormatData,
): V1_ExternalFormatData => {
  const externalFormatDataElement = new V1_ExternalFormatData();
  externalFormatDataElement.contentType = element.contentType;
  externalFormatDataElement.data = element.data;
  return externalFormatDataElement;
};

export const V1_transformDataElementReference = (
  element: DataElementReference,
): V1_DataElementReference => {
  const dataElementReference = new V1_DataElementReference();
  dataElementReference.dataElement =
    element.dataElement.valueForSerialization ?? '';
  return dataElementReference;
};

export const V1_transformEmbeddedData = (
  metamodel: EmbeddedData,
  context: V1_GraphTransformerContext,
): V1_EmbeddedData => {
  if (metamodel instanceof ModelStoreData) {
    return V1_transformModelStoreData(metamodel);
  } else if (metamodel instanceof ExternalFormatData) {
    return V1_transformExternalFormatData(metamodel);
  } else if (metamodel instanceof DataElementReference) {
    return V1_transformDataElementReference(metamodel);
  }
  const extraEmbeddedDataTransformers = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as DSLData_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraEmbeddedDataTransformers?.() ?? [],
  );
  for (const transformer of extraEmbeddedDataTransformers) {
    const protocol = transformer(metamodel, context);
    if (protocol) {
      return protocol;
    }
  }

  throw new UnsupportedOperationError(
    `Can't transform embedded data: no compatible transformer available from plugins`,
    metamodel,
  );
};

export const V1_transformDataElement = (
  element: DataElement,
  context: V1_GraphTransformerContext,
): V1_DataElement => {
  const dataElement = new V1_DataElement();
  V1_initPackageableElement(dataElement, element);
  dataElement.stereotypes = element.stereotypes.map(V1_transformStereotype);
  dataElement.taggedValues = element.taggedValues.map(V1_transformTaggedValue);
  dataElement.data = V1_transformEmbeddedData(element.data, context);
  return dataElement;
};
