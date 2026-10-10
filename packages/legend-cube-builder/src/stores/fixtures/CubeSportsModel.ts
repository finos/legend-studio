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
import {
  addSampleDays,
  createSampleRandom,
  pickSample,
  sampleInsert,
  type SampleSqlValue,
  toPureSetupSqls,
} from './CubeSampleSql.js';

// The sports sample: made-up events of 2025 and how many watched them, in an
// in-memory H2 database the engine fills from the model's setup SQL

export const CUBE_SPORTS_DATABASE = 'cube::samples::sports::SportsDatabase';
export const CUBE_SPORTS_CONNECTION = 'cube::samples::sports::SportsConnection';
export const CUBE_SPORTS_RUNTIME = 'cube::samples::sports::SportsRuntime';
export const CUBE_SPORTS_SCHEMA = 'SPORTS_SAMPLE';
export const CUBE_SPORTS_EVENT_COUNT = 360;

/** Each sport, and the millions who watch a typical event of it */
const SPORTS: readonly (readonly [string, string, number])[] = [
  ['Football', 'Team', 40],
  ['Basketball', 'Team', 18],
  ['Cricket', 'Team', 30],
  ['Tennis', 'Individual', 9],
  ['American Football', 'Team', 22],
  ['Baseball', 'Team', 8],
  ['Ice Hockey', 'Team', 5],
  ['Motor Racing', 'Individual', 12],
  ['Golf', 'Individual', 4],
  ['Rugby', 'Team', 7],
];

/** Each region, and how much it watches each sport, in SPORTS' order */
const REGIONS: readonly (readonly [string, readonly number[]])[] = [
  ['Europe', [1.6, 0.5, 0.3, 1.2, 0.2, 0.1, 0.6, 1.4, 0.8, 1.3]],
  ['Americas', [0.8, 1.6, 0.1, 0.9, 2.2, 1.8, 1.2, 0.9, 1.3, 0.3]],
  ['Asia', [1.0, 1.1, 2.4, 0.7, 0.1, 0.6, 0.1, 0.8, 0.5, 0.2]],
  ['Africa', [1.2, 0.3, 0.6, 0.3, 0.1, 0.1, 0.1, 0.3, 0.3, 0.9]],
  ['Oceania', [0.4, 0.3, 0.9, 0.6, 0.1, 0.1, 0.1, 0.5, 0.6, 1.4]],
];

/** Each stage, and how much more a stage's event is watched */
const STAGES: readonly (readonly [string, number])[] = [
  ['Group', 0.6],
  ['Group', 0.6],
  ['Group', 0.6],
  ['Group', 0.6],
  ['Quarterfinal', 1.1],
  ['Quarterfinal', 1.1],
  ['Semifinal', 1.6],
  ['Final', 2.8],
];

const COMPETITIONS = ['Cup', 'League', 'Open', 'Championship'];

const createEvents = (): SampleSqlValue[][] => {
  const random = createSampleRandom(20250101);
  const events: SampleSqlValue[][] = [];
  for (let id = 1; id <= CUBE_SPORTS_EVENT_COUNT; id++) {
    const sportIndex = Math.floor(random() * SPORTS.length);
    const [sport, , millions] = pickSample(SPORTS, sportIndex / SPORTS.length);
    const [region, interest] = pickSample(REGIONS, random());
    const [stage, stageFactor] = pickSample(STAGES, random());
    const competition = `${region} ${sport} ${pickSample(COMPETITIONS, random())}`;
    const viewers = Math.round(
      millions *
        1_000_000 *
        (interest[sportIndex] ?? 1) *
        stageFactor *
        (0.6 + random() * 0.8),
    );
    // about one event in ten has no attendance recorded
    const attendance =
      random() < 0.1 ? null : Math.round(5_000 + random() * 85_000);
    events.push([
      id,
      sportIndex + 1,
      competition,
      stage,
      { date: addSampleDays('2025-01-01', Math.floor(random() * 365)) },
      region,
      viewers,
      attendance,
    ]);
  }
  return events;
};

/** The SQL that makes and fills the tables, run on every connection checkout */
export const CUBE_SPORTS_SETUP_SQLS = [
  `drop schema if exists ${CUBE_SPORTS_SCHEMA} cascade`,
  `create schema ${CUBE_SPORTS_SCHEMA}`,
  `create table ${CUBE_SPORTS_SCHEMA}.SPORTS (ID INTEGER PRIMARY KEY, SPORT VARCHAR(20) NOT NULL, KIND VARCHAR(10) NOT NULL)`,
  sampleInsert(
    `${CUBE_SPORTS_SCHEMA}.SPORTS`,
    SPORTS.map(([sport, kind], index) => [index + 1, sport, kind]),
  ),
  `create table ${CUBE_SPORTS_SCHEMA}.EVENTS (EVENT_ID INTEGER PRIMARY KEY, SPORT_ID INTEGER NOT NULL, COMPETITION VARCHAR(40) NOT NULL, STAGE VARCHAR(12) NOT NULL, EVENT_DATE DATE NOT NULL, REGION VARCHAR(10) NOT NULL, VIEWERS BIGINT NOT NULL, ATTENDANCE INTEGER)`,
  sampleInsert(`${CUBE_SPORTS_SCHEMA}.EVENTS`, createEvents()),
];

export const CUBE_SPORTS_MODEL_CODE = `###Relational
Database ${CUBE_SPORTS_DATABASE}
(
  Schema ${CUBE_SPORTS_SCHEMA}
  (
    Table SPORTS
    (
      ID INTEGER PRIMARY KEY,
      SPORT VARCHAR(20) NOT NULL,
      KIND VARCHAR(10) NOT NULL
    )
    Table EVENTS
    (
      EVENT_ID INTEGER PRIMARY KEY,
      SPORT_ID INTEGER NOT NULL,
      COMPETITION VARCHAR(40) NOT NULL,
      STAGE VARCHAR(12) NOT NULL,
      EVENT_DATE DATE NOT NULL,
      REGION VARCHAR(10) NOT NULL,
      VIEWERS BIGINT NOT NULL,
      ATTENDANCE INTEGER
    )
  )

  Join EVENT_SPORT(${CUBE_SPORTS_SCHEMA}.EVENTS.SPORT_ID = ${CUBE_SPORTS_SCHEMA}.SPORTS.ID)
)


###Connection
RelationalDatabaseConnection ${CUBE_SPORTS_CONNECTION}
{
  store: ${CUBE_SPORTS_DATABASE};
  type: H2;
  specification: LocalH2
  {
    testDataSetupSqls: [
${toPureSetupSqls(CUBE_SPORTS_SETUP_SQLS)}
    ];
  };
  auth: DefaultH2;
}


###Runtime
Runtime ${CUBE_SPORTS_RUNTIME}
{
  mappings:
  [
  ];
  connections:
  [
    ${CUBE_SPORTS_DATABASE}:
    [
      connection_1: ${CUBE_SPORTS_CONNECTION}
    ]
  ];
}
`;

/** The sports sample as a cube saves it (PLAN §6.2.2) */
export const CUBE_SPORTS_MODEL: ModelContext = Object.freeze({
  _type: 'text',
  code: CUBE_SPORTS_MODEL_CODE,
});
