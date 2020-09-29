/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createSimpleSchema, custom, SKIP, serialize, primitive, alias } from 'serializr';
import { IllegalStateError } from 'Utilities/GeneralUtil';
import { Connection as MM_Connection, ConnectionVisitor as MM_ConnectionVisitor, ConnectionPointer as MM_ConnectionPointer } from 'MM/model/packageableElements/connection/Connection';
import { JsonModelConnection as MM_JsonModelConnection } from 'MM/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { XmlModelConnection as MM_XmlModelConnection } from 'MM/model/packageableElements/store/modelToModel/connection/XmlModelConnection';
import { PackageableElementType } from 'V1/model/packageableElements/PackageableElement';
import { ConnectionType } from 'V1/model/packageableElements/connection/Connection';
import { constant, packagePathSerializer, SKIP_FN, elementReferenceSerializer } from './CoreSerializerHelper';

const connectionPointerSchema = createSimpleSchema({
  _type: constant(ConnectionType.CONNECTION_POINTER),
  packageableConnection: alias('connection', elementReferenceSerializer),
});

const jsonModelConnectionSchema = createSimpleSchema({
  _type: constant(ConnectionType.JSON_MODEL_CONNECTION),
  class: elementReferenceSerializer,
  store: alias('element', elementReferenceSerializer),
  url: primitive(),
});

const xmlModelConnectionSchema = createSimpleSchema({
  _type: constant(ConnectionType.XML_MODEL_CONNECTION),
  class: elementReferenceSerializer,
  store: alias('element', elementReferenceSerializer),
  url: primitive(),
});

class ConnectionSerializer implements MM_ConnectionVisitor<object> {

  visit_ConnectionPointer(connection: MM_ConnectionPointer): Record<PropertyKey, unknown> {
    return serialize(connectionPointerSchema, connection);
  }

  visit_JsonModelConnection(connection: MM_JsonModelConnection): Record<PropertyKey, unknown> {
    return serialize(jsonModelConnectionSchema, connection);
  }

  visit_XmlModelConnection(connection: MM_XmlModelConnection): Record<PropertyKey, unknown> {
    return serialize(xmlModelConnectionSchema, connection);
  }
}

export const serializeConnection = (value: MM_Connection, allowPointer: boolean): Record<PropertyKey, unknown> | typeof SKIP => {
  if (value instanceof MM_ConnectionPointer && !allowPointer) {
    throw new IllegalStateError('Packageable connection value cannot be a connection pointer');
  }
  return value.accept_ConnectionVisitor(new ConnectionSerializer());
};

export const packageableConnectionSerializationSchema = createSimpleSchema({
  _type: constant(PackageableElementType.CONNECTION),
  connectionValue: custom(value => serializeConnection(value, false), SKIP_FN),
  name: primitive(),
  package: packagePathSerializer,
});
