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

// References to resolve in FlatData
// - Includes
export const TEST_DATA__FlatDataRoundtrip = [
  {
    path: 'test::flatDataExample1',
    content: {
      _type: 'flatData',
      name: 'flatDataExample1',
      package: 'test',
      sections: [
        {
          driverId: 'DelimitedWithHeadings',
          name: 'sectionName',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'HEADING1',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'number',
                },
                label: 'HEADING2',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'HEADING3',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'date',
                  dateFormat: ['MM-DD-EE'],
                },
                label: 'HEADING4',
                optional: false,
              },
            ],
          },
          sectionProperties: [],
        },
        {
          driverId: 'DelimitedWithoutHeadings',
          name: 'sectionName2',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                address: '1',
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'HEADING1',
                optional: false,
              },
              {
                address: '2',
                flatDataDataType: {
                  _type: 'number',
                },
                label: 'HEADING2',
                optional: false,
              },
              {
                address: '3',
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'HEADING3',
                optional: true,
              },
              {
                address: '4',
                flatDataDataType: {
                  _type: 'date',
                  dateFormat: ['MM-DD-EE'],
                },
                label: 'HEADING4',
                optional: false,
              },
            ],
          },
          sectionProperties: [],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'test::defaultExample',
    content: {
      _type: 'flatData',
      name: 'defaultExample',
      package: 'test',
      sections: [
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'HEADING1',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'number',
                },
                label: 'HEADING2',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'HEADING3',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'date',
                  dateFormat: ['MM-DD-EE'],
                },
                label: 'HEADING4',
                optional: false,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'delimiter',
              value: [','],
            },
            {
              name: 'quoteChar',
              value: ["'"],
            },
            {
              name: 'escapingChar',
              value: ["'"],
            },
            {
              name: 'nullString',
              value: ['null'],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          imports: [],
          elements: [],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['test::flatDataExample1', 'test::defaultExample'],
          parserName: 'FlatData',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];

export const TEST_DATA__FlatDataRoundtrip2 = [
  {
    path: 'somethingelse::internal::country::CountryCsv',
    content: {
      _type: 'flatData',
      name: 'CountryCsv',
      package: 'somethingelse::internal::country',
      sections: [
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'iso2Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'iso3Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'isoNumericCode',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'isDeprecated',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: [','],
            },
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::aquis::product::AquisEquityCsv',
    content: {
      _type: 'flatData',
      name: 'AquisEquityCsv',
      package: 'somethingelse::abc::aquis::product',
      sections: [
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'isin',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'description',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'primric',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'primBbg',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'operating_mic',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'mic',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'id',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'aqxRic',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'aqxBbg',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'umtf',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'rls',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'test_stock',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'closing_enabled',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'tick name',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: ['\t'],
            },
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::xber::tickLadder::XberTickLadderCsv',
    content: {
      _type: 'flatData',
      name: 'XberTickLadderCsv',
      package: 'somethingelse::abc::xber::tickLadder',
      sections: [
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'RangeID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: ' MinPrice',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: ' Ticksize',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: [','],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::xber::product::XberEquityCsv',
    content: {
      _type: 'flatData',
      name: 'XberEquityCsv',
      package: 'somethingelse::abc::xber::product',
      sections: [
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'InstrumentId',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'InstrumentName',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ISIN',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CURRENCY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'TRADING_MKT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'RMS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SMS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SMS Value',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MQS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Price Tick',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Hybrid Tick RangeID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PartnerEx Tick RangeID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'lotSize',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Reporting MIC',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'HasMM',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'INSTRUMENT_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ADNT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'AVT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PMI',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: [','],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::internal::market::MarketCsv',
    content: {
      _type: 'flatData',
      name: 'MarketCsv',
      package: 'somethingelse::internal::market',
      sections: [
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'mic',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'operatingMic',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'micType',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'country',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'isDeprecated',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: [','],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::turq::product::TurquoiseEquityCsv',
    content: {
      _type: 'flatData',
      name: 'TurquoiseEquityCsv',
      package: 'somethingelse::abc::turq::product',
      sections: [
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Instrument ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Calendar ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Segment Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Post Trade Parameters ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Price Tick Table ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ISIN Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Deletion Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'First Trading Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Instrument Status',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Clearing Type',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Delete Orders at EOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Exchange Market Size',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Pre-Trade LIS Value (Currency)',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Minimum Order Size',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Last Trading Day',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Lot Size',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Security Type',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'TIDM',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Description',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SEDOL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ADT (EUR)',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Currency',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Bid Status',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'DOL Indicator',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'DOL Section Number',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Expiry Source',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issuer Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issuer Name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Normal Market Size',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Ratio',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Settlement Type',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Standard Market Size',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Instrument Name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'DOL Symbol',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Unit of Quotation',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Max Spread Floor',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Max Spread Percentage',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Country of Register',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Covered Warrant Strike Price',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Covered Warrant Expiry',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Sector',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Multicast ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Covered Warrant Strike Currency',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Covered Warrant Type',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Covered Warrant Style',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Reference Price',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Market ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Visibility',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Mifir Identifier',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Mifir Subclass',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Static Reference Price Collar Percentage',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Dynamic Reference Price Collar Percentage ',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Liquid',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ADT (Currency)',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ADNT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'RPW Allowed',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FISN',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Max Order Value Lit (Currency)',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Max Order Value Dark (Currency)',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Notional Currency',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Price Notation',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Denominated Par Value',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Max Order Value Lit Auctions (Currency)',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: [';'],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::ceux::tickLadder::CeuxTickLadderCsv',
    content: {
      _type: 'flatData',
      name: 'CeuxTickLadderCsv',
      package: 'somethingelse::abc::ceux::tickLadder',
      sections: [
        {
          driverId: 'ImmaterialLines',
          name: 'skip',
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.forNumberOfLines',
              value: [1],
            },
          ],
        },
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'tick_type',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'min_price',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'tick_size',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: [','],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::xubs::product::XubsEquityCsv',
    content: {
      _type: 'flatData',
      name: 'XubsEquityCsv',
      package: 'somethingelse::abc::xubs::product',
      sections: [
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'H',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'UMTF',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ISIN',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'DESCRIPTION',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CCY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'LISTING',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MIC',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MINIMUM_LIS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CAPPED',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CAP_END_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PERIODIC_AUCTION_MAX_DURATION',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'TICKRULEID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SUPPORTED_SERVICES',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.default',
              value: [true],
            },
            {
              name: 'delimiter',
              value: [','],
            },
          ],
        },
        {
          driverId: 'ImmaterialLines',
          name: 'footer',
          sectionProperties: [
            {
              name: 'scope.forNumberOfLines',
              value: [1],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::lse::product::LSEEquityCsv',
    content: {
      _type: 'flatData',
      name: 'LSEEquityCsv',
      package: 'somethingelse::abc::lse::product',
      sections: [
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Instrument ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Calendar ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Segment Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Post Trade Parameter ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Trading Parameter ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ISIN Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Deletion Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'First Trading Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Instrument Status',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Clearing Type',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Exchange Market Size',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Pre-Trade LIS Value (Currency)',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Minimum Order Size',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Last Trading Day',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Lot Size',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Security Type',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'TIDM',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Description',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SEDOL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ADT (Currency)',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Currency',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Bid Status',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'DOL Indicator',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'DOL Section Number',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issuer Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issuer Name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Normal Market Size',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Ratio',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Settlement Type',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Standard Market Size',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Instrument Name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'DOL Symbol',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Unit of Quotation',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Max Spread Floor',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Max Spread Percentage',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Country of Register',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Warrant Strike Price',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Warrant Expiry',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Sector',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Warrant Strike Currency',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Warrant Type',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Warrant Style',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Market Data Group',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Cross Ord Bid Ask Spread %',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Floor Price',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Ceiling Price',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Minimum Quantity At Touch',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Mifir Identifier',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Mifir Subclass',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Ref Price Allowance (%)',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'RFQ Price Deviation %',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Minimum RFQ Value (Currency)',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MIC',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Liquid',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ADT (EUR)',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ADNT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'NTW Allowed',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Price Tick Table ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FISN',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Max Order Value (Currency)',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Max BTF Value (Currency)',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Max Cross Value (Currency)',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Max RFQ Value (Currency)',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Notional Currency',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Price Notation',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Denominated Par Value',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: [';'],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::liqu::product::LiquEquityCsv',
    content: {
      _type: 'flatData',
      name: 'LiquEquityCsv',
      package: 'somethingelse::abc::liqu::product',
      sections: [
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'bbId',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'issueName',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'securityType',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'lnSymbol',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'exchMic',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'capped',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'lisMifid2',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'refPrice',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'currency',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'lisShares',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: ['\t'],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::ceux::product::CeuxEquityCsv',
    content: {
      _type: 'flatData',
      name: 'CeuxEquityCsv',
      package: 'somethingelse::abc::ceux::product',
      sections: [
        {
          driverId: 'ImmaterialLines',
          name: 'skip',
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.forNumberOfLines',
              value: [1],
            },
          ],
        },
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'company_name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'bats_name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'isin',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'currency',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'mic',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'reuters_exchange_code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'lis_local',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'live',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'tick_type',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'reference_price',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'bats_prev_close',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'live_date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'bloomberg_primary',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'bloomberg_bats',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'mifid_share',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'asset_class',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'matching_unit',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'euroccp_enabled',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'xclr_enabled',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'lchl_enabled',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'reuters_ric_primary',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'reuters_ric_bats',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'reference_adt_eur',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'csd',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'corporate_action_status',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'supported_services',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'trading_segment',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'printed_name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'periodic_auction_max_duration',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'periodic_auction_min_order_entry_size',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'periodic_auction_min_order_entry_notional',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'max_otr_count',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'max_otr_volume',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'capped',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'venue_cap_percentage',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'venue_uncap_date',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: [','],
            },
            {
              name: 'quoteChar',
              value: ['"'],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::xubs::tickLadder::XubsTickLadderCsv',
    content: {
      _type: 'flatData',
      name: 'XubsTickLadderCsv',
      package: 'somethingelse::abc::xubs::tickLadder',
      sections: [
        {
          driverId: 'ImmaterialLines',
          name: 'skip',
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.forNumberOfLines',
              value: [1],
            },
          ],
        },
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'RuleId',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MinPrice',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MaxPrice',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'TickSize',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: [','],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::lse::tickLadder::LSETickLadderCsv',
    content: {
      _type: 'flatData',
      name: 'LSETickLadderCsv',
      package: 'somethingelse::abc::lse::tickLadder',
      sections: [
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Price Tick Table ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Decimals',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Description',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Max Value',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Min Value',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Tick Value',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: [';'],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::refinitiv::product::ReutersEquityDiffCsv',
    content: {
      _type: 'flatData',
      name: 'ReutersEquityDiffCsv',
      package: 'somethingelse::abc::refinitiv::product',
      sections: [
        {
          driverId: 'ImmaterialLines',
          name: 'skip',
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.forNumberOfLines',
              value: [1],
            },
          ],
        },
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Quote_ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Action',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Asset_Status',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Active_Instrument_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Asset_Ratio_Against',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issue_Price',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Security_Description',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Security_Long_Description',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Refinitiv_Classification_Scheme',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Trading_Status',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Listing_Status',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'When_Distributed_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Settlement_Period',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'First_Trading_Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Share_Class',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Currency_Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Quote_Perm_ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issuer_Name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issuer_LEI',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Country_of_Incorporation',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Company_Legal_Domicile',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Company_Short_Name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issuer_OrgID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Round_Lot_Size',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Market_Segment_MIC',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Operating_Mic',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MIC',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Market_Segment_Name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Primary_Tradable_Market_Quote',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'OPOL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'When_Issued_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Exchange_Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SICC_Securities_Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'NCA_Free_Float',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Suspend_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Common_Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ISIN',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Valoren',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CIN_Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CUSIP',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Wertpapier',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issue_Perm_ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'RIC',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Ticker',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SEDOL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Consolidated_RIC',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Primary_Listed_RIC',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'EU_Short_Sell_Eligible',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Short_Sell_Restriction_Type',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'UK_Stamp_Duty_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Ireland_Stamp_Duty_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Exchange_Market_Size',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Primary_Market',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Primary_Reference_Market_Quote',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Depository_Asset_Underlying',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Asset_Class',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Pre_Trade_SSTI_Threshold_Value',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Standard_Market_Size_Currency_Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Financial_Instrument_Short_Name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CFI_Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Asset_Class_of_Underlying',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SFTR_Security_Type',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'In_ESMA_FIRDS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'EEA_Venue_Eligible_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Threshold_Effective_Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'UK_Venue_Eligible_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'In_FCA_FIRDS_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Underlying_EEA_Venue_Eligible',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Underlying_UK_Venue_Eligible',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Regulation_SHO_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Trading_Symbol',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_COFIA_Liquidity_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Threshold_End_Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Consolidated_Quote_ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Country_Primary_Quote',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FileDate',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ETF_Price_Type',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Is_Test_Instrument',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Is_Composite',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Sub-Asset_Class',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Instrument_Classification_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Instrument_Classification_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Free_Float_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Liquidity_Flag_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Liquidity_Flag_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Average_Value_Of_Transactions_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Pre_Trade_LIS_Threshold_Value',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Pre_Trade_SSTI_Threshold_Value_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Standard_Market_Size_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Standard_Market_Size_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Total_Market_Turnover_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Total_Market_Turnover_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Next_MiFID_Total_Market_Turnover_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label:
                  'Total_Turnover_and_Transactions_Publication_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Total_Number_of_Transactions_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label:
                  'MiFID_Average_Daily_number_of_Trades_per_instrument_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label:
                  'MiFID_Average_Daily_Number_of_Trades_per_Instrument_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Most_Relevant_Market_Segment_MIC_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Most_Relevant_Market_Segment_MIC_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Financial_Instrument_Short_Name_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_First_Trade_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Next_MiFID_Total_Number_of_Transactions_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Suspension_On_Going_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Suspension_Category_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Suspension_Started_On_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Suspension_Ended_On_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: '144A_Registered_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Financial_Instrument_Short_Name_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Listing_Suspension_Notifying_NCA_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Listing_Suspension_Initiator_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Termination_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Percent_Trading_Under_Waivers_12_Month_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Next_Turnover_and_Transactions_Effective_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total_Turnover_and_Transactions_Effective_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Next_Turnover_and_Transactions_Publication_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label:
                  'Total_Turnover_and_Transactions_Calculation_Start_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label:
                  'Next_Turnover_and_Transactions_Calculation_Start_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label:
                  'Total_Turnover_and_Transactions_Calculation_End_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label:
                  'Next_Turnover_and_Transactions_Calculation_End_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Average_Daily_Turnover_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Average_Daily_Turnover_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Post_Trade_LIS_Threshold_Value',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Post_Trade_SSTI_Threshold_Value',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Average_Value_Of_Transactions_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Pre_Trade_LIS_Threshold_Value_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Post_Trade_LIS_Threshold_Value_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Post_Trade_SSTI_Threshold_Value_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issuer_Name_-_Change_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issuer_LEI_-_Change_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Country_of_Incorporation_-_Change_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Company_Legal_Domicile_-_Change_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Company_Short_Name_-_Change_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issuer_OrgID_-_Change_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Market_Segment_MIC_-_Change_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Operating_Mic_-_Change_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Common_Code_-_Change_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ISIN_-_Change_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Valoren_-_Change_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CIN_Code_-_Change_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CUSIP_-_Change_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Wertpapier_-_Change_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'RIC_-_Change_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Ticker_-_Change_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SEDOL_-_Change_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Consolidated_RIC_-_Change_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issuer_Name_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issuer_LEI_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Country_of_Incorporation_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Company_Legal_Domicile_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Company_Short_Name_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issuer_OrgID_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Market_Segment_MIC_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Operating_Mic_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Common_Code_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ISIN_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Valoren_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CIN_Code_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CUSIP_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Wertpapier_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'RIC_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Ticker_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SEDOL_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Consolidated_RIC_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ISIN_-_Venue_-_Change_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ISIN_-_Venue_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Refinitiv_Classification_Scheme_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ETF_Price_Type_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'OPOL_-_Previous',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Is_Composite_-_Previous',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: ['|'],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::bate::tickLadder::BateTickLadderCsv',
    content: {
      _type: 'flatData',
      name: 'BateTickLadderCsv',
      package: 'somethingelse::abc::bate::tickLadder',
      sections: [
        {
          driverId: 'ImmaterialLines',
          name: 'skip',
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.forNumberOfLines',
              value: [1],
            },
          ],
        },
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'tick_type',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'min_price',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'tick_size',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: [','],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::refinitiv::sharesOutstanding::RefinitivSOCsv',
    content: {
      _type: 'flatData',
      name: 'RefinitivSOCsv',
      package: 'somethingelse::abc::refinitiv::sharesOutstanding',
      sections: [
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issue PermID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Quote PermID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ISIN',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CUSIP',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SEDOL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CIN Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Ticker',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'RIC',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issued Shares - Issue Shares Amount',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issued Shares - Other Shares Amount',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issued Shares Change Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Listed Shares - Issue Shares Amount',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Listed Shares Change Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Outstanding Shares - Issue Shares Amount',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Outstanding Shares - Other Shares Amount',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Outstanding Shares Change Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Treasury Shares - Issue Shares Amount',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Treasury Shares - Other Shares Amount',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Treasury Shares Change Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Shares - Default',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Shares - Default - Effective Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Shares - Issued',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Shares - Issued - Effective Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Shares - Listed',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Shares - Listed - Effective Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Shares - Outstanding',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Shares - Outstanding - Effective Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Shares - Treasury',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Shares - Treasury - Effective Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Shares - Unlisted',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Shares - Unlisted - Effective Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Voting Rights - Default',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Voting Rights - Default - Effective Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Voting Rights - Issued',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Voting Rights - Issued - Effective Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Voting Rights - Listed',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Voting Rights - Listed - Effective Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Voting Rights - Outstanding',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Voting Rights - Outstanding - Effective Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Voting Rights - Treasury',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Voting Rights - Treasury - Effective Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Voting Rights - Unlisted',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Voting Rights - Unlisted - Effective Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Voting Rights Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Voting Rights Per Share',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Voting Shares - Default',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Voting Shares - Issued',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Voting Shares - Listed',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Voting Shares - Outstanding',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Voting Shares - Treasury',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total Voting Shares - Unlisted',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Market Capitalization',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Market Capitalization - Local',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Market Capitalization - Local Currency',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Market Capitalization Update Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Is Test Instrument',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Operating MIC',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Market Segment MIC',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Refinitiv Classification Scheme',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Currency Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Primary Trading RIC',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'When Issued Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Suspend Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Listing Status',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Round Lot Size',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Country Primary Quote',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Exchange Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Trading Status',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'recordSeparator',
              value: ['\r\n'],
            },
            {
              name: 'delimiter',
              value: [','],
            },
            {
              name: 'nullString',
              value: [''],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::bate::product::BateEquityCsv',
    content: {
      _type: 'flatData',
      name: 'BateEquityCsv',
      package: 'somethingelse::abc::bate::product',
      sections: [
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'company_name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'bats_name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'isin',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'currency',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'mic',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'reuters_exchange_code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'lis_local',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'live',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'tick_type',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'reference_price',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'bats_prev_close',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'live_date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'bloomberg_primary',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'bloomberg_bats',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'mifid_share',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'asset_class',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'matching_unit',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'euroccp_enabled',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'xclr_enabled',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'lchl_enabled',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'reuters_ric_primary',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'reuters_ric_bats',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'reference_adt_eur',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'csd',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'corporate_action_status',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'supported_services',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'trading_segment',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'printed_name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'periodic_auction_max_duration',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'periodic_auction_min_order_entry_size',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'periodic_auction_min_order_entry_notional',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'max_otr_count',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'max_otr_volume',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'capped',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'venue_cap_percentage',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'venue_uncap_date',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: [','],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::internal::currency::CurrencyCsv',
    content: {
      _type: 'flatData',
      name: 'CurrencyCsv',
      package: 'somethingelse::internal::currency',
      sections: [
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'isoAlphaCode',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'isoNumericCode',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'isDeprecated',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'isMinorUnit',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'isCryptoCurrency',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'hasMajorUnit',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: [','],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::aquis::tickLadder::AquisTickLadderCsv',
    content: {
      _type: 'flatData',
      name: 'AquisTickLadderCsv',
      package: 'somethingelse::abc::aquis::tickLadder',
      sections: [
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'table_id',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'price',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'tick',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: ['\t'],
            },
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::sigmaX::product::SigmaXEquityCsv',
    content: {
      _type: 'flatData',
      name: 'SigmaXEquityCsv',
      package: 'somethingelse::abc::sigmaX::product',
      sections: [
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ISIN',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CCY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MIC',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'NAME',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'UMTF',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'TRADINGCODE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'DECIMALS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MINCPL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MAXCPL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'TICK_ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'DVC',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'LEI',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: [','],
            },
            {
              name: 'quoteChar',
              value: ['"'],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::chix::tickLadder::ChixTickLadderCsv',
    content: {
      _type: 'flatData',
      name: 'ChixTickLadderCsv',
      package: 'somethingelse::abc::chix::tickLadder',
      sections: [
        {
          driverId: 'ImmaterialLines',
          name: 'skip',
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.forNumberOfLines',
              value: [1],
            },
          ],
        },
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'tick_type',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'min_price',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'tick_size',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: [','],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::refinitiv::product::ReutersEquityFullCsv',
    content: {
      _type: 'flatData',
      name: 'ReutersEquityFullCsv',
      package: 'somethingelse::abc::refinitiv::product',
      sections: [
        {
          driverId: 'ImmaterialLines',
          name: 'skip',
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.forNumberOfLines',
              value: [1],
            },
          ],
        },
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Quote_ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Action',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Asset_Status',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Active_Instrument_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Asset_Ratio_Against',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Asset_Ratio_For',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issue_Price',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Security_Description',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Security_Long_Description',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Refinitiv_Classification_Scheme',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Trading_Status',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Listing_Status',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'When_Distributed_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Settlement_Period',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'First_Trading_Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Share_Class',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Currency_Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Quote_Perm_ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Consolidated_Quote_ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Country_Primary_Quote',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issuer_Name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issuer_LEI',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Country_of_Incorporation',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Company_Legal_Domicile',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Company_Short_Name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issuer_OrgID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Round_Lot_Size',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Market_Segment_MIC',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Operating_Mic',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MIC',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Market_Segment_Name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Primary_Tradable_Market_Quote',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'OPOL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'When_Issued_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Exchange_Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SICC_Securities_Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'NCA_Free_Float',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Suspend_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Common_Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ISIN',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ISIN_-_Venue',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Valoren',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CIN_Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CUSIP',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Wertpapier',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Issue_Perm_ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'RIC',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Ticker',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SEDOL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Trading_Symbol',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Consolidated_RIC',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Primary_Listed_RIC',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: '144A_Registered_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'EU_Short_Sell_Eligible',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Short_Sell_Restriction_Type',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'UK_Stamp_Duty_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Ireland_Stamp_Duty_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Exchange_Market_Size',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Primary_Market',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Primary_Reference_Market_Quote',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Depository_Asset_Underlying',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Asset_Class',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Pre_Trade_SSTI_Threshold_Value',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Standard_Market_Size_Currency_Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Financial_Instrument_Short_Name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CFI_Code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Asset_Class_of_Underlying',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SFTR_Security_Type',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'In_ESMA_FIRDS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'EEA_Venue_Eligible_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Threshold_Effective_Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'UK_Venue_Eligible_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'In_FCA_FIRDS_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Underlying_EEA_Venue_Eligible',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Underlying_UK_Venue_Eligible',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_COFIA_Liquidity_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Threshold_End_Date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Pre_Trade_LIS_Threshold_Value',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ETF_Price_Type',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Is_Test_Instrument',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Is_Composite',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Sub-Asset_Class',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Instrument_Classification_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Instrument_Classification_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Free_Float_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Liquidity_Flag_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Liquidity_Flag_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Average_Value_Of_Transactions_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Pre_Trade_SSTI_Threshold_Value_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Standard_Market_Size_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Standard_Market_Size_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Total_Market_Turnover_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Total_Market_Turnover_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Next_MiFID_Total_Market_Turnover_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label:
                  'Total_Turnover_and_Transactions_Publication_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total_Turnover_and_Transactions_Effective_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Total_Number_of_Transactions_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label:
                  'MiFID_Average_Daily_number_of_Trades_per_instrument_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label:
                  'MiFID_Average_Daily_Number_of_Trades_per_Instrument_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Most_Relevant_Market_Segment_MIC_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Most_Relevant_Market_Segment_MIC_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Financial_Instrument_Short_Name_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_First_Trade_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Next_MiFID_Total_Number_of_Transactions_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Suspension_On_Going_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Suspension_Category_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Suspension_Started_On_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Suspension_Ended_On_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Financial_Instrument_Short_Name_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Regulation_SHO_Flag',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Listing_Suspension_Notifying_NCA_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Listing_Suspension_Initiator_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Termination_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Percent_Trading_Under_Waivers_12_Month_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Next_Turnover_and_Transactions_Effective_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Total_Turnover_and_Transactions_Effective_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Next_Turnover_and_Transactions_Publication_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label:
                  'Total_Turnover_and_Transactions_Calculation_Start_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label:
                  'Next_Turnover_and_Transactions_Calculation_Start_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label:
                  'Total_Turnover_and_Transactions_Calculation_End_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label:
                  'Next_Turnover_and_Transactions_Calculation_End_Date_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Average_Daily_Turnover_-_ESMA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Average_Daily_Turnover_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Post_Trade_LIS_Threshold_Value',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Post_Trade_SSTI_Threshold_Value',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Average_Value_Of_Transactions_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Pre_Trade_LIS_Threshold_Value_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Pre_Trade_SSTI_Threshold_Value_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Post_Trade_LIS_Threshold_Value_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Post_Trade_SSTI_Threshold_Value_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MiFID_Standard_Market_Size_-_FCA',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label:
                  'MiFID_Average_Daily_Number_of_Trades_per_Instrument_-_FCA',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: ['|'],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::bloomberg::product::BloombergPreMarketEquityCsv',
    content: {
      _type: 'flatData',
      name: 'BloombergPreMarketEquityCsv',
      package: 'somethingelse::abc::bloomberg::product',
      sections: [
        {
          driverId: 'BloombergFile',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SECURITY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ERROR_COUNT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FIELD_COUNT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SECURITY_TYP',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'EQY_SPLIT_DT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'EQY_SPLIT_RATIO',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ID_COMMON',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ID_CUSIP',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ID_ISIN',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ID_VALOREN',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ID_WERTPAPIER',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ID_BB_GLOBAL_SHARE_CLASS_LEVEL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CNTRY_OF_DOMICILE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CNTRY_OF_INCORPORATION',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ID_BB_COMPANY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ID_BB_PARENT_CO',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PARENT_COMP_NAME',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ID_BB_GLOBAL_COMPANY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ID_BB_GLOBAL_COMPANY_NAME',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CNTRY_ISSUE_ISO',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CRNCY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PRIM_SECURITY_COMP_ID_BB_GLOBAL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'EXCH_CODE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ID_MIC_LOCAL_EXCH',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ID_MIC_PRIM_EXCH',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'NAME',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PAR_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PX_ROUND_LOT_SIZE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PX_TRADE_LOT_SIZE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'EQY_PRIM_EXCH_SHRT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ID_BB_SECURITY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MARKET_STATUS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'TRADE_STATUS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ID_BB_SEC_NUM_DES',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FEED_SOURCE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ID_SEDOL1',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'TICKER',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'TICKER_AND_EXCH_CODE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ID_BB_UNIQUE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ID_EXCH_SYMBOL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ID_BB_GLOBAL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'COMPOSITE_ID_BB_GLOBAL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ID_SEDOL2',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'EQY_SH_OUT_DT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'EQY_SH_OUT_REAL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'UNDERLYING_ID_BB_GLOBAL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PRIMARY_UNDERLYING_ID_BB_GLOBAL',
                optional: true,
              },
            ],
          },
          sectionProperties: [],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::chix::product::ChixEquityCsv',
    content: {
      _type: 'flatData',
      name: 'ChixEquityCsv',
      package: 'somethingelse::abc::chix::product',
      sections: [
        {
          driverId: 'ImmaterialLines',
          name: 'skip',
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.forNumberOfLines',
              value: [1],
            },
          ],
        },
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'company_name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'bats_name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'isin',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'currency',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'mic',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'reuters_exchange_code',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'lis_local',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'live',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'tick_type',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'reference_price',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'bats_prev_close',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'live_date',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'bloomberg_primary',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'bloomberg_bats',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'mifid_share',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'asset_class',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'matching_unit',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'euroccp_enabled',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'xclr_enabled',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'lchl_enabled',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'reuters_ric_primary',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'reuters_ric_bats',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'reference_adt_eur',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'csd',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'corporate_action_status',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'supported_services',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'trading_segment',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'printed_name',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'periodic_auction_max_duration',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'periodic_auction_min_order_entry_size',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'periodic_auction_min_order_entry_notional',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'max_otr_count',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'max_otr_volume',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'capped',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'venue_cap_percentage',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'venue_uncap_date',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: [','],
            },
            {
              name: 'quoteChar',
              value: ['"'],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'somethingelse::abc::turq::tickLadder::TurquoiseTickLadderCsv',
    content: {
      _type: 'flatData',
      name: 'TurquoiseTickLadderCsv',
      package: 'somethingelse::abc::turq::tickLadder',
      sections: [
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Price Tick Table ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Min Value',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Max Value',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Tick Value',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Description',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'Decimals',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'recordSeparator',
              value: ['\n'],
            },
            {
              name: 'mayContainBlankLines',
              value: [true],
            },
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: [';'],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
];

// References to resolve in FlatData Mapping
// - Source RecordType
export const TEST_DATA__FlatDataMappingRoundtrip = [
  {
    path: 'test::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'firm',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::Firm',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'age',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'weight',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'isEmployed',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'master',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'description',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'employedDate',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'StrictDate',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'title',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::Title',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::LegalEntity',
    content: {
      _type: 'class',
      name: 'LegalEntity',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legalName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'otherName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'trade',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::Trade',
            },
          },
        },
      ],
      superTypes: ['test::LegalEntity'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::Trade',
    content: {
      _type: 'class',
      name: 'Trade',
      package: 'test',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'marketName',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'price',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'createdBy',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'test::Person',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::Title',
    content: {
      _type: 'Enumeration',
      name: 'Title',
      package: 'test',
      values: [
        {
          value: 'VP',
        },
        {
          value: 'MD',
        },
        {
          value: 'OTHER',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  {
    path: 'test::PersonWithColumnNamesCSV__asFlatData',
    content: {
      _type: 'flatData',
      name: 'PersonWithColumnNamesCSV__asFlatData',
      package: 'test',
      sections: [
        {
          driverId: 'ImmaterialLines',
          name: 'readLines',
          sectionProperties: [
            {
              name: 'scope.forNumberOfLines',
              value: [24],
            },
            {
              name: 'recordSeparator',
              value: [';'],
            },
          ],
        },
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'NAME',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FIRM',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'AGE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'boolean',
                },
                label: 'MASTER',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'WEIGHT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['yyyy-MM-dd'],
                },
                label: 'ANOTHER_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'TITLE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'TRADE',
                optional: false,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'recordSeparator',
              value: ['\r\n'],
            },
            {
              name: 'delimiter',
              value: [','],
            },
            {
              name: 'quoteChar',
              value: ['"'],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'test::PersonWithColumnNamesMapping__asFlatData',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'flatData',
          class: 'Person',
          flatData: 'PersonWithColumnNamesCSV__asFlatData',
          propertyMappings: [
            {
              _type: 'flatDataPropertyMapping',
              property: {
                class: 'test::Person',
                property: 'name',
              },
              source: 'test_Person',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                      {
                        _type: 'string',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: ['NAME'],
                      },
                    ],
                    property: 'oneString',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'flatDataPropertyMapping',
              property: {
                class: 'test::Person',
                property: 'age',
              },
              source: 'test_Person',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    function: 'if',
                    parameters: [
                      {
                        _type: 'func',
                        function: 'lessThan',
                        parameters: [
                          {
                            _type: 'property',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'src',
                              },
                              {
                                _type: 'string',
                                multiplicity: {
                                  lowerBound: 1,
                                  upperBound: 1,
                                },
                                values: ['AGE'],
                              },
                            ],
                            property: 'oneInteger',
                          },
                          {
                            _type: 'integer',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: [60],
                          },
                        ],
                      },
                      {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'property',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'src',
                              },
                              {
                                _type: 'string',
                                multiplicity: {
                                  lowerBound: 1,
                                  upperBound: 1,
                                },
                                values: ['AGE'],
                              },
                            ],
                            property: 'oneInteger',
                          },
                        ],
                        parameters: [],
                      },
                      {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'integer',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: [60],
                          },
                        ],
                        parameters: [],
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'flatDataPropertyMapping',
              property: {
                class: 'test::Person',
                property: 'master',
              },
              source: 'test_Person',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                      {
                        _type: 'string',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: ['MASTER'],
                      },
                    ],
                    property: 'optionalBoolean',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'flatDataPropertyMapping',
              property: {
                class: 'test::Person',
                property: 'weight',
              },
              source: 'test_Person',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                      {
                        _type: 'string',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: ['WEIGHT'],
                      },
                    ],
                    property: 'optionalFloat',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'flatDataPropertyMapping',
              property: {
                class: 'test::Person',
                property: 'isEmployed',
              },
              source: 'test_Person',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    function: 'not',
                    parameters: [
                      {
                        _type: 'func',
                        function: 'equal',
                        parameters: [
                          {
                            _type: 'property',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'src',
                              },
                              {
                                _type: 'string',
                                multiplicity: {
                                  lowerBound: 1,
                                  upperBound: 1,
                                },
                                values: ['FIRM'],
                              },
                            ],
                            property: 'oneString',
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: [''],
                          },
                        ],
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'flatDataPropertyMapping',
              property: {
                class: 'test::Person',
                property: 'description',
              },
              source: 'test_Person',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    function: 'plus',
                    parameters: [
                      {
                        _type: 'collection',
                        multiplicity: {
                          lowerBound: 5,
                          upperBound: 5,
                        },
                        values: [
                          {
                            _type: 'func',
                            function: 'substring',
                            parameters: [
                              {
                                _type: 'func',
                                function: 'toOne',
                                parameters: [
                                  {
                                    _type: 'property',
                                    parameters: [
                                      {
                                        _type: 'var',
                                        name: 'src',
                                      },
                                      {
                                        _type: 'string',
                                        multiplicity: {
                                          lowerBound: 1,
                                          upperBound: 1,
                                        },
                                        values: ['NAME'],
                                      },
                                    ],
                                    property: 'oneString',
                                  },
                                ],
                              },
                              {
                                _type: 'integer',
                                multiplicity: {
                                  lowerBound: 1,
                                  upperBound: 1,
                                },
                                values: [0],
                              },
                              {
                                _type: 'integer',
                                multiplicity: {
                                  lowerBound: 1,
                                  upperBound: 1,
                                },
                                values: [4],
                              },
                            ],
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: ['@'],
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: ['('],
                          },
                          {
                            _type: 'func',
                            function: 'toOne',
                            parameters: [
                              {
                                _type: 'property',
                                parameters: [
                                  {
                                    _type: 'var',
                                    name: 'src',
                                  },
                                  {
                                    _type: 'string',
                                    multiplicity: {
                                      lowerBound: 1,
                                      upperBound: 1,
                                    },
                                    values: ['FIRM'],
                                  },
                                ],
                                property: 'oneString',
                              },
                            ],
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: [')'],
                          },
                        ],
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'flatDataPropertyMapping',
              property: {
                class: 'test::Person',
                property: 'employedDate',
              },
              source: 'test_Person',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                      {
                        _type: 'string',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: ['ANOTHER_DATE'],
                      },
                    ],
                    property: 'oneStrictDate',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'flatDataPropertyMapping',
              enumMappingId: 'titleMap',
              property: {
                class: 'test::Person',
                property: 'title',
              },
              source: 'test_Person',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                      {
                        _type: 'string',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: ['TITLE'],
                      },
                    ],
                    property: 'oneString',
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: false,
          sectionName: 'default',
        },
      ],
      enumerationMappings: [
        {
          enumValueMappings: [
            {
              enumValue: 'VP',
              sourceValues: [
                {
                  _type: 'stringSourceValue',
                  value: 'Vice President',
                },
              ],
            },
            {
              enumValue: 'MD',
              sourceValues: [
                {
                  _type: 'stringSourceValue',
                  value: 'Managing Director',
                },
              ],
            },
            {
              enumValue: 'OTHER',
              sourceValues: [
                {
                  _type: 'stringSourceValue',
                  value: 'Other',
                },
              ],
            },
          ],
          enumeration: 'Title',
          id: 'titleMap',
        },
      ],
      includedMappings: [],
      name: 'PersonWithColumnNamesMapping__asFlatData',
      package: 'test',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          imports: [],
          elements: [
            'test::Person',
            'test::LegalEntity',
            'test::Firm',
            'test::Trade',
            'test::Title',
          ],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['test::PersonWithColumnNamesCSV__asFlatData'],
          parserName: 'FlatData',
        },
        {
          _type: 'importAware',
          imports: ['test'],
          elements: ['test::PersonWithColumnNamesMapping__asFlatData'],
          parserName: 'Mapping',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];

export const TEST_DATA__FlatDataAssociationMapping = [
  {
    path: 'model::firm',
    content: {
      _type: 'class',
      name: 'firm',
      package: 'model',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'fname',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'model::person',
    content: {
      _type: 'class',
      name: 'person',
      package: 'model',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'name',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'eid',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'model::NewAssociation',
    content: {
      _type: 'association',
      name: 'NewAssociation',
      package: 'model',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'pid',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'model::person',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'fid',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'model::firm',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'model::multiSection',
    content: {
      _type: 'flatData',
      name: 'multiSection',
      package: 'model',
      sections: [
        {
          driverId: 'DelimitedWithoutHeadings',
          name: 'header',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                address: '1',
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'fname',
                optional: false,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'scope.forNumberOfLines',
              value: [1],
            },
            {
              name: 'delimiter',
              value: [','],
            },
            {
              name: 'escapingChar',
              value: ['\\\\'],
            },
            {
              name: 'nullString',
              value: ['None'],
            },
          ],
        },
        {
          driverId: 'DelimitedWithoutHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                address: '1',
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'name',
                optional: false,
              },
              {
                address: '2',
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'eid',
                optional: false,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: [','],
            },
            {
              name: 'escapingChar',
              value: ['\\\\'],
            },
            {
              name: 'nullString',
              value: ['None'],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'model::multiSectionAssociationMapping',
    content: {
      _type: 'mapping',
      associationMappings: [
        {
          _type: 'flatData',
          association: 'model::NewAssociation',
          propertyMappings: [
            {
              _type: 'flatDataAssociationPropertyMapping',
              property: {
                class: '',
                property: 'pid',
              },
              flatData: 'model::multiSection',
              sectionName: 'default',
              source: 'm_f',
              target: 'm_p',
            },
            {
              _type: 'flatDataAssociationPropertyMapping',
              property: {
                class: '',
                property: 'fid',
              },
              flatData: 'model::multiSection',
              sectionName: 'header',
              source: 'm_p',
              target: 'm_f',
            },
          ],
          stores: [],
        },
      ],
      classMappings: [
        {
          _type: 'flatData',
          class: 'model::person',
          flatData: 'model::multiSection',
          id: 'm_p',
          propertyMappings: [
            {
              _type: 'flatDataPropertyMapping',
              property: {
                class: 'model::person',
                property: 'name',
              },
              source: 'm_p',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                      {
                        _type: 'string',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: ['name'],
                      },
                    ],
                    property: 'oneString',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'flatDataPropertyMapping',
              property: {
                class: 'model::person',
                property: 'eid',
              },
              source: 'm_p',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                      {
                        _type: 'string',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: ['eid'],
                      },
                    ],
                    property: 'oneString',
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: true,
          sectionName: 'default',
        },
        {
          _type: 'flatData',
          class: 'model::firm',
          flatData: 'model::multiSection',
          id: 'm_f',
          propertyMappings: [
            {
              _type: 'flatDataPropertyMapping',
              property: {
                class: 'model::firm',
                property: 'fname',
              },
              source: 'm_f',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                      {
                        _type: 'string',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: ['fname'],
                      },
                    ],
                    property: 'oneString',
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: true,
          sectionName: 'header',
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'multiSectionAssociationMapping',
      package: 'model',
      tests: [
        {
          assert: {
            _type: 'expectedOutputMappingTestAssert',
            expectedOutput:
              '{"defects":[],"source":{"defects":[],"source":{"number":1,"lineNumber":2,"record":"pp,ab","recordValues":[{"address":1,"rawValue":"pp"},{"address":2,"rawValue":"ab"}]},"value":{"typeName":"model::multiSection.default.default","values":[{"label":"name","value":"pp"},{"label":"eid","value":"ab"}]}},"value":{"eid":"ab","name":"pp","fid":{"fname":"Goo"}}}',
          },
          inputData: [
            {
              _type: 'flatData',
              data: 'Goo\npp,ab',
              sourceFlatData: {
                path: 'model::multiSection',
                type: 'STORE',
              },
            },
          ],
          name: 'test_1',
          query: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'serialize',
                parameters: [
                  {
                    _type: 'func',
                    function: 'graphFetchChecked',
                    parameters: [
                      {
                        _type: 'func',
                        function: 'getAll',
                        parameters: [
                          {
                            _type: 'packageableElementPtr',
                            fullPath: 'model::person',
                          },
                        ],
                      },
                      {
                        _type: 'rootGraphFetchTree',
                        class: 'model::person',
                        subTrees: [
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'eid',
                            subTrees: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'name',
                            subTrees: [],
                          },
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'fid',
                            subTrees: [
                              {
                                _type: 'propertyGraphFetchTree',
                                parameters: [],
                                property: 'fname',
                                subTrees: [],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    _type: 'rootGraphFetchTree',
                    class: 'model::person',
                    subTrees: [
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'eid',
                        subTrees: [],
                      },
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'name',
                        subTrees: [],
                      },
                      {
                        _type: 'propertyGraphFetchTree',
                        parameters: [],
                        property: 'fid',
                        subTrees: [
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'fname',
                            subTrees: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
            parameters: [],
          },
        },
      ],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];

export const TEST_DATA__EmbeddedFlatDataMappingRoundtrip = [
  {
    path: 'myFlatDataTest::Origination',
    content: {
      _type: 'class',
      name: 'Origination',
      package: 'myFlatDataTest',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationDate',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Origination Date',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'StrictDate',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'firstPaymentDate',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'First loan installement payment Date',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'StrictDate',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'firstRateResetDate',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'Accrual start date for when the new rate takes affect.  ARMs are adjusted monthly.To determine how to do the interest accrual validation.  Expected date of first reset (Typically first day after month after close).  Will be blank for fixed loans.',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'StrictDate',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'firstPaymentResetDate',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'Date of the first payment change on an ARM loan at origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'StrictDate',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationRate',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Interest rate of the loan at the time of origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationCLTV',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Original combined loan-to-value (including second liens)',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationCLTVInclSS',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'Combined Loan-To-Value ratio including silent seconds at origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationDocStatus',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Document status of the loan at time of settlement',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationFrontEndDTI',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Front End Debt-To-Income at origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationBackEndDTI',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                "How much of the borrower's gross income goes towards paying any debt (Total Debt Obligations/Income)",
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationNegamFlag',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'Indicates if the loan is subject to negative amortization at origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationAmortizationType',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Current amortization type',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationInterestOnlyFlag',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Interest Only flag at the time of origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationLienPosition',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Lien position of a loan at the time of origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationMaturityDate',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Maturity date of a loan as of origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'StrictDate',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationOccupancy',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'Whether or not residents are currently within a household at time of origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationDocType',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Level of income documentation at origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationPrepayFlag',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'Is part or all of the mortgage debt paid before it is due (Y/N) ',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'initialPeriodicRateFloor',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Minimum % that the first rate can change for an ARM loan',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'armLifetimeRateFloor',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'The lower limit for how low an adjustable rate mortgage can go',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationArmPeriodicRateFloor',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'limits the lower amount by which the interest rate on an adjustable rate loan can decrease at a specified adjustment date. Percentage amount the rate can decrease each reset period',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationPeriodicPmtFloor',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'Minimum payment amount determined for a certain period of time at origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationInterestRateType',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Indicates ARM vs. Fixed loan at origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationIndex',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Financial index that an ARM loan follows at origination.',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationBalloonFlag',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'Indicates Y/N whether or not the loan has a balloon payment at the time of maturity',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'initialPeriodicRateCap',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Maximum % that the first rate can change for an ARM loan',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationPeriodicPaymentCap',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'Maximum payment amount determined for a certain period of time at origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationChannel',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Channel indicating type of mortgage origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationInterestOnlyEndDate',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'End Date of the Interest Only portion of the loan at origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'StrictDate',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationMaxRate',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Maximum value that a rate can rise to on an ARM loan',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationMinRate',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Minimum value that a rate can rise to on an ARM loan',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationArmPeriodicRateCap',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'limits the upper amount by which the interest rate on an adjustable rate loan can increase at a specified adjustment date.  Percentage amount the rate can increase each reset period',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationOptionArmFlag',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Indicates if the loan is an option ARM   at origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationPropertyValueDate',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'The date the property was originally valued',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'StrictDate',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationPropertyValueType',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Type of valuation',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationMargin',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'A fixed percentage rate that is added to an index value to determine the fully indexed interest rate of an ARM',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'armLifetimeRateCap',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Lifetime maximum interest rate on an ARM loan',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationCreditScore',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'The credit score of the borrower at the time of origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationCreditScoreVendor',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Provider of the credit score at the time of origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationCreditScoreVersion',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Version of the credit score at the time of origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationCreditScoreDate',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Date of the credit score at the time of origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'StrictDate',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationOccupancyType',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'Describes if the property is owner occupied or investment or other descriptions',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationBalance',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Origination Date',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'firstRateResetMonths',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                "Amount of time (in months) from close to when the loan resets. Should be blank for fixed rate loans and '0' for ARMs.",
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationAmortizationTerm',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Original amortization term',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationPropertyValue',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'The value of the property at origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationTerm',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Original term of the loan, in months',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationTaxAmt',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Tax amount at origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationInterestOnlyPeriod',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'Interest Only Period at the time of origination of the loan.  This will be the entire maturity period in months. ',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationNegamLimit',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Maximum amortization amount on negam loan',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationPaymentFreq',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Payment frequency at the time of origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationPrepayTerm',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Prepayment term at origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationEscrowAmt',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Total escrow amount at origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationSeniorBalance',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Senior balance at origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationRateResetFreqMo',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'Number of months it takes for the rate to reset on an arm loan (Annual/Semi Annual Etc)',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationHelocDrawableAmount',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'The original total drawable dollar amount on a HELOC loan, indicating the borrowers pre-approved spending limit',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationPrincipalAndInterest',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Principal and interest payments at origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationPrinciplaInterestTaxesAndInsurance',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Taxes and Insurance payment at origination',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'originationPaymentResetFrequencyMonth',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'Number of months it takes for the payment to reset on an arm loan (Annual/Semi Annual Etc)',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Integer',
            },
          },
        },
      ],
      taggedValues: [
        {
          tag: {
            profile: 'meta::pure::profiles::doc',
            value: 'doc',
          },
          value: 'Origination specific attributes for a loan',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'myFlatDataTest::ResiBorrower',
    content: {
      _type: 'class',
      name: 'ResiBorrower',
      package: 'myFlatDataTest',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'borrowerId',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'scraStartDate',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Date that an eligible SCRA borrower started active duty',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'StrictDate',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'scraEndDate',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Date that an eligible SCRA borrower ended active duty',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'StrictDate',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'scraFlag',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'A flag indicating if the borrower is entitled to relief and protections proved under the Service members Civil Relief Act',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'scraCheckDate',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'Date that the servicer has last performed a DMDC/SCRA check',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'StrictDate',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'incomeCurrency',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Borrower income currency',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'primaryFirstName',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'The given name of the borrower',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'primaryLastName',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'The familiy name of the borrower',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'secondaryFirstName',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'The given name of the borrower',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'secondaryLastName',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'The familiy name of the borrower',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'resiBorrAddress',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'myFlatDataTest::entity::Address',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'borrowerType',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'backEndDebtToIncome',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                "Ratio indicating the portion of borrower's income going towards any debt payments",
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'frontEndDebtToIncome',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Front End Debt-To-Income',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'financialLiabilities',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value:
                'Total balance of other loans outstanding with the borrower',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'income',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Borrower income per annum',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Float',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'eRecordFlag',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'Indicates borrower ability to eRecord',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'Boolean',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'myFlatDataTest::Residential',
    content: {
      _type: 'class',
      name: 'Residential',
      package: 'myFlatDataTest',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'id',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'resiOrigination',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'myFlatDataTest::Origination',
            },
          },
        },
      ],
      taggedValues: [
        {
          tag: {
            profile: 'meta::pure::profiles::doc',
            value: 'doc',
          },
          value:
            'Residential Loan is a mortgage loan secured by a by a borrower on a residential property.',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'myFlatDataTest::entity::Address',
    content: {
      _type: 'class',
      name: 'Address',
      package: 'myFlatDataTest::entity',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'addressLine1',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'addressLine2',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'addressLine3',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'city',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'postalCode',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'typeDescription',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'county',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'state',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'myFlatDataTest::geography::State',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'country',
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'myFlatDataTest::geography::Country',
            },
          },
        },
      ],
      taggedValues: [
        {
          tag: {
            profile: 'meta::pure::profiles::doc',
            value: 'doc',
          },
          value:
            'Addresses associated to the Legal Entity. One of the address will be a primary address and rest secondary. Address Types include Registration Address, Principal Place of Business',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'myFlatDataTest::geography::Country',
    content: {
      _type: 'class',
      name: 'Country',
      package: 'myFlatDataTest::geography',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'countryIsoCode',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'The country code, which is an ISO 3166 code.',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'countryIso3Code',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'ISO 3166-1 3-digit code.',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'countryName',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'The country full name.',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'gsCurrencyCode',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'The country currency code. [ country currency code ]',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
      taggedValues: [
        {
          tag: {
            profile: 'meta::pure::profiles::doc',
            value: 'doc',
          },
          value: 'A class to represent ISO country codes. ',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'myFlatDataTest::geography::State',
    content: {
      _type: 'class',
      name: 'State',
      package: 'myFlatDataTest::geography',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'code',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: '3 digit State Code.',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'name',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'State/Province name based on ISO_3166-2 standard.',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'isoCode',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'State/Province code based on ISO_3166-2 standard.',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'nonStandardString',
          taggedValues: [
            {
              tag: {
                profile: 'meta::pure::profiles::doc',
                value: 'doc',
              },
              value: 'allow for some sources that do not have iso',
            },
          ],
          genericType: {
            rawType: {
              _type: 'packageableType',
              fullPath: 'String',
            },
          },
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'myFlatDataTest::Tape',
    content: {
      _type: 'flatData',
      name: 'Tape',
      package: 'myFlatDataTest',
      sections: [
        {
          driverId: 'DelimitedWithHeadings',
          name: 'default',
          recordType: {
            _type: 'rootRecordType',
            fields: [
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'asOfDate',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ETL_GS_LOAN_NUMBER',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'ETL_AS_OF_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ETL_PRODUCT_CLASS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'ETL_PAY_HISTORY_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ETL_BUSINESS_LINE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'ACTIVATION_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'DEACTIVATION_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'RECEIVABLE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SERVICER',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SVCANUM',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SERVICING_ACCOUNT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'GSN',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PrimeID',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CUSIP',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PRIMARY_BORROWER_STATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PRIMARY_BORROWER_ZIP',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PRIMARY_BORROWER_COUNTRY',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PRIMARY_INCOME_VERIFIED_FLAG',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PRIMARY_FIRST_NAME',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PRIMARY_LAST_NAME',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PRIMARY_ADDRESS',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PRIMARY_ENTITY_TYPE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PRIMARY_ENTITY_NAME',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PRIMARY_NATIONALITY',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PRIMARY_BORROWER_TYPE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'PRIMARY_DATE_OF_BIRTH',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PRIMARY_EMPLOYMENT_DESCRIPTION',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'PRIMARY_FINANCIAL_LIABILITIES',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PRIMARY_INCOME_CURRENCY',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'PRIMARY_INCOME',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SECONDARY_BORROWER_STATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SECONDARY_BORROWER_ZIP',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SECONDARY_BORROWER_COUNTRY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SECONDARY_INCOME_VERIFIED_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SECONDARY_FIRST_NAME',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SECONDARY_LAST_NAME',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SECONDARY_ADDRESS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SECONDARY_ENTITY_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SECONDARY_ENTITY_NAME',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SECONDARY_NATIONALITY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SECONDARY_BORROWER_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'SECONDARY_DATE_OF_BIRTH',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SECONDARY_EMPLOYMENT_DESCRIPTION',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'SECONDARY_FINANCIAL_LIABILITIES',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SECONDARY_INCOME_CURRENCY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'SECONDARY_INCOME',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'ORIG_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CURRENCY',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'INTEREST_RATE_TYPE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'INTEREST_RATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'VARIABLE_RATE_INDEX',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'VARIABLE_RATE_MARGIN',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'RATE_RESET_FREQUENCY',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'DAYS_PAST_DUE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'NEXT_PAY_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ENDING_PRIN_BAL',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'MISC_FEE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'NON_CASH_PRIN',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'OTHER_BAL',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'PAID_THRU_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'SCHEDULE_PRIN_AMOUNT',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'SERVICING_FEE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'UNPAID_INTEREST_BAL',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CURRENT_BALANCE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'DEFERRED_PRINCIPAL',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'DEFERRED_NON_CASH_PRIN',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'DEFERRED_BALANCE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'UNFUNDED_AMOUNT',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'TOTAL_NON_CASH_PRINCIPAL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'PRINCIPAL_PAYMENT',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ORIG_FICO',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ORIG_PRIMARY_BORROWER_FICO',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ORIG_SECONDARY_BORROWER_FICO',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_BALANCE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_RATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'ORIG_AMORT_TERM',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_APPR',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'ORIG_TERM',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_LTV',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_CLTV',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FIRST_PMT_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FIRST_PMT_RESET_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'FIRST_PMT_RESET_MO',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FIRST_RATE_RESET_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'FIRST_RATE_RESET_MO',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_FEE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'LOAN_TYPE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'AMORT_TYPE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'DAY_COUNT_CONVENTION',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'LIEN_POSITION',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'LOAN_PURPOSE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'PMT_FREQUENCY',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'IO_FLAG',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'IO_PERIOD',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'MATURITY_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FICO_SCORE_VENDOR',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FICO_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FICO_SCORE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FICO_SCORE_VERSION',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'TOTAL_COMMITMENT',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COMMITMENT_ADJ',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'OTHER_FEES',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PROPERTY_ID',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PROPERTY_TYPE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'YEAR_BUILT',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PROPERTY_STATUS',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PROPERTY_ADDRESS',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PROPERTY_CITY',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PROPERTY_STATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PROPERTY_ZIP',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PROPERTY_COUNTRY',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'CURRENT_APPR_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CURRENT_APPR_TYPE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CURRENT_APPR_VALUE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CURRENT_APPR_CCY',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'CMV_APPR_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CMV_APPR_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CMV_APPR_VALUE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CMV_APPR_CCY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BPO_MOD_APPR_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BPO_MOD_APPR_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'BPO_MOD_APPR_VALUE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BPO_MOD_APPR_CCY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BPO_ASIS_APPR_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BPO_ASIS_APPR_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'BPO_ASIS_APPR_VALUE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BPO_ASIS_APPR_CCY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BPO_QS_APPR_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BPO_QS_APPR_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'BPO_QS_APPR_VALUE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BPO_QS_APPR_CCY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CURRENT_LTV',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FC_FLAG',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FC_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FC_ACTIVE_HOLD_FLAG',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK_FLAG',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_START_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_FILING_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'REO_FLAG',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'REO_START_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MOD_FLAG',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'MOD_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'MATURITY_DATE_PREMOD',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'MATURITY_DATE_POSTMOD',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'LOSS_MIT_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'LOSS_MIT_CODE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'LOSS_MIT_WORKOUT_STATUS',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'LOSS_MIT_WORKOUT_TYPE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'TRIAL_MOD_COMMENTS',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'TRIAL_MOD_FIRST_PYMT_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'TERMINATION_TYPE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'TERMINATION_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'NET_PROCEEDS',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'SALES_PRICE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'POS_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'TD_POS_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ENTITLEMENT_GROUP',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_ESCROW_BAL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'AMORT_TERM_POSTMOD',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ARM_CODE_POSTMOD',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CREDIT_MI_COVERAGE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CUMULATIVE_CORPORATE_ADVANCE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CUMULATIVE_ESCROW_ADVANCE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'DOC_TYPE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ESCROW_FLAG',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'INIT_PERIODIC_RATE_CAP',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'IO_FLAG_POSTMOD',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'MOD_EFFECTIVE_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'MOD_FEE_LATEST',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'LOOKBACK_DAYS',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'LPMI_FEE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'MAX_RATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'MIN_RATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'NEGAM_FLAG',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'NEGAM_FLAG_POSTMOD',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_BACK_END_DTI',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_FRONT_END_DTI',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'PERIODIC_CAP',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'PERIODIC_FLOOR',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_PERIODIC_PMT_CAP',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PREPAY_FLAG',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'STEP_01_EFFECTIVE_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'STEP_01_INTEREST_RATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'STEP_02_EFFECTIVE_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'STEP_02_INTEREST_RATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'STEP_03_EFFECTIVE_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'STEP_03_INTEREST_RATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'STEP_04_EFFECTIVE_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'STEP_04_INTEREST_RATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'STEP_05_EFFECTIVE_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'STEP_05_INTEREST_RATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'STEP_06_EFFECTIVE_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'STEP_06_INTEREST_RATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'STEP_07_EFFECTIVE_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'STEP_07_INTEREST_RATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'STEP_08_EFFECTIVE_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'STEP_08_INTEREST_RATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'STEP_09_EFFECTIVE_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'STEP_09_INTEREST_RATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'STEP_10_EFFECTIVE_DATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'STEP_10_INTEREST_RATE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'STEP_RATE_FLAG',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'TOTAL_DEBT',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'LTV_POSTMOD',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'INTEREST_RATE_POSTMOD',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'REPORTED_SERVICING_FEE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'REPORTED_SERVICING_FEE_TYPE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'JUNIOR_BALANCE',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'ASP_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ASP_VALUE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_SERVICING_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FC_STAGE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ORIG_OCCUPANCY_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_PURCHASE_PRICE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_SENIOR_BALANCE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'PREPAY_TERM_CURR',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'REO_STAGE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BPE_APPR_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BPE_APPR_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'BPE_APPR_VALUE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BPE_APPR_CCY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_UNFUNDED_AMOUNT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ASP_APPR_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ASP_APPR_CCY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'REFI_APPR_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'REFI_APPR_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'REFI_APPR_VALUE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'REFI_APPR_CCY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'PMT_RESET_FREQUENCY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'LOAN_PROGRAM',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'OCCUPANCY_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'OCCUPANCY_PCT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'CPRICE_APPR_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CPRICE_APPR_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CPRICE_APPR_VALUE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CPRICE_APPR_CCY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BPO_APPR_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BPO_APPR_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'BPO_APPR_VALUE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BPO_APPR_CCY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CURRENT_PRA_OUTSTANDING',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_INTEREST_RATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CURRENT_MONTH_MOD_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_DEFERRED_BALANCE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_UNPAID_BALANCE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'TOTAL_GROSS_INT_PMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'SCHEDULE_CURTAILMENT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'DRAW_AMOUNT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'PIF_REFI_SETT_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'REPAYMENT_PLAN_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'MOD_PERF_INCENTIVE_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'DIL_COMPLETED_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'THIRD_PARTY_LOANS_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'FC_COMPLETED_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'SHORT_SALE_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'REO_SALE_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'REINSTATEMENT_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'REPERFORMING_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'DOCUMENTATION_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ESCROW_RECOVERIES',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SERVICING_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SERVICING_FEE_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CORPORATE_RECOVERIES',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'MI_INCENTIVE_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'MISC_FEE_RECOVERIES',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CGOF_RECOVERY_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'BOARDING_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'DEBOARDING_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CORPORATE_ADVANCES',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ESCROW_ADVANCE_PAYMENT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'THIRD_PARTY_ADVANCES',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'THIRD_PARTY_RECOVERIES',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'SCHEDULED_PI',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'HAZ_LIQ',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'MI_LIQ',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK_CASE_NUMBER',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'FLOOD_INS_PMT_FREQ',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FLOOD_INS_NEXT_DUE_DT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'FLOOD_INS_NEXT_DUE_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'HAZ_INS_PMT_FREQ',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'HAZ_INS_NEXT_DUE_DT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'HAZ_INS_NEXT_DUE_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'LIFETIME_CAP',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'LIFETIME_FLOOR',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FB_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'NEGAM_LIMIT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'NEGAM_LIMIT_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'LOAN_ORIGINATOR',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BALLOON_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BALLOON_FLAG_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'OPTION_ARM_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'DSI_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CEASE_DESIST_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'HELOC_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'COLL_NEXT_PMT_DUE_DT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'COLL_PAID_THRU_DT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CLTV_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'COLL_HOLD_CT_CURR',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_CORPORATE_ADVANCE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_CORPORATE_RECOVERIES',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_ESCROW_ADVANCE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_ESCROW_RECOVERIES',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'RECAST_PERIOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'MI_CLAIM',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_CURTAILMENT_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_CURTAILMENT_PRINCIPAL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_DIL_COMPLETED_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_DOCUMENTATION_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_ESCROW_ADJUSTMENTS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_CORPORATE_ADJUSTMENTS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'LOAN_COLL_STATUS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_SCHEDULE_PRINCIPAL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_SCHEDULED_PI',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_NON_CASH_PRINCIPAL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_GROSS_INTEREST',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_FEE_CFK',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_FEE_MOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_FEE_NOTE_SALE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_FEE_REO_OVERSIGHT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_FEE_REO_RENTAL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_FEE_VALUATION_RECON',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_MOD_PERFORMANCE_INCENTIVE_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_PIF_REFI_SETTLEMENT_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_RECOVERY_FEE_ON_CHGO',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_REINSTATEMENT_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_SHORT_SALE_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_SUSPENSE_BALANCE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_TERMINATION_PRINCIPAL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_THIRD_PARTY_ADVANCE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_THIRD_PARTY_RECOVERIES',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_THIRD_PARTY_ADJUSTMENTS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COLL_THIRD_PARTY_LOANS_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PRIMARY_BORROWER_CITY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SECONDARY_BORROWER_CITY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PROPERTY_COUNTY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'PROPERTY_SIZE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'NUMBER_OF_UNITS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MEASUREMENT_UNIT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'GROSS_PROCEEDS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ORIG_APPR_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'ORIG_APPR_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ORIG_INTEREST_RATE_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ORIG_VARIABLE_RATE_INDEX',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_VARIABLE_RATE_MARGIN',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ORIG_CHANNEL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_ESCROW_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'INIT_PERIODIC_RATE_FLOOR',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'ORIG_RATE_RESET_FREQUENCY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ORIG_BALLOON_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ORIG_NEGAM_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_NEGAM_LIMIT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'ORIG_PREPAY_TERM',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ORIG_PREPAY_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_MAX_RATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_MIN_RATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_LIFETIME_CAP',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_LIFETIME_FLOOR',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ORIG_OPTION_ARM_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_PI',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_PITI',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'HELOC_DRAW_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MULTIPLE_MOD_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MI_COMPANY_NAME',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PMI_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SCRA_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MI_CERT_NUM',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'MI_CLAIM_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_AGREED_ORDER_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_AMENDED_POC_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_APO_START_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_APO_END_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK_ATTORNEY_NAME',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'BK_CRAMDOWN_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_341_MEETING_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_HOLD_START_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'DAYS_ON_BK_HOLD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_DEFAULT_NOTICE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK_DISBURSE_AGENT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_DISCHARGED_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_CONTRACTUAL_DUE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'BK_ACTIVE_HOLD_CT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK_IMPEDIMENTS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK_INTENT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK_IS_ON_HOLD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK_JURISDICTION',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_OBJECTION_HEARING_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_OBJECTION_REFERRED_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_PLAN_REVIEW_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'BK_POC_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_REAFFIRMATION_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_RELIEF_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'BK_TERM',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_TOC_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK_CHAPTER_CODE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_END_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CFK_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ANNUALIZED_INS_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ANNUALIZED_TAX_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FC_SALE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'EVICTION_START_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'EVICTION_END_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FB_START_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FB_END_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FC_ATTORNEY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'FC_BID_PRICE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FC_CONTESTED_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FC_END_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FC_HOLD_START_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FC_HOLD_END_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FC_HOLD_REASON',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FC_JUDGEMENT_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FC_SCHEDULED_SALE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FC_STAGE_START_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FC_JUDICIAL_TEMPLATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'HAZARD_SUSPENSE_BALANCE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'INVESTOR_SUSPENSE_BALANCE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'LAST_CONTACT_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'LAST_PAYMENT_RECEIVED_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'LAST_TAXES_PAID_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'LITIGATION_START_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'LITIGATION_END_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'LITIGATION_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'LM_DEMAND_EXPIRE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'NEXT_INS_DUE_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'NEXT_INS_DUE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'NEXT_RATE_RESET_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'NEXT_TAX_DUE_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'NEXT_TAX_DUE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'REO_ORIG_LIST_PRICE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'REO_ORIG_LIST_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'REDEMPTION_START_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'REDEMPTION_END_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'REO_HOLD_START_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ACTIVE_TRIAL_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MISSED_TRIAL_PMT_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'HAMP_ELIGIBLE_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'PITI_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'PITI_PREMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'SECOND_TRIAL_PMT_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'SECOND_TRIAL_PMT_DUE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'THIRD_TRIAL_PMT_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'THIRD_TRIAL_PMT_DUE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'AMORT_TYPE_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'TRIAL_PMT_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'FRONT_END_DTI_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'BACK_END_DTI_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'UNPAID_PRIN_BAL_PREMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'UNPAID_PRIN_BAL_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'DAYS_DQ_PREMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'DEFERRED_BAL_PREMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ESCROW_PREMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ESCROW_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FIRST_PMT_DATE_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'FIRST_RATE_RESET_MONTHS_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'IO_PERIOD_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'LIFETIME_CAP_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'LIFETIME_FLOOR_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'LTV_PREMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'MARGIN_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'MAX_RATE_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'MIN_RATE_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MOD_PHASE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'MOD_PRA_AMOUNT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MOD_PROGRAM',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'MOD_PRINCIPAL_CAPITALIZED',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'MOD_PRINCIPAL_FORBEARED',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'MOD_PRINCIPAL_FORGIVEN',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MOD_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MOD_STATUS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MOD_STATUS_CURR',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'PERIODIC_CAP_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'PI_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'PI_PREMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'PMT_FREQUENCY_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'PRA1_ANNIV_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'PRA2_ANNIV_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'PRA3_ANNIV_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PREPAY_FLAG_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'RATE_PREMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'RATE_RESET_FREQUENCY_MO_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'REMAINING_TERM_PREMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'STEP_MAX_INTEREST_RATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'STEP_MAX_INTEREST_RATE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'STEP_RATE_NUMBER',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'TEMP_MOD_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'TERM_PREMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'TERM_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'TOTAL_DEBT_PREMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'TOTAL_DEBT_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'GS_ORIG_CLTV_INCL_SS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'ASP_ORIG_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK_CRAMDOWN_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_CRAMDOWN_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_CRAMDOWN_OBJECTION_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_CRAMDOWN_REFERRAL_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_CONFIRMATION_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_POC_BAR_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_POC_FILED_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_POST_PETITION_DUE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_PRE_PETITION_DUE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_REMOVAL_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'TOTAL_HAMP_INCENTIVES',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ORIG_LIEN_POSITION',
                optional: false,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ORIG_CREDIT_SCORE_VENDOR',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ORIG_CREDIT_SCORE_VERSION',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'PMI_LEVEL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'MI_PROCEEDS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'LOSS_MIT_STATUS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ACTIVE_REPAYMENT_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CAPITALIZED_TOTAL_POSTMOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'LOSS_MIT_DECISION',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'LM_DECISION_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'LOSS_MIT_STEP',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'LOSS_MIT_WORKOUT_COMPLETED',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CBR_INDICATOR',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CBR_SUPPRESS_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'CHARGEOFF_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CHARGEOFF_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CONTRACT_SALES_PRICE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'DAY_REO_STAGE_CURR',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'DAYS_FC_HOLD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'DAYS_FC_HOLD_IN_MILESTONE_CURR',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'DAYS_FC_MILESTONE_CURR',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'DAYS_REO_HOLD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'DAYS_REO_HOLD_IN_STAGE_CURR',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'DEED_RECORDED_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'DQ_INTEREST',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'SHORT_SALE_LIST_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'SHORT_SALE_LIST_PRICE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'FC_APPR_BID_PRICE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'ACTIVE_FC_HOLD_COUNT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FC_MILESTONE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FC_MILESTONE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FC_END_REASON',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FC_SALE_RESULT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'JUDGEMENT_SCHEDULE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FC_WORKFLOW_STEP',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FC_WORKFLOW_END_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FC_WORKFLOW_START_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FIRST_LEGAL_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'FLOOD_INS_LAST_PAID_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'FLOOD_INS_LAST_PAID_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FLOOD_INS_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'HELOC_DRAW_TERM',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_HELOC_DRAW_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FC_HOLD_ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'ORIG_IO_END_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SHORT_SALE_LIST_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'REO_HOLD_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'JUDGEMENT_FIGURES_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'LAST_INS_PAID_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'LIT_END_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'LIT_START_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_MFR_HEARING_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_MFR_REFERRED_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'MOD_CFPB_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'REINSTATEMENT_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'REO_ACTUAL_REPAIR_AMOUNT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'APPROVED_ASP_AS_IS_VAL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'APPROVED_ASP_REPAIR_VAL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'REO_APPROVED_REPAIR_COSTS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'REO_APPROVED_STRATEGY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ORIG_ASP_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'REO_END_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ACTUAL_HAZARD_CLAIM_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'HAZARD_CLAIM_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'ESTIMATED_HAZARD_CLAIM_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'ACTIVE_REO_HOLD_CT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'CURRENT_REO_LIST_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'REO_LIST_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CURRENT_REO_LIST_PRICE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'REO_REDEMPTION_STATE_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'REO_WORKFLOW_STEP',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'REO_WORKFLOW_STEP_END_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'REO_WORKFLOW_STEP_START_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'REO_EVICTION_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'REO_VACATE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'REPAIR_END_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'REPAIR_START_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'RESTRICTED_ESCROW_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'SERVICE_COMPLETE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'SOL_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'SPOC_NOTICE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'THIRD_PARTY_FUNDS_RECD_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'TRIAL_MOD_END_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_TRUSTEE_ABANDON_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK_TRUSTEE_ASSET_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK_TRUSTEE_ASSET_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CENSUS_TRACT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BUREAU_NAME',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PRIMARY_SSN',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SECONDARY_SSN',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PROPERTY_TAX_ID',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SELLER_LOAN_NUMBER',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ERECORD_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'LAST_ATTEMPT_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'SERVICER_BOARDING_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'CONTACTS_MTD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'ATTEMPTS_MTD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'COMPANION_LOAN_NUMBER',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MASS_AG_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CURTAILMENT_FEE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CURTAILMENT_PRINCIPAL',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'NET_INTEREST',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'POOL_LOAN_NUMBER',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'ORIG_MATURITY_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ORIG_AMORT_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ORIG_IO_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'ORIG_IO_PERIOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'FICO_ERROR_CODE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SERVICER_IN_PERIOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'SVCANUM_IN_PERIOD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'SERVICER_START_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'HELOC_DRAW_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'CLIST_APPR_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CLIST_APPR_TYPE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CLIST_APPR_VALUE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CLIST_APPR_CCY',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PAYSTRING_SELLER',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'PAYSTRING_DATE_SELLER',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK2_FILING_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK2_CASE_NUMBER',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK2_AGREED_ORDER_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK2_AMENDED_POC_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK2_APO_START_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK2_APO_END_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK2_ATTORNEY_NAME',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'BK2_CRAMDOWN_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK2_341_MEETING_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK2_HOLD_START_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'DAYS_ON_BK2_HOLD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK2_DEFAULT_NOTICE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK2_DISBURSE_AGENT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK2_DISCHARGED_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK2_CONTRACTUAL_DUE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'BK2_ACTIVE_HOLD_CT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK2_IMPEDIMENTS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK2_INTENT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK2_IS_ON_HOLD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK2_JURISDICTION',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK2_OBJECTION_HEARING_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK2_OBJECTION_REFERRED_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK2_PLAN_REVIEW_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'BK2_POC_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK2_REAFFIRMATION_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK2_RELIEF_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'BK2_TERM',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK2_TOC_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK2_MFR_HEARING_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK2_MFR_REFERRED_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK3_FILING_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK3_CASE_NUMBER',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK3_AGREED_ORDER_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK3_AMENDED_POC_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK3_APO_START_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK3_APO_END_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK3_ATTORNEY_NAME',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'BK3_CRAMDOWN_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK3_341_MEETING_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK3_HOLD_START_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'DAYS_ON_BK3_HOLD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK3_DEFAULT_NOTICE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK3_DISBURSE_AGENT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK3_DISCHARGED_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK3_CONTRACTUAL_DUE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'BK3_ACTIVE_HOLD_CT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK3_IMPEDIMENTS',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK3_INTENT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK3_IS_ON_HOLD',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BK3_JURISDICTION',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK3_OBJECTION_HEARING_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK3_OBJECTION_REFERRED_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK3_PLAN_REVIEW_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'BK3_POC_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK3_REAFFIRMATION_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK3_RELIEF_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'BK3_TERM',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK3_TOC_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK3_MFR_HEARING_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'BK3_MFR_REFERRED_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'SCHOOL_TAX_FREQ',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'SCHOOL_TAX_NEXT_DUE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'SCHOOL_TAX_NEXT_DUE_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'CITY_TAX_FREQ',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'CITY_TAX_NEXT_DUE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'CITY_TAX_NEXT_DUE_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'integer',
                },
                label: 'COUNTY_TAX_FREQ',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'COUNTY_TAX_NEXT_DUE_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'float',
                },
                label: 'COUNTY_TAX_NEXT_DUE_AMT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'PROP_YEAR_BUILT',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'MSR_OWNER',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'COVID_PLAN_FLAG',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'strictDate',
                  dateFormat: ['MM/dd/yyyy'],
                },
                label: 'COVID_PLAN_START_DATE',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CURRENT_APPR_PROP_COND',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BPO_ASIS_APPR_PROP_COND',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BPO_MOD_APPR_PROP_COND',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BPO_QS_APPR_PROP_COND',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BPE_APPR_PROP_COND',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CMV_APPR_PROP_COND',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'ASP_APPR_PROP_COND',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'REFI_APPR_PROP_COND',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'BPO_APPR_PROP_COND',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CPRICE_APPR_PROP_COND',
                optional: true,
              },
              {
                flatDataDataType: {
                  _type: 'string',
                },
                label: 'CLIST_APPR_PROP_COND',
                optional: true,
              },
            ],
          },
          sectionProperties: [
            {
              name: 'scope.untilEof',
              value: [true],
            },
            {
              name: 'delimiter',
              value: [','],
            },
            {
              name: 'recordSeparator',
              value: ['\r\n'],
            },
            {
              name: 'quoteChar',
              value: ['"'],
            },
            {
              name: 'nullString',
              value: [''],
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'myFlatDataTest::TapeToLogical',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'flatData',
          class: 'myFlatDataTest::Residential',
          flatData: 'myFlatDataTest::Tape',
          id: 'datamarts_rmd_domain_cerebro_instruments_residential_1_0_0_referenceData_product_loans_v2_resi_Residential',
          propertyMappings: [
            {
              _type: 'flatDataPropertyMapping',
              property: {
                class: 'myFlatDataTest::Residential',
                property: 'id',
              },
              source:
                'datamarts_rmd_domain_cerebro_instruments_residential_1_0_0_referenceData_product_loans_v2_resi_Residential',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                      {
                        _type: 'string',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: ['ETL_GS_LOAN_NUMBER'],
                      },
                    ],
                    property: 'oneString',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'embeddedFlatDataPropertyMapping',
              class: 'myFlatDataTest::Origination',
              id: 'datamarts_rmd_domain_cerebro_instruments_residential_1_0_0_referenceData_product_loans_v2_resi_Residential.resiOrigination',
              property: {
                class: 'myFlatDataTest::Residential',
                property: 'resiOrigination',
              },
              propertyMappings: [
                {
                  _type: 'flatDataPropertyMapping',
                  property: {
                    class: 'myFlatDataTest::Origination',
                    property: 'originationDate',
                  },
                  source:
                    'datamarts_rmd_domain_cerebro_instruments_residential_1_0_0_referenceData_product_loans_v2_resi_Residential.resiOrigination',
                  transform: {
                    _type: 'lambda',
                    body: [
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'src',
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: ['ORIG_DATE'],
                          },
                        ],
                        property: 'oneStrictDate',
                      },
                    ],
                    parameters: [],
                  },
                },
                {
                  _type: 'flatDataPropertyMapping',
                  property: {
                    class: 'myFlatDataTest::Origination',
                    property: 'originationBalance',
                  },
                  source:
                    'datamarts_rmd_domain_cerebro_instruments_residential_1_0_0_referenceData_product_loans_v2_resi_Residential.resiOrigination',
                  transform: {
                    _type: 'lambda',
                    body: [
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'src',
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: ['ORIG_BALANCE'],
                          },
                        ],
                        property: 'oneFloat',
                      },
                    ],
                    parameters: [],
                  },
                },
                {
                  _type: 'flatDataPropertyMapping',
                  property: {
                    class: 'myFlatDataTest::Origination',
                    property: 'originationRate',
                  },
                  source:
                    'datamarts_rmd_domain_cerebro_instruments_residential_1_0_0_referenceData_product_loans_v2_resi_Residential.resiOrigination',
                  transform: {
                    _type: 'lambda',
                    body: [
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'src',
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: ['ORIG_RATE'],
                          },
                        ],
                        property: 'oneFloat',
                      },
                    ],
                    parameters: [],
                  },
                },
                {
                  _type: 'flatDataPropertyMapping',
                  property: {
                    class: 'myFlatDataTest::Origination',
                    property: 'originationInterestOnlyFlag',
                  },
                  source:
                    'datamarts_rmd_domain_cerebro_instruments_residential_1_0_0_referenceData_product_loans_v2_resi_Residential.resiOrigination',
                  transform: {
                    _type: 'lambda',
                    body: [
                      {
                        _type: 'func',
                        function: 'if',
                        parameters: [
                          {
                            _type: 'func',
                            function: 'isEmpty',
                            parameters: [
                              {
                                _type: 'property',
                                parameters: [
                                  {
                                    _type: 'var',
                                    name: 'src',
                                  },
                                  {
                                    _type: 'string',
                                    multiplicity: {
                                      lowerBound: 1,
                                      upperBound: 1,
                                    },
                                    values: ['ORIG_IO_FLAG'],
                                  },
                                ],
                                property: 'optionalString',
                              },
                            ],
                          },
                          {
                            _type: 'lambda',
                            body: [
                              {
                                _type: 'collection',
                                multiplicity: {
                                  lowerBound: 0,
                                  upperBound: 0,
                                },
                                values: [],
                              },
                            ],
                            parameters: [],
                          },
                          {
                            _type: 'lambda',
                            body: [
                              {
                                _type: 'func',
                                function: 'if',
                                parameters: [
                                  {
                                    _type: 'func',
                                    function: 'equal',
                                    parameters: [
                                      {
                                        _type: 'func',
                                        function: 'toUpper',
                                        parameters: [
                                          {
                                            _type: 'func',
                                            function: 'toOne',
                                            parameters: [
                                              {
                                                _type: 'property',
                                                parameters: [
                                                  {
                                                    _type: 'var',
                                                    name: 'src',
                                                  },
                                                  {
                                                    _type: 'string',
                                                    multiplicity: {
                                                      lowerBound: 1,
                                                      upperBound: 1,
                                                    },
                                                    values: ['ORIG_IO_FLAG'],
                                                  },
                                                ],
                                                property: 'optionalString',
                                              },
                                            ],
                                          },
                                        ],
                                      },
                                      {
                                        _type: 'string',
                                        multiplicity: {
                                          lowerBound: 1,
                                          upperBound: 1,
                                        },
                                        values: ['Y'],
                                      },
                                    ],
                                  },
                                  {
                                    _type: 'lambda',
                                    body: [
                                      {
                                        _type: 'boolean',
                                        multiplicity: {
                                          lowerBound: 1,
                                          upperBound: 1,
                                        },
                                        values: [true],
                                      },
                                    ],
                                    parameters: [],
                                  },
                                  {
                                    _type: 'lambda',
                                    body: [
                                      {
                                        _type: 'func',
                                        function: 'if',
                                        parameters: [
                                          {
                                            _type: 'func',
                                            function: 'equal',
                                            parameters: [
                                              {
                                                _type: 'func',
                                                function: 'toUpper',
                                                parameters: [
                                                  {
                                                    _type: 'func',
                                                    function: 'toOne',
                                                    parameters: [
                                                      {
                                                        _type: 'property',
                                                        parameters: [
                                                          {
                                                            _type: 'var',
                                                            name: 'src',
                                                          },
                                                          {
                                                            _type: 'string',
                                                            multiplicity: {
                                                              lowerBound: 1,
                                                              upperBound: 1,
                                                            },
                                                            values: [
                                                              'ORIG_IO_FLAG',
                                                            ],
                                                          },
                                                        ],
                                                        property:
                                                          'optionalString',
                                                      },
                                                    ],
                                                  },
                                                ],
                                              },
                                              {
                                                _type: 'string',
                                                multiplicity: {
                                                  lowerBound: 1,
                                                  upperBound: 1,
                                                },
                                                values: ['N'],
                                              },
                                            ],
                                          },
                                          {
                                            _type: 'lambda',
                                            body: [
                                              {
                                                _type: 'boolean',
                                                multiplicity: {
                                                  lowerBound: 1,
                                                  upperBound: 1,
                                                },
                                                values: [false],
                                              },
                                            ],
                                            parameters: [],
                                          },
                                          {
                                            _type: 'lambda',
                                            body: [
                                              {
                                                _type: 'collection',
                                                multiplicity: {
                                                  lowerBound: 0,
                                                  upperBound: 0,
                                                },
                                                values: [],
                                              },
                                            ],
                                            parameters: [],
                                          },
                                        ],
                                      },
                                    ],
                                    parameters: [],
                                  },
                                ],
                              },
                            ],
                            parameters: [],
                          },
                        ],
                      },
                    ],
                    parameters: [],
                  },
                },
              ],
              root: false,
              source:
                'datamarts_rmd_domain_cerebro_instruments_residential_1_0_0_referenceData_product_loans_v2_resi_Residential',
              target:
                'datamarts_rmd_domain_cerebro_instruments_residential_1_0_0_referenceData_product_loans_v2_resi_Residential.resiOrigination',
            },
          ],
          root: true,
          sectionName: 'default',
        },
        {
          _type: 'flatData',
          class: 'myFlatDataTest::ResiBorrower',
          flatData: 'myFlatDataTest::Tape',
          id: 'b1',
          propertyMappings: [
            {
              _type: 'flatDataPropertyMapping',
              property: {
                class: 'myFlatDataTest::ResiBorrower',
                property: 'primaryFirstName',
              },
              source: 'b1',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                      {
                        _type: 'string',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: ['PRIMARY_FIRST_NAME'],
                      },
                    ],
                    property: 'oneString',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'flatDataPropertyMapping',
              property: {
                class: 'myFlatDataTest::ResiBorrower',
                property: 'primaryLastName',
              },
              source: 'b1',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                      {
                        _type: 'string',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: ['PRIMARY_LAST_NAME'],
                      },
                    ],
                    property: 'oneString',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'flatDataPropertyMapping',
              property: {
                class: 'myFlatDataTest::ResiBorrower',
                property: 'borrowerType',
              },
              source: 'b1',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                      {
                        _type: 'string',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: ['PRIMARY_BORROWER_TYPE'],
                      },
                    ],
                    property: 'oneString',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'flatDataPropertyMapping',
              property: {
                class: 'myFlatDataTest::ResiBorrower',
                property: 'financialLiabilities',
              },
              source: 'b1',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                      {
                        _type: 'string',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: ['PRIMARY_FINANCIAL_LIABILITIES'],
                      },
                    ],
                    property: 'oneFloat',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'flatDataPropertyMapping',
              property: {
                class: 'myFlatDataTest::ResiBorrower',
                property: 'income',
              },
              source: 'b1',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                      {
                        _type: 'string',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: ['PRIMARY_INCOME'],
                      },
                    ],
                    property: 'oneFloat',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'flatDataPropertyMapping',
              property: {
                class: 'myFlatDataTest::ResiBorrower',
                property: 'incomeCurrency',
              },
              source: 'b1',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'src',
                      },
                      {
                        _type: 'string',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        values: ['PRIMARY_INCOME_CURRENCY'],
                      },
                    ],
                    property: 'oneString',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'flatDataPropertyMapping',
              property: {
                class: 'myFlatDataTest::ResiBorrower',
                property: 'scraFlag',
              },
              source: 'b1',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    function: 'if',
                    parameters: [
                      {
                        _type: 'func',
                        function: 'isEmpty',
                        parameters: [
                          {
                            _type: 'property',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'src',
                              },
                              {
                                _type: 'string',
                                multiplicity: {
                                  lowerBound: 1,
                                  upperBound: 1,
                                },
                                values: ['SCRA_FLAG'],
                              },
                            ],
                            property: 'optionalString',
                          },
                        ],
                      },
                      {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'collection',
                            multiplicity: {
                              lowerBound: 0,
                              upperBound: 0,
                            },
                            values: [],
                          },
                        ],
                        parameters: [],
                      },
                      {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'func',
                            function: 'if',
                            parameters: [
                              {
                                _type: 'func',
                                function: 'equal',
                                parameters: [
                                  {
                                    _type: 'func',
                                    function: 'toUpper',
                                    parameters: [
                                      {
                                        _type: 'func',
                                        function: 'toOne',
                                        parameters: [
                                          {
                                            _type: 'property',
                                            parameters: [
                                              {
                                                _type: 'var',
                                                name: 'src',
                                              },
                                              {
                                                _type: 'string',
                                                multiplicity: {
                                                  lowerBound: 1,
                                                  upperBound: 1,
                                                },
                                                values: ['SCRA_FLAG'],
                                              },
                                            ],
                                            property: 'optionalString',
                                          },
                                        ],
                                      },
                                    ],
                                  },
                                  {
                                    _type: 'string',
                                    multiplicity: {
                                      lowerBound: 1,
                                      upperBound: 1,
                                    },
                                    values: ['Y'],
                                  },
                                ],
                              },
                              {
                                _type: 'lambda',
                                body: [
                                  {
                                    _type: 'boolean',
                                    multiplicity: {
                                      lowerBound: 1,
                                      upperBound: 1,
                                    },
                                    values: [true],
                                  },
                                ],
                                parameters: [],
                              },
                              {
                                _type: 'lambda',
                                body: [
                                  {
                                    _type: 'func',
                                    function: 'if',
                                    parameters: [
                                      {
                                        _type: 'func',
                                        function: 'equal',
                                        parameters: [
                                          {
                                            _type: 'func',
                                            function: 'toUpper',
                                            parameters: [
                                              {
                                                _type: 'func',
                                                function: 'toOne',
                                                parameters: [
                                                  {
                                                    _type: 'property',
                                                    parameters: [
                                                      {
                                                        _type: 'var',
                                                        name: 'src',
                                                      },
                                                      {
                                                        _type: 'string',
                                                        multiplicity: {
                                                          lowerBound: 1,
                                                          upperBound: 1,
                                                        },
                                                        values: ['SCRA_FLAG'],
                                                      },
                                                    ],
                                                    property: 'optionalString',
                                                  },
                                                ],
                                              },
                                            ],
                                          },
                                          {
                                            _type: 'string',
                                            multiplicity: {
                                              lowerBound: 1,
                                              upperBound: 1,
                                            },
                                            values: ['N'],
                                          },
                                        ],
                                      },
                                      {
                                        _type: 'lambda',
                                        body: [
                                          {
                                            _type: 'boolean',
                                            multiplicity: {
                                              lowerBound: 1,
                                              upperBound: 1,
                                            },
                                            values: [false],
                                          },
                                        ],
                                        parameters: [],
                                      },
                                      {
                                        _type: 'lambda',
                                        body: [
                                          {
                                            _type: 'collection',
                                            multiplicity: {
                                              lowerBound: 0,
                                              upperBound: 0,
                                            },
                                            values: [],
                                          },
                                        ],
                                        parameters: [],
                                      },
                                    ],
                                  },
                                ],
                                parameters: [],
                              },
                            ],
                          },
                        ],
                        parameters: [],
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'flatDataPropertyMapping',
              property: {
                class: 'myFlatDataTest::ResiBorrower',
                property: 'eRecordFlag',
              },
              source: 'b1',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'func',
                    function: 'if',
                    parameters: [
                      {
                        _type: 'func',
                        function: 'isEmpty',
                        parameters: [
                          {
                            _type: 'property',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'src',
                              },
                              {
                                _type: 'string',
                                multiplicity: {
                                  lowerBound: 1,
                                  upperBound: 1,
                                },
                                values: ['ERECORD_FLAG'],
                              },
                            ],
                            property: 'optionalString',
                          },
                        ],
                      },
                      {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'collection',
                            multiplicity: {
                              lowerBound: 0,
                              upperBound: 0,
                            },
                            values: [],
                          },
                        ],
                        parameters: [],
                      },
                      {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'func',
                            function: 'if',
                            parameters: [
                              {
                                _type: 'func',
                                function: 'equal',
                                parameters: [
                                  {
                                    _type: 'func',
                                    function: 'toUpper',
                                    parameters: [
                                      {
                                        _type: 'func',
                                        function: 'toOne',
                                        parameters: [
                                          {
                                            _type: 'property',
                                            parameters: [
                                              {
                                                _type: 'var',
                                                name: 'src',
                                              },
                                              {
                                                _type: 'string',
                                                multiplicity: {
                                                  lowerBound: 1,
                                                  upperBound: 1,
                                                },
                                                values: ['ERECORD_FLAG'],
                                              },
                                            ],
                                            property: 'optionalString',
                                          },
                                        ],
                                      },
                                    ],
                                  },
                                  {
                                    _type: 'string',
                                    multiplicity: {
                                      lowerBound: 1,
                                      upperBound: 1,
                                    },
                                    values: ['Y'],
                                  },
                                ],
                              },
                              {
                                _type: 'lambda',
                                body: [
                                  {
                                    _type: 'boolean',
                                    multiplicity: {
                                      lowerBound: 1,
                                      upperBound: 1,
                                    },
                                    values: [true],
                                  },
                                ],
                                parameters: [],
                              },
                              {
                                _type: 'lambda',
                                body: [
                                  {
                                    _type: 'func',
                                    function: 'if',
                                    parameters: [
                                      {
                                        _type: 'func',
                                        function: 'equal',
                                        parameters: [
                                          {
                                            _type: 'func',
                                            function: 'toUpper',
                                            parameters: [
                                              {
                                                _type: 'func',
                                                function: 'toOne',
                                                parameters: [
                                                  {
                                                    _type: 'property',
                                                    parameters: [
                                                      {
                                                        _type: 'var',
                                                        name: 'src',
                                                      },
                                                      {
                                                        _type: 'string',
                                                        multiplicity: {
                                                          lowerBound: 1,
                                                          upperBound: 1,
                                                        },
                                                        values: [
                                                          'ERECORD_FLAG',
                                                        ],
                                                      },
                                                    ],
                                                    property: 'optionalString',
                                                  },
                                                ],
                                              },
                                            ],
                                          },
                                          {
                                            _type: 'string',
                                            multiplicity: {
                                              lowerBound: 1,
                                              upperBound: 1,
                                            },
                                            values: ['N'],
                                          },
                                        ],
                                      },
                                      {
                                        _type: 'lambda',
                                        body: [
                                          {
                                            _type: 'boolean',
                                            multiplicity: {
                                              lowerBound: 1,
                                              upperBound: 1,
                                            },
                                            values: [false],
                                          },
                                        ],
                                        parameters: [],
                                      },
                                      {
                                        _type: 'lambda',
                                        body: [
                                          {
                                            _type: 'collection',
                                            multiplicity: {
                                              lowerBound: 0,
                                              upperBound: 0,
                                            },
                                            values: [],
                                          },
                                        ],
                                        parameters: [],
                                      },
                                    ],
                                  },
                                ],
                                parameters: [],
                              },
                            ],
                          },
                        ],
                        parameters: [],
                      },
                    ],
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'embeddedFlatDataPropertyMapping',
              class: 'myFlatDataTest::entity::Address',
              id: 'b1.resiBorrAddress',
              property: {
                class: 'myFlatDataTest::ResiBorrower',
                property: 'resiBorrAddress',
              },
              propertyMappings: [
                {
                  _type: 'flatDataPropertyMapping',
                  property: {
                    class: 'myFlatDataTest::entity::Address',
                    property: 'addressLine1',
                  },
                  source: 'b1.resiBorrAddress',
                  transform: {
                    _type: 'lambda',
                    body: [
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'src',
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: ['PRIMARY_ADDRESS'],
                          },
                        ],
                        property: 'oneString',
                      },
                    ],
                    parameters: [],
                  },
                },
                {
                  _type: 'flatDataPropertyMapping',
                  property: {
                    class: 'myFlatDataTest::entity::Address',
                    property: 'city',
                  },
                  source: 'b1.resiBorrAddress',
                  transform: {
                    _type: 'lambda',
                    body: [
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'src',
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: ['PRIMARY_BORROWER_CITY'],
                          },
                        ],
                        property: 'optionalString',
                      },
                    ],
                    parameters: [],
                  },
                },
                {
                  _type: 'flatDataPropertyMapping',
                  property: {
                    class: 'myFlatDataTest::entity::Address',
                    property: 'postalCode',
                  },
                  source: 'b1.resiBorrAddress',
                  transform: {
                    _type: 'lambda',
                    body: [
                      {
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'src',
                          },
                          {
                            _type: 'string',
                            multiplicity: {
                              lowerBound: 1,
                              upperBound: 1,
                            },
                            values: ['PRIMARY_BORROWER_ZIP'],
                          },
                        ],
                        property: 'oneString',
                      },
                    ],
                    parameters: [],
                  },
                },
                {
                  _type: 'embeddedFlatDataPropertyMapping',
                  class: 'myFlatDataTest::geography::State',
                  id: 'b1.resiBorrAddress.state',
                  property: {
                    class: 'myFlatDataTest::entity::Address',
                    property: 'state',
                  },
                  propertyMappings: [
                    {
                      _type: 'flatDataPropertyMapping',
                      property: {
                        class: 'myFlatDataTest::geography::State',
                        property: 'name',
                      },
                      source: 'b1.resiBorrAddress.state',
                      transform: {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'property',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'src',
                              },
                              {
                                _type: 'string',
                                multiplicity: {
                                  lowerBound: 1,
                                  upperBound: 1,
                                },
                                values: ['PRIMARY_BORROWER_STATE'],
                              },
                            ],
                            property: 'oneString',
                          },
                        ],
                        parameters: [],
                      },
                    },
                  ],
                  root: false,
                  source: 'b1.resiBorrAddress',
                  target: 'b1.resiBorrAddress.state',
                },
                {
                  _type: 'embeddedFlatDataPropertyMapping',
                  class: 'myFlatDataTest::geography::Country',
                  id: 'b1.resiBorrAddress.country',
                  property: {
                    class: 'myFlatDataTest::entity::Address',
                    property: 'country',
                  },
                  propertyMappings: [
                    {
                      _type: 'flatDataPropertyMapping',
                      property: {
                        class: 'myFlatDataTest::geography::Country',
                        property: 'countryName',
                      },
                      source: 'b1.resiBorrAddress.country',
                      transform: {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'property',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'src',
                              },
                              {
                                _type: 'string',
                                multiplicity: {
                                  lowerBound: 1,
                                  upperBound: 1,
                                },
                                values: ['PRIMARY_BORROWER_COUNTRY'],
                              },
                            ],
                            property: 'oneString',
                          },
                        ],
                        parameters: [],
                      },
                    },
                  ],
                  root: false,
                  source: 'b1.resiBorrAddress',
                  target: 'b1.resiBorrAddress.country',
                },
              ],
              root: false,
              source: 'b1',
              target: 'b1.resiBorrAddress',
            },
          ],
          root: false,
          sectionName: 'default',
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'TapeToLogical',
      package: 'myFlatDataTest',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];

// References to resolve in FlatData Connection
// - Connection store
export const TEST_DATA__FlatDataConnectionRoundtrip = [
  {
    path: 'test::tFlatData',
    content: {
      _type: 'flatData',
      name: 'tFlatData',
      package: 'test',
      sections: [],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'test::tConn',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'FlatDataConnection',
        element: 'tFlatData',
        url: 'my_url',
      },
      name: 'tConn',
      package: 'test',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          imports: [],
          elements: [],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['test::tFlatData'],
          parserName: 'FlatData',
        },
        {
          _type: 'importAware',
          imports: ['test'],
          elements: ['test::tConn'],
          parserName: 'Connection',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];

// References to resolve in FlatData Mapping Test Input Data
// - store
export const TEST_DATA__FlatDataInputDataRoundtrip = [
  {
    path: 'test::tClass',
    content: {
      _type: 'class',
      name: 'tClass',
      package: 'test',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::tFlatData',
    content: {
      _type: 'flatData',
      name: 'tFlatData',
      package: 'test',
      sections: [],
    },
    classifierPath: 'meta::flatData::metamodel::FlatData',
  },
  {
    path: 'test::tMapping',
    content: {
      _type: 'mapping',
      classMappings: [],
      enumerationMappings: [],
      includedMappings: [],
      name: 'tMapping',
      package: 'test',
      tests: [
        {
          assert: {
            _type: 'expectedOutputMappingTestAssert',
            expectedOutput:
              '{"defects":[],"value":{"name":"oneName 2"},"source":{"defects":[],"value":{"oneName":"oneName 2"},"source":{"number":1,"record":"{"oneName":"oneName 2","anotherName":"anotherName 16","oneDate":"2020-02-05","anotherDate":"2020-04-13","oneNumber":24,"anotherNumber":29}"}}}',
          },
          inputData: [
            {
              _type: 'flatData',
              data: '{"oneName":"oneName 2"}',
              sourceFlatData: {
                path: 'tFlatData',
                type: 'STORE',
              },
            },
          ],
          name: 'defaultTest',
          query: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'getAll',
                parameters: [
                  {
                    _type: 'packageableElementPtr',
                    fullPath: 'tClass',
                  },
                ],
              },
            ],
            parameters: [],
          },
        },
      ],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: '__internal__::SectionIndex',
    content: {
      _type: 'sectionIndex',
      name: 'SectionIndex',
      package: '__internal__',
      sections: [
        {
          _type: 'importAware',
          imports: [],
          elements: ['test::tClass'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['test::tFlatData'],
          parserName: 'FlatData',
        },
        {
          _type: 'importAware',
          imports: ['test'],
          elements: ['test::tMapping'],
          parserName: 'Mapping',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];
