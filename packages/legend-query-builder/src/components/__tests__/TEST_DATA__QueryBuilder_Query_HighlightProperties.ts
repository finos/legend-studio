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

export const TEST_DATA__simpleProjection = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'project',
      parameters: [
        {
          _type: 'func',
          function: 'getAll',
          parameters: [
            {
              _type: 'packageableElementPtr',
              fullPath: 'my::Firm',
            },
          ],
        },
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          values: [
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'employees',
                    },
                  ],
                  property: 'name',
                },
              ],
              parameters: [
                {
                  _type: 'var',
                  name: 'x',
                },
              ],
            },
          ],
        },
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          values: [
            {
              _type: 'string',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              values: ['Employees/Name'],
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__projectionWithNestedSubtype = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'project',
      parameters: [
        {
          _type: 'func',
          function: 'getAll',
          parameters: [
            {
              _type: 'packageableElementPtr',
              fullPath: 'model::Person',
            },
          ],
        },
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          values: [
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'subType',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'subType',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'x',
                                },
                              ],
                              property: 'address',
                            },
                            {
                              _type: 'genericTypeInstance',
                              fullPath: 'model::AddressType1',
                            },
                          ],
                        },
                        {
                          _type: 'genericTypeInstance',
                          fullPath: 'model::AddressType2',
                        },
                      ],
                    },
                  ],
                  property: 'zip',
                },
              ],
              parameters: [
                {
                  _type: 'var',
                  name: 'x',
                },
              ],
            },
          ],
        },
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          values: [
            {
              _type: 'string',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              values: ['Zip'],
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__simpleGraphFetch = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'serialize',
      parameters: [
        {
          _type: 'func',
          function: 'graphFetch',
          parameters: [
            {
              _type: 'func',
              function: 'getAll',
              parameters: [
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'my::Firm',
                },
              ],
            },
            {
              _type: 'rootGraphFetchTree',
              class: 'my::Firm',
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'legalName',
                  subTrees: [],
                  subTypeTrees: [],
                },
              ],
            },
          ],
        },
        {
          _type: 'rootGraphFetchTree',
          class: 'my::Firm',
          subTrees: [
            {
              _type: 'propertyGraphFetchTree',
              parameters: [],
              property: 'legalName',
              subTrees: [],
              subTypeTrees: [],
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__graphFetchWithNestedSubtype = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'serialize',
      parameters: [
        {
          _type: 'func',
          function: 'graphFetch',
          parameters: [
            {
              _type: 'func',
              function: 'getAll',
              parameters: [
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'model::Person',
                },
              ],
            },
            {
              _type: 'rootGraphFetchTree',
              class: 'model::Person',
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'address',
                  subTrees: [
                    {
                      _type: 'propertyGraphFetchTree',
                      parameters: [],
                      property: 'zip',
                      subTrees: [],
                    },
                  ],
                  subTypeTrees: [],
                  subType: 'model::AddressType2',
                },
              ],
            },
          ],
        },
        {
          _type: 'rootGraphFetchTree',
          class: 'model::Person',
          subTrees: [
            {
              _type: 'propertyGraphFetchTree',
              parameters: [],
              property: 'address',
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'zip',
                  subTrees: [],
                },
              ],
              subTypeTrees: [],
              subType: 'model::AddressType2',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};
