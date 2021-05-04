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

import type { Hashable } from '@finos/legend-studio-shared';
import type { V1_ModelChainConnection } from '../../../model/packageableElements/store/modelToModel/connection/V1_ModelChainConnection';
import type { V1_RelationalDatabaseConnection } from '../../../model/packageableElements/store/relational/connection/V1_RelationalDatabaseConnection';
import type { V1_JsonModelConnection } from '../../../model/packageableElements/store/modelToModel/connection/V1_JsonModelConnection';
import type { V1_XmlModelConnection } from '../../../model/packageableElements/store/modelToModel/connection/V1_XmlModelConnection';
import type { V1_FlatDataConnection } from '../../../model/packageableElements/store/flatData/connection/V1_FlatDataConnection';
import type { V1_ConnectionPointer } from './V1_ConnectionPointer';

export enum V1_ConnectionType {
  CONNECTION_POINTER = 'connectionPointer',
  MODEL_CONNECTION = 'ModelConnection',
  MODEL_CHAIN_CONNECTION = 'ModelChainConnection',
  JSON_MODEL_CONNECTION = 'JsonModelConnection',
  XML_MODEL_CONNECTION = 'XmlModelConnection',
  FLAT_DATA_CONNECTION = 'FlatDataConnection',
  RELATIONAL_DATABASE_CONNECTION = 'RelationalDatabaseConnection',
}

/* @MARKER: NEW CONNECTION TYPE SUPPORT --- consider adding connection type handler here whenever support for a new one is added to the app */
export interface V1_ConnectionVisitor<T> {
  visit_ConnectionPointer(connection: V1_ConnectionPointer): T;
  visit_JsonModelConnection(connection: V1_JsonModelConnection): T;
  visit_ModelChainConnection(connection: V1_ModelChainConnection): T;
  visit_XmlModelConnection(connection: V1_XmlModelConnection): T;
  visit_FlatDataConnection(connection: V1_FlatDataConnection): T;
  visit_RelationalDatabaseConnection(
    connection: V1_RelationalDatabaseConnection,
  ): T;
}

export abstract class V1_Connection implements Hashable {
  store?: string;

  abstract get hashCode(): string;

  abstract accept_ConnectionVisitor<T>(visitor: V1_ConnectionVisitor<T>): T;
}
