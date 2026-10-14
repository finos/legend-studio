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

import type { ModelContext } from '@finos/legend-cube';
import { toPureSetupSqls } from './CubeSampleSql.js';

// The Cube Northwind fixture (PLAN §6.2.4): a corrected copy of the Northwind
// Database of the query builder's tests, which is left as it is. Corrections:
// the money columns are REAL (they were OTHER, typed String); the binary
// columns are dropped; SHIPPERS.PHONE is nullable; the four *_REGION joins
// (text against SMALLINT) are removed. Schema CUBETEST adds the precise types
// Northwind lacks (ALLTYPES) and the tables Part A needs (§11.2), since the
// slice has only Source, Join and Filter nodes.

export const CUBE_NORTHWIND_DATABASE =
  'showcase::northwind::store::NorthwindDatabase';
export const CUBE_NORTHWIND_CONNECTION =
  'showcase::northwind::connection::NorthwindConnection';
export const CUBE_NORTHWIND_RUNTIME =
  'showcase::northwind::mapping::StoreRuntime';

/**
 * The H2 statements that set up the CUBETEST tables, run after Northwind's own
 * data is loaded, on every connection checkout (so they start by dropping)
 */
const CUBETEST_SETUP_SQLS = [
  'drop schema if exists CUBETEST cascade',
  'create schema CUBETEST',

  // every precise type; ID 3 has every nullable column NULL
  'create table CUBETEST.ALLTYPES (ID INTEGER PRIMARY KEY, TI TINYINT, SI SMALLINT, BI BIGINT, F FLOAT, D DOUBLE, DEC DECIMAL(10,2), NUM NUMERIC(12,4), DT DATE, TS TIMESTAMP, B BIT, VC VARCHAR(20))',
  "insert into CUBETEST.ALLTYPES values (1, 1, 100, 4, 1.5, 2.5, 12.34, 1.2345, '2024-01-02', '2024-01-02 03:04:05.678', true, 'abc')",
  "insert into CUBETEST.ALLTYPES values (2, 2, 200, 9007199254740993, 2.5, 0.1, 1.25, 2.5, '2024-01-03', '2024-01-02 13:00:00', false, 'xyz')",
  'insert into CUBETEST.ALLTYPES (ID) values (3)',

  // a quoted, dotted table; read from Pure text, its path would split and
  // reach the decoy (a table named CUBETEST in the default schema)
  'create table CUBETEST."ORDER.LINES" (LINE_ID INTEGER PRIMARY KEY, RIGHT_COL VARCHAR(10))',
  'insert into CUBETEST."ORDER.LINES" values (1, \'right\')',
  'drop table if exists PUBLIC.CUBETEST',
  'create table PUBLIC.CUBETEST (WRONG_TABLE VARCHAR(10))',
  "insert into PUBLIC.CUBETEST values ('wrong')",

  // tables the picker flags (§6.2.6); the model declares the problem types
  'create table CUBETEST.PROBLEM_BINARY (ID INTEGER PRIMARY KEY, PAYLOAD BINARY(8))',
  'insert into CUBETEST.PROBLEM_BINARY (ID) values (1)',
  'create table CUBETEST.PROBLEM_CHAR (CODE CHAR(3) PRIMARY KEY, LABEL VARCHAR(10))',
  "insert into CUBETEST.PROBLEM_CHAR values ('ABC', 'first')",
  'create table CUBETEST.PROBLEM_OTHER (ID INTEGER PRIMARY KEY, O VARCHAR(10))',
  "insert into CUBETEST.PROBLEM_OTHER values (1, '32.38')",

  // narrow copies of Northwind columns, for joins the slice's nodes can build
  'create table CUBETEST.EMP_REGION as select EMPLOYEE_ID, REGION from NORTHWIND.EMPLOYEES',
  'create table CUBETEST.CUST_REGION as select CUSTOMER_ID, REGION from NORTHWIND.CUSTOMERS',
  'create table CUBETEST.CATEGORY_REGION as select CATEGORY_ID, CATEGORY_NAME as SHIP_REGION from NORTHWIND.CATEGORIES',

  // same-named keys differing only in their parameters, for the FULL casts
  'create table CUBETEST.KEY_VC15 (K VARCHAR(15))',
  "insert into CUBETEST.KEY_VC15 values ('AB'), ('ABCDEFGHIJ'), (null)",
  'create table CUBETEST.KEY_VC2 (K VARCHAR(2))',
  "insert into CUBETEST.KEY_VC2 values ('AB'), ('CD'), (null)",
  'create table CUBETEST.KEY_DEC (K DECIMAL(10,2))',
  'insert into CUBETEST.KEY_DEC values (1.25), (2.50)',
  'create table CUBETEST.KEY_NUM (K NUMERIC(12,4))',
  'insert into CUBETEST.KEY_NUM values (1.2500), (3.0000)',
];

/** The CUBETEST schema and the decoy table, in the Database's text */
const CUBETEST_DATABASE_TEXT = `  Schema CUBETEST
  (
    Table ALLTYPES
    (
      ID INTEGER PRIMARY KEY,
      TI TINYINT,
      SI SMALLINT,
      BI BIGINT,
      F FLOAT,
      D DOUBLE,
      DEC DECIMAL(10, 2),
      NUM NUMERIC(12, 4),
      DT DATE,
      TS TIMESTAMP,
      B BIT,
      VC VARCHAR(20)
    )
    Table "ORDER.LINES"
    (
      LINE_ID INTEGER PRIMARY KEY,
      RIGHT_COL VARCHAR(10)
    )
    Table PROBLEM_BINARY
    (
      ID INTEGER PRIMARY KEY,
      PAYLOAD BINARY(8)
    )
    Table PROBLEM_CHAR
    (
      CODE CHAR(3) PRIMARY KEY,
      LABEL VARCHAR(10)
    )
    Table PROBLEM_OTHER
    (
      ID INTEGER PRIMARY KEY,
      O OTHER
    )
    View PROBLEM_VIEW
    (
      ID: CUBETEST.ALLTYPES.ID PRIMARY KEY,
      VC: CUBETEST.ALLTYPES.VC
    )
    Table EMP_REGION
    (
      EMPLOYEE_ID SMALLINT PRIMARY KEY,
      REGION VARCHAR(15)
    )
    Table CUST_REGION
    (
      CUSTOMER_ID VARCHAR(5) PRIMARY KEY,
      REGION VARCHAR(15)
    )
    Table CATEGORY_REGION
    (
      CATEGORY_ID SMALLINT PRIMARY KEY,
      SHIP_REGION VARCHAR(15) NOT NULL
    )
    Table KEY_VC15
    (
      K VARCHAR(15)
    )
    Table KEY_VC2
    (
      K VARCHAR(2)
    )
    Table KEY_DEC
    (
      K DECIMAL(10, 2)
    )
    Table KEY_NUM
    (
      K NUMERIC(12, 4)
    )
  )
  Table CUBETEST
  (
    WRONG_TABLE VARCHAR(10)
  )

`;

/** The Northwind model's text, with Cube's test tables or without */
const northwindModelCode = (withTestTables: boolean): string => `###Relational
Database ${CUBE_NORTHWIND_DATABASE}
(
  Schema NORTHWIND
  (
    Table CATEGORIES
    (
      CATEGORY_ID SMALLINT PRIMARY KEY,
      CATEGORY_NAME VARCHAR(15) NOT NULL,
      DESCRIPTION VARCHAR(256)
    )
    Table CUSTOMERS
    (
      CUSTOMER_ID VARCHAR(5) PRIMARY KEY,
      COMPANY_NAME VARCHAR(40) NOT NULL,
      CONTACT_NAME VARCHAR(30),
      CONTACT_TITLE VARCHAR(30),
      ADDRESS VARCHAR(60),
      CITY VARCHAR(15),
      REGION VARCHAR(15),
      POSTAL_CODE VARCHAR(10),
      COUNTRY VARCHAR(15),
      PHONE VARCHAR(24),
      FAX VARCHAR(24)
    )
    Table CUSTOMER_CUSTOMER_DEMO
    (
      CUSTOMER_ID VARCHAR(5) PRIMARY KEY,
      CUSTOMER_TYPE_ID VARCHAR(5) PRIMARY KEY
    )
    Table CUSTOMER_DEMOGRAPHICS
    (
      CUSTOMER_TYPE_ID VARCHAR(5) PRIMARY KEY,
      CUSTOMER_DESC VARCHAR(256)
    )
    Table EMPLOYEES
    (
      EMPLOYEE_ID SMALLINT PRIMARY KEY,
      LAST_NAME VARCHAR(20) NOT NULL,
      FIRST_NAME VARCHAR(10) NOT NULL,
      TITLE VARCHAR(30),
      TITLE_OF_COURTESY VARCHAR(25),
      BIRTH_DATE DATE,
      HIRE_DATE DATE,
      ADDRESS VARCHAR(60),
      CITY VARCHAR(15),
      REGION VARCHAR(15),
      POSTAL_CODE VARCHAR(10),
      COUNTRY VARCHAR(15),
      HOME_PHONE VARCHAR(24),
      EXTENSION VARCHAR(4),
      REPORTS_TO SMALLINT,
      PHOTO_PATH VARCHAR(255)
    )
    Table EMPLOYEE_TERRITORIES
    (
      EMPLOYEE_ID SMALLINT PRIMARY KEY,
      TERRITORY_ID VARCHAR(20) PRIMARY KEY
    )
    Table ORDERS
    (
      ORDER_ID SMALLINT PRIMARY KEY,
      CUSTOMER_ID VARCHAR(5),
      EMPLOYEE_ID SMALLINT,
      ORDER_DATE DATE,
      REQUIRED_DATE DATE,
      SHIPPED_DATE DATE,
      SHIP_VIA SMALLINT,
      FREIGHT REAL,
      SHIP_NAME VARCHAR(40),
      SHIP_ADDRESS VARCHAR(60),
      SHIP_CITY VARCHAR(15),
      SHIP_REGION VARCHAR(15),
      SHIP_POSTAL_CODE VARCHAR(10),
      SHIP_COUNTRY VARCHAR(15)
    )
    Table ORDER_DETAILS
    (
      ORDER_ID SMALLINT PRIMARY KEY,
      PRODUCT_ID SMALLINT PRIMARY KEY,
      UNIT_PRICE REAL NOT NULL,
      QUANTITY SMALLINT NOT NULL,
      DISCOUNT REAL NOT NULL
    )
    Table PRODUCTS
    (
      PRODUCT_ID SMALLINT PRIMARY KEY,
      PRODUCT_NAME VARCHAR(40) NOT NULL,
      SUPPLIER_ID SMALLINT,
      CATEGORY_ID SMALLINT,
      QUANTITY_PER_UNIT VARCHAR(20),
      UNIT_PRICE REAL,
      UNITS_IN_STOCK SMALLINT,
      UNITS_ON_ORDER SMALLINT,
      REORDER_LEVEL SMALLINT,
      DISCONTINUED INTEGER NOT NULL
    )
    Table REGION
    (
      REGION_ID SMALLINT PRIMARY KEY,
      REGION_DESCRIPTION VARCHAR(60) NOT NULL
    )
    Table SHIPPERS
    (
      SHIPPER_ID SMALLINT PRIMARY KEY,
      COMPANY_NAME VARCHAR(40) NOT NULL,
      PHONE VARCHAR(24)
    )
    Table SUPPLIERS
    (
      SUPPLIER_ID SMALLINT PRIMARY KEY,
      COMPANY_NAME VARCHAR(40) NOT NULL,
      CONTACT_NAME VARCHAR(30),
      CONTACT_TITLE VARCHAR(30),
      ADDRESS VARCHAR(60),
      CITY VARCHAR(15),
      REGION VARCHAR(15),
      POSTAL_CODE VARCHAR(10),
      COUNTRY VARCHAR(15),
      PHONE VARCHAR(24),
      FAX VARCHAR(24),
      HOMEPAGE VARCHAR(256)
    )
    Table TERRITORIES
    (
      TERRITORY_ID VARCHAR(20) PRIMARY KEY,
      TERRITORY_DESCRIPTION VARCHAR(60) NOT NULL,
      REGION_ID SMALLINT NOT NULL
    )
    Table US_STATES
    (
      STATE_ID SMALLINT PRIMARY KEY,
      STATE_NAME VARCHAR(100),
      STATE_ABBR VARCHAR(2),
      STATE_REGION VARCHAR(50)
    )
  )
${withTestTables ? CUBETEST_DATABASE_TEXT : '\n'}  Join ORDERS_CUSTMERS(NORTHWIND.ORDERS.CUSTOMER_ID = NORTHWIND.CUSTOMERS.CUSTOMER_ID)
  Join ORDERS_EMPLOYEES(NORTHWIND.ORDERS.EMPLOYEE_ID = NORTHWIND.EMPLOYEES.EMPLOYEE_ID)
  Join ORDERS_SHIPPERS(NORTHWIND.ORDERS.SHIP_VIA = NORTHWIND.SHIPPERS.SHIPPER_ID)
  Join ORDERS_ORDER_DETAILS(NORTHWIND.ORDERS.ORDER_ID = NORTHWIND.ORDER_DETAILS.ORDER_ID)
  Join ORDERS_DETAILS_PRODUCTS(NORTHWIND.ORDER_DETAILS.PRODUCT_ID = NORTHWIND.PRODUCTS.PRODUCT_ID)
  Join PRODUCTS_CATEGORIES(NORTHWIND.PRODUCTS.CATEGORY_ID = NORTHWIND.CATEGORIES.CATEGORY_ID)
  Join PRODUCTS_SUPPLIERS(NORTHWIND.PRODUCTS.SUPPLIER_ID = NORTHWIND.SUPPLIERS.SUPPLIER_ID)
  Join TERRITORIES_REGION(NORTHWIND.TERRITORIES.REGION_ID = NORTHWIND.REGION.REGION_ID)
  Join EMPLOYEES_EMPLOYEE_TERRITORIES(NORTHWIND.EMPLOYEES.EMPLOYEE_ID = NORTHWIND.EMPLOYEE_TERRITORIES.EMPLOYEE_ID)
  Join EMPLOYEE_TERRITORIES_TERRITORIES(NORTHWIND.EMPLOYEE_TERRITORIES.TERRITORY_ID = NORTHWIND.TERRITORIES.TERRITORY_ID)
  Join CUSTOMER_CURSTOMER_DEMO(NORTHWIND.CUSTOMERS.CUSTOMER_ID = NORTHWIND.CUSTOMER_CUSTOMER_DEMO.CUSTOMER_ID)
  Join CURSTOMER_DEMO_DEMOGRAPHICS(NORTHWIND.CUSTOMER_CUSTOMER_DEMO.CUSTOMER_TYPE_ID = NORTHWIND.CUSTOMER_DEMOGRAPHICS.CUSTOMER_TYPE_ID)
  Join EMPLOYEE_REPORTS(NORTHWIND.EMPLOYEES.REPORTS_TO = {target}.EMPLOYEE_ID)
)


###Connection
RelationalDatabaseConnection ${CUBE_NORTHWIND_CONNECTION}
{
  store: ${CUBE_NORTHWIND_DATABASE};
  type: H2;
  specification: LocalH2
  {
    testDataSetupSqls: [
${toPureSetupSqls(
  withTestTables
    ? ['call loadNorthwindData()', ...CUBETEST_SETUP_SQLS]
    : ['call loadNorthwindData()'],
)}
    ];
  };
  auth: DefaultH2;
}


###Runtime
Runtime ${CUBE_NORTHWIND_RUNTIME}
{
  mappings:
  [
  ];
  connections:
  [
    ${CUBE_NORTHWIND_DATABASE}:
    [
      connection_1: ${CUBE_NORTHWIND_CONNECTION}
    ]
  ];
}
`;

export const CUBE_NORTHWIND_MODEL_CODE = northwindModelCode(true);

/**
 * Northwind as the Sample Data tab offers it: Northwind's own tables, without
 * Cube's test tables
 */
export const CUBE_NORTHWIND_SAMPLE_MODEL_CODE = northwindModelCode(false);

/** The Cube Northwind fixture as a cube saves it (PLAN §6.2.2) */
export const CUBE_NORTHWIND_MODEL: ModelContext = Object.freeze({
  _type: 'text',
  code: CUBE_NORTHWIND_MODEL_CODE,
});

/** The Northwind sample, without Cube's test tables, as a cube saves it */
export const CUBE_NORTHWIND_SAMPLE_MODEL: ModelContext = Object.freeze({
  _type: 'text',
  code: CUBE_NORTHWIND_SAMPLE_MODEL_CODE,
});
