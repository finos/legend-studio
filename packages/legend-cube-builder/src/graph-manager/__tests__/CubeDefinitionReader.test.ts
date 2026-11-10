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

import { describe, expect, test } from '@jest/globals';
import {
  buildSchemasAndValidity,
  CUBE_QUERY_READER_MESSAGE,
  CubeLambdaReadErrorKind,
  ExpressionFilter,
  Extend,
  Filter,
  Group,
  IngestDatasetSource,
  isSameCubeIR,
  TypeFamily,
  type IR,
} from '@finos/legend-cube';
import type { PlainObject } from '@finos/legend-shared';
import { CUBE_DEFINITION_FLOW_MESSAGE } from '../../__lib__/LegendCubeDefinitionFlowLabels.js';
import {
  findCubeDefinitionIngestDefinitions,
  readCubeDefinition,
  type CubeDefinitionFlowReading,
  type CubeDefinitionReading,
} from '../CubeDefinitionReader.js';
import { readCubeLambdaJson } from '../protocol/pure/CubeProtocolJson.js';
import DEFINITIONS from './CubeAccessPointDefinitions.json' with { type: 'json' };

// A data product's access point definitions, as the data product carries
// them: the engine's grammar's JSON of each one's Pure (each `#I{…}#` read as
// the engine's parser reads one), and the ingest definition its data sets
// are in, as Depot gives its content. The data is made up.

const INGEST_DEFINITION = DEFINITIONS.ingestDefinition;
const { accessPoints } = DEFINITIONS;

/** The host's ingest definitions: the one the access points read */
const withIngestDefinition = {
  getIngestDefinition: (path: string): PlainObject | undefined =>
    path === INGEST_DEFINITION
      ? (DEFINITIONS.ingestDefinitionContent as PlainObject)
      : undefined,
};

const asFlow = (reading: CubeDefinitionReading): CubeDefinitionFlowReading => {
  if (reading.kind !== 'flow') {
    throw new Error(`Refused: ${reading.message}`);
  }
  return reading;
};

const stepTypes = (flow: CubeDefinitionFlowReading): string[] =>
  flow.steps.map((step) => step.type);

/** A lambda of one query, as the engine's grammar gives one */
const queryOf = (body: unknown): unknown => ({
  _type: 'lambda',
  parameters: [],
  body: [body],
});

/** The relation of an access point's definition, as JSON */
const relationOf = (key: keyof typeof accessPoints): unknown =>
  (accessPoints[key] as { body: unknown[] }).body[0];

/** A parameter as the engine's grammar declares one: its name, type and multiplicity */
const parameterOf = (
  name: string,
  type?: string,
  multiplicity: [number, number | undefined] = [1, 1],
): unknown => ({
  _type: 'var',
  name,
  ...(type === undefined
    ? {}
    : {
        genericType: {
          rawType: { _type: 'packageableType', fullPath: type },
          typeArguments: [],
          multiplicityArguments: [],
          typeVariableValues: [],
        },
      }),
  multiplicity: {
    lowerBound: multiplicity[0],
    ...(multiplicity[1] === undefined ? {} : { upperBound: multiplicity[1] }),
  },
});

/** A lambda of one query that takes parameters, as the engine's grammar gives one */
const queryWith = (parameters: unknown[], body: unknown): unknown => ({
  _type: 'lambda',
  parameters,
  body: [body],
});

const variableOf = (name: string): unknown => ({ _type: 'var', name });

/** `<relation>->filter(p|<predicate>)` */
const filterOf = (relation: unknown, predicate: unknown): unknown => ({
  _type: 'func',
  function: 'filter',
  parameters: [
    relation,
    {
      _type: 'lambda',
      parameters: [variableOf('p')],
      body: [predicate],
    },
  ],
});

/** `$p.<column>` */
const columnOf = (column: string): unknown => ({
  _type: 'property',
  property: column,
  parameters: [variableOf('p')],
});

/** The data set the access points read, `#I{…EOD_POSITIONS}#` */
const EOD_POSITIONS = {
  _type: 'classInstance',
  type: 'I',
  value: { metadata: false, path: [INGEST_DEFINITION, 'EOD_POSITIONS'] },
};

describe("Reading an access point's definition to draw it", () => {
  test('Reads it with no engine, its data sets typed from their ingest definition, every step checked', () => {
    const flow = asFlow(
      readCubeDefinition(
        accessPoints.POSITIONS_BY_LEGAL_ENTITY,
        withIngestDefinition,
      ),
    );
    expect(stepTypes(flow)).toEqual([
      IngestDatasetSource.TYPE,
      'filter',
      IngestDatasetSource.TYPE,
      'join',
      'group',
    ]);
    const [positions, filter, entities, join, group] = flow.steps;
    expect(flow.outputStepId).toBe(group?.id);
    expect(join?.inputs).toEqual([filter?.id, entities?.id]);
    expect(group?.inputs).toEqual([join?.id]);
    expect(
      [positions, entities].map((step) => {
        const node = flow.query.getNode(step?.id ?? '') as IngestDatasetSource;
        return [node.ingestDefinition, node.dataSet, node.resolution.kind];
      }),
    ).toEqual([
      [INGEST_DEFINITION, 'EOD_POSITIONS', 'resolved'],
      [INGEST_DEFINITION, 'LEGAL_ENTITIES', 'resolved'],
    ]);
    expect(flow.uncheckedStepIds).toEqual([]);
    expect(flow.unknownDataSets).toEqual([]);
    expect(flow.lets.size).toBe(0);
    // the group's sums are new columns of the output
    expect(
      buildSchemasAndValidity(flow.query)
        .schemas.get(flow.outputStepId)
        ?.names(),
    ).toEqual([
      'BUSINESS_DATE',
      'LEGAL_ENTITY_ID',
      'LEGAL_ENTITY_NAME',
      'INSTRUMENT_ID',
      'TOTAL_QUANTITY',
      'TOTAL_MARKET_VALUE_USD',
    ]);
  });

  test("Reads a group's sum named like the column it adds up, which only Cube's editor refuses, checked", () => {
    const flow = asFlow(
      readCubeDefinition(accessPoints.POSITIONS_BY_DESK, withIngestDefinition),
    );
    expect(stepTypes(flow)).toEqual([
      IngestDatasetSource.TYPE,
      'filter',
      'group',
    ]);
    expect(flow.uncheckedStepIds).toEqual([]);
    const group = flow.query.getNode(flow.outputStepId) as Group;
    expect(group).toBeInstanceOf(Group);
    expect(group.allowsInputNames).toBe(true);
    const { schemas, validity } = buildSchemasAndValidity(flow.query);
    expect([...validity.values()].flat()).toEqual([]);
    expect(schemas.get(group.id)?.names()).toEqual([
      'BUSINESS_DATE',
      'DESK',
      'QUANTITY',
      'MARKET_VALUE_USD',
    ]);
  });

  test("Draws a data set by name when the host doesn't have its ingest definition, or Cube can't read it, the steps after it unchecked", () => {
    [
      {},
      { getIngestDefinition: (): PlainObject | undefined => undefined },
      { getIngestDefinition: (): PlainObject => ({ _type: 'nothing' }) },
    ].forEach((options) => {
      const flow = asFlow(
        readCubeDefinition(accessPoints.POSITIONS_BY_BOOK, options),
      );
      expect(stepTypes(flow)).toEqual([
        IngestDatasetSource.TYPE,
        'filter',
        'group',
      ]);
      const [source, filter, group] = flow.steps;
      expect(
        (flow.query.getNode(source?.id ?? '') as IngestDatasetSource).resolution
          .kind,
      ).toBe('unresolved');
      expect(flow.unknownDataSets).toEqual([
        { ingestDefinition: INGEST_DEFINITION, dataSet: 'EOD_POSITIONS' },
      ]);
      expect(flow.uncheckedStepIds).toEqual([filter?.id, group?.id]);
    });
  });

  test('Names a data set its ingest definition lacks once, however often the definition reads it', () => {
    const positions = relationOf('POSITIONS_BY_DESK');
    const flow = asFlow(
      readCubeDefinition(
        queryOf({
          _type: 'func',
          function: 'concatenate',
          parameters: [positions, positions],
        }),
        {
          getIngestDefinition: () => ({
            ...(DEFINITIONS.ingestDefinitionContent as PlainObject),
            datasets: [],
          }),
        },
      ),
    );
    expect(flow.unknownDataSets).toEqual([
      { ingestDefinition: INGEST_DEFINITION, dataSet: 'EOD_POSITIONS' },
    ]);
    expect(
      flow.steps.filter((step) => step.type === IngestDatasetSource.TYPE),
    ).toHaveLength(2);
  });

  test('Keeps the relation each step was read from: the Pure up to it', () => {
    const lambda = accessPoints.POSITIONS_BY_LEGAL_ENTITY;
    const flow = asFlow(readCubeDefinition(lambda, withIngestDefinition));
    const output = flow.steps.find((step) => step.id === flow.outputStepId);
    const relation = (
      readCubeLambdaJson(lambda) as Extract<IR, { k: 'lambda' }>
    ).body[0] as IR;
    expect(isSameCubeIR(output?.ir as IR, relation)).toBe(true);
    expect(flow.steps[0]?.ir).toEqual({
      k: 'ingestAccessor',
      path: [INGEST_DEFINITION, 'EOD_POSITIONS'],
    });
  });

  test('Finds the ingest definitions a definition reads, once each, for the host to load first', () => {
    expect(
      findCubeDefinitionIngestDefinitions(
        accessPoints.POSITIONS_BY_LEGAL_ENTITY,
      ),
    ).toEqual([INGEST_DEFINITION]);
    // one with parameters too
    expect(
      findCubeDefinitionIngestDefinitions(accessPoints.CLIENT_POSITIONS),
    ).toEqual([INGEST_DEFINITION]);
    // a definition Cube can't read reads none it can say
    expect(
      findCubeDefinitionIngestDefinitions({
        _type: 'lambda',
        parameters: [],
        body: [EOD_POSITIONS, EOD_POSITIONS],
      }),
    ).toEqual([]);
    expect(findCubeDefinitionIngestDefinitions({})).toEqual([]);
  });

  test("Shows a filter's condition Cube's Filter doesn't write as it is, checked like the steps after it", () => {
    const flow = asFlow(
      readCubeDefinition(
        queryOf(
          filterOf(EOD_POSITIONS, {
            _type: 'func',
            function: 'equal',
            parameters: [columnOf('BOOK_ID'), columnOf('DESK')],
          }),
        ),
        withIngestDefinition,
      ),
    );
    const filter = flow.query.getNode(flow.outputStepId) as ExpressionFilter;
    expect(filter).toBeInstanceOf(ExpressionFilter);
    // no engine gives its text: Cube prints it
    expect(filter.code).toBe('p | $p.BOOK_ID == $p.DESK');
    expect(filter.isUnset()).toBe(false);
    expect(flow.uncheckedStepIds).toEqual([]);
    expect([...buildSchemasAndValidity(flow.query).validity.values()]).toEqual([
      [],
      [],
    ]);
    expect(flow.parameters).toEqual([]);
  });
});

describe("Reading a definition's parameters", () => {
  test('Reads a filter on parameters as a filter by expression, and lists each parameter with its type and the steps that read it', () => {
    const flow = asFlow(
      readCubeDefinition(accessPoints.CLIENT_POSITIONS, withIngestDefinition),
    );
    expect(stepTypes(flow)).toEqual([
      IngestDatasetSource.TYPE,
      ExpressionFilter.TYPE,
      'restrict',
    ]);
    const [source, filter, restrict] = flow.steps;
    expect(flow.outputStepId).toBe(restrict?.id);
    const node = flow.query.getNode(filter?.id ?? '') as ExpressionFilter;
    expect(node.code).toBe(
      'p | ($p.BUSINESS_DATE == $businessDate) && ($p.CLIENT_ACCOUNT_ID == $clientAccountId)',
    );
    expect(
      (flow.query.getNode(source?.id ?? '') as IngestDatasetSource).resolution
        .kind,
    ).toBe('resolved');
    expect(flow.uncheckedStepIds).toEqual([]);
    expect(flow.unknownDataSets).toEqual([]);
    const { schemas, validity } = buildSchemasAndValidity(flow.query);
    expect([...validity.values()].flat()).toEqual([]);
    expect(schemas.get(flow.outputStepId)?.names()).toEqual([
      'BUSINESS_DATE',
      'CLIENT_ACCOUNT_ID',
      'INSTRUMENT_ID',
      'QUANTITY',
    ]);
    expect(
      flow.parameters.map((parameter) => [
        parameter.name,
        parameter.type?.fullName,
        parameter.type?.family,
        parameter.multiplicity,
        parameter.stepIds,
      ]),
    ).toEqual([
      [
        'businessDate',
        'StrictDate',
        TypeFamily.STRICT_DATE,
        '[1]',
        [filter?.id],
      ],
      ['clientAccountId', 'String', TypeFamily.STRING, '[1]', [filter?.id]],
    ]);
  });

  test("Lists a parameter no step reads, one of a type Cube doesn't know, and one with no type", () => {
    const flow = asFlow(
      readCubeDefinition(
        queryWith(
          [
            parameterOf('desk', 'meta::pure::precisePrimitives::Varchar'),
            parameterOf('status', 'markets::PositionStatus', [0, 1]),
            parameterOf('asOf'),
          ],
          filterOf(EOD_POSITIONS, {
            _type: 'func',
            function: 'equal',
            parameters: [columnOf('DESK'), variableOf('desk')],
          }),
        ),
        withIngestDefinition,
      ),
    );
    const filter = flow.steps[1];
    expect(
      flow.parameters.map((parameter) => [
        parameter.name,
        parameter.type?.displayName,
        parameter.type?.family,
        parameter.multiplicity,
        parameter.stepIds,
      ]),
    ).toEqual([
      ['desk', 'Varchar', TypeFamily.OPAQUE, '[1]', [filter?.id]],
      ['status', 'PositionStatus', TypeFamily.OPAQUE, '[0..1]', []],
      ['asOf', undefined, undefined, '[1]', []],
    ]);
  });

  test('Reads a parameter of many values, and one in a new column, where the steps keep the Pure as it is', () => {
    const flow = asFlow(
      readCubeDefinition(
        queryWith(
          [
            parameterOf('books', 'String', [0, undefined]),
            parameterOf('asOf', 'StrictDate'),
          ],
          {
            _type: 'func',
            function: 'extend',
            parameters: [
              filterOf(EOD_POSITIONS, {
                _type: 'func',
                function: 'in',
                parameters: [columnOf('BOOK_ID'), variableOf('books')],
              }),
              {
                _type: 'classInstance',
                type: 'colSpec',
                value: {
                  name: 'AS_OF',
                  function1: {
                    _type: 'lambda',
                    parameters: [variableOf('p')],
                    body: [variableOf('asOf')],
                  },
                },
              },
            ],
          },
        ),
        withIngestDefinition,
      ),
    );
    expect(stepTypes(flow)).toEqual([
      IngestDatasetSource.TYPE,
      ExpressionFilter.TYPE,
      Extend.TYPE,
    ]);
    const [, filter, extend] = flow.steps;
    expect(
      flow.parameters.map((parameter) => [
        parameter.name,
        parameter.multiplicity,
        parameter.stepIds,
      ]),
    ).toEqual([
      ['books', '[*]', [filter?.id]],
      ['asOf', '[1]', [extend?.id]],
    ]);
  });

  test("Reads a lambda's own parameter named like the definition's as the lambda's", () => {
    const flow = asFlow(
      readCubeDefinition(
        queryWith(
          [parameterOf('p', 'String')],
          filterOf(EOD_POSITIONS, {
            _type: 'func',
            function: 'equal',
            parameters: [
              columnOf('STATUS'),
              { _type: 'string', value: 'SIGNED_OFF' },
            ],
          }),
        ),
        withIngestDefinition,
      ),
    );
    expect(flow.query.getNode(flow.outputStepId)).toBeInstanceOf(Filter);
    expect(flow.parameters.map((parameter) => parameter.stepIds)).toEqual([[]]);
  });
});

describe("Refusing a definition Cube can't draw", () => {
  test("Refuses a parameter where Cube can't show one, naming the function, with a kind a host can count", () => {
    const n = parameterOf('n', 'Integer');
    const limit = (relation: unknown, size: unknown): unknown => ({
      _type: 'func',
      function: 'limit',
      parameters: [relation, size],
    });
    // a size, below a filter on another parameter Cube does show
    expect(
      readCubeDefinition(
        queryWith(
          [parameterOf('desk', 'String'), n],
          limit(
            filterOf(EOD_POSITIONS, {
              _type: 'func',
              function: 'equal',
              parameters: [columnOf('DESK'), variableOf('desk')],
            }),
            variableOf('n'),
          ),
        ),
        withIngestDefinition,
      ),
    ).toEqual({
      kind: 'refused',
      reason: CubeLambdaReadErrorKind.PARAMETERS,
      functionName: 'limit',
      message: CUBE_QUERY_READER_MESSAGE.PARAMETER('limit', ['n']),
    });
    // a join's condition
    const join = readCubeDefinition(
      queryWith([parameterOf('lei', 'String')], {
        _type: 'func',
        function: 'join',
        parameters: [
          EOD_POSITIONS,
          {
            _type: 'classInstance',
            type: 'I',
            value: {
              metadata: false,
              path: [INGEST_DEFINITION, 'LEGAL_ENTITIES'],
            },
          },
          {
            _type: 'property',
            property: 'INNER',
            parameters: [
              {
                _type: 'packageableElementPtr',
                fullPath: 'meta::pure::functions::relation::JoinKind',
              },
            ],
          },
          {
            _type: 'lambda',
            parameters: [variableOf('p'), variableOf('e')],
            body: [
              {
                _type: 'func',
                function: 'equal',
                parameters: [columnOf('LEGAL_ENTITY_ID'), variableOf('lei')],
              },
            ],
          },
        ],
      }),
      withIngestDefinition,
    );
    expect(join.kind === 'refused' && [join.reason, join.functionName]).toEqual(
      [CubeLambdaReadErrorKind.PARAMETERS, 'join'],
    );
    // the rows themselves
    expect(
      readCubeDefinition(
        queryWith(
          [parameterOf('rows', 'meta::pure::metamodel::relation::Relation')],
          limit(variableOf('rows'), { _type: 'integer', value: 10 }),
        ),
        withIngestDefinition,
      ),
    ).toEqual({
      kind: 'refused',
      reason: CubeLambdaReadErrorKind.PARAMETERS,
      message: CUBE_QUERY_READER_MESSAGE.PARAMETER_ROWS('rows'),
    });
    // what Cube can't read whatever its values gets its own kind
    const olap = readCubeDefinition(
      queryWith([n], {
        _type: 'func',
        function: 'olapGroupBy',
        parameters: [EOD_POSITIONS, variableOf('n')],
      }),
      withIngestDefinition,
    );
    expect(olap.kind === 'refused' && olap.reason).toBe(
      CubeLambdaReadErrorKind.NO_STEP,
    );
  });

  test('Refuses a function Cube has no step for, naming it', () => {
    expect(
      readCubeDefinition(
        queryOf({
          _type: 'func',
          function: 'olapGroupBy',
          parameters: [relationOf('POSITIONS_BY_BOOK')],
        }),
        withIngestDefinition,
      ),
    ).toEqual({
      kind: 'refused',
      reason: CubeLambdaReadErrorKind.NO_STEP,
      functionName: 'olapGroupBy',
      message: CUBE_QUERY_READER_MESSAGE.NO_STEP('olapGroupBy'),
    });
  });

  test('Refuses a source other than an ingest data set, saying which', () => {
    const table = {
      _type: 'classInstance',
      type: '>',
      value: { path: ['db::Store', 'S', 'T'] },
    };
    const accessPoint = {
      _type: 'classInstance',
      type: 'P',
      value: { path: ['demo::Product', 'trades'] },
    };
    const join = (right: unknown): unknown => ({
      _type: 'func',
      function: 'concatenate',
      parameters: [relationOf('POSITIONS_BY_DESK'), right],
    });
    (
      [
        [table, CUBE_DEFINITION_FLOW_MESSAGE.TABLE],
        [accessPoint, CUBE_DEFINITION_FLOW_MESSAGE.ACCESS_POINT],
        [join(table), CUBE_DEFINITION_FLOW_MESSAGE.TABLE],
        [
          { _type: 'func', function: 'demo::trades', parameters: [] },
          CUBE_DEFINITION_FLOW_MESSAGE.FUNCTION('demo::trades'),
        ],
      ] as const
    ).forEach(([source, what]) =>
      expect(readCubeDefinition(queryOf(source), withIngestDefinition)).toEqual(
        {
          kind: 'refused',
          reason: CubeLambdaReadErrorKind.SOURCE,
          message: CUBE_DEFINITION_FLOW_MESSAGE.SOURCE(what),
        },
      ),
    );
  });

  test('Refuses a value Cube has no IR for, and what is no lambda', () => {
    const latest = readCubeDefinition(
      queryOf({
        _type: 'func',
        function: 'filter',
        parameters: [
          relationOf('POSITIONS_BY_BOOK'),
          {
            _type: 'lambda',
            parameters: [{ _type: 'var', name: 'p' }],
            body: [
              {
                _type: 'func',
                function: 'equal',
                parameters: [
                  {
                    _type: 'property',
                    property: 'BUSINESS_DATE',
                    parameters: [{ _type: 'var', name: 'p' }],
                  },
                  { _type: 'latestDate' },
                ],
              },
            ],
          },
        ],
      }),
      withIngestDefinition,
    );
    expect(latest.kind === 'refused' && latest.reason).toBe(
      CubeLambdaReadErrorKind.VALUE,
    );
    const notALambda = readCubeDefinition(
      { _type: 'integer', value: 1 },
      withIngestDefinition,
    );
    expect(notALambda.kind === 'refused' && notALambda.reason).toBe(
      CubeLambdaReadErrorKind.SHAPE,
    );
  });
});
