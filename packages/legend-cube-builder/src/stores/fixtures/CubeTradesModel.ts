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

// The trades sample: made-up trades of the first half of 2026 by six desks in
// made-up instruments, in an in-memory H2 database the engine fills from the
// model's setup SQL

export const CUBE_TRADES_DATABASE = 'cube::samples::trades::TradesDatabase';
export const CUBE_TRADES_CONNECTION = 'cube::samples::trades::TradesConnection';
export const CUBE_TRADES_RUNTIME = 'cube::samples::trades::TradesRuntime';
export const CUBE_TRADES_SCHEMA = 'TRADES_SAMPLE';
export const CUBE_TRADES_TRADE_COUNT = 400;

/** Each desk, its region, and the asset classes it trades */
const DESKS: readonly (readonly [string, string, readonly string[]])[] = [
  ['Equities Cash', 'Americas', ['Equity']],
  ['Equity Derivatives', 'Europe', ['Equity', 'Commodity']],
  ['Rates', 'Americas', ['Bond', 'FX']],
  ['Credit', 'Europe', ['Bond']],
  ['FX', 'Asia', ['FX']],
  ['Commodities', 'Americas', ['Commodity', 'FX']],
];

/** Each instrument: symbol, name, asset class, currency and a typical price */
const INSTRUMENTS: readonly (readonly [
  string,
  string,
  string,
  string,
  number,
])[] = [
  ['ACME', 'Acme Industries', 'Equity', 'USD', 182.5],
  ['GLBX', 'Globex Corp', 'Equity', 'USD', 64.2],
  ['INIT', 'Initech', 'Equity', 'USD', 23.75],
  ['UMBR', 'Umbrella Holdings', 'Equity', 'EUR', 96.4],
  ['STRK', 'Stark Works', 'Equity', 'EUR', 310.1],
  ['UST10', 'Treasury 10Y', 'Bond', 'USD', 98.6],
  ['UST2', 'Treasury 2Y', 'Bond', 'USD', 99.8],
  ['BUND10', 'Bund 10Y', 'Bond', 'EUR', 101.3],
  ['ACME28', 'Acme 4.5% 2028', 'Bond', 'USD', 97.2],
  ['EURUSD', 'Euro / Dollar', 'FX', 'USD', 1.0875],
  ['USDJPY', 'Dollar / Yen', 'FX', 'JPY', 148.35],
  ['GBPUSD', 'Pound / Dollar', 'FX', 'USD', 1.265],
  ['GOLD', 'Gold', 'Commodity', 'USD', 2350.0],
  ['BRENT', 'Brent Crude', 'Commodity', 'USD', 82.4],
  ['COPPER', 'Copper', 'Commodity', 'USD', 4.15],
];

/** What a unit of each currency is worth in dollars, fixed for the sample */
export const CUBE_TRADES_USD_RATES: ReadonlyMap<string, number> = new Map([
  ['USD', 1],
  ['EUR', 1.08],
  ['JPY', 0.0067],
]);

/** How many units a trade of an asset class is for, at most */
const MAX_QUANTITY = new Map([
  ['Equity', 5_000],
  ['Bond', 2_000],
  ['FX', 1_000_000],
  ['Commodity', 1_000],
]);

/** A whole number of ten-thousandths as a decimal text, e.g. 12345 is 1.2345 */
const fromTenThousandths = (value: number, scale: number): string => {
  const text = String(value).padStart(5, '0');
  const whole = text.slice(0, -4);
  const fraction = text.slice(-4).slice(0, scale);
  return scale === 0 ? whole : `${whole}.${fraction}`;
};

const createTrades = (): SampleSqlValue[][] => {
  const random = createSampleRandom(20260102);
  const trades: SampleSqlValue[][] = [];
  for (let id = 1; id <= CUBE_TRADES_TRADE_COUNT; id++) {
    const deskIndex = Math.floor(random() * DESKS.length);
    const [, , assetClasses] = pickSample(DESKS, deskIndex / DESKS.length);
    const assetClass = pickSample(assetClasses, random());
    const choices = INSTRUMENTS.flatMap((instrument, index) =>
      instrument[2] === assetClass ? [index] : [],
    );
    const instrumentIndex = pickSample(choices, random());
    const [, , , currency, price] = pickSample(
      INSTRUMENTS,
      instrumentIndex / INSTRUMENTS.length,
    );
    const quantity = Math.max(
      1,
      Math.round(random() * (MAX_QUANTITY.get(assetClass) ?? 1_000)),
    );
    // prices move up to 5% either way, kept to four decimals
    const priceInTenThousandths = Math.round(
      price * (0.95 + random() * 0.1) * 10_000,
    );
    // the notional in dollars, at a fixed rate, kept to cents
    const notionalInTenThousandths =
      Math.round(
        (quantity *
          priceInTenThousandths *
          (CUBE_TRADES_USD_RATES.get(currency) ?? 1)) /
          100,
      ) * 100;
    // trading days: Monday to Friday
    let day = Math.floor(random() * 181);
    while ([0, 6].includes(new Date(Date.UTC(2026, 0, 1 + day)).getUTCDay())) {
      day = (day + 1) % 181;
    }
    trades.push([
      id,
      { date: addSampleDays('2026-01-01', day) },
      deskIndex + 1,
      instrumentIndex + 1,
      random() < 0.5 ? 'BUY' : 'SELL',
      quantity,
      { decimal: fromTenThousandths(priceInTenThousandths, 4) },
      { decimal: fromTenThousandths(notionalInTenThousandths, 2) },
    ]);
  }
  return trades;
};

/** The SQL that makes and fills the tables, run on every connection checkout */
export const CUBE_TRADES_SETUP_SQLS = [
  `drop schema if exists ${CUBE_TRADES_SCHEMA} cascade`,
  `create schema ${CUBE_TRADES_SCHEMA}`,
  `create table ${CUBE_TRADES_SCHEMA}.DESKS (ID INTEGER PRIMARY KEY, DESK VARCHAR(20) NOT NULL, REGION VARCHAR(10) NOT NULL)`,
  sampleInsert(
    `${CUBE_TRADES_SCHEMA}.DESKS`,
    DESKS.map(([desk, region], index) => [index + 1, desk, region]),
  ),
  `create table ${CUBE_TRADES_SCHEMA}.INSTRUMENTS (ID INTEGER PRIMARY KEY, SYMBOL VARCHAR(10) NOT NULL, INSTRUMENT VARCHAR(30) NOT NULL, ASSET_CLASS VARCHAR(10) NOT NULL, CURRENCY VARCHAR(3) NOT NULL)`,
  sampleInsert(
    `${CUBE_TRADES_SCHEMA}.INSTRUMENTS`,
    INSTRUMENTS.map(([symbol, name, assetClass, currency], index) => [
      index + 1,
      symbol,
      name,
      assetClass,
      currency,
    ]),
  ),
  `create table ${CUBE_TRADES_SCHEMA}.TRADES (TRADE_ID INTEGER PRIMARY KEY, TRADE_DATE DATE NOT NULL, DESK_ID INTEGER NOT NULL, INSTRUMENT_ID INTEGER NOT NULL, SIDE VARCHAR(4) NOT NULL, QUANTITY INTEGER NOT NULL, PRICE DECIMAL(14,4) NOT NULL, NOTIONAL_USD DECIMAL(18,2) NOT NULL)`,
  sampleInsert(`${CUBE_TRADES_SCHEMA}.TRADES`, createTrades()),
];

export const CUBE_TRADES_MODEL_CODE = `###Relational
Database ${CUBE_TRADES_DATABASE}
(
  Schema ${CUBE_TRADES_SCHEMA}
  (
    Table DESKS
    (
      ID INTEGER PRIMARY KEY,
      DESK VARCHAR(20) NOT NULL,
      REGION VARCHAR(10) NOT NULL
    )
    Table INSTRUMENTS
    (
      ID INTEGER PRIMARY KEY,
      SYMBOL VARCHAR(10) NOT NULL,
      INSTRUMENT VARCHAR(30) NOT NULL,
      ASSET_CLASS VARCHAR(10) NOT NULL,
      CURRENCY VARCHAR(3) NOT NULL
    )
    Table TRADES
    (
      TRADE_ID INTEGER PRIMARY KEY,
      TRADE_DATE DATE NOT NULL,
      DESK_ID INTEGER NOT NULL,
      INSTRUMENT_ID INTEGER NOT NULL,
      SIDE VARCHAR(4) NOT NULL,
      QUANTITY INTEGER NOT NULL,
      PRICE DECIMAL(14,4) NOT NULL,
      NOTIONAL_USD DECIMAL(18,2) NOT NULL
    )
  )

  Join TRADE_DESK(${CUBE_TRADES_SCHEMA}.TRADES.DESK_ID = ${CUBE_TRADES_SCHEMA}.DESKS.ID)
  Join TRADE_INSTRUMENT(${CUBE_TRADES_SCHEMA}.TRADES.INSTRUMENT_ID = ${CUBE_TRADES_SCHEMA}.INSTRUMENTS.ID)
)


###Connection
RelationalDatabaseConnection ${CUBE_TRADES_CONNECTION}
{
  store: ${CUBE_TRADES_DATABASE};
  type: H2;
  specification: LocalH2
  {
    testDataSetupSqls: [
${toPureSetupSqls(CUBE_TRADES_SETUP_SQLS)}
    ];
  };
  auth: DefaultH2;
}


###Runtime
Runtime ${CUBE_TRADES_RUNTIME}
{
  mappings:
  [
  ];
  connections:
  [
    ${CUBE_TRADES_DATABASE}:
    [
      connection_1: ${CUBE_TRADES_CONNECTION}
    ]
  ];
}
`;

/** The trades sample as a cube saves it (PLAN §6.2.2) */
export const CUBE_TRADES_MODEL: ModelContext = Object.freeze({
  _type: 'text',
  code: CUBE_TRADES_MODEL_CODE,
});
