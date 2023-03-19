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
} from '../../../../../../../../graph/metamodel/pure/data/EmbeddedData.js';
import {
  RelationalCSVData,
  RelationalCSVDataTable,
} from '../../../../../../../../graph/metamodel/pure/data/RelationalCSVData.js';
import type { Class } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Class.js';
import type { DSL_Data_PureProtocolProcessorPlugin_Extension } from '../../../../../extensions/DSL_Data_PureProtocolProcessorPlugin_Extension.js';
import type {
  V1_DataElementReference,
  V1_EmbeddedData,
  V1_EmbeddedDataVisitor,
  V1_ExternalFormatData,
  V1_ModelStoreData,
} from '../../../../model/data/V1_EmbeddedData.js';
import type { V1_RelationalCSVData } from '../../../../model/data/V1_RelationalCSVData.js';
import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext.js';

class V1_EmbeddedDataBuilder implements V1_EmbeddedDataVisitor<EmbeddedData> {
  context: V1_GraphBuilderContext;

  constructor(context: V1_GraphBuilderContext) {
    this.context = context;
  }

  visit_EmbeddedData(embeddedData: V1_EmbeddedData): EmbeddedData {
    const extraEmbeddedDataBuilders = this.context.extensions.plugins.flatMap(
      (plugin) =>
        (
          plugin as DSL_Data_PureProtocolProcessorPlugin_Extension
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
    const instances = new Map<Class, object>();
    Array.from(modelStoreData.instances.entries()).forEach((e) =>
      instances.set(this.context.graph.getClass(e[0]), e[1]),
    );
    metamodel.instances = instances;
    return metamodel;
  }

  visit_DataElementReference(
    dataElementReference: V1_DataElementReference,
  ): EmbeddedData {
    const metamodel = new DataElementReference();
    metamodel.dataElement = this.context.resolveDataElement(
      dataElementReference.dataElement,
    );
    return metamodel;
  }

  visit_RelationalData(relationalData: V1_RelationalCSVData): EmbeddedData {
    const metamodel = new RelationalCSVData();
    metamodel.tables = relationalData.tables.map((t) => {
      const table = new RelationalCSVDataTable();
      table.schema = t.schema;
      table.table = t.table;
      table.values = t.values;
      return table;
    });
    return metamodel;
  }
}

export const V1_buildEmbeddedData = (
  protocol: V1_EmbeddedData,
  context: V1_GraphBuilderContext,
): EmbeddedData =>
  protocol.accept_EmbeddedDataVisitor(new V1_EmbeddedDataBuilder(context));
