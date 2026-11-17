/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { test, expect } from '@jest/globals';
import type { PlainObject } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import { RawLambda } from '../../graph/metamodel/pure/rawValueSpecification/RawLambda.js';
import { IngestAccessorQualifier } from '../../graph/metamodel/pure/packageableElements/relation/Accessor.js';
import {
  getIngestAccessorQualifierLabel,
  getIngestDatasetReadLabel,
} from '../../graph/helpers/IngestDefinitionHelper.js';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../__test-utils__/GraphManagerTestUtils.js';

const accessor = (path: string[], type = 'I'): PlainObject => ({
  _type: 'classInstance',
  type,
  value: { path, metadata: false },
});

test(
  unitTest(
    'The ingest data sets a lambda reads, once each, in the order it reads them, with no engine call',
  ),
  async () => {
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(graphManagerState, []);
    const { graphManager, graph } = graphManagerState;
    const lambda = new RawLambda(
      [],
      [
        {
          _type: 'func',
          function: 'letFunction',
          parameters: [
            { _type: 'string', value: 'eod' },
            accessor(['demo::TradesIngest', 'EOD']),
          ],
        },
        {
          _type: 'func',
          function: 'join',
          parameters: [
            { _type: 'var', name: 'eod' },
            {
              _type: 'func',
              function: 'concatenate',
              parameters: [
                accessor(['demo::OtherIngest', 'DESKS']),
                accessor(['demo::TradesIngest', 'EOD']),
                // a data product's access point is not an ingest data set
                accessor(['demo::Product', 'desks'], 'P'),
              ],
            },
          ],
        },
      ],
    );
    expect(
      graphManager
        .getIngestDatasetsReadByRawLambda(lambda, graph)
        .map(
          (reference) =>
            `${reference.ingestDefinitionPath}.${reference.datasetName}`,
        ),
    ).toEqual(['demo::TradesIngest.EOD', 'demo::OtherIngest.DESKS']);
    // a lambda it can't read reads none
    expect(
      graphManager.getIngestDatasetsReadByRawLambda(
        new RawLambda([], [{ _type: 'notAValueSpecification' }]),
        graph,
      ),
    ).toEqual([]);
  },
);

test(
  unitTest(
    "A data set's batch metadata is read apart from its rows, and named so",
  ),
  async () => {
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(graphManagerState, []);
    const { graphManager, graph } = graphManagerState;
    const metadata = (value: PlainObject): PlainObject => ({
      _type: 'classInstance',
      type: 'I',
      value: { path: ['demo::TradesIngest', 'TRADES'], ...value },
    });
    // each trade joined to its batch, then the batches again, written before
    // there was a qualifier: the rows, then the batch metadata, once
    const lambda = new RawLambda(
      [],
      [
        {
          _type: 'func',
          function: 'concatenate',
          parameters: [
            {
              _type: 'func',
              function: 'join',
              parameters: [
                accessor(['demo::TradesIngest', 'TRADES']),
                metadata({ metadata: true, accessorQualifier: 'metadata' }),
              ],
            },
            metadata({ metadata: true }),
          ],
        },
      ],
    );
    const references = graphManager.getIngestDatasetsReadByRawLambda(
      lambda,
      graph,
    );
    expect(
      references.map((reference) => [
        reference.datasetName,
        reference.qualifier,
      ]),
    ).toEqual([
      ['TRADES', undefined],
      ['TRADES', IngestAccessorQualifier.METADATA],
    ]);
    expect(
      references.map((reference) =>
        getIngestDatasetReadLabel(reference.datasetName, reference.qualifier),
      ),
    ).toEqual(['TRADES', 'TRADES (batch metadata)']);
    expect(
      Object.values(IngestAccessorQualifier).map(
        getIngestAccessorQualifierLabel,
      ),
    ).toEqual([
      'batch metadata',
      'incoming',
      'milestoned',
      'incoming milestoned',
    ]);
  },
);

/** A function element returning a relation, whose body reads one ingest data set */
const functionReading = (
  pkg: string,
  name: string,
  parameterTypes: string[],
  dataSet: string,
): PlainObject => {
  const suffix = `_${parameterTypes.map((type) => `${type}_1_`).join('_')}_Relation_1_`;
  return {
    path: `${pkg}::${name}${suffix}`,
    classifierPath:
      'meta::pure::metamodel::function::ConcreteFunctionDefinition',
    content: {
      _type: 'function',
      package: pkg,
      name: `${name}${suffix}`,
      parameters: parameterTypes.map((type, index) => ({
        _type: 'var',
        name: `p${index}`,
        genericType: { rawType: { _type: 'packageableType', fullPath: type } },
        multiplicity: { lowerBound: 1, upperBound: 1 },
      })),
      returnGenericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'meta::pure::metamodel::relation::Relation',
        },
        typeArguments: [
          {
            rawType: {
              _type: 'packageableType',
              fullPath: 'meta::pure::metamodel::type::Any',
            },
          },
        ],
      },
      returnMultiplicity: { lowerBound: 1, upperBound: 1 },
      body: [accessor(['demo::TradesIngest', dataSet])],
      preConstraints: [],
      postConstraints: [],
      stereotypes: [],
      taggedValues: [],
      tests: [],
    },
  };
};

test(
  unitTest(
    'The ingest data sets a called function reads: the function of that exact name, taking as many values',
  ),
  async () => {
    const graphManagerState = TEST__getTestGraphManagerState();
    await TEST__buildGraphWithEntities(graphManagerState, [
      // a longer name that starts like the one called, listed first
      functionReading('demo', 'orders_above', ['Float'], 'ABOVE'),
      functionReading('demo', 'orders', [], 'ORDERS'),
      // overloads: one taking a value, one taking none
      functionReading('demo', 'byDesk', ['String'], 'ONE_DESK'),
      functionReading('demo', 'byDesk', [], 'ALL_DESKS'),
    ] as never[]);
    const { graphManager, graph } = graphManagerState;
    const read = (call: PlainObject): string[] =>
      graphManager
        .getIngestDatasetsReadByRawLambda(new RawLambda([], [call]), graph)
        .map((reference) => reference.datasetName);
    expect(
      read({ _type: 'func', function: 'demo::orders', parameters: [] }),
    ).toEqual(['ORDERS']);
    expect(
      read({
        _type: 'func',
        function: 'demo::byDesk',
        parameters: [{ _type: 'string', value: 'EMEA' }],
      }),
    ).toEqual(['ONE_DESK']);
    expect(
      read({ _type: 'func', function: 'demo::byDesk', parameters: [] }),
    ).toEqual(['ALL_DESKS']);
    // a function the graph doesn't have is followed nowhere
    expect(
      read({ _type: 'func', function: 'demo::order', parameters: [] }),
    ).toEqual([]);
  },
);
