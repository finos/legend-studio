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

export enum SERVICE_STORE_HASH_STRUCTURE {
  //ServiceStoreService Store
  SERVICE_STORE = 'SERVICE_STORE',
  SERVICE_STORE_SERVICE = 'SERVICE_STORE_SERVICE',
  SERVICE_GROUP = 'SERVICE_GROUP',
  SERVICE_PARAMETER = 'SERVICE_PARAMETER',
  SERIALIZATION_FORMAT = 'SERIALIZATION_FORMAT',
  SERVICE_GROUP_PTR = 'SERVICE_GROUP_PTR',
  SERVICE_STORE_SERVICE_PTR = 'SERVICE_STORE_SERVICE_PTR',

  //Type Reference
  COMPLEX_TYPE_REFERENCE = 'COMPLEX_TYPE_REFERENCE',
  BOOLEAN_TYPE_REFERENCE = 'BOOLEAN_TYPE_REFERENCE',
  FLOAT_TYPE_REFERENCE = 'FLOAT_TYPE_REFERENCE',
  INTEGER_TYPE_REFERENCE = 'INTEGER_TYPE_REFERENCE',
  STRING_TYPE_REFERENCE = 'STRING_TYPE_REFERENCE',

  //Mapping
  LOCAL_MAPPING_PROPERTY = 'LOCAL_MAPPING_PROPERTY',
  SERVICE_MAPPING = 'SERVICE_MAPPING',
  ROOT_SERVICE_STORE_CLASS_MAPPING = 'ROOT_SERVICE_STORE_CLASS_MAPPING',
  PROPERTY_INDEXED_PARAMETER_MAPPING = 'PROPERTY_INDEXED_PARAMETR_MAPPING',
  PARAMETER_INDEXED_PARAMETER_MAPPING = 'PARAMETER_INDEXED_PARAMETR_MAPPING',

  //Connection
  SERVICE_STORE_CONNECTION = 'SERVICE_STORE_CONNECTION',
}
