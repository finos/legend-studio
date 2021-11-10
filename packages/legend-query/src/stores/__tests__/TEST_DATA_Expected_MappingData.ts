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

export const EXPECTED_MappingData_ComplexM2MModel = [
  {
    name: 'nEmployees',
    mappingData: { mapped: true },
    childNodes: [
      {
        name: 'fullName',
        mappingData: { mapped: true },
        childNodes: [],
      },
      {
        name: 'age',
        mappingData: { mapped: false },
        childNodes: [],
      },
    ],
  },
  {
    name: 'name',
    mappingData: { mapped: true },
    childNodes: [],
  },
  {
    name: 'incType',
    mappingData: { mapped: true },
    childNodes: [],
  },
];

export const EXPECTED_MappingData__COVIDDataSimpleModel = [
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

export const EXPECTED_MappingData__Auto_M2M = [
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

export const EXPECTED_MappingData__Relational_Inline = [
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
