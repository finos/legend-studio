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

import type { TestSDLCProject } from '../support/TEST_DATA__SDLC.js';

/**
 * The project the Legend Studio guide's screenshots show: a firm and the
 * people it employs, kept in an H2 database the engine creates for each run,
 * so queries, tests and services run for real.
 */
export const GUIDE_PROJECT: TestSDLCProject = {
  project: {
    projectId: '1042',
    name: 'firm-model',
    description: 'Firms and the people they employ',
    tags: [],
    webUrl: 'https://gitlab.example.com/legend/firm-model',
  },
  workspaceId: 'firm-employees',
  currentUser: { userId: 'ada.lovelace', name: 'Ada Lovelace' },
  configuration: {
    projectStructureVersion: { version: 13, extensionVersion: 1 },
    projectId: '1042',
    groupId: 'org.finos.legend.guide',
    artifactId: 'firm-model',
    projectDependencies: [],
    metamodelDependencies: [],
  },
};

/** Where the guide's workspace opens in the editor */
export const GUIDE_WORKSPACE_URL = `edit/${GUIDE_PROJECT.project.projectId}/${GUIDE_PROJECT.workspaceId}/`;

/** The guide project's model, store, mappings, connection, runtime and service */
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

Class guide::model::LegalEntity
{
  legalName: String[1];
}

Class <<guide::model::Governance.critical>> {guide::model::Governance.owner = 'Reference Data', guide::model::Governance.description = 'A company that employs people'} guide::model::Firm extends guide::model::LegalEntity
[
  hasEmployees: $this.employees->isNotEmpty()
]
{
  incType: guide::model::IncType[1];
  employeeCount() {$this.employees->size()}: Integer[1];
}

Class guide::model::Person
[
  ageIsPositive: $this.age->isEmpty() || ($this.age->toOne() > 0)
]
{
  firstName: String[1];
  lastName: String[1];
  age: Integer[0..1];
  fullName() {$this.firstName + ' ' + $this.lastName}: String[1];
}

Association guide::model::Firm_Person
{
  employer: guide::model::Firm[0..1];
  employees: guide::model::Person[*];
}

Class guide::reporting::EmployeeRecord
{
  name: String[1];
  firm: String[0..1];
}

function guide::functions::greeting(person: guide::model::Person[1]): String[1]
{
  'Hello, ' + $person.firstName + '!'
}

function guide::functions::initials(firstName: String[1], lastName: String[1]): String[1]
{
  $firstName->substring(0, 1) + $lastName->substring(0, 1)
}
{
  adaLovelace | initials('Ada', 'Lovelace') => 'AL';
  alanTuring | initials('Alan', 'Turing') => 'AT';
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

  testSuites:
  [
    firmSuite:
    {
      function: |guide::model::Firm.all()->project(
        [
          x|$x.legalName,
          x|$x.employeeCount
        ],
        [
          'Legal Name',
          'Employees'
        ]
      );
      tests:
      [
        countsEmployees:
        {
          data:
          [
            guide::store::FirmDatabase:
              Relational
              #{
                default.FIRM:
                  'ID,LEGAL_NAME,INC_TYPE\n'+
                  '1,Acme Corp,CORP\n';

                default.PERSON:
                  'ID,FIRST_NAME,LAST_NAME,AGE,FIRM_ID\n'+
                  '1,Ada,Lovelace,36,1\n'+
                  '2,Alan,Turing,41,1\n';
              }#
          ];
          asserts:
          [
            expectedFirms:
              EqualToJson
              #{
                expected:
                  ExternalFormat
                  #{
                    contentType: 'application/json';
                    data: '[\n  {\n    "Legal Name": "Acme Corp",\n    "Employees": 2\n  }\n]';
                  }#;
              }#
          ];
        }
      ];
    }
  ]
)

Mapping guide::mapping::EmployeeRecordMapping
(
  *guide::reporting::EmployeeRecord: Pure
  {
    ~src guide::model::Person
    name: $src.fullName,
    firm: $src.employer.legalName
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
      'insert into PERSON values (5, \'Edsger\', \'Dijkstra\', 42, 3);'
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
  testSuites:
  [
    employeesSuite:
    {
      data:
      [
        connections:
        [
          connection_1:
            Relational
            #{
              default.FIRM:
                'ID,LEGAL_NAME,INC_TYPE\n'+
                '1,Acme Corp,CORP\n';

              default.PERSON:
                'ID,FIRST_NAME,LAST_NAME,AGE,FIRM_ID\n'+
                '1,Ada,Lovelace,36,1\n';
            }#
        ]
      ]
      tests:
      [
        listsEmployees:
        {
          serializationFormat: PURE_TDSOBJECT;
          asserts:
          [
            expectedEmployees:
              EqualToJson
              #{
                expected:
                  ExternalFormat
                  #{
                    contentType: 'application/json';
                    data: '[ {\n  "First Name" : "Ada",\n  "Last Name" : "Lovelace",\n  "Firm" : "Acme Corp"\n} ]';
                  }#;
              }#
          ]
        }
      ]
    }
  ]
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
`;
