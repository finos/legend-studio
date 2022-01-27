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
              fullPath: 'model::pure::tests::model::simple::Person',
            },
          ],
        },
        {
          _type: 'collection',
          values: [
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'property',
                  property: 'firstName',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
                    },
                  ],
                },
              ],
              parameters: [
                {
                  _type: 'var',
                  name: 'x',
                },
              ],
            },
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'property',
                  property: 'lastName',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
                    },
                  ],
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
          multiplicity: {
            lowerBound: 2,
            upperBound: 2,
          },
        },
        {
          _type: 'collection',
          values: [
            {
              _type: 'string',
              values: ['Edited First Name'],
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
            {
              _type: 'string',
              values: ['Last Name'],
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
          ],
          multiplicity: {
            lowerBound: 2,
            upperBound: 2,
          },
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__simpleProjectionWithSubtype = {
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
              fullPath: 'model::pure::tests::model::simple::Person',
            },
          ],
        },
        {
          _type: 'collection',
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
                          _type: 'var',
                          name: 'x',
                        },
                        {
                          _type: 'hackedClass',
                          fullPath: 'model::pure::tests::model::simple::Person',
                        },
                      ],
                    },
                  ],
                  property: 'firstName',
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
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
        },
        {
          _type: 'collection',
          values: [
            {
              _type: 'string',
              values: ['(@Person)/First Name'],
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
          ],
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__projectionWithChainedProperty = {
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
              fullPath: 'model::pure::tests::model::simple::Person',
            },
          ],
        },
        {
          _type: 'collection',
          values: [
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'property',
                  property: 'legalName',
                  parameters: [
                    {
                      _type: 'property',
                      property: 'firm',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                    },
                  ],
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
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
        },
        {
          _type: 'collection',
          values: [
            {
              _type: 'string',
              values: ['Firm/Legal Name'],
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
          ],
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__projectWithDerivedProperty = {
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
              fullPath: 'model::pure::tests::model::simple::Person',
            },
          ],
        },
        {
          _type: 'collection',
          values: [
            {
              _type: 'lambda',
              body: [
                {
                  _type: 'property',
                  property: 'nameWithTitle',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
                    },
                    {
                      _type: 'string',
                      values: ['Mr.'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                  ],
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
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
        },
        {
          _type: 'collection',
          values: [
            {
              _type: 'string',
              values: ['Full Name With Title'],
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
          ],
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__projectionWithResultSetModifiers = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'take',
      parameters: [
        {
          _type: 'func',
          function: 'sort',
          parameters: [
            {
              _type: 'func',
              function: 'distinct',
              parameters: [
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
                          fullPath: 'model::pure::tests::model::simple::Person',
                        },
                      ],
                    },
                    {
                      _type: 'collection',
                      values: [
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              property: 'firstName',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'x',
                                },
                              ],
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              property: 'lastName',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'x',
                                },
                              ],
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              property: 'legalName',
                              parameters: [
                                {
                                  _type: 'property',
                                  property: 'firm',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'x',
                                    },
                                  ],
                                },
                              ],
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
                      multiplicity: {
                        lowerBound: 3,
                        upperBound: 3,
                      },
                    },
                    {
                      _type: 'collection',
                      values: [
                        {
                          _type: 'string',
                          values: ['Edited First Name'],
                          multiplicity: {
                            lowerBound: 1,
                            upperBound: 1,
                          },
                        },
                        {
                          _type: 'string',
                          values: ['Last Name'],
                          multiplicity: {
                            lowerBound: 1,
                            upperBound: 1,
                          },
                        },
                        {
                          _type: 'string',
                          values: ['Firm/Legal Name'],
                          multiplicity: {
                            lowerBound: 1,
                            upperBound: 1,
                          },
                        },
                      ],
                      multiplicity: {
                        lowerBound: 3,
                        upperBound: 3,
                      },
                    },
                  ],
                },
              ],
            },
            {
              _type: 'collection',
              values: [
                {
                  _type: 'func',
                  function: 'asc',
                  parameters: [
                    {
                      _type: 'string',
                      values: ['Edited First Name'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                  ],
                },
                {
                  _type: 'func',
                  function: 'desc',
                  parameters: [
                    {
                      _type: 'string',
                      values: ['Firm/Legal Name'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                  ],
                },
              ],
              multiplicity: {
                lowerBound: 2,
                upperBound: 2,
              },
            },
          ],
        },
        {
          _type: 'integer',
          values: [500],
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__getAllWithOneConditionFilter = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'filter',
      parameters: [
        {
          _type: 'func',
          function: 'getAll',
          parameters: [
            {
              _type: 'packageableElementPtr',
              fullPath: 'model::pure::tests::model::simple::Person',
            },
          ],
        },
        {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'equal',
              parameters: [
                {
                  _type: 'property',
                  property: 'firstName',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
                    },
                  ],
                },
                {
                  _type: 'string',
                  values: ['testFirstName'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
              ],
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
  ],
  parameters: [],
};

export const TEST_DATA__filterQueryWithSubtypeWithoutExists = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'filter',
      parameters: [
        {
          _type: 'func',
          function: 'getAll',
          parameters: [
            {
              _type: 'packageableElementPtr',
              fullPath: 'model::pure::tests::model::simple::Person',
            },
          ],
        },
        {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'equal',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'subType',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                        {
                          _type: 'hackedClass',
                          fullPath:
                            'model::pure::tests::model::simple::PersonExtension',
                        },
                      ],
                    },
                  ],
                  property: 'birthdate',
                },
                {
                  _type: 'dateTime',
                  values: ['2022-01-26'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
              ],
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
  ],
  parameters: [],
};

export const TEST_DATA__filterQueryWithSubtypeWithExists = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'filter',
      parameters: [
        {
          _type: 'func',
          function: 'getAll',
          parameters: [
            {
              _type: 'packageableElementPtr',
              fullPath: 'model::pure::tests::model::simple::Person',
            },
          ],
        },
        {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'exists',
              parameters: [
                {
                  _type: 'property',
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
                          property: 'firm',
                        },
                        {
                          _type: 'hackedClass',
                          fullPath:
                            'model::pure::tests::model::simple::FirmExtension',
                        },
                      ],
                    },
                  ],
                  property: 'employeesExt',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'equal',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'x_1',
                                },
                              ],
                              property: 'address',
                            },
                          ],
                          property: 'comments',
                        },
                        {
                          _type: 'string',
                          values: [''],
                          multiplicity: {
                            lowerBound: 1,
                            upperBound: 1,
                          },
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x_1',
                    },
                  ],
                },
              ],
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
  ],
  parameters: [],
};

export const TEST_DATA__filterQueryWithSubtypeWithExistsChain = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'filter',
      parameters: [
        {
          _type: 'func',
          function: 'getAll',
          parameters: [
            {
              _type: 'packageableElementPtr',
              fullPath: 'model::pure::tests::model::simple::Person',
            },
          ],
        },
        {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'exists',
              parameters: [
                {
                  _type: 'property',
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
                          property: 'firm',
                        },
                        {
                          _type: 'hackedClass',
                          fullPath:
                            'model::pure::tests::model::simple::FirmExtension',
                        },
                      ],
                    },
                  ],
                  property: 'employeesExt',
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'exists',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'x_1',
                                },
                              ],
                              property: 'manager',
                            },
                          ],
                          property: 'locations',
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'equal',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'x_2',
                                    },
                                  ],
                                  property: 'place',
                                },
                                {
                                  _type: 'string',
                                  values: [''],
                                  multiplicity: {
                                    lowerBound: 1,
                                    upperBound: 1,
                                  },
                                },
                              ],
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x_2',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x_1',
                    },
                  ],
                },
              ],
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
  ],
  parameters: [],
};

export const TEST_DATA__getAllWithGroupedFilter = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'filter',
      parameters: [
        {
          _type: 'func',
          function: 'getAll',
          parameters: [
            {
              _type: 'packageableElementPtr',
              fullPath: 'model::pure::tests::model::simple::Person',
            },
          ],
        },
        {
          _type: 'lambda',
          body: [
            {
              _type: 'func',
              function: 'or',
              parameters: [
                {
                  _type: 'func',
                  function: 'equal',
                  parameters: [
                    {
                      _type: 'property',
                      property: 'firstName',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                    },
                    {
                      _type: 'string',
                      values: ['firstNameTest'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                  ],
                },
                {
                  _type: 'func',
                  function: 'equal',
                  parameters: [
                    {
                      _type: 'property',
                      property: 'lastName',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                    },
                    {
                      _type: 'string',
                      values: ['lastNameTest'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                  ],
                },
              ],
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
  ],
  parameters: [],
};

export const TEST_DATA__fullComplexProjectionQuery = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'take',
      parameters: [
        {
          _type: 'func',
          function: 'sort',
          parameters: [
            {
              _type: 'func',
              function: 'project',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'getAll',
                      parameters: [
                        {
                          _type: 'packageableElementPtr',
                          fullPath: 'model::pure::tests::model::simple::Person',
                        },
                      ],
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'or',
                          parameters: [
                            {
                              _type: 'func',
                              function: 'equal',
                              parameters: [
                                {
                                  _type: 'property',
                                  property: 'firstName',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'x',
                                    },
                                  ],
                                },
                                {
                                  _type: 'string',
                                  values: ['testFirstName'],
                                  multiplicity: {
                                    lowerBound: 1,
                                    upperBound: 1,
                                  },
                                },
                              ],
                            },
                            {
                              _type: 'func',
                              function: 'equal',
                              parameters: [
                                {
                                  _type: 'property',
                                  property: 'lastName',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'x',
                                    },
                                  ],
                                },
                                {
                                  _type: 'string',
                                  values: ['testLastName'],
                                  multiplicity: {
                                    lowerBound: 1,
                                    upperBound: 1,
                                  },
                                },
                              ],
                            },
                          ],
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
                  values: [
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          property: 'firstName',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          property: 'lastName',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                          ],
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          property: 'nameWithTitle',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                            {
                              _type: 'string',
                              values: ['Mr.'],
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                            },
                          ],
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
                  multiplicity: {
                    lowerBound: 3,
                    upperBound: 3,
                  },
                },
                {
                  _type: 'collection',
                  values: [
                    {
                      _type: 'string',
                      values: ['First Name'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                    {
                      _type: 'string',
                      values: ['Last Name'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                    {
                      _type: 'string',
                      values: ['Name With Title'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                  ],
                  multiplicity: {
                    lowerBound: 3,
                    upperBound: 3,
                  },
                },
              ],
            },
            {
              _type: 'collection',
              values: [
                {
                  _type: 'func',
                  function: 'asc',
                  parameters: [
                    {
                      _type: 'string',
                      values: ['First Name'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                  ],
                },
                {
                  _type: 'func',
                  function: 'desc',
                  parameters: [
                    {
                      _type: 'string',
                      values: ['Last Name'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                  ],
                },
                {
                  _type: 'func',
                  function: 'asc',
                  parameters: [
                    {
                      _type: 'string',
                      values: ['Name With Title'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                  ],
                },
              ],
              multiplicity: {
                lowerBound: 3,
                upperBound: 3,
              },
            },
          ],
        },
        {
          _type: 'integer',
          values: [5],
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
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
          function: 'graphFetchChecked',
          parameters: [
            {
              _type: 'func',
              function: 'getAll',
              parameters: [
                {
                  _type: 'packageableElementPtr',
                  fullPath: 'model::target::NPerson',
                },
              ],
            },
            {
              _type: 'rootGraphFetchTree',
              class: 'model::target::NPerson',
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'fullName',
                  subTrees: [],
                },
              ],
            },
          ],
        },
        {
          _type: 'rootGraphFetchTree',
          class: 'model::target::NPerson',
          subTrees: [
            {
              _type: 'propertyGraphFetchTree',
              parameters: [],
              property: 'fullName',
              subTrees: [],
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__complexGraphFetch = {
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
                  fullPath: 'model::target::NFirm',
                },
              ],
            },
            {
              _type: 'rootGraphFetchTree',
              class: 'model::target::NFirm',
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'nEmployees',
                  subTrees: [
                    {
                      _type: 'propertyGraphFetchTree',
                      parameters: [],
                      property: 'fullName',
                      subTrees: [],
                    },
                  ],
                },
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'incType',
                  subTrees: [],
                },
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'name',
                  subTrees: [],
                },
              ],
            },
          ],
        },
        {
          _type: 'rootGraphFetchTree',
          class: 'model::target::NFirm',
          subTrees: [
            {
              _type: 'propertyGraphFetchTree',
              parameters: [],
              property: 'nEmployees',
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'fullName',
                  subTrees: [],
                },
              ],
            },
            {
              _type: 'propertyGraphFetchTree',
              parameters: [],
              property: 'incType',
              subTrees: [],
            },
            {
              _type: 'propertyGraphFetchTree',
              parameters: [],
              property: 'name',
              subTrees: [],
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__graphFetchWithDerivedProperty = {
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
                  fullPath: 'model::target::NFirm',
                },
              ],
            },
            {
              _type: 'rootGraphFetchTree',
              class: 'model::target::NFirm',
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'firstEmployee',
                  subTrees: [
                    {
                      _type: 'propertyGraphFetchTree',
                      parameters: [],
                      property: 'age',
                      subTrees: [],
                    },
                    {
                      _type: 'propertyGraphFetchTree',
                      parameters: [],
                      property: 'fullName',
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
          class: 'model::target::NFirm',
          subTrees: [
            {
              _type: 'propertyGraphFetchTree',
              parameters: [],
              property: 'firstEmployee',
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'age',
                  subTrees: [],
                },
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'fullName',
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
};

export const TEST_DATA__graphFetchWithDerivedPropertyAndParameter = {
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
                  fullPath: 'model::target::NFirm',
                },
              ],
            },
            {
              _type: 'rootGraphFetchTree',
              class: 'model::target::NFirm',
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [
                    {
                      _type: 'string',
                      values: ['My name is'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                    {
                      _type: 'string',
                      values: ['.'],
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                    },
                  ],
                  property: 'myName',
                  subTrees: [],
                },
              ],
            },
          ],
        },
        {
          _type: 'rootGraphFetchTree',
          class: 'model::target::NFirm',
          subTrees: [
            {
              _type: 'propertyGraphFetchTree',
              parameters: [
                {
                  _type: 'string',
                  values: ['My name is'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
                {
                  _type: 'string',
                  values: ['.'],
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                },
              ],
              property: 'myName',
              subTrees: [],
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__graphFetchWithSubtype = {
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
                  fullPath: 'model::target::NFirm',
                },
              ],
            },
            {
              _type: 'rootGraphFetchTree',
              class: 'model::target::NFirm',
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'nEmployees',
                  subTrees: [
                    {
                      _type: 'propertyGraphFetchTree',
                      parameters: [],
                      property: 'fullAddress',
                      subTrees: [],
                    },
                  ],
                  subType: 'model::target::NDeveloper',
                },
              ],
            },
          ],
        },
        {
          _type: 'rootGraphFetchTree',
          class: 'model::target::NFirm',
          subTrees: [
            {
              _type: 'propertyGraphFetchTree',
              parameters: [],
              property: 'nEmployees',
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'fullAddress',
                  subTrees: [],
                },
              ],
              subType: 'model::target::NDeveloper',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};
