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

/**
 * Reproduces the graph-build failure that occurred when a parent Database
 * `include`s a child Database whose only source of schemas is
 * `include Ingest` (ingest-generated databases), and the parent defines a
 * Join / Filter that references a schema that lives only in one of those
 * ingest-generated databases.
 *
 * NOTE: object keys inside `content` are ordered alphabetically (ASCII
 * ordering, so `_type` sorts before lowercase keys) to satisfy the
 * roundtrip helper's `TEST__ensureObjectFieldsAreSortedAlphabetically`
 * check.
 */

const varchar200Column = (name: string): object => ({
  genericType: {
    multiplicityArguments: [],
    rawType: {
      _type: 'packageableType',
      fullPath: 'Varchar',
    },
    typeArguments: [],
    typeVariableValues: [
      {
        _type: 'integer',
        value: 200,
      },
    ],
  },
  multiplicity: {
    lowerBound: 0,
    upperBound: 1,
  },
  name,
});

export const TEST_DATA__IngestIncludeTransitiveRoundtrip = [
  {
    path: 'zoo::store::ParkStore',
    content: {
      _type: 'relational',
      filters: [],
      includedStores: [
        {
          path: 'zoo::store::AnimalStore',
          type: 'STORE',
        },
      ],
      joins: [
        {
          name: 'Animal_Keeper_Join',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'KEEPER_ID',
                table: {
                  _type: 'Table',
                  database: 'zoo::store::ParkStore',
                  mainTableDb: 'zoo::store::ParkStore',
                  schema: 'ZOO',
                  table: 'ANIMALS',
                },
                tableAlias: 'ANIMALS',
              },
              {
                _type: 'column',
                column: 'KEEPER_ID',
                table: {
                  _type: 'Table',
                  database: 'zoo::store::ParkStore',
                  mainTableDb: 'zoo::store::ParkStore',
                  schema: 'ZOO',
                  table: 'HABITATS',
                },
                tableAlias: 'HABITATS',
              },
            ],
          },
        },
      ],
      name: 'ParkStore',
      package: 'zoo::store',
      schemas: [],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'zoo::store::AnimalStore',
    content: {
      _type: 'relational',
      filters: [],
      includedStoreSpecifications: [
        {
          packageableElementPointer: {
            path: 'zoo::lakehouse::ingestDefinitions::ZOO::ANIMALS',
          },
          storeType: 'Ingest',
        },
        {
          packageableElementPointer: {
            path: 'zoo::lakehouse::ingestDefinitions::ZOO::HABITATS',
          },
          storeType: 'Ingest',
        },
      ],
      joins: [
        {
          name: 'Animal_Habitat_Join',
          operation: {
            _type: 'dynaFunc',
            funcName: 'equal',
            parameters: [
              {
                _type: 'column',
                column: 'HABITAT_ID',
                table: {
                  _type: 'Table',
                  database: 'zoo::store::AnimalStore',
                  mainTableDb: 'zoo::store::AnimalStore',
                  schema: 'ZOO',
                  table: 'ANIMALS',
                },
                tableAlias: 'ANIMALS',
              },
              {
                _type: 'column',
                column: 'HABITAT_ID',
                table: {
                  _type: 'Table',
                  database: 'zoo::store::AnimalStore',
                  mainTableDb: 'zoo::store::AnimalStore',
                  schema: 'ZOO',
                  table: 'HABITATS',
                },
                tableAlias: 'HABITATS',
              },
            ],
          },
        },
      ],
      name: 'AnimalStore',
      package: 'zoo::store',
      schemas: [],
    },
    classifierPath: 'meta::relational::metamodel::Database',
  },
  {
    path: 'zoo::lakehouse::ingestDefinitions::ZOO::ANIMALS',
    content: {
      _type: 'ingestDefinition',
      datasetGroup: 'ZOO',
      datasets: [
        {
          ingestPartitionColumns: [],
          name: 'ANIMALS',
          preprocessors: [],
          primaryKey: ['ANIMAL_ID'],
          privacyClassification: {
            sensitivity: 'DP10',
          },
          source: {
            _type: 'serializedSource',
            schema: {
              _type: 'relationType',
              columns: [
                varchar200Column('ANIMAL_ID'),
                varchar200Column('NAME'),
                varchar200Column('SPECIES'),
                varchar200Column('HABITAT_ID'),
                varchar200Column('KEEPER_ID'),
              ],
            },
          },
          storageLayoutClusterColumns: [],
          storageLayoutPartitionColumns: [],
        },
      ],
      name: 'ANIMALS',
      owner: {
        _type: 'appDir',
        prodParallel: {
          appDirId: 222222,
          level: 'DEPLOYMENT',
        },
        production: {
          appDirId: 111111,
          level: 'DEPLOYMENT',
        },
      },
      package: 'zoo::lakehouse::ingestDefinitions::ZOO',
      readMode: {
        _type: 'Delta',
        format: {
          _type: 'Parquet',
        },
      },
      stereotypes: [],
      taggedValues: [],
      writeMode: {
        _type: 'batch_milestoned',
      },
    },
    classifierPath:
      'meta::external::ingest::specification::metamodel::IngestDefinition',
  },
  {
    path: 'zoo::lakehouse::ingestDefinitions::ZOO::HABITATS',
    content: {
      _type: 'ingestDefinition',
      datasetGroup: 'ZOO',
      datasets: [
        {
          ingestPartitionColumns: [],
          name: 'HABITATS',
          preprocessors: [],
          primaryKey: ['HABITAT_ID'],
          privacyClassification: {
            sensitivity: 'DP10',
          },
          source: {
            _type: 'serializedSource',
            schema: {
              _type: 'relationType',
              columns: [
                varchar200Column('HABITAT_ID'),
                varchar200Column('NAME'),
                varchar200Column('KEEPER_ID'),
              ],
            },
          },
          storageLayoutClusterColumns: [],
          storageLayoutPartitionColumns: [],
        },
      ],
      name: 'HABITATS',
      owner: {
        _type: 'appDir',
        prodParallel: {
          appDirId: 222222,
          level: 'DEPLOYMENT',
        },
        production: {
          appDirId: 111111,
          level: 'DEPLOYMENT',
        },
      },
      package: 'zoo::lakehouse::ingestDefinitions::ZOO',
      readMode: {
        _type: 'Delta',
        format: {
          _type: 'Parquet',
        },
      },
      stereotypes: [],
      taggedValues: [],
      writeMode: {
        _type: 'batch_milestoned',
      },
    },
    classifierPath:
      'meta::external::ingest::specification::metamodel::IngestDefinition',
  },
];
