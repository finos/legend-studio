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

export enum PERSISTENCE_HASH_STRUCTURE {
  // ----- PERSISTENCE CONTEXT -----

  PERSISTENCE_CONTEXT = 'PERSISTENCE_CONTEXT',

  // platform
  PERSISTENCE_PLATFORM = 'PERSISTENCE_PLATFORM',

  // service parameter
  SERVICE_PARAMETER = 'SERVICE_PARAMETER',
  PRIMITIVE_TYPE_VALUE_SERVICE_PARAMETER = 'PRIMITIVE_TYPE_VALUE_SERVICE_PARAMETER',
  CONNECTION_VALUE_SERVICE_PARAMETER = 'CONNECTION_VALUE_SERVICE_PARAMETER',

  // ----- PERSISTENCE -----

  PERSISTENCE = 'PERSISTENCE',

  // trigger
  MANUAL_TRIGGER = 'MANUAL_TRIGGER',
  CRON_TRIGGER = 'CRON_TRIGGER',

  // persister
  STREAMING_PERSISTER = 'STREAMING_PERSISTER',
  BATCH_PERSISTER = 'BATCH_PERSISTER',

  // notifier
  NOTIFIER = 'NOTIFIER',
  EMAIL_NOTIFYEE = 'EMAIL_NOTIFYEE',
  PAGER_DUTY_NOTIFYEE = 'PAGER_DUTY_NOTIFYEE',

  // sink
  RELATIONAL_SINK = 'RELATIONAL_SINK',
  OBJECT_STORAGE_SINK = 'OBJECT_STORAGE_SINK',

  // target shape
  MULTI_FLAT_TARGET = 'MULTI_FLAT_TARGET',
  FLAT_TARGET = 'FLAT_TARGET',
  MULTI_FLAT_TARGET_PART = 'MULTI_FLAT_TARGET_PART',

  // deduplication strategy
  NO_DEDUPLICATION_STRATEGY = 'NO_DEDUPLICATION_STRATEGY',
  ANY_VERSION_DEDUPLICATION_STRATEGY = 'ANY_VERSION_DEDUPLICATION_STRATEGY',
  MAX_VERSION_DEDUPLICATION_STRATEGY = 'MAX_VERSION_DEDUPLICATION_STRATEGY',
  DUPLICATE_COUNT_DEDUPLICATION_STRATEGY = 'DUPLICATE_COUNT_DEDUPLICATION_STRATEGY',

  // ingest mode
  NONTEMPORAL_SNAPSHOT = 'NONTEMPORAL_SNAPSHOT',
  UNITEMPORAL_SNAPSHOT = 'UNITEMPORAL_SNAPSHOT',
  BITEMPORAL_SNAPSHOT = 'BITEMPORAL_SNAPSHOT',
  NONTEMPORAL_DELTA = 'NONTEMPORAL_DELTA',
  UNITEMPORAL_DELTA = 'UNITEMPORAL_DELTA',
  BITEMPORAL_DELTA = 'BITEMPORAL_DELTA',
  APPEND_ONLY = 'APPEND_ONLY',

  // merge strategy
  NO_DELETES_MERGE_STRATEGY = 'NO_DELETES_MERGE_STRATEGY',
  DELETE_INDICATOR_MERGE_STRATEGY = 'DELETE_INDICATOR_MERGE_STRATEGY',

  // auditing
  NO_AUDITING = 'NO_AUDITING',
  DATE_TIME_AUDITING = 'DATE_TIME_AUDITING',

  // transactional milestoning
  BATCH_ID_TRANSACTION_MILESTONING = 'BATCH_ID_TRANSACTION_MILESTONING',
  DATE_TIME_TRANSACTION_MILESTONING = 'DATE_TIME_TRANSACTION_MILESTONING',
  BATCH_ID_AND_DATE_TIME_TRANSACTION_MILESTONING = 'BATCH_ID_AND_DATE_TIME_TRANSACTION_MILESTONING',

  // transaction derivation
  SOURCE_SPECIFIES_IN_DATE_TIME = 'SOURCE_SPECIFIES_IN_DATE_TIME',
  SOURCE_SPECIFIES_IN_AND_OUT_DATE_TIME = 'SOURCE_SPECIFIES_IN_AND_OUT_DATE_TIME',

  // validity milestoning
  DATE_TIME_VALIDITY_MILESTONING = 'DATE_TIME_VALIDITY_MILESTONING',

  // validity derivation
  SOURCE_SPECIFIES_FROM_DATE_TIME = 'SOURCE_SPECIFIES_FROM_DATE_TIME',
  SOURCE_SPECIFIES_FROM_AND_THRU_DATE_TIME = 'SOURCE_SPECIFIES_FROM_AND_THRU_DATE_TIME',
}
