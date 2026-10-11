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

// Writes the Legend Cube sample projects the mock depot serves
// (data/cube-depot/projects.json) from the Pure below, converted to JSON by a
// running engine. Run it after changing a project:
//   node scripts/generate-cube-depot.mjs [engine url, default http://localhost:6300]
//
// The projects are small and hand-written, each shape chosen for a case of
// Legend Cube's Project tab (PLAN §6.3):
// - cube-sales has releases 1.0.0, 1.9.0 and 1.10.0 (ordered by number, not
//   text) and a master-SNAPSHOT, which Cube doesn't offer; each release adds
//   to the one before. Its SalesDb has one runtime (picked for the user),
//   ArchiveDb two (the user picks), PlannedDb none (shown disabled).
// - cube-reference is a dependency of cube-sales: its Database is in the
//   model the engine fetches, but not one Cube lists for cube-sales.
// Every table has a few rows, set up in an in-memory H2 database by its
// connection, in a schema of its own.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ENGINE = process.argv[2] ?? 'http://localhost:6300';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../data/cube-depot/projects.json');
const GROUP = 'org.finos.legend.cube.samples';

const CLASSIFIERS = {
  relational: 'meta::relational::metamodel::Database',
  connection: 'meta::pure::runtime::PackageableConnection',
  runtime: 'meta::pure::runtime::PackageableRuntime',
};

const pureString = (text) =>
  `'${text.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;

const h2Connection = (path, store, sqls) => `###Connection
RelationalDatabaseConnection ${path}
{
  store: ${store};
  type: H2;
  specification: LocalH2
  {
    testDataSetupSqls: [
${sqls.map((sql) => `      ${pureString(sql)}`).join(',\n')}
    ];
  };
  auth: DefaultH2;
}
`;

const runtime = (path, store, connection) => `###Runtime
Runtime ${path}
{
  mappings:
  [
  ];
  connections:
  [
    ${store}:
    [
      connection_1: ${connection}
    ]
  ];
}
`;

// ------------------------------------------------------------ cube-reference

const CURRENCY_DB = 'cube::samples::reference::store::CurrencyDb';
const referenceCode = () => `###Relational
Database ${CURRENCY_DB}
(
  Schema REF
  (
    Table CURRENCIES
    (
      CODE VARCHAR(3) PRIMARY KEY,
      NAME VARCHAR(40) NOT NULL
    )
  )
)

${h2Connection('cube::samples::reference::CurrencyConnection', CURRENCY_DB, [
  'drop schema if exists REF cascade',
  'create schema REF',
  'create table REF.CURRENCIES (CODE VARCHAR(3) PRIMARY KEY, NAME VARCHAR(40) NOT NULL)',
  "insert into REF.CURRENCIES values ('USD', 'US Dollar'), ('EUR', 'Euro'), ('GBP', 'Pound Sterling')",
])}
${runtime(
  'cube::samples::reference::CurrencyRuntime',
  CURRENCY_DB,
  'cube::samples::reference::CurrencyConnection',
)}`;

// ---------------------------------------------------------------- cube-sales

const SALES_DB = 'cube::samples::sales::store::SalesDb';
const ARCHIVE_DB = 'cube::samples::sales::store::ArchiveDb';
const PLANNED_DB = 'cube::samples::sales::store::PlannedDb';

/** The sales project at a release: 1.9.0 adds ORDERS.STATUS, 1.10.0 the RETURNS table */
const salesCode = (version) => {
  const withStatus = version !== '1.0.0';
  const withReturns = version === '1.10.0';
  const orders = [
    [1, 1, '2026-01-05', '120.50', 'SHIPPED'],
    [2, 1, '2026-01-19', '75.00', 'SHIPPED'],
    [3, 2, '2026-02-02', '310.25', 'OPEN'],
    [4, 3, '2026-02-14', '42.10', 'CANCELLED'],
    [5, 2, '2026-03-01', '980.00', 'SHIPPED'],
    [6, 4, '2026-03-09', '15.99', 'OPEN'],
  ];
  const salesSqls = [
    'drop schema if exists SALES cascade',
    'create schema SALES',
    'create table SALES.CUSTOMERS (ID INTEGER PRIMARY KEY, NAME VARCHAR(40) NOT NULL, COUNTRY VARCHAR(20))',
    "insert into SALES.CUSTOMERS values (1, 'Acme', 'France'), (2, 'Globex', 'Germany'), (3, 'Initech', NULL), (4, 'Umbrella', 'France')",
    `create table SALES.ORDERS (ID INTEGER PRIMARY KEY, CUSTOMER_ID INTEGER NOT NULL, ORDER_DATE DATE NOT NULL, AMOUNT DECIMAL(12,2) NOT NULL${withStatus ? ', STATUS VARCHAR(10) NOT NULL' : ''})`,
    `insert into SALES.ORDERS values ${orders
      .map(
        ([id, customer, date, amount, status]) =>
          `(${id}, ${customer}, DATE '${date}', ${amount}${withStatus ? `, '${status}'` : ''})`,
      )
      .join(', ')}`,
    ...(withReturns
      ? [
          'create table SALES.RETURNS (ORDER_ID INTEGER PRIMARY KEY, REASON VARCHAR(40) NOT NULL)',
          "insert into SALES.RETURNS values (2, 'Damaged'), (5, 'Wrong size')",
        ]
      : []),
  ];
  const archiveSqls = (rows) => [
    'drop schema if exists ARCHIVE cascade',
    'create schema ARCHIVE',
    'create table ARCHIVE.ORDERS_2025 (ID INTEGER PRIMARY KEY, AMOUNT DECIMAL(12,2) NOT NULL)',
    `insert into ARCHIVE.ORDERS_2025 values ${rows
      .map(([id, amount]) => `(${id}, ${amount})`)
      .join(', ')}`,
  ];
  return `###Relational
Database ${SALES_DB}
(
  Schema SALES
  (
    Table CUSTOMERS
    (
      ID INTEGER PRIMARY KEY,
      NAME VARCHAR(40) NOT NULL,
      COUNTRY VARCHAR(20)
    )
    Table ORDERS
    (
      ID INTEGER PRIMARY KEY,
      CUSTOMER_ID INTEGER NOT NULL,
      ORDER_DATE DATE NOT NULL,
      AMOUNT DECIMAL(12,2) NOT NULL${withStatus ? ',\n      STATUS VARCHAR(10) NOT NULL' : ''}
    )${
      withReturns
        ? `
    Table RETURNS
    (
      ORDER_ID INTEGER PRIMARY KEY,
      REASON VARCHAR(40) NOT NULL
    )`
        : ''
    }
  )

  Join ORDER_CUSTOMER(SALES.ORDERS.CUSTOMER_ID = SALES.CUSTOMERS.ID)
)

###Relational
Database ${ARCHIVE_DB}
(
  Schema ARCHIVE
  (
    Table ORDERS_2025
    (
      ID INTEGER PRIMARY KEY,
      AMOUNT DECIMAL(12,2) NOT NULL
    )
  )
)

###Relational
Database ${PLANNED_DB}
(
  Schema PLANNED
  (
    Table FORECASTS
    (
      MONTH DATE PRIMARY KEY,
      AMOUNT DECIMAL(12,2)
    )
  )
)

${h2Connection('cube::samples::sales::SalesConnection', SALES_DB, salesSqls)}
${h2Connection(
  'cube::samples::sales::ArchiveConnection',
  ARCHIVE_DB,
  archiveSqls([
    [1, '10.00'],
    [2, '20.00'],
    [3, '30.00'],
  ]),
)}
${h2Connection(
  'cube::samples::sales::ArchiveReplicaConnection',
  ARCHIVE_DB,
  archiveSqls([
    [1, '10.00'],
    [2, '20.00'],
  ]),
)}
${runtime('cube::samples::sales::SalesRuntime', SALES_DB, 'cube::samples::sales::SalesConnection')}
${runtime('cube::samples::sales::ArchiveRuntime', ARCHIVE_DB, 'cube::samples::sales::ArchiveConnection')}
${runtime(
  'cube::samples::sales::ArchiveReplicaRuntime',
  ARCHIVE_DB,
  'cube::samples::sales::ArchiveReplicaConnection',
)}`;
};

// ---------------------------------------------------------------- generation

/** The JSON without the engine's source positions, which only bloat it */
const withoutSourceInformation = (value) => {
  if (Array.isArray(value)) {
    return value.map(withoutSourceInformation);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !/sourceInformation$/iu.test(key))
        .map(([key, child]) => [key, withoutSourceInformation(child)]),
    );
  }
  return value;
};

const toEntities = async (code) => {
  const response = await fetch(
    `${ENGINE}/api/pure/v1/grammar/transformGrammarToJson`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, isolatedLambdas: {} }),
    },
  );
  const json = await response.json();
  if (!response.ok || json.codeError || !json.modelDataContext) {
    throw new Error(
      `The engine couldn't read a project: ${JSON.stringify(json.codeError ?? json).slice(0, 500)}`,
    );
  }
  // the section index records the grammar's sections, which an entity doesn't keep
  const elements = json.modelDataContext.elements.filter(
    (element) => element._type !== 'sectionIndex',
  );
  return elements.map((element) => {
    const classifierPath = CLASSIFIERS[element._type];
    if (!classifierPath) {
      throw new Error(`No classifier for element type ${element._type}`);
    }
    return {
      path: `${element.package}::${element.name}`,
      classifierPath,
      content: withoutSourceInformation(element),
    };
  });
};

const REFERENCE = { groupId: GROUP, artifactId: 'cube-reference', versionId: '1.0.0' };

const projects = [
  {
    groupId: GROUP,
    artifactId: 'cube-reference',
    projectId: 'CUBE-REFERENCE',
    versions: [{ versionId: '1.0.0', code: referenceCode(), dependencies: [] }],
  },
  {
    groupId: GROUP,
    artifactId: 'cube-sales',
    projectId: 'CUBE-SALES',
    versions: [
      ...['1.0.0', '1.9.0', '1.10.0'].map((versionId) => ({
        versionId,
        code: salesCode(versionId),
        dependencies: [REFERENCE],
      })),
      // the head of the project, as the depot lists it with snapshots
      {
        versionId: 'master-SNAPSHOT',
        code: salesCode('1.10.0'),
        dependencies: [REFERENCE],
      },
    ],
  },
];

const result = [];
for (const project of projects) {
  const versions = [];
  for (const { versionId, code, dependencies } of project.versions) {
    versions.push({
      versionId,
      dependencies,
      entities: await toEntities(code),
    });
  }
  result.push({
    groupId: project.groupId,
    artifactId: project.artifactId,
    projectId: project.projectId,
    versions,
  });
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`);
console.log(
  `Wrote ${OUT}: ${result
    .map((project) => `${project.artifactId} (${project.versions.map((version) => version.versionId).join(', ')})`)
    .join('; ')}`,
);
