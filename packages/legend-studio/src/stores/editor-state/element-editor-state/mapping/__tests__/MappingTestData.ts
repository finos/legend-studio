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

export const mappingTestData = [
  {
    path: 'model::Source_Person',
    content: {
      _type: 'class',
      name: 'Source_Person',
      package: 'model',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'sFirstName',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'sLastName',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'model::Target_Person',
    content: {
      _type: 'class',
      name: 'Target_Person',
      package: 'model',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firstName',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'lastName',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'model::SimpleMapping',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'model::Target_Person',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'model::Target_Person',
                property: 'firstName',
              },
              source: 'model_Target_Person',
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
                    ],
                    property: 'sFirstName',
                  },
                ],
                parameters: [],
              },
            },
            {
              _type: 'purePropertyMapping',
              explodeProperty: false,
              property: {
                class: 'model::Target_Person',
                property: 'lastName',
              },
              source: 'model_Target_Person',
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
                    ],
                    property: 'sLastName',
                  },
                ],
                parameters: [],
              },
            },
          ],
          root: true,
          srcClass: 'model::Source_Person',
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'SimpleMapping',
      package: 'model',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];

export const executeResultResponse = JSON.stringify({
  builder: {
    _type: 'json',
  },
  values: {
    defects: [],
    source: {
      defects: [],
      source: {
        number: 1,
        record: '{"sFirstName":"myFirstName","sLastName":"myLastName"}',
      },
      value: {
        sFirstName: 'myFirstName',
        sLastName: 'myLastName',
      },
    },
    value: {
      firstName: 'myFirstName',
      lastName: 'myLastName',
    },
  },
});

export const generatedSourceData = {
  sFirstName: 'myFirstName',
  sLastName: 'myLastName',
};
