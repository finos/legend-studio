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
  column,
  resolvedDataSpace,
  resolvedTable,
  TRADES_DATA_SPACE,
} from '../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { Query } from '../../graph/Query.js';
import { UNRESOLVED } from '../../graph/QueryNode.js';
import { buildSchemasAndValidity } from '../../inference/SchemaInference.js';
import {
  ERR_TYPING,
  MESSAGE_DATA_SPACE_SOURCE_UNSET,
  MESSAGE_DIFFERENT_DATA_SPACES,
  MESSAGE_SOURCE_KINDS_MIXED,
} from '../../messages/CubeMessages.js';
import { Schema } from '../../schema/Schema.js';
import { createNodeRegistry } from '../NodeRegistry.js';
import {
  type DataSpaceCoordinates,
  DataSpaceSource,
  dataSpaceSourcesShareContext,
  isDataSpaceRelation,
} from '../sources/DataSpaceSource.js';
import { isResolvableSource } from '../sources/ResolvableSource.js';
import type { JsonObject } from '../../utils/Json.js';
import { sourcesAreOneKind } from '../sources/SourceKinds.js';

const SCHEMA = new Schema([column('id'), column('quantity', 'Float')]);

const errorsOf = (node: DataSpaceSource): string[] => {
  const errors: string[] = [];
  node.validate([], errors);
  return errors;
};

const withRelation = (relation: unknown): DataSpaceCoordinates =>
  ({ ...TRADES_DATA_SPACE, relation }) as DataSpaceCoordinates;

describe(unitTest('Data space source'), () => {
  test('Holds its data space, execution context, entity and both lambdas, and has no input', () => {
    const node = new DataSpaceSource('dataSpace101', TRADES_DATA_SPACE);
    expect(node.type).toBe('dataSpace');
    expect(node.ports).toEqual([]);
    expect(node.resolution).toBe(UNRESOLVED);
    expect(node.dataSpaceName).toBe('TradesDataSpace');
    expect(node.entityName).toBe('Trade');
    expect(node.executionContext).toBe('production');
    expect(node.query).toBe(TRADES_DATA_SPACE.query);
    // what runs: the relation's one expression
    expect(node.relationExpression).toBe(
      (TRADES_DATA_SPACE.relation.body as unknown[])[0],
    );
    expect(isResolvableSource(node)).toBe(true);
  });

  test("Builds an unresolved source from the editor's coordinates, keeping none of its other keys", () => {
    const node = DataSpaceSource.fromCoordinates('dataSpace101', {
      ...TRADES_DATA_SPACE,
      mapping: 'trading::TradeMapping',
    });
    expect(node.resolution).toBe(UNRESOLVED);
    expect(node.rest).toEqual({});
    [
      undefined,
      [],
      { ...TRADES_DATA_SPACE, dataSpace: '' },
      { ...TRADES_DATA_SPACE, executionContext: undefined },
    ].forEach((coordinates) =>
      expect(() =>
        DataSpaceSource.fromCoordinates('dataSpace101', coordinates),
      ).toThrow(
        'A data space source needs a data space and an execution context',
      ),
    );
    [
      { ...TRADES_DATA_SPACE, entity: 3 },
      { ...TRADES_DATA_SPACE, entity: undefined },
      { ...TRADES_DATA_SPACE, query: 'trading::Trade.all()' },
      { ...TRADES_DATA_SPACE, relation: undefined },
    ].forEach((coordinates) =>
      expect(() =>
        DataSpaceSource.fromCoordinates('dataSpace101', coordinates),
      ).toThrow(
        'A data space source has an entity, a query and its relation together, or none of them',
      ),
    );
  });

  test('Is unset, and invalid, until its editor applies a query; then it is typed as any source', () => {
    const unset = DataSpaceSource.fromCoordinates('dataSpace101', {
      dataSpace: TRADES_DATA_SPACE.dataSpace,
      executionContext: TRADES_DATA_SPACE.executionContext,
    });
    expect(unset.isUnset()).toBe(true);
    expect(unset.describe()).toBe('Data space "TradesDataSpace"');
    expect(unset.entity).toBeUndefined();
    expect(unset.entityName).toBeUndefined();
    expect(unset.query).toBeUndefined();
    expect(errorsOf(unset)).toEqual([MESSAGE_DATA_SPACE_SOURCE_UNSET]);
    expect(() => unset.relationExpression).toThrow(
      'Data space source "dataSpace101" has no query yet: its editor writes one',
    );
    const applied = unset.withCoordinates(TRADES_DATA_SPACE);
    expect(applied.isUnset()).toBe(false);
    expect(applied.entityName).toBe('Trade');
    // waiting for the engine, which the editor asks as it lands
    expect(errorsOf(applied)).toEqual([ERR_TYPING]);
  });

  test('Takes a relation only as a lambda with no parameters and one expression', () => {
    const [expression] = TRADES_DATA_SPACE.relation.body as unknown[];
    [
      { _type: 'func', function: 'getAll', parameters: [] },
      { _type: 'lambda', body: [] },
      { _type: 'lambda', body: [expression, expression] },
      { _type: 'lambda', body: ['trades'] },
      {
        _type: 'lambda',
        body: [expression],
        parameters: [{ _type: 'var', name: 'businessDate' }],
      },
    ].forEach((relation) => {
      expect(isDataSpaceRelation(relation as JsonObject)).toBe(false);
      expect(
        () => new DataSpaceSource('dataSpace101', withRelation(relation)),
      ).toThrow(
        `A data space source's relation must be a lambda with no parameters and one expression`,
      );
    });
    // parameters can be left out
    expect(
      isDataSpaceRelation({
        _type: 'lambda',
        body: [expression as JsonObject],
      }),
    ).toBe(true);
  });

  test('Is valid once resolved, its schema the one resolved, and reports a failure by its first line', () => {
    const node = new DataSpaceSource('dataSpace101', TRADES_DATA_SPACE);
    expect(errorsOf(node)).toEqual([ERR_TYPING]);
    expect(node.schematize([])).toBeUndefined();
    // known before the engine types it
    expect(node.describe()).toBe(
      'Entity "Trade" from data space "TradesDataSpace"',
    );
    const resolved = node.withResolution({ kind: 'resolved', schema: SCHEMA });
    expect(resolved.id).toBe('dataSpace101');
    expect(resolved.relation).toBe(node.relation);
    expect(errorsOf(resolved)).toEqual([]);
    expect(resolved.schematize([])).toBe(SCHEMA);
    expect(resolved.describe()).toBe(
      'Entity "Trade" from data space "TradesDataSpace"',
    );
    const failed = node.withResolution({
      kind: 'failed',
      message: `Can't find property 'quantity'\nat line 1`,
    });
    expect(errorsOf(failed)).toEqual([`Can't find property 'quantity'`]);
  });

  test('Is unresolved again once the editor applies new coordinates, keeping its id', () => {
    const resolved = resolvedDataSpace('dataSpace101', [column('id')]);
    const applied = resolved.withCoordinates({
      ...TRADES_DATA_SPACE,
      entity: 'trading::Position',
    });
    expect(applied.id).toBe('dataSpace101');
    expect(applied.entityName).toBe('Position');
    expect(applied.resolution).toBe(UNRESOLVED);
  });

  test("Reads one data space in one execution context per query, the first source's", () => {
    const first = resolvedDataSpace('dataSpace101', [column('id')]);
    const sameContext = resolvedDataSpace('dataSpace102', [column('id')], {
      ...TRADES_DATA_SPACE,
      entity: 'trading::Position',
    });
    const otherContext = resolvedDataSpace('dataSpace103', [column('id')], {
      ...TRADES_DATA_SPACE,
      executionContext: 'uat',
    });
    const otherDataSpace = resolvedDataSpace('dataSpace104', [column('id')], {
      ...TRADES_DATA_SPACE,
      dataSpace: 'trading::RiskDataSpace',
    });
    const errors = dataSpaceSourcesShareContext(
      new Query(
        [first, sameContext, otherContext, otherDataSpace],
        [],
        'dataSpace101',
      ),
    );
    expect(Array.from(errors.keys())).toEqual(['dataSpace103', 'dataSpace104']);
    expect(errors.get('dataSpace103')).toEqual([
      MESSAGE_DIFFERENT_DATA_SPACES(
        'trading::TradesDataSpace (uat)',
        'trading::TradesDataSpace (production)',
      ),
    ]);
    expect(errors.get('dataSpace104')).toEqual([
      MESSAGE_DIFFERENT_DATA_SPACES(
        'trading::RiskDataSpace (production)',
        'trading::TradesDataSpace (production)',
      ),
    ]);
  });

  test('Is a kind of source of its own: mixed with any other kind, the later one is invalid', () => {
    const dataSpace = resolvedDataSpace('dataSpace101', [column('id')]);
    const table = resolvedTable('table101', 'ORDERS', [column('ID')]);
    expect(
      sourcesAreOneKind(new Query([dataSpace, table], [], 'dataSpace101')),
    ).toEqual(
      new Map([
        [
          'table101',
          [
            MESSAGE_SOURCE_KINDS_MIXED(
              ['database tables', 'data spaces'],
              'data spaces',
            ),
          ],
        ],
      ]),
    );
    // and the registry's rules carry both
    const { validity } = buildSchemasAndValidity(
      new Query([table, dataSpace], [], 'table101'),
      createNodeRegistry().queryRules,
    );
    expect(validity.get('dataSpace101')).toEqual([
      MESSAGE_SOURCE_KINDS_MIXED(
        ['database tables', 'data spaces'],
        'database tables',
      ),
    ]);
  });

  test('Is registered, in beta, with its own icon', () => {
    const definition = createNodeRegistry().get(DataSpaceSource.TYPE);
    expect(definition?.kind).toBe('source');
    expect(definition?.label).toBe('Data Space');
    expect(definition?.icon).toBe('dataSpace');
    expect(definition?.beta).toBe(true);
  });
});
