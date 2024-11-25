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

export const TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndProcessingTemporalTarget =
  {
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
                fullPath: 'my::Person',
              },
              {
                _type: 'var',
                name: 'businessDate',
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
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                          {
                            _type: 'var',
                            name: 'processingDate',
                          },
                        ],
                        property: 'processingTemporal',
                      },
                    ],
                    property: 'firmID',
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
                value: 'Processing Temporal/Firmid',
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
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        name: 'businessDate',
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
      },
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        name: 'processingDate',
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
      },
    ],
  };

export const TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBusinessTemporalTarget =
  {
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
                fullPath: 'my::Person',
              },
              {
                _type: 'var',
                name: 'businessDate',
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
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                        ],
                        property: 'businessTemporal',
                      },
                    ],
                    property: 'date',
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
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            values: [
              {
                _type: 'string',
                value: 'Business Temporal/Date',
              },
            ],
          },
        ],
      },
    ],
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        name: 'businessDate',
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
      },
    ],
  };

export const TEST_DATA__simpleProjectionWithBusinessTemporalSourceAndBiTemporalTarget =
  {
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
                fullPath: 'my::Person',
              },
              {
                _type: 'var',
                name: 'businessDate',
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
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                          {
                            _type: 'var',
                            name: 'processingDate',
                          },
                          {
                            _type: 'var',
                            name: 'businessDate',
                          },
                        ],
                        property: 'biTemporal',
                      },
                    ],
                    property: 'firmID',
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
                value: 'Bi Temporal/Firmid',
              },
            ],
          },
        ],
      },
    ],
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        name: 'businessDate',
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
      },
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        name: 'processingDate',
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
      },
    ],
  };

export const TEST_DATA__simpleProjectionWithBiTemporalSourceAndBiTemporalTarget =
  {
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
                fullPath: 'my::Person1',
              },
              {
                _type: 'var',
                name: 'processingDate',
              },
              {
                _type: 'var',
                name: 'businessDate',
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
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                        ],
                        property: 'biTemporal',
                      },
                    ],
                    property: 'firmID',
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
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            values: [
              {
                _type: 'string',
                value: 'Bi Temporal/Firmid',
              },
            ],
          },
        ],
      },
    ],
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'businessDate',
      },
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'processingDate',
      },
    ],
  };

export const TEST_DATA__simpleProjectionWithBiTemporalSourceAndBusinessTemporalTarget =
  {
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
                fullPath: 'my::Person1',
              },
              {
                _type: 'var',
                name: 'processingDate',
              },
              {
                _type: 'var',
                name: 'businessDate',
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
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                        ],
                        property: 'businessTemporal',
                      },
                    ],
                    property: 'date',
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
                value: 'Business Temporal/Date',
              },
            ],
          },
        ],
      },
    ],
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        name: 'businessDate',
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
      },
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        name: 'processingDate',
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
      },
    ],
  };

export const TEST_DATA__simpleProjectionWithBiTemporalSourceAndProcessingTemporalTarget =
  {
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
                fullPath: 'my::Person1',
              },
              {
                _type: 'var',
                name: 'processingDate',
              },
              {
                _type: 'var',
                name: 'businessDate',
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
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                        ],
                        property: 'processingTemporal',
                      },
                    ],
                    property: 'firmID',
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
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            values: [
              {
                _type: 'string',
                value: 'Processing Temporal/Firmid',
              },
            ],
          },
        ],
      },
    ],
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        name: 'businessDate',
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
      },
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        name: 'processingDate',
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
      },
    ],
  };

export const TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndBiTemporalTarget =
  {
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
                fullPath: 'my::Person2',
              },
              {
                _type: 'var',
                name: 'processingDate',
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
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                          {
                            _type: 'var',
                            name: 'processingDate',
                          },
                          {
                            _type: 'var',
                            name: 'businessDate',
                          },
                        ],
                        property: 'biTemporal',
                      },
                    ],
                    property: 'firmID',
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
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            values: [
              {
                _type: 'string',
                value: 'Bi Temporal/Firmid',
              },
            ],
          },
        ],
      },
    ],
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        name: 'businessDate',
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
      },
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        name: 'processingDate',
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
      },
    ],
  };

export const TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndBusinessTemporalTarget =
  {
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
                fullPath: 'my::Person2',
              },
              {
                _type: 'var',
                name: 'processingDate',
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
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                          {
                            _type: 'var',
                            name: 'businessDate',
                          },
                        ],
                        property: 'businessTemporal',
                      },
                    ],
                    property: 'firmID',
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
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            values: [
              {
                _type: 'string',
                value: 'Business Temporal/Firmid',
              },
            ],
          },
        ],
      },
    ],
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        name: 'businessDate',
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
      },
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        name: 'processingDate',
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
      },
    ],
  };

export const TEST_DATA__simpleProjectionWithProcessingTemporalSourceAndProcessingTemporalTarget =
  {
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
                fullPath: 'my::Person2',
              },
              {
                _type: 'var',
                name: 'processingDate',
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
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                        ],
                        property: 'processingTemporal',
                      },
                    ],
                    property: 'firmID',
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
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            values: [
              {
                _type: 'string',
                value: 'Processing Temporal/Firmid',
              },
            ],
          },
        ],
      },
    ],
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        name: 'processingDate',
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
      },
    ],
  };

export const TEST_DATA__simpleProjectionWithNonTemporalSourceAndProcessingTemporalTarget =
  {
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
                          {
                            _type: 'var',
                            name: 'processingDate',
                          },
                        ],
                        property: 'processingTemporal',
                      },
                    ],
                    property: 'firmID',
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
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            values: [
              {
                _type: 'string',
                value: 'Processing Temporal/Firmid',
              },
            ],
          },
        ],
      },
    ],
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        name: 'processingDate',
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
      },
    ],
  };

export const TEST_DATA__simpleProjectionWithNonTemporalSourceAndBiTemporalTarget =
  {
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
                          {
                            _type: 'var',
                            name: 'processingDate',
                          },
                          {
                            _type: 'var',
                            name: 'businessDate',
                          },
                        ],
                        property: 'biTemporal',
                      },
                    ],
                    property: 'firmID',
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
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            values: [
              {
                _type: 'string',
                value: 'Bi Temporal/Firmid',
              },
            ],
          },
        ],
      },
    ],
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        name: 'processingDate',
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
      },
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        name: 'businessDate',
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
      },
    ],
  };

export const TEST_DATA__simpleProjectionWithNonTemporalSourceAndBusinessTemporalTarget =
  {
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
                          {
                            _type: 'var',
                            name: 'businessDate',
                          },
                        ],
                        property: 'businessTemporal',
                      },
                    ],
                    property: 'firmID',
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
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            values: [
              {
                _type: 'string',
                value: 'Business Temporal/Firmid',
              },
            ],
          },
        ],
      },
    ],
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        name: 'businessDate',
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
      },
    ],
  };

export const TEST_DATA__SimpleProjectionWithBusinessTemporalSource = {
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
              fullPath: 'my::Person',
            },
            {
              _type: 'strictDate',

              value: '2021-11-12',
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
                      property: 'businessTemporal',
                    },
                  ],
                  property: 'date',
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

              value: 'Business Temporal/Date',
            },
          ],
        },
      ],
    },
  ],
};

export const TEST_DATA__simpleProjectionWithAggregationInput = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'groupBy',
      parameters: [
        {
          _type: 'func',
          function: 'getAll',
          parameters: [
            {
              _type: 'packageableElementPtr',
              fullPath: 'my::Person',
            },
            {
              _type: 'var',
              name: 'businessDate',
            },
          ],
        },
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 0,
            upperBound: 0,
          },
          values: [],
        },
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          values: [
            {
              _type: 'func',
              function: 'agg',
              parameters: [
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
                          property: 'businessTemporal',
                        },
                      ],
                      property: 'date',
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
                      _type: 'func',
                      function: 'count',
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

              value: 'Business Temporal/Date',
            },
          ],
        },
      ],
    },
  ],
  parameters: [
    {
      _type: 'var',
      genericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'Date',
        },
        typeArguments: [],
        typeVariableValues: [],
      },
      name: 'businessDate',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
    },
  ],
};

export const TEST_DATA__simpleProjectionWithAggregationOutput = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'groupBy',
      parameters: [
        {
          _type: 'func',
          function: 'getAll',
          parameters: [
            {
              _type: 'packageableElementPtr',
              fullPath: 'my::Person',
            },
            {
              _type: 'var',
              name: 'businessDate',
            },
          ],
        },
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 0,
            upperBound: 0,
          },
          values: [],
        },
        {
          _type: 'collection',
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          values: [
            {
              _type: 'func',
              function: 'agg',
              parameters: [
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
                            {
                              _type: 'var',
                              name: 'businessDate',
                            },
                          ],
                          property: 'businessTemporal',
                        },
                      ],
                      property: 'date',
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
                      _type: 'func',
                      function: 'count',
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

              value: 'Business Temporal/Date',
            },
          ],
        },
      ],
    },
  ],
  parameters: [
    {
      _type: 'var',
      genericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'Date',
        },
        typeArguments: [],
        typeVariableValues: [],
      },
      name: 'businessDate',
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
    },
  ],
};

export const TEST_DATA__getAllWithHardcodedDateInput = {
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
              fullPath: 'my::Person',
            },
            {
              _type: 'strictDate',

              value: '2021-11-12',
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
                      _type: 'var',
                      name: 'x',
                    },
                  ],
                  property: 'date',
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

              value: 'Date',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__getAllWithHardcodedDateOutput = {
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
              fullPath: 'my::Person',
            },
            {
              _type: 'strictDate',

              value: '2021-11-12',
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
                      _type: 'var',
                      name: 'x',
                    },
                  ],
                  property: 'date',
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

              value: 'Date',
            },
          ],
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__simpleProjectionWithBusinessMilestonedColumn = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'letFunction',
      parameters: [
        {
          _type: 'string',
          value: 'businessDate',
        },
        {
          _type: 'func',
          function: 'meta::pure::functions::date::now',
          parameters: [],
        },
      ],
    },
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
              fullPath: 'my::Firm',
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
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'property',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'x',
                            },
                            {
                              _type: 'var',
                              name: 'businessDate',
                            },
                          ],
                          property: 'businessTemporal',
                        },
                      ],
                      property: 'businessTemporal',
                    },
                  ],
                  property: 'firmID',
                },
                {
                  _type: 'integer',
                  value: 0,
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

export const TEST_DATA__simpleFilterWithBusinessTemporalSourceAndBusinessTemporalTarget =
  {
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
                fullPath: 'my::Person',
              },
              {
                _type: 'var',
                name: 'businessDate',
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
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                        ],
                        property: 'businessTemporal',
                      },
                    ],
                    property: 'firmID',
                  },
                  {
                    _type: 'integer',
                    value: 0,
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
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'businessDate',
      },
    ],
  };

export const TEST_DATA__simpleFilterWithBusinessTemporalSourceAndProcessingTemporalTarget =
  {
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
                fullPath: 'my::Person',
              },
              {
                _type: 'var',
                name: 'businessDate',
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
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                          {
                            _type: 'var',
                            name: 'processingDate',
                          },
                        ],
                        property: 'processingTemporal',
                      },
                    ],
                    property: 'firmID',
                  },
                  {
                    _type: 'integer',
                    value: 0,
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
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'businessDate',
      },
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'processingDate',
      },
    ],
  };

export const TEST_DATA__simpleFilterWithBusinessTemporalSourceAndBiTemporalTarget =
  {
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
                fullPath: 'my::Person',
              },
              {
                _type: 'var',
                name: 'businessDate',
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
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                          {
                            _type: 'var',
                            name: 'processingDate',
                          },
                          {
                            _type: 'var',
                            name: 'businessDate',
                          },
                        ],
                        property: 'biTemporal',
                      },
                    ],
                    property: 'firmID',
                  },
                  {
                    _type: 'integer',
                    value: 0,
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
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'businessDate',
      },
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'processingDate',
      },
    ],
  };

export const TEST_DATA__simpleFilterWithProcessingTemporalSourceAndBusinessTemporalTarget =
  {
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
                fullPath: 'my::Person2',
              },
              {
                _type: 'var',
                name: 'processingDate',
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
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                          {
                            _type: 'var',
                            name: 'businessDate',
                          },
                        ],
                        property: 'businessTemporal',
                      },
                    ],
                    property: 'firmID',
                  },
                  {
                    _type: 'integer',
                    value: 0,
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
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'processingDate',
      },
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'businessDate',
      },
    ],
  };

export const TEST_DATA__simpleFilterWithProcessingTemporalSourceAndProcessingTemporalTarget =
  {
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
                fullPath: 'my::Person2',
              },
              {
                _type: 'var',
                name: 'processingDate',
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
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                        ],
                        property: 'processingTemporal',
                      },
                    ],
                    property: 'firmID',
                  },
                  {
                    _type: 'integer',
                    value: 0,
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
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'processingDate',
      },
    ],
  };

export const TEST_DATA__simpleFilterWithProcessingTemporalSourceAndBiTemporalTarget =
  {
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
                fullPath: 'my::Person2',
              },
              {
                _type: 'var',
                name: 'processingDate',
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
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                          {
                            _type: 'var',
                            name: 'processingDate',
                          },
                          {
                            _type: 'var',
                            name: 'businessDate',
                          },
                        ],
                        property: 'biTemporal',
                      },
                    ],
                    property: 'firmID',
                  },
                  {
                    _type: 'integer',
                    value: 0,
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
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'processingDate',
      },
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'businessDate',
      },
    ],
  };

export const TEST_DATA__simpleFilterWithBiTemporalSourceAndBusinessTemporalTarget =
  {
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
                fullPath: 'my::Person1',
              },
              {
                _type: 'var',
                name: 'processingDate',
              },
              {
                _type: 'var',
                name: 'businessDate',
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
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                        ],
                        property: 'businessTemporal',
                      },
                    ],
                    property: 'firmID',
                  },
                  {
                    _type: 'integer',
                    value: 0,
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
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'processingDate',
      },
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'businessDate',
      },
    ],
  };

export const TEST_DATA__simpleFilterWithBiTemporalSourceAndProcessingTemporalTarget =
  {
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
                fullPath: 'my::Person1',
              },
              {
                _type: 'var',
                name: 'processingDate',
              },
              {
                _type: 'var',
                name: 'businessDate',
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
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                        ],
                        property: 'processingTemporal',
                      },
                    ],
                    property: 'firmID',
                  },
                  {
                    _type: 'integer',
                    value: 0,
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
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'processingDate',
      },
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'businessDate',
      },
    ],
  };

export const TEST_DATA__simpleFilterWithBiTemporalSourceAndBiTemporalTarget = {
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
              fullPath: 'my::Person1',
            },
            {
              _type: 'var',
              name: 'processingDate',
            },
            {
              _type: 'var',
              name: 'businessDate',
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
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                      ],
                      property: 'biTemporal',
                    },
                  ],
                  property: 'firmID',
                },
                {
                  _type: 'integer',
                  value: 0,
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
  parameters: [
    {
      _type: 'var',
      genericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'Date',
        },
        typeArguments: [],
        typeVariableValues: [],
      },
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'processingDate',
    },
    {
      _type: 'var',
      genericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'Date',
        },
        typeArguments: [],
        typeVariableValues: [],
      },
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'businessDate',
    },
  ],
};

export const TEST_DATA__simpleFilterWithNonTemporalSourceAndBusinessTemporalTarget =
  {
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
                fullPath: 'my::Firm',
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
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                          {
                            _type: 'var',
                            name: 'businessDate',
                          },
                        ],
                        property: 'businessTemporal',
                      },
                    ],
                    property: 'firmID',
                  },
                  {
                    _type: 'integer',
                    value: 0,
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
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'businessDate',
      },
    ],
  };

export const TEST_DATA__simpleFilterWithNonTemporalSourceAndProcessingTemporalTarget =
  {
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
                fullPath: 'my::Firm',
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
                        _type: 'property',
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                          {
                            _type: 'var',
                            name: 'processingDate',
                          },
                        ],
                        property: 'processingTemporal',
                      },
                    ],
                    property: 'firmID',
                  },
                  {
                    _type: 'integer',
                    value: 0,
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
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'processingDate',
      },
    ],
  };

export const TEST_DATA__simpleFilterWithNonTemporalSourceAndBiTemporalTarget = {
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
              fullPath: 'my::Firm',
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
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'x',
                        },
                        {
                          _type: 'var',
                          name: 'processingDate',
                        },
                        {
                          _type: 'var',
                          name: 'businessDate',
                        },
                      ],
                      property: 'biTemporal',
                    },
                  ],
                  property: 'firmID',
                },
                {
                  _type: 'integer',
                  value: 0,
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
  parameters: [
    {
      _type: 'var',
      genericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'Date',
        },
        typeArguments: [],
        typeVariableValues: [],
      },
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'processingDate',
    },
    {
      _type: 'var',
      genericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'Date',
        },
        typeArguments: [],
        typeVariableValues: [],
      },
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'businessDate',
    },
  ],
};

export const TEST_DATA__simpleGetAllVersionsWithProcessingTemporalClass = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'getAllVersions',
      parameters: [
        {
          _type: 'packageableElementPtr',
          fullPath: 'my::Person2',
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__simpleGetAllVersionsWithBusinessTemporalClass = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'getAllVersions',
      parameters: [
        {
          _type: 'packageableElementPtr',
          fullPath: 'my::Person',
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__simpleGetAllVersionsWithBiTemporalClass = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'getAllVersions',
      parameters: [
        {
          _type: 'packageableElementPtr',
          fullPath: 'my::Person1',
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__simpleGetAllVersionsWithNonTemporalClass = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'getAllVersions',
      parameters: [
        {
          _type: 'packageableElementPtr',
          fullPath: 'my::Firm',
        },
      ],
    },
  ],
  parameters: [],
};

export const TEST_DATA__simpleGetAllVersionsInRangeWithBusinessTemporalClass = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'getAllVersionsInRange',
      parameters: [
        {
          _type: 'packageableElementPtr',
          fullPath: 'my::Person',
        },
        {
          _type: 'var',
          name: 'start',
        },
        {
          _type: 'var',
          name: 'end',
        },
      ],
    },
  ],
  parameters: [
    {
      _type: 'var',
      genericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'Date',
        },
        typeArguments: [],
        typeVariableValues: [],
      },
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'start',
    },
    {
      _type: 'var',
      genericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'Date',
        },
        typeArguments: [],
        typeVariableValues: [],
      },
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'end',
    },
  ],
};

export const TEST_DATA__simpleGetAllVersionsInRangeWithBiTemporalClass = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'getAllVersionsInRange',
      parameters: [
        {
          _type: 'packageableElementPtr',
          fullPath: 'my::Person1',
        },
        {
          _type: 'var',
          name: 'start',
        },
        {
          _type: 'var',
          name: 'end',
        },
      ],
    },
  ],
  parameters: [
    {
      _type: 'var',
      genericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'Date',
        },
        typeArguments: [],
        typeVariableValues: [],
      },
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'start',
    },
    {
      _type: 'var',
      genericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'Date',
        },
        typeArguments: [],
        typeVariableValues: [],
      },
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'end',
    },
  ],
};

export const TEST_DATA__simpleGetAllVersionsInRangeWithProcessingTemporalClass =
  {
    _type: 'lambda',
    body: [
      {
        _type: 'func',
        function: 'getAllVersionsInRange',
        parameters: [
          {
            _type: 'packageableElementPtr',
            fullPath: 'my::Person2',
          },
          {
            _type: 'var',
            name: 'start',
          },
          {
            _type: 'var',
            name: 'end',
          },
        ],
      },
    ],
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'start',
      },
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'end',
      },
    ],
  };

export const TEST_DATA__simpleGetAllVersionsInRangeWithNonTemporalClass = {
  _type: 'lambda',
  body: [
    {
      _type: 'func',
      function: 'getAllVersionsInRange',
      parameters: [
        {
          _type: 'packageableElementPtr',
          fullPath: 'my::Firm',
        },
        {
          _type: 'var',
          name: 'start',
        },
        {
          _type: 'var',
          name: 'end',
        },
      ],
    },
  ],
  parameters: [
    {
      _type: 'var',
      genericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'Date',
        },
        typeArguments: [],
        typeVariableValues: [],
      },
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'start',
    },
    {
      _type: 'var',
      genericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'Date',
        },
        typeArguments: [],
        typeVariableValues: [],
      },
      multiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
      name: 'end',
    },
  ],
};

export const TEST_DATA__simpleGetAllVersionsWithBusinessTemporalSourceAndBusinessTemporalTarget =
  {
    _type: 'lambda',
    body: [
      {
        _type: 'func',
        function: 'project',
        parameters: [
          {
            _type: 'func',
            function: 'getAllVersions',
            parameters: [
              {
                _type: 'packageableElementPtr',
                fullPath: 'my::Person',
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
                          {
                            _type: 'var',
                            name: 'businessDate',
                          },
                        ],
                        property: 'businessTemporal',
                      },
                    ],
                    property: 'date',
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
                value: 'Business Temporal/Date',
              },
            ],
          },
        ],
      },
    ],
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'businessDate',
      },
    ],
  };

export const TEST_DATA__simpleGetAllVersionsWithBiTemporalSourceAndBiTemporalTarget =
  {
    _type: 'lambda',
    body: [
      {
        _type: 'func',
        function: 'project',
        parameters: [
          {
            _type: 'func',
            function: 'getAllVersions',
            parameters: [
              {
                _type: 'packageableElementPtr',
                fullPath: 'my::Person1',
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
                          {
                            _type: 'var',
                            name: 'processingDate',
                          },
                          {
                            _type: 'var',
                            name: 'businessDate',
                          },
                        ],
                        property: 'biTemporal',
                      },
                    ],
                    property: 'firmID',
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
                value: 'Bi Temporal/Firmid',
              },
            ],
          },
        ],
      },
    ],
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'businessDate',
      },
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'processingDate',
      },
    ],
  };

export const TEST_DATA__simpleGetAllVersionsWithProcessingTemporalSourceAndProcessingTemporalTarget =
  {
    _type: 'lambda',
    body: [
      {
        _type: 'func',
        function: 'project',
        parameters: [
          {
            _type: 'func',
            function: 'getAllVersions',
            parameters: [
              {
                _type: 'packageableElementPtr',
                fullPath: 'my::Person2',
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
                          {
                            _type: 'var',
                            name: 'processingDate',
                          },
                        ],
                        property: 'processingTemporal',
                      },
                    ],
                    property: 'firmID',
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
                value: 'Processing Temporal/Firmid',
              },
            ],
          },
        ],
      },
    ],
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'processingDate',
      },
    ],
  };

export const TEST_DATA__simpleGetAllVersionsWithProcessingTemporalSourceAndBusinessTemporalTarget =
  {
    _type: 'lambda',
    body: [
      {
        _type: 'func',
        function: 'project',
        parameters: [
          {
            _type: 'func',
            function: 'getAllVersions',
            parameters: [
              {
                _type: 'packageableElementPtr',
                fullPath: 'my::Person2',
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
                          {
                            _type: 'var',
                            name: 'businessDate',
                          },
                        ],
                        property: 'businessTemporal',
                      },
                    ],
                    property: 'firmID',
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
                value: 'Business Temporal/Firmid',
              },
            ],
          },
        ],
      },
    ],
    parameters: [
      {
        _type: 'var',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'Date',
          },
          typeArguments: [],
          typeVariableValues: [],
        },
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'businessDate',
      },
    ],
  };
