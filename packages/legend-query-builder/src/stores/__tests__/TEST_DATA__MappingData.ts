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

export const TEST_DATA__MappingData__ComplexM2MModel = [
  {
    childNodes: [
      { childNodes: [], mappingData: { mapped: true }, name: 'fullName' },
      { childNodes: [], mappingData: { mapped: false }, name: 'age' },
    ],
    mappingData: { mapped: true },
    name: 'nEmployees',
  },
  { childNodes: [], mappingData: { mapped: true }, name: 'name' },
  { childNodes: [], mappingData: { mapped: true }, name: 'incType' },
  {
    childNodes: [
      { childNodes: [], mappingData: { mapped: true }, name: 'fullName' },
      { childNodes: [], mappingData: { mapped: false }, name: 'age' },
    ],
    mappingData: { mapped: true },
    name: 'firstEmployee',
  },
  { childNodes: [], mappingData: { mapped: true }, name: 'myName' },
];

export const TEST_DATA__MappingData__COVIDDataSimpleModel = [
  {
    childNodes: [],
    mappingData: { mapped: true },
    name: 'id',
  },
  {
    childNodes: [],
    mappingData: { mapped: true },
    name: 'fips',
  },
  {
    childNodes: [],
    mappingData: { mapped: true },
    name: 'date',
  },
  {
    childNodes: [],
    mappingData: { mapped: true },
    name: 'caseType',
  },
  {
    childNodes: [],
    mappingData: { mapped: true },
    name: 'cases',
  },
  {
    childNodes: [],
    mappingData: { mapped: true },
    name: 'lastReportedFlag',
  },
  {
    childNodes: [
      {
        childNodes: [],
        mappingData: { mapped: true },
        name: 'fips',
      },
      {
        childNodes: [],
        mappingData: { mapped: true },
        name: 'state',
      },
    ],
    mappingData: { mapped: true },
    name: 'demographics',
  },
];

export const TEST_DATA__MappingData_M2MAutoMapped = [
  {
    childNodes: [],
    mappingData: { mapped: true },
    name: 'name',
  },
  {
    childNodes: [],
    mappingData: { mapped: true },
    name: 'location',
  },
];

export const TEST_DATA__MappingData_RelationalInline = [
  {
    name: 'lName',
    mappingData: { mapped: false },
    childNodes: [],
  },
  {
    name: 'fName',
    mappingData: { mapped: true },
    childNodes: [],
  },
  {
    name: 'firm',
    mappingData: { mapped: true },
    childNodes: [
      {
        name: 'id',
        mappingData: { mapped: true },
        childNodes: [],
      },
      {
        name: 'name',
        mappingData: { mapped: true },
        childNodes: [],
      },
    ],
  },
];

export const TEST_DATA__MappingData__Relational_Inheritance = [
  { childNodes: [], mappingData: { mapped: true }, name: 'legalName' },
  {
    childNodes: [
      { childNodes: [], mappingData: { mapped: true }, name: 'firstName' },
      { childNodes: [], mappingData: { mapped: true }, name: 'lastName' },
    ],
    mappingData: { mapped: true },
    name: 'employees',
  },
  { childNodes: [], mappingData: { mapped: false }, name: 'incType' },
  { childNodes: [], mappingData: { mapped: true }, name: 'employeeSize' },
];

export const TEST_DATA__MappingData__AssociationMapping = [
  {
    childNodes: [
      {
        childNodes: [
          {
            childNodes: [
              {
                childNodes: [],
                mappingData: { mapped: true },
                name: 'employee',
              },
              { childNodes: [], mappingData: { mapped: true }, name: 'name' },
            ],
            mappingData: { mapped: true },
            name: 'firm',
          },
          { childNodes: [], mappingData: { mapped: true }, name: 'firstName' },
          { childNodes: [], mappingData: { mapped: true }, name: 'lastName' },
        ],
        mappingData: { mapped: true },
        name: 'employee',
      },
      { childNodes: [], mappingData: { mapped: true }, name: 'name' },
    ],
    mappingData: { mapped: true },
    name: 'firm',
  },
  { childNodes: [], mappingData: { mapped: true }, name: 'firstName' },
  { childNodes: [], mappingData: { mapped: true }, name: 'lastName' },
];

export const TEST_DATA__Mappingdata__NestedSubtype = [
  { childNodes: [], mappingData: { mapped: true }, name: 'name' },
  {
    childNodes: [
      { childNodes: [], mappingData: { mapped: true }, name: 'streetName' },
      {
        childNodes: [
          { childNodes: [], mappingData: { mapped: true }, name: 'streetName' },
          { childNodes: [], mappingData: { mapped: true }, name: 'zipcode' },
          {
            childNodes: [
              {
                childNodes: [],
                mappingData: { mapped: true },
                name: 'zipcode',
              },
              {
                childNodes: [],
                mappingData: { mapped: true },
                name: 'streetName',
              },
              { childNodes: [], mappingData: { mapped: true }, name: 'zip' },
            ],
            mappingData: { mapped: true },
            name: 'model::AddressType2',
          },
          {
            childNodes: [
              {
                childNodes: [],
                mappingData: { mapped: true },
                name: 'zipcode',
              },
              {
                childNodes: [],
                mappingData: { mapped: true },
                name: 'streetName',
              },
            ],
            mappingData: { mapped: true },
            name: 'model::AddressType3',
          },
        ],
        mappingData: { mapped: true },
        name: 'model::AddressType1',
      },
    ],
    mappingData: { mapped: true },
    name: 'address',
  },
];

export const TEST_DATA__Mappingdata__MultiMappedNestedSubtype = [
  {
    childNodes: [
      {
        childNodes: [
          {
            childNodes: [],
            mappingData: { mapped: true },
            name: 'position',
          },
          {
            childNodes: [],
            mappingData: { mapped: true },
            name: 'name',
          },
        ],
        mappingData: { mapped: true },
        name: 'firm',
      },
      { childNodes: [], mappingData: { mapped: true }, name: 'rank' },
      {
        childNodes: [
          {
            childNodes: [],
            mappingData: { mapped: true },
            name: 'firm',
          },
          {
            childNodes: [],
            mappingData: { mapped: true },
            name: 'rank',
          },
          {
            childNodes: [],
            mappingData: { mapped: true },
            name: 'subName',
          },
        ],
        mappingData: { mapped: true },
        name: 'model::SubPosition',
      },
    ],
    mappingData: { mapped: true },
    name: 'position',
  },
  { childNodes: [], mappingData: { mapped: true }, name: 'name' },
];

export const TEST_DATA__Mappingdata__SimpleSubtype = [
  { childNodes: [], mappingData: { mapped: false }, name: 'legalName' },
  { childNodes: [], mappingData: { mapped: true }, name: 'Name' },
  {
    childNodes: [
      { childNodes: [], mappingData: { mapped: true }, name: 'firstName' },
      { childNodes: [], mappingData: { mapped: true }, name: 'lastName' },
      {
        childNodes: [
          { childNodes: [], mappingData: { mapped: true }, name: 'streetName' },
          {
            childNodes: [
              {
                childNodes: [],
                mappingData: { mapped: true },
                name: 'streetName',
              },
              {
                childNodes: [],
                mappingData: { mapped: true },
                name: 'zipcode',
              },
              {
                childNodes: [
                  {
                    childNodes: [],
                    mappingData: { mapped: true },
                    name: 'zipcode',
                  },
                  {
                    childNodes: [],
                    mappingData: { mapped: true },
                    name: 'streetName',
                  },
                  {
                    childNodes: [],
                    mappingData: { mapped: true },
                    name: 'id',
                  },
                ],
                mappingData: { mapped: true },
                name: 'model::Colony',
              },
            ],
            mappingData: { mapped: true },
            name: 'model::Street',
          },
        ],
        mappingData: { mapped: true },
        name: 'address',
      },
    ],
    mappingData: { mapped: true },
    name: 'employees',
  },
];
