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

const availabilityClassifierPath =
  'meta::external::lakehouse::specification::metamodel::Availability';

const sectionIndexForSingleAvailability = {
  path: '__internal__::SectionIndex',
  content: {
    _type: 'sectionIndex',
    name: 'SectionIndex',
    package: '__internal__',
    sections: [
      {
        _type: 'importAware',
        elements: [],
        imports: [],
        parserName: 'Pure',
      },
      {
        _type: 'importAware',
        elements: ['availability::A'],
        imports: [],
        parserName: 'Lakehouse',
      },
    ],
  },
  classifierPath: 'meta::pure::metamodel::section::SectionIndex',
};

const baseAvailabilityEntity = {
  path: 'availability::A',
  content: {
    _type: 'Availability',
    barrier: {
      _type: 'lambda',
      body: [
        {
          _type: 'integer',
          value: 1,
        },
      ],
      parameters: [],
    },
    extraIngestDefinitions: ['ingest::MainIngest'],
    name: 'A',
    owner: {
      appDirId: 12345,
      level: 'DEPLOYMENT',
    },
    package: 'availability',
  },
  classifierPath: availabilityClassifierPath,
};

export const TEST_DATA__AVAILABILITY_NO_TESTS = [
  baseAvailabilityEntity,
  sectionIndexForSingleAvailability,
];

export const TEST_DATA__AVAILABILITY_DEFAULT_FORMAT = [
  {
    ...baseAvailabilityEntity,
    content: {
      ...baseAvailabilityEntity.content,
      testSuites: [
        {
          id: 'suite_1',
          testData: {
            columns: ['eventId', 'status'],
            paths: ['availability::A'],
            rows: [
              {
                values: ['evt-1', 'OK'],
              },
            ],
          },
          tests: [
            {
              assertions: [
                {
                  _type: 'equalToJson',
                  expected: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '{"eventId":"evt-1","status":"OK"}',
                  },
                  id: 'assert_1',
                },
              ],
              id: 'test_1',
              watermarkSerializationFormat: 'DEFAULT',
            },
          ],
        },
      ],
    },
  },
  sectionIndexForSingleAvailability,
];

export const TEST_DATA__AVAILABILITY_LITE_FORMAT = [
  {
    ...baseAvailabilityEntity,
    content: {
      ...baseAvailabilityEntity.content,
      testSuites: [
        {
          id: 'suite_lite',
          tests: [
            {
              assertions: [
                {
                  _type: 'equalToJson',
                  expected: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '{"eventId":"evt-lite"}',
                  },
                  id: 'assert_lite',
                },
              ],
              id: 'test_lite',
              watermarkSerializationFormat: 'LITE',
            },
          ],
        },
      ],
    },
  },
  sectionIndexForSingleAvailability,
];

export const TEST_DATA__AVAILABILITY_ALLOY_QUERY_FORMAT = [
  {
    ...baseAvailabilityEntity,
    content: {
      ...baseAvailabilityEntity.content,
      testSuites: [
        {
          id: 'suite_alloy',
          tests: [
            {
              assertions: [
                {
                  _type: 'equalToJson',
                  expected: {
                    _type: 'externalFormat',
                    contentType: 'application/json',
                    data: '{"query":"from availability::A"}',
                  },
                  id: 'assert_alloy',
                },
              ],
              id: 'test_alloy',
              watermarkSerializationFormat: 'ALLOY_QUERY',
            },
          ],
        },
      ],
    },
  },
  sectionIndexForSingleAvailability,
];

export const TEST_DATA__AVAILABILITY_NOTIFICATION_VARIANTS = [
  {
    ...baseAvailabilityEntity,
    path: 'availability::Procmon',
    content: {
      ...baseAvailabilityEntity.content,
      name: 'Procmon',
      notification: {
        content: {
          destination: 'procmon-topic',
        },
        type: 'PROCMON',
      },
    },
  },
  {
    ...baseAvailabilityEntity,
    path: 'availability::MessageBus',
    content: {
      ...baseAvailabilityEntity.content,
      name: 'MessageBus',
      notification: {
        content: {
          channel: 'availability-events',
          format: 'json',
        },
        type: 'MESSAGEBUS',
      },
    },
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
          elements: [],
          imports: [],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          elements: ['availability::Procmon', 'availability::MessageBus'],
          imports: [],
          parserName: 'Lakehouse',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];
