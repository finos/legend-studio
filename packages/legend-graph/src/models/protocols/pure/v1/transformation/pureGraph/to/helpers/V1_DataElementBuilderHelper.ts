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
} from '../../../../../../../metamodels/pure/data/EmbeddedData';
import type { EmbeddedData_PureProtocolProcessorPlugin_Extension } from '../../../../../EmbeddedData_PureProtocolProcessorPlugin_Extension';
import type {
  V1_DataElementReference,
  V1_EmbeddedData,
  V1_EmbeddedDataVisitor,
  V1_ExternalFormatData,
  V1_ModelStoreData,
} from '../../../../model/data/V1_EmbeddedData';

import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext';

export class V1_ProtocolToMetaModelEmbeddedDataBuilder
  implements V1_EmbeddedDataVisitor<EmbeddedData>
{
  context: V1_GraphBuilderContext;

  constructor(context: V1_GraphBuilderContext) {
    this.context = context;
  }

  visit_EmbeddedData(embeddedData: V1_EmbeddedData): EmbeddedData {
    const extraEmbeddedDataBuilders = this.context.extensions.plugins.flatMap(
      (plugin) =>
        (
          plugin as EmbeddedData_PureProtocolProcessorPlugin_Extension
        ).V1_getExtraEmbeddedDataBuilders?.() ?? [],
    );
    for (const builder of extraEmbeddedDataBuilders) {
      const metamodel = builder(embeddedData, this.context);
      if (metamodel) {
        return metamodel;
      }
    }

    throw new UnsupportedOperationError(
      `Can't build embedded data: no compatible builder available from plugins`,
      embeddedData,
    );
  }

  visit_ExternalFormatData(
    externalFormatData: V1_ExternalFormatData,
  ): EmbeddedData {
    const metamodel = new ExternalFormatData();
    metamodel.contentType = externalFormatData.contentType;
    metamodel.data = externalFormatData.data;
    return metamodel;
  }

  visit_ModelStoreData(modelStoreData: V1_ModelStoreData): EmbeddedData {
    const metamodel = new ModelStoreData();
    metamodel.instances = modelStoreData.instances;
    return metamodel;
  }

  visit_DataElementReference(
    dataElementReference: V1_DataElementReference,
  ): EmbeddedData {
    const metamodel = new DataElementReference();
    metamodel.dataElement = dataElementReference.dataElement;
    return metamodel;
  }
}
