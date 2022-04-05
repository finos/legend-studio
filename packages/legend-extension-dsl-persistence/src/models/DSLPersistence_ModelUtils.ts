export enum PERSISTENCE_HASH_STRUCTURE {
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

  // validity milestoning
  DATE_TIME_VALIDITY_MILESTONING = 'DATE_TIME_VALIDITY_MILESTONING',

  // validity derivation
  SOURCE_SPECIFIES_FROM_DATE_TIME = 'SOURCE_SPECIFIES_FROM_DATE_TIME',
  SOURCE_SPECIFIES_FROM_AND_THRU_DATE_TIME = 'SOURCE_SPECIFIES_FROM_AND_THRU_DATE_TIME',
}
