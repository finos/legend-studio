export enum PERSISTENCE_HASH_STRUCTURE {
  PERSISTENCE = 'PERSISTENCE',
  OPAQUE_TRIGGER = 'OPAQUE_TRIGGER',
  SERVICE_READER = 'SERVICE_READER',
  STREAMING_PERSISTER = 'STREAMING_PERSISTER',
  BATCH_PERSISTER = 'BATCH_PERSISTER',

  // target specification
  TARGET_SPECIFICATION = 'TARGET_SPECIFICATION',
  GROUPED_FLAT_TARGET_SPECIFICATION = 'GROUPED_FLAT_TARGET_SPECIFICATION',
  FLAT_TARGET_SPECIFICATION = 'FLAT_TARGET_SPECIFICATION',
  NESTED_TARGET_SPECIFICATION = 'NESTED_TARGET_SPECIFICATION',
  PROPERTY_AND_FLAT_TARGET_SPECIFICATION = 'PROPERTY_AND_FLAT_TARGET_SPECIFICATION',

  // deduplication strategy
  NO_DEDUPLICATION_STRATEGY = 'NO_DEDUPLICATION_STRATEGY',
  ANY_VERSION_DEDUPLICATION_STRATEGY = 'ANY_VERSION_DEDUPLICATION_STRATEGY',
  MAX_VERSION_DEDUPLICATION_STRATEGY = 'MAX_VERSION_DEDUPLICATION_STRATEGY',
  OPAQUE_DEDUPLICATION_STRATEGY = 'OPAQUE_DEDUPLICATION_STRATEGY',

  // batch mode
  NON_MILESTONED_SNAPSHOT = 'NON_MILESTONED_SNAPSHOT',
  UNITEMPORAL_SNAPSHOT = 'UNITEMPORAL_SNAPSHOT',
  BITEMPORAL_SNAPSHOT = 'BITEMPORAL_SNAPSHOT',
  NON_MILESTONED_DELTA = 'NON_MILESTONED_DELTA',
  UNITEMPORAL_DELTA = 'UNITEMPORAL_DELTA',
  BITEMPORAL_DELTA = 'BITEMPORAL_DELTA',
  APPEND_ONLY = 'APPEND_ONLY',

  // merge strategy
  NO_DELETES_MERGE_STRATEGY = 'NO_DELETES_MERGE_STRATEGY',
  DELETE_INDICATOR_MERGE_STRATEGY = 'DELETE_INDICATOR_MERGE_STRATEGY',
  OPAQUE_MERGE_STRATEGY = 'OPAQUE_MERGE_STRATEGY',

  // auditing
  NO_AUDITING = 'NO_AUDITING',
  BATCH_DATE_TIME_AUDITING = 'BATCH_DATE_TIME_AUDITING',
  OPAQUE_AUDITING = 'OPAQUE_AUDITING',

  // transactional milestoning
  BATCH_ID_TRANSACTION_MILESTONING = 'BATCH_ID_TRANSACTION_MILESTONING',
  DATE_TIME_TRANSACTION_MILESTONING = 'DATE_TIME_TRANSACTION_MILESTONING',
  BATCH_ID_AND_DATE_TIME_TRANSACTION_MILESTONING = 'BATCH_ID_AND_DATE_TIME_TRANSACTION_MILESTONING',
  OPAQUE_TRANSACTION_MILESTONING = 'OPAQUE_TRANSACTION_MILESTONING',

  // validity milestoning
  DATE_TIME_VALIDITY_MILESTONING = 'DATE_TIME_VALIDITY_MILESTONING',
  OPAQUE_VALIDITY_MILESTONING = 'OPAQUE_VALIDITY_MILESTONING',

  // validity derivation
  SOURCE_SPECIFIES_FROM_DATE_TIME = 'SOURCE_SPECIFIES_FROM_DATE_TIME',
  SOURCE_SPECIFIES_FROM_AND_THRU_DATE_TIME = 'SOURCE_SPECIFIES_FROM_AND_THRU_DATE_TIME',
}
