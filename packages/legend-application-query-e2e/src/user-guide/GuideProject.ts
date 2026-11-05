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

/**
 * The project the Legend Query guide's screenshots query, as the depot serves
 * a released version of it: the Legend Studio guide's firm-model (see
 * `legend-application-studio-e2e/src/user-guide/GuideProject.ts`), with its
 * tests left out, a few more people, and a second execution context and a
 * template query in its data space. Its databases are H2 databases the engine
 * creates for each run, so queries run for real.
 */
export const GUIDE_PROJECT = {
  projectId: 'FIRM-1042',
  groupId: 'org.finos.legend.guide',
  artifactId: 'firm-model',
  versionId: '1.0.0',
};

/** The person the screenshots are taken as */
export const GUIDE_USER = 'ada.lovelace';

export const GUIDE_DATA_SPACE_PATH = 'guide::dataspace::FirmData';
export const GUIDE_DATA_SPACE_TITLE = 'Firm data';
export const GUIDE_EXECUTION_CONTEXT = 'Firm database';
export const GUIDE_SAMPLE_EXECUTION_CONTEXT = 'Sample data';

/** The guide project's model, stores, mappings, runtimes, service and data space */
export const GUIDE_MODEL = String.raw`
###Pure
Profile guide::model::Governance
{
  stereotypes: [critical, deprecated];
  tags: [owner, description];
}

Enum guide::model::IncType
{
  LLC,
  CORP
}

Class {meta::pure::profiles::doc.doc = 'Anything with a legal name, such as a company'} guide::model::LegalEntity
{
  {meta::pure::profiles::doc.doc = 'The name it is registered under'} legalName: String[1];
}

Class <<guide::model::Governance.critical>> {guide::model::Governance.owner = 'Reference Data', guide::model::Governance.description = 'A company that employs people', meta::pure::profiles::doc.doc = 'A company that employs people'} guide::model::Firm extends guide::model::LegalEntity
[
  hasEmployees: $this.employees->isNotEmpty()
]
{
  {meta::pure::profiles::doc.doc = 'How the firm is incorporated'} incType: guide::model::IncType[1];
  {meta::pure::profiles::doc.doc = 'How many people the firm employs'} employeeCount() {$this.employees->size()}: Integer[1];
}

Class {meta::pure::profiles::doc.doc = 'Someone a firm may employ'} guide::model::Person
[
  ageIsPositive: $this.age->isEmpty() || ($this.age->toOne() > 0)
]
{
  firstName: String[1];
  lastName: String[1];
  {meta::pure::profiles::doc.doc = 'Age in years, when known'} age: Integer[0..1];
  fullName() {$this.firstName + ' ' + $this.lastName}: String[1];
}

Association guide::model::Firm_Person
{
  employer: guide::model::Firm[0..1];
  employees: guide::model::Person[*];
}


###Relational
Database guide::store::FirmDatabase
(
  Table FIRM
  (
    ID INTEGER PRIMARY KEY,
    LEGAL_NAME VARCHAR(200),
    INC_TYPE VARCHAR(10)
  )
  Table PERSON
  (
    ID INTEGER PRIMARY KEY,
    FIRST_NAME VARCHAR(200),
    LAST_NAME VARCHAR(200),
    AGE INTEGER,
    FIRM_ID INTEGER
  )

  Join FirmPerson(FIRM.ID = PERSON.FIRM_ID)
)


###Mapping
Mapping guide::mapping::FirmMapping
(
  guide::model::IncType: EnumerationMapping IncTypeMapping
  {
    LLC: ['LLC'],
    CORP: ['CORP']
  }
  *guide::model::Firm: Relational
  {
    ~primaryKey
    (
      [guide::store::FirmDatabase]FIRM.ID
    )
    ~mainTable [guide::store::FirmDatabase]FIRM
    legalName: [guide::store::FirmDatabase]FIRM.LEGAL_NAME,
    incType: EnumerationMapping IncTypeMapping: [guide::store::FirmDatabase]FIRM.INC_TYPE
  }
  *guide::model::Person: Relational
  {
    ~primaryKey
    (
      [guide::store::FirmDatabase]PERSON.ID
    )
    ~mainTable [guide::store::FirmDatabase]PERSON
    firstName: [guide::store::FirmDatabase]PERSON.FIRST_NAME,
    lastName: [guide::store::FirmDatabase]PERSON.LAST_NAME,
    age: [guide::store::FirmDatabase]PERSON.AGE
  }

  guide::model::Firm_Person: Relational
  {
    AssociationMapping
    (
      employer[guide_model_Person, guide_model_Firm]: [guide::store::FirmDatabase]@FirmPerson,
      employees[guide_model_Firm, guide_model_Person]: [guide::store::FirmDatabase]@FirmPerson
    )
  }
)


###Connection
RelationalDatabaseConnection guide::store::FirmConnection
{
  store: guide::store::FirmDatabase;
  type: H2;
  specification: LocalH2
  {
    testDataSetupSqls: [
      'drop table if exists FIRM;',
      'drop table if exists PERSON;',
      'create table FIRM(ID INTEGER, LEGAL_NAME VARCHAR(200), INC_TYPE VARCHAR(10));',
      'create table PERSON(ID INTEGER, FIRST_NAME VARCHAR(200), LAST_NAME VARCHAR(200), AGE INTEGER, FIRM_ID INTEGER);',
      'insert into FIRM values (1, \'Acme Corp\', \'CORP\');',
      'insert into FIRM values (2, \'Globex\', \'LLC\');',
      'insert into FIRM values (3, \'Initech\', \'LLC\');',
      'insert into PERSON values (1, \'Ada\', \'Lovelace\', 36, 1);',
      'insert into PERSON values (2, \'Alan\', \'Turing\', 41, 1);',
      'insert into PERSON values (3, \'Grace\', \'Hopper\', 45, 2);',
      'insert into PERSON values (4, \'Katherine\', \'Johnson\', 38, 2);',
      'insert into PERSON values (5, \'Edsger\', \'Dijkstra\', 42, 3);',
      'insert into PERSON values (6, \'Claude\', \'Shannon\', 44, 1);',
      'insert into PERSON values (7, \'Charles\', \'Babbage\', 48, 2);',
      'insert into PERSON values (8, \'Hedy\', \'Lamarr\', 39, 3);'
      ];
  };
  auth: DefaultH2;
}

RelationalDatabaseConnection guide::store::SampleConnection
{
  store: guide::store::FirmDatabase;
  type: H2;
  specification: LocalH2
  {
    testDataSetupSqls: [
      'drop table if exists FIRM;',
      'drop table if exists PERSON;',
      'create table FIRM(ID INTEGER, LEGAL_NAME VARCHAR(200), INC_TYPE VARCHAR(10));',
      'create table PERSON(ID INTEGER, FIRST_NAME VARCHAR(200), LAST_NAME VARCHAR(200), AGE INTEGER, FIRM_ID INTEGER);',
      'insert into FIRM values (1, \'Acme Corp\', \'CORP\');',
      'insert into FIRM values (2, \'Globex\', \'LLC\');',
      'insert into PERSON values (1, \'Ada\', \'Lovelace\', 36, 1);',
      'insert into PERSON values (2, \'Alan\', \'Turing\', 41, 1);',
      'insert into PERSON values (3, \'Grace\', \'Hopper\', 45, 2);'
      ];
  };
  auth: DefaultH2;
}


###Runtime
Runtime guide::store::FirmRuntime
{
  mappings:
  [
    guide::mapping::FirmMapping
  ];
  connections:
  [
    guide::store::FirmDatabase:
    [
      connection_1: guide::store::FirmConnection
    ]
  ];
}

Runtime guide::store::SampleRuntime
{
  mappings:
  [
    guide::mapping::FirmMapping
  ];
  connections:
  [
    guide::store::FirmDatabase:
    [
      connection_1: guide::store::SampleConnection
    ]
  ];
}


###Service
Service guide::service::FirmEmployees
{
  pattern: '/guide/firms/employees';
  title: 'Firm employees';
  ownership: UserList { users: ['ada.lovelace', 'grace.hopper'] };
  documentation: 'Every person, with the firm they work for.';
  autoActivateUpdates: true;
  execution: Single
  {
    query: |guide::model::Person.all()->project(
      [
        x|$x.firstName,
        x|$x.lastName,
        x|$x.employer.legalName
      ],
      [
        'First Name',
        'Last Name',
        'Firm'
      ]
    );
    mapping: guide::mapping::FirmMapping;
    runtime: guide::store::FirmRuntime;
  }
}


###Diagram
Diagram guide::model::FirmDiagram
{
  classView 1a2b3c4d-0001-4000-8000-000000000001
  {
    class: guide::model::LegalEntity;
    position: (40.0,20.0);
    rectangle: (180.0,58.0);
  }
  classView 1a2b3c4d-0002-4000-8000-000000000002
  {
    class: guide::model::Firm;
    position: (40.0,180.0);
    rectangle: (230.0,86.0);
  }
  classView 1a2b3c4d-0003-4000-8000-000000000003
  {
    class: guide::model::Person;
    position: (420.0,180.0);
    rectangle: (200.0,100.0);
  }
  propertyView
  {
    property: guide::model::Firm_Person.employees;
    source: 1a2b3c4d-0002-4000-8000-000000000002;
    target: 1a2b3c4d-0003-4000-8000-000000000003;
    points: [(155.0,223.0),(520.0,230.0)];
  }
  generalizationView
  {
    source: 1a2b3c4d-0002-4000-8000-000000000002;
    target: 1a2b3c4d-0001-4000-8000-000000000001;
    points: [(155.0,223.0),(130.0,49.0)];
  }
}


###DataSpace
DataSpace guide::dataspace::FirmData
{
  executionContexts:
  [
    {
      name: 'Firm database';
      title: 'Firm database';
      description: 'Firms and the people they employ, from the firm database';
      mapping: guide::mapping::FirmMapping;
      defaultRuntime: guide::store::FirmRuntime;
    },
    {
      name: 'Sample data';
      title: 'Sample data';
      description: 'A few firms and people, to try queries on';
      mapping: guide::mapping::FirmMapping;
      defaultRuntime: guide::store::SampleRuntime;
    }
  ];
  defaultExecutionContext: 'Firm database';
  title: 'Firm data';
  description: 'Firms, the people they employ, and the services that list them.';
  diagrams:
  [
    {
      title: 'Firms and their employees';
      description: 'A firm, the legal entity it is, and the people it employs';
      diagram: guide::model::FirmDiagram;
    }
  ];
  elements:
  [
    guide::model
  ];
  executables:
  [
    {
      title: 'Firm employees';
      description: 'Every person, with the firm they work for';
      executable: guide::service::FirmEmployees;
    },
    {
      id: headcount;
      title: 'Headcount by firm';
      description: 'How many people each firm employs';
      query: |guide::model::Person.all()->groupBy([x|$x.employer.legalName], [agg(x|$x.firstName, y|$y->count())], ['Firm', 'Employees']);
      executionContextKey: 'Firm database';
    }
  ];
  supportInfo: Combined {
    documentationUrl: 'https://legend.finos.org/guides/query';
    emails:
    [
      'firm-model@example.com'
    ];
  };
}
`;

/**
 * Data spaces other projects released, which the data space list shows
 * beside the guide's own; the guide doesn't open them
 */
export const OTHER_DATA_SPACES = [
  {
    groupId: 'org.finos.legend.guide',
    artifactId: 'trade-model',
    versionId: '2.3.0',
    path: 'trades::dataspace::TradeData',
    title: 'Trade data',
    executionContext: 'Trades',
  },
  {
    groupId: 'org.finos.legend.guide',
    artifactId: 'reference-data',
    versionId: '1.4.0',
    path: 'refdata::dataspace::Countries',
    title: 'Countries',
    executionContext: 'Countries',
  },
];

/** Someone else's queries, and the guide user's own, saved before the guide starts */
export const GUIDE_SAVED_QUERIES = [
  {
    id: 'firm-headcount',
    name: 'Headcount by firm',
    description: 'How many people each firm employs',
    owner: 'grace.hopper',
    daysAgo: 12,
    content:
      "|guide::model::Person.all()->groupBy([x|$x.employer.legalName], [agg(x|$x.firstName, y|$y->count())], ['Firm', 'Employees'])",
  },
  {
    id: 'firms-by-type',
    name: 'Firms by incorporation type',
    description: 'Each firm, with how it is incorporated',
    owner: 'alan.turing',
    daysAgo: 9,
    content:
      "|guide::model::Firm.all()->project([x|$x.legalName, x|$x.incType], ['Legal Name', 'Inc Type'])->sort([asc('Inc Type')])",
  },
  {
    id: 'people-at-a-firm',
    name: 'People at a firm',
    description: 'The people a firm employs, by its legal name',
    owner: GUIDE_USER,
    daysAgo: 5,
    content:
      "firm: String[1]|guide::model::Person.all()->filter(x|$x.employer.legalName == $firm)->project([x|$x.firstName, x|$x.lastName], ['First Name', 'Last Name'])",
    defaultParameterValues: [{ name: 'firm', content: "'Acme Corp'" }],
  },
];
