export const TEST_DATA__Function_genericType = [
  {
    path: 'my::firmFunction__Relation_1_',
    content: {
      _type: 'function',
      body: [
        {
          _type: 'func',
          function: 'select',
          parameters: [
            {
              _type: 'func',
              function: 'limit',
              parameters: [
                {
                  _type: 'classInstance',
                  type: '>',
                  value: {
                    path: ['my::testDB', 'personTable'],
                  },
                },
                {
                  _type: 'integer',
                  value: 10,
                },
              ],
            },
            {
              _type: 'classInstance',
              type: 'colSpecArray',
              value: {
                colSpecs: [
                  {
                    name: 'FIRSTNAME',
                  },
                  {
                    name: 'ID',
                  },
                  {
                    name: 'DOB',
                  },
                  {
                    name: '_BIG_INT',
                  },
                  {
                    name: '_SMALL_INT',
                  },
                  {
                    name: '_TINY_INT',
                  },
                ],
              },
            },
          ],
        },
      ],
      name: 'firmFunction__Relation_1_',
      package: 'my',
      parameters: [],
      postConstraints: [],
      preConstraints: [],
      returnGenericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'meta::pure::metamodel::relation::Relation',
        },
        typeArguments: [
          {
            rawType: {
              _type: 'relationType',
              columns: [
                {
                  genericType: {
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'Varchar',
                    },
                    typeVariableValues: [
                      {
                        _type: 'integer',
                        value: 100,
                      },
                    ],
                  },
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 1,
                  },
                  name: 'FIRSTNAME',
                },
                {
                  genericType: {
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'Integer',
                    },
                  },
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 1,
                  },
                  name: 'ID',
                },
                {
                  genericType: {
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'Timestamp',
                    },
                  },
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 1,
                  },
                  name: 'DOB',
                },
                {
                  genericType: {
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'BigInt',
                    },
                  },
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 1,
                  },
                  name: '_BIG_INT',
                },
                {
                  genericType: {
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'SmallInt',
                    },
                  },
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 1,
                  },
                  name: '_SMALL_INT',
                },
                {
                  genericType: {
                    rawType: {
                      _type: 'packageableType',
                      fullPath: 'TinyInt',
                    },
                  },
                  multiplicity: {
                    lowerBound: 0,
                    upperBound: 1,
                  },
                  name: '_TINY_INT',
                },
              ],
            },
          },
        ],
      },
      returnMultiplicity: {
        lowerBound: 1,
        upperBound: 1,
      },
    },
    classifierPath:
      'meta::pure::metamodel::function::ConcreteFunctionDefinition',
  },
  {
    path: 'my::testDB',
    content: {
      _type: 'relational',
      filters: [],
      joins: [],
      name: 'testDB',
      package: 'my',
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
                    size: 100,
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
                  name: 'FIRMID',
                  nullable: true,
                  type: {
                    _type: 'Integer',
                  },
                },
                {
                  name: 'DOB',
                  nullable: true,
                  type: {
                    _type: 'Timestamp',
                  },
                },
                {
                  name: '_BIG_INT',
                  nullable: true,
                  type: {
                    _type: 'BigInt',
                  },
                },
                {
                  name: '_SMALL_INT',
                  nullable: true,
                  type: {
                    _type: 'SmallInt',
                  },
                },
                {
                  name: '_TINY_INT',
                  nullable: true,
                  type: {
                    _type: 'TinyInt',
                  },
                },
              ],
              name: 'personTable',
              primaryKey: ['ID'],
            },
          ],
          views: [],
        },
      ],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
];
