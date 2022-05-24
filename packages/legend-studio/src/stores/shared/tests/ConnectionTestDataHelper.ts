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

import {
  Connection,
  ConnectionPointer,
  ConnectionVisitor,
  EmbeddedData,
  ExternalFormatData,
  FlatDataConnection,
  JsonModelConnection,
  ModelChainConnection,
  RelationalDatabaseConnection,
  XmlModelConnection,
} from '@finos/legend-graph';
import { ContentType } from '@finos/legend-shared';
import type { EditorStore } from '../../EditorStore';
import { createMockDataForMappingElementSource } from '../MockDataUtil';


// NOTE: this will all move to `engine` once engine support generating test data for all connections
export class TEMPORARY_EmbeddedDataConnectionVisitor
  implements ConnectionVisitor<EmbeddedData>
{
  editorStore: EditorStore;
  constructor(editorStore: EditorStore){
    this.editorStore = editorStore;
  }

  visit_Connection(connection: Connection): EmbeddedData {
    throw new Error('Method not implemented.');
  }
  visit_ConnectionPointer(connection: ConnectionPointer): EmbeddedData {
    throw new Error('Method not implemented.');
  }
  visit_ModelChainConnection(connection: ModelChainConnection): EmbeddedData {
    throw new Error('Method not implemented.');
  }
  visit_JsonModelConnection(connection: JsonModelConnection): EmbeddedData {
    const _class = connection.class.value;
    const _json = createMockDataForMappingElementSource(_class, this.editorStore);
    const data = new ExternalFormatData();
    data.contentType = ContentType.APPLICATION_JSON;
    data.data = _json;
    return data;
  }
  visit_XmlModelConnection(connection: XmlModelConnection): EmbeddedData {
    throw new Error('Method not implemented.');
  }
  visit_FlatDataConnection(connection: FlatDataConnection): EmbeddedData {
    throw new Error('Method not implemented.');
  }
  visit_RelationalDatabaseConnection(
    connection: RelationalDatabaseConnection,
  ): EmbeddedData {
    throw new Error('Method not implemented.');
  }
}

