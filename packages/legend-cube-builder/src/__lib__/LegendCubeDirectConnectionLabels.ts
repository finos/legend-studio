/**
 * Copyright (c) 2026-present, Goldman Sachs
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

// The text of the source picker's database connection tab (PLAN §6.8)

/**
 * The setup SQL the H2 form starts with (D5): a small sample database that
 * first drops what it creates, since setup SQL runs on every connection
 */
export const CUBE_DIRECT_SAMPLE_SETUP_SQL = [
  'drop schema if exists CUBE_SAMPLE cascade;',
  'create schema CUBE_SAMPLE;',
  'create table CUBE_SAMPLE.CUSTOMERS (CUSTOMER_ID VARCHAR(5) PRIMARY KEY, COMPANY_NAME VARCHAR(40) NOT NULL, COUNTRY VARCHAR(15));',
  "insert into CUBE_SAMPLE.CUSTOMERS values ('ALFKI', 'Alfreds Futterkiste', 'Germany'), ('ANATR', 'Ana Trujillo Emparedados', 'Mexico'), ('BONAP', 'Bon app''', 'France');",
  'create table CUBE_SAMPLE.ORDERS (ORDER_ID INT PRIMARY KEY, CUSTOMER_ID VARCHAR(5) NOT NULL, ORDER_DATE DATE, AMOUNT DECIMAL(10,2));',
  "insert into CUBE_SAMPLE.ORDERS values (10248, 'ALFKI', '1997-07-04', 32.38), (10249, 'ANATR', '1997-07-05', 11.61), (10250, 'BONAP', '1997-07-08', 65.83), (10251, 'ALFKI', '1997-07-08', 41.34);",
].join('\n');

/** Pending labels: lower-case gerunds, shown as they are (spec §17.13) */
export enum CUBE_DIRECT_PENDING_LABEL {
  TESTING_CONNECTION = 'testing connection',
  LISTING_TABLES = 'listing tables',
}

export const CUBE_DIRECT_MESSAGE = {
  H2_NEEDS_SETUP_SQL:
    'An H2 connection needs setup SQL: the engine creates the database from it',
  CUBE_CHANGED:
    'The cube changed while the table was loading; pick the table again.',
  NO_SCHEMA_FOUND: 'The database has no schema Cube can read',
  NO_TABLE_SCHEMA: 'The engine gave no schema for this table',
} as const;
