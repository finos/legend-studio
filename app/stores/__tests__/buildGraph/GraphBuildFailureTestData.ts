/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export const testMissingSuperType = [{
  'classifierPath': 'meta::pure::metamodel::type::Class',
  'path': 'ui::mapping::editor::domain::Animal',
  'content': {
    '_type': 'class',
    'name': 'Animal',
    'package': 'ui::mapping::editor::domain',
    'properties': [
      {
        'multiplicity': {
          'lowerBound': 1,
          'upperBound': 1
        },
        'name': 'legs',
        'type': 'Integer'
      },
      {
        'multiplicity': {
          'lowerBound': 1,
          'upperBound': 1
        },
        'name': 'arms',
        'type': 'Integer'
      }
    ],
    'superTypes': [
      'ui::mapping::editor::domain::Organism'
    ]
  }
}];

export const testMissingProfile = [{
  'classifierPath': 'meta::pure::metamodel::type::Class',
  'path': 'ui::mapping::editor::domain::Anyone',
  'content': {
    '_type': 'class',
    'name': 'Anyone',
    'package': 'ui::mapping::editor::domain',
    'properties': [
      {
        'multiplicity': {
          'lowerBound': 1,
          'upperBound': 1
        },
        'name': 'legs',
        'type': 'Integer'
      },
      {
        'multiplicity': {
          'lowerBound': 1,
          'upperBound': 1
        },
        'name': 'arms',
        'type': 'Integer'
      }
    ],
    'superTypes': [
    ],
    'taggedValues': [
      {
        'tag': {
          'profile': 'ui::mapping::editor::domain::ProfileTest',
          'value': 'tag1'
        },
        'value': 'hello'
      }
    ]
  }
}];

export const testMissingStereoType = [
  {
    'classifierPath': 'meta::pure::metamodel::type::Class',
    'path': 'ui::meta::pure::mapping::modelToModel::test::milestoning::Broken',
    'content': {
      '_type': 'class',
      'name': 'Broken',
      'package': 'ui::meta::pure::mapping::modelToModel::test::milestoning',
      'properties': [
        {
          'multiplicity': {
            'lowerBound': 1,
            'upperBound': 1
          },
          'name': 'id',
          'type': 'Integer'
        },
        {
          'multiplicity': {
            'lowerBound': 1,
            'upperBound': 1
          },
          'name': 'name',
          'type': 'String'
        },
        {
          'multiplicity': {
            'lowerBound': 1,
            'upperBound': 1
          },
          'name': 'type',
          'type': 'String'
        }
      ],
      'stereotypes': [
        {
          'profile': 'ui::meta::pure::profiles::temporal',
          'value': 'missingStereotype'
        }
      ]
    }
  },
  {
    'classifierPath': 'meta::pure::metamodel::extension::Profile',
    'path': 'ui::meta::pure::profiles::temporal',
    'content': {
      '_type': 'profile',
      'name': 'temporal',
      'package': 'ui::meta::pure::profiles',
      'stereotypes': [
        'businesstemporal'
      ],
      'tags': [
        'here'
      ]
    }
  }
];

export const testMissingTagValue = [
  {
    'classifierPath': 'meta::pure::metamodel::type::Class',
    'path': 'ui::meta::pure::mapping::modelToModel::test::milestoning::Broken',
    'content': {
      '_type': 'class',
      'name': 'Broken',
      'package': 'ui::meta::pure::mapping::modelToModel::test::milestoning',
      'properties': [
        {
          'multiplicity': {
            'lowerBound': 1,
            'upperBound': 1
          },
          'name': 'id',
          'type': 'Integer'
        },
        {
          'multiplicity': {
            'lowerBound': 1,
            'upperBound': 1
          },
          'name': 'name',
          'type': 'String'
        },
        {
          'multiplicity': {
            'lowerBound': 1,
            'upperBound': 1
          },
          'name': 'type',
          'type': 'String'
        }
      ],
      'taggedValues': [
        {
          'tag': {
            'profile': 'ui::meta::pure::profiles::temporal',
            'value': 'missingTag'
          },
          'value': 'not here'
        }
      ]
    }
  },
  {
    'classifierPath': 'meta::pure::metamodel::extension::Profile',
    'path': 'ui::meta::pure::profiles::temporal',
    'content': {
      '_type': 'profile',
      'name': 'temporal',
      'package': 'ui::meta::pure::profiles',
      'stereotypes': [
        'businesstemporal'
      ],
      'tags': [
        'here'
      ]
    }
  }
];

export const testMissingProperty = [{
  'classifierPath': 'meta::pure::metamodel::type::Class',
  'path': 'ui::mapping::editor::domain::Animal',
  'content': {
    '_type': 'class',
    'name': 'Animal',
    'package': 'ui::mapping::editor::domain',
    'properties': [
      {
        'multiplicity': {
          'lowerBound': 1,
          'upperBound': 1
        },
        'name': 'legs',
        'type': 'Integer'
      },
      {
        'multiplicity': {
          'lowerBound': 1,
          'upperBound': 1
        },
        'name': 'arms',
        'type': 'ui::mapping::editor::domain::NotFound'
      }
    ],
    'superTypes': [
    ]
  }
}];

export const testMissingTargetClassinMapping = [{
  'classifierPath': 'meta::pure::mapping::Mapping',
  'path': 'ui::mapping::testMapping',
  'content': {
    '_type': 'mapping',
    'classMappings': [
      {
        '_type': 'pureInstance',
        'class': 'ui::mapping::editor::domain::Target_Something',
        'id': 'ui_mapping_editor_domain_Target_Something',
        'propertyMappings': [
          {
            '_type': 'purePropertyMapping',
            'property': {
              'class': 'ui::mapping::editor::domain::Target_Something',
              'property': 'fullName'
            },
            'source': 'ui_mapping_editor_domain_Target_Something',
            'target': '',
            'transform': {
              '_type': 'lambda',
              'body': [
                {
                  '_type': 'property',
                  'parameters': [
                    {
                      '_type': 'var',
                      'name': 'src'
                    }
                  ],
                  'property': 'name'
                }
              ],
              'parameters': [
                {
                  '_type': 'var',
                  'class': 'ui::mapping::editor::domain::Source_Something',
                  'multiplicity': {
                    'lowerBound': 1,
                    'upperBound': 1
                  },
                  'name': 'src'
                }
              ]
            }
          },
          {
            '_type': 'purePropertyMapping',
            'property': {
              'class': 'ui::mapping::editor::domain::Target_Something',
              'property': 'age'
            },
            'source': 'ui_mapping_editor_domain_Target_Something',
            'target': '',
            'transform': {
              '_type': 'lambda',
              'body': [
                {
                  '_type': 'integer',
                  'multiplicity': {
                    'lowerBound': 1,
                    'upperBound': 1
                  },
                  'values': [
                    25
                  ]
                }
              ],
              'parameters': [
                {
                  '_type': 'var',
                  'class': 'ui::mapping::editor::domain::Source_Something',
                  'multiplicity': {
                    'lowerBound': 1,
                    'upperBound': 1
                  },
                  'name': 'src'
                }
              ]
            }
          },
          {
            '_type': 'purePropertyMapping',
            'property': {
              'class': 'ui::mapping::editor::domain::Target_Something',
              'property': 'description'
            },
            'source': 'ui_mapping_editor_domain_Target_Something',
            'target': '',
            'transform': {
              '_type': 'lambda',
              'body': [
                {
                  '_type': 'property',
                  'parameters': [
                    {
                      '_type': 'var',
                      'name': 'src'
                    }
                  ],
                  'property': 'lastName'
                }
              ],
              'parameters': [
                {
                  '_type': 'var',
                  'class': 'ui::mapping::editor::domain::Source_Something',
                  'multiplicity': {
                    'lowerBound': 1,
                    'upperBound': 1
                  },
                  'name': 'src'
                }
              ]
            }
          }
        ],
        'root': false,
        'srcClass': 'ui::mapping::editor::domain::Source_Something'
      },
      {
        '_type': 'pureInstance',
        'class': 'ui::mapping::editor::domain::Target_Something',
        'id': 'targetSomething',
        'propertyMappings': [
          {
            '_type': 'purePropertyMapping',
            'property': {
              'class': 'ui::mapping::editor::domain::Target_Something',
              'property': 'fullName'
            },
            'source': 'targetSomething',
            'target': '',
            'transform': {
              '_type': 'lambda',
              'body': [
                {
                  '_type': 'string',
                  'multiplicity': {
                    'lowerBound': 1,
                    'upperBound': 1
                  },
                  'values': [
                    'bye'
                  ]
                }
              ],
              'parameters': []
            }
          },
          {
            '_type': 'purePropertyMapping',
            'property': {
              'class': 'ui::mapping::editor::domain::Target_Something',
              'property': 'age'
            },
            'source': 'targetSomething',
            'target': '',
            'transform': {
              '_type': 'lambda',
              'body': [
                {
                  '_type': 'integer',
                  'multiplicity': {
                    'lowerBound': 1,
                    'upperBound': 1
                  },
                  'values': [
                    11
                  ]
                }
              ],
              'parameters': []
            }
          },
          {
            '_type': 'purePropertyMapping',
            'property': {
              'class': 'ui::mapping::editor::domain::Target_Something',
              'property': 'description'
            },
            'source': 'targetSomething',
            'target': '',
            'transform': {
              '_type': 'lambda',
              'body': [
                {
                  '_type': 'string',
                  'multiplicity': {
                    'lowerBound': 1,
                    'upperBound': 1
                  },
                  'values': [
                    'hello'
                  ]
                }
              ],
              'parameters': []
            }
          }
        ],
        'root': false
      },
      {
        '_type': 'operation',
        'class': 'ui::mapping::editor::domain::Target_Something',
        'id': 'unionOfSomething',
        'operation': 'STORE_UNION',
        'parameters': [
          'ui_mapping_editor_domain_Target_Something',
          'targetSomething'
        ],
        'root': true
      }
    ],
    'enumerationMappings': [],
    'name': 'testMapping',
    'package': 'ui::mapping'
  }
}];

export const testMissingSetImp = [
  {
    'classifierPath': 'meta::pure::metamodel::type::Class',
    'path': 'ui::mapping::editor::domain::SourceClass',
    'content': {
      '_type': 'class',
      'name': 'SourceClass',
      'package': 'ui::mapping::editor::domain',
      'properties': [
        {
          'multiplicity': {
            'lowerBound': 0
          },
          'name': 'name',
          'type': 'String'
        },
        {
          'multiplicity': {
            'lowerBound': 0
          },
          'name': 'lastName',
          'type': 'String'
        },
        {
          'multiplicity': {
            'lowerBound': 0
          },
          'name': 'age',
          'type': 'Integer'
        }
      ]
    }
  },
  {
    'classifierPath': 'meta::pure::metamodel::type::Class',
    'path': 'ui::mapping::editor::domain::TagetClass',
    'content': {
      '_type': 'class',
      'name': 'TagetClass',
      'package': 'ui::mapping::editor::domain',
      'properties': [
        {
          'multiplicity': {
            'lowerBound': 0
          },
          'name': 'fullName',
          'type': 'String'
        },
        {
          'multiplicity': {
            'lowerBound': 0
          },
          'name': 'age',
          'type': 'Integer'
        },
        {
          'multiplicity': {
            'lowerBound': 0
          },
          'name': 'description',
          'type': 'String'
        }
      ]
    }
  },
  {
    'classifierPath': 'meta::pure::mapping::Mapping',
    'path': 'ui::mapping::testMapping',
    'content': {
      '_type': 'mapping',
      'classMappings': [
        {
          '_type': 'pureInstance',
          'class': 'ui::mapping::editor::domain::TagetClass',
          'id': 'targetClassA',
          'propertyMappings': [
            {
              '_type': 'purePropertyMapping',
              'property': {
                'class': 'ui::mapping::editor::domain::TagetClass',
                'property': 'fullName'
              },
              'source': 'targetClassA',
              'target': '',
              'transform': {
                '_type': 'lambda',
                'body': [
                  {
                    '_type': 'property',
                    'parameters': [
                      {
                        '_type': 'var',
                        'name': 'src'
                      }
                    ],
                    'property': 'name'
                  }
                ],
                'parameters': [
                  {
                    '_type': 'var',
                    'class': 'ui::mapping::editor::domain::SourceClass',
                    'multiplicity': {
                      'lowerBound': 1,
                      'upperBound': 1
                    },
                    'name': 'src'
                  }
                ]
              }
            },
            {
              '_type': 'purePropertyMapping',
              'property': {
                'class': 'ui::mapping::editor::domain::TagetClass',
                'property': 'age'
              },
              'source': 'targetClassA',
              'target': '',
              'transform': {
                '_type': 'lambda',
                'body': [
                  {
                    '_type': 'integer',
                    'multiplicity': {
                      'lowerBound': 1,
                      'upperBound': 1
                    },
                    'values': [
                      25
                    ]
                  }
                ],
                'parameters': [
                  {
                    '_type': 'var',
                    'class': 'ui::mapping::editor::domain::SourceClass',
                    'multiplicity': {
                      'lowerBound': 1,
                      'upperBound': 1
                    },
                    'name': 'src'
                  }
                ]
              }
            },
            {
              '_type': 'purePropertyMapping',
              'property': {
                'class': 'ui::mapping::editor::domain::TagetClass',
                'property': 'description'
              },
              'source': 'targetClassA',
              'target': '',
              'transform': {
                '_type': 'lambda',
                'body': [
                  {
                    '_type': 'property',
                    'parameters': [
                      {
                        '_type': 'var',
                        'name': 'src'
                      }
                    ],
                    'property': 'lastName'
                  }
                ],
                'parameters': [
                  {
                    '_type': 'var',
                    'class': 'ui::mapping::editor::domain::SourceClass',
                    'multiplicity': {
                      'lowerBound': 1,
                      'upperBound': 1
                    },
                    'name': 'src'
                  }
                ]
              }
            }
          ],
          'root': false,
          'srcClass': 'ui::mapping::editor::domain::SourceClass'
        },
        {
          '_type': 'pureInstance',
          'class': 'ui::mapping::editor::domain::TagetClass',
          'id': 'targetClassB',
          'propertyMappings': [
            {
              '_type': 'purePropertyMapping',
              'property': {
                'class': 'ui::mapping::editor::domain::TagetClass',
                'property': 'fullName'
              },
              'source': 'targetClassB',
              'target': '',
              'transform': {
                '_type': 'lambda',
                'body': [
                  {
                    '_type': 'string',
                    'multiplicity': {
                      'lowerBound': 1,
                      'upperBound': 1
                    },
                    'values': [
                      'bye'
                    ]
                  }
                ],
                'parameters': []
              }
            },
            {
              '_type': 'purePropertyMapping',
              'property': {
                'class': 'ui::mapping::editor::domain::TagetClass',
                'property': 'age'
              },
              'source': 'targetClassB',
              'target': '',
              'transform': {
                '_type': 'lambda',
                'body': [
                  {
                    '_type': 'integer',
                    'multiplicity': {
                      'lowerBound': 1,
                      'upperBound': 1
                    },
                    'values': [
                      11
                    ]
                  }
                ],
                'parameters': []
              }
            },
            {
              '_type': 'purePropertyMapping',
              'property': {
                'class': 'ui::mapping::editor::domain::TagetClass',
                'property': 'description'
              },
              'source': 'targetClassB',
              'target': '',
              'transform': {
                '_type': 'lambda',
                'body': [
                  {
                    '_type': 'string',
                    'multiplicity': {
                      'lowerBound': 1,
                      'upperBound': 1
                    },
                    'values': [
                      'hello'
                    ]
                  }
                ],
                'parameters': []
              }
            }
          ],
          'root': false
        },
        {
          '_type': 'operation',
          'class': 'ui::mapping::editor::domain::TagetClass',
          'id': 'unionOfSomething',
          'operation': 'STORE_UNION',
          'parameters': [
            'targetClassAMissing',
            'targetClassB'
          ],
          'root': true
        }
      ],
      'enumerationMappings': [],
      'name': 'testMapping',
      'package': 'ui::mapping'
    }
  }
];

export const testMissingClassInDiagram = [
  {
    'classifierPath': 'meta::pure::metamodel::type::Class',
    'path': 'ui::mapping::editor::domain::Cat',
    'content': {
      '_type': 'class',
      'name': 'Cat',
      'package': 'ui::mapping::editor::domain',
      'properties': [
        {
          'multiplicity': {
            'lowerBound': 0
          },
          'name': 'fullName',
          'type': 'String'
        },
        {
          'multiplicity': {
            'lowerBound': 0
          },
          'name': 'age',
          'type': 'Integer'
        }
      ]
    }
  },
  {
    'classifierPath': 'meta::pure::metamodel::diagram::Diagram',
    'path': 'ui::mapping::editor::domain::testDiagram',
    'content': {
      '_type': 'diagram',
      'classViews': [
        {
          'class': 'ui::mapping::editor::domain::NotFound',
          'id': '2baa3ad1-37b3-434c-89ab-5ad5df455aa1',
          'position': {
            'x': 771.9999961853027,
            'y': 191.9857940673828
          },
          'rectangle': {
            'height': 55,
            'width': 112.2861328125
          }
        }
      ],
      'generalizationViews': [],
      'name': 'testDiagram',
      'package': 'ui::mapping::editor::domain',
      'propertyViews': []
    }
  }
];

export const testMissingClassMapping = [
  {
    'path': 'ui::Employeer',
    'content': {
      '_type': 'class',
      'constraints': [],
      'name': 'Employeer',
      'originalMilestonedProperties': [],
      'package': 'ui',
      'properties': [
        {
          'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
          'name': 'name',
          'propertyTypeSourceInformation': {
            'endColumn': 17,
            'endLine': 9,
            'mainColumn': 17,
            'mainLine': 9,
            'sourceId': 'ui::Employeer-property-name',
            'startColumn': 9,
            'startLine': 9
          },
          'sourceInformation': {
            'endColumn': 18,
            'endLine': 9,
            'mainColumn': 3,
            'mainLine': 9,
            'sourceId': 'ui::Employeer-property-name',
            'startColumn': 3,
            'startLine': 9
          },
          'stereotypes': [],
          'taggedValues': [],
          'type': 'String'
        },
        {
          'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
          'name': 'employees',
          'propertyTypeSourceInformation': {
            'endColumn': 23,
            'endLine': 10,
            'mainColumn': 23,
            'mainLine': 10,
            'sourceId': 'ui::Employeer-property-employees',
            'startColumn': 14,
            'startLine': 10
          },
          'sourceInformation': {
            'endColumn': 24,
            'endLine': 10,
            'mainColumn': 3,
            'mainLine': 10,
            'sourceId': 'ui::Employeer-property-employees',
            'startColumn': 3,
            'startLine': 10
          },
          'stereotypes': [],
          'taggedValues': [],
          'type': 'Integer'
        }
      ],
      'qualifiedProperties': [],
      'sourceInformation': {
        'endColumn': 1,
        'endLine': 11,
        'mainColumn': 11,
        'mainLine': 7,
        'sourceId': 'ui::Employeer',
        'startColumn': 1,
        'startLine': 7
      },
      'stereotypes': [],
      'superTypes': [],
      'taggedValues': []
    },
    'classifierPath': 'meta::pure::metamodel::type::Class'
  },
  {
    'path': 'ui::Person',
    'content': {
      '_type': 'class',
      'constraints': [],
      'name': 'Person',
      'originalMilestonedProperties': [],
      'package': 'ui',
      'properties': [
        {
          'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
          'name': 'name',
          'propertyTypeSourceInformation': {
            'endColumn': 17,
            'endLine': 3,
            'mainColumn': 17,
            'mainLine': 3,
            'sourceId': 'ui::Person-property-name',
            'startColumn': 9,
            'startLine': 3
          },
          'sourceInformation': {
            'endColumn': 18,
            'endLine': 3,
            'mainColumn': 3,
            'mainLine': 3,
            'sourceId': 'ui::Person-property-name',
            'startColumn': 3,
            'startLine': 3
          },
          'stereotypes': [],
          'taggedValues': [],
          'type': 'String'
        },
        {
          'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
          'name': 'employer',
          'propertyTypeSourceInformation': {
            'endColumn': 28,
            'endLine': 4,
            'mainColumn': 28,
            'mainLine': 4,
            'sourceId': 'ui::Person-property-employer',
            'startColumn': 13,
            'startLine': 4
          },
          'sourceInformation': {
            'endColumn': 29,
            'endLine': 4,
            'mainColumn': 3,
            'mainLine': 4,
            'sourceId': 'ui::Person-property-employer',
            'startColumn': 3,
            'startLine': 4
          },
          'stereotypes': [],
          'taggedValues': [],
          'type': 'ui::Employeer'
        }
      ],
      'qualifiedProperties': [],
      'sourceInformation': {
        'endColumn': 1,
        'endLine': 5,
        'mainColumn': 11,
        'mainLine': 1,
        'sourceId': 'ui::Person',
        'startColumn': 1,
        'startLine': 1
      },
      'stereotypes': [],
      'superTypes': [],
      'taggedValues': []
    },
    'classifierPath': 'meta::pure::metamodel::type::Class'
  },
  {
    'path': 'ui::PersonSource',
    'content': {
      '_type': 'class',
      'constraints': [],
      'name': 'PersonSource',
      'originalMilestonedProperties': [],
      'package': 'ui',
      'properties': [
        {
          'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
          'name': 'name',
          'propertyTypeSourceInformation': {
            'endColumn': 17,
            'endLine': 16,
            'mainColumn': 17,
            'mainLine': 16,
            'sourceId': 'ui::PersonSource-property-name',
            'startColumn': 9,
            'startLine': 16
          },
          'sourceInformation': {
            'endColumn': 18,
            'endLine': 16,
            'mainColumn': 3,
            'mainLine': 16,
            'sourceId': 'ui::PersonSource-property-name',
            'startColumn': 3,
            'startLine': 16
          },
          'stereotypes': [],
          'taggedValues': [],
          'type': 'String'
        },
        {
          'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
          'name': 'employer',
          'propertyTypeSourceInformation': {
            'endColumn': 21,
            'endLine': 17,
            'mainColumn': 21,
            'mainLine': 17,
            'sourceId': 'ui::PersonSource-property-employer',
            'startColumn': 13,
            'startLine': 17
          },
          'sourceInformation': {
            'endColumn': 22,
            'endLine': 17,
            'mainColumn': 3,
            'mainLine': 17,
            'sourceId': 'ui::PersonSource-property-employer',
            'startColumn': 3,
            'startLine': 17
          },
          'stereotypes': [],
          'taggedValues': [],
          'type': 'String'
        }
      ],
      'qualifiedProperties': [],
      'sourceInformation': {
        'endColumn': 1,
        'endLine': 18,
        'mainColumn': 11,
        'mainLine': 14,
        'sourceId': 'ui::PersonSource',
        'startColumn': 1,
        'startLine': 14
      },
      'stereotypes': [],
      'superTypes': [],
      'taggedValues': []
    },
    'classifierPath': 'meta::pure::metamodel::type::Class'
  },
  {
    'path': 'ui::myMap',
    'content': {
      '_type': 'mapping',
      'associationMappings': [],
      'classMappings': [
        {
          '_type': 'pureInstance',
          'class': 'ui::Person',
          'id': 'Person',
          'propertyMappings': [
            {
              '_type': 'purePropertyMapping',
              'explodeProperty': false,
              'property': {
                'class': 'ui::Person',
                'property': 'name',
                'sourceInformation': {
                  'endColumn': 8,
                  'endLine': 26,
                  'mainColumn': 5,
                  'mainLine': 26,
                  'sourceId': 'ui::myMap-class-Person-name-',
                  'startColumn': 5,
                  'startLine': 26
                }
              },
              'source': 'Person',
              'sourceInformation': {
                'endColumn': 18,
                'endLine': 26,
                'mainColumn': 11,
                'mainLine': 26,
                'sourceId': 'ui::myMap-class-Person-name-',
                'startColumn': 5,
                'startLine': 26
              },
              'target': '',
              'transform': {
                '_type': 'lambda',
                'body': [
                  {
                    '_type': 'string',
                    'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
                    'sourceInformation': {
                      'endColumn': 18,
                      'endLine': 26,
                      'mainColumn': 11,
                      'mainLine': 26,
                      'sourceId': 'ui::myMap',
                      'startColumn': 11,
                      'startLine': 26
                    },
                    'values': ['string']
                  }
                ],
                'parameters': [
                  {
                    '_type': 'var',
                    'class': 'ui::PersonSource',
                    'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
                    'name': 'src'
                  }
                ]
              }
            },
            {
              '_type': 'purePropertyMapping',
              'explodeProperty': false,
              'property': {
                'class': 'ui::Person',
                'property': 'employer',
                'sourceInformation': {
                  'endColumn': 12,
                  'endLine': 27,
                  'mainColumn': 5,
                  'mainLine': 27,
                  'sourceId': 'ui::myMap-class-Person-employer-',
                  'startColumn': 5,
                  'startLine': 27
                }
              },
              'source': 'Person',
              'sourceInformation': {
                'endColumn': 18,
                'endLine': 27,
                'mainColumn': 16,
                'mainLine': 27,
                'sourceId': 'ui::myMap-class-Person-employer-',
                'startColumn': 5,
                'startLine': 27
              },
              'target': '',
              'transform': {
                '_type': 'lambda',
                'body': [
                  {
                    '_type': 'var',
                    'name': 'src',
                    'sourceInformation': {
                      'endColumn': 18,
                      'endLine': 27,
                      'mainColumn': 16,
                      'mainLine': 27,
                      'sourceId': 'ui::myMap',
                      'startColumn': 15,
                      'startLine': 27
                    }
                  }
                ],
                'parameters': [
                  {
                    '_type': 'var',
                    'class': 'ui::PersonSource',
                    'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
                    'name': 'src'
                  }
                ]
              }
            }
          ],
          'root': true,
          'sourceInformation': {
            'endColumn': 3,
            'endLine': 28,
            'mainColumn': 8,
            'mainLine': 23,
            'sourceId': 'ui::myMap-class-Person',
            'startColumn': 3,
            'startLine': 23
          },
          'srcClass': 'ui::PersonSource'
        }
      ],
      'enumerationMappings': [],
      'includedMappings': [],
      'name': 'myMap',
      'package': 'ui',
      'sourceInformation': {
        'endColumn': 1,
        'endLine': 29,
        'mainColumn': 13,
        'mainLine': 21,
        'sourceId': 'ui::myMap',
        'startColumn': 1,
        'startLine': 21
      },
      'tests': []
    },
    'classifierPath': 'meta::pure::mapping::Mapping'
  }
];

export const testMissingClassMappingWithTargetId = [
  {
    'path': 'ui::Employeer',
    'content': {
      '_type': 'class',
      'constraints': [],
      'name': 'Employeer',
      'originalMilestonedProperties': [],
      'package': 'ui',
      'properties': [
        {
          'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
          'name': 'name',
          'propertyTypeSourceInformation': {
            'endColumn': 17,
            'endLine': 3,
            'mainColumn': 17,
            'mainLine': 3,
            'sourceId': 'ui::Employeer-property-name',
            'startColumn': 9,
            'startLine': 3
          },
          'sourceInformation': {
            'endColumn': 18,
            'endLine': 3,
            'mainColumn': 3,
            'mainLine': 3,
            'sourceId': 'ui::Employeer-property-name',
            'startColumn': 3,
            'startLine': 3
          },
          'stereotypes': [],
          'taggedValues': [],
          'type': 'String'
        },
        {
          'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
          'name': 'employees',
          'propertyTypeSourceInformation': {
            'endColumn': 23,
            'endLine': 4,
            'mainColumn': 23,
            'mainLine': 4,
            'sourceId': 'ui::Employeer-property-employees',
            'startColumn': 14,
            'startLine': 4
          },
          'sourceInformation': {
            'endColumn': 24,
            'endLine': 4,
            'mainColumn': 3,
            'mainLine': 4,
            'sourceId': 'ui::Employeer-property-employees',
            'startColumn': 3,
            'startLine': 4
          },
          'stereotypes': [],
          'taggedValues': [],
          'type': 'Integer'
        }
      ],
      'qualifiedProperties': [],
      'sourceInformation': {
        'endColumn': 1,
        'endLine': 5,
        'mainColumn': 11,
        'mainLine': 1,
        'sourceId': 'ui::Employeer',
        'startColumn': 1,
        'startLine': 1
      },
      'stereotypes': [],
      'superTypes': [],
      'taggedValues': []
    },
    'classifierPath': 'meta::pure::metamodel::type::Class'
  },
  {
    'path': 'ui::Person',
    'content': {
      '_type': 'class',
      'constraints': [],
      'name': 'Person',
      'originalMilestonedProperties': [],
      'package': 'ui',
      'properties': [
        {
          'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
          'name': 'name',
          'propertyTypeSourceInformation': {
            'endColumn': 17,
            'endLine': 9,
            'mainColumn': 17,
            'mainLine': 9,
            'sourceId': 'ui::Person-property-name',
            'startColumn': 9,
            'startLine': 9
          },
          'sourceInformation': {
            'endColumn': 18,
            'endLine': 9,
            'mainColumn': 3,
            'mainLine': 9,
            'sourceId': 'ui::Person-property-name',
            'startColumn': 3,
            'startLine': 9
          },
          'stereotypes': [],
          'taggedValues': [],
          'type': 'String'
        },
        {
          'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
          'name': 'employer',
          'propertyTypeSourceInformation': {
            'endColumn': 28,
            'endLine': 10,
            'mainColumn': 28,
            'mainLine': 10,
            'sourceId': 'ui::Person-property-employer',
            'startColumn': 13,
            'startLine': 10
          },
          'sourceInformation': {
            'endColumn': 29,
            'endLine': 10,
            'mainColumn': 3,
            'mainLine': 10,
            'sourceId': 'ui::Person-property-employer',
            'startColumn': 3,
            'startLine': 10
          },
          'stereotypes': [],
          'taggedValues': [],
          'type': 'ui::Employeer'
        }
      ],
      'qualifiedProperties': [],
      'sourceInformation': {
        'endColumn': 1,
        'endLine': 11,
        'mainColumn': 11,
        'mainLine': 7,
        'sourceId': 'ui::Person',
        'startColumn': 1,
        'startLine': 7
      },
      'stereotypes': [],
      'superTypes': [],
      'taggedValues': []
    },
    'classifierPath': 'meta::pure::metamodel::type::Class'
  },
  {
    'path': 'ui::PersonSource',
    'content': {
      '_type': 'class',
      'constraints': [],
      'name': 'PersonSource',
      'originalMilestonedProperties': [],
      'package': 'ui',
      'properties': [
        {
          'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
          'name': 'name',
          'propertyTypeSourceInformation': {
            'endColumn': 17,
            'endLine': 15,
            'mainColumn': 17,
            'mainLine': 15,
            'sourceId': 'ui::PersonSource-property-name',
            'startColumn': 9,
            'startLine': 15
          },
          'sourceInformation': {
            'endColumn': 18,
            'endLine': 15,
            'mainColumn': 3,
            'mainLine': 15,
            'sourceId': 'ui::PersonSource-property-name',
            'startColumn': 3,
            'startLine': 15
          },
          'stereotypes': [],
          'taggedValues': [],
          'type': 'String'
        },
        {
          'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
          'name': 'employer',
          'propertyTypeSourceInformation': {
            'endColumn': 21,
            'endLine': 16,
            'mainColumn': 21,
            'mainLine': 16,
            'sourceId': 'ui::PersonSource-property-employer',
            'startColumn': 13,
            'startLine': 16
          },
          'sourceInformation': {
            'endColumn': 22,
            'endLine': 16,
            'mainColumn': 3,
            'mainLine': 16,
            'sourceId': 'ui::PersonSource-property-employer',
            'startColumn': 3,
            'startLine': 16
          },
          'stereotypes': [],
          'taggedValues': [],
          'type': 'String'
        }
      ],
      'qualifiedProperties': [],
      'sourceInformation': {
        'endColumn': 1,
        'endLine': 17,
        'mainColumn': 11,
        'mainLine': 13,
        'sourceId': 'ui::PersonSource',
        'startColumn': 1,
        'startLine': 13
      },
      'stereotypes': [],
      'superTypes': [],
      'taggedValues': []
    },
    'classifierPath': 'meta::pure::metamodel::type::Class'
  },
  {
    'path': 'ui::myMap',
    'content': {
      '_type': 'mapping',
      'associationMappings': [],
      'classMappings': [
        {
          '_type': 'pureInstance',
          'class': 'ui::Person',
          'id': 'ui_Person',
          'propertyMappings': [
            {
              '_type': 'purePropertyMapping',
              'explodeProperty': false,
              'property': {
                'class': 'ui::Person',
                'property': 'name',
                'sourceInformation': {
                  'endColumn': 8,
                  'endLine': 25,
                  'mainColumn': 5,
                  'mainLine': 25,
                  'sourceId': 'ui::myMap-class-ui_Person-name-',
                  'startColumn': 5,
                  'startLine': 25
                }
              },
              'source': 'ui_Person',
              'sourceInformation': {
                'endColumn': 18,
                'endLine': 25,
                'mainColumn': 11,
                'mainLine': 25,
                'sourceId': 'ui::myMap-class-ui_Person-name-',
                'startColumn': 5,
                'startLine': 25
              },
              'target': '',
              'transform': {
                '_type': 'lambda',
                'body': [
                  {
                    '_type': 'string',
                    'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
                    'sourceInformation': {
                      'endColumn': 18,
                      'endLine': 25,
                      'mainColumn': 11,
                      'mainLine': 25,
                      'sourceId': 'ui::myMap',
                      'startColumn': 11,
                      'startLine': 25
                    },
                    'values': ['string']
                  }
                ],
                'parameters': [
                  {
                    '_type': 'var',
                    'class': 'ui::PersonSource',
                    'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
                    'name': 'src'
                  }
                ]
              }
            },
            {
              '_type': 'purePropertyMapping',
              'explodeProperty': false,
              'property': {
                'class': 'ui::Person',
                'property': 'employer',
                'sourceInformation': {
                  'endColumn': 12,
                  'endLine': 26,
                  'mainColumn': 5,
                  'mainLine': 26,
                  'sourceId': 'ui::myMap-class-ui_Person-employer-notFound',
                  'startColumn': 5,
                  'startLine': 26
                }
              },
              'source': 'ui_Person',
              'sourceInformation': {
                'endColumn': 28,
                'endLine': 26,
                'mainColumn': 26,
                'mainLine': 26,
                'sourceId': 'ui::myMap-class-ui_Person-employer-notFound',
                'startColumn': 5,
                'startLine': 26
              },
              'target': 'notFound',
              'transform': {
                '_type': 'lambda',
                'body': [
                  {
                    '_type': 'var',
                    'name': 'src',
                    'sourceInformation': {
                      'endColumn': 28,
                      'endLine': 26,
                      'mainColumn': 26,
                      'mainLine': 26,
                      'sourceId': 'ui::myMap',
                      'startColumn': 25,
                      'startLine': 26
                    }
                  }
                ],
                'parameters': [
                  {
                    '_type': 'var',
                    'class': 'ui::PersonSource',
                    'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
                    'name': 'src'
                  }
                ]
              }
            }
          ],
          'root': true,
          'sourceInformation': {
            'endColumn': 3,
            'endLine': 27,
            'mainColumn': 8,
            'mainLine': 22,
            'sourceId': 'ui::myMap-class-ui_Person',
            'startColumn': 3,
            'startLine': 22
          },
          'srcClass': 'ui::PersonSource'
        },
        {
          '_type': 'pureInstance',
          'class': 'ui::Employeer',
          'id': 'ui__Employee',
          'propertyMappings': [
            {
              '_type': 'purePropertyMapping',
              'explodeProperty': false,
              'property': {
                'class': 'ui::Employeer',
                'property': 'name',
                'sourceInformation': {
                  'endColumn': 8,
                  'endLine': 32,
                  'mainColumn': 5,
                  'mainLine': 32,
                  'sourceId': 'ui::myMap-class-ui__Employee-name-',
                  'startColumn': 5,
                  'startLine': 32
                }
              },
              'source': 'ui__Employee',
              'sourceInformation': {
                'endColumn': 18,
                'endLine': 32,
                'mainColumn': 11,
                'mainLine': 32,
                'sourceId': 'ui::myMap-class-ui__Employee-name-',
                'startColumn': 5,
                'startLine': 32
              },
              'target': '',
              'transform': {
                '_type': 'lambda',
                'body': [
                  {
                    '_type': 'string',
                    'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
                    'sourceInformation': {
                      'endColumn': 18,
                      'endLine': 32,
                      'mainColumn': 11,
                      'mainLine': 32,
                      'sourceId': 'ui::myMap',
                      'startColumn': 11,
                      'startLine': 32
                    },
                    'values': ['string']
                  }
                ],
                'parameters': [
                  {
                    '_type': 'var',
                    'class': 'ui::PersonSource',
                    'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
                    'name': 'src'
                  }
                ]
              }
            },
            {
              '_type': 'purePropertyMapping',
              'explodeProperty': false,
              'property': {
                'class': 'ui::Employeer',
                'property': 'employees',
                'sourceInformation': {
                  'endColumn': 13,
                  'endLine': 33,
                  'mainColumn': 5,
                  'mainLine': 33,
                  'sourceId': 'ui::myMap-class-ui__Employee-employees-',
                  'startColumn': 5,
                  'startLine': 33
                }
              },
              'source': 'ui__Employee',
              'sourceInformation': {
                'endColumn': 16,
                'endLine': 33,
                'mainColumn': 16,
                'mainLine': 33,
                'sourceId': 'ui::myMap-class-ui__Employee-employees-',
                'startColumn': 5,
                'startLine': 33
              },
              'target': '',
              'transform': {
                '_type': 'lambda',
                'body': [
                  {
                    '_type': 'integer',
                    'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
                    'sourceInformation': {
                      'endColumn': 16,
                      'endLine': 33,
                      'mainColumn': 16,
                      'mainLine': 33,
                      'sourceId': 'ui::myMap',
                      'startColumn': 16,
                      'startLine': 33
                    },
                    'values': [4]
                  }
                ],
                'parameters': [
                  {
                    '_type': 'var',
                    'class': 'ui::PersonSource',
                    'multiplicity': { 'lowerBound': 1, 'upperBound': 1 },
                    'name': 'src'
                  }
                ]
              }
            }
          ],
          'root': true,
          'sourceInformation': {
            'endColumn': 3,
            'endLine': 34,
            'mainColumn': 8,
            'mainLine': 29,
            'sourceId': 'ui::myMap-class-ui__Employee',
            'startColumn': 3,
            'startLine': 29
          },
          'srcClass': 'ui::PersonSource'
        }
      ],
      'enumerationMappings': [],
      'includedMappings': [],
      'name': 'myMap',
      'package': 'ui',
      'sourceInformation': {
        'endColumn': 1,
        'endLine': 35,
        'mainColumn': 13,
        'mainLine': 20,
        'sourceId': 'ui::myMap',
        'startColumn': 1,
        'startLine': 20
      },
      'tests': []
    },
    'classifierPath': 'meta::pure::mapping::Mapping'
  }
];
