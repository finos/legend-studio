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

export const relationalCompleteGraphEntities = [
  {
    path: 'meta::pure::tests::model::simple::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'meta::pure::tests::model::simple',
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
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'otherNames',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'extraInformation',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'manager',
          type: 'Person',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'age',
          type: 'Integer',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'nickName',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'activeEmployment',
          type: 'Boolean',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'plus',
              parameters: [
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 3,
                    upperBound: 3,
                  },
                  sourceInformation: {
                    endColumn: 45,
                    endLine: 351,
                    sourceId: '',
                    startColumn: 27,
                    startLine: 351,
                  },
                  values: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 16,
                            endLine: 351,
                            sourceId: '',
                            startColumn: 12,
                            startLine: 351,
                          },
                        },
                      ],
                      property: 'firstName',
                      sourceInformation: {
                        endColumn: 26,
                        endLine: 351,
                        sourceId: '',
                        startColumn: 18,
                        startLine: 351,
                      },
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 30,
                        endLine: 351,
                        sourceId: '',
                        startColumn: 28,
                        startLine: 351,
                      },
                      values: [' '],
                    },
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 36,
                            endLine: 351,
                            sourceId: '',
                            startColumn: 32,
                            startLine: 351,
                          },
                        },
                      ],
                      property: 'lastName',
                      sourceInformation: {
                        endColumn: 45,
                        endLine: 351,
                        sourceId: '',
                        startColumn: 38,
                        startLine: 351,
                      },
                    },
                  ],
                },
              ],
              sourceInformation: {
                endColumn: 45,
                endLine: 351,
                sourceId: '',
                startColumn: 27,
                startLine: 351,
              },
            },
          ],
          name: 'name',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
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
                  sourceInformation: {
                    endColumn: 80,
                    endLine: 352,
                    sourceId: '',
                    startColumn: 42,
                    startLine: 352,
                  },
                  values: [
                    {
                      _type: 'var',
                      name: 'title',
                      sourceInformation: {
                        endColumn: 41,
                        endLine: 352,
                        sourceId: '',
                        startColumn: 36,
                        startLine: 352,
                      },
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 45,
                        endLine: 352,
                        sourceId: '',
                        startColumn: 43,
                        startLine: 352,
                      },
                      values: [' '],
                    },
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 51,
                            endLine: 352,
                            sourceId: '',
                            startColumn: 47,
                            startLine: 352,
                          },
                        },
                      ],
                      property: 'firstName',
                      sourceInformation: {
                        endColumn: 61,
                        endLine: 352,
                        sourceId: '',
                        startColumn: 53,
                        startLine: 352,
                      },
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 65,
                        endLine: 352,
                        sourceId: '',
                        startColumn: 63,
                        startLine: 352,
                      },
                      values: [' '],
                    },
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 71,
                            endLine: 352,
                            sourceId: '',
                            startColumn: 67,
                            startLine: 352,
                          },
                        },
                      ],
                      property: 'lastName',
                      sourceInformation: {
                        endColumn: 80,
                        endLine: 352,
                        sourceId: '',
                        startColumn: 73,
                        startLine: 352,
                      },
                    },
                  ],
                },
              ],
              sourceInformation: {
                endColumn: 80,
                endLine: 352,
                sourceId: '',
                startColumn: 42,
                startLine: 352,
              },
            },
          ],
          name: 'nameWithTitle',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'title',
              sourceInformation: {
                endColumn: 33,
                endLine: 352,
                sourceId: '',
                startColumn: 19,
                startLine: 352,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
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
                      _type: 'var',
                      name: 'prefix',
                      sourceInformation: {
                        endColumn: 18,
                        endLine: 355,
                        sourceId: '',
                        startColumn: 12,
                        startLine: 355,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 27,
                    endLine: 355,
                    sourceId: '',
                    startColumn: 21,
                    startLine: 355,
                  },
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
                          function: 'isEmpty',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'suffixes',
                              sourceInformation: {
                                endColumn: 25,
                                endLine: 356,
                                sourceId: '',
                                startColumn: 17,
                                startLine: 356,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 34,
                            endLine: 356,
                            sourceId: '',
                            startColumn: 28,
                            startLine: 356,
                          },
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'plus',
                              parameters: [
                                {
                                  _type: 'collection',
                                  multiplicity: {
                                    lowerBound: 3,
                                    upperBound: 3,
                                  },
                                  sourceInformation: {
                                    endColumn: 56,
                                    endLine: 357,
                                    sourceId: '',
                                    startColumn: 35,
                                    startLine: 357,
                                  },
                                  values: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 23,
                                            endLine: 357,
                                            sourceId: '',
                                            startColumn: 19,
                                            startLine: 357,
                                          },
                                        },
                                      ],
                                      property: 'firstName',
                                      sourceInformation: {
                                        endColumn: 33,
                                        endLine: 357,
                                        sourceId: '',
                                        startColumn: 25,
                                        startLine: 357,
                                      },
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      sourceInformation: {
                                        endColumn: 39,
                                        endLine: 357,
                                        sourceId: '',
                                        startColumn: 37,
                                        startLine: 357,
                                      },
                                      values: [' '],
                                    },
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 47,
                                            endLine: 357,
                                            sourceId: '',
                                            startColumn: 43,
                                            startLine: 357,
                                          },
                                        },
                                      ],
                                      property: 'lastName',
                                      sourceInformation: {
                                        endColumn: 56,
                                        endLine: 357,
                                        sourceId: '',
                                        startColumn: 49,
                                        startLine: 357,
                                      },
                                    },
                                  ],
                                },
                              ],
                              sourceInformation: {
                                endColumn: 56,
                                endLine: 357,
                                sourceId: '',
                                startColumn: 35,
                                startLine: 357,
                              },
                            },
                          ],
                          parameters: [],
                          sourceInformation: {
                            endColumn: 56,
                            endLine: 357,
                            sourceId: '',
                            startColumn: 17,
                            startLine: 357,
                          },
                        },
                        {
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
                                  sourceInformation: {
                                    endColumn: 94,
                                    endLine: 358,
                                    sourceId: '',
                                    startColumn: 35,
                                    startLine: 358,
                                  },
                                  values: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 23,
                                            endLine: 358,
                                            sourceId: '',
                                            startColumn: 19,
                                            startLine: 358,
                                          },
                                        },
                                      ],
                                      property: 'firstName',
                                      sourceInformation: {
                                        endColumn: 33,
                                        endLine: 358,
                                        sourceId: '',
                                        startColumn: 25,
                                        startLine: 358,
                                      },
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      sourceInformation: {
                                        endColumn: 39,
                                        endLine: 358,
                                        sourceId: '',
                                        startColumn: 37,
                                        startLine: 358,
                                      },
                                      values: [' '],
                                    },
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 47,
                                            endLine: 358,
                                            sourceId: '',
                                            startColumn: 43,
                                            startLine: 358,
                                          },
                                        },
                                      ],
                                      property: 'lastName',
                                      sourceInformation: {
                                        endColumn: 56,
                                        endLine: 358,
                                        sourceId: '',
                                        startColumn: 49,
                                        startLine: 358,
                                      },
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      sourceInformation: {
                                        endColumn: 63,
                                        endLine: 358,
                                        sourceId: '',
                                        startColumn: 60,
                                        startLine: 358,
                                      },
                                      values: [', '],
                                    },
                                    {
                                      _type: 'func',
                                      function: 'joinStrings',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'suffixes',
                                          sourceInformation: {
                                            endColumn: 75,
                                            endLine: 358,
                                            sourceId: '',
                                            startColumn: 67,
                                            startLine: 358,
                                          },
                                        },
                                        {
                                          _type: 'string',
                                          multiplicity: {
                                            lowerBound: 1,
                                            upperBound: 1,
                                          },
                                          sourceInformation: {
                                            endColumn: 93,
                                            endLine: 358,
                                            sourceId: '',
                                            startColumn: 90,
                                            startLine: 358,
                                          },
                                          values: [', '],
                                        },
                                      ],
                                      sourceInformation: {
                                        endColumn: 88,
                                        endLine: 358,
                                        sourceId: '',
                                        startColumn: 78,
                                        startLine: 358,
                                      },
                                    },
                                  ],
                                },
                              ],
                              sourceInformation: {
                                endColumn: 94,
                                endLine: 358,
                                sourceId: '',
                                startColumn: 35,
                                startLine: 358,
                              },
                            },
                          ],
                          parameters: [],
                          sourceInformation: {
                            endColumn: 94,
                            endLine: 358,
                            sourceId: '',
                            startColumn: 17,
                            startLine: 358,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 15,
                        endLine: 356,
                        sourceId: '',
                        startColumn: 14,
                        startLine: 356,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 95,
                    endLine: 358,
                    sourceId: '',
                    startColumn: 12,
                    startLine: 356,
                  },
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
                          function: 'isEmpty',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'suffixes',
                              sourceInformation: {
                                endColumn: 25,
                                endLine: 359,
                                sourceId: '',
                                startColumn: 17,
                                startLine: 359,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 34,
                            endLine: 359,
                            sourceId: '',
                            startColumn: 28,
                            startLine: 359,
                          },
                        },
                        {
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
                                  sourceInformation: {
                                    endColumn: 81,
                                    endLine: 360,
                                    sourceId: '',
                                    startColumn: 36,
                                    startLine: 360,
                                  },
                                  values: [
                                    {
                                      _type: 'func',
                                      function: 'toOne',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'prefix',
                                          sourceInformation: {
                                            endColumn: 25,
                                            endLine: 360,
                                            sourceId: '',
                                            startColumn: 19,
                                            startLine: 360,
                                          },
                                        },
                                      ],
                                      sourceInformation: {
                                        endColumn: 32,
                                        endLine: 360,
                                        sourceId: '',
                                        startColumn: 28,
                                        startLine: 360,
                                      },
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      sourceInformation: {
                                        endColumn: 40,
                                        endLine: 360,
                                        sourceId: '',
                                        startColumn: 38,
                                        startLine: 360,
                                      },
                                      values: [' '],
                                    },
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 48,
                                            endLine: 360,
                                            sourceId: '',
                                            startColumn: 44,
                                            startLine: 360,
                                          },
                                        },
                                      ],
                                      property: 'firstName',
                                      sourceInformation: {
                                        endColumn: 58,
                                        endLine: 360,
                                        sourceId: '',
                                        startColumn: 50,
                                        startLine: 360,
                                      },
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      sourceInformation: {
                                        endColumn: 64,
                                        endLine: 360,
                                        sourceId: '',
                                        startColumn: 62,
                                        startLine: 360,
                                      },
                                      values: [' '],
                                    },
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 72,
                                            endLine: 360,
                                            sourceId: '',
                                            startColumn: 68,
                                            startLine: 360,
                                          },
                                        },
                                      ],
                                      property: 'lastName',
                                      sourceInformation: {
                                        endColumn: 81,
                                        endLine: 360,
                                        sourceId: '',
                                        startColumn: 74,
                                        startLine: 360,
                                      },
                                    },
                                  ],
                                },
                              ],
                              sourceInformation: {
                                endColumn: 81,
                                endLine: 360,
                                sourceId: '',
                                startColumn: 36,
                                startLine: 360,
                              },
                            },
                          ],
                          parameters: [],
                          sourceInformation: {
                            endColumn: 81,
                            endLine: 360,
                            sourceId: '',
                            startColumn: 17,
                            startLine: 360,
                          },
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'plus',
                              parameters: [
                                {
                                  _type: 'collection',
                                  multiplicity: {
                                    lowerBound: 7,
                                    upperBound: 7,
                                  },
                                  sourceInformation: {
                                    endColumn: 119,
                                    endLine: 361,
                                    sourceId: '',
                                    startColumn: 36,
                                    startLine: 361,
                                  },
                                  values: [
                                    {
                                      _type: 'func',
                                      function: 'toOne',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'prefix',
                                          sourceInformation: {
                                            endColumn: 25,
                                            endLine: 361,
                                            sourceId: '',
                                            startColumn: 19,
                                            startLine: 361,
                                          },
                                        },
                                      ],
                                      sourceInformation: {
                                        endColumn: 32,
                                        endLine: 361,
                                        sourceId: '',
                                        startColumn: 28,
                                        startLine: 361,
                                      },
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      sourceInformation: {
                                        endColumn: 40,
                                        endLine: 361,
                                        sourceId: '',
                                        startColumn: 38,
                                        startLine: 361,
                                      },
                                      values: [' '],
                                    },
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 48,
                                            endLine: 361,
                                            sourceId: '',
                                            startColumn: 44,
                                            startLine: 361,
                                          },
                                        },
                                      ],
                                      property: 'firstName',
                                      sourceInformation: {
                                        endColumn: 58,
                                        endLine: 361,
                                        sourceId: '',
                                        startColumn: 50,
                                        startLine: 361,
                                      },
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      sourceInformation: {
                                        endColumn: 64,
                                        endLine: 361,
                                        sourceId: '',
                                        startColumn: 62,
                                        startLine: 361,
                                      },
                                      values: [' '],
                                    },
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 72,
                                            endLine: 361,
                                            sourceId: '',
                                            startColumn: 68,
                                            startLine: 361,
                                          },
                                        },
                                      ],
                                      property: 'lastName',
                                      sourceInformation: {
                                        endColumn: 81,
                                        endLine: 361,
                                        sourceId: '',
                                        startColumn: 74,
                                        startLine: 361,
                                      },
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      sourceInformation: {
                                        endColumn: 88,
                                        endLine: 361,
                                        sourceId: '',
                                        startColumn: 85,
                                        startLine: 361,
                                      },
                                      values: [', '],
                                    },
                                    {
                                      _type: 'func',
                                      function: 'joinStrings',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'suffixes',
                                          sourceInformation: {
                                            endColumn: 100,
                                            endLine: 361,
                                            sourceId: '',
                                            startColumn: 92,
                                            startLine: 361,
                                          },
                                        },
                                        {
                                          _type: 'string',
                                          multiplicity: {
                                            lowerBound: 1,
                                            upperBound: 1,
                                          },
                                          sourceInformation: {
                                            endColumn: 118,
                                            endLine: 361,
                                            sourceId: '',
                                            startColumn: 115,
                                            startLine: 361,
                                          },
                                          values: [', '],
                                        },
                                      ],
                                      sourceInformation: {
                                        endColumn: 113,
                                        endLine: 361,
                                        sourceId: '',
                                        startColumn: 103,
                                        startLine: 361,
                                      },
                                    },
                                  ],
                                },
                              ],
                              sourceInformation: {
                                endColumn: 119,
                                endLine: 361,
                                sourceId: '',
                                startColumn: 36,
                                startLine: 361,
                              },
                            },
                          ],
                          parameters: [],
                          sourceInformation: {
                            endColumn: 119,
                            endLine: 361,
                            sourceId: '',
                            startColumn: 17,
                            startLine: 361,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 15,
                        endLine: 359,
                        sourceId: '',
                        startColumn: 14,
                        startLine: 359,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 120,
                    endLine: 361,
                    sourceId: '',
                    startColumn: 12,
                    startLine: 359,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 10,
                endLine: 355,
                sourceId: '',
                startColumn: 9,
                startLine: 355,
              },
            },
          ],
          name: 'nameWithPrefixAndSuffix',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 0,
                upperBound: 1,
              },
              name: 'prefix',
              sourceInformation: {
                endColumn: 47,
                endLine: 353,
                sourceId: '',
                startColumn: 29,
                startLine: 353,
              },
            },
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 0,
              },
              name: 'suffixes',
              sourceInformation: {
                endColumn: 67,
                endLine: 353,
                sourceId: '',
                startColumn: 50,
                startLine: 353,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'var',
                  name: 'lastNameFirst',
                  sourceInformation: {
                    endColumn: 25,
                    endLine: 366,
                    sourceId: '',
                    startColumn: 12,
                    startLine: 366,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'plus',
                      parameters: [
                        {
                          _type: 'collection',
                          multiplicity: {
                            lowerBound: 3,
                            upperBound: 3,
                          },
                          sourceInformation: {
                            endColumn: 68,
                            endLine: 366,
                            sourceId: '',
                            startColumn: 45,
                            startLine: 366,
                          },
                          values: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 34,
                                    endLine: 366,
                                    sourceId: '',
                                    startColumn: 30,
                                    startLine: 366,
                                  },
                                },
                              ],
                              property: 'lastName',
                              sourceInformation: {
                                endColumn: 43,
                                endLine: 366,
                                sourceId: '',
                                startColumn: 36,
                                startLine: 366,
                              },
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              sourceInformation: {
                                endColumn: 50,
                                endLine: 366,
                                sourceId: '',
                                startColumn: 47,
                                startLine: 366,
                              },
                              values: [', '],
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 58,
                                    endLine: 366,
                                    sourceId: '',
                                    startColumn: 54,
                                    startLine: 366,
                                  },
                                },
                              ],
                              property: 'firstName',
                              sourceInformation: {
                                endColumn: 68,
                                endLine: 366,
                                sourceId: '',
                                startColumn: 60,
                                startLine: 366,
                              },
                            },
                          ],
                        },
                      ],
                      sourceInformation: {
                        endColumn: 68,
                        endLine: 366,
                        sourceId: '',
                        startColumn: 45,
                        startLine: 366,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 68,
                    endLine: 366,
                    sourceId: '',
                    startColumn: 28,
                    startLine: 366,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'plus',
                      parameters: [
                        {
                          _type: 'collection',
                          multiplicity: {
                            lowerBound: 3,
                            upperBound: 3,
                          },
                          sourceInformation: {
                            endColumn: 110,
                            endLine: 366,
                            sourceId: '',
                            startColumn: 89,
                            startLine: 366,
                          },
                          values: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 77,
                                    endLine: 366,
                                    sourceId: '',
                                    startColumn: 73,
                                    startLine: 366,
                                  },
                                },
                              ],
                              property: 'firstName',
                              sourceInformation: {
                                endColumn: 87,
                                endLine: 366,
                                sourceId: '',
                                startColumn: 79,
                                startLine: 366,
                              },
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              sourceInformation: {
                                endColumn: 93,
                                endLine: 366,
                                sourceId: '',
                                startColumn: 91,
                                startLine: 366,
                              },
                              values: [' '],
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 101,
                                    endLine: 366,
                                    sourceId: '',
                                    startColumn: 97,
                                    startLine: 366,
                                  },
                                },
                              ],
                              property: 'lastName',
                              sourceInformation: {
                                endColumn: 110,
                                endLine: 366,
                                sourceId: '',
                                startColumn: 103,
                                startLine: 366,
                              },
                            },
                          ],
                        },
                      ],
                      sourceInformation: {
                        endColumn: 110,
                        endLine: 366,
                        sourceId: '',
                        startColumn: 89,
                        startLine: 366,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 110,
                    endLine: 366,
                    sourceId: '',
                    startColumn: 71,
                    startLine: 366,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 10,
                endLine: 366,
                sourceId: '',
                startColumn: 9,
                startLine: 366,
              },
            },
          ],
          name: 'fullName',
          parameters: [
            {
              _type: 'var',
              class: 'Boolean',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'lastNameFirst',
              sourceInformation: {
                endColumn: 37,
                endLine: 364,
                sourceId: '',
                startColumn: 14,
                startLine: 364,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'personNameParameter',
                      sourceInformation: {
                        endColumn: 31,
                        endLine: 371,
                        sourceId: '',
                        startColumn: 12,
                        startLine: 371,
                      },
                    },
                  ],
                  property: 'lastNameFirst',
                  sourceInformation: {
                    endColumn: 45,
                    endLine: 371,
                    sourceId: '',
                    startColumn: 33,
                    startLine: 371,
                  },
                },
                {
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
                          sourceInformation: {
                            endColumn: 127,
                            endLine: 371,
                            sourceId: '',
                            startColumn: 84,
                            startLine: 371,
                          },
                          values: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'personNameParameter',
                                      sourceInformation: {
                                        endColumn: 69,
                                        endLine: 371,
                                        sourceId: '',
                                        startColumn: 50,
                                        startLine: 371,
                                      },
                                    },
                                  ],
                                  property: 'nested',
                                  sourceInformation: {
                                    endColumn: 76,
                                    endLine: 371,
                                    sourceId: '',
                                    startColumn: 71,
                                    startLine: 371,
                                  },
                                },
                              ],
                              property: 'prefix',
                              sourceInformation: {
                                endColumn: 83,
                                endLine: 371,
                                sourceId: '',
                                startColumn: 78,
                                startLine: 371,
                              },
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              sourceInformation: {
                                endColumn: 87,
                                endLine: 371,
                                sourceId: '',
                                startColumn: 85,
                                startLine: 371,
                              },
                              values: [' '],
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 93,
                                    endLine: 371,
                                    sourceId: '',
                                    startColumn: 89,
                                    startLine: 371,
                                  },
                                },
                              ],
                              property: 'lastName',
                              sourceInformation: {
                                endColumn: 102,
                                endLine: 371,
                                sourceId: '',
                                startColumn: 95,
                                startLine: 371,
                              },
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              sourceInformation: {
                                endColumn: 109,
                                endLine: 371,
                                sourceId: '',
                                startColumn: 106,
                                startLine: 371,
                              },
                              values: [', '],
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 117,
                                    endLine: 371,
                                    sourceId: '',
                                    startColumn: 113,
                                    startLine: 371,
                                  },
                                },
                              ],
                              property: 'firstName',
                              sourceInformation: {
                                endColumn: 127,
                                endLine: 371,
                                sourceId: '',
                                startColumn: 119,
                                startLine: 371,
                              },
                            },
                          ],
                        },
                      ],
                      sourceInformation: {
                        endColumn: 127,
                        endLine: 371,
                        sourceId: '',
                        startColumn: 84,
                        startLine: 371,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 127,
                    endLine: 371,
                    sourceId: '',
                    startColumn: 48,
                    startLine: 371,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'plus',
                      parameters: [
                        {
                          _type: 'collection',
                          multiplicity: {
                            lowerBound: 3,
                            upperBound: 3,
                          },
                          sourceInformation: {
                            endColumn: 169,
                            endLine: 371,
                            sourceId: '',
                            startColumn: 148,
                            startLine: 371,
                          },
                          values: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 136,
                                    endLine: 371,
                                    sourceId: '',
                                    startColumn: 132,
                                    startLine: 371,
                                  },
                                },
                              ],
                              property: 'firstName',
                              sourceInformation: {
                                endColumn: 146,
                                endLine: 371,
                                sourceId: '',
                                startColumn: 138,
                                startLine: 371,
                              },
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              sourceInformation: {
                                endColumn: 152,
                                endLine: 371,
                                sourceId: '',
                                startColumn: 150,
                                startLine: 371,
                              },
                              values: [' '],
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 160,
                                    endLine: 371,
                                    sourceId: '',
                                    startColumn: 156,
                                    startLine: 371,
                                  },
                                },
                              ],
                              property: 'lastName',
                              sourceInformation: {
                                endColumn: 169,
                                endLine: 371,
                                sourceId: '',
                                startColumn: 162,
                                startLine: 371,
                              },
                            },
                          ],
                        },
                      ],
                      sourceInformation: {
                        endColumn: 169,
                        endLine: 371,
                        sourceId: '',
                        startColumn: 148,
                        startLine: 371,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 169,
                    endLine: 371,
                    sourceId: '',
                    startColumn: 130,
                    startLine: 371,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 10,
                endLine: 371,
                sourceId: '',
                startColumn: 9,
                startLine: 371,
              },
            },
          ],
          name: 'parameterizedName',
          parameters: [
            {
              _type: 'var',
              class: 'PersonNameParameter',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'personNameParameter',
              sourceInformation: {
                endColumn: 64,
                endLine: 369,
                sourceId: '',
                startColumn: 23,
                startLine: 369,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'removeDuplicates',
              parameters: [
                {
                  _type: 'func',
                  function: 'concatenate',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 25,
                            endLine: 376,
                            sourceId: '',
                            startColumn: 21,
                            startLine: 376,
                          },
                        },
                      ],
                      property: 'organizations',
                      sourceInformation: {
                        endColumn: 39,
                        endLine: 376,
                        sourceId: '',
                        startColumn: 27,
                        startLine: 376,
                      },
                    },
                    {
                      _type: 'func',
                      function: 'map',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                              sourceInformation: {
                                endColumn: 46,
                                endLine: 376,
                                sourceId: '',
                                startColumn: 42,
                                startLine: 376,
                              },
                            },
                          ],
                          property: 'organizations',
                          sourceInformation: {
                            endColumn: 60,
                            endLine: 376,
                            sourceId: '',
                            startColumn: 48,
                            startLine: 376,
                          },
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'o',
                                  sourceInformation: {
                                    endColumn: 72,
                                    endLine: 376,
                                    sourceId: '',
                                    startColumn: 71,
                                    startLine: 376,
                                  },
                                },
                              ],
                              property: 'superOrganizations',
                              sourceInformation: {
                                endColumn: 91,
                                endLine: 376,
                                sourceId: '',
                                startColumn: 74,
                                startLine: 376,
                              },
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'o',
                            },
                          ],
                          sourceInformation: {
                            endColumn: 93,
                            endLine: 376,
                            sourceId: '',
                            startColumn: 69,
                            startLine: 376,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 65,
                        endLine: 376,
                        sourceId: '',
                        startColumn: 63,
                        startLine: 376,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 19,
                    endLine: 376,
                    sourceId: '',
                    startColumn: 9,
                    startLine: 376,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 113,
                endLine: 376,
                sourceId: '',
                startColumn: 98,
                startLine: 376,
              },
            },
          ],
          name: 'allOrganizations',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'Organization',
        },
        {
          body: [
            {
              _type: 'string',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              sourceInformation: {
                endColumn: 27,
                endLine: 381,
                sourceId: '',
                startColumn: 18,
                startLine: 381,
              },
              values: ['constant'],
            },
          ],
          name: 'constant',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'concatenate',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 12,
                        endLine: 384,
                        sourceId: '',
                        startColumn: 8,
                        startLine: 384,
                      },
                    },
                  ],
                  property: 'address',
                  sourceInformation: {
                    endColumn: 20,
                    endLine: 384,
                    sourceId: '',
                    startColumn: 14,
                    startLine: 384,
                  },
                },
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 39,
                            endLine: 384,
                            sourceId: '',
                            startColumn: 35,
                            startLine: 384,
                          },
                        },
                      ],
                      property: 'firm',
                      sourceInformation: {
                        endColumn: 44,
                        endLine: 384,
                        sourceId: '',
                        startColumn: 41,
                        startLine: 384,
                      },
                    },
                  ],
                  property: 'address',
                  sourceInformation: {
                    endColumn: 52,
                    endLine: 384,
                    sourceId: '',
                    startColumn: 46,
                    startLine: 384,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 33,
                endLine: 384,
                sourceId: '',
                startColumn: 23,
                startLine: 384,
              },
            },
          ],
          name: 'addresses',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'Address',
        },
      ],
      superTypes: ['EntityWithAddress', 'EntityWithLocations'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legalName',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'nickName',
          type: 'String',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'times',
              parameters: [
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 2,
                    upperBound: 2,
                  },
                  sourceInformation: {
                    endColumn: 60,
                    endLine: 398,
                    sourceId: '',
                    startColumn: 57,
                    startLine: 398,
                  },
                  values: [
                    {
                      _type: 'func',
                      function: 'average',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 31,
                                    endLine: 398,
                                    sourceId: '',
                                    startColumn: 27,
                                    startLine: 398,
                                  },
                                },
                              ],
                              property: 'employees',
                              sourceInformation: {
                                endColumn: 41,
                                endLine: 398,
                                sourceId: '',
                                startColumn: 33,
                                startLine: 398,
                              },
                            },
                          ],
                          property: 'age',
                          sourceInformation: {
                            endColumn: 45,
                            endLine: 398,
                            sourceId: '',
                            startColumn: 43,
                            startLine: 398,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 54,
                        endLine: 398,
                        sourceId: '',
                        startColumn: 48,
                        startLine: 398,
                      },
                    },
                    {
                      _type: 'float',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 60,
                        endLine: 398,
                        sourceId: '',
                        startColumn: 58,
                        startLine: 398,
                      },
                      values: [2],
                    },
                  ],
                },
              ],
              sourceInformation: {
                endColumn: 60,
                endLine: 398,
                sourceId: '',
                startColumn: 57,
                startLine: 398,
              },
            },
          ],
          name: 'averageEmployeesAge',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Float',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'sum',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 27,
                            endLine: 399,
                            sourceId: '',
                            startColumn: 23,
                            startLine: 399,
                          },
                        },
                      ],
                      property: 'employees',
                      sourceInformation: {
                        endColumn: 37,
                        endLine: 399,
                        sourceId: '',
                        startColumn: 29,
                        startLine: 399,
                      },
                    },
                  ],
                  property: 'age',
                  sourceInformation: {
                    endColumn: 41,
                    endLine: 399,
                    sourceId: '',
                    startColumn: 39,
                    startLine: 399,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 46,
                endLine: 399,
                sourceId: '',
                startColumn: 44,
                startLine: 399,
              },
            },
          ],
          name: 'sumEmployeesAge',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Integer',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'max',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 27,
                            endLine: 400,
                            sourceId: '',
                            startColumn: 23,
                            startLine: 400,
                          },
                        },
                      ],
                      property: 'employees',
                      sourceInformation: {
                        endColumn: 37,
                        endLine: 400,
                        sourceId: '',
                        startColumn: 29,
                        startLine: 400,
                      },
                    },
                  ],
                  property: 'age',
                  sourceInformation: {
                    endColumn: 41,
                    endLine: 400,
                    sourceId: '',
                    startColumn: 39,
                    startLine: 400,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 46,
                endLine: 400,
                sourceId: '',
                startColumn: 44,
                startLine: 400,
              },
            },
          ],
          name: 'maxEmployeesAge',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'Integer',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'plus',
              parameters: [
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 3,
                    upperBound: 3,
                  },
                  sourceInformation: {
                    endColumn: 58,
                    endLine: 403,
                    sourceId: '',
                    startColumn: 24,
                    startLine: 403,
                  },
                  values: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 12,
                            endLine: 403,
                            sourceId: '',
                            startColumn: 8,
                            startLine: 403,
                          },
                        },
                      ],
                      property: 'legalName',
                      sourceInformation: {
                        endColumn: 22,
                        endLine: 403,
                        sourceId: '',
                        startColumn: 14,
                        startLine: 403,
                      },
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 28,
                        endLine: 403,
                        sourceId: '',
                        startColumn: 26,
                        startLine: 403,
                      },
                      values: [','],
                    },
                    {
                      _type: 'property',
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
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 36,
                                    endLine: 403,
                                    sourceId: '',
                                    startColumn: 32,
                                    startLine: 403,
                                  },
                                },
                              ],
                              property: 'address',
                              sourceInformation: {
                                endColumn: 44,
                                endLine: 403,
                                sourceId: '',
                                startColumn: 38,
                                startLine: 403,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 51,
                            endLine: 403,
                            sourceId: '',
                            startColumn: 47,
                            startLine: 403,
                          },
                        },
                      ],
                      property: 'name',
                      sourceInformation: {
                        endColumn: 58,
                        endLine: 403,
                        sourceId: '',
                        startColumn: 55,
                        startLine: 403,
                      },
                    },
                  ],
                },
              ],
              sourceInformation: {
                endColumn: 58,
                endLine: 403,
                sourceId: '',
                startColumn: 24,
                startLine: 403,
              },
            },
          ],
          name: 'nameAndAddress',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
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
                      function: 'toOne',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                              sourceInformation: {
                                endColumn: 16,
                                endLine: 407,
                                sourceId: '',
                                startColumn: 12,
                                startLine: 407,
                              },
                            },
                          ],
                          property: 'legalName',
                          sourceInformation: {
                            endColumn: 26,
                            endLine: 407,
                            sourceId: '',
                            startColumn: 18,
                            startLine: 407,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 33,
                        endLine: 407,
                        sourceId: '',
                        startColumn: 29,
                        startLine: 407,
                      },
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 54,
                        endLine: 407,
                        sourceId: '',
                        startColumn: 40,
                        startLine: 407,
                      },
                      values: ['Firm X'],
                    },
                  ],
                  sourceInformation: {
                    endColumn: 38,
                    endLine: 407,
                    sourceId: '',
                    startColumn: 37,
                    startLine: 407,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 63,
                        endLine: 407,
                        sourceId: '',
                        startColumn: 59,
                        startLine: 407,
                      },
                      values: ['Yes'],
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 63,
                    endLine: 407,
                    sourceId: '',
                    startColumn: 57,
                    startLine: 407,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 71,
                        endLine: 407,
                        sourceId: '',
                        startColumn: 68,
                        startLine: 407,
                      },
                      values: ['No'],
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 71,
                    endLine: 407,
                    sourceId: '',
                    startColumn: 66,
                    startLine: 407,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 9,
                endLine: 407,
                sourceId: '',
                startColumn: 8,
                startLine: 407,
              },
            },
          ],
          name: 'isfirmX',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
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
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 16,
                            endLine: 411,
                            sourceId: '',
                            startColumn: 12,
                            startLine: 411,
                          },
                        },
                      ],
                      property: 'legalName',
                      sourceInformation: {
                        endColumn: 26,
                        endLine: 411,
                        sourceId: '',
                        startColumn: 18,
                        startLine: 411,
                      },
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 45,
                        endLine: 411,
                        sourceId: '',
                        startColumn: 31,
                        startLine: 411,
                      },
                      values: ['Firm X'],
                    },
                  ],
                  sourceInformation: {
                    endColumn: 29,
                    endLine: 411,
                    sourceId: '',
                    startColumn: 28,
                    startLine: 411,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'plus',
                      parameters: [
                        {
                          _type: 'collection',
                          multiplicity: {
                            lowerBound: 2,
                            upperBound: 2,
                          },
                          sourceInformation: {
                            endColumn: 82,
                            endLine: 411,
                            sourceId: '',
                            startColumn: 66,
                            startLine: 411,
                          },
                          values: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 54,
                                    endLine: 411,
                                    sourceId: '',
                                    startColumn: 50,
                                    startLine: 411,
                                  },
                                },
                              ],
                              property: 'legalName',
                              sourceInformation: {
                                endColumn: 64,
                                endLine: 411,
                                sourceId: '',
                                startColumn: 56,
                                startLine: 411,
                              },
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              sourceInformation: {
                                endColumn: 82,
                                endLine: 411,
                                sourceId: '',
                                startColumn: 68,
                                startLine: 411,
                              },
                              values: [' , Top Secret'],
                            },
                          ],
                        },
                      ],
                      sourceInformation: {
                        endColumn: 82,
                        endLine: 411,
                        sourceId: '',
                        startColumn: 66,
                        startLine: 411,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 82,
                    endLine: 411,
                    sourceId: '',
                    startColumn: 48,
                    startLine: 411,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'plus',
                      parameters: [
                        {
                          _type: 'collection',
                          multiplicity: {
                            lowerBound: 3,
                            upperBound: 3,
                          },
                          sourceInformation: {
                            endColumn: 138,
                            endLine: 411,
                            sourceId: '',
                            startColumn: 104,
                            startLine: 411,
                          },
                          values: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 92,
                                    endLine: 411,
                                    sourceId: '',
                                    startColumn: 88,
                                    startLine: 411,
                                  },
                                },
                              ],
                              property: 'legalName',
                              sourceInformation: {
                                endColumn: 102,
                                endLine: 411,
                                sourceId: '',
                                startColumn: 94,
                                startLine: 411,
                              },
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              sourceInformation: {
                                endColumn: 108,
                                endLine: 411,
                                sourceId: '',
                                startColumn: 106,
                                startLine: 411,
                              },
                              values: [','],
                            },
                            {
                              _type: 'property',
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
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 116,
                                            endLine: 411,
                                            sourceId: '',
                                            startColumn: 112,
                                            startLine: 411,
                                          },
                                        },
                                      ],
                                      property: 'address',
                                      sourceInformation: {
                                        endColumn: 124,
                                        endLine: 411,
                                        sourceId: '',
                                        startColumn: 118,
                                        startLine: 411,
                                      },
                                    },
                                  ],
                                  sourceInformation: {
                                    endColumn: 131,
                                    endLine: 411,
                                    sourceId: '',
                                    startColumn: 127,
                                    startLine: 411,
                                  },
                                },
                              ],
                              property: 'name',
                              sourceInformation: {
                                endColumn: 138,
                                endLine: 411,
                                sourceId: '',
                                startColumn: 135,
                                startLine: 411,
                              },
                            },
                          ],
                        },
                      ],
                      sourceInformation: {
                        endColumn: 138,
                        endLine: 411,
                        sourceId: '',
                        startColumn: 104,
                        startLine: 411,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 138,
                    endLine: 411,
                    sourceId: '',
                    startColumn: 85,
                    startLine: 411,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 9,
                endLine: 411,
                sourceId: '',
                startColumn: 8,
                startLine: 411,
              },
            },
          ],
          name: 'nameAndMaskedAddress',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 48,
                            endLine: 414,
                            sourceId: '',
                            startColumn: 44,
                            startLine: 414,
                          },
                        },
                      ],
                      property: 'employees',
                      sourceInformation: {
                        endColumn: 58,
                        endLine: 414,
                        sourceId: '',
                        startColumn: 50,
                        startLine: 414,
                      },
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
                                  name: 'e',
                                  sourceInformation: {
                                    endColumn: 71,
                                    endLine: 414,
                                    sourceId: '',
                                    startColumn: 70,
                                    startLine: 414,
                                  },
                                },
                              ],
                              property: 'lastName',
                              sourceInformation: {
                                endColumn: 80,
                                endLine: 414,
                                sourceId: '',
                                startColumn: 73,
                                startLine: 414,
                              },
                            },
                            {
                              _type: 'var',
                              name: 'lastName',
                              sourceInformation: {
                                endColumn: 93,
                                endLine: 414,
                                sourceId: '',
                                startColumn: 85,
                                startLine: 414,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 83,
                            endLine: 414,
                            sourceId: '',
                            startColumn: 82,
                            startLine: 414,
                          },
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'e',
                        },
                      ],
                      sourceInformation: {
                        endColumn: 93,
                        endLine: 414,
                        sourceId: '',
                        startColumn: 69,
                        startLine: 414,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 66,
                    endLine: 414,
                    sourceId: '',
                    startColumn: 61,
                    startLine: 414,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 101,
                endLine: 414,
                sourceId: '',
                startColumn: 97,
                startLine: 414,
              },
            },
          ],
          name: 'employeeByLastName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'lastName',
              sourceInformation: {
                endColumn: 41,
                endLine: 414,
                sourceId: '',
                startColumn: 24,
                startLine: 414,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'func',
                  function: 'toOne',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'filter',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                              sourceInformation: {
                                endColumn: 57,
                                endLine: 416,
                                sourceId: '',
                                startColumn: 53,
                                startLine: 416,
                              },
                            },
                          ],
                          property: 'employees',
                          sourceInformation: {
                            endColumn: 67,
                            endLine: 416,
                            sourceId: '',
                            startColumn: 59,
                            startLine: 416,
                          },
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
                                      name: 'e',
                                      sourceInformation: {
                                        endColumn: 80,
                                        endLine: 416,
                                        sourceId: '',
                                        startColumn: 79,
                                        startLine: 416,
                                      },
                                    },
                                  ],
                                  property: 'lastName',
                                  sourceInformation: {
                                    endColumn: 89,
                                    endLine: 416,
                                    sourceId: '',
                                    startColumn: 82,
                                    startLine: 416,
                                  },
                                },
                                {
                                  _type: 'var',
                                  name: 'lastName',
                                  sourceInformation: {
                                    endColumn: 102,
                                    endLine: 416,
                                    sourceId: '',
                                    startColumn: 94,
                                    startLine: 416,
                                  },
                                },
                              ],
                              sourceInformation: {
                                endColumn: 92,
                                endLine: 416,
                                sourceId: '',
                                startColumn: 91,
                                startLine: 416,
                              },
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'e',
                            },
                          ],
                          sourceInformation: {
                            endColumn: 102,
                            endLine: 416,
                            sourceId: '',
                            startColumn: 78,
                            startLine: 416,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 75,
                        endLine: 416,
                        sourceId: '',
                        startColumn: 70,
                        startLine: 416,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 110,
                    endLine: 416,
                    sourceId: '',
                    startColumn: 106,
                    startLine: 416,
                  },
                },
              ],
              property: 'firstName',
              sourceInformation: {
                endColumn: 122,
                endLine: 416,
                sourceId: '',
                startColumn: 114,
                startLine: 416,
              },
            },
          ],
          name: 'employeeByLastNameFirstName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'lastName',
              sourceInformation: {
                endColumn: 50,
                endLine: 416,
                sourceId: '',
                startColumn: 33,
                startLine: 416,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 71,
                            endLine: 418,
                            sourceId: '',
                            startColumn: 67,
                            startLine: 418,
                          },
                        },
                      ],
                      property: 'employees',
                      sourceInformation: {
                        endColumn: 81,
                        endLine: 418,
                        sourceId: '',
                        startColumn: 73,
                        startLine: 418,
                      },
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'lastName',
                              sourceInformation: {
                                endColumn: 101,
                                endLine: 418,
                                sourceId: '',
                                startColumn: 93,
                                startLine: 418,
                              },
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'e',
                                  sourceInformation: {
                                    endColumn: 107,
                                    endLine: 418,
                                    sourceId: '',
                                    startColumn: 106,
                                    startLine: 418,
                                  },
                                },
                              ],
                              property: 'lastName',
                              sourceInformation: {
                                endColumn: 116,
                                endLine: 418,
                                sourceId: '',
                                startColumn: 109,
                                startLine: 418,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 104,
                            endLine: 418,
                            sourceId: '',
                            startColumn: 103,
                            startLine: 418,
                          },
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'e',
                        },
                      ],
                      sourceInformation: {
                        endColumn: 116,
                        endLine: 418,
                        sourceId: '',
                        startColumn: 92,
                        startLine: 418,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 89,
                    endLine: 418,
                    sourceId: '',
                    startColumn: 84,
                    startLine: 418,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 124,
                endLine: 418,
                sourceId: '',
                startColumn: 120,
                startLine: 418,
              },
            },
          ],
          name: 'employeeByLastNameWhereVarIsFirstEqualArg',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'lastName',
              sourceInformation: {
                endColumn: 64,
                endLine: 418,
                sourceId: '',
                startColumn: 47,
                startLine: 418,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 40,
                        endLine: 420,
                        sourceId: '',
                        startColumn: 36,
                        startLine: 420,
                      },
                    },
                  ],
                  property: 'employees',
                  sourceInformation: {
                    endColumn: 50,
                    endLine: 420,
                    sourceId: '',
                    startColumn: 42,
                    startLine: 420,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'lessThan',
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
                                  name: 'e',
                                  sourceInformation: {
                                    endColumn: 63,
                                    endLine: 420,
                                    sourceId: '',
                                    startColumn: 62,
                                    startLine: 420,
                                  },
                                },
                              ],
                              property: 'age',
                              sourceInformation: {
                                endColumn: 67,
                                endLine: 420,
                                sourceId: '',
                                startColumn: 65,
                                startLine: 420,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 74,
                            endLine: 420,
                            sourceId: '',
                            startColumn: 70,
                            startLine: 420,
                          },
                        },
                        {
                          _type: 'var',
                          name: 'age',
                          sourceInformation: {
                            endColumn: 83,
                            endLine: 420,
                            sourceId: '',
                            startColumn: 80,
                            startLine: 420,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 83,
                        endLine: 420,
                        sourceId: '',
                        startColumn: 78,
                        startLine: 420,
                      },
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'e',
                    },
                  ],
                  sourceInformation: {
                    endColumn: 83,
                    endLine: 420,
                    sourceId: '',
                    startColumn: 61,
                    startLine: 420,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 58,
                endLine: 420,
                sourceId: '',
                startColumn: 53,
                startLine: 420,
              },
            },
          ],
          name: 'employeesByAge',
          parameters: [
            {
              _type: 'var',
              class: 'Integer',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'age',
              sourceInformation: {
                endColumn: 33,
                endLine: 420,
                sourceId: '',
                startColumn: 20,
                startLine: 420,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 73,
                        endLine: 422,
                        sourceId: '',
                        startColumn: 69,
                        startLine: 422,
                      },
                    },
                  ],
                  property: 'employees',
                  sourceInformation: {
                    endColumn: 83,
                    endLine: 422,
                    sourceId: '',
                    startColumn: 75,
                    startLine: 422,
                  },
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
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'e',
                                      sourceInformation: {
                                        endColumn: 96,
                                        endLine: 422,
                                        sourceId: '',
                                        startColumn: 95,
                                        startLine: 422,
                                      },
                                    },
                                  ],
                                  property: 'address',
                                  sourceInformation: {
                                    endColumn: 104,
                                    endLine: 422,
                                    sourceId: '',
                                    startColumn: 98,
                                    startLine: 422,
                                  },
                                },
                              ],
                              property: 'name',
                              sourceInformation: {
                                endColumn: 109,
                                endLine: 422,
                                sourceId: '',
                                startColumn: 106,
                                startLine: 422,
                              },
                            },
                            {
                              _type: 'var',
                              name: 'city',
                              sourceInformation: {
                                endColumn: 118,
                                endLine: 422,
                                sourceId: '',
                                startColumn: 114,
                                startLine: 422,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 112,
                            endLine: 422,
                            sourceId: '',
                            startColumn: 111,
                            startLine: 422,
                          },
                        },
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
                                      name: 'e',
                                      sourceInformation: {
                                        endColumn: 124,
                                        endLine: 422,
                                        sourceId: '',
                                        startColumn: 123,
                                        startLine: 422,
                                      },
                                    },
                                  ],
                                  property: 'manager',
                                  sourceInformation: {
                                    endColumn: 132,
                                    endLine: 422,
                                    sourceId: '',
                                    startColumn: 126,
                                    startLine: 422,
                                  },
                                },
                              ],
                              property: 'name',
                              sourceInformation: {
                                endColumn: 137,
                                endLine: 422,
                                sourceId: '',
                                startColumn: 134,
                                startLine: 422,
                              },
                            },
                            {
                              _type: 'var',
                              name: 'managerName',
                              sourceInformation: {
                                endColumn: 153,
                                endLine: 422,
                                sourceId: '',
                                startColumn: 142,
                                startLine: 422,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 140,
                            endLine: 422,
                            sourceId: '',
                            startColumn: 139,
                            startLine: 422,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 121,
                        endLine: 422,
                        sourceId: '',
                        startColumn: 120,
                        startLine: 422,
                      },
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'e',
                    },
                  ],
                  sourceInformation: {
                    endColumn: 153,
                    endLine: 422,
                    sourceId: '',
                    startColumn: 94,
                    startLine: 422,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 91,
                endLine: 422,
                sourceId: '',
                startColumn: 86,
                startLine: 422,
              },
            },
          ],
          name: 'employeesByCityOrManager',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'city',
              sourceInformation: {
                endColumn: 43,
                endLine: 422,
                sourceId: '',
                startColumn: 30,
                startLine: 422,
              },
            },
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'managerName',
              sourceInformation: {
                endColumn: 66,
                endLine: 422,
                sourceId: '',
                startColumn: 46,
                startLine: 422,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 100,
                            endLine: 424,
                            sourceId: '',
                            startColumn: 96,
                            startLine: 424,
                          },
                        },
                      ],
                      property: 'employees',
                      sourceInformation: {
                        endColumn: 110,
                        endLine: 424,
                        sourceId: '',
                        startColumn: 102,
                        startLine: 424,
                      },
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'and',
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
                                      name: 'e',
                                      sourceInformation: {
                                        endColumn: 123,
                                        endLine: 424,
                                        sourceId: '',
                                        startColumn: 122,
                                        startLine: 424,
                                      },
                                    },
                                  ],
                                  property: 'lastName',
                                  sourceInformation: {
                                    endColumn: 132,
                                    endLine: 424,
                                    sourceId: '',
                                    startColumn: 125,
                                    startLine: 424,
                                  },
                                },
                                {
                                  _type: 'var',
                                  name: 'name',
                                  sourceInformation: {
                                    endColumn: 141,
                                    endLine: 424,
                                    sourceId: '',
                                    startColumn: 137,
                                    startLine: 424,
                                  },
                                },
                              ],
                              sourceInformation: {
                                endColumn: 135,
                                endLine: 424,
                                sourceId: '',
                                startColumn: 134,
                                startLine: 424,
                              },
                            },
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
                                      parameters: [
                                        {
                                          _type: 'property',
                                          parameters: [
                                            {
                                              _type: 'var',
                                              name: 'e',
                                              sourceInformation: {
                                                endColumn: 148,
                                                endLine: 424,
                                                sourceId: '',
                                                startColumn: 147,
                                                startLine: 424,
                                              },
                                            },
                                          ],
                                          property: 'address',
                                          sourceInformation: {
                                            endColumn: 156,
                                            endLine: 424,
                                            sourceId: '',
                                            startColumn: 150,
                                            startLine: 424,
                                          },
                                        },
                                      ],
                                      property: 'name',
                                      sourceInformation: {
                                        endColumn: 161,
                                        endLine: 424,
                                        sourceId: '',
                                        startColumn: 158,
                                        startLine: 424,
                                      },
                                    },
                                    {
                                      _type: 'var',
                                      name: 'city',
                                      sourceInformation: {
                                        endColumn: 170,
                                        endLine: 424,
                                        sourceId: '',
                                        startColumn: 166,
                                        startLine: 424,
                                      },
                                    },
                                  ],
                                  sourceInformation: {
                                    endColumn: 164,
                                    endLine: 424,
                                    sourceId: '',
                                    startColumn: 163,
                                    startLine: 424,
                                  },
                                },
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
                                              name: 'e',
                                              sourceInformation: {
                                                endColumn: 176,
                                                endLine: 424,
                                                sourceId: '',
                                                startColumn: 175,
                                                startLine: 424,
                                              },
                                            },
                                          ],
                                          property: 'manager',
                                          sourceInformation: {
                                            endColumn: 184,
                                            endLine: 424,
                                            sourceId: '',
                                            startColumn: 178,
                                            startLine: 424,
                                          },
                                        },
                                      ],
                                      property: 'name',
                                      sourceInformation: {
                                        endColumn: 189,
                                        endLine: 424,
                                        sourceId: '',
                                        startColumn: 186,
                                        startLine: 424,
                                      },
                                    },
                                    {
                                      _type: 'var',
                                      name: 'managerName',
                                      sourceInformation: {
                                        endColumn: 205,
                                        endLine: 424,
                                        sourceId: '',
                                        startColumn: 194,
                                        startLine: 424,
                                      },
                                    },
                                  ],
                                  sourceInformation: {
                                    endColumn: 192,
                                    endLine: 424,
                                    sourceId: '',
                                    startColumn: 191,
                                    startLine: 424,
                                  },
                                },
                              ],
                              sourceInformation: {
                                endColumn: 173,
                                endLine: 424,
                                sourceId: '',
                                startColumn: 172,
                                startLine: 424,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 144,
                            endLine: 424,
                            sourceId: '',
                            startColumn: 143,
                            startLine: 424,
                          },
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'e',
                        },
                      ],
                      sourceInformation: {
                        endColumn: 206,
                        endLine: 424,
                        sourceId: '',
                        startColumn: 121,
                        startLine: 424,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 118,
                    endLine: 424,
                    sourceId: '',
                    startColumn: 113,
                    startLine: 424,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 214,
                endLine: 424,
                sourceId: '',
                startColumn: 210,
                startLine: 424,
              },
            },
          ],
          name: 'employeesByCityOrManagerAndLastName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'name',
              sourceInformation: {
                endColumn: 54,
                endLine: 424,
                sourceId: '',
                startColumn: 41,
                startLine: 424,
              },
            },
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'city',
              sourceInformation: {
                endColumn: 70,
                endLine: 424,
                sourceId: '',
                startColumn: 57,
                startLine: 424,
              },
            },
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'managerName',
              sourceInformation: {
                endColumn: 93,
                endLine: 424,
                sourceId: '',
                startColumn: 73,
                startLine: 424,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'exists',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 45,
                        endLine: 426,
                        sourceId: '',
                        startColumn: 41,
                        startLine: 426,
                      },
                    },
                  ],
                  property: 'employees',
                  sourceInformation: {
                    endColumn: 55,
                    endLine: 426,
                    sourceId: '',
                    startColumn: 47,
                    startLine: 426,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'lessThan',
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
                                  name: 'e',
                                  sourceInformation: {
                                    endColumn: 68,
                                    endLine: 426,
                                    sourceId: '',
                                    startColumn: 67,
                                    startLine: 426,
                                  },
                                },
                              ],
                              property: 'age',
                              sourceInformation: {
                                endColumn: 72,
                                endLine: 426,
                                sourceId: '',
                                startColumn: 70,
                                startLine: 426,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 79,
                            endLine: 426,
                            sourceId: '',
                            startColumn: 75,
                            startLine: 426,
                          },
                        },
                        {
                          _type: 'var',
                          name: 'age',
                          sourceInformation: {
                            endColumn: 88,
                            endLine: 426,
                            sourceId: '',
                            startColumn: 85,
                            startLine: 426,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 88,
                        endLine: 426,
                        sourceId: '',
                        startColumn: 83,
                        startLine: 426,
                      },
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'e',
                    },
                  ],
                  sourceInformation: {
                    endColumn: 88,
                    endLine: 426,
                    sourceId: '',
                    startColumn: 66,
                    startLine: 426,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 63,
                endLine: 426,
                sourceId: '',
                startColumn: 58,
                startLine: 426,
              },
            },
          ],
          name: 'hasEmployeeBelowAge',
          parameters: [
            {
              _type: 'var',
              class: 'Integer',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'age',
              sourceInformation: {
                endColumn: 38,
                endLine: 426,
                sourceId: '',
                startColumn: 25,
                startLine: 426,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Boolean',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'first',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 12,
                            endLine: 429,
                            sourceId: '',
                            startColumn: 8,
                            startLine: 429,
                          },
                        },
                      ],
                      property: 'employees',
                      sourceInformation: {
                        endColumn: 22,
                        endLine: 429,
                        sourceId: '',
                        startColumn: 14,
                        startLine: 429,
                      },
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
                                  name: 'e',
                                  sourceInformation: {
                                    endColumn: 35,
                                    endLine: 429,
                                    sourceId: '',
                                    startColumn: 34,
                                    startLine: 429,
                                  },
                                },
                              ],
                              property: 'name',
                              sourceInformation: {
                                endColumn: 40,
                                endLine: 429,
                                sourceId: '',
                                startColumn: 37,
                                startLine: 429,
                              },
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'this',
                                      sourceInformation: {
                                        endColumn: 49,
                                        endLine: 429,
                                        sourceId: '',
                                        startColumn: 45,
                                        startLine: 429,
                                      },
                                    },
                                  ],
                                  property: 'address',
                                  sourceInformation: {
                                    endColumn: 57,
                                    endLine: 429,
                                    sourceId: '',
                                    startColumn: 51,
                                    startLine: 429,
                                  },
                                },
                              ],
                              property: 'name',
                              sourceInformation: {
                                endColumn: 62,
                                endLine: 429,
                                sourceId: '',
                                startColumn: 59,
                                startLine: 429,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 43,
                            endLine: 429,
                            sourceId: '',
                            startColumn: 42,
                            startLine: 429,
                          },
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'e',
                        },
                      ],
                      sourceInformation: {
                        endColumn: 62,
                        endLine: 429,
                        sourceId: '',
                        startColumn: 33,
                        startLine: 429,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 30,
                    endLine: 429,
                    sourceId: '',
                    startColumn: 25,
                    startLine: 429,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 70,
                endLine: 429,
                sourceId: '',
                startColumn: 66,
                startLine: 429,
              },
            },
          ],
          name: 'employeeWithFirmAddressName',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'first',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 12,
                            endLine: 433,
                            sourceId: '',
                            startColumn: 8,
                            startLine: 433,
                          },
                        },
                      ],
                      property: 'employees',
                      sourceInformation: {
                        endColumn: 22,
                        endLine: 433,
                        sourceId: '',
                        startColumn: 14,
                        startLine: 433,
                      },
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
                                      name: 'e',
                                      sourceInformation: {
                                        endColumn: 35,
                                        endLine: 433,
                                        sourceId: '',
                                        startColumn: 34,
                                        startLine: 433,
                                      },
                                    },
                                  ],
                                  property: 'address',
                                  sourceInformation: {
                                    endColumn: 43,
                                    endLine: 433,
                                    sourceId: '',
                                    startColumn: 37,
                                    startLine: 433,
                                  },
                                },
                              ],
                              property: 'name',
                              sourceInformation: {
                                endColumn: 48,
                                endLine: 433,
                                sourceId: '',
                                startColumn: 45,
                                startLine: 433,
                              },
                            },
                            {
                              _type: 'var',
                              name: 'name',
                              sourceInformation: {
                                endColumn: 57,
                                endLine: 433,
                                sourceId: '',
                                startColumn: 53,
                                startLine: 433,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 51,
                            endLine: 433,
                            sourceId: '',
                            startColumn: 50,
                            startLine: 433,
                          },
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'e',
                        },
                      ],
                      sourceInformation: {
                        endColumn: 57,
                        endLine: 433,
                        sourceId: '',
                        startColumn: 33,
                        startLine: 433,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 30,
                    endLine: 433,
                    sourceId: '',
                    startColumn: 25,
                    startLine: 433,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 65,
                endLine: 433,
                sourceId: '',
                startColumn: 61,
                startLine: 433,
              },
            },
          ],
          name: 'employeeWithAddressName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'name',
              sourceInformation: {
                endColumn: 42,
                endLine: 432,
                sourceId: '',
                startColumn: 29,
                startLine: 432,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'joinStrings',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'sortBy',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'filter',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 12,
                                    endLine: 437,
                                    sourceId: '',
                                    startColumn: 8,
                                    startLine: 437,
                                  },
                                },
                              ],
                              property: 'employees',
                              sourceInformation: {
                                endColumn: 22,
                                endLine: 437,
                                sourceId: '',
                                startColumn: 14,
                                startLine: 437,
                              },
                            },
                            {
                              _type: 'lambda',
                              body: [
                                {
                                  _type: 'func',
                                  function: 'equal',
                                  parameters: [
                                    {
                                      _type: 'func',
                                      function: 'trim',
                                      parameters: [
                                        {
                                          _type: 'func',
                                          function: 'toOne',
                                          parameters: [
                                            {
                                              _type: 'property',
                                              parameters: [
                                                {
                                                  _type: 'property',
                                                  parameters: [
                                                    {
                                                      _type: 'var',
                                                      name: 'e',
                                                      sourceInformation: {
                                                        endColumn: 35,
                                                        endLine: 437,
                                                        sourceId: '',
                                                        startColumn: 34,
                                                        startLine: 437,
                                                      },
                                                    },
                                                  ],
                                                  property: 'address',
                                                  sourceInformation: {
                                                    endColumn: 43,
                                                    endLine: 437,
                                                    sourceId: '',
                                                    startColumn: 37,
                                                    startLine: 437,
                                                  },
                                                },
                                              ],
                                              property: 'name',
                                              sourceInformation: {
                                                endColumn: 48,
                                                endLine: 437,
                                                sourceId: '',
                                                startColumn: 45,
                                                startLine: 437,
                                              },
                                            },
                                          ],
                                          sourceInformation: {
                                            endColumn: 55,
                                            endLine: 437,
                                            sourceId: '',
                                            startColumn: 51,
                                            startLine: 437,
                                          },
                                        },
                                      ],
                                      sourceInformation: {
                                        endColumn: 63,
                                        endLine: 437,
                                        sourceId: '',
                                        startColumn: 60,
                                        startLine: 437,
                                      },
                                    },
                                    {
                                      _type: 'var',
                                      name: 'name',
                                      sourceInformation: {
                                        endColumn: 74,
                                        endLine: 437,
                                        sourceId: '',
                                        startColumn: 70,
                                        startLine: 437,
                                      },
                                    },
                                  ],
                                  sourceInformation: {
                                    endColumn: 68,
                                    endLine: 437,
                                    sourceId: '',
                                    startColumn: 67,
                                    startLine: 437,
                                  },
                                },
                              ],
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'e',
                                },
                              ],
                              sourceInformation: {
                                endColumn: 74,
                                endLine: 437,
                                sourceId: '',
                                startColumn: 33,
                                startLine: 437,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 30,
                            endLine: 437,
                            sourceId: '',
                            startColumn: 25,
                            startLine: 437,
                          },
                        },
                        {
                          _type: 'path',
                          path: [
                            {
                              _type: 'propertyPath',
                              parameters: [],
                              property: 'lastName',
                              sourceInformation: {
                                endColumn: 118,
                                endLine: 437,
                                sourceId: '',
                                startColumn: 110,
                                startLine: 437,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 123,
                            endLine: 437,
                            sourceId: '',
                            startColumn: 103,
                            startLine: 437,
                          },
                          startType: 'Person',
                        },
                      ],
                      sourceInformation: {
                        endColumn: 83,
                        endLine: 437,
                        sourceId: '',
                        startColumn: 78,
                        startLine: 437,
                      },
                    },
                  ],
                  property: 'lastName',
                  sourceInformation: {
                    endColumn: 112,
                    endLine: 437,
                    sourceId: '',
                    startColumn: 105,
                    startLine: 437,
                  },
                },
                {
                  _type: 'string',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  sourceInformation: {
                    endColumn: 128,
                    endLine: 437,
                    sourceId: '',
                    startColumn: 127,
                    startLine: 437,
                  },
                  values: [''],
                },
              ],
              sourceInformation: {
                endColumn: 125,
                endLine: 437,
                sourceId: '',
                startColumn: 115,
                startLine: 437,
              },
            },
          ],
          name: 'employeesWithAddressNameSorted',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'name',
              sourceInformation: {
                endColumn: 49,
                endLine: 436,
                sourceId: '',
                startColumn: 36,
                startLine: 436,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'func',
                  function: 'map',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 12,
                            endLine: 443,
                            sourceId: '',
                            startColumn: 8,
                            startLine: 443,
                          },
                        },
                      ],
                      property: 'employees',
                      sourceInformation: {
                        endColumn: 22,
                        endLine: 443,
                        sourceId: '',
                        startColumn: 14,
                        startLine: 443,
                      },
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'e',
                              sourceInformation: {
                                endColumn: 32,
                                endLine: 443,
                                sourceId: '',
                                startColumn: 31,
                                startLine: 443,
                              },
                            },
                          ],
                          property: 'address',
                          sourceInformation: {
                            endColumn: 40,
                            endLine: 443,
                            sourceId: '',
                            startColumn: 34,
                            startLine: 443,
                          },
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'e',
                        },
                      ],
                      sourceInformation: {
                        endColumn: 40,
                        endLine: 443,
                        sourceId: '',
                        startColumn: 30,
                        startLine: 443,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 27,
                    endLine: 443,
                    sourceId: '',
                    startColumn: 25,
                    startLine: 443,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'and',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'name',
                              sourceInformation: {
                                endColumn: 58,
                                endLine: 443,
                                sourceId: '',
                                startColumn: 54,
                                startLine: 443,
                              },
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'this',
                                      sourceInformation: {
                                        endColumn: 67,
                                        endLine: 443,
                                        sourceId: '',
                                        startColumn: 63,
                                        startLine: 443,
                                      },
                                    },
                                  ],
                                  property: 'address',
                                  sourceInformation: {
                                    endColumn: 75,
                                    endLine: 443,
                                    sourceId: '',
                                    startColumn: 69,
                                    startLine: 443,
                                  },
                                },
                              ],
                              property: 'name',
                              sourceInformation: {
                                endColumn: 80,
                                endLine: 443,
                                sourceId: '',
                                startColumn: 77,
                                startLine: 443,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 61,
                            endLine: 443,
                            sourceId: '',
                            startColumn: 60,
                            startLine: 443,
                          },
                        },
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'var',
                              name: 't',
                              sourceInformation: {
                                endColumn: 87,
                                endLine: 443,
                                sourceId: '',
                                startColumn: 86,
                                startLine: 443,
                              },
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'x',
                                  sourceInformation: {
                                    endColumn: 93,
                                    endLine: 443,
                                    sourceId: '',
                                    startColumn: 92,
                                    startLine: 443,
                                  },
                                },
                              ],
                              property: 'type',
                              sourceInformation: {
                                endColumn: 98,
                                endLine: 443,
                                sourceId: '',
                                startColumn: 95,
                                startLine: 443,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 90,
                            endLine: 443,
                            sourceId: '',
                            startColumn: 89,
                            startLine: 443,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 84,
                        endLine: 443,
                        sourceId: '',
                        startColumn: 83,
                        startLine: 443,
                      },
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
                    },
                  ],
                  sourceInformation: {
                    endColumn: 98,
                    endLine: 443,
                    sourceId: '',
                    startColumn: 52,
                    startLine: 443,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 49,
                endLine: 443,
                sourceId: '',
                startColumn: 44,
                startLine: 443,
              },
            },
          ],
          name: 'employeeAddressesWithFirmAddressName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'name',
              sourceInformation: {
                endColumn: 54,
                endLine: 442,
                sourceId: '',
                startColumn: 41,
                startLine: 442,
              },
            },
            {
              _type: 'var',
              class: 'GeographicEntityType',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 't',
              sourceInformation: {
                endColumn: 80,
                endLine: 442,
                sourceId: '',
                startColumn: 56,
                startLine: 442,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'Address',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'in',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 11,
                        endLine: 447,
                        sourceId: '',
                        startColumn: 7,
                        startLine: 447,
                      },
                    },
                  ],
                  property: 'legalName',
                  sourceInformation: {
                    endColumn: 21,
                    endLine: 447,
                    sourceId: '',
                    startColumn: 13,
                    startLine: 447,
                  },
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 3,
                    upperBound: 3,
                  },
                  sourceInformation: {
                    endColumn: 93,
                    endLine: 447,
                    sourceId: '',
                    startColumn: 27,
                    startLine: 447,
                  },
                  values: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 42,
                        endLine: 447,
                        sourceId: '',
                        startColumn: 28,
                        startLine: 447,
                      },
                      values: ['Firm X'],
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 65,
                        endLine: 447,
                        sourceId: '',
                        startColumn: 45,
                        startLine: 447,
                      },
                      values: ['Firm X & Co.'],
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 92,
                        endLine: 447,
                        sourceId: '',
                        startColumn: 68,
                        startLine: 447,
                      },
                      values: ['Firm X and Group'],
                    },
                  ],
                },
              ],
              sourceInformation: {
                endColumn: 25,
                endLine: 447,
                sourceId: '',
                startColumn: 24,
                startLine: 447,
              },
            },
          ],
          name: 'isfirmXGroup',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Boolean',
        },
      ],
      superTypes: ['EntityWithAddress'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::FirmExtension',
    content: {
      _type: 'class',
      name: 'FirmExtension',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'establishedDate',
          type: 'Date',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employeesExt',
          type: 'meta::pure::tests::model::simple::PersonExtension',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'year',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 11,
                        endLine: 459,
                        sourceId: '',
                        startColumn: 7,
                        startLine: 459,
                      },
                    },
                  ],
                  property: 'establishedDate',
                  sourceInformation: {
                    endColumn: 27,
                    endLine: 459,
                    sourceId: '',
                    startColumn: 13,
                    startLine: 459,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 33,
                endLine: 459,
                sourceId: '',
                startColumn: 30,
                startLine: 459,
              },
            },
          ],
          name: 'establishedYear',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Integer',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'joinStrings',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 11,
                            endLine: 464,
                            sourceId: '',
                            startColumn: 7,
                            startLine: 464,
                          },
                        },
                      ],
                      property: 'employeesExt',
                      sourceInformation: {
                        endColumn: 24,
                        endLine: 464,
                        sourceId: '',
                        startColumn: 13,
                        startLine: 464,
                      },
                    },
                  ],
                  property: 'lastName',
                  sourceInformation: {
                    endColumn: 33,
                    endLine: 464,
                    sourceId: '',
                    startColumn: 26,
                    startLine: 464,
                  },
                },
                {
                  _type: 'string',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  sourceInformation: {
                    endColumn: 50,
                    endLine: 464,
                    sourceId: '',
                    startColumn: 48,
                    startLine: 464,
                  },
                  values: [','],
                },
              ],
              sourceInformation: {
                endColumn: 46,
                endLine: 464,
                sourceId: '',
                startColumn: 36,
                startLine: 464,
              },
            },
          ],
          name: 'allEmployeesLastName',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'String',
        },
      ],
      superTypes: ['Firm'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Address',
    content: {
      _type: 'class',
      name: 'Address',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'street',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'comments',
          type: 'String',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'plus',
              parameters: [
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 2,
                    upperBound: 2,
                  },
                  sourceInformation: {
                    endColumn: 23,
                    endLine: 476,
                    sourceId: '',
                    startColumn: 12,
                    startLine: 476,
                  },
                  values: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 10,
                        endLine: 476,
                        sourceId: '',
                        startColumn: 7,
                        startLine: 476,
                      },
                      values: ['D:'],
                    },
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 18,
                            endLine: 476,
                            sourceId: '',
                            startColumn: 14,
                            startLine: 476,
                          },
                        },
                      ],
                      property: 'name',
                      sourceInformation: {
                        endColumn: 23,
                        endLine: 476,
                        sourceId: '',
                        startColumn: 20,
                        startLine: 476,
                      },
                    },
                  ],
                },
              ],
              sourceInformation: {
                endColumn: 23,
                endLine: 476,
                sourceId: '',
                startColumn: 12,
                startLine: 476,
              },
            },
          ],
          name: 'description',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
      ],
      superTypes: ['GeographicEntity'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Location',
    content: {
      _type: 'class',
      name: 'Location',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'place',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'censusdate',
          type: 'Date',
        },
      ],
      superTypes: ['GeographicEntity'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::PlaceOfInterest',
    content: {
      _type: 'class',
      name: 'PlaceOfInterest',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::PersonExtension',
    content: {
      _type: 'class',
      name: 'PersonExtension',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'birthdate',
          type: 'Date',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'year',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 10,
                        endLine: 502,
                        sourceId: '',
                        startColumn: 6,
                        startLine: 502,
                      },
                    },
                  ],
                  property: 'birthdate',
                  sourceInformation: {
                    endColumn: 20,
                    endLine: 502,
                    sourceId: '',
                    startColumn: 12,
                    startLine: 502,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 26,
                endLine: 502,
                sourceId: '',
                startColumn: 23,
                startLine: 502,
              },
            },
          ],
          name: 'birthYear',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'Integer',
        },
      ],
      superTypes: ['meta::pure::tests::model::simple::Person'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Product',
    content: {
      _type: 'class',
      name: 'Product',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'classification',
          type: 'ProductClassification',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 16,
                        endLine: 511,
                        sourceId: '',
                        startColumn: 12,
                        startLine: 511,
                      },
                    },
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'enum',
                          fullPath: 'ProductSynonymType',
                          sourceInformation: {
                            endColumn: 49,
                            endLine: 511,
                            sourceId: '',
                            startColumn: 32,
                            startLine: 511,
                          },
                        },
                      ],
                      property: 'CUSIP',
                      sourceInformation: {
                        endColumn: 55,
                        endLine: 511,
                        sourceId: '',
                        startColumn: 51,
                        startLine: 511,
                      },
                    },
                  ],
                  property: 'synonymByType',
                  sourceInformation: {
                    endColumn: 30,
                    endLine: 511,
                    sourceId: '',
                    startColumn: 18,
                    startLine: 511,
                  },
                },
              ],
              property: 'name',
              sourceInformation: {
                endColumn: 61,
                endLine: 511,
                sourceId: '',
                startColumn: 58,
                startLine: 511,
              },
            },
          ],
          name: 'cusip',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 15,
                        endLine: 512,
                        sourceId: '',
                        startColumn: 11,
                        startLine: 512,
                      },
                    },
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'enum',
                          fullPath: 'ProductSynonymType',
                          sourceInformation: {
                            endColumn: 48,
                            endLine: 512,
                            sourceId: '',
                            startColumn: 31,
                            startLine: 512,
                          },
                        },
                      ],
                      property: 'ISIN',
                      sourceInformation: {
                        endColumn: 53,
                        endLine: 512,
                        sourceId: '',
                        startColumn: 50,
                        startLine: 512,
                      },
                    },
                  ],
                  property: 'synonymByType',
                  sourceInformation: {
                    endColumn: 29,
                    endLine: 512,
                    sourceId: '',
                    startColumn: 17,
                    startLine: 512,
                  },
                },
              ],
              property: 'name',
              sourceInformation: {
                endColumn: 59,
                endLine: 512,
                sourceId: '',
                startColumn: 56,
                startLine: 512,
              },
            },
          ],
          name: 'isin',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'var',
                  name: 'this',
                  sourceInformation: {
                    endColumn: 23,
                    endLine: 513,
                    sourceId: '',
                    startColumn: 19,
                    startLine: 513,
                  },
                },
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'enum',
                      fullPath: 'ProductSynonymType',
                      sourceInformation: {
                        endColumn: 56,
                        endLine: 513,
                        sourceId: '',
                        startColumn: 39,
                        startLine: 513,
                      },
                    },
                  ],
                  property: 'CUSIP',
                  sourceInformation: {
                    endColumn: 62,
                    endLine: 513,
                    sourceId: '',
                    startColumn: 58,
                    startLine: 513,
                  },
                },
              ],
              property: 'synonymByType',
              sourceInformation: {
                endColumn: 37,
                endLine: 513,
                sourceId: '',
                startColumn: 25,
                startLine: 513,
              },
            },
          ],
          name: 'cusipSynonym',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Synonym',
        },
        {
          body: [
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'var',
                  name: 'this',
                  sourceInformation: {
                    endColumn: 22,
                    endLine: 514,
                    sourceId: '',
                    startColumn: 18,
                    startLine: 514,
                  },
                },
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'enum',
                      fullPath: 'ProductSynonymType',
                      sourceInformation: {
                        endColumn: 55,
                        endLine: 514,
                        sourceId: '',
                        startColumn: 38,
                        startLine: 514,
                      },
                    },
                  ],
                  property: 'ISIN',
                  sourceInformation: {
                    endColumn: 60,
                    endLine: 514,
                    sourceId: '',
                    startColumn: 57,
                    startLine: 514,
                  },
                },
              ],
              property: 'synonymByType',
              sourceInformation: {
                endColumn: 36,
                endLine: 514,
                sourceId: '',
                startColumn: 24,
                startLine: 514,
              },
            },
          ],
          name: 'isinSynonym',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Synonym',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Synonym',
    content: {
      _type: 'class',
      name: 'Synonym',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'typeAsString',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'type',
          type: 'ProductSynonymType',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Trade',
    content: {
      _type: 'class',
      name: 'Trade',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'id',
          type: 'Integer',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'date',
          type: 'StrictDate',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'quantity',
          type: 'Float',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'product',
          type: 'Product',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'settlementDateTime',
          type: 'DateTime',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'latestEventDate',
          type: 'StrictDate',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'events',
          type: 'TradeEvent',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'isNotEmpty',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 15,
                            endLine: 541,
                            sourceId: '',
                            startColumn: 11,
                            startLine: 541,
                          },
                        },
                      ],
                      property: 'product',
                      sourceInformation: {
                        endColumn: 23,
                        endLine: 541,
                        sourceId: '',
                        startColumn: 17,
                        startLine: 541,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 35,
                    endLine: 541,
                    sourceId: '',
                    startColumn: 26,
                    startLine: 541,
                  },
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
                          function: 'isNotEmpty',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'this',
                                      sourceInformation: {
                                        endColumn: 25,
                                        endLine: 542,
                                        sourceId: '',
                                        startColumn: 21,
                                        startLine: 542,
                                      },
                                    },
                                  ],
                                  property: 'product',
                                  sourceInformation: {
                                    endColumn: 33,
                                    endLine: 542,
                                    sourceId: '',
                                    startColumn: 27,
                                    startLine: 542,
                                  },
                                },
                              ],
                              property: 'cusip',
                              sourceInformation: {
                                endColumn: 39,
                                endLine: 542,
                                sourceId: '',
                                startColumn: 35,
                                startLine: 542,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 51,
                            endLine: 542,
                            sourceId: '',
                            startColumn: 42,
                            startLine: 542,
                          },
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'toOne',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 63,
                                            endLine: 542,
                                            sourceId: '',
                                            startColumn: 59,
                                            startLine: 542,
                                          },
                                        },
                                      ],
                                      property: 'product',
                                      sourceInformation: {
                                        endColumn: 71,
                                        endLine: 542,
                                        sourceId: '',
                                        startColumn: 65,
                                        startLine: 542,
                                      },
                                    },
                                  ],
                                  property: 'cusip',
                                  sourceInformation: {
                                    endColumn: 77,
                                    endLine: 542,
                                    sourceId: '',
                                    startColumn: 73,
                                    startLine: 542,
                                  },
                                },
                              ],
                              sourceInformation: {
                                endColumn: 84,
                                endLine: 542,
                                sourceId: '',
                                startColumn: 80,
                                startLine: 542,
                              },
                            },
                          ],
                          parameters: [],
                          sourceInformation: {
                            endColumn: 86,
                            endLine: 542,
                            sourceId: '',
                            startColumn: 57,
                            startLine: 542,
                          },
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
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
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 64,
                                            endLine: 543,
                                            sourceId: '',
                                            startColumn: 60,
                                            startLine: 543,
                                          },
                                        },
                                      ],
                                      property: 'product',
                                      sourceInformation: {
                                        endColumn: 72,
                                        endLine: 543,
                                        sourceId: '',
                                        startColumn: 66,
                                        startLine: 543,
                                      },
                                    },
                                  ],
                                  sourceInformation: {
                                    endColumn: 79,
                                    endLine: 543,
                                    sourceId: '',
                                    startColumn: 75,
                                    startLine: 543,
                                  },
                                },
                              ],
                              property: 'name',
                              sourceInformation: {
                                endColumn: 86,
                                endLine: 543,
                                sourceId: '',
                                startColumn: 83,
                                startLine: 543,
                              },
                            },
                          ],
                          parameters: [],
                          sourceInformation: {
                            endColumn: 86,
                            endLine: 543,
                            sourceId: '',
                            startColumn: 58,
                            startLine: 543,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 19,
                        endLine: 542,
                        sourceId: '',
                        startColumn: 18,
                        startLine: 542,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 87,
                    endLine: 543,
                    sourceId: '',
                    startColumn: 16,
                    startLine: 542,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 27,
                        endLine: 544,
                        sourceId: '',
                        startColumn: 19,
                        startLine: 544,
                      },
                      values: ['Unknown'],
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 27,
                    endLine: 544,
                    sourceId: '',
                    startColumn: 17,
                    startLine: 544,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 8,
                endLine: 541,
                sourceId: '',
                startColumn: 7,
                startLine: 541,
              },
            },
          ],
          name: 'productIdentifier',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 11,
                        endLine: 549,
                        sourceId: '',
                        startColumn: 7,
                        startLine: 549,
                      },
                    },
                  ],
                  property: 'product',
                  sourceInformation: {
                    endColumn: 19,
                    endLine: 549,
                    sourceId: '',
                    startColumn: 13,
                    startLine: 549,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'and',
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
                                  name: 'p',
                                  sourceInformation: {
                                    endColumn: 34,
                                    endLine: 549,
                                    sourceId: '',
                                    startColumn: 33,
                                    startLine: 549,
                                  },
                                },
                              ],
                              property: 'name',
                              sourceInformation: {
                                endColumn: 39,
                                endLine: 549,
                                sourceId: '',
                                startColumn: 36,
                                startLine: 549,
                              },
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              sourceInformation: {
                                endColumn: 49,
                                endLine: 549,
                                sourceId: '',
                                startColumn: 43,
                                startLine: 549,
                              },
                              values: [' test'],
                            },
                          ],
                          sourceInformation: {
                            endColumn: 42,
                            endLine: 549,
                            sourceId: '',
                            startColumn: 41,
                            startLine: 549,
                          },
                        },
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 58,
                                    endLine: 549,
                                    sourceId: '',
                                    startColumn: 54,
                                    startLine: 549,
                                  },
                                },
                              ],
                              property: 'date',
                              sourceInformation: {
                                endColumn: 63,
                                endLine: 549,
                                sourceId: '',
                                startColumn: 60,
                                startLine: 549,
                              },
                            },
                            {
                              _type: 'strictDate',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              sourceInformation: {
                                endColumn: 78,
                                endLine: 549,
                                sourceId: '',
                                startColumn: 68,
                                startLine: 549,
                              },
                              values: ['2020-01-01'],
                            },
                          ],
                          sourceInformation: {
                            endColumn: 66,
                            endLine: 549,
                            sourceId: '',
                            startColumn: 65,
                            startLine: 549,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 52,
                        endLine: 549,
                        sourceId: '',
                        startColumn: 51,
                        startLine: 549,
                      },
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'p',
                    },
                  ],
                  sourceInformation: {
                    endColumn: 78,
                    endLine: 549,
                    sourceId: '',
                    startColumn: 31,
                    startLine: 549,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 27,
                endLine: 549,
                sourceId: '',
                startColumn: 22,
                startLine: 549,
              },
            },
          ],
          name: 'filterProductByNameAndTradeDate',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'Product',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'letFunction',
              parameters: [
                {
                  _type: 'string',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: ['clasfByProductName'],
                },
                {
                  _type: 'func',
                  function: 'toOne',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'filter',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 36,
                                    endLine: 553,
                                    sourceId: '',
                                    startColumn: 32,
                                    startLine: 553,
                                  },
                                },
                              ],
                              property: 'product',
                              sourceInformation: {
                                endColumn: 44,
                                endLine: 553,
                                sourceId: '',
                                startColumn: 38,
                                startLine: 553,
                              },
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
                                          name: 'p',
                                          sourceInformation: {
                                            endColumn: 59,
                                            endLine: 553,
                                            sourceId: '',
                                            startColumn: 58,
                                            startLine: 553,
                                          },
                                        },
                                      ],
                                      property: 'name',
                                      sourceInformation: {
                                        endColumn: 64,
                                        endLine: 553,
                                        sourceId: '',
                                        startColumn: 61,
                                        startLine: 553,
                                      },
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      sourceInformation: {
                                        endColumn: 74,
                                        endLine: 553,
                                        sourceId: '',
                                        startColumn: 68,
                                        startLine: 553,
                                      },
                                      values: [' test'],
                                    },
                                  ],
                                  sourceInformation: {
                                    endColumn: 67,
                                    endLine: 553,
                                    sourceId: '',
                                    startColumn: 66,
                                    startLine: 553,
                                  },
                                },
                              ],
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'p',
                                },
                              ],
                              sourceInformation: {
                                endColumn: 74,
                                endLine: 553,
                                sourceId: '',
                                startColumn: 56,
                                startLine: 553,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 52,
                            endLine: 553,
                            sourceId: '',
                            startColumn: 47,
                            startLine: 553,
                          },
                        },
                        {
                          _type: 'strictDate',
                          multiplicity: {
                            lowerBound: 1,
                            upperBound: 1,
                          },
                          sourceInformation: {
                            endColumn: 102,
                            endLine: 553,
                            sourceId: '',
                            startColumn: 92,
                            startLine: 553,
                          },
                          values: ['2020-01-01'],
                        },
                      ],
                      property: 'classification',
                      sourceInformation: {
                        endColumn: 90,
                        endLine: 553,
                        sourceId: '',
                        startColumn: 77,
                        startLine: 553,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 112,
                    endLine: 553,
                    sourceId: '',
                    startColumn: 7,
                    startLine: 553,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 112,
                endLine: 553,
                sourceId: '',
                startColumn: 7,
                startLine: 553,
              },
            },
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'var',
                  name: 'clasfByProductName',
                  sourceInformation: {
                    endColumn: 25,
                    endLine: 554,
                    sourceId: '',
                    startColumn: 7,
                    startLine: 554,
                  },
                },
              ],
              property: 'type',
              sourceInformation: {
                endColumn: 30,
                endLine: 554,
                sourceId: '',
                startColumn: 27,
                startLine: 554,
              },
            },
          ],
          name: 'classificationType',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
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
                          name: 'this',
                          sourceInformation: {
                            endColumn: 15,
                            endLine: 559,
                            sourceId: '',
                            startColumn: 11,
                            startLine: 559,
                          },
                        },
                      ],
                      property: 'product',
                      sourceInformation: {
                        endColumn: 23,
                        endLine: 559,
                        sourceId: '',
                        startColumn: 17,
                        startLine: 559,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 32,
                    endLine: 559,
                    sourceId: '',
                    startColumn: 26,
                    startLine: 559,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 47,
                        endLine: 559,
                        sourceId: '',
                        startColumn: 39,
                        startLine: 559,
                      },
                      values: ['Unknown'],
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 47,
                    endLine: 559,
                    sourceId: '',
                    startColumn: 37,
                    startLine: 559,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'property',
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
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 56,
                                    endLine: 559,
                                    sourceId: '',
                                    startColumn: 52,
                                    startLine: 559,
                                  },
                                },
                              ],
                              property: 'product',
                              sourceInformation: {
                                endColumn: 64,
                                endLine: 559,
                                sourceId: '',
                                startColumn: 58,
                                startLine: 559,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 71,
                            endLine: 559,
                            sourceId: '',
                            startColumn: 67,
                            startLine: 559,
                          },
                        },
                      ],
                      property: 'name',
                      sourceInformation: {
                        endColumn: 78,
                        endLine: 559,
                        sourceId: '',
                        startColumn: 75,
                        startLine: 559,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 78,
                    endLine: 559,
                    sourceId: '',
                    startColumn: 50,
                    startLine: 559,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 8,
                endLine: 559,
                sourceId: '',
                startColumn: 7,
                startLine: 559,
              },
            },
          ],
          name: 'productDescription',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'isNotEmpty',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 15,
                            endLine: 564,
                            sourceId: '',
                            startColumn: 11,
                            startLine: 564,
                          },
                        },
                      ],
                      property: 'account',
                      sourceInformation: {
                        endColumn: 23,
                        endLine: 564,
                        sourceId: '',
                        startColumn: 17,
                        startLine: 564,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 35,
                    endLine: 564,
                    sourceId: '',
                    startColumn: 26,
                    startLine: 564,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'property',
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
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 46,
                                    endLine: 564,
                                    sourceId: '',
                                    startColumn: 42,
                                    startLine: 564,
                                  },
                                },
                              ],
                              property: 'account',
                              sourceInformation: {
                                endColumn: 54,
                                endLine: 564,
                                sourceId: '',
                                startColumn: 48,
                                startLine: 564,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 61,
                            endLine: 564,
                            sourceId: '',
                            startColumn: 57,
                            startLine: 564,
                          },
                        },
                      ],
                      property: 'name',
                      sourceInformation: {
                        endColumn: 68,
                        endLine: 564,
                        sourceId: '',
                        startColumn: 65,
                        startLine: 564,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 68,
                    endLine: 564,
                    sourceId: '',
                    startColumn: 40,
                    startLine: 564,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 80,
                        endLine: 564,
                        sourceId: '',
                        startColumn: 72,
                        startLine: 564,
                      },
                      values: ['Unknown'],
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 80,
                    endLine: 564,
                    sourceId: '',
                    startColumn: 71,
                    startLine: 564,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 8,
                endLine: 564,
                sourceId: '',
                startColumn: 7,
                startLine: 564,
              },
            },
          ],
          name: 'accountDescription',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'isNotEmpty',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 15,
                            endLine: 569,
                            sourceId: '',
                            startColumn: 11,
                            startLine: 569,
                          },
                        },
                      ],
                      property: 'product',
                      sourceInformation: {
                        endColumn: 23,
                        endLine: 569,
                        sourceId: '',
                        startColumn: 17,
                        startLine: 569,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 35,
                    endLine: 569,
                    sourceId: '',
                    startColumn: 26,
                    startLine: 569,
                  },
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
                          function: 'isNotEmpty',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'this',
                                      sourceInformation: {
                                        endColumn: 25,
                                        endLine: 570,
                                        sourceId: '',
                                        startColumn: 21,
                                        startLine: 570,
                                      },
                                    },
                                  ],
                                  property: 'product',
                                  sourceInformation: {
                                    endColumn: 33,
                                    endLine: 570,
                                    sourceId: '',
                                    startColumn: 27,
                                    startLine: 570,
                                  },
                                },
                              ],
                              property: 'cusip',
                              sourceInformation: {
                                endColumn: 39,
                                endLine: 570,
                                sourceId: '',
                                startColumn: 35,
                                startLine: 570,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 51,
                            endLine: 570,
                            sourceId: '',
                            startColumn: 42,
                            startLine: 570,
                          },
                        },
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
                                      name: 'this',
                                      sourceInformation: {
                                        endColumn: 63,
                                        endLine: 570,
                                        sourceId: '',
                                        startColumn: 59,
                                        startLine: 570,
                                      },
                                    },
                                  ],
                                  property: 'product',
                                  sourceInformation: {
                                    endColumn: 71,
                                    endLine: 570,
                                    sourceId: '',
                                    startColumn: 65,
                                    startLine: 570,
                                  },
                                },
                              ],
                              property: 'cusip',
                              sourceInformation: {
                                endColumn: 77,
                                endLine: 570,
                                sourceId: '',
                                startColumn: 73,
                                startLine: 570,
                              },
                            },
                          ],
                          parameters: [],
                          sourceInformation: {
                            endColumn: 77,
                            endLine: 570,
                            sourceId: '',
                            startColumn: 57,
                            startLine: 570,
                          },
                        },
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
                                      name: 'this',
                                      sourceInformation: {
                                        endColumn: 64,
                                        endLine: 571,
                                        sourceId: '',
                                        startColumn: 60,
                                        startLine: 571,
                                      },
                                    },
                                  ],
                                  property: 'product',
                                  sourceInformation: {
                                    endColumn: 72,
                                    endLine: 571,
                                    sourceId: '',
                                    startColumn: 66,
                                    startLine: 571,
                                  },
                                },
                              ],
                              property: 'name',
                              sourceInformation: {
                                endColumn: 77,
                                endLine: 571,
                                sourceId: '',
                                startColumn: 74,
                                startLine: 571,
                              },
                            },
                          ],
                          parameters: [],
                          sourceInformation: {
                            endColumn: 77,
                            endLine: 571,
                            sourceId: '',
                            startColumn: 58,
                            startLine: 571,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 19,
                        endLine: 570,
                        sourceId: '',
                        startColumn: 18,
                        startLine: 570,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 78,
                    endLine: 571,
                    sourceId: '',
                    startColumn: 16,
                    startLine: 570,
                  },
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
                      sourceInformation: {
                        endColumn: 20,
                        endLine: 572,
                        sourceId: '',
                        startColumn: 19,
                        startLine: 572,
                      },
                      values: [],
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 20,
                    endLine: 572,
                    sourceId: '',
                    startColumn: 17,
                    startLine: 572,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 8,
                endLine: 569,
                sourceId: '',
                startColumn: 7,
                startLine: 569,
              },
            },
          ],
          name: 'productIdentifierWithNull',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'minus',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 12,
                        endLine: 577,
                        sourceId: '',
                        startColumn: 8,
                        startLine: 577,
                      },
                    },
                  ],
                  property: 'quantity',
                  sourceInformation: {
                    endColumn: 21,
                    endLine: 577,
                    sourceId: '',
                    startColumn: 14,
                    startLine: 577,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 7,
                endLine: 577,
                sourceId: '',
                startColumn: 7,
                startLine: 577,
              },
            },
          ],
          name: 'customerQuantity',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Float',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'dateDiff',
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
                          name: 'this',
                          sourceInformation: {
                            endColumn: 20,
                            endLine: 582,
                            sourceId: '',
                            startColumn: 16,
                            startLine: 582,
                          },
                        },
                      ],
                      property: 'latestEventDate',
                      sourceInformation: {
                        endColumn: 36,
                        endLine: 582,
                        sourceId: '',
                        startColumn: 22,
                        startLine: 582,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 43,
                    endLine: 582,
                    sourceId: '',
                    startColumn: 39,
                    startLine: 582,
                  },
                },
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 52,
                        endLine: 582,
                        sourceId: '',
                        startColumn: 48,
                        startLine: 582,
                      },
                    },
                  ],
                  property: 'date',
                  sourceInformation: {
                    endColumn: 57,
                    endLine: 582,
                    sourceId: '',
                    startColumn: 54,
                    startLine: 582,
                  },
                },
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'enum',
                      fullPath: 'DurationUnit',
                      sourceInformation: {
                        endColumn: 71,
                        endLine: 582,
                        sourceId: '',
                        startColumn: 60,
                        startLine: 582,
                      },
                    },
                  ],
                  property: 'DAYS',
                  sourceInformation: {
                    endColumn: 76,
                    endLine: 582,
                    sourceId: '',
                    startColumn: 73,
                    startLine: 582,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 14,
                endLine: 582,
                sourceId: '',
                startColumn: 7,
                startLine: 582,
              },
            },
          ],
          name: 'daysToLastEvent',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Integer',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 11,
                            endLine: 587,
                            sourceId: '',
                            startColumn: 7,
                            startLine: 587,
                          },
                        },
                      ],
                      property: 'events',
                      sourceInformation: {
                        endColumn: 18,
                        endLine: 587,
                        sourceId: '',
                        startColumn: 13,
                        startLine: 587,
                      },
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
                                  name: 'e',
                                  sourceInformation: {
                                    endColumn: 33,
                                    endLine: 587,
                                    sourceId: '',
                                    startColumn: 32,
                                    startLine: 587,
                                  },
                                },
                              ],
                              property: 'date',
                              sourceInformation: {
                                endColumn: 38,
                                endLine: 587,
                                sourceId: '',
                                startColumn: 35,
                                startLine: 587,
                              },
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 47,
                                    endLine: 587,
                                    sourceId: '',
                                    startColumn: 43,
                                    startLine: 587,
                                  },
                                },
                              ],
                              property: 'latestEventDate',
                              sourceInformation: {
                                endColumn: 63,
                                endLine: 587,
                                sourceId: '',
                                startColumn: 49,
                                startLine: 587,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 41,
                            endLine: 587,
                            sourceId: '',
                            startColumn: 40,
                            startLine: 587,
                          },
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'e',
                        },
                      ],
                      sourceInformation: {
                        endColumn: 63,
                        endLine: 587,
                        sourceId: '',
                        startColumn: 30,
                        startLine: 587,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 26,
                    endLine: 587,
                    sourceId: '',
                    startColumn: 21,
                    startLine: 587,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 71,
                endLine: 587,
                sourceId: '',
                startColumn: 67,
                startLine: 587,
              },
            },
          ],
          name: 'latestEvent',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'TradeEvent',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 11,
                        endLine: 593,
                        sourceId: '',
                        startColumn: 7,
                        startLine: 593,
                      },
                    },
                  ],
                  property: 'events',
                  sourceInformation: {
                    endColumn: 18,
                    endLine: 593,
                    sourceId: '',
                    startColumn: 13,
                    startLine: 593,
                  },
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
                              name: 'e',
                              sourceInformation: {
                                endColumn: 33,
                                endLine: 593,
                                sourceId: '',
                                startColumn: 32,
                                startLine: 593,
                              },
                            },
                          ],
                          property: 'date',
                          sourceInformation: {
                            endColumn: 38,
                            endLine: 593,
                            sourceId: '',
                            startColumn: 35,
                            startLine: 593,
                          },
                        },
                        {
                          _type: 'var',
                          name: 'date',
                          sourceInformation: {
                            endColumn: 47,
                            endLine: 593,
                            sourceId: '',
                            startColumn: 43,
                            startLine: 593,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 41,
                        endLine: 593,
                        sourceId: '',
                        startColumn: 40,
                        startLine: 593,
                      },
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'e',
                    },
                  ],
                  sourceInformation: {
                    endColumn: 47,
                    endLine: 593,
                    sourceId: '',
                    startColumn: 30,
                    startLine: 593,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 26,
                endLine: 593,
                sourceId: '',
                startColumn: 21,
                startLine: 593,
              },
            },
          ],
          name: 'eventsByDate',
          parameters: [
            {
              _type: 'var',
              class: 'Date',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'date',
              sourceInformation: {
                endColumn: 28,
                endLine: 591,
                sourceId: '',
                startColumn: 17,
                startLine: 591,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'TradeEvent',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 11,
                            endLine: 598,
                            sourceId: '',
                            startColumn: 7,
                            startLine: 598,
                          },
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
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 30,
                                    endLine: 598,
                                    sourceId: '',
                                    startColumn: 26,
                                    startLine: 598,
                                  },
                                },
                              ],
                              property: 'date',
                              sourceInformation: {
                                endColumn: 35,
                                endLine: 598,
                                sourceId: '',
                                startColumn: 32,
                                startLine: 598,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 42,
                            endLine: 598,
                            sourceId: '',
                            startColumn: 38,
                            startLine: 598,
                          },
                        },
                      ],
                      property: 'eventsByDate',
                      sourceInformation: {
                        endColumn: 24,
                        endLine: 598,
                        sourceId: '',
                        startColumn: 13,
                        startLine: 598,
                      },
                    },
                  ],
                  property: 'eventType',
                  sourceInformation: {
                    endColumn: 55,
                    endLine: 598,
                    sourceId: '',
                    startColumn: 47,
                    startLine: 598,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 62,
                endLine: 598,
                sourceId: '',
                startColumn: 58,
                startLine: 598,
              },
            },
          ],
          name: 'tradeDateEventType',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 11,
                        endLine: 603,
                        sourceId: '',
                        startColumn: 7,
                        startLine: 603,
                      },
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
                              name: 'this',
                              sourceInformation: {
                                endColumn: 30,
                                endLine: 603,
                                sourceId: '',
                                startColumn: 26,
                                startLine: 603,
                              },
                            },
                          ],
                          property: 'date',
                          sourceInformation: {
                            endColumn: 35,
                            endLine: 603,
                            sourceId: '',
                            startColumn: 32,
                            startLine: 603,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 42,
                        endLine: 603,
                        sourceId: '',
                        startColumn: 38,
                        startLine: 603,
                      },
                    },
                  ],
                  property: 'eventsByDate',
                  sourceInformation: {
                    endColumn: 24,
                    endLine: 603,
                    sourceId: '',
                    startColumn: 13,
                    startLine: 603,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 52,
                endLine: 603,
                sourceId: '',
                startColumn: 48,
                startLine: 603,
              },
            },
          ],
          name: 'tradeDateEvent',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'TradeEvent',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'filter',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                              sourceInformation: {
                                endColumn: 11,
                                endLine: 608,
                                sourceId: '',
                                startColumn: 7,
                                startLine: 608,
                              },
                            },
                          ],
                          property: 'events',
                          sourceInformation: {
                            endColumn: 18,
                            endLine: 608,
                            sourceId: '',
                            startColumn: 13,
                            startLine: 608,
                          },
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
                                      name: 'e',
                                      sourceInformation: {
                                        endColumn: 33,
                                        endLine: 608,
                                        sourceId: '',
                                        startColumn: 32,
                                        startLine: 608,
                                      },
                                    },
                                  ],
                                  property: 'date',
                                  sourceInformation: {
                                    endColumn: 38,
                                    endLine: 608,
                                    sourceId: '',
                                    startColumn: 35,
                                    startLine: 608,
                                  },
                                },
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'this',
                                      sourceInformation: {
                                        endColumn: 47,
                                        endLine: 608,
                                        sourceId: '',
                                        startColumn: 43,
                                        startLine: 608,
                                      },
                                    },
                                  ],
                                  property: 'date',
                                  sourceInformation: {
                                    endColumn: 52,
                                    endLine: 608,
                                    sourceId: '',
                                    startColumn: 49,
                                    startLine: 608,
                                  },
                                },
                              ],
                              sourceInformation: {
                                endColumn: 41,
                                endLine: 608,
                                sourceId: '',
                                startColumn: 40,
                                startLine: 608,
                              },
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'e',
                            },
                          ],
                          sourceInformation: {
                            endColumn: 52,
                            endLine: 608,
                            sourceId: '',
                            startColumn: 30,
                            startLine: 608,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 26,
                        endLine: 608,
                        sourceId: '',
                        startColumn: 21,
                        startLine: 608,
                      },
                    },
                  ],
                  property: 'eventType',
                  sourceInformation: {
                    endColumn: 63,
                    endLine: 608,
                    sourceId: '',
                    startColumn: 55,
                    startLine: 608,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 70,
                endLine: 608,
                sourceId: '',
                startColumn: 66,
                startLine: 608,
              },
            },
          ],
          name: 'tradeDateEventTypeInlined',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 11,
                            endLine: 613,
                            sourceId: '',
                            startColumn: 7,
                            startLine: 613,
                          },
                        },
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                              sourceInformation: {
                                endColumn: 30,
                                endLine: 613,
                                sourceId: '',
                                startColumn: 26,
                                startLine: 613,
                              },
                            },
                          ],
                          property: 'date',
                          sourceInformation: {
                            endColumn: 35,
                            endLine: 613,
                            sourceId: '',
                            startColumn: 32,
                            startLine: 613,
                          },
                        },
                      ],
                      property: 'eventsByDate',
                      sourceInformation: {
                        endColumn: 24,
                        endLine: 613,
                        sourceId: '',
                        startColumn: 13,
                        startLine: 613,
                      },
                    },
                  ],
                  property: 'initiator',
                  sourceInformation: {
                    endColumn: 46,
                    endLine: 613,
                    sourceId: '',
                    startColumn: 38,
                    startLine: 613,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 53,
                endLine: 613,
                sourceId: '',
                startColumn: 49,
                startLine: 613,
              },
            },
          ],
          name: 'initiator',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'filter',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                              sourceInformation: {
                                endColumn: 11,
                                endLine: 618,
                                sourceId: '',
                                startColumn: 7,
                                startLine: 618,
                              },
                            },
                          ],
                          property: 'events',
                          sourceInformation: {
                            endColumn: 18,
                            endLine: 618,
                            sourceId: '',
                            startColumn: 13,
                            startLine: 618,
                          },
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
                                      name: 'e',
                                      sourceInformation: {
                                        endColumn: 33,
                                        endLine: 618,
                                        sourceId: '',
                                        startColumn: 32,
                                        startLine: 618,
                                      },
                                    },
                                  ],
                                  property: 'date',
                                  sourceInformation: {
                                    endColumn: 38,
                                    endLine: 618,
                                    sourceId: '',
                                    startColumn: 35,
                                    startLine: 618,
                                  },
                                },
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'this',
                                      sourceInformation: {
                                        endColumn: 47,
                                        endLine: 618,
                                        sourceId: '',
                                        startColumn: 43,
                                        startLine: 618,
                                      },
                                    },
                                  ],
                                  property: 'date',
                                  sourceInformation: {
                                    endColumn: 52,
                                    endLine: 618,
                                    sourceId: '',
                                    startColumn: 49,
                                    startLine: 618,
                                  },
                                },
                              ],
                              sourceInformation: {
                                endColumn: 41,
                                endLine: 618,
                                sourceId: '',
                                startColumn: 40,
                                startLine: 618,
                              },
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'e',
                            },
                          ],
                          sourceInformation: {
                            endColumn: 52,
                            endLine: 618,
                            sourceId: '',
                            startColumn: 30,
                            startLine: 618,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 26,
                        endLine: 618,
                        sourceId: '',
                        startColumn: 21,
                        startLine: 618,
                      },
                    },
                  ],
                  property: 'initiator',
                  sourceInformation: {
                    endColumn: 63,
                    endLine: 618,
                    sourceId: '',
                    startColumn: 55,
                    startLine: 618,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 70,
                endLine: 618,
                sourceId: '',
                startColumn: 66,
                startLine: 618,
              },
            },
          ],
          name: 'initiatorInlined',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOneMany',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'filter',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                              sourceInformation: {
                                endColumn: 11,
                                endLine: 623,
                                sourceId: '',
                                startColumn: 7,
                                startLine: 623,
                              },
                            },
                          ],
                          property: 'events',
                          sourceInformation: {
                            endColumn: 18,
                            endLine: 623,
                            sourceId: '',
                            startColumn: 13,
                            startLine: 623,
                          },
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
                                      name: 'e',
                                      sourceInformation: {
                                        endColumn: 33,
                                        endLine: 623,
                                        sourceId: '',
                                        startColumn: 32,
                                        startLine: 623,
                                      },
                                    },
                                  ],
                                  property: 'eventType',
                                  sourceInformation: {
                                    endColumn: 43,
                                    endLine: 623,
                                    sourceId: '',
                                    startColumn: 35,
                                    startLine: 623,
                                  },
                                },
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 52,
                                            endLine: 623,
                                            sourceId: '',
                                            startColumn: 48,
                                            startLine: 623,
                                          },
                                        },
                                      ],
                                      property: 'product',
                                      sourceInformation: {
                                        endColumn: 60,
                                        endLine: 623,
                                        sourceId: '',
                                        startColumn: 54,
                                        startLine: 623,
                                      },
                                    },
                                  ],
                                  property: 'name',
                                  sourceInformation: {
                                    endColumn: 65,
                                    endLine: 623,
                                    sourceId: '',
                                    startColumn: 62,
                                    startLine: 623,
                                  },
                                },
                              ],
                              sourceInformation: {
                                endColumn: 46,
                                endLine: 623,
                                sourceId: '',
                                startColumn: 45,
                                startLine: 623,
                              },
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'e',
                            },
                          ],
                          sourceInformation: {
                            endColumn: 65,
                            endLine: 623,
                            sourceId: '',
                            startColumn: 30,
                            startLine: 623,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 26,
                        endLine: 623,
                        sourceId: '',
                        startColumn: 21,
                        startLine: 623,
                      },
                    },
                  ],
                  property: 'initiator',
                  sourceInformation: {
                    endColumn: 76,
                    endLine: 623,
                    sourceId: '',
                    startColumn: 68,
                    startLine: 623,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 87,
                endLine: 623,
                sourceId: '',
                startColumn: 79,
                startLine: 623,
              },
            },
          ],
          name: 'initiatorInlinedByProductName',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
          },
          returnType: 'Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Order',
    content: {
      _type: 'class',
      name: 'Order',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'id',
          type: 'Integer',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'date',
          type: 'StrictDate',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'quantity',
          type: 'Float',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'settlementDateTime',
          type: 'DateTime',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'pnl',
          type: 'Float',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'pnlContact',
          type: 'Person',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'zeroPnl',
          type: 'Boolean',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::OrderPnl',
    content: {
      _type: 'class',
      name: 'OrderPnl',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'pnl',
          type: 'Float',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'supportContactName',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'order',
          type: 'Order',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::AccountPnl',
    content: {
      _type: 'class',
      name: 'AccountPnl',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'pnl',
          type: 'Float',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::TradeEvent',
    content: {
      _type: 'class',
      name: 'TradeEvent',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'eventType',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'date',
          type: 'StrictDate',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'initiator',
          type: 'Person',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'traderAddress',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Account',
    content: {
      _type: 'class',
      name: 'Account',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'createDate',
          type: 'StrictDate',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'in',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 16,
                            endLine: 674,
                            sourceId: '',
                            startColumn: 12,
                            startLine: 674,
                          },
                        },
                      ],
                      property: 'name',
                      sourceInformation: {
                        endColumn: 21,
                        endLine: 674,
                        sourceId: '',
                        startColumn: 18,
                        startLine: 674,
                      },
                    },
                    {
                      _type: 'collection',
                      multiplicity: {
                        lowerBound: 2,
                        upperBound: 2,
                      },
                      sourceInformation: {
                        endColumn: 52,
                        endLine: 674,
                        sourceId: '',
                        startColumn: 27,
                        startLine: 674,
                      },
                      values: [
                        {
                          _type: 'string',
                          multiplicity: {
                            lowerBound: 1,
                            upperBound: 1,
                          },
                          sourceInformation: {
                            endColumn: 38,
                            endLine: 674,
                            sourceId: '',
                            startColumn: 28,
                            startLine: 674,
                          },
                          values: ['Account 1'],
                        },
                        {
                          _type: 'string',
                          multiplicity: {
                            lowerBound: 1,
                            upperBound: 1,
                          },
                          sourceInformation: {
                            endColumn: 51,
                            endLine: 674,
                            sourceId: '',
                            startColumn: 41,
                            startLine: 674,
                          },
                          values: ['Account 2'],
                        },
                      ],
                    },
                  ],
                  sourceInformation: {
                    endColumn: 25,
                    endLine: 674,
                    sourceId: '',
                    startColumn: 24,
                    startLine: 674,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 60,
                        endLine: 674,
                        sourceId: '',
                        startColumn: 58,
                        startLine: 674,
                      },
                      values: ['A'],
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 60,
                    endLine: 674,
                    sourceId: '',
                    startColumn: 56,
                    startLine: 674,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 67,
                        endLine: 674,
                        sourceId: '',
                        startColumn: 65,
                        startLine: 674,
                      },
                      values: ['B'],
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 67,
                    endLine: 674,
                    sourceId: '',
                    startColumn: 63,
                    startLine: 674,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 8,
                endLine: 674,
                sourceId: '',
                startColumn: 7,
                startLine: 674,
              },
            },
          ],
          name: 'accountCategory',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'contains',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 14,
                            endLine: 680,
                            sourceId: '',
                            startColumn: 10,
                            startLine: 680,
                          },
                        },
                      ],
                      property: 'name',
                      sourceInformation: {
                        endColumn: 19,
                        endLine: 680,
                        sourceId: '',
                        startColumn: 16,
                        startLine: 680,
                      },
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 33,
                        endLine: 680,
                        sourceId: '',
                        startColumn: 31,
                        startLine: 680,
                      },
                      values: ['2'],
                    },
                  ],
                  sourceInformation: {
                    endColumn: 29,
                    endLine: 680,
                    sourceId: '',
                    startColumn: 22,
                    startLine: 680,
                  },
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
                      sourceInformation: {
                        endColumn: 41,
                        endLine: 680,
                        sourceId: '',
                        startColumn: 38,
                        startLine: 680,
                      },
                      values: [true],
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 41,
                    endLine: 680,
                    sourceId: '',
                    startColumn: 37,
                    startLine: 680,
                  },
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
                      sourceInformation: {
                        endColumn: 49,
                        endLine: 680,
                        sourceId: '',
                        startColumn: 45,
                        startLine: 680,
                      },
                      values: [false],
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 49,
                    endLine: 680,
                    sourceId: '',
                    startColumn: 44,
                    startLine: 680,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 8,
                endLine: 680,
                sourceId: '',
                startColumn: 7,
                startLine: 680,
              },
            },
          ],
          name: 'isTypeA',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Boolean',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Interaction',
    content: {
      _type: 'class',
      name: 'Interaction',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'id',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'source',
          type: 'Person',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'target',
          type: 'Person',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'active',
          type: 'Boolean',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'time',
          type: 'Integer',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'longestInteractionBetweenSourceAndTarget',
          type: 'Integer',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::EntityWithAddress',
    content: {
      _type: 'class',
      name: 'EntityWithAddress',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'address',
          type: 'Address',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::EntityWithLocations',
    content: {
      _type: 'class',
      name: 'EntityWithLocations',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'locations',
          type: 'Location',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 13,
                        endLine: 710,
                        sourceId: '',
                        startColumn: 9,
                        startLine: 710,
                      },
                    },
                  ],
                  property: 'locations',
                  sourceInformation: {
                    endColumn: 23,
                    endLine: 710,
                    sourceId: '',
                    startColumn: 15,
                    startLine: 710,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'exists',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'types',
                          sourceInformation: {
                            endColumn: 42,
                            endLine: 710,
                            sourceId: '',
                            startColumn: 37,
                            startLine: 710,
                          },
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'is',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'l',
                                      sourceInformation: {
                                        endColumn: 63,
                                        endLine: 710,
                                        sourceId: '',
                                        startColumn: 62,
                                        startLine: 710,
                                      },
                                    },
                                  ],
                                  property: 'type',
                                  sourceInformation: {
                                    endColumn: 68,
                                    endLine: 710,
                                    sourceId: '',
                                    startColumn: 65,
                                    startLine: 710,
                                  },
                                },
                                {
                                  _type: 'var',
                                  name: 'type',
                                  sourceInformation: {
                                    endColumn: 75,
                                    endLine: 710,
                                    sourceId: '',
                                    startColumn: 71,
                                    startLine: 710,
                                  },
                                },
                              ],
                              sourceInformation: {
                                endColumn: 60,
                                endLine: 710,
                                sourceId: '',
                                startColumn: 59,
                                startLine: 710,
                              },
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'type',
                            },
                          ],
                          sourceInformation: {
                            endColumn: 76,
                            endLine: 710,
                            sourceId: '',
                            startColumn: 57,
                            startLine: 710,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 50,
                        endLine: 710,
                        sourceId: '',
                        startColumn: 45,
                        startLine: 710,
                      },
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'l',
                    },
                  ],
                  sourceInformation: {
                    endColumn: 77,
                    endLine: 710,
                    sourceId: '',
                    startColumn: 35,
                    startLine: 710,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 31,
                endLine: 710,
                sourceId: '',
                startColumn: 26,
                startLine: 710,
              },
            },
          ],
          name: 'locationsByType',
          parameters: [
            {
              _type: 'var',
              class: 'GeographicEntityType',
              multiplicity: {
                lowerBound: 0,
              },
              name: 'types',
              sourceInformation: {
                endColumn: 49,
                endLine: 708,
                sourceId: '',
                startColumn: 21,
                startLine: 708,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'Location',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::GeographicEntity',
    content: {
      _type: 'class',
      name: 'GeographicEntity',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'type',
          type: 'GeographicEntityType',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::relational::tests::mapping::union::extend::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'meta::relational::tests::mapping::union::extend',
      superTypes: ['meta::pure::tests::model::simple::Person'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::relational::tests::mapping::union::extend::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'meta::relational::tests::mapping::union::extend',
      superTypes: ['meta::pure::tests::model::simple::Firm'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::relational::tests::mapping::union::extend::Address',
    content: {
      _type: 'class',
      name: 'Address',
      package: 'meta::relational::tests::mapping::union::extend',
      superTypes: ['meta::pure::tests::model::simple::Address'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::relational::tests::mapping::subType::MyProduct',
    content: {
      _type: 'class',
      name: 'MyProduct',
      package: 'meta::relational::tests::mapping::subType',
      superTypes: ['Product'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Organization',
    content: {
      _type: 'class',
      name: 'Organization',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'letFunction',
              parameters: [
                {
                  _type: 'string',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: ['parent'],
                },
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 26,
                        endLine: 754,
                        sourceId: '',
                        startColumn: 22,
                        startLine: 754,
                      },
                    },
                  ],
                  property: 'parent',
                  sourceInformation: {
                    endColumn: 33,
                    endLine: 754,
                    sourceId: '',
                    startColumn: 9,
                    startLine: 754,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 33,
                endLine: 754,
                sourceId: '',
                startColumn: 9,
                startLine: 754,
              },
            },
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'isEmpty',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'parent',
                      sourceInformation: {
                        endColumn: 18,
                        endLine: 755,
                        sourceId: '',
                        startColumn: 12,
                        startLine: 755,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 27,
                    endLine: 755,
                    sourceId: '',
                    startColumn: 21,
                    startLine: 755,
                  },
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
                      sourceInformation: {
                        endColumn: 34,
                        endLine: 755,
                        sourceId: '',
                        startColumn: 33,
                        startLine: 755,
                      },
                      values: [],
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 34,
                    endLine: 755,
                    sourceId: '',
                    startColumn: 32,
                    startLine: 755,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'concatenate',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'parent',
                          sourceInformation: {
                            endColumn: 56,
                            endLine: 755,
                            sourceId: '',
                            startColumn: 50,
                            startLine: 755,
                          },
                        },
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'func',
                              function: 'toOne',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'parent',
                                  sourceInformation: {
                                    endColumn: 65,
                                    endLine: 755,
                                    sourceId: '',
                                    startColumn: 59,
                                    startLine: 755,
                                  },
                                },
                              ],
                              sourceInformation: {
                                endColumn: 72,
                                endLine: 755,
                                sourceId: '',
                                startColumn: 68,
                                startLine: 755,
                              },
                            },
                          ],
                          property: 'superOrganizations',
                          sourceInformation: {
                            endColumn: 93,
                            endLine: 755,
                            sourceId: '',
                            startColumn: 76,
                            startLine: 755,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 48,
                        endLine: 755,
                        sourceId: '',
                        startColumn: 38,
                        startLine: 755,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 96,
                    endLine: 755,
                    sourceId: '',
                    startColumn: 37,
                    startLine: 755,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 10,
                endLine: 755,
                sourceId: '',
                startColumn: 9,
                startLine: 755,
              },
            },
          ],
          name: 'superOrganizations',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'Organization',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'removeDuplicates',
              parameters: [
                {
                  _type: 'func',
                  function: 'concatenate',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 25,
                            endLine: 759,
                            sourceId: '',
                            startColumn: 21,
                            startLine: 759,
                          },
                        },
                      ],
                      property: 'children',
                      sourceInformation: {
                        endColumn: 34,
                        endLine: 759,
                        sourceId: '',
                        startColumn: 27,
                        startLine: 759,
                      },
                    },
                    {
                      _type: 'func',
                      function: 'map',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                              sourceInformation: {
                                endColumn: 41,
                                endLine: 759,
                                sourceId: '',
                                startColumn: 37,
                                startLine: 759,
                              },
                            },
                          ],
                          property: 'children',
                          sourceInformation: {
                            endColumn: 50,
                            endLine: 759,
                            sourceId: '',
                            startColumn: 43,
                            startLine: 759,
                          },
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'c',
                                  sourceInformation: {
                                    endColumn: 62,
                                    endLine: 759,
                                    sourceId: '',
                                    startColumn: 61,
                                    startLine: 759,
                                  },
                                },
                              ],
                              property: 'subOrganizations',
                              sourceInformation: {
                                endColumn: 79,
                                endLine: 759,
                                sourceId: '',
                                startColumn: 64,
                                startLine: 759,
                              },
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'c',
                            },
                          ],
                          sourceInformation: {
                            endColumn: 81,
                            endLine: 759,
                            sourceId: '',
                            startColumn: 59,
                            startLine: 759,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 55,
                        endLine: 759,
                        sourceId: '',
                        startColumn: 53,
                        startLine: 759,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 19,
                    endLine: 759,
                    sourceId: '',
                    startColumn: 9,
                    startLine: 759,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 101,
                endLine: 759,
                sourceId: '',
                startColumn: 86,
                startLine: 759,
              },
            },
          ],
          name: 'subOrganizations',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'Organization',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 13,
                            endLine: 763,
                            sourceId: '',
                            startColumn: 9,
                            startLine: 763,
                          },
                        },
                      ],
                      property: 'children',
                      sourceInformation: {
                        endColumn: 22,
                        endLine: 763,
                        sourceId: '',
                        startColumn: 15,
                        startLine: 763,
                      },
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
                                  name: 'c',
                                  sourceInformation: {
                                    endColumn: 37,
                                    endLine: 763,
                                    sourceId: '',
                                    startColumn: 36,
                                    startLine: 763,
                                  },
                                },
                              ],
                              property: 'name',
                              sourceInformation: {
                                endColumn: 42,
                                endLine: 763,
                                sourceId: '',
                                startColumn: 39,
                                startLine: 763,
                              },
                            },
                            {
                              _type: 'var',
                              name: 'name',
                              sourceInformation: {
                                endColumn: 51,
                                endLine: 763,
                                sourceId: '',
                                startColumn: 47,
                                startLine: 763,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 45,
                            endLine: 763,
                            sourceId: '',
                            startColumn: 44,
                            startLine: 763,
                          },
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'c',
                        },
                      ],
                      sourceInformation: {
                        endColumn: 51,
                        endLine: 763,
                        sourceId: '',
                        startColumn: 34,
                        startLine: 763,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 30,
                    endLine: 763,
                    sourceId: '',
                    startColumn: 25,
                    startLine: 763,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 59,
                endLine: 763,
                sourceId: '',
                startColumn: 55,
                startLine: 763,
              },
            },
          ],
          name: 'child',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'name',
              sourceInformation: {
                endColumn: 24,
                endLine: 761,
                sourceId: '',
                startColumn: 11,
                startLine: 761,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Organization',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'removeDuplicates',
              parameters: [
                {
                  _type: 'func',
                  function: 'concatenate',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 25,
                            endLine: 767,
                            sourceId: '',
                            startColumn: 21,
                            startLine: 767,
                          },
                        },
                      ],
                      property: 'members',
                      sourceInformation: {
                        endColumn: 33,
                        endLine: 767,
                        sourceId: '',
                        startColumn: 27,
                        startLine: 767,
                      },
                    },
                    {
                      _type: 'func',
                      function: 'map',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                              sourceInformation: {
                                endColumn: 40,
                                endLine: 767,
                                sourceId: '',
                                startColumn: 36,
                                startLine: 767,
                              },
                            },
                          ],
                          property: 'subOrganizations',
                          sourceInformation: {
                            endColumn: 57,
                            endLine: 767,
                            sourceId: '',
                            startColumn: 42,
                            startLine: 767,
                          },
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'o',
                                  sourceInformation: {
                                    endColumn: 71,
                                    endLine: 767,
                                    sourceId: '',
                                    startColumn: 70,
                                    startLine: 767,
                                  },
                                },
                              ],
                              property: 'members',
                              sourceInformation: {
                                endColumn: 79,
                                endLine: 767,
                                sourceId: '',
                                startColumn: 73,
                                startLine: 767,
                              },
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'o',
                            },
                          ],
                          sourceInformation: {
                            endColumn: 79,
                            endLine: 767,
                            sourceId: '',
                            startColumn: 68,
                            startLine: 767,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 64,
                        endLine: 767,
                        sourceId: '',
                        startColumn: 62,
                        startLine: 767,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 19,
                    endLine: 767,
                    sourceId: '',
                    startColumn: 9,
                    startLine: 767,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 99,
                endLine: 767,
                sourceId: '',
                startColumn: 84,
                startLine: 767,
              },
            },
          ],
          name: 'allMembers',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Bridge',
    content: {
      _type: 'class',
      name: 'Bridge',
      package: 'meta::pure::tests::model::simple',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::PersonNameParameter',
    content: {
      _type: 'class',
      name: 'PersonNameParameter',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'lastNameFirst',
          type: 'Boolean',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'nested',
          type: 'PersonNameParameterNested',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::ProductClassification',
    content: {
      _type: 'class',
      name: 'ProductClassification',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'type',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'description',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'meta::owl::tests::model',
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
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'gender',
          type: 'GenderType',
        },
        {
          multiplicity: {
            lowerBound: 2,
          },
          name: 'nicknames',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Division',
    content: {
      _type: 'class',
      name: 'Division',
      package: 'meta::pure::tests::model::simple',
      superTypes: ['Organization'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Department',
    content: {
      _type: 'class',
      name: 'Department',
      package: 'meta::pure::tests::model::simple',
      superTypes: ['Organization'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Team',
    content: {
      _type: 'class',
      name: 'Team',
      package: 'meta::pure::tests::model::simple',
      superTypes: ['Organization'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::FemalePerson',
    content: {
      _type: 'class',
      name: 'FemalePerson',
      package: 'meta::owl::tests::model',
      superTypes: ['Person'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::FemaleExecutive',
    content: {
      _type: 'class',
      name: 'FemaleExecutive',
      package: 'meta::owl::tests::model',
      superTypes: ['Executive', 'FemalePerson'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::MalePerson',
    content: {
      _type: 'class',
      name: 'MalePerson',
      package: 'meta::owl::tests::model',
      superTypes: ['Person'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::MaleExecutive',
    content: {
      _type: 'class',
      name: 'MaleExecutive',
      package: 'meta::owl::tests::model',
      superTypes: ['Executive', 'MalePerson'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::relational::tests::mapping::subType::CreditRating',
    content: {
      _type: 'class',
      name: 'CreditRating',
      package: 'meta::relational::tests::mapping::subType',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'description',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::PersonNameParameterNested',
    content: {
      _type: 'class',
      name: 'PersonNameParameterNested',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'prefix',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::Business',
    content: {
      _type: 'class',
      name: 'Business',
      package: 'meta::owl::tests::model',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'address',
          type: 'String',
        },
      ],
      superTypes: ['Organization', 'EntityWithLocation'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::Executive',
    content: {
      _type: 'class',
      name: 'Executive',
      package: 'meta::owl::tests::model',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'organization',
          type: 'Business',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'seniorityLevel',
          type: 'OrgLevelType',
        },
      ],
      superTypes: ['Professional'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::Professional',
    content: {
      _type: 'class',
      name: 'Professional',
      package: 'meta::owl::tests::model',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::Organization',
    content: {
      _type: 'class',
      name: 'Organization',
      package: 'meta::owl::tests::model',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'officialName',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::EntityWithLocation',
    content: {
      _type: 'class',
      name: 'EntityWithLocation',
      package: 'meta::owl::tests::model',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'location',
          type: 'GeoLocation',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::owl::tests::model::GeoLocation',
    content: {
      _type: 'class',
      name: 'GeoLocation',
      package: 'meta::owl::tests::model',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'engName',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Employment',
    content: {
      _type: 'association',
      name: 'Employment',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'firm',
          type: 'Firm',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employees',
          type: 'Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::FirmCEO',
    content: {
      _type: 'association',
      name: 'FirmCEO',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'ceoFirm',
          type: 'Firm',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'ceo',
          type: 'Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::Membership',
    content: {
      _type: 'association',
      name: 'Membership',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'organizations',
          type: 'Organization',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'members',
          type: 'Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::BridgeAsso1',
    content: {
      _type: 'association',
      name: 'BridgeAsso1',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'bridge',
          type: 'Bridge',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employees',
          type: 'Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::FirmOrganizations',
    content: {
      _type: 'association',
      name: 'FirmOrganizations',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firm',
          type: 'Firm',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'organizations',
          type: 'Organization',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::BridgeAsso2',
    content: {
      _type: 'association',
      name: 'BridgeAsso2',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'bridge',
          type: 'Bridge',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'firm',
          type: 'Firm',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::AddressLocation',
    content: {
      _type: 'association',
      name: 'AddressLocation',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'location',
          type: 'Location',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'addresses',
          type: 'Address',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::PlacesOfInterest',
    content: {
      _type: 'association',
      name: 'PlacesOfInterest',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'location',
          type: 'Location',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'placeOfInterest',
          type: 'PlaceOfInterest',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::ProdSynonym',
    content: {
      _type: 'association',
      name: 'ProdSynonym',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'synonyms',
          type: 'Synonym',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'product',
          type: 'Product',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 50,
                            endLine: 988,
                            sourceId: '',
                            startColumn: 46,
                            startLine: 988,
                          },
                        },
                      ],
                      property: 'synonyms',
                      sourceInformation: {
                        endColumn: 59,
                        endLine: 988,
                        sourceId: '',
                        startColumn: 52,
                        startLine: 988,
                      },
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
                                  name: 's',
                                  sourceInformation: {
                                    endColumn: 72,
                                    endLine: 988,
                                    sourceId: '',
                                    startColumn: 71,
                                    startLine: 988,
                                  },
                                },
                              ],
                              property: 'type',
                              sourceInformation: {
                                endColumn: 77,
                                endLine: 988,
                                sourceId: '',
                                startColumn: 74,
                                startLine: 988,
                              },
                            },
                            {
                              _type: 'var',
                              name: 'type',
                              sourceInformation: {
                                endColumn: 86,
                                endLine: 988,
                                sourceId: '',
                                startColumn: 82,
                                startLine: 988,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 80,
                            endLine: 988,
                            sourceId: '',
                            startColumn: 79,
                            startLine: 988,
                          },
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 's',
                        },
                      ],
                      sourceInformation: {
                        endColumn: 86,
                        endLine: 988,
                        sourceId: '',
                        startColumn: 70,
                        startLine: 988,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 67,
                    endLine: 988,
                    sourceId: '',
                    startColumn: 62,
                    startLine: 988,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 94,
                endLine: 988,
                sourceId: '',
                startColumn: 90,
                startLine: 988,
              },
            },
          ],
          name: 'synonymByType',
          parameters: [
            {
              _type: 'var',
              class: 'ProductSynonymType',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'type',
              sourceInformation: {
                endColumn: 43,
                endLine: 988,
                sourceId: '',
                startColumn: 18,
                startLine: 988,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Synonym',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 53,
                        endLine: 989,
                        sourceId: '',
                        startColumn: 49,
                        startLine: 989,
                      },
                    },
                  ],
                  property: 'synonyms',
                  sourceInformation: {
                    endColumn: 62,
                    endLine: 989,
                    sourceId: '',
                    startColumn: 55,
                    startLine: 989,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'in',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 's',
                              sourceInformation: {
                                endColumn: 75,
                                endLine: 989,
                                sourceId: '',
                                startColumn: 74,
                                startLine: 989,
                              },
                            },
                          ],
                          property: 'type',
                          sourceInformation: {
                            endColumn: 80,
                            endLine: 989,
                            sourceId: '',
                            startColumn: 77,
                            startLine: 989,
                          },
                        },
                        {
                          _type: 'var',
                          name: 'types',
                          sourceInformation: {
                            endColumn: 91,
                            endLine: 989,
                            sourceId: '',
                            startColumn: 86,
                            startLine: 989,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 84,
                        endLine: 989,
                        sourceId: '',
                        startColumn: 83,
                        startLine: 989,
                      },
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 's',
                    },
                  ],
                  sourceInformation: {
                    endColumn: 92,
                    endLine: 989,
                    sourceId: '',
                    startColumn: 73,
                    startLine: 989,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 70,
                endLine: 989,
                sourceId: '',
                startColumn: 65,
                startLine: 989,
              },
            },
          ],
          name: 'synonymsByTypes',
          parameters: [
            {
              _type: 'var',
              class: 'ProductSynonymType',
              multiplicity: {
                lowerBound: 0,
              },
              name: 'types',
              sourceInformation: {
                endColumn: 46,
                endLine: 989,
                sourceId: '',
                startColumn: 20,
                startLine: 989,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'Synonym',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::Trade_Accounts',
    content: {
      _type: 'association',
      name: 'Trade_Accounts',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'account',
          type: 'Account',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'trades',
          type: 'Trade',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::Trade_Orders',
    content: {
      _type: 'association',
      name: 'Trade_Orders',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'account',
          type: 'Account',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'orders',
          type: 'Order',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::Account_AccountPnl',
    content: {
      _type: 'association',
      name: 'Account_AccountPnl',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'account',
          type: 'Account',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'accountPnl',
          type: 'AccountPnl',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::owl::tests::model::Person_Accounts',
    content: {
      _type: 'association',
      name: 'Person_Accounts',
      package: 'meta::owl::tests::model',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'acctOwner',
          type: 'Person',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'accounts',
          type: 'meta::pure::tests::model::simple::Account',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::relational::tests::mapping::subType::ProductRating',
    content: {
      _type: 'association',
      name: 'ProductRating',
      package: 'meta::relational::tests::mapping::subType',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'product',
          type: 'MyProduct',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'rating',
          type: 'CreditRating',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::SubOrganization',
    content: {
      _type: 'association',
      name: 'SubOrganization',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'parent',
          type: 'Organization',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'children',
          type: 'Organization',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::owl::tests::model::Business_Employees',
    content: {
      _type: 'association',
      name: 'Business_Employees',
      package: 'meta::owl::tests::model',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'firm',
          type: 'Business',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employs',
          type: 'Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::owl::tests::model::Parent_Children',
    content: {
      _type: 'association',
      name: 'Parent_Children',
      package: 'meta::owl::tests::model',
      properties: [
        {
          multiplicity: {
            lowerBound: 2,
            upperBound: 2,
          },
          name: 'parents',
          type: 'Person',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'children',
          type: 'Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::owl::tests::model::OrgStructures',
    content: {
      _type: 'association',
      name: 'OrgStructures',
      package: 'meta::owl::tests::model',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'parentOrg',
          type: 'Organization',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'subOrgs',
          type: 'Organization',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::ProductSynonymType',
    content: {
      _type: 'Enumeration',
      name: 'ProductSynonymType',
      package: 'meta::pure::tests::model::simple',
      values: [
        {
          value: 'CUSIP',
        },
        {
          value: 'ISIN',
        },
        {
          value: 'GSN',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  {
    path: 'meta::pure::tests::model::simple::GeographicEntityType',
    content: {
      _type: 'Enumeration',
      name: 'GeographicEntityType',
      package: 'meta::pure::tests::model::simple',
      values: [
        {
          taggedValues: [
            {
              tag: {
                profile: 'doc',
                value: 'doc',
              },
              value: 'A city, town, village, or other urban area.',
            },
          ],
          value: 'CITY',
        },
        {
          stereotypes: [
            {
              profile: 'doc',
              value: 'deprecated',
            },
          ],
          value: 'COUNTRY',
        },
        {
          taggedValues: [
            {
              tag: {
                profile: 'doc',
                value: 'doc',
              },
              value: 'Any geographic entity other than a city or country.',
            },
          ],
          value: 'REGION',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  {
    path: 'meta::owl::tests::model::GenderType',
    content: {
      _type: 'Enumeration',
      name: 'GenderType',
      package: 'meta::owl::tests::model',
      values: [
        {
          value: 'MALE',
        },
        {
          value: 'FEMALE',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  {
    path: 'meta::owl::tests::model::OrgLevelType',
    content: {
      _type: 'Enumeration',
      name: 'OrgLevelType',
      package: 'meta::owl::tests::model',
      values: [
        {
          value: 'VP',
        },
        {
          value: 'MD',
        },
        {
          value: 'PMD',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  {
    path: 'meta::relational::tests::db',
    content: {
      _type: 'relational',
      filters: [
        {
          _type: 'filter',
          name: 'PositiveInteractionTimeFilter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'greaterThan',
            parameters: [
              {
                _type: 'column',
                column: 'time',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'interactionTable',
                },
                tableAlias: 'interactionTable',
              },
              {
                _type: 'literal',
                value: 0,
              },
            ],
          },
        },
        {
          _type: 'filter',
          name: 'ProductSynonymFilter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'notEqual',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'productSchema',
                  table: 'synonymTable',
                },
                tableAlias: 'synonymTable',
              },
              {
                _type: 'literal',
                value: 1,
              },
            ],
          },
        },
        {
          _type: 'filter',
          name: 'NonNegativePnlFilter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'greaterThan',
            parameters: [
              {
                _type: 'column',
                column: 'pnl',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderPnlTable',
                },
                tableAlias: 'orderPnlTable',
              },
              {
                _type: 'literal',
                value: 0,
              },
            ],
          },
        },
        {
          _type: 'filter',
          name: 'LessThanEqualZeroPnlFilter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'lessThanEqual',
            parameters: [
              {
                _type: 'column',
                column: 'pnl',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderPnlTable',
                },
                tableAlias: 'orderPnlTable',
              },
              {
                _type: 'literal',
                value: 0,
              },
            ],
          },
        },
      ],
      joins: [
        {
          name: 'Product_Synonym',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'PRODID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'productSchema',
                  table: 'synonymTable',
                },
                tableAlias: 'synonymTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'productSchema',
                  table: 'productTable',
                },
                tableAlias: 'productTable',
              },
            ],
          },
        },
        {
          name: 'Trade_Product',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'prodId',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'tradeTable',
                },
                tableAlias: 'tradeTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'productSchema',
                  table: 'productTable',
                },
                tableAlias: 'productTable',
              },
            ],
          },
        },
        {
          name: 'Trade_Account',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'accountID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'tradeTable',
                },
                tableAlias: 'tradeTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'accountTable',
                },
                tableAlias: 'accountTable',
              },
            ],
          },
        },
        {
          name: 'Interaction_Source',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'sourceId',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'interactionTable',
                },
                tableAlias: 'interactionTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'Interaction_Target',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'targetId',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'interactionTable',
                },
                tableAlias: 'interactionTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'InteractionTable_InteractionViewMaxTime',
          operation: {
            _type: 'dynaFunc',
            funcName: 'and',
            parameters: [
              {
                _type: 'dynaFunc',
                funcName: 'equal',
                parameters: [
                  {
                    _type: 'column',
                    column: 'sourceId',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 'interactionTable',
                  },
                  {
                    _type: 'column',
                    column: 'sourceId',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'interactionViewMaxTime',
                    },
                    tableAlias: 'interactionViewMaxTime',
                  },
                ],
              },
              {
                _type: 'dynaFunc',
                funcName: 'equal',
                parameters: [
                  {
                    _type: 'column',
                    column: 'targetId',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 'interactionTable',
                  },
                  {
                    _type: 'column',
                    column: 'targetId',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'interactionViewMaxTime',
                    },
                    tableAlias: 'interactionViewMaxTime',
                  },
                ],
              },
            ],
          },
        },
        {
          name: 'Trade_TradeEvent',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'tradeTable',
                },
                tableAlias: 'tradeTable',
              },
              {
                _type: 'column',
                column: 'trade_id',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'tradeEventTable',
                },
                tableAlias: 'tradeEventTable',
              },
            ],
          },
        },
        {
          name: 'Trade_TradeEventViewMaxTradeEventDate',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'tradeTable',
                },
                tableAlias: 'tradeTable',
              },
              {
                _type: 'column',
                column: 'trade_id',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'tradeEventViewMaxTradeEventDate',
                },
                tableAlias: 'tradeEventViewMaxTradeEventDate',
              },
            ],
          },
        },
        {
          name: 'TradeEvent_Person',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'person_id',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'tradeEventTable',
                },
                tableAlias: 'tradeEventTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'Interaction_Interaction',
          operation: {
            _type: 'dynaFunc',
            funcName: 'and',
            parameters: [
              {
                _type: 'dynaFunc',
                funcName: 'equal',
                parameters: [
                  {
                    _type: 'column',
                    column: 'sourceId',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 'interactionTable',
                  },
                  {
                    _type: 'column',
                    column: 'sourceId',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 't_interactionTable',
                  },
                ],
              },
              {
                _type: 'dynaFunc',
                funcName: 'equal',
                parameters: [
                  {
                    _type: 'column',
                    column: 'targetId',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 'interactionTable',
                  },
                  {
                    _type: 'column',
                    column: 'targetId',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 't_interactionTable',
                  },
                ],
              },
            ],
          },
          target: 't_interactionTable',
        },
        {
          name: 'Order_SalesPerson',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'accountID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
              {
                _type: 'column',
                column: 'ACCOUNT_ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'salesPersonTable',
                },
                tableAlias: 'salesPersonTable',
              },
            ],
          },
        },
        {
          name: 'Order_Account',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'accountID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'accountTable',
                },
                tableAlias: 'accountTable',
              },
            ],
          },
        },
        {
          name: 'OrderPnlView_Order',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ORDER_ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderPnlView',
                },
                tableAlias: 'orderPnlView',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
            ],
          },
        },
        {
          name: 'OrderPnlViewOnView_Order',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ORDER_ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderPnlViewOnView',
                },
                tableAlias: 'orderPnlViewOnView',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
            ],
          },
        },
        {
          name: 'OrderNetativePnlView_Order',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ORDER_ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderNegativePnlView',
                },
                tableAlias: 'orderNegativePnlView',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
            ],
          },
        },
        {
          name: 'OrderNegativePnlViewOnView_Order',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ORDER_ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderNegativePnlViewOnView',
                },
                tableAlias: 'orderNegativePnlViewOnView',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
            ],
          },
        },
        {
          name: 'OrderPnlView_Person',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'supportContactId',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderPnlView',
                },
                tableAlias: 'orderPnlView',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'SalesPerson_PersonView',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'PERSON_ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'salesPersonTable',
                },
                tableAlias: 'salesPersonTable',
              },
              {
                _type: 'column',
                column: 'PERSON_ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'PersonFirmView',
                },
                tableAlias: 'PersonFirmView',
              },
            ],
          },
        },
        {
          name: 'OrderPnlTable_Order',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ORDER_ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderPnlTable',
                },
                tableAlias: 'orderPnlTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
            ],
          },
        },
        {
          name: 'AccountPnlView_Account',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'accountId',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'accountOrderPnlView',
                },
                tableAlias: 'accountOrderPnlView',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'accountTable',
                },
                tableAlias: 'accountTable',
              },
            ],
          },
        },
        {
          name: 'Person_OtherNames',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              {
                _type: 'column',
                column: 'PERSON_ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::db',
                  schema: 'default',
                  table: 'otherNamesTable',
                },
                tableAlias: 'otherNamesTable',
              },
            ],
          },
        },
      ],
      name: 'db',
      package: 'meta::relational::tests',
      schemas: [
        {
          name: 'productSchema',
          tables: [
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'PRODID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'TYPE',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'synonymTable',
              primaryKey: ['ID'],
            },
          ],
          views: [],
        },
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'sourceId',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'targetId',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'time',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'active',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 1,
                  },
                },
              ],
              name: 'interactionTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'prodId',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'accountID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'quantity',
                  nullable: true,
                  type: {
                    _type: 'Float',
                  },
                },
                {
                  name: 'tradeDate',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
                {
                  name: 'settlementDateTime',
                  nullable: true,
                  type: {
                    _type: 'Timestamp',
                  },
                },
              ],
              name: 'tradeTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'name',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'createDate',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
              ],
              name: 'accountTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'EVENT_ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'trade_id',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'eventType',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 10,
                  },
                },
                {
                  name: 'eventDate',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
                {
                  name: 'person_id',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'tradeEventTable',
              primaryKey: ['EVENT_ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'prodId',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'accountID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'quantity',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'orderDate',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
                {
                  name: 'settlementDateTime',
                  nullable: true,
                  type: {
                    _type: 'Timestamp',
                  },
                },
              ],
              name: 'orderTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ORDER_ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'pnl',
                  nullable: true,
                  type: {
                    _type: 'Float',
                  },
                },
                {
                  name: 'from_z',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
                {
                  name: 'thru_z',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
              ],
              name: 'orderPnlTable',
              primaryKey: ['ORDER_ID'],
            },
            {
              columns: [
                {
                  name: 'PERSON_ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'ACCOUNT_ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'from_z',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
                {
                  name: 'thru_z',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
              ],
              name: 'salesPersonTable',
              primaryKey: ['PERSON_ID', 'ACCOUNT_ID'],
            },
            {
              columns: [
                {
                  name: 'PERSON_ID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'OTHER_NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'otherNamesTable',
              primaryKey: [],
            },
          ],
          views: [
            {
              name: 'interactionViewMaxTime',
              distinct: false,
              primaryKey: [],
              columnMappings: [
                {
                  name: 'sourceId',
                  operation: {
                    _type: 'column',
                    column: 'sourceId',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 'interactionTable',
                  },
                },
                {
                  name: 'targetId',
                  operation: {
                    _type: 'column',
                    column: 'targetId',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'interactionTable',
                    },
                    tableAlias: 'interactionTable',
                  },
                },
                {
                  name: 'maxTime',
                  operation: {
                    _type: 'dynaFunc',
                    funcName: 'max',
                    parameters: [
                      {
                        _type: 'column',
                        column: 'time',
                        table: {
                          _type: 'Table',
                          database: 'meta::relational::tests::db',
                          schema: 'default',
                          table: 'interactionTable',
                        },
                        tableAlias: 'interactionTable',
                      },
                    ],
                  },
                },
              ],
              groupBy: [
                {
                  _type: 'column',
                  column: 'sourceId',
                  table: {
                    _type: 'Table',
                    database: 'meta::relational::tests::db',
                    schema: 'default',
                    table: 'interactionTable',
                  },
                  tableAlias: 'interactionTable',
                },
                {
                  _type: 'column',
                  column: 'targetId',
                  table: {
                    _type: 'Table',
                    database: 'meta::relational::tests::db',
                    schema: 'default',
                    table: 'interactionTable',
                  },
                  tableAlias: 'interactionTable',
                },
              ],
            },
            {
              name: 'tradeEventViewMaxTradeEventDate',
              distinct: false,
              primaryKey: [],
              columnMappings: [
                {
                  name: 'trade_id',
                  operation: {
                    _type: 'column',
                    column: 'trade_id',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'tradeEventTable',
                    },
                    tableAlias: 'tradeEventTable',
                  },
                },
                {
                  name: 'maxTradeEventDate',
                  operation: {
                    _type: 'dynaFunc',
                    funcName: 'max',
                    parameters: [
                      {
                        _type: 'column',
                        column: 'eventDate',
                        table: {
                          _type: 'Table',
                          database: 'meta::relational::tests::db',
                          schema: 'default',
                          table: 'tradeEventTable',
                        },
                        tableAlias: 'tradeEventTable',
                      },
                    ],
                  },
                },
              ],
              groupBy: [
                {
                  _type: 'column',
                  column: 'trade_id',
                  table: {
                    _type: 'Table',
                    database: 'meta::relational::tests::db',
                    schema: 'default',
                    table: 'tradeEventTable',
                  },
                  tableAlias: 'tradeEventTable',
                },
              ],
            },
            {
              name: 'orderPnlView',
              distinct: true,
              primaryKey: ['ORDER_ID'],
              columnMappings: [
                {
                  name: 'ORDER_ID',
                  operation: {
                    _type: 'column',
                    column: 'ORDER_ID',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'orderPnlTable',
                    },
                    tableAlias: 'orderPnlTable',
                  },
                },
                {
                  name: 'pnl',
                  operation: {
                    _type: 'column',
                    column: 'pnl',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'orderPnlTable',
                    },
                    tableAlias: 'orderPnlTable',
                  },
                },
                {
                  name: 'accountId',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::db',
                        name: 'OrderPnlTable_Order',
                      },
                      {
                        db: 'meta::relational::tests::db',
                        name: 'Order_Account',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'ID',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::db',
                        schema: 'default',
                        table: 'accountTable',
                      },
                      tableAlias: 'accountTable',
                    },
                  },
                },
                {
                  name: 'supportContact',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::db',
                        name: 'OrderPnlTable_Order',
                      },
                      {
                        db: 'meta::relational::tests::db',
                        name: 'Order_SalesPerson',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'NAME',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::db',
                        schema: 'default',
                        table: 'salesPersonTable',
                      },
                      tableAlias: 'salesPersonTable',
                    },
                  },
                },
                {
                  name: 'supportContactId',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::db',
                        name: 'OrderPnlTable_Order',
                      },
                      {
                        db: 'meta::relational::tests::db',
                        name: 'Order_SalesPerson',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'PERSON_ID',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::db',
                        schema: 'default',
                        table: 'salesPersonTable',
                      },
                      tableAlias: 'salesPersonTable',
                    },
                  },
                },
              ],
            },
            {
              name: 'orderPnlViewOnView',
              distinct: false,
              primaryKey: ['ORDER_ID'],
              columnMappings: [
                {
                  name: 'ORDER_ID',
                  operation: {
                    _type: 'column',
                    column: 'ORDER_ID',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'orderPnlView',
                    },
                    tableAlias: 'orderPnlView',
                  },
                },
                {
                  name: 'pnl',
                  operation: {
                    _type: 'column',
                    column: 'pnl',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'orderPnlView',
                    },
                    tableAlias: 'orderPnlView',
                  },
                },
              ],
            },
            {
              name: 'orderNegativePnlView',
              distinct: true,
              primaryKey: ['ORDER_ID'],
              columnMappings: [
                {
                  name: 'ORDER_ID',
                  operation: {
                    _type: 'column',
                    column: 'ORDER_ID',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'orderPnlTable',
                    },
                    tableAlias: 'orderPnlTable',
                  },
                },
                {
                  name: 'pnl',
                  operation: {
                    _type: 'column',
                    column: 'pnl',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'orderPnlTable',
                    },
                    tableAlias: 'orderPnlTable',
                  },
                },
                {
                  name: 'accountId',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::db',
                        name: 'OrderPnlTable_Order',
                      },
                      {
                        db: 'meta::relational::tests::db',
                        name: 'Order_Account',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'ID',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::db',
                        schema: 'default',
                        table: 'accountTable',
                      },
                      tableAlias: 'accountTable',
                    },
                  },
                },
                {
                  name: 'supportContact',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::db',
                        name: 'OrderPnlTable_Order',
                      },
                      {
                        db: 'meta::relational::tests::db',
                        name: 'Order_SalesPerson',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'NAME',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::db',
                        schema: 'default',
                        table: 'salesPersonTable',
                      },
                      tableAlias: 'salesPersonTable',
                    },
                  },
                },
                {
                  name: 'supportContactId',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::db',
                        name: 'OrderPnlTable_Order',
                      },
                      {
                        db: 'meta::relational::tests::db',
                        name: 'Order_SalesPerson',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'PERSON_ID',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::db',
                        schema: 'default',
                        table: 'salesPersonTable',
                      },
                      tableAlias: 'salesPersonTable',
                    },
                  },
                },
              ],
            },
            {
              name: 'orderNegativePnlViewOnView',
              distinct: false,
              primaryKey: ['ORDER_ID'],
              columnMappings: [
                {
                  name: 'ORDER_ID',
                  operation: {
                    _type: 'column',
                    column: 'ORDER_ID',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'orderNegativePnlView',
                    },
                    tableAlias: 'orderNegativePnlView',
                  },
                },
                {
                  name: 'pnl',
                  operation: {
                    _type: 'column',
                    column: 'pnl',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'orderNegativePnlView',
                    },
                    tableAlias: 'orderNegativePnlView',
                  },
                },
              ],
            },
            {
              name: 'accountOrderPnlView',
              distinct: false,
              primaryKey: ['accountId'],
              columnMappings: [
                {
                  name: 'accountId',
                  operation: {
                    _type: 'column',
                    column: 'accountID',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::db',
                      schema: 'default',
                      table: 'orderTable',
                    },
                    tableAlias: 'orderTable',
                  },
                },
                {
                  name: 'orderPnl',
                  operation: {
                    _type: 'dynaFunc',
                    funcName: 'sum',
                    parameters: [
                      {
                        _type: 'elemtWithJoins',
                        joins: [
                          {
                            db: 'meta::relational::tests::db',
                            name: 'OrderPnlTable_Order',
                          },
                        ],
                        relationalElement: {
                          _type: 'column',
                          column: 'pnl',
                          table: {
                            _type: 'Table',
                            database: 'meta::relational::tests::db',
                            schema: 'default',
                            table: 'orderPnlTable',
                          },
                          tableAlias: 'orderPnlTable',
                        },
                      },
                    ],
                  },
                },
              ],
              groupBy: [
                {
                  _type: 'column',
                  column: 'accountID',
                  table: {
                    _type: 'Table',
                    database: 'meta::relational::tests::db',
                    schema: 'default',
                    table: 'orderTable',
                  },
                  tableAlias: 'orderTable',
                },
              ],
            },
          ],
        },
      ],
      includedStores: ['meta::relational::tests::dbInc'],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'meta::relational::tests::dbInc',
    content: {
      _type: 'relational',
      filters: [
        {
          _type: 'filter',
          name: 'FirmXFilter',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'LEGALNAME',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              {
                _type: 'literal',
                value: 'Firm X',
              },
            ],
          },
        },
      ],
      joins: [
        {
          name: 'personViewWithFirmTable',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              {
                _type: 'column',
                column: 'firmId',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'PersonViewWithDistinct',
                },
                tableAlias: 'PersonViewWithDistinct',
              },
            ],
          },
        },
        {
          name: 'PersonWithPersonView',
          operation: {
            _type: 'dynaFunc',
            funcName: 'and',
            parameters: [
              {
                _type: 'dynaFunc',
                funcName: 'equal',
                parameters: [
                  {
                    _type: 'column',
                    column: 'ID',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                  {
                    _type: 'column',
                    column: 'id',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personViewWithGroupBy',
                    },
                    tableAlias: 'personViewWithGroupBy',
                  },
                ],
              },
              {
                _type: 'dynaFunc',
                funcName: 'equal',
                parameters: [
                  {
                    _type: 'column',
                    column: 'AGE',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                  {
                    _type: 'column',
                    column: 'maxage',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personViewWithGroupBy',
                    },
                    tableAlias: 'personViewWithGroupBy',
                  },
                ],
              },
            ],
          },
        },
        {
          name: 'Address_Firm',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              {
                _type: 'column',
                column: 'ADDRESSID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
            ],
          },
        },
        {
          name: 'Address_Person',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              {
                _type: 'column',
                column: 'ADDRESSID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'Firm_Ceo',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'CEOID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'Firm_Person',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              {
                _type: 'column',
                column: 'FIRMID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
        {
          name: 'FirmExtension_PersonExtension',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'firmId',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'firmExtensionTable',
                },
                tableAlias: 'firmExtensionTable',
              },
              {
                _type: 'column',
                column: 'FIRMID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'PersonTableExtension',
                },
                tableAlias: 'PersonTableExtension',
              },
            ],
          },
        },
        {
          name: 'Person_Location',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              {
                _type: 'column',
                column: 'PERSONID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'locationTable',
                },
                tableAlias: 'locationTable',
              },
            ],
          },
        },
        {
          name: 'Person_Manager',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'MANAGERID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 't_personTable',
              },
            ],
          },
          target: 't_personTable',
        },
        {
          name: 'location_PlaceOfInterest',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'locationTable',
                },
                tableAlias: 'locationTable',
              },
              {
                _type: 'column',
                column: 'locationID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'placeOfInterestTable',
                },
                tableAlias: 'placeOfInterestTable',
              },
            ],
          },
        },
        {
          name: 'Person_OtherFirm',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'FIRMID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'meta::relational::tests::dbInc',
                  schema: 'default',
                  table: 'otherFirmTable',
                },
                tableAlias: 'otherFirmTable',
              },
            ],
          },
        },
      ],
      name: 'dbInc',
      package: 'meta::relational::tests',
      schemas: [
        {
          name: 'productSchema',
          tables: [
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'productTable',
              primaryKey: ['ID'],
            },
          ],
          views: [],
        },
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRSTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'LASTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'AGE',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRMID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'MANAGERID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'personTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRSTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'LASTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'AGE',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRMID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'MANAGERID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'birthDate',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
              ],
              name: 'PersonTableExtension',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRSTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'LASTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'AGE',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRMID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'MANAGERID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'differentPersonTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'LEGALNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'CEOID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'firmTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'firmId',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'legalName',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'establishedDate',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
              ],
              name: 'firmExtensionTable',
              primaryKey: ['firmId'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'LEGALNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'otherFirmTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'TYPE',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'STREET',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 100,
                  },
                },
                {
                  name: 'COMMENTS',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 100,
                  },
                },
              ],
              name: 'addressTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'PERSONID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'PLACE',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'date',
                  nullable: true,
                  type: {
                    _type: 'Date',
                  },
                },
              ],
              name: 'locationTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'locationID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'placeOfInterestTable',
              primaryKey: ['ID', 'locationID'],
            },
          ],
          views: [
            {
              name: 'PersonFirmView',
              distinct: false,
              primaryKey: ['PERSON_ID'],
              columnMappings: [
                {
                  name: 'PERSON_ID',
                  operation: {
                    _type: 'column',
                    column: 'ID',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                },
                {
                  name: 'lastName',
                  operation: {
                    _type: 'column',
                    column: 'LASTNAME',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                },
                {
                  name: 'firm_name',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::dbInc',
                        name: 'Firm_Person',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'LEGALNAME',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::dbInc',
                        schema: 'default',
                        table: 'firmTable',
                      },
                      tableAlias: 'firmTable',
                    },
                  },
                },
              ],
            },
            {
              name: 'personViewWithGroupBy',
              distinct: false,
              primaryKey: ['id'],
              columnMappings: [
                {
                  name: 'id',
                  operation: {
                    _type: 'column',
                    column: 'ID',
                    table: {
                      _type: 'Table',
                      database: 'meta::relational::tests::dbInc',
                      schema: 'default',
                      table: 'personTable',
                    },
                    tableAlias: 'personTable',
                  },
                },
                {
                  name: 'maxage',
                  operation: {
                    _type: 'dynaFunc',
                    funcName: 'max',
                    parameters: [
                      {
                        _type: 'column',
                        column: 'AGE',
                        table: {
                          _type: 'Table',
                          database: 'meta::relational::tests::dbInc',
                          schema: 'default',
                          table: 'personTable',
                        },
                        tableAlias: 'personTable',
                      },
                    ],
                  },
                },
              ],
              groupBy: [
                {
                  _type: 'column',
                  column: 'ID',
                  table: {
                    _type: 'Table',
                    database: 'meta::relational::tests::dbInc',
                    schema: 'default',
                    table: 'personTable',
                  },
                  tableAlias: 'personTable',
                },
              ],
            },
            {
              name: 'PersonViewWithDistinct',
              distinct: true,
              primaryKey: ['id'],
              columnMappings: [
                {
                  name: 'id',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::dbInc',
                        name: 'PersonWithPersonView',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'ID',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::dbInc',
                        schema: 'default',
                        table: 'personTable',
                      },
                      tableAlias: 'personTable',
                    },
                  },
                },
                {
                  name: 'firstName',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::dbInc',
                        name: 'PersonWithPersonView',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'FIRSTNAME',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::dbInc',
                        schema: 'default',
                        table: 'personTable',
                      },
                      tableAlias: 'personTable',
                    },
                  },
                },
                {
                  name: 'lastName',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::dbInc',
                        name: 'PersonWithPersonView',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'LASTNAME',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::dbInc',
                        schema: 'default',
                        table: 'personTable',
                      },
                      tableAlias: 'personTable',
                    },
                  },
                },
                {
                  name: 'firmId',
                  operation: {
                    _type: 'elemtWithJoins',
                    joins: [
                      {
                        db: 'meta::relational::tests::dbInc',
                        name: 'PersonWithPersonView',
                      },
                    ],
                    relationalElement: {
                      _type: 'column',
                      column: 'FIRMID',
                      table: {
                        _type: 'Table',
                        database: 'meta::relational::tests::dbInc',
                        schema: 'default',
                        table: 'personTable',
                      },
                      tableAlias: 'personTable',
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
      includedStores: [],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'meta::pure::functions::io::tests::http::testService',
    content: {
      _type: 'serviceStore',
      name: 'testService',
      package: 'meta::pure::functions::io::tests::http',
      docLink: 'testSeviceConnection',
    },
    classifierPath: 'meta::servicestore::metamodel::ServiceStore',
  },
  {
    path: 'meta::relational::tests::simpleRelationalMapping',
    content: {
      _type: 'mapping',
      includedMappings: [
        {
          includedMapping: 'simpleRelationalMappingInc',
        },
      ],
      classMappings: [
        {
          _type: 'relational',
          class: 'Product',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'productSchema',
            table: 'productTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Product',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'NAME',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'productSchema',
                  table: 'productTable',
                },
                tableAlias: 'productTable',
              },
              source: 'meta_pure_tests_model_simple_Product',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Product',
                property: 'synonyms',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'db',
                    name: 'Product_Synonym',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_Product',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'Synonym',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'productSchema',
            table: 'synonymTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Synonym',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'NAME',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'productSchema',
                  table: 'synonymTable',
                },
                tableAlias: 'synonymTable',
              },
              source: 'meta_pure_tests_model_simple_Synonym',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Synonym',
                property: 'typeAsString',
              },
              relationalOperation: {
                _type: 'column',
                column: 'TYPE',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'productSchema',
                  table: 'synonymTable',
                },
                tableAlias: 'synonymTable',
              },
              source: 'meta_pure_tests_model_simple_Synonym',
            },
            {
              _type: 'relationalPropertyMapping',
              enumMappingId: 'SynonymEnum',
              property: {
                class: 'meta::pure::tests::model::simple::Synonym',
                property: 'type',
              },
              relationalOperation: {
                _type: 'column',
                column: 'TYPE',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'productSchema',
                  table: 'synonymTable',
                },
                tableAlias: 'synonymTable',
              },
              source: 'meta_pure_tests_model_simple_Synonym',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Synonym',
                property: 'product',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'db',
                    name: 'Product_Synonym',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_Synonym',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'Trade',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'tradeTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Trade',
                property: 'id',
              },
              relationalOperation: {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'tradeTable',
                },
                tableAlias: 'tradeTable',
              },
              source: 'meta_pure_tests_model_simple_Trade',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Trade',
                property: 'quantity',
              },
              relationalOperation: {
                _type: 'column',
                column: 'quantity',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'tradeTable',
                },
                tableAlias: 'tradeTable',
              },
              source: 'meta_pure_tests_model_simple_Trade',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Trade',
                property: 'account',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'db',
                    name: 'Trade_Account',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_Trade',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Trade',
                property: 'product',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'db',
                    name: 'Trade_Product',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_Trade',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Trade',
                property: 'date',
              },
              relationalOperation: {
                _type: 'column',
                column: 'tradeDate',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'tradeTable',
                },
                tableAlias: 'tradeTable',
              },
              source: 'meta_pure_tests_model_simple_Trade',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Trade',
                property: 'settlementDateTime',
              },
              relationalOperation: {
                _type: 'column',
                column: 'settlementDateTime',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'tradeTable',
                },
                tableAlias: 'tradeTable',
              },
              source: 'meta_pure_tests_model_simple_Trade',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Trade',
                property: 'latestEventDate',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'db',
                    name: 'Trade_TradeEventViewMaxTradeEventDate',
                  },
                ],
                relationalElement: {
                  _type: 'column',
                  column: 'maxTradeEventDate',
                  table: {
                    _type: 'Table',
                    database: 'db',
                    schema: 'default',
                    table: 'tradeEventViewMaxTradeEventDate',
                  },
                  tableAlias: 'tradeEventViewMaxTradeEventDate',
                },
              },
              source: 'meta_pure_tests_model_simple_Trade',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Trade',
                property: 'events',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'db',
                    name: 'Trade_TradeEvent',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_Trade',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'Order',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'orderTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Order',
                property: 'id',
              },
              relationalOperation: {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
              source: 'meta_pure_tests_model_simple_Order',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Order',
                property: 'quantity',
              },
              relationalOperation: {
                _type: 'column',
                column: 'quantity',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
              source: 'meta_pure_tests_model_simple_Order',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Order',
                property: 'date',
              },
              relationalOperation: {
                _type: 'column',
                column: 'orderDate',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
              source: 'meta_pure_tests_model_simple_Order',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Order',
                property: 'settlementDateTime',
              },
              relationalOperation: {
                _type: 'column',
                column: 'settlementDateTime',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'orderTable',
                },
                tableAlias: 'orderTable',
              },
              source: 'meta_pure_tests_model_simple_Order',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Order',
                property: 'pnl',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'db',
                    name: 'OrderPnlView_Order',
                  },
                ],
                relationalElement: {
                  _type: 'column',
                  column: 'pnl',
                  table: {
                    _type: 'Table',
                    database: 'db',
                    schema: 'default',
                    table: 'orderPnlView',
                  },
                  tableAlias: 'orderPnlView',
                },
              },
              source: 'meta_pure_tests_model_simple_Order',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Order',
                property: 'pnlContact',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'db',
                    name: 'OrderPnlView_Order',
                  },
                  {
                    db: 'db',
                    name: 'OrderPnlView_Person',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_Order',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Order',
                property: 'zeroPnl',
              },
              relationalOperation: {
                _type: 'dynaFunc',
                funcName: 'case',
                parameters: [
                  {
                    _type: 'dynaFunc',
                    funcName: 'equal',
                    parameters: [
                      {
                        _type: 'elemtWithJoins',
                        joins: [
                          {
                            db: 'db',
                            name: 'OrderPnlView_Order',
                          },
                        ],
                        relationalElement: {
                          _type: 'column',
                          column: 'pnl',
                          table: {
                            _type: 'Table',
                            database: 'db',
                            schema: 'default',
                            table: 'orderPnlView',
                          },
                          tableAlias: 'orderPnlView',
                        },
                      },
                      {
                        _type: 'literal',
                        value: 0,
                      },
                    ],
                  },
                  {
                    _type: 'literal',
                    value: 'true',
                  },
                  {
                    _type: 'literal',
                    value: 'false',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_Order',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'OrderPnl',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'orderPnlView',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::OrderPnl',
                property: 'pnl',
              },
              relationalOperation: {
                _type: 'column',
                column: 'pnl',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'orderPnlView',
                },
                tableAlias: 'orderPnlView',
              },
              source: 'meta_pure_tests_model_simple_OrderPnl',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::OrderPnl',
                property: 'supportContactName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'supportContact',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'orderPnlView',
                },
                tableAlias: 'orderPnlView',
              },
              source: 'meta_pure_tests_model_simple_OrderPnl',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::OrderPnl',
                property: 'order',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'db',
                    name: 'OrderPnlView_Order',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_OrderPnl',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'AccountPnl',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'accountOrderPnlView',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::AccountPnl',
                property: 'pnl',
              },
              relationalOperation: {
                _type: 'column',
                column: 'orderPnl',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'accountOrderPnlView',
                },
                tableAlias: 'accountOrderPnlView',
              },
              source: 'meta_pure_tests_model_simple_AccountPnl',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::AccountPnl',
                property: 'account',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'db',
                    name: 'AccountPnlView_Account',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_AccountPnl',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'TradeEvent',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'tradeEventTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::TradeEvent',
                property: 'eventType',
              },
              relationalOperation: {
                _type: 'column',
                column: 'eventType',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'tradeEventTable',
                },
                tableAlias: 'tradeEventTable',
              },
              source: 'meta_pure_tests_model_simple_TradeEvent',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::TradeEvent',
                property: 'date',
              },
              relationalOperation: {
                _type: 'column',
                column: 'eventDate',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'tradeEventTable',
                },
                tableAlias: 'tradeEventTable',
              },
              source: 'meta_pure_tests_model_simple_TradeEvent',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::TradeEvent',
                property: 'initiator',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'db',
                    name: 'TradeEvent_Person',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_TradeEvent',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::TradeEvent',
                property: 'traderAddress',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'db',
                    name: 'TradeEvent_Person',
                  },
                  {
                    db: 'dbInc',
                    name: 'Address_Person',
                  },
                ],
                relationalElement: {
                  _type: 'dynaFunc',
                  funcName: 'concat',
                  parameters: [
                    {
                      _type: 'column',
                      column: 'NAME',
                      table: {
                        _type: 'Table',
                        database: 'db',
                        schema: 'default',
                        table: 'addressTable',
                      },
                      tableAlias: 'addressTable',
                    },
                    {
                      _type: 'column',
                      column: 'STREET',
                      table: {
                        _type: 'Table',
                        database: 'db',
                        schema: 'default',
                        table: 'addressTable',
                      },
                      tableAlias: 'addressTable',
                    },
                  ],
                },
              },
              source: 'meta_pure_tests_model_simple_TradeEvent',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'Account',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'accountTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Account',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'name',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'accountTable',
                },
                tableAlias: 'accountTable',
              },
              source: 'meta_pure_tests_model_simple_Account',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Account',
                property: 'createDate',
              },
              relationalOperation: {
                _type: 'column',
                column: 'createDate',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'accountTable',
                },
                tableAlias: 'accountTable',
              },
              source: 'meta_pure_tests_model_simple_Account',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Account',
                property: 'trades',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'db',
                    name: 'Trade_Account',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_Account',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Account',
                property: 'orders',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'db',
                    name: 'Order_Account',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_Account',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Account',
                property: 'accountPnl',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'db',
                    name: 'AccountPnlView_Account',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_Account',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'Interaction',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'interactionTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Interaction',
                property: 'id',
              },
              relationalOperation: {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'interactionTable',
                },
                tableAlias: 'interactionTable',
              },
              source: 'meta_pure_tests_model_simple_Interaction',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Interaction',
                property: 'time',
              },
              relationalOperation: {
                _type: 'column',
                column: 'time',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'interactionTable',
                },
                tableAlias: 'interactionTable',
              },
              source: 'meta_pure_tests_model_simple_Interaction',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Interaction',
                property: 'source',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'db',
                    name: 'Interaction_Source',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_Interaction',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Interaction',
                property: 'target',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'db',
                    name: 'Interaction_Target',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_Interaction',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Interaction',
                property: 'active',
              },
              relationalOperation: {
                _type: 'dynaFunc',
                funcName: 'case',
                parameters: [
                  {
                    _type: 'dynaFunc',
                    funcName: 'equal',
                    parameters: [
                      {
                        _type: 'column',
                        column: 'active',
                        table: {
                          _type: 'Table',
                          database: 'db',
                          schema: 'default',
                          table: 'interactionTable',
                        },
                        tableAlias: 'interactionTable',
                      },
                      {
                        _type: 'literal',
                        value: 'Y',
                      },
                    ],
                  },
                  {
                    _type: 'literal',
                    value: 'true',
                  },
                  {
                    _type: 'literal',
                    value: 'false',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_Interaction',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Interaction',
                property: 'longestInteractionBetweenSourceAndTarget',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'db',
                    name: 'InteractionTable_InteractionViewMaxTime',
                  },
                ],
                relationalElement: {
                  _type: 'column',
                  column: 'maxTime',
                  table: {
                    _type: 'Table',
                    database: 'db',
                    schema: 'default',
                    table: 'interactionViewMaxTime',
                  },
                  tableAlias: 'interactionViewMaxTime',
                },
              },
              source: 'meta_pure_tests_model_simple_Interaction',
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [
        {
          enumValueMappings: [
            {
              enumValue: 'CUSIP',
              sourceValues: [
                {
                  _type: 'stringSourceValue',
                  value: 'CUSIP',
                },
              ],
            },
            {
              enumValue: 'ISIN',
              sourceValues: [
                {
                  _type: 'stringSourceValue',
                  value: 'ISIN',
                },
              ],
            },
          ],
          enumeration: 'ProductSynonymType',
          id: 'SynonymEnum',
        },
      ],
      name: 'simpleRelationalMapping',
      package: 'meta::relational::tests',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'meta::relational::tests::simpleRelationalMappingInc',
    content: {
      _type: 'mapping',
      includedMappings: [],
      classMappings: [
        {
          _type: 'relational',
          class: 'Person',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'dbInc',
            schema: 'default',
            table: 'personTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Person',
                property: 'firstName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'FIRSTNAME',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              source: 'meta_pure_tests_model_simple_Person',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Person',
                property: 'age',
              },
              relationalOperation: {
                _type: 'column',
                column: 'AGE',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              source: 'meta_pure_tests_model_simple_Person',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Person',
                property: 'lastName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'LASTNAME',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              source: 'meta_pure_tests_model_simple_Person',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Person',
                property: 'firm',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'dbInc',
                    name: 'Firm_Person',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_Person',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::EntityWithAddress',
                property: 'address',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'dbInc',
                    name: 'Address_Person',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_Person',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::EntityWithLocations',
                property: 'locations',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'dbInc',
                    name: 'Person_Location',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_Person',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Person',
                property: 'manager',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'dbInc',
                    name: 'Person_Manager',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_Person',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'Firm',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'dbInc',
            schema: 'default',
            table: 'firmTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Firm',
                property: 'legalName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'LEGALNAME',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              source: 'meta_pure_tests_model_simple_Firm',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Firm',
                property: 'employees',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'dbInc',
                    name: 'Firm_Person',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_Firm',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::EntityWithAddress',
                property: 'address',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'dbInc',
                    name: 'Address_Firm',
                  },
                ],
              },
              source: 'meta_pure_tests_model_simple_Firm',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'FirmExtension',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'dbInc',
            schema: 'default',
            table: 'firmExtensionTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Firm',
                property: 'legalName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'legalName',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'firmExtensionTable',
                },
                tableAlias: 'firmExtensionTable',
              },
              source: 'meta_pure_tests_model_simple_FirmExtension',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::FirmExtension',
                property: 'establishedDate',
              },
              relationalOperation: {
                _type: 'column',
                column: 'establishedDate',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'firmExtensionTable',
                },
                tableAlias: 'firmExtensionTable',
              },
              source: 'meta_pure_tests_model_simple_FirmExtension',
            },
            {
              _type: 'embeddedPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::FirmExtension',
                property: 'employeesExt',
              },
              source: 'meta_pure_tests_model_simple_FirmExtension',
              classMapping: {
                _type: 'embedded',
                class: 'meta::pure::tests::model::simple::PersonExtension',
                id: '[object Object]_employeesExt.employeesExt',
                primaryKey: [],
                propertyMappings: [
                  {
                    _type: 'relationalPropertyMapping',
                    property: {
                      class:
                        'meta::pure::tests::model::simple::PersonExtension',
                      property: 'birthdate',
                    },
                    relationalOperation: {
                      _type: 'elemtWithJoins',
                      joins: [
                        {
                          db: 'dbInc',
                          name: 'FirmExtension_PersonExtension',
                        },
                      ],
                      relationalElement: {
                        _type: 'column',
                        column: 'birthDate',
                        table: {
                          _type: 'Table',
                          database: 'dbInc',
                          schema: 'default',
                          table: 'PersonTableExtension',
                        },
                        tableAlias: 'PersonTableExtension',
                      },
                    },
                    source: 'meta_pure_tests_model_simple_FirmExtension',
                  },
                ],
                root: false,
              },
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'Address',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'dbInc',
            schema: 'default',
            table: 'addressTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Address',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'NAME',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              source: 'meta_pure_tests_model_simple_Address',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Address',
                property: 'street',
              },
              relationalOperation: {
                _type: 'column',
                column: 'STREET',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              source: 'meta_pure_tests_model_simple_Address',
            },
            {
              _type: 'relationalPropertyMapping',
              enumMappingId: 'GE',
              property: {
                class: 'meta::pure::tests::model::simple::GeographicEntity',
                property: 'type',
              },
              relationalOperation: {
                _type: 'column',
                column: 'TYPE',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              source: 'meta_pure_tests_model_simple_Address',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Address',
                property: 'comments',
              },
              relationalOperation: {
                _type: 'column',
                column: 'COMMENTS',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'addressTable',
                },
                tableAlias: 'addressTable',
              },
              source: 'meta_pure_tests_model_simple_Address',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'Location',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'dbInc',
            schema: 'default',
            table: 'locationTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Location',
                property: 'place',
              },
              relationalOperation: {
                _type: 'column',
                column: 'PLACE',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'locationTable',
                },
                tableAlias: 'locationTable',
              },
              source: 'meta_pure_tests_model_simple_Location',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Location',
                property: 'censusdate',
              },
              relationalOperation: {
                _type: 'column',
                column: 'date',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'locationTable',
                },
                tableAlias: 'locationTable',
              },
              source: 'meta_pure_tests_model_simple_Location',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'PlaceOfInterest',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'dbInc',
            schema: 'default',
            table: 'placeOfInterestTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::PlaceOfInterest',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'NAME',
                table: {
                  _type: 'Table',
                  database: 'dbInc',
                  schema: 'default',
                  table: 'placeOfInterestTable',
                },
                tableAlias: 'placeOfInterestTable',
              },
              source: 'meta_pure_tests_model_simple_PlaceOfInterest',
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [
        {
          enumValueMappings: [
            {
              enumValue: 'CITY',
              sourceValues: [
                {
                  _type: 'integerSourceValue',
                  value: 1,
                },
              ],
            },
          ],
          enumeration: 'GeographicEntityType',
          id: 'GE',
        },
      ],
      name: 'simpleRelationalMappingInc',
      package: 'meta::relational::tests',
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
          elements: [],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [
            'meta::pure::tests::model::simple',
            'meta::relational::tests',
          ],
          elements: ['meta::relational::tests::simpleRelationalMapping'],
          parserName: 'Mapping',
        },
        {
          _type: 'importAware',
          imports: [
            'meta::pure::tests::model::simple',
            'meta::relational::tests',
          ],
          elements: ['meta::relational::tests::simpleRelationalMappingInc'],
          parserName: 'Mapping',
        },
        {
          _type: 'default',
          elements: ['meta::relational::tests::db'],
          parserName: 'Relational',
        },
        {
          _type: 'default',
          elements: ['meta::relational::tests::dbInc'],
          parserName: 'Relational',
        },
        {
          _type: 'default',
          elements: ['meta::pure::functions::io::tests::http::testService'],
          parserName: 'ServiceStore',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Person'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Firm'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::FirmExtension'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Address'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Location'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::PlaceOfInterest'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::PersonExtension'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Product'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Synonym'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Trade'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Order'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::OrderPnl'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::AccountPnl'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::TradeEvent'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Account'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Interaction'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::EntityWithAddress'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::EntityWithLocations'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::GeographicEntity'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['meta::relational::tests::mapping::union::extend::Person'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['meta::relational::tests::mapping::union::extend::Firm'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: [
            'meta::relational::tests::mapping::union::extend::Address',
          ],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [
            'meta::relational::tests::mapping::subType',
            'meta::relational::tests',
            'meta::pure::tests::model::simple',
          ],
          elements: ['meta::relational::tests::mapping::subType::MyProduct'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Organization'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Bridge'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::PersonNameParameter'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::ProductClassification'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::Person'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Division'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Department'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Team'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::FemalePerson'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::FemaleExecutive'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::MalePerson'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::MaleExecutive'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [
            'meta::relational::tests::mapping::subType',
            'meta::relational::tests',
            'meta::pure::tests::model::simple',
          ],
          elements: ['meta::relational::tests::mapping::subType::CreditRating'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: [
            'meta::pure::tests::model::simple::PersonNameParameterNested',
          ],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::Business'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::Executive'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::Professional'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::Organization'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::EntityWithLocation'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::GeoLocation'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::ProductSynonymType'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::GeographicEntityType'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::GenderType'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::OrgLevelType'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Employment'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::FirmCEO'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Membership'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::BridgeAsso1'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::FirmOrganizations'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::BridgeAsso2'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::AddressLocation'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::PlacesOfInterest'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::ProdSynonym'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Trade_Accounts'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Trade_Orders'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Account_AccountPnl'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::Person_Accounts'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [
            'meta::relational::tests::mapping::subType',
            'meta::relational::tests',
            'meta::pure::tests::model::simple',
          ],
          elements: [
            'meta::relational::tests::mapping::subType::ProductRating',
          ],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::SubOrganization'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::Business_Employees'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::Parent_Children'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::owl::tests::model'],
          elements: ['meta::owl::tests::model::OrgStructures'],
          parserName: 'Pure',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];

export const targetSetImplementationThroughAssociation = [
  {
    path: 'apps::pure::studio::model::simple::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'apps::pure::studio::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legalName',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'nickName',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::pure::studio::model::simple::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'apps::pure::studio::model::simple',
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
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'otherNames',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'nickName',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'activeEmployment',
          type: 'Boolean',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'apps::pure::studio::model::simple::Employment',
    content: {
      _type: 'association',
      name: 'Employment',
      package: 'apps::pure::studio::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'firm',
          type: 'apps::pure::studio::model::simple::Firm',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employees',
          type: 'apps::pure::studio::model::simple::Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'apps::pure::studio::model::simple::dbInc',
    content: {
      _type: 'relational',
      filters: [],
      joins: [
        {
          name: 'Firm_Person',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database: 'apps::pure::studio::model::simple::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              {
                _type: 'column',
                column: 'FIRMID',
                table: {
                  _type: 'Table',
                  database: 'apps::pure::studio::model::simple::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
            ],
          },
        },
      ],
      name: 'dbInc',
      package: 'apps::pure::studio::model::simple',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRSTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'LASTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'AGE',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRMID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'MANAGERID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'personTable',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'LEGALNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'ADDRESSID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'CEOID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'firmTable',
              primaryKey: ['ID'],
            },
          ],
          views: [],
        },
      ],
      includedStores: [],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'apps::pure::studio::model::simple::simpleRelationalMapping',
    content: {
      _type: 'mapping',
      includedMappings: [],
      classMappings: [
        {
          _type: 'relational',
          class: 'apps::pure::studio::model::simple::Person',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'apps::pure::studio::model::simple::dbInc',
            schema: 'default',
            table: 'personTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::pure::studio::model::simple::Person',
                property: 'firstName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'FIRSTNAME',
                table: {
                  _type: 'Table',
                  database: 'apps::pure::studio::model::simple::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              source: 'apps_pure_studio_model_simple_Person',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::pure::studio::model::simple::Person',
                property: 'lastName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'LASTNAME',
                table: {
                  _type: 'Table',
                  database: 'apps::pure::studio::model::simple::dbInc',
                  schema: 'default',
                  table: 'personTable',
                },
                tableAlias: 'personTable',
              },
              source: 'apps_pure_studio_model_simple_Person',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::pure::studio::model::simple::Person',
                property: 'firm',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'apps::pure::studio::model::simple::dbInc',
                    name: 'Firm_Person',
                  },
                ],
              },
              source: 'apps_pure_studio_model_simple_Person',
              target: 'apps_pure_studio_model_simple_Firm',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'apps::pure::studio::model::simple::Firm',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'apps::pure::studio::model::simple::dbInc',
            schema: 'default',
            table: 'firmTable',
          },
          primaryKey: [],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::pure::studio::model::simple::Firm',
                property: 'legalName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'LEGALNAME',
                table: {
                  _type: 'Table',
                  database: 'apps::pure::studio::model::simple::dbInc',
                  schema: 'default',
                  table: 'firmTable',
                },
                tableAlias: 'firmTable',
              },
              source: 'apps_pure_studio_model_simple_Firm',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'apps::pure::studio::model::simple::Firm',
                property: 'employees',
              },
              relationalOperation: {
                _type: 'elemtWithJoins',
                joins: [
                  {
                    db: 'apps::pure::studio::model::simple::dbInc',
                    name: 'Firm_Person',
                  },
                ],
              },
              source: 'apps_pure_studio_model_simple_Firm',
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [],
      name: 'simpleRelationalMapping',
      package: 'apps::pure::studio::model::simple',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'apps::Name_toDefine',
    content: {
      _type: 'service',
      autoActivateUpdates: true,
      documentation: 'service for studio test',
      execution: {
        _type: 'pureSingleExecution',
        func: {
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
                      _type: 'class',
                      fullPath: 'apps::pure::studio::model::simple::Person',
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
                              function: 'toOne',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'p',
                                    },
                                  ],
                                  property: 'firm',
                                },
                              ],
                            },
                          ],
                          property: 'legalName',
                        },
                        {
                          _type: 'string',
                          multiplicity: {
                            lowerBound: 1,
                            upperBound: 1,
                          },
                          values: ['Firm X'],
                        },
                      ],
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'p',
                    },
                  ],
                },
              ],
            },
          ],
          parameters: [],
        },
        mapping: 'apps::pure::studio::model::simple::simpleRelationalMapping',
        runtime: {
          _type: 'engineRuntime',
          connections: [
            {
              store: {
                path: 'apps::pure::studio::model::simple::dbInc',
                type: 'STORE',
              },
              storeConnections: [
                {
                  connection: {
                    _type: 'connectionPointer',
                    connection: 'simple::H2Connection',
                  },
                  id: 'id1',
                },
              ],
            },
          ],
          mappings: [
            {
              path: 'apps::pure::studio::model::simple::simpleRelationalMapping',
              type: 'MAPPING',
            },
          ],
        },
      },
      name: 'Name_toDefine',
      owners: ['uyagum'],
      package: 'apps',
      pattern: '/test/StudioTest5',
      test: {
        _type: 'singleExecutionTest',
        asserts: [
          {
            assert: {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: 'equal',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'size',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'res',
                            },
                          ],
                          property: 'values',
                        },
                      ],
                    },
                    {
                      _type: 'integer',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: [1],
                    },
                  ],
                },
              ],
              parameters: [
                {
                  _type: 'var',
                  class: 'meta::pure::mapping::Result',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  name: 'res',
                },
              ],
            },
          },
          {
            assert: {
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
                          _type: 'func',
                          function: 'size',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'res',
                                },
                              ],
                              property: 'values',
                            },
                          ],
                        },
                        {
                          _type: 'integer',
                          multiplicity: {
                            lowerBound: 1,
                            upperBound: 1,
                          },
                          values: [2],
                        },
                      ],
                    },
                  ],
                },
              ],
              parameters: [
                {
                  _type: 'var',
                  class: 'meta::pure::mapping::Result',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  name: 'res',
                },
              ],
            },
          },
        ],
        data: 'default\npersonTable\nFIRSTNAME,ID\nfirstName1,1\nfirstName2,2\nfirstName3,3\nfirstName4,4\nfirstName5,5\nfirstName6,6\nfirstName7,7\n-----\n',
      },
    },
    classifierPath: 'meta::legend::service::metamodel::Service',
  },
  {
    path: 'simple::H2Connection',
    content: {
      _type: 'connection',
      connectionValue: {
        _type: 'RelationalDatabaseConnection',
        authenticationStrategy: {
          _type: 'h2Default',
        },
        datasourceSpecification: {
          _type: 'static',
          databaseName: 'myDb',
          host: 'somehost',
          port: 999,
        },
        element: 'apps::pure::studio::model::simple::dbInc',
        type: 'H2',
      },
      name: 'H2Connection',
      package: 'simple',
    },
    classifierPath: 'meta::pure::runtime::PackageableConnection',
  },
];

export const embeddedRelational = [
  {
    path: 'meta::pure::tests::model::simple::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'meta::pure::tests::model::simple',
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
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'otherNames',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'extraInformation',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'manager',
          type: 'Person',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'age',
          type: 'Integer',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'nickName',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'activeEmployment',
          type: 'Boolean',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'plus',
              parameters: [
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 3,
                    upperBound: 3,
                  },
                  sourceInformation: {
                    endColumn: 45,
                    endLine: 126,
                    sourceId: '',
                    startColumn: 27,
                    startLine: 126,
                  },
                  values: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 16,
                            endLine: 126,
                            sourceId: '',
                            startColumn: 12,
                            startLine: 126,
                          },
                        },
                      ],
                      property: 'firstName',
                      sourceInformation: {
                        endColumn: 26,
                        endLine: 126,
                        sourceId: '',
                        startColumn: 18,
                        startLine: 126,
                      },
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 30,
                        endLine: 126,
                        sourceId: '',
                        startColumn: 28,
                        startLine: 126,
                      },
                      values: [' '],
                    },
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 36,
                            endLine: 126,
                            sourceId: '',
                            startColumn: 32,
                            startLine: 126,
                          },
                        },
                      ],
                      property: 'lastName',
                      sourceInformation: {
                        endColumn: 45,
                        endLine: 126,
                        sourceId: '',
                        startColumn: 38,
                        startLine: 126,
                      },
                    },
                  ],
                },
              ],
              sourceInformation: {
                endColumn: 45,
                endLine: 126,
                sourceId: '',
                startColumn: 27,
                startLine: 126,
              },
            },
          ],
          name: 'name',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
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
                  sourceInformation: {
                    endColumn: 80,
                    endLine: 127,
                    sourceId: '',
                    startColumn: 42,
                    startLine: 127,
                  },
                  values: [
                    {
                      _type: 'var',
                      name: 'title',
                      sourceInformation: {
                        endColumn: 41,
                        endLine: 127,
                        sourceId: '',
                        startColumn: 36,
                        startLine: 127,
                      },
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 45,
                        endLine: 127,
                        sourceId: '',
                        startColumn: 43,
                        startLine: 127,
                      },
                      values: [' '],
                    },
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 51,
                            endLine: 127,
                            sourceId: '',
                            startColumn: 47,
                            startLine: 127,
                          },
                        },
                      ],
                      property: 'firstName',
                      sourceInformation: {
                        endColumn: 61,
                        endLine: 127,
                        sourceId: '',
                        startColumn: 53,
                        startLine: 127,
                      },
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 65,
                        endLine: 127,
                        sourceId: '',
                        startColumn: 63,
                        startLine: 127,
                      },
                      values: [' '],
                    },
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 71,
                            endLine: 127,
                            sourceId: '',
                            startColumn: 67,
                            startLine: 127,
                          },
                        },
                      ],
                      property: 'lastName',
                      sourceInformation: {
                        endColumn: 80,
                        endLine: 127,
                        sourceId: '',
                        startColumn: 73,
                        startLine: 127,
                      },
                    },
                  ],
                },
              ],
              sourceInformation: {
                endColumn: 80,
                endLine: 127,
                sourceId: '',
                startColumn: 42,
                startLine: 127,
              },
            },
          ],
          name: 'nameWithTitle',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'title',
              sourceInformation: {
                endColumn: 33,
                endLine: 127,
                sourceId: '',
                startColumn: 19,
                startLine: 127,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
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
                      _type: 'var',
                      name: 'prefix',
                      sourceInformation: {
                        endColumn: 18,
                        endLine: 130,
                        sourceId: '',
                        startColumn: 12,
                        startLine: 130,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 27,
                    endLine: 130,
                    sourceId: '',
                    startColumn: 21,
                    startLine: 130,
                  },
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
                          function: 'isEmpty',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'suffixes',
                              sourceInformation: {
                                endColumn: 25,
                                endLine: 131,
                                sourceId: '',
                                startColumn: 17,
                                startLine: 131,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 34,
                            endLine: 131,
                            sourceId: '',
                            startColumn: 28,
                            startLine: 131,
                          },
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'plus',
                              parameters: [
                                {
                                  _type: 'collection',
                                  multiplicity: {
                                    lowerBound: 3,
                                    upperBound: 3,
                                  },
                                  sourceInformation: {
                                    endColumn: 56,
                                    endLine: 132,
                                    sourceId: '',
                                    startColumn: 35,
                                    startLine: 132,
                                  },
                                  values: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 23,
                                            endLine: 132,
                                            sourceId: '',
                                            startColumn: 19,
                                            startLine: 132,
                                          },
                                        },
                                      ],
                                      property: 'firstName',
                                      sourceInformation: {
                                        endColumn: 33,
                                        endLine: 132,
                                        sourceId: '',
                                        startColumn: 25,
                                        startLine: 132,
                                      },
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      sourceInformation: {
                                        endColumn: 39,
                                        endLine: 132,
                                        sourceId: '',
                                        startColumn: 37,
                                        startLine: 132,
                                      },
                                      values: [' '],
                                    },
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 47,
                                            endLine: 132,
                                            sourceId: '',
                                            startColumn: 43,
                                            startLine: 132,
                                          },
                                        },
                                      ],
                                      property: 'lastName',
                                      sourceInformation: {
                                        endColumn: 56,
                                        endLine: 132,
                                        sourceId: '',
                                        startColumn: 49,
                                        startLine: 132,
                                      },
                                    },
                                  ],
                                },
                              ],
                              sourceInformation: {
                                endColumn: 56,
                                endLine: 132,
                                sourceId: '',
                                startColumn: 35,
                                startLine: 132,
                              },
                            },
                          ],
                          parameters: [],
                          sourceInformation: {
                            endColumn: 56,
                            endLine: 132,
                            sourceId: '',
                            startColumn: 17,
                            startLine: 132,
                          },
                        },
                        {
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
                                  sourceInformation: {
                                    endColumn: 94,
                                    endLine: 133,
                                    sourceId: '',
                                    startColumn: 35,
                                    startLine: 133,
                                  },
                                  values: [
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 23,
                                            endLine: 133,
                                            sourceId: '',
                                            startColumn: 19,
                                            startLine: 133,
                                          },
                                        },
                                      ],
                                      property: 'firstName',
                                      sourceInformation: {
                                        endColumn: 33,
                                        endLine: 133,
                                        sourceId: '',
                                        startColumn: 25,
                                        startLine: 133,
                                      },
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      sourceInformation: {
                                        endColumn: 39,
                                        endLine: 133,
                                        sourceId: '',
                                        startColumn: 37,
                                        startLine: 133,
                                      },
                                      values: [' '],
                                    },
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 47,
                                            endLine: 133,
                                            sourceId: '',
                                            startColumn: 43,
                                            startLine: 133,
                                          },
                                        },
                                      ],
                                      property: 'lastName',
                                      sourceInformation: {
                                        endColumn: 56,
                                        endLine: 133,
                                        sourceId: '',
                                        startColumn: 49,
                                        startLine: 133,
                                      },
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      sourceInformation: {
                                        endColumn: 63,
                                        endLine: 133,
                                        sourceId: '',
                                        startColumn: 60,
                                        startLine: 133,
                                      },
                                      values: [', '],
                                    },
                                    {
                                      _type: 'func',
                                      function: 'joinStrings',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'suffixes',
                                          sourceInformation: {
                                            endColumn: 75,
                                            endLine: 133,
                                            sourceId: '',
                                            startColumn: 67,
                                            startLine: 133,
                                          },
                                        },
                                        {
                                          _type: 'string',
                                          multiplicity: {
                                            lowerBound: 1,
                                            upperBound: 1,
                                          },
                                          sourceInformation: {
                                            endColumn: 93,
                                            endLine: 133,
                                            sourceId: '',
                                            startColumn: 90,
                                            startLine: 133,
                                          },
                                          values: [', '],
                                        },
                                      ],
                                      sourceInformation: {
                                        endColumn: 88,
                                        endLine: 133,
                                        sourceId: '',
                                        startColumn: 78,
                                        startLine: 133,
                                      },
                                    },
                                  ],
                                },
                              ],
                              sourceInformation: {
                                endColumn: 94,
                                endLine: 133,
                                sourceId: '',
                                startColumn: 35,
                                startLine: 133,
                              },
                            },
                          ],
                          parameters: [],
                          sourceInformation: {
                            endColumn: 94,
                            endLine: 133,
                            sourceId: '',
                            startColumn: 17,
                            startLine: 133,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 15,
                        endLine: 131,
                        sourceId: '',
                        startColumn: 14,
                        startLine: 131,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 95,
                    endLine: 133,
                    sourceId: '',
                    startColumn: 12,
                    startLine: 131,
                  },
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
                          function: 'isEmpty',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'suffixes',
                              sourceInformation: {
                                endColumn: 25,
                                endLine: 134,
                                sourceId: '',
                                startColumn: 17,
                                startLine: 134,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 34,
                            endLine: 134,
                            sourceId: '',
                            startColumn: 28,
                            startLine: 134,
                          },
                        },
                        {
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
                                  sourceInformation: {
                                    endColumn: 81,
                                    endLine: 135,
                                    sourceId: '',
                                    startColumn: 36,
                                    startLine: 135,
                                  },
                                  values: [
                                    {
                                      _type: 'func',
                                      function: 'toOne',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'prefix',
                                          sourceInformation: {
                                            endColumn: 25,
                                            endLine: 135,
                                            sourceId: '',
                                            startColumn: 19,
                                            startLine: 135,
                                          },
                                        },
                                      ],
                                      sourceInformation: {
                                        endColumn: 32,
                                        endLine: 135,
                                        sourceId: '',
                                        startColumn: 28,
                                        startLine: 135,
                                      },
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      sourceInformation: {
                                        endColumn: 40,
                                        endLine: 135,
                                        sourceId: '',
                                        startColumn: 38,
                                        startLine: 135,
                                      },
                                      values: [' '],
                                    },
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 48,
                                            endLine: 135,
                                            sourceId: '',
                                            startColumn: 44,
                                            startLine: 135,
                                          },
                                        },
                                      ],
                                      property: 'firstName',
                                      sourceInformation: {
                                        endColumn: 58,
                                        endLine: 135,
                                        sourceId: '',
                                        startColumn: 50,
                                        startLine: 135,
                                      },
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      sourceInformation: {
                                        endColumn: 64,
                                        endLine: 135,
                                        sourceId: '',
                                        startColumn: 62,
                                        startLine: 135,
                                      },
                                      values: [' '],
                                    },
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 72,
                                            endLine: 135,
                                            sourceId: '',
                                            startColumn: 68,
                                            startLine: 135,
                                          },
                                        },
                                      ],
                                      property: 'lastName',
                                      sourceInformation: {
                                        endColumn: 81,
                                        endLine: 135,
                                        sourceId: '',
                                        startColumn: 74,
                                        startLine: 135,
                                      },
                                    },
                                  ],
                                },
                              ],
                              sourceInformation: {
                                endColumn: 81,
                                endLine: 135,
                                sourceId: '',
                                startColumn: 36,
                                startLine: 135,
                              },
                            },
                          ],
                          parameters: [],
                          sourceInformation: {
                            endColumn: 81,
                            endLine: 135,
                            sourceId: '',
                            startColumn: 17,
                            startLine: 135,
                          },
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'plus',
                              parameters: [
                                {
                                  _type: 'collection',
                                  multiplicity: {
                                    lowerBound: 7,
                                    upperBound: 7,
                                  },
                                  sourceInformation: {
                                    endColumn: 119,
                                    endLine: 136,
                                    sourceId: '',
                                    startColumn: 36,
                                    startLine: 136,
                                  },
                                  values: [
                                    {
                                      _type: 'func',
                                      function: 'toOne',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'prefix',
                                          sourceInformation: {
                                            endColumn: 25,
                                            endLine: 136,
                                            sourceId: '',
                                            startColumn: 19,
                                            startLine: 136,
                                          },
                                        },
                                      ],
                                      sourceInformation: {
                                        endColumn: 32,
                                        endLine: 136,
                                        sourceId: '',
                                        startColumn: 28,
                                        startLine: 136,
                                      },
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      sourceInformation: {
                                        endColumn: 40,
                                        endLine: 136,
                                        sourceId: '',
                                        startColumn: 38,
                                        startLine: 136,
                                      },
                                      values: [' '],
                                    },
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 48,
                                            endLine: 136,
                                            sourceId: '',
                                            startColumn: 44,
                                            startLine: 136,
                                          },
                                        },
                                      ],
                                      property: 'firstName',
                                      sourceInformation: {
                                        endColumn: 58,
                                        endLine: 136,
                                        sourceId: '',
                                        startColumn: 50,
                                        startLine: 136,
                                      },
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      sourceInformation: {
                                        endColumn: 64,
                                        endLine: 136,
                                        sourceId: '',
                                        startColumn: 62,
                                        startLine: 136,
                                      },
                                      values: [' '],
                                    },
                                    {
                                      _type: 'property',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 72,
                                            endLine: 136,
                                            sourceId: '',
                                            startColumn: 68,
                                            startLine: 136,
                                          },
                                        },
                                      ],
                                      property: 'lastName',
                                      sourceInformation: {
                                        endColumn: 81,
                                        endLine: 136,
                                        sourceId: '',
                                        startColumn: 74,
                                        startLine: 136,
                                      },
                                    },
                                    {
                                      _type: 'string',
                                      multiplicity: {
                                        lowerBound: 1,
                                        upperBound: 1,
                                      },
                                      sourceInformation: {
                                        endColumn: 88,
                                        endLine: 136,
                                        sourceId: '',
                                        startColumn: 85,
                                        startLine: 136,
                                      },
                                      values: [', '],
                                    },
                                    {
                                      _type: 'func',
                                      function: 'joinStrings',
                                      parameters: [
                                        {
                                          _type: 'var',
                                          name: 'suffixes',
                                          sourceInformation: {
                                            endColumn: 100,
                                            endLine: 136,
                                            sourceId: '',
                                            startColumn: 92,
                                            startLine: 136,
                                          },
                                        },
                                        {
                                          _type: 'string',
                                          multiplicity: {
                                            lowerBound: 1,
                                            upperBound: 1,
                                          },
                                          sourceInformation: {
                                            endColumn: 118,
                                            endLine: 136,
                                            sourceId: '',
                                            startColumn: 115,
                                            startLine: 136,
                                          },
                                          values: [', '],
                                        },
                                      ],
                                      sourceInformation: {
                                        endColumn: 113,
                                        endLine: 136,
                                        sourceId: '',
                                        startColumn: 103,
                                        startLine: 136,
                                      },
                                    },
                                  ],
                                },
                              ],
                              sourceInformation: {
                                endColumn: 119,
                                endLine: 136,
                                sourceId: '',
                                startColumn: 36,
                                startLine: 136,
                              },
                            },
                          ],
                          parameters: [],
                          sourceInformation: {
                            endColumn: 119,
                            endLine: 136,
                            sourceId: '',
                            startColumn: 17,
                            startLine: 136,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 15,
                        endLine: 134,
                        sourceId: '',
                        startColumn: 14,
                        startLine: 134,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 120,
                    endLine: 136,
                    sourceId: '',
                    startColumn: 12,
                    startLine: 134,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 10,
                endLine: 130,
                sourceId: '',
                startColumn: 9,
                startLine: 130,
              },
            },
          ],
          name: 'nameWithPrefixAndSuffix',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 0,
                upperBound: 1,
              },
              name: 'prefix',
              sourceInformation: {
                endColumn: 47,
                endLine: 128,
                sourceId: '',
                startColumn: 29,
                startLine: 128,
              },
            },
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 0,
              },
              name: 'suffixes',
              sourceInformation: {
                endColumn: 67,
                endLine: 128,
                sourceId: '',
                startColumn: 50,
                startLine: 128,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'var',
                  name: 'lastNameFirst',
                  sourceInformation: {
                    endColumn: 25,
                    endLine: 141,
                    sourceId: '',
                    startColumn: 12,
                    startLine: 141,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'plus',
                      parameters: [
                        {
                          _type: 'collection',
                          multiplicity: {
                            lowerBound: 3,
                            upperBound: 3,
                          },
                          sourceInformation: {
                            endColumn: 68,
                            endLine: 141,
                            sourceId: '',
                            startColumn: 45,
                            startLine: 141,
                          },
                          values: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 34,
                                    endLine: 141,
                                    sourceId: '',
                                    startColumn: 30,
                                    startLine: 141,
                                  },
                                },
                              ],
                              property: 'lastName',
                              sourceInformation: {
                                endColumn: 43,
                                endLine: 141,
                                sourceId: '',
                                startColumn: 36,
                                startLine: 141,
                              },
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              sourceInformation: {
                                endColumn: 50,
                                endLine: 141,
                                sourceId: '',
                                startColumn: 47,
                                startLine: 141,
                              },
                              values: [', '],
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 58,
                                    endLine: 141,
                                    sourceId: '',
                                    startColumn: 54,
                                    startLine: 141,
                                  },
                                },
                              ],
                              property: 'firstName',
                              sourceInformation: {
                                endColumn: 68,
                                endLine: 141,
                                sourceId: '',
                                startColumn: 60,
                                startLine: 141,
                              },
                            },
                          ],
                        },
                      ],
                      sourceInformation: {
                        endColumn: 68,
                        endLine: 141,
                        sourceId: '',
                        startColumn: 45,
                        startLine: 141,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 68,
                    endLine: 141,
                    sourceId: '',
                    startColumn: 28,
                    startLine: 141,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'plus',
                      parameters: [
                        {
                          _type: 'collection',
                          multiplicity: {
                            lowerBound: 3,
                            upperBound: 3,
                          },
                          sourceInformation: {
                            endColumn: 110,
                            endLine: 141,
                            sourceId: '',
                            startColumn: 89,
                            startLine: 141,
                          },
                          values: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 77,
                                    endLine: 141,
                                    sourceId: '',
                                    startColumn: 73,
                                    startLine: 141,
                                  },
                                },
                              ],
                              property: 'firstName',
                              sourceInformation: {
                                endColumn: 87,
                                endLine: 141,
                                sourceId: '',
                                startColumn: 79,
                                startLine: 141,
                              },
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              sourceInformation: {
                                endColumn: 93,
                                endLine: 141,
                                sourceId: '',
                                startColumn: 91,
                                startLine: 141,
                              },
                              values: [' '],
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 101,
                                    endLine: 141,
                                    sourceId: '',
                                    startColumn: 97,
                                    startLine: 141,
                                  },
                                },
                              ],
                              property: 'lastName',
                              sourceInformation: {
                                endColumn: 110,
                                endLine: 141,
                                sourceId: '',
                                startColumn: 103,
                                startLine: 141,
                              },
                            },
                          ],
                        },
                      ],
                      sourceInformation: {
                        endColumn: 110,
                        endLine: 141,
                        sourceId: '',
                        startColumn: 89,
                        startLine: 141,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 110,
                    endLine: 141,
                    sourceId: '',
                    startColumn: 71,
                    startLine: 141,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 10,
                endLine: 141,
                sourceId: '',
                startColumn: 9,
                startLine: 141,
              },
            },
          ],
          name: 'fullName',
          parameters: [
            {
              _type: 'var',
              class: 'Boolean',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'lastNameFirst',
              sourceInformation: {
                endColumn: 37,
                endLine: 139,
                sourceId: '',
                startColumn: 14,
                startLine: 139,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'personNameParameter',
                      sourceInformation: {
                        endColumn: 31,
                        endLine: 146,
                        sourceId: '',
                        startColumn: 12,
                        startLine: 146,
                      },
                    },
                  ],
                  property: 'lastNameFirst',
                  sourceInformation: {
                    endColumn: 45,
                    endLine: 146,
                    sourceId: '',
                    startColumn: 33,
                    startLine: 146,
                  },
                },
                {
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
                          sourceInformation: {
                            endColumn: 127,
                            endLine: 146,
                            sourceId: '',
                            startColumn: 84,
                            startLine: 146,
                          },
                          values: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'personNameParameter',
                                      sourceInformation: {
                                        endColumn: 69,
                                        endLine: 146,
                                        sourceId: '',
                                        startColumn: 50,
                                        startLine: 146,
                                      },
                                    },
                                  ],
                                  property: 'nested',
                                  sourceInformation: {
                                    endColumn: 76,
                                    endLine: 146,
                                    sourceId: '',
                                    startColumn: 71,
                                    startLine: 146,
                                  },
                                },
                              ],
                              property: 'prefix',
                              sourceInformation: {
                                endColumn: 83,
                                endLine: 146,
                                sourceId: '',
                                startColumn: 78,
                                startLine: 146,
                              },
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              sourceInformation: {
                                endColumn: 87,
                                endLine: 146,
                                sourceId: '',
                                startColumn: 85,
                                startLine: 146,
                              },
                              values: [' '],
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 93,
                                    endLine: 146,
                                    sourceId: '',
                                    startColumn: 89,
                                    startLine: 146,
                                  },
                                },
                              ],
                              property: 'lastName',
                              sourceInformation: {
                                endColumn: 102,
                                endLine: 146,
                                sourceId: '',
                                startColumn: 95,
                                startLine: 146,
                              },
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              sourceInformation: {
                                endColumn: 109,
                                endLine: 146,
                                sourceId: '',
                                startColumn: 106,
                                startLine: 146,
                              },
                              values: [', '],
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 117,
                                    endLine: 146,
                                    sourceId: '',
                                    startColumn: 113,
                                    startLine: 146,
                                  },
                                },
                              ],
                              property: 'firstName',
                              sourceInformation: {
                                endColumn: 127,
                                endLine: 146,
                                sourceId: '',
                                startColumn: 119,
                                startLine: 146,
                              },
                            },
                          ],
                        },
                      ],
                      sourceInformation: {
                        endColumn: 127,
                        endLine: 146,
                        sourceId: '',
                        startColumn: 84,
                        startLine: 146,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 127,
                    endLine: 146,
                    sourceId: '',
                    startColumn: 48,
                    startLine: 146,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'plus',
                      parameters: [
                        {
                          _type: 'collection',
                          multiplicity: {
                            lowerBound: 3,
                            upperBound: 3,
                          },
                          sourceInformation: {
                            endColumn: 169,
                            endLine: 146,
                            sourceId: '',
                            startColumn: 148,
                            startLine: 146,
                          },
                          values: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 136,
                                    endLine: 146,
                                    sourceId: '',
                                    startColumn: 132,
                                    startLine: 146,
                                  },
                                },
                              ],
                              property: 'firstName',
                              sourceInformation: {
                                endColumn: 146,
                                endLine: 146,
                                sourceId: '',
                                startColumn: 138,
                                startLine: 146,
                              },
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              sourceInformation: {
                                endColumn: 152,
                                endLine: 146,
                                sourceId: '',
                                startColumn: 150,
                                startLine: 146,
                              },
                              values: [' '],
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 160,
                                    endLine: 146,
                                    sourceId: '',
                                    startColumn: 156,
                                    startLine: 146,
                                  },
                                },
                              ],
                              property: 'lastName',
                              sourceInformation: {
                                endColumn: 169,
                                endLine: 146,
                                sourceId: '',
                                startColumn: 162,
                                startLine: 146,
                              },
                            },
                          ],
                        },
                      ],
                      sourceInformation: {
                        endColumn: 169,
                        endLine: 146,
                        sourceId: '',
                        startColumn: 148,
                        startLine: 146,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 169,
                    endLine: 146,
                    sourceId: '',
                    startColumn: 130,
                    startLine: 146,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 10,
                endLine: 146,
                sourceId: '',
                startColumn: 9,
                startLine: 146,
              },
            },
          ],
          name: 'parameterizedName',
          parameters: [
            {
              _type: 'var',
              class: 'PersonNameParameter',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'personNameParameter',
              sourceInformation: {
                endColumn: 64,
                endLine: 144,
                sourceId: '',
                startColumn: 23,
                startLine: 144,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'removeDuplicates',
              parameters: [
                {
                  _type: 'func',
                  function: 'concatenate',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 25,
                            endLine: 151,
                            sourceId: '',
                            startColumn: 21,
                            startLine: 151,
                          },
                        },
                      ],
                      property: 'organizations',
                      sourceInformation: {
                        endColumn: 39,
                        endLine: 151,
                        sourceId: '',
                        startColumn: 27,
                        startLine: 151,
                      },
                    },
                    {
                      _type: 'func',
                      function: 'map',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                              sourceInformation: {
                                endColumn: 46,
                                endLine: 151,
                                sourceId: '',
                                startColumn: 42,
                                startLine: 151,
                              },
                            },
                          ],
                          property: 'organizations',
                          sourceInformation: {
                            endColumn: 60,
                            endLine: 151,
                            sourceId: '',
                            startColumn: 48,
                            startLine: 151,
                          },
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'o',
                                  sourceInformation: {
                                    endColumn: 72,
                                    endLine: 151,
                                    sourceId: '',
                                    startColumn: 71,
                                    startLine: 151,
                                  },
                                },
                              ],
                              property: 'superOrganizations',
                              sourceInformation: {
                                endColumn: 91,
                                endLine: 151,
                                sourceId: '',
                                startColumn: 74,
                                startLine: 151,
                              },
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'o',
                            },
                          ],
                          sourceInformation: {
                            endColumn: 93,
                            endLine: 151,
                            sourceId: '',
                            startColumn: 69,
                            startLine: 151,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 65,
                        endLine: 151,
                        sourceId: '',
                        startColumn: 63,
                        startLine: 151,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 19,
                    endLine: 151,
                    sourceId: '',
                    startColumn: 9,
                    startLine: 151,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 113,
                endLine: 151,
                sourceId: '',
                startColumn: 98,
                startLine: 151,
              },
            },
          ],
          name: 'allOrganizations',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'Organization',
        },
        {
          body: [
            {
              _type: 'string',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              sourceInformation: {
                endColumn: 27,
                endLine: 156,
                sourceId: '',
                startColumn: 18,
                startLine: 156,
              },
              values: ['constant'],
            },
          ],
          name: 'constant',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'concatenate',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 12,
                        endLine: 159,
                        sourceId: '',
                        startColumn: 8,
                        startLine: 159,
                      },
                    },
                  ],
                  property: 'address',
                  sourceInformation: {
                    endColumn: 20,
                    endLine: 159,
                    sourceId: '',
                    startColumn: 14,
                    startLine: 159,
                  },
                },
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 39,
                            endLine: 159,
                            sourceId: '',
                            startColumn: 35,
                            startLine: 159,
                          },
                        },
                      ],
                      property: 'firm',
                      sourceInformation: {
                        endColumn: 44,
                        endLine: 159,
                        sourceId: '',
                        startColumn: 41,
                        startLine: 159,
                      },
                    },
                  ],
                  property: 'address',
                  sourceInformation: {
                    endColumn: 52,
                    endLine: 159,
                    sourceId: '',
                    startColumn: 46,
                    startLine: 159,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 33,
                endLine: 159,
                sourceId: '',
                startColumn: 23,
                startLine: 159,
              },
            },
          ],
          name: 'addresses',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'Address',
        },
      ],
      superTypes: ['EntityWithAddress', 'EntityWithLocations'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Address',
    content: {
      _type: 'class',
      name: 'Address',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'street',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'comments',
          type: 'String',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'plus',
              parameters: [
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 2,
                    upperBound: 2,
                  },
                  sourceInformation: {
                    endColumn: 23,
                    endLine: 175,
                    sourceId: '',
                    startColumn: 12,
                    startLine: 175,
                  },
                  values: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 10,
                        endLine: 175,
                        sourceId: '',
                        startColumn: 7,
                        startLine: 175,
                      },
                      values: ['D:'],
                    },
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 18,
                            endLine: 175,
                            sourceId: '',
                            startColumn: 14,
                            startLine: 175,
                          },
                        },
                      ],
                      property: 'name',
                      sourceInformation: {
                        endColumn: 23,
                        endLine: 175,
                        sourceId: '',
                        startColumn: 20,
                        startLine: 175,
                      },
                    },
                  ],
                },
              ],
              sourceInformation: {
                endColumn: 23,
                endLine: 175,
                sourceId: '',
                startColumn: 12,
                startLine: 175,
              },
            },
          ],
          name: 'description',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
      ],
      superTypes: ['GeographicEntity'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legalName',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'nickName',
          type: 'String',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'times',
              parameters: [
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 2,
                    upperBound: 2,
                  },
                  sourceInformation: {
                    endColumn: 60,
                    endLine: 185,
                    sourceId: '',
                    startColumn: 57,
                    startLine: 185,
                  },
                  values: [
                    {
                      _type: 'func',
                      function: 'average',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 31,
                                    endLine: 185,
                                    sourceId: '',
                                    startColumn: 27,
                                    startLine: 185,
                                  },
                                },
                              ],
                              property: 'employees',
                              sourceInformation: {
                                endColumn: 41,
                                endLine: 185,
                                sourceId: '',
                                startColumn: 33,
                                startLine: 185,
                              },
                            },
                          ],
                          property: 'age',
                          sourceInformation: {
                            endColumn: 45,
                            endLine: 185,
                            sourceId: '',
                            startColumn: 43,
                            startLine: 185,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 54,
                        endLine: 185,
                        sourceId: '',
                        startColumn: 48,
                        startLine: 185,
                      },
                    },
                    {
                      _type: 'float',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 60,
                        endLine: 185,
                        sourceId: '',
                        startColumn: 58,
                        startLine: 185,
                      },
                      values: [2],
                    },
                  ],
                },
              ],
              sourceInformation: {
                endColumn: 60,
                endLine: 185,
                sourceId: '',
                startColumn: 57,
                startLine: 185,
              },
            },
          ],
          name: 'averageEmployeesAge',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Float',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'sum',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 27,
                            endLine: 186,
                            sourceId: '',
                            startColumn: 23,
                            startLine: 186,
                          },
                        },
                      ],
                      property: 'employees',
                      sourceInformation: {
                        endColumn: 37,
                        endLine: 186,
                        sourceId: '',
                        startColumn: 29,
                        startLine: 186,
                      },
                    },
                  ],
                  property: 'age',
                  sourceInformation: {
                    endColumn: 41,
                    endLine: 186,
                    sourceId: '',
                    startColumn: 39,
                    startLine: 186,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 46,
                endLine: 186,
                sourceId: '',
                startColumn: 44,
                startLine: 186,
              },
            },
          ],
          name: 'sumEmployeesAge',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Integer',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'max',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 27,
                            endLine: 187,
                            sourceId: '',
                            startColumn: 23,
                            startLine: 187,
                          },
                        },
                      ],
                      property: 'employees',
                      sourceInformation: {
                        endColumn: 37,
                        endLine: 187,
                        sourceId: '',
                        startColumn: 29,
                        startLine: 187,
                      },
                    },
                  ],
                  property: 'age',
                  sourceInformation: {
                    endColumn: 41,
                    endLine: 187,
                    sourceId: '',
                    startColumn: 39,
                    startLine: 187,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 46,
                endLine: 187,
                sourceId: '',
                startColumn: 44,
                startLine: 187,
              },
            },
          ],
          name: 'maxEmployeesAge',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'Integer',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'plus',
              parameters: [
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 3,
                    upperBound: 3,
                  },
                  sourceInformation: {
                    endColumn: 58,
                    endLine: 190,
                    sourceId: '',
                    startColumn: 24,
                    startLine: 190,
                  },
                  values: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 12,
                            endLine: 190,
                            sourceId: '',
                            startColumn: 8,
                            startLine: 190,
                          },
                        },
                      ],
                      property: 'legalName',
                      sourceInformation: {
                        endColumn: 22,
                        endLine: 190,
                        sourceId: '',
                        startColumn: 14,
                        startLine: 190,
                      },
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 28,
                        endLine: 190,
                        sourceId: '',
                        startColumn: 26,
                        startLine: 190,
                      },
                      values: [','],
                    },
                    {
                      _type: 'property',
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
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 36,
                                    endLine: 190,
                                    sourceId: '',
                                    startColumn: 32,
                                    startLine: 190,
                                  },
                                },
                              ],
                              property: 'address',
                              sourceInformation: {
                                endColumn: 44,
                                endLine: 190,
                                sourceId: '',
                                startColumn: 38,
                                startLine: 190,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 51,
                            endLine: 190,
                            sourceId: '',
                            startColumn: 47,
                            startLine: 190,
                          },
                        },
                      ],
                      property: 'name',
                      sourceInformation: {
                        endColumn: 58,
                        endLine: 190,
                        sourceId: '',
                        startColumn: 55,
                        startLine: 190,
                      },
                    },
                  ],
                },
              ],
              sourceInformation: {
                endColumn: 58,
                endLine: 190,
                sourceId: '',
                startColumn: 24,
                startLine: 190,
              },
            },
          ],
          name: 'nameAndAddress',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
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
                      function: 'toOne',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                              sourceInformation: {
                                endColumn: 16,
                                endLine: 194,
                                sourceId: '',
                                startColumn: 12,
                                startLine: 194,
                              },
                            },
                          ],
                          property: 'legalName',
                          sourceInformation: {
                            endColumn: 26,
                            endLine: 194,
                            sourceId: '',
                            startColumn: 18,
                            startLine: 194,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 33,
                        endLine: 194,
                        sourceId: '',
                        startColumn: 29,
                        startLine: 194,
                      },
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 54,
                        endLine: 194,
                        sourceId: '',
                        startColumn: 40,
                        startLine: 194,
                      },
                      values: ['Firm X'],
                    },
                  ],
                  sourceInformation: {
                    endColumn: 38,
                    endLine: 194,
                    sourceId: '',
                    startColumn: 37,
                    startLine: 194,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 63,
                        endLine: 194,
                        sourceId: '',
                        startColumn: 59,
                        startLine: 194,
                      },
                      values: ['Yes'],
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 63,
                    endLine: 194,
                    sourceId: '',
                    startColumn: 57,
                    startLine: 194,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 71,
                        endLine: 194,
                        sourceId: '',
                        startColumn: 68,
                        startLine: 194,
                      },
                      values: ['No'],
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 71,
                    endLine: 194,
                    sourceId: '',
                    startColumn: 66,
                    startLine: 194,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 9,
                endLine: 194,
                sourceId: '',
                startColumn: 8,
                startLine: 194,
              },
            },
          ],
          name: 'isfirmX',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
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
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 16,
                            endLine: 198,
                            sourceId: '',
                            startColumn: 12,
                            startLine: 198,
                          },
                        },
                      ],
                      property: 'legalName',
                      sourceInformation: {
                        endColumn: 26,
                        endLine: 198,
                        sourceId: '',
                        startColumn: 18,
                        startLine: 198,
                      },
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 45,
                        endLine: 198,
                        sourceId: '',
                        startColumn: 31,
                        startLine: 198,
                      },
                      values: ['Firm X'],
                    },
                  ],
                  sourceInformation: {
                    endColumn: 29,
                    endLine: 198,
                    sourceId: '',
                    startColumn: 28,
                    startLine: 198,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'plus',
                      parameters: [
                        {
                          _type: 'collection',
                          multiplicity: {
                            lowerBound: 2,
                            upperBound: 2,
                          },
                          sourceInformation: {
                            endColumn: 82,
                            endLine: 198,
                            sourceId: '',
                            startColumn: 66,
                            startLine: 198,
                          },
                          values: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 54,
                                    endLine: 198,
                                    sourceId: '',
                                    startColumn: 50,
                                    startLine: 198,
                                  },
                                },
                              ],
                              property: 'legalName',
                              sourceInformation: {
                                endColumn: 64,
                                endLine: 198,
                                sourceId: '',
                                startColumn: 56,
                                startLine: 198,
                              },
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              sourceInformation: {
                                endColumn: 82,
                                endLine: 198,
                                sourceId: '',
                                startColumn: 68,
                                startLine: 198,
                              },
                              values: [' , Top Secret'],
                            },
                          ],
                        },
                      ],
                      sourceInformation: {
                        endColumn: 82,
                        endLine: 198,
                        sourceId: '',
                        startColumn: 66,
                        startLine: 198,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 82,
                    endLine: 198,
                    sourceId: '',
                    startColumn: 48,
                    startLine: 198,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'plus',
                      parameters: [
                        {
                          _type: 'collection',
                          multiplicity: {
                            lowerBound: 3,
                            upperBound: 3,
                          },
                          sourceInformation: {
                            endColumn: 138,
                            endLine: 198,
                            sourceId: '',
                            startColumn: 104,
                            startLine: 198,
                          },
                          values: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 92,
                                    endLine: 198,
                                    sourceId: '',
                                    startColumn: 88,
                                    startLine: 198,
                                  },
                                },
                              ],
                              property: 'legalName',
                              sourceInformation: {
                                endColumn: 102,
                                endLine: 198,
                                sourceId: '',
                                startColumn: 94,
                                startLine: 198,
                              },
                            },
                            {
                              _type: 'string',
                              multiplicity: {
                                lowerBound: 1,
                                upperBound: 1,
                              },
                              sourceInformation: {
                                endColumn: 108,
                                endLine: 198,
                                sourceId: '',
                                startColumn: 106,
                                startLine: 198,
                              },
                              values: [','],
                            },
                            {
                              _type: 'property',
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
                                          name: 'this',
                                          sourceInformation: {
                                            endColumn: 116,
                                            endLine: 198,
                                            sourceId: '',
                                            startColumn: 112,
                                            startLine: 198,
                                          },
                                        },
                                      ],
                                      property: 'address',
                                      sourceInformation: {
                                        endColumn: 124,
                                        endLine: 198,
                                        sourceId: '',
                                        startColumn: 118,
                                        startLine: 198,
                                      },
                                    },
                                  ],
                                  sourceInformation: {
                                    endColumn: 131,
                                    endLine: 198,
                                    sourceId: '',
                                    startColumn: 127,
                                    startLine: 198,
                                  },
                                },
                              ],
                              property: 'name',
                              sourceInformation: {
                                endColumn: 138,
                                endLine: 198,
                                sourceId: '',
                                startColumn: 135,
                                startLine: 198,
                              },
                            },
                          ],
                        },
                      ],
                      sourceInformation: {
                        endColumn: 138,
                        endLine: 198,
                        sourceId: '',
                        startColumn: 104,
                        startLine: 198,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 138,
                    endLine: 198,
                    sourceId: '',
                    startColumn: 85,
                    startLine: 198,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 9,
                endLine: 198,
                sourceId: '',
                startColumn: 8,
                startLine: 198,
              },
            },
          ],
          name: 'nameAndMaskedAddress',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 48,
                            endLine: 201,
                            sourceId: '',
                            startColumn: 44,
                            startLine: 201,
                          },
                        },
                      ],
                      property: 'employees',
                      sourceInformation: {
                        endColumn: 58,
                        endLine: 201,
                        sourceId: '',
                        startColumn: 50,
                        startLine: 201,
                      },
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
                                  name: 'e',
                                  sourceInformation: {
                                    endColumn: 71,
                                    endLine: 201,
                                    sourceId: '',
                                    startColumn: 70,
                                    startLine: 201,
                                  },
                                },
                              ],
                              property: 'lastName',
                              sourceInformation: {
                                endColumn: 80,
                                endLine: 201,
                                sourceId: '',
                                startColumn: 73,
                                startLine: 201,
                              },
                            },
                            {
                              _type: 'var',
                              name: 'lastName',
                              sourceInformation: {
                                endColumn: 93,
                                endLine: 201,
                                sourceId: '',
                                startColumn: 85,
                                startLine: 201,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 83,
                            endLine: 201,
                            sourceId: '',
                            startColumn: 82,
                            startLine: 201,
                          },
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'e',
                        },
                      ],
                      sourceInformation: {
                        endColumn: 93,
                        endLine: 201,
                        sourceId: '',
                        startColumn: 69,
                        startLine: 201,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 66,
                    endLine: 201,
                    sourceId: '',
                    startColumn: 61,
                    startLine: 201,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 101,
                endLine: 201,
                sourceId: '',
                startColumn: 97,
                startLine: 201,
              },
            },
          ],
          name: 'employeeByLastName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'lastName',
              sourceInformation: {
                endColumn: 41,
                endLine: 201,
                sourceId: '',
                startColumn: 24,
                startLine: 201,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'func',
                  function: 'toOne',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'filter',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                              sourceInformation: {
                                endColumn: 57,
                                endLine: 203,
                                sourceId: '',
                                startColumn: 53,
                                startLine: 203,
                              },
                            },
                          ],
                          property: 'employees',
                          sourceInformation: {
                            endColumn: 67,
                            endLine: 203,
                            sourceId: '',
                            startColumn: 59,
                            startLine: 203,
                          },
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
                                      name: 'e',
                                      sourceInformation: {
                                        endColumn: 80,
                                        endLine: 203,
                                        sourceId: '',
                                        startColumn: 79,
                                        startLine: 203,
                                      },
                                    },
                                  ],
                                  property: 'lastName',
                                  sourceInformation: {
                                    endColumn: 89,
                                    endLine: 203,
                                    sourceId: '',
                                    startColumn: 82,
                                    startLine: 203,
                                  },
                                },
                                {
                                  _type: 'var',
                                  name: 'lastName',
                                  sourceInformation: {
                                    endColumn: 102,
                                    endLine: 203,
                                    sourceId: '',
                                    startColumn: 94,
                                    startLine: 203,
                                  },
                                },
                              ],
                              sourceInformation: {
                                endColumn: 92,
                                endLine: 203,
                                sourceId: '',
                                startColumn: 91,
                                startLine: 203,
                              },
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'e',
                            },
                          ],
                          sourceInformation: {
                            endColumn: 102,
                            endLine: 203,
                            sourceId: '',
                            startColumn: 78,
                            startLine: 203,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 75,
                        endLine: 203,
                        sourceId: '',
                        startColumn: 70,
                        startLine: 203,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 110,
                    endLine: 203,
                    sourceId: '',
                    startColumn: 106,
                    startLine: 203,
                  },
                },
              ],
              property: 'firstName',
              sourceInformation: {
                endColumn: 122,
                endLine: 203,
                sourceId: '',
                startColumn: 114,
                startLine: 203,
              },
            },
          ],
          name: 'employeeByLastNameFirstName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'lastName',
              sourceInformation: {
                endColumn: 50,
                endLine: 203,
                sourceId: '',
                startColumn: 33,
                startLine: 203,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 71,
                            endLine: 205,
                            sourceId: '',
                            startColumn: 67,
                            startLine: 205,
                          },
                        },
                      ],
                      property: 'employees',
                      sourceInformation: {
                        endColumn: 81,
                        endLine: 205,
                        sourceId: '',
                        startColumn: 73,
                        startLine: 205,
                      },
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'lastName',
                              sourceInformation: {
                                endColumn: 101,
                                endLine: 205,
                                sourceId: '',
                                startColumn: 93,
                                startLine: 205,
                              },
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'e',
                                  sourceInformation: {
                                    endColumn: 107,
                                    endLine: 205,
                                    sourceId: '',
                                    startColumn: 106,
                                    startLine: 205,
                                  },
                                },
                              ],
                              property: 'lastName',
                              sourceInformation: {
                                endColumn: 116,
                                endLine: 205,
                                sourceId: '',
                                startColumn: 109,
                                startLine: 205,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 104,
                            endLine: 205,
                            sourceId: '',
                            startColumn: 103,
                            startLine: 205,
                          },
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'e',
                        },
                      ],
                      sourceInformation: {
                        endColumn: 116,
                        endLine: 205,
                        sourceId: '',
                        startColumn: 92,
                        startLine: 205,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 89,
                    endLine: 205,
                    sourceId: '',
                    startColumn: 84,
                    startLine: 205,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 124,
                endLine: 205,
                sourceId: '',
                startColumn: 120,
                startLine: 205,
              },
            },
          ],
          name: 'employeeByLastNameWhereVarIsFirstEqualArg',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'lastName',
              sourceInformation: {
                endColumn: 64,
                endLine: 205,
                sourceId: '',
                startColumn: 47,
                startLine: 205,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 40,
                        endLine: 207,
                        sourceId: '',
                        startColumn: 36,
                        startLine: 207,
                      },
                    },
                  ],
                  property: 'employees',
                  sourceInformation: {
                    endColumn: 50,
                    endLine: 207,
                    sourceId: '',
                    startColumn: 42,
                    startLine: 207,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'lessThan',
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
                                  name: 'e',
                                  sourceInformation: {
                                    endColumn: 63,
                                    endLine: 207,
                                    sourceId: '',
                                    startColumn: 62,
                                    startLine: 207,
                                  },
                                },
                              ],
                              property: 'age',
                              sourceInformation: {
                                endColumn: 67,
                                endLine: 207,
                                sourceId: '',
                                startColumn: 65,
                                startLine: 207,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 74,
                            endLine: 207,
                            sourceId: '',
                            startColumn: 70,
                            startLine: 207,
                          },
                        },
                        {
                          _type: 'var',
                          name: 'age',
                          sourceInformation: {
                            endColumn: 83,
                            endLine: 207,
                            sourceId: '',
                            startColumn: 80,
                            startLine: 207,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 83,
                        endLine: 207,
                        sourceId: '',
                        startColumn: 78,
                        startLine: 207,
                      },
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'e',
                    },
                  ],
                  sourceInformation: {
                    endColumn: 83,
                    endLine: 207,
                    sourceId: '',
                    startColumn: 61,
                    startLine: 207,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 58,
                endLine: 207,
                sourceId: '',
                startColumn: 53,
                startLine: 207,
              },
            },
          ],
          name: 'employeesByAge',
          parameters: [
            {
              _type: 'var',
              class: 'Integer',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'age',
              sourceInformation: {
                endColumn: 33,
                endLine: 207,
                sourceId: '',
                startColumn: 20,
                startLine: 207,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 73,
                        endLine: 209,
                        sourceId: '',
                        startColumn: 69,
                        startLine: 209,
                      },
                    },
                  ],
                  property: 'employees',
                  sourceInformation: {
                    endColumn: 83,
                    endLine: 209,
                    sourceId: '',
                    startColumn: 75,
                    startLine: 209,
                  },
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
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'e',
                                      sourceInformation: {
                                        endColumn: 96,
                                        endLine: 209,
                                        sourceId: '',
                                        startColumn: 95,
                                        startLine: 209,
                                      },
                                    },
                                  ],
                                  property: 'address',
                                  sourceInformation: {
                                    endColumn: 104,
                                    endLine: 209,
                                    sourceId: '',
                                    startColumn: 98,
                                    startLine: 209,
                                  },
                                },
                              ],
                              property: 'name',
                              sourceInformation: {
                                endColumn: 109,
                                endLine: 209,
                                sourceId: '',
                                startColumn: 106,
                                startLine: 209,
                              },
                            },
                            {
                              _type: 'var',
                              name: 'city',
                              sourceInformation: {
                                endColumn: 118,
                                endLine: 209,
                                sourceId: '',
                                startColumn: 114,
                                startLine: 209,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 112,
                            endLine: 209,
                            sourceId: '',
                            startColumn: 111,
                            startLine: 209,
                          },
                        },
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
                                      name: 'e',
                                      sourceInformation: {
                                        endColumn: 124,
                                        endLine: 209,
                                        sourceId: '',
                                        startColumn: 123,
                                        startLine: 209,
                                      },
                                    },
                                  ],
                                  property: 'manager',
                                  sourceInformation: {
                                    endColumn: 132,
                                    endLine: 209,
                                    sourceId: '',
                                    startColumn: 126,
                                    startLine: 209,
                                  },
                                },
                              ],
                              property: 'name',
                              sourceInformation: {
                                endColumn: 137,
                                endLine: 209,
                                sourceId: '',
                                startColumn: 134,
                                startLine: 209,
                              },
                            },
                            {
                              _type: 'var',
                              name: 'managerName',
                              sourceInformation: {
                                endColumn: 153,
                                endLine: 209,
                                sourceId: '',
                                startColumn: 142,
                                startLine: 209,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 140,
                            endLine: 209,
                            sourceId: '',
                            startColumn: 139,
                            startLine: 209,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 121,
                        endLine: 209,
                        sourceId: '',
                        startColumn: 120,
                        startLine: 209,
                      },
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'e',
                    },
                  ],
                  sourceInformation: {
                    endColumn: 153,
                    endLine: 209,
                    sourceId: '',
                    startColumn: 94,
                    startLine: 209,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 91,
                endLine: 209,
                sourceId: '',
                startColumn: 86,
                startLine: 209,
              },
            },
          ],
          name: 'employeesByCityOrManager',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'city',
              sourceInformation: {
                endColumn: 43,
                endLine: 209,
                sourceId: '',
                startColumn: 30,
                startLine: 209,
              },
            },
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'managerName',
              sourceInformation: {
                endColumn: 66,
                endLine: 209,
                sourceId: '',
                startColumn: 46,
                startLine: 209,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 100,
                            endLine: 211,
                            sourceId: '',
                            startColumn: 96,
                            startLine: 211,
                          },
                        },
                      ],
                      property: 'employees',
                      sourceInformation: {
                        endColumn: 110,
                        endLine: 211,
                        sourceId: '',
                        startColumn: 102,
                        startLine: 211,
                      },
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'func',
                          function: 'and',
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
                                      name: 'e',
                                      sourceInformation: {
                                        endColumn: 123,
                                        endLine: 211,
                                        sourceId: '',
                                        startColumn: 122,
                                        startLine: 211,
                                      },
                                    },
                                  ],
                                  property: 'lastName',
                                  sourceInformation: {
                                    endColumn: 132,
                                    endLine: 211,
                                    sourceId: '',
                                    startColumn: 125,
                                    startLine: 211,
                                  },
                                },
                                {
                                  _type: 'var',
                                  name: 'name',
                                  sourceInformation: {
                                    endColumn: 141,
                                    endLine: 211,
                                    sourceId: '',
                                    startColumn: 137,
                                    startLine: 211,
                                  },
                                },
                              ],
                              sourceInformation: {
                                endColumn: 135,
                                endLine: 211,
                                sourceId: '',
                                startColumn: 134,
                                startLine: 211,
                              },
                            },
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
                                      parameters: [
                                        {
                                          _type: 'property',
                                          parameters: [
                                            {
                                              _type: 'var',
                                              name: 'e',
                                              sourceInformation: {
                                                endColumn: 148,
                                                endLine: 211,
                                                sourceId: '',
                                                startColumn: 147,
                                                startLine: 211,
                                              },
                                            },
                                          ],
                                          property: 'address',
                                          sourceInformation: {
                                            endColumn: 156,
                                            endLine: 211,
                                            sourceId: '',
                                            startColumn: 150,
                                            startLine: 211,
                                          },
                                        },
                                      ],
                                      property: 'name',
                                      sourceInformation: {
                                        endColumn: 161,
                                        endLine: 211,
                                        sourceId: '',
                                        startColumn: 158,
                                        startLine: 211,
                                      },
                                    },
                                    {
                                      _type: 'var',
                                      name: 'city',
                                      sourceInformation: {
                                        endColumn: 170,
                                        endLine: 211,
                                        sourceId: '',
                                        startColumn: 166,
                                        startLine: 211,
                                      },
                                    },
                                  ],
                                  sourceInformation: {
                                    endColumn: 164,
                                    endLine: 211,
                                    sourceId: '',
                                    startColumn: 163,
                                    startLine: 211,
                                  },
                                },
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
                                              name: 'e',
                                              sourceInformation: {
                                                endColumn: 176,
                                                endLine: 211,
                                                sourceId: '',
                                                startColumn: 175,
                                                startLine: 211,
                                              },
                                            },
                                          ],
                                          property: 'manager',
                                          sourceInformation: {
                                            endColumn: 184,
                                            endLine: 211,
                                            sourceId: '',
                                            startColumn: 178,
                                            startLine: 211,
                                          },
                                        },
                                      ],
                                      property: 'name',
                                      sourceInformation: {
                                        endColumn: 189,
                                        endLine: 211,
                                        sourceId: '',
                                        startColumn: 186,
                                        startLine: 211,
                                      },
                                    },
                                    {
                                      _type: 'var',
                                      name: 'managerName',
                                      sourceInformation: {
                                        endColumn: 205,
                                        endLine: 211,
                                        sourceId: '',
                                        startColumn: 194,
                                        startLine: 211,
                                      },
                                    },
                                  ],
                                  sourceInformation: {
                                    endColumn: 192,
                                    endLine: 211,
                                    sourceId: '',
                                    startColumn: 191,
                                    startLine: 211,
                                  },
                                },
                              ],
                              sourceInformation: {
                                endColumn: 173,
                                endLine: 211,
                                sourceId: '',
                                startColumn: 172,
                                startLine: 211,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 144,
                            endLine: 211,
                            sourceId: '',
                            startColumn: 143,
                            startLine: 211,
                          },
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'e',
                        },
                      ],
                      sourceInformation: {
                        endColumn: 206,
                        endLine: 211,
                        sourceId: '',
                        startColumn: 121,
                        startLine: 211,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 118,
                    endLine: 211,
                    sourceId: '',
                    startColumn: 113,
                    startLine: 211,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 214,
                endLine: 211,
                sourceId: '',
                startColumn: 210,
                startLine: 211,
              },
            },
          ],
          name: 'employeesByCityOrManagerAndLastName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'name',
              sourceInformation: {
                endColumn: 54,
                endLine: 211,
                sourceId: '',
                startColumn: 41,
                startLine: 211,
              },
            },
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'city',
              sourceInformation: {
                endColumn: 70,
                endLine: 211,
                sourceId: '',
                startColumn: 57,
                startLine: 211,
              },
            },
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'managerName',
              sourceInformation: {
                endColumn: 93,
                endLine: 211,
                sourceId: '',
                startColumn: 73,
                startLine: 211,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'exists',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 45,
                        endLine: 213,
                        sourceId: '',
                        startColumn: 41,
                        startLine: 213,
                      },
                    },
                  ],
                  property: 'employees',
                  sourceInformation: {
                    endColumn: 55,
                    endLine: 213,
                    sourceId: '',
                    startColumn: 47,
                    startLine: 213,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'lessThan',
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
                                  name: 'e',
                                  sourceInformation: {
                                    endColumn: 68,
                                    endLine: 213,
                                    sourceId: '',
                                    startColumn: 67,
                                    startLine: 213,
                                  },
                                },
                              ],
                              property: 'age',
                              sourceInformation: {
                                endColumn: 72,
                                endLine: 213,
                                sourceId: '',
                                startColumn: 70,
                                startLine: 213,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 79,
                            endLine: 213,
                            sourceId: '',
                            startColumn: 75,
                            startLine: 213,
                          },
                        },
                        {
                          _type: 'var',
                          name: 'age',
                          sourceInformation: {
                            endColumn: 88,
                            endLine: 213,
                            sourceId: '',
                            startColumn: 85,
                            startLine: 213,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 88,
                        endLine: 213,
                        sourceId: '',
                        startColumn: 83,
                        startLine: 213,
                      },
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'e',
                    },
                  ],
                  sourceInformation: {
                    endColumn: 88,
                    endLine: 213,
                    sourceId: '',
                    startColumn: 66,
                    startLine: 213,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 63,
                endLine: 213,
                sourceId: '',
                startColumn: 58,
                startLine: 213,
              },
            },
          ],
          name: 'hasEmployeeBelowAge',
          parameters: [
            {
              _type: 'var',
              class: 'Integer',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'age',
              sourceInformation: {
                endColumn: 38,
                endLine: 213,
                sourceId: '',
                startColumn: 25,
                startLine: 213,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Boolean',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'first',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 12,
                            endLine: 216,
                            sourceId: '',
                            startColumn: 8,
                            startLine: 216,
                          },
                        },
                      ],
                      property: 'employees',
                      sourceInformation: {
                        endColumn: 22,
                        endLine: 216,
                        sourceId: '',
                        startColumn: 14,
                        startLine: 216,
                      },
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
                                  name: 'e',
                                  sourceInformation: {
                                    endColumn: 35,
                                    endLine: 216,
                                    sourceId: '',
                                    startColumn: 34,
                                    startLine: 216,
                                  },
                                },
                              ],
                              property: 'name',
                              sourceInformation: {
                                endColumn: 40,
                                endLine: 216,
                                sourceId: '',
                                startColumn: 37,
                                startLine: 216,
                              },
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'this',
                                      sourceInformation: {
                                        endColumn: 49,
                                        endLine: 216,
                                        sourceId: '',
                                        startColumn: 45,
                                        startLine: 216,
                                      },
                                    },
                                  ],
                                  property: 'address',
                                  sourceInformation: {
                                    endColumn: 57,
                                    endLine: 216,
                                    sourceId: '',
                                    startColumn: 51,
                                    startLine: 216,
                                  },
                                },
                              ],
                              property: 'name',
                              sourceInformation: {
                                endColumn: 62,
                                endLine: 216,
                                sourceId: '',
                                startColumn: 59,
                                startLine: 216,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 43,
                            endLine: 216,
                            sourceId: '',
                            startColumn: 42,
                            startLine: 216,
                          },
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'e',
                        },
                      ],
                      sourceInformation: {
                        endColumn: 62,
                        endLine: 216,
                        sourceId: '',
                        startColumn: 33,
                        startLine: 216,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 30,
                    endLine: 216,
                    sourceId: '',
                    startColumn: 25,
                    startLine: 216,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 70,
                endLine: 216,
                sourceId: '',
                startColumn: 66,
                startLine: 216,
              },
            },
          ],
          name: 'employeeWithFirmAddressName',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'first',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 12,
                            endLine: 220,
                            sourceId: '',
                            startColumn: 8,
                            startLine: 220,
                          },
                        },
                      ],
                      property: 'employees',
                      sourceInformation: {
                        endColumn: 22,
                        endLine: 220,
                        sourceId: '',
                        startColumn: 14,
                        startLine: 220,
                      },
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
                                      name: 'e',
                                      sourceInformation: {
                                        endColumn: 35,
                                        endLine: 220,
                                        sourceId: '',
                                        startColumn: 34,
                                        startLine: 220,
                                      },
                                    },
                                  ],
                                  property: 'address',
                                  sourceInformation: {
                                    endColumn: 43,
                                    endLine: 220,
                                    sourceId: '',
                                    startColumn: 37,
                                    startLine: 220,
                                  },
                                },
                              ],
                              property: 'name',
                              sourceInformation: {
                                endColumn: 48,
                                endLine: 220,
                                sourceId: '',
                                startColumn: 45,
                                startLine: 220,
                              },
                            },
                            {
                              _type: 'var',
                              name: 'name',
                              sourceInformation: {
                                endColumn: 57,
                                endLine: 220,
                                sourceId: '',
                                startColumn: 53,
                                startLine: 220,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 51,
                            endLine: 220,
                            sourceId: '',
                            startColumn: 50,
                            startLine: 220,
                          },
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'e',
                        },
                      ],
                      sourceInformation: {
                        endColumn: 57,
                        endLine: 220,
                        sourceId: '',
                        startColumn: 33,
                        startLine: 220,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 30,
                    endLine: 220,
                    sourceId: '',
                    startColumn: 25,
                    startLine: 220,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 65,
                endLine: 220,
                sourceId: '',
                startColumn: 61,
                startLine: 220,
              },
            },
          ],
          name: 'employeeWithAddressName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'name',
              sourceInformation: {
                endColumn: 42,
                endLine: 219,
                sourceId: '',
                startColumn: 29,
                startLine: 219,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'Person',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'joinStrings',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'sortBy',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'filter',
                          parameters: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'this',
                                  sourceInformation: {
                                    endColumn: 12,
                                    endLine: 224,
                                    sourceId: '',
                                    startColumn: 8,
                                    startLine: 224,
                                  },
                                },
                              ],
                              property: 'employees',
                              sourceInformation: {
                                endColumn: 22,
                                endLine: 224,
                                sourceId: '',
                                startColumn: 14,
                                startLine: 224,
                              },
                            },
                            {
                              _type: 'lambda',
                              body: [
                                {
                                  _type: 'func',
                                  function: 'equal',
                                  parameters: [
                                    {
                                      _type: 'func',
                                      function: 'trim',
                                      parameters: [
                                        {
                                          _type: 'func',
                                          function: 'toOne',
                                          parameters: [
                                            {
                                              _type: 'property',
                                              parameters: [
                                                {
                                                  _type: 'property',
                                                  parameters: [
                                                    {
                                                      _type: 'var',
                                                      name: 'e',
                                                      sourceInformation: {
                                                        endColumn: 35,
                                                        endLine: 224,
                                                        sourceId: '',
                                                        startColumn: 34,
                                                        startLine: 224,
                                                      },
                                                    },
                                                  ],
                                                  property: 'address',
                                                  sourceInformation: {
                                                    endColumn: 43,
                                                    endLine: 224,
                                                    sourceId: '',
                                                    startColumn: 37,
                                                    startLine: 224,
                                                  },
                                                },
                                              ],
                                              property: 'name',
                                              sourceInformation: {
                                                endColumn: 48,
                                                endLine: 224,
                                                sourceId: '',
                                                startColumn: 45,
                                                startLine: 224,
                                              },
                                            },
                                          ],
                                          sourceInformation: {
                                            endColumn: 55,
                                            endLine: 224,
                                            sourceId: '',
                                            startColumn: 51,
                                            startLine: 224,
                                          },
                                        },
                                      ],
                                      sourceInformation: {
                                        endColumn: 63,
                                        endLine: 224,
                                        sourceId: '',
                                        startColumn: 60,
                                        startLine: 224,
                                      },
                                    },
                                    {
                                      _type: 'var',
                                      name: 'name',
                                      sourceInformation: {
                                        endColumn: 74,
                                        endLine: 224,
                                        sourceId: '',
                                        startColumn: 70,
                                        startLine: 224,
                                      },
                                    },
                                  ],
                                  sourceInformation: {
                                    endColumn: 68,
                                    endLine: 224,
                                    sourceId: '',
                                    startColumn: 67,
                                    startLine: 224,
                                  },
                                },
                              ],
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'e',
                                },
                              ],
                              sourceInformation: {
                                endColumn: 74,
                                endLine: 224,
                                sourceId: '',
                                startColumn: 33,
                                startLine: 224,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 30,
                            endLine: 224,
                            sourceId: '',
                            startColumn: 25,
                            startLine: 224,
                          },
                        },
                        {
                          _type: 'path',
                          path: [
                            {
                              _type: 'propertyPath',
                              parameters: [],
                              property: 'lastName',
                              sourceInformation: {
                                endColumn: 118,
                                endLine: 224,
                                sourceId: '',
                                startColumn: 110,
                                startLine: 224,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 123,
                            endLine: 224,
                            sourceId: '',
                            startColumn: 103,
                            startLine: 224,
                          },
                          startType: 'Person',
                        },
                      ],
                      sourceInformation: {
                        endColumn: 83,
                        endLine: 224,
                        sourceId: '',
                        startColumn: 78,
                        startLine: 224,
                      },
                    },
                  ],
                  property: 'lastName',
                  sourceInformation: {
                    endColumn: 112,
                    endLine: 224,
                    sourceId: '',
                    startColumn: 105,
                    startLine: 224,
                  },
                },
                {
                  _type: 'string',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  sourceInformation: {
                    endColumn: 128,
                    endLine: 224,
                    sourceId: '',
                    startColumn: 127,
                    startLine: 224,
                  },
                  values: [''],
                },
              ],
              sourceInformation: {
                endColumn: 125,
                endLine: 224,
                sourceId: '',
                startColumn: 115,
                startLine: 224,
              },
            },
          ],
          name: 'employeesWithAddressNameSorted',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'name',
              sourceInformation: {
                endColumn: 49,
                endLine: 223,
                sourceId: '',
                startColumn: 36,
                startLine: 223,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'String',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'func',
                  function: 'map',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 12,
                            endLine: 230,
                            sourceId: '',
                            startColumn: 8,
                            startLine: 230,
                          },
                        },
                      ],
                      property: 'employees',
                      sourceInformation: {
                        endColumn: 22,
                        endLine: 230,
                        sourceId: '',
                        startColumn: 14,
                        startLine: 230,
                      },
                    },
                    {
                      _type: 'lambda',
                      body: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'e',
                              sourceInformation: {
                                endColumn: 32,
                                endLine: 230,
                                sourceId: '',
                                startColumn: 31,
                                startLine: 230,
                              },
                            },
                          ],
                          property: 'address',
                          sourceInformation: {
                            endColumn: 40,
                            endLine: 230,
                            sourceId: '',
                            startColumn: 34,
                            startLine: 230,
                          },
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'e',
                        },
                      ],
                      sourceInformation: {
                        endColumn: 40,
                        endLine: 230,
                        sourceId: '',
                        startColumn: 30,
                        startLine: 230,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 27,
                    endLine: 230,
                    sourceId: '',
                    startColumn: 25,
                    startLine: 230,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'and',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'name',
                              sourceInformation: {
                                endColumn: 58,
                                endLine: 230,
                                sourceId: '',
                                startColumn: 54,
                                startLine: 230,
                              },
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'this',
                                      sourceInformation: {
                                        endColumn: 67,
                                        endLine: 230,
                                        sourceId: '',
                                        startColumn: 63,
                                        startLine: 230,
                                      },
                                    },
                                  ],
                                  property: 'address',
                                  sourceInformation: {
                                    endColumn: 75,
                                    endLine: 230,
                                    sourceId: '',
                                    startColumn: 69,
                                    startLine: 230,
                                  },
                                },
                              ],
                              property: 'name',
                              sourceInformation: {
                                endColumn: 80,
                                endLine: 230,
                                sourceId: '',
                                startColumn: 77,
                                startLine: 230,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 61,
                            endLine: 230,
                            sourceId: '',
                            startColumn: 60,
                            startLine: 230,
                          },
                        },
                        {
                          _type: 'func',
                          function: 'equal',
                          parameters: [
                            {
                              _type: 'var',
                              name: 't',
                              sourceInformation: {
                                endColumn: 87,
                                endLine: 230,
                                sourceId: '',
                                startColumn: 86,
                                startLine: 230,
                              },
                            },
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'x',
                                  sourceInformation: {
                                    endColumn: 93,
                                    endLine: 230,
                                    sourceId: '',
                                    startColumn: 92,
                                    startLine: 230,
                                  },
                                },
                              ],
                              property: 'type',
                              sourceInformation: {
                                endColumn: 98,
                                endLine: 230,
                                sourceId: '',
                                startColumn: 95,
                                startLine: 230,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 90,
                            endLine: 230,
                            sourceId: '',
                            startColumn: 89,
                            startLine: 230,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 84,
                        endLine: 230,
                        sourceId: '',
                        startColumn: 83,
                        startLine: 230,
                      },
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'x',
                    },
                  ],
                  sourceInformation: {
                    endColumn: 98,
                    endLine: 230,
                    sourceId: '',
                    startColumn: 52,
                    startLine: 230,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 49,
                endLine: 230,
                sourceId: '',
                startColumn: 44,
                startLine: 230,
              },
            },
          ],
          name: 'employeeAddressesWithFirmAddressName',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'name',
              sourceInformation: {
                endColumn: 54,
                endLine: 229,
                sourceId: '',
                startColumn: 41,
                startLine: 229,
              },
            },
            {
              _type: 'var',
              class: 'GeographicEntityType',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 't',
              sourceInformation: {
                endColumn: 80,
                endLine: 229,
                sourceId: '',
                startColumn: 56,
                startLine: 229,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'Address',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'in',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 11,
                        endLine: 234,
                        sourceId: '',
                        startColumn: 7,
                        startLine: 234,
                      },
                    },
                  ],
                  property: 'legalName',
                  sourceInformation: {
                    endColumn: 21,
                    endLine: 234,
                    sourceId: '',
                    startColumn: 13,
                    startLine: 234,
                  },
                },
                {
                  _type: 'collection',
                  multiplicity: {
                    lowerBound: 3,
                    upperBound: 3,
                  },
                  sourceInformation: {
                    endColumn: 93,
                    endLine: 234,
                    sourceId: '',
                    startColumn: 27,
                    startLine: 234,
                  },
                  values: [
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 42,
                        endLine: 234,
                        sourceId: '',
                        startColumn: 28,
                        startLine: 234,
                      },
                      values: ['Firm X'],
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 65,
                        endLine: 234,
                        sourceId: '',
                        startColumn: 45,
                        startLine: 234,
                      },
                      values: ['Firm X & Co.'],
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      sourceInformation: {
                        endColumn: 92,
                        endLine: 234,
                        sourceId: '',
                        startColumn: 68,
                        startLine: 234,
                      },
                      values: ['Firm X and Group'],
                    },
                  ],
                },
              ],
              sourceInformation: {
                endColumn: 25,
                endLine: 234,
                sourceId: '',
                startColumn: 24,
                startLine: 234,
              },
            },
          ],
          name: 'isfirmXGroup',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Boolean',
        },
      ],
      superTypes: ['EntityWithAddress'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::EntityWithAddress',
    content: {
      _type: 'class',
      name: 'EntityWithAddress',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'address',
          type: 'Address',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::EntityWithLocations',
    content: {
      _type: 'class',
      name: 'EntityWithLocations',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'locations',
          type: 'Location',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'filter',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 13,
                        endLine: 252,
                        sourceId: '',
                        startColumn: 9,
                        startLine: 252,
                      },
                    },
                  ],
                  property: 'locations',
                  sourceInformation: {
                    endColumn: 23,
                    endLine: 252,
                    sourceId: '',
                    startColumn: 15,
                    startLine: 252,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'exists',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'types',
                          sourceInformation: {
                            endColumn: 42,
                            endLine: 252,
                            sourceId: '',
                            startColumn: 37,
                            startLine: 252,
                          },
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'func',
                              function: 'is',
                              parameters: [
                                {
                                  _type: 'property',
                                  parameters: [
                                    {
                                      _type: 'var',
                                      name: 'l',
                                      sourceInformation: {
                                        endColumn: 63,
                                        endLine: 252,
                                        sourceId: '',
                                        startColumn: 62,
                                        startLine: 252,
                                      },
                                    },
                                  ],
                                  property: 'type',
                                  sourceInformation: {
                                    endColumn: 68,
                                    endLine: 252,
                                    sourceId: '',
                                    startColumn: 65,
                                    startLine: 252,
                                  },
                                },
                                {
                                  _type: 'var',
                                  name: 'type',
                                  sourceInformation: {
                                    endColumn: 75,
                                    endLine: 252,
                                    sourceId: '',
                                    startColumn: 71,
                                    startLine: 252,
                                  },
                                },
                              ],
                              sourceInformation: {
                                endColumn: 60,
                                endLine: 252,
                                sourceId: '',
                                startColumn: 59,
                                startLine: 252,
                              },
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'type',
                            },
                          ],
                          sourceInformation: {
                            endColumn: 76,
                            endLine: 252,
                            sourceId: '',
                            startColumn: 57,
                            startLine: 252,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 50,
                        endLine: 252,
                        sourceId: '',
                        startColumn: 45,
                        startLine: 252,
                      },
                    },
                  ],
                  parameters: [
                    {
                      _type: 'var',
                      name: 'l',
                    },
                  ],
                  sourceInformation: {
                    endColumn: 77,
                    endLine: 252,
                    sourceId: '',
                    startColumn: 35,
                    startLine: 252,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 31,
                endLine: 252,
                sourceId: '',
                startColumn: 26,
                startLine: 252,
              },
            },
          ],
          name: 'locationsByType',
          parameters: [
            {
              _type: 'var',
              class: 'GeographicEntityType',
              multiplicity: {
                lowerBound: 0,
              },
              name: 'types',
              sourceInformation: {
                endColumn: 49,
                endLine: 250,
                sourceId: '',
                startColumn: 21,
                startLine: 250,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'Location',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::GeographicEntity',
    content: {
      _type: 'class',
      name: 'GeographicEntity',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'type',
          type: 'GeographicEntityType',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::relational::tests::mapping::union::extend::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'meta::relational::tests::mapping::union::extend',
      superTypes: ['meta::pure::tests::model::simple::Person'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::PersonExtension',
    content: {
      _type: 'class',
      name: 'PersonExtension',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'birthdate',
          type: 'Date',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'year',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 10,
                        endLine: 275,
                        sourceId: '',
                        startColumn: 6,
                        startLine: 275,
                      },
                    },
                  ],
                  property: 'birthdate',
                  sourceInformation: {
                    endColumn: 20,
                    endLine: 275,
                    sourceId: '',
                    startColumn: 12,
                    startLine: 275,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 26,
                endLine: 275,
                sourceId: '',
                startColumn: 23,
                startLine: 275,
              },
            },
          ],
          name: 'birthYear',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'Integer',
        },
      ],
      superTypes: ['meta::pure::tests::model::simple::Person'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::relational::tests::mapping::union::extend::Address',
    content: {
      _type: 'class',
      name: 'Address',
      package: 'meta::relational::tests::mapping::union::extend',
      superTypes: ['meta::pure::tests::model::simple::Address'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::relational::tests::mapping::union::extend::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'meta::relational::tests::mapping::union::extend',
      superTypes: ['meta::pure::tests::model::simple::Firm'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::FirmExtension',
    content: {
      _type: 'class',
      name: 'FirmExtension',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'establishedDate',
          type: 'Date',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employeesExt',
          type: 'meta::pure::tests::model::simple::PersonExtension',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'year',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 11,
                        endLine: 297,
                        sourceId: '',
                        startColumn: 7,
                        startLine: 297,
                      },
                    },
                  ],
                  property: 'establishedDate',
                  sourceInformation: {
                    endColumn: 27,
                    endLine: 297,
                    sourceId: '',
                    startColumn: 13,
                    startLine: 297,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 33,
                endLine: 297,
                sourceId: '',
                startColumn: 30,
                startLine: 297,
              },
            },
          ],
          name: 'establishedYear',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Integer',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'joinStrings',
              parameters: [
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 11,
                            endLine: 302,
                            sourceId: '',
                            startColumn: 7,
                            startLine: 302,
                          },
                        },
                      ],
                      property: 'employeesExt',
                      sourceInformation: {
                        endColumn: 24,
                        endLine: 302,
                        sourceId: '',
                        startColumn: 13,
                        startLine: 302,
                      },
                    },
                  ],
                  property: 'lastName',
                  sourceInformation: {
                    endColumn: 33,
                    endLine: 302,
                    sourceId: '',
                    startColumn: 26,
                    startLine: 302,
                  },
                },
                {
                  _type: 'string',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  sourceInformation: {
                    endColumn: 50,
                    endLine: 302,
                    sourceId: '',
                    startColumn: 48,
                    startLine: 302,
                  },
                  values: [','],
                },
              ],
              sourceInformation: {
                endColumn: 46,
                endLine: 302,
                sourceId: '',
                startColumn: 36,
                startLine: 302,
              },
            },
          ],
          name: 'allEmployeesLastName',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          returnType: 'String',
        },
      ],
      superTypes: ['Firm'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Organization',
    content: {
      _type: 'class',
      name: 'Organization',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
      ],
      qualifiedProperties: [
        {
          body: [
            {
              _type: 'func',
              function: 'letFunction',
              parameters: [
                {
                  _type: 'string',
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  values: ['parent'],
                },
                {
                  _type: 'property',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'this',
                      sourceInformation: {
                        endColumn: 26,
                        endLine: 313,
                        sourceId: '',
                        startColumn: 22,
                        startLine: 313,
                      },
                    },
                  ],
                  property: 'parent',
                  sourceInformation: {
                    endColumn: 33,
                    endLine: 313,
                    sourceId: '',
                    startColumn: 9,
                    startLine: 313,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 33,
                endLine: 313,
                sourceId: '',
                startColumn: 9,
                startLine: 313,
              },
            },
            {
              _type: 'func',
              function: 'if',
              parameters: [
                {
                  _type: 'func',
                  function: 'isEmpty',
                  parameters: [
                    {
                      _type: 'var',
                      name: 'parent',
                      sourceInformation: {
                        endColumn: 18,
                        endLine: 314,
                        sourceId: '',
                        startColumn: 12,
                        startLine: 314,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 27,
                    endLine: 314,
                    sourceId: '',
                    startColumn: 21,
                    startLine: 314,
                  },
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
                      sourceInformation: {
                        endColumn: 34,
                        endLine: 314,
                        sourceId: '',
                        startColumn: 33,
                        startLine: 314,
                      },
                      values: [],
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 34,
                    endLine: 314,
                    sourceId: '',
                    startColumn: 32,
                    startLine: 314,
                  },
                },
                {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'concatenate',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'parent',
                          sourceInformation: {
                            endColumn: 56,
                            endLine: 314,
                            sourceId: '',
                            startColumn: 50,
                            startLine: 314,
                          },
                        },
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'func',
                              function: 'toOne',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'parent',
                                  sourceInformation: {
                                    endColumn: 65,
                                    endLine: 314,
                                    sourceId: '',
                                    startColumn: 59,
                                    startLine: 314,
                                  },
                                },
                              ],
                              sourceInformation: {
                                endColumn: 72,
                                endLine: 314,
                                sourceId: '',
                                startColumn: 68,
                                startLine: 314,
                              },
                            },
                          ],
                          property: 'superOrganizations',
                          sourceInformation: {
                            endColumn: 93,
                            endLine: 314,
                            sourceId: '',
                            startColumn: 76,
                            startLine: 314,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 48,
                        endLine: 314,
                        sourceId: '',
                        startColumn: 38,
                        startLine: 314,
                      },
                    },
                  ],
                  parameters: [],
                  sourceInformation: {
                    endColumn: 96,
                    endLine: 314,
                    sourceId: '',
                    startColumn: 37,
                    startLine: 314,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 10,
                endLine: 314,
                sourceId: '',
                startColumn: 9,
                startLine: 314,
              },
            },
          ],
          name: 'superOrganizations',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'Organization',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'removeDuplicates',
              parameters: [
                {
                  _type: 'func',
                  function: 'concatenate',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 25,
                            endLine: 318,
                            sourceId: '',
                            startColumn: 21,
                            startLine: 318,
                          },
                        },
                      ],
                      property: 'children',
                      sourceInformation: {
                        endColumn: 34,
                        endLine: 318,
                        sourceId: '',
                        startColumn: 27,
                        startLine: 318,
                      },
                    },
                    {
                      _type: 'func',
                      function: 'map',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                              sourceInformation: {
                                endColumn: 41,
                                endLine: 318,
                                sourceId: '',
                                startColumn: 37,
                                startLine: 318,
                              },
                            },
                          ],
                          property: 'children',
                          sourceInformation: {
                            endColumn: 50,
                            endLine: 318,
                            sourceId: '',
                            startColumn: 43,
                            startLine: 318,
                          },
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'c',
                                  sourceInformation: {
                                    endColumn: 62,
                                    endLine: 318,
                                    sourceId: '',
                                    startColumn: 61,
                                    startLine: 318,
                                  },
                                },
                              ],
                              property: 'subOrganizations',
                              sourceInformation: {
                                endColumn: 79,
                                endLine: 318,
                                sourceId: '',
                                startColumn: 64,
                                startLine: 318,
                              },
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'c',
                            },
                          ],
                          sourceInformation: {
                            endColumn: 81,
                            endLine: 318,
                            sourceId: '',
                            startColumn: 59,
                            startLine: 318,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 55,
                        endLine: 318,
                        sourceId: '',
                        startColumn: 53,
                        startLine: 318,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 19,
                    endLine: 318,
                    sourceId: '',
                    startColumn: 9,
                    startLine: 318,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 101,
                endLine: 318,
                sourceId: '',
                startColumn: 86,
                startLine: 318,
              },
            },
          ],
          name: 'subOrganizations',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'Organization',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'toOne',
              parameters: [
                {
                  _type: 'func',
                  function: 'filter',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 13,
                            endLine: 322,
                            sourceId: '',
                            startColumn: 9,
                            startLine: 322,
                          },
                        },
                      ],
                      property: 'children',
                      sourceInformation: {
                        endColumn: 22,
                        endLine: 322,
                        sourceId: '',
                        startColumn: 15,
                        startLine: 322,
                      },
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
                                  name: 'c',
                                  sourceInformation: {
                                    endColumn: 37,
                                    endLine: 322,
                                    sourceId: '',
                                    startColumn: 36,
                                    startLine: 322,
                                  },
                                },
                              ],
                              property: 'name',
                              sourceInformation: {
                                endColumn: 42,
                                endLine: 322,
                                sourceId: '',
                                startColumn: 39,
                                startLine: 322,
                              },
                            },
                            {
                              _type: 'var',
                              name: 'name',
                              sourceInformation: {
                                endColumn: 51,
                                endLine: 322,
                                sourceId: '',
                                startColumn: 47,
                                startLine: 322,
                              },
                            },
                          ],
                          sourceInformation: {
                            endColumn: 45,
                            endLine: 322,
                            sourceId: '',
                            startColumn: 44,
                            startLine: 322,
                          },
                        },
                      ],
                      parameters: [
                        {
                          _type: 'var',
                          name: 'c',
                        },
                      ],
                      sourceInformation: {
                        endColumn: 51,
                        endLine: 322,
                        sourceId: '',
                        startColumn: 34,
                        startLine: 322,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 30,
                    endLine: 322,
                    sourceId: '',
                    startColumn: 25,
                    startLine: 322,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 59,
                endLine: 322,
                sourceId: '',
                startColumn: 55,
                startLine: 322,
              },
            },
          ],
          name: 'child',
          parameters: [
            {
              _type: 'var',
              class: 'String',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
              name: 'name',
              sourceInformation: {
                endColumn: 24,
                endLine: 320,
                sourceId: '',
                startColumn: 11,
                startLine: 320,
              },
            },
          ],
          returnMultiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          returnType: 'Organization',
        },
        {
          body: [
            {
              _type: 'func',
              function: 'removeDuplicates',
              parameters: [
                {
                  _type: 'func',
                  function: 'concatenate',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                          sourceInformation: {
                            endColumn: 25,
                            endLine: 326,
                            sourceId: '',
                            startColumn: 21,
                            startLine: 326,
                          },
                        },
                      ],
                      property: 'members',
                      sourceInformation: {
                        endColumn: 33,
                        endLine: 326,
                        sourceId: '',
                        startColumn: 27,
                        startLine: 326,
                      },
                    },
                    {
                      _type: 'func',
                      function: 'map',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                              sourceInformation: {
                                endColumn: 40,
                                endLine: 326,
                                sourceId: '',
                                startColumn: 36,
                                startLine: 326,
                              },
                            },
                          ],
                          property: 'subOrganizations',
                          sourceInformation: {
                            endColumn: 57,
                            endLine: 326,
                            sourceId: '',
                            startColumn: 42,
                            startLine: 326,
                          },
                        },
                        {
                          _type: 'lambda',
                          body: [
                            {
                              _type: 'property',
                              parameters: [
                                {
                                  _type: 'var',
                                  name: 'o',
                                  sourceInformation: {
                                    endColumn: 71,
                                    endLine: 326,
                                    sourceId: '',
                                    startColumn: 70,
                                    startLine: 326,
                                  },
                                },
                              ],
                              property: 'members',
                              sourceInformation: {
                                endColumn: 79,
                                endLine: 326,
                                sourceId: '',
                                startColumn: 73,
                                startLine: 326,
                              },
                            },
                          ],
                          parameters: [
                            {
                              _type: 'var',
                              name: 'o',
                            },
                          ],
                          sourceInformation: {
                            endColumn: 79,
                            endLine: 326,
                            sourceId: '',
                            startColumn: 68,
                            startLine: 326,
                          },
                        },
                      ],
                      sourceInformation: {
                        endColumn: 64,
                        endLine: 326,
                        sourceId: '',
                        startColumn: 62,
                        startLine: 326,
                      },
                    },
                  ],
                  sourceInformation: {
                    endColumn: 19,
                    endLine: 326,
                    sourceId: '',
                    startColumn: 9,
                    startLine: 326,
                  },
                },
              ],
              sourceInformation: {
                endColumn: 99,
                endLine: 326,
                sourceId: '',
                startColumn: 84,
                startLine: 326,
              },
            },
          ],
          name: 'allMembers',
          parameters: [],
          returnMultiplicity: {
            lowerBound: 0,
          },
          returnType: 'Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Bridge',
    content: {
      _type: 'class',
      name: 'Bridge',
      package: 'meta::pure::tests::model::simple',
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::PersonNameParameter',
    content: {
      _type: 'class',
      name: 'PersonNameParameter',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'lastNameFirst',
          type: 'Boolean',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'nested',
          type: 'PersonNameParameterNested',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Location',
    content: {
      _type: 'class',
      name: 'Location',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'place',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'censusdate',
          type: 'Date',
        },
      ],
      superTypes: ['GeographicEntity'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Division',
    content: {
      _type: 'class',
      name: 'Division',
      package: 'meta::pure::tests::model::simple',
      superTypes: ['Organization'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Department',
    content: {
      _type: 'class',
      name: 'Department',
      package: 'meta::pure::tests::model::simple',
      superTypes: ['Organization'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Team',
    content: {
      _type: 'class',
      name: 'Team',
      package: 'meta::pure::tests::model::simple',
      superTypes: ['Organization'],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::PersonNameParameterNested',
    content: {
      _type: 'class',
      name: 'PersonNameParameterNested',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'prefix',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::PlaceOfInterest',
    content: {
      _type: 'class',
      name: 'PlaceOfInterest',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'meta::pure::tests::model::simple::Employment',
    content: {
      _type: 'association',
      name: 'Employment',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'firm',
          type: 'Firm',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employees',
          type: 'Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::FirmCEO',
    content: {
      _type: 'association',
      name: 'FirmCEO',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'ceoFirm',
          type: 'Firm',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'ceo',
          type: 'Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::Membership',
    content: {
      _type: 'association',
      name: 'Membership',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'organizations',
          type: 'Organization',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'members',
          type: 'Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::BridgeAsso1',
    content: {
      _type: 'association',
      name: 'BridgeAsso1',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'bridge',
          type: 'Bridge',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'employees',
          type: 'Person',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::AddressLocation',
    content: {
      _type: 'association',
      name: 'AddressLocation',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'location',
          type: 'Location',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'addresses',
          type: 'Address',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::FirmOrganizations',
    content: {
      _type: 'association',
      name: 'FirmOrganizations',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firm',
          type: 'Firm',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'organizations',
          type: 'Organization',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::BridgeAsso2',
    content: {
      _type: 'association',
      name: 'BridgeAsso2',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'bridge',
          type: 'Bridge',
        },
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'firm',
          type: 'Firm',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::SubOrganization',
    content: {
      _type: 'association',
      name: 'SubOrganization',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 0,
            upperBound: 1,
          },
          name: 'parent',
          type: 'Organization',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'children',
          type: 'Organization',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::PlacesOfInterest',
    content: {
      _type: 'association',
      name: 'PlacesOfInterest',
      package: 'meta::pure::tests::model::simple',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'location',
          type: 'Location',
        },
        {
          multiplicity: {
            lowerBound: 0,
          },
          name: 'placeOfInterest',
          type: 'PlaceOfInterest',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::relationship::Association',
  },
  {
    path: 'meta::pure::tests::model::simple::GeographicEntityType',
    content: {
      _type: 'Enumeration',
      name: 'GeographicEntityType',
      package: 'meta::pure::tests::model::simple',
      values: [
        {
          taggedValues: [
            {
              tag: {
                profile: 'doc',
                value: 'doc',
              },
              value: 'A city, town, village, or other urban area.',
            },
          ],
          value: 'CITY',
        },
        {
          stereotypes: [
            {
              profile: 'doc',
              value: 'deprecated',
            },
          ],
          value: 'COUNTRY',
        },
        {
          taggedValues: [
            {
              tag: {
                profile: 'doc',
                value: 'doc',
              },
              value: 'Any geographic entity other than a city or country.',
            },
          ],
          value: 'REGION',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
  },
  {
    path: 'meta::relational::tests::mapping::embedded::model::store::myDB',
    content: {
      _type: 'relational',
      filters: [],
      joins: [
        {
          name: 'firmEmployees',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'FIRM_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'PERSON_FIRM_DENORM',
                },
                tableAlias: 'PERSON_FIRM_DENORM',
              },
              {
                _type: 'column',
                column: 'FIRM_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'PERSON_FIRM_DENORM',
                },
                tableAlias: 't_PERSON_FIRM_DENORM',
              },
            ],
          },
          target: 't_PERSON_FIRM_DENORM',
        },
        {
          name: 'personFirmOther',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'FIRM_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'PERSON_FIRM_DENORM',
                },
                tableAlias: 'PERSON_FIRM_DENORM',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'FIRM_OTHER',
                },
                tableAlias: 'FIRM_OTHER',
              },
            ],
          },
        },
        {
          name: 'personFirmMiddle',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'FIRM_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'PERSON_FIRM_DENORM',
                },
                tableAlias: 'PERSON_FIRM_DENORM',
              },
              {
                _type: 'column',
                column: 'FIRM_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'FIRM_MIDDLETABLE',
                },
                tableAlias: 'FIRM_MIDDLETABLE',
              },
            ],
          },
        },
        {
          name: 'middleAddress',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'ADDRESS_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'FIRM_MIDDLETABLE',
                },
                tableAlias: 'FIRM_MIDDLETABLE',
              },
              {
                _type: 'column',
                column: 'ADDRESS_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'ADDRESSES',
                },
                tableAlias: 'ADDRESSES',
              },
            ],
          },
        },
        {
          name: 'Firm_Organizations',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'FIRM_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'PERSON_FIRM_DENORM',
                },
                tableAlias: 'PERSON_FIRM_DENORM',
              },
              {
                _type: 'column',
                column: 'FIRM_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'ORGANIZATIONS',
                },
                tableAlias: 'ORGANIZATIONS',
              },
            ],
          },
        },
        {
          name: 'Firm_Address_location',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'FIRM_ADDRESS_NAME',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'PERSON_FIRM_DENORM',
                },
                tableAlias: 'PERSON_FIRM_DENORM',
              },
              {
                _type: 'column',
                column: 'ADDRESS_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'ADDRESS_LOCATION',
                },
                tableAlias: 'ADDRESS_LOCATION',
              },
            ],
          },
        },
        {
          name: 'Address_location',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'LOCATION_ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'ADDRESS_LOCATION',
                },
                tableAlias: 'ADDRESS_LOCATION',
              },
              {
                _type: 'column',
                column: 'ID',
                table: {
                  _type: 'Table',
                  database:
                    'meta::relational::tests::mapping::embedded::model::store::myDB',
                  schema: 'default',
                  table: 'LOCATIONS',
                },
                tableAlias: 'LOCATIONS',
              },
            ],
          },
        },
      ],
      name: 'myDB',
      package: 'meta::relational::tests::mapping::embedded::model::store',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'PERSON_ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'PERSON_FIRSTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'PERSON_LASTNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'PERSON_ADDRESS_NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'PERSON_ADDRESS_TYPE',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'PERSON_AGE',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRM_ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRM_LEGALNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'FIRM_ADDRESS_NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'FIRM_ADDRESS_TYPE',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'PERSON_FIRM_DENORM',
              primaryKey: ['PERSON_ID', 'FIRM_ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'BETTER_LEGALNAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'FIRM_OTHER',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ID1',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'ID2',
                  nullable: false,
                  type: {
                    _type: 'Timestamp',
                  },
                },
                {
                  name: 'ID3',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'PROP_STRING',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'PROP_INT',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'DATA_WITH_TIMESTAMPS_KEYS',
              primaryKey: ['ID1', 'ID2'],
            },
            {
              columns: [
                {
                  name: 'FIRM_ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'ADDRESS_ID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'FIRM_MIDDLETABLE',
              primaryKey: ['FIRM_ID'],
            },
            {
              columns: [
                {
                  name: 'ADDRESS_ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'TYPE',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'ADDRESSES',
              primaryKey: ['ADDRESS_ID'],
            },
            {
              columns: [
                {
                  name: 'ORG_ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'FIRM_ID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'NAME',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'ORGANIZATIONS',
              primaryKey: ['ORG_ID'],
            },
            {
              columns: [
                {
                  name: 'ID',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'PLACE',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'LOCATIONS',
              primaryKey: ['ID'],
            },
            {
              columns: [
                {
                  name: 'ADDRESS_ID',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'LOCATION_ID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
              ],
              name: 'ADDRESS_LOCATION',
              primaryKey: [],
            },
          ],
          views: [],
        },
      ],
      includedStores: [],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'meta::pure::functions::io::tests::http::testService',
    content: {
      _type: 'serviceStore',
      name: 'testService',
      package: 'meta::pure::functions::io::tests::http',
      docLink: 'testSeviceConnection',
    },
    classifierPath: 'meta::servicestore::metamodel::ServiceStore',
  },
  {
    path: 'meta::relational::tests::mapping::embedded::model::mapping::testMappingEmbedded',
    content: {
      _type: 'mapping',
      includedMappings: [],
      classMappings: [
        {
          _type: 'relational',
          class: 'Person',
          distinct: false,
          mainTable: {
            _type: 'Table',
            database: 'myDB',
            schema: 'default',
            table: 'PERSON_FIRM_DENORM',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'PERSON_ID',
              table: {
                _type: 'Table',
                database: 'myDB',
                schema: 'default',
                table: 'PERSON_FIRM_DENORM',
              },
              tableAlias: '',
            },
            {
              _type: 'column',
              column: 'FIRM_ID',
              table: {
                _type: 'Table',
                database: 'myDB',
                schema: 'default',
                table: 'PERSON_FIRM_DENORM',
              },
              tableAlias: '',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Person',
                property: 'firstName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'PERSON_FIRSTNAME',
                table: {
                  _type: 'Table',
                  database: 'myDB',
                  schema: 'default',
                  table: 'PERSON_FIRM_DENORM',
                },
                tableAlias: 'PERSON_FIRM_DENORM',
              },
              source: 'meta_pure_tests_model_simple_Person',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Person',
                property: 'lastName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'PERSON_LASTNAME',
                table: {
                  _type: 'Table',
                  database: 'myDB',
                  schema: 'default',
                  table: 'PERSON_FIRM_DENORM',
                },
                tableAlias: 'PERSON_FIRM_DENORM',
              },
              source: 'meta_pure_tests_model_simple_Person',
            },
            {
              _type: 'embeddedPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::Person',
                property: 'firm',
              },
              source: 'meta_pure_tests_model_simple_Person',
              classMapping: {
                _type: 'embedded',
                class: 'meta::pure::tests::model::simple::Firm',
                id: 'meta_pure_tests_model_simple_Person_firm',
                primaryKey: [],
                propertyMappings: [
                  {
                    _type: 'relationalPropertyMapping',
                    property: {
                      class: 'meta::pure::tests::model::simple::Firm',
                      property: 'legalName',
                    },
                    relationalOperation: {
                      _type: 'column',
                      column: 'FIRM_LEGALNAME',
                      table: {
                        _type: 'Table',
                        database: 'myDB',
                        schema: 'default',
                        table: 'PERSON_FIRM_DENORM',
                      },
                      tableAlias: 'PERSON_FIRM_DENORM',
                    },
                    source: 'meta_pure_tests_model_simple_Person',
                  },
                  {
                    _type: 'embeddedPropertyMapping',
                    property: {
                      class:
                        'meta::pure::tests::model::simple::EntityWithAddress',
                      property: 'address',
                    },
                    source: 'meta_pure_tests_model_simple_Person',
                    classMapping: {
                      _type: 'embedded',
                      class: 'meta::pure::tests::model::simple::Address',
                      id: 'meta_pure_tests_model_simple_Person_firm_address',
                      primaryKey: [],
                      propertyMappings: [
                        {
                          _type: 'relationalPropertyMapping',
                          property: {
                            class: 'meta::pure::tests::model::simple::Address',
                            property: 'name',
                          },
                          relationalOperation: {
                            _type: 'column',
                            column: 'FIRM_ADDRESS_NAME',
                            table: {
                              _type: 'Table',
                              database: 'myDB',
                              schema: 'default',
                              table: 'PERSON_FIRM_DENORM',
                            },
                            tableAlias: 'PERSON_FIRM_DENORM',
                          },
                          source: 'meta_pure_tests_model_simple_Person',
                        },
                        {
                          _type: 'relationalPropertyMapping',
                          enumMappingId: 'GE',
                          property: {
                            class:
                              'meta::pure::tests::model::simple::GeographicEntity',
                            property: 'type',
                          },
                          relationalOperation: {
                            _type: 'column',
                            column: 'FIRM_ADDRESS_TYPE',
                            table: {
                              _type: 'Table',
                              database: 'myDB',
                              schema: 'default',
                              table: 'PERSON_FIRM_DENORM',
                            },
                            tableAlias: 'PERSON_FIRM_DENORM',
                          },
                          source: 'meta_pure_tests_model_simple_Person',
                        },
                      ],
                      root: false,
                    },
                  },
                  {
                    _type: 'relationalPropertyMapping',
                    property: {
                      class: 'meta::pure::tests::model::simple::Firm',
                      property: 'employees',
                    },
                    relationalOperation: {
                      _type: 'elemtWithJoins',
                      joins: [
                        {
                          db: 'myDB',
                          name: 'firmEmployees',
                        },
                      ],
                    },
                    source: 'meta_pure_tests_model_simple_Person',
                  },
                ],
                root: false,
              },
            },
            {
              _type: 'embeddedPropertyMapping',
              property: {
                class: 'meta::pure::tests::model::simple::EntityWithAddress',
                property: 'address',
              },
              source: 'meta_pure_tests_model_simple_Person',
              classMapping: {
                _type: 'embedded',
                class: 'meta::pure::tests::model::simple::Address',
                id: 'meta_pure_tests_model_simple_Person_address',
                primaryKey: [],
                propertyMappings: [
                  {
                    _type: 'relationalPropertyMapping',
                    property: {
                      class: 'meta::pure::tests::model::simple::Address',
                      property: 'name',
                    },
                    relationalOperation: {
                      _type: 'column',
                      column: 'PERSON_ADDRESS_NAME',
                      table: {
                        _type: 'Table',
                        database: 'myDB',
                        schema: 'default',
                        table: 'PERSON_FIRM_DENORM',
                      },
                      tableAlias: 'PERSON_FIRM_DENORM',
                    },
                    source: 'meta_pure_tests_model_simple_Person',
                  },
                  {
                    _type: 'relationalPropertyMapping',
                    enumMappingId: 'GE',
                    property: {
                      class:
                        'meta::pure::tests::model::simple::GeographicEntity',
                      property: 'type',
                    },
                    relationalOperation: {
                      _type: 'column',
                      column: 'PERSON_ADDRESS_TYPE',
                      table: {
                        _type: 'Table',
                        database: 'myDB',
                        schema: 'default',
                        table: 'PERSON_FIRM_DENORM',
                      },
                      tableAlias: 'PERSON_FIRM_DENORM',
                    },
                    source: 'meta_pure_tests_model_simple_Person',
                  },
                ],
                root: false,
              },
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [
        {
          enumValueMappings: [
            {
              enumValue: 'CITY',
              sourceValues: [
                {
                  _type: 'integerSourceValue',
                  value: 1,
                },
              ],
            },
            {
              enumValue: 'REGION',
              sourceValues: [
                {
                  _type: 'integerSourceValue',
                  value: 2,
                },
              ],
            },
          ],
          enumeration: 'GeographicEntityType',
          id: 'GE',
        },
      ],
      name: 'testMappingEmbedded',
      package: 'meta::relational::tests::mapping::embedded::model::mapping',
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
          elements: [],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [
            'meta::relational::tests::mapping::embedded::model::store',
            'meta::pure::tests::model::simple',
          ],
          elements: [
            'meta::relational::tests::mapping::embedded::model::mapping::testMappingEmbedded',
          ],
          parserName: 'Mapping',
        },
        {
          _type: 'default',
          elements: [
            'meta::relational::tests::mapping::embedded::model::store::myDB',
          ],
          parserName: 'Relational',
        },
        {
          _type: 'default',
          elements: ['meta::pure::functions::io::tests::http::testService'],
          parserName: 'ServiceStore',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Person'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Address'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Firm'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::EntityWithAddress'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::EntityWithLocations'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::GeographicEntity'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['meta::relational::tests::mapping::union::extend::Person'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::PersonExtension'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: [
            'meta::relational::tests::mapping::union::extend::Address',
          ],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: [],
          elements: ['meta::relational::tests::mapping::union::extend::Firm'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::FirmExtension'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Organization'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Bridge'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::PersonNameParameter'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Location'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Division'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Department'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Team'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: [
            'meta::pure::tests::model::simple::PersonNameParameterNested',
          ],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::PlaceOfInterest'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::GeographicEntityType'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Employment'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::FirmCEO'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::Membership'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::BridgeAsso1'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::AddressLocation'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::FirmOrganizations'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::BridgeAsso2'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::SubOrganization'],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['meta::pure::profiles', 'meta::pure::tests::model::simple'],
          elements: ['meta::pure::tests::model::simple::PlacesOfInterest'],
          parserName: 'Pure',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];

export const otherwiseEmbeddedRelational = [
  {
    path: 'other::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'other',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firm',
          type: 'Firm',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'other::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'other',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legalName',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'otherInformation',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'mapping::db',
    content: {
      _type: 'relational',
      filters: [],
      joins: [
        {
          name: 'PersonFirmJoin',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'firmId',
                table: {
                  _type: 'Table',
                  database: 'mapping::db',
                  schema: 'default',
                  table: 'employeeFirmDenormTable',
                },
                tableAlias: 'employeeFirmDenormTable',
              },
              {
                _type: 'column',
                column: 'id',
                table: {
                  _type: 'Table',
                  database: 'mapping::db',
                  schema: 'default',
                  table: 'FirmInfoTable',
                },
                tableAlias: 'FirmInfoTable',
              },
            ],
          },
        },
      ],
      name: 'db',
      package: 'mapping',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'id',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'name',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'firmId',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'legalName',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'address1',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'postcode',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 10,
                  },
                },
              ],
              name: 'employeeFirmDenormTable',
              primaryKey: ['id'],
            },
            {
              columns: [
                {
                  name: 'id',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'name',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'other',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
              ],
              name: 'FirmInfoTable',
              primaryKey: ['id'],
            },
          ],
          views: [],
        },
      ],
      includedStores: [],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'mappingPackage::myMapping',
    content: {
      _type: 'mapping',
      includedMappings: [],
      classMappings: [
        {
          _type: 'relational',
          class: 'Firm',
          distinct: false,
          id: 'firm1',
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'FirmInfoTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'id',
              table: {
                _type: 'Table',
                database: 'db',
                schema: 'default',
                table: 'FirmInfoTable',
              },
              tableAlias: '',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'other::Firm',
                property: 'legalName',
              },
              relationalOperation: {
                _type: 'column',
                column: 'name',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'FirmInfoTable',
                },
                tableAlias: 'FirmInfoTable',
              },
              source: 'firm1',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'other::Firm',
                property: 'otherInformation',
              },
              relationalOperation: {
                _type: 'column',
                column: 'other',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'FirmInfoTable',
                },
                tableAlias: 'FirmInfoTable',
              },
              source: 'firm1',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'Person',
          distinct: false,
          id: 'alias1',
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'employeeFirmDenormTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'id',
              table: {
                _type: 'Table',
                database: 'db',
                schema: 'default',
                table: 'employeeFirmDenormTable',
              },
              tableAlias: '',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'other::Person',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'name',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'employeeFirmDenormTable',
                },
                tableAlias: 'employeeFirmDenormTable',
              },
              source: 'alias1',
            },
            {
              _type: 'otherwiseEmbeddedPropertyMapping',
              property: {
                class: 'other::Person',
                property: 'firm',
              },
              source: 'alias1',
              classMapping: {
                _type: 'embedded',
                class: 'other::Firm',
                id: 'alias1_firm',
                primaryKey: [
                  {
                    _type: 'column',
                    column: 'legalName',
                    table: {
                      _type: 'Table',
                      database: 'db',
                      schema: 'default',
                      table: 'employeeFirmDenormTable',
                    },
                    tableAlias: 'employeeFirmDenormTable',
                  },
                ],
                propertyMappings: [
                  {
                    _type: 'relationalPropertyMapping',
                    property: {
                      class: 'other::Firm',
                      property: 'legalName',
                    },
                    relationalOperation: {
                      _type: 'column',
                      column: 'legalName',
                      table: {
                        _type: 'Table',
                        database: 'db',
                        schema: 'default',
                        table: 'employeeFirmDenormTable',
                      },
                      tableAlias: 'employeeFirmDenormTable',
                    },
                    source: 'alias1',
                  },
                ],
                root: false,
              },
              otherwisePropertyMapping: {
                _type: 'relationalPropertyMapping',
                property: {
                  class: 'other::Person',
                  property: 'firm',
                },
                relationalOperation: {
                  _type: 'elemtWithJoins',
                  joins: [
                    {
                      db: 'db',
                      name: 'PersonFirmJoin',
                    },
                  ],
                },
                source: 'alias1',
                target: 'firm1',
              },
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [],
      name: 'myMapping',
      package: 'mappingPackage',
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
          imports: ['other'],
          elements: ['other::Person', 'other::Firm'],
          parserName: 'Pure',
        },
        {
          _type: 'default',
          elements: ['mapping::db'],
          parserName: 'Relational',
        },
        {
          _type: 'importAware',
          imports: ['other', 'mapping'],
          elements: ['mappingPackage::myMapping'],
          parserName: 'Mapping',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];

// TODO
export const inlineEmbeddedRelational = [
  {
    path: 'other::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'other',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'address',
          type: 'Address',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'firm',
          type: 'Firm',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'other::Firm',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'other',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'legalName',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'other::Address',
    content: {
      _type: 'class',
      name: 'Address',
      package: 'other',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'line1',
          type: 'String',
        },
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'postcode',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'mapping::db',
    content: {
      _type: 'relational',
      filters: [],
      joins: [],
      name: 'db',
      package: 'mapping',
      schemas: [
        {
          name: 'default',
          tables: [
            {
              columns: [
                {
                  name: 'id',
                  nullable: false,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'name',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'firmId',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'legalName',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'address1',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 200,
                  },
                },
                {
                  name: 'postcode',
                  nullable: true,
                  type: {
                    _type: 'Varchar',
                    size: 10,
                  },
                },
              ],
              name: 'employeeFirmDenormTable',
              primaryKey: ['id'],
            },
          ],
          views: [],
        },
      ],
      includedStores: [],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'mappingPackage::myMapping',
    content: {
      _type: 'mapping',
      includedMappings: [],
      classMappings: [
        {
          _type: 'relational',
          class: 'Address',
          distinct: false,
          id: 'alias2',
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'employeeFirmDenormTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'id',
              table: {
                _type: 'Table',
                database: 'db',
                schema: 'default',
                table: 'employeeFirmDenormTable',
              },
              tableAlias: '',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'other::Address',
                property: 'line1',
              },
              relationalOperation: {
                _type: 'column',
                column: 'address1',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'employeeFirmDenormTable',
                },
                tableAlias: 'employeeFirmDenormTable',
              },
              source: 'alias2',
            },
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'other::Address',
                property: 'postcode',
              },
              relationalOperation: {
                _type: 'column',
                column: 'postcode',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'employeeFirmDenormTable',
                },
                tableAlias: 'employeeFirmDenormTable',
              },
              source: 'alias2',
            },
          ],
          root: false,
        },
        {
          _type: 'relational',
          class: 'Person',
          distinct: false,
          id: 'alias1',
          mainTable: {
            _type: 'Table',
            database: 'db',
            schema: 'default',
            table: 'employeeFirmDenormTable',
          },
          primaryKey: [
            {
              _type: 'column',
              column: 'id',
              table: {
                _type: 'Table',
                database: 'db',
                schema: 'default',
                table: 'employeeFirmDenormTable',
              },
              tableAlias: '',
            },
          ],
          propertyMappings: [
            {
              _type: 'relationalPropertyMapping',
              property: {
                class: 'other::Person',
                property: 'name',
              },
              relationalOperation: {
                _type: 'column',
                column: 'name',
                table: {
                  _type: 'Table',
                  database: 'db',
                  schema: 'default',
                  table: 'employeeFirmDenormTable',
                },
                tableAlias: 'employeeFirmDenormTable',
              },
              source: 'alias1',
            },
            {
              _type: 'embeddedPropertyMapping',
              property: {
                class: 'other::Person',
                property: 'firm',
              },
              source: 'alias1',
              classMapping: {
                _type: 'embedded',
                class: 'other::Firm',
                id: 'alias1_firm',
                primaryKey: [
                  {
                    _type: 'column',
                    column: 'legalName',
                    table: {
                      _type: 'Table',
                      database: 'db',
                      schema: 'default',
                      table: 'employeeFirmDenormTable',
                    },
                    tableAlias: 'employeeFirmDenormTable',
                  },
                ],
                propertyMappings: [
                  {
                    _type: 'relationalPropertyMapping',
                    property: {
                      class: 'other::Firm',
                      property: 'legalName',
                    },
                    relationalOperation: {
                      _type: 'column',
                      column: 'legalName',
                      table: {
                        _type: 'Table',
                        database: 'db',
                        schema: 'default',
                        table: 'employeeFirmDenormTable',
                      },
                      tableAlias: 'employeeFirmDenormTable',
                    },
                    source: 'alias1',
                  },
                ],
                root: false,
              },
            },
            {
              _type: 'inlineEmbeddedPropertyMapping',
              property: {
                class: 'other::Person',
                property: 'address',
              },
              source: 'alias1',
              id: '[object Object]_address',
              setImplementationId: 'alias2',
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [],
      name: 'myMapping',
      package: 'mappingPackage',
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
          elements: [],
          parserName: 'Pure',
        },
        {
          _type: 'importAware',
          imports: ['other'],
          elements: ['other::Person', 'other::Firm', 'other::Address'],
          parserName: 'Pure',
        },
        {
          _type: 'default',
          elements: ['mapping::db'],
          parserName: 'Relational',
        },
        {
          _type: 'importAware',
          imports: ['other', 'mapping'],
          elements: ['mappingPackage::myMapping'],
          parserName: 'Mapping',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::section::SectionIndex',
  },
];
