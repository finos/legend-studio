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

export enum MASTERY_HASH_STRUCTURE {
  MASTER_RECORD_DEFINITION = 'MASTER_RECORD_DEFINITION',
  IDENTITY_RESOLUTION = 'IDENTITY_RESOLUTION',
  RESOLUTION_QUERY = 'RESOLUTION_QUERY',
  RECORD_SOURCE = 'RECORD_SOURCE',
  RECORD_SOURCE_PARTITION = 'RECORD_SOURCE_PARTITION',
  PRECEDENCE_RULE = 'PRECEDENCE_RULE',
  CREATE_RULE = 'CREATE_RULE',
  UPDATE_RULE = 'UPDATE_RULE',
  DELETE_RULE = 'DELETE_RULE',
  SOURCE_PRECEDENCE_RULE = 'SOURCE_PRECEDENCE_RULE',
  CONDITIONAL_RULE = 'CONDITIONAL_RULE',
  PROPERTY_PATH = 'PROPERTY_PATH',
  RULE_SCOPE = 'RULE_SCOPE',
  DATA_PROVIDER_ID_SCOPE = 'DATA_PROVIDER_ID_SCOPE',
  DATA_PROVIDER_TYPE_SCOPE = 'DATA_PROVIDER_TYPE_SCOPE',
  RECORD_SOURCE_SCOPE = 'RECORD_SOURCE_SCOPE',
}
