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
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import {
  column,
  enumColumn,
  resolvedTable,
} from '../../__test-utils__/CubeTestNodes.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import { Join, JoinType } from '../../nodes/transforms/Join.js';
import { Schema, type SchemaColumn } from '../../schema/Schema.js';
import { listOrigins } from '../../__test-utils__/CubeIRTestUtils.js';
import { type IR, storeAccessor } from '../CubeIR.js';
import {
  emitJoin,
  JOIN_KIND_PATH,
  JOIN_KINDS,
} from '../emitters/JoinEmitter.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter } from '../QueryEmitter.js';

const P = 'meta::pure::precisePrimitives::';
const KIND = 'meta::pure::functions::relation::JoinKind';
const L = '#>{test::Northwind.NORTHWIND.L}#';
const R = '#>{test::Northwind.NORTHWIND.R}#';
const T = '#>{test::Northwind.NORTHWIND.T}#';

const int = (name: string, nullable = false): SchemaColumn =>
  column(name, `${P}Int`, nullable);

const emitIR = (
  leftColumns: SchemaColumn[],
  rightColumns: SchemaColumn[],
  leftKeys: string[],
  rightKeys: string[],
  joinType: JoinType,
): IR =>
  new QueryEmitter(
    new Query(
      [
        resolvedTable('relational101', 'L', leftColumns),
        resolvedTable('relational102', 'R', rightColumns),
        new Join('join101', {
          leftColumns: leftKeys,
          rightColumns: rightKeys,
          joinType,
        }),
      ],
      [
        new Connection('relational101', 'join101', 'leftTds'),
        new Connection('relational102', 'join101', 'rightTds'),
      ],
      'join101',
    ),
  ).emitRelation('join101');

/** `L ⋈ R` on the keys, as printed IR */
const emit = (
  leftColumns: SchemaColumn[],
  rightColumns: SchemaColumn[],
  leftKeys: string[],
  rightKeys: string[],
  joinType: JoinType,
): string =>
  printIR(emitIR(leftColumns, rightColumns, leftKeys, rightKeys, joinType));

/** The IR nodes directly inside a node, in the order they are printed */
const childrenOf = (node: IR): readonly IR[] => {
  switch (node.k) {
    case 'func':
      return node.params;
    case 'property':
      return [node.receiver];
    case 'lambda':
      return node.body;
    case 'collection':
      return node.values;
    case 'colSpec':
      return [node.fn1, node.fn2].filter((fn): fn is IR => fn !== undefined);
    case 'colSpecArray':
      return node.specs;
    default:
      return [];
  }
};

/** Every IR node of a tree, in the order they are printed */
const nodesOf = (ir: IR): IR[] => [
  ir,
  ...childrenOf(ir).flatMap((child) => nodesOf(child)),
];

/** The name of every column spec (`~name`) and property (`.name`) in the IR, in order */
const namesOf = (ir: IR): string[] =>
  nodesOf(ir).flatMap((node) => {
    switch (node.k) {
      case 'colSpec':
        return [`~${node.name}`];
      case 'property':
        return [`.${node.name}`];
      default:
        return [];
    }
  });

describe(unitTest('Join emission'), () => {
  // a same-named key: renamed on the side whose value is not kept
  test.each<[JoinType, string]>([
    [
      JoinType.INNER,
      `${L}->join(${R}->rename(~id, ~id__cube_r), ${KIND}.INNER, {l, r | $l.id == $r.id__cube_r})->select(~[id, a, b])`,
    ],
    [
      JoinType.LEFT_OUTER,
      `${L}->join(${R}->rename(~id, ~id__cube_r), ${KIND}.LEFT, {l, r | $l.id == $r.id__cube_r})->select(~[id, a, b])`,
    ],
    [
      JoinType.RIGHT_OUTER,
      `${L}->rename(~id, ~id__cube_l)->join(${R}, ${KIND}.RIGHT, {l, r | $l.id__cube_l == $r.id})->select(~[id, a, b])`,
    ],
    [
      JoinType.FULL_OUTER,
      `${L}->rename(~id, ~id__cube_l)->join(${R}->rename(~id, ~id__cube_r), ${KIND}.FULL, {l, r | $l.id__cube_l == $r.id__cube_r})->extend(~[id: x | $x.id__cube_l->coalesce($x.id__cube_r)])->select(~[id, a, b])`,
    ],
  ])('Joins on a same-named key (%s)', (joinType, expected) => {
    expect(
      emit(
        [int('id'), column('a')],
        [int('id'), column('b')],
        ['id'],
        ['id'],
        joinType,
      ),
    ).toBe(expected);
  });

  // differently named keys: nothing to rename or merge
  test.each<[JoinType, string]>([
    [JoinType.INNER, 'INNER'],
    [JoinType.LEFT_OUTER, 'LEFT'],
    [JoinType.RIGHT_OUTER, 'RIGHT'],
    [JoinType.FULL_OUTER, 'FULL'],
  ])('Joins on differently named keys (%s)', (joinType, kind) => {
    expect(
      emit(
        [int('lk'), column('a')],
        [int('rk'), column('b')],
        ['lk'],
        ['rk'],
        joinType,
      ),
    ).toBe(
      `${L}->join(${R}, ${KIND}.${kind}, {l, r | $l.lk == $r.rk})->select(~[lk, rk, a, b])`,
    );
  });

  // two keys, one same-named: the comparisons are joined with `and`
  test.each<[JoinType, string]>([
    [
      JoinType.INNER,
      `${L}->join(${R}->rename(~id, ~id__cube_r), ${KIND}.INNER, {l, r | ($l.id == $r.id__cube_r) && ($l.k1 == $r.k2)})->select(~[id, k1, k2, a, b])`,
    ],
    [
      JoinType.LEFT_OUTER,
      `${L}->join(${R}->rename(~id, ~id__cube_r), ${KIND}.LEFT, {l, r | ($l.id == $r.id__cube_r) && ($l.k1 == $r.k2)})->select(~[id, k1, k2, a, b])`,
    ],
    [
      JoinType.RIGHT_OUTER,
      `${L}->rename(~id, ~id__cube_l)->join(${R}, ${KIND}.RIGHT, {l, r | ($l.id__cube_l == $r.id) && ($l.k1 == $r.k2)})->select(~[id, k1, k2, a, b])`,
    ],
    [
      JoinType.FULL_OUTER,
      `${L}->rename(~id, ~id__cube_l)->join(${R}->rename(~id, ~id__cube_r), ${KIND}.FULL, {l, r | ($l.id__cube_l == $r.id__cube_r) && ($l.k1 == $r.k2)})->extend(~[id: x | $x.id__cube_l->coalesce($x.id__cube_r)])->select(~[id, k1, k2, a, b])`,
    ],
  ])(
    'Joins on several keys, one of them same-named (%s)',
    (joinType, expected) => {
      expect(
        emit(
          [int('id'), int('k1'), column('a')],
          [int('id'), int('k2'), column('b')],
          ['id', 'k1'],
          ['id', 'k2'],
          joinType,
        ),
      ).toBe(expected);
    },
  );

  test('Folds three keys to the left, and renames in key order', () => {
    expect(
      emit(
        [int('b'), int('a'), int('c')],
        [int('a'), int('b'), int('c2')],
        ['a', 'b', 'c'],
        ['a', 'b', 'c2'],
        JoinType.FULL_OUTER,
      ),
    ).toBe(
      `${L}->rename(~a, ~a__cube_l)->rename(~b, ~b__cube_l)->join(${R}->rename(~a, ~a__cube_r)->rename(~b, ~b__cube_r), ${KIND}.FULL, {l, r | (($l.a__cube_l == $r.a__cube_r) && ($l.b__cube_l == $r.b__cube_r)) && ($l.c == $r.c2)})->extend(~[a: x | $x.a__cube_l->coalesce($x.a__cube_r), b: x | $x.b__cube_l->coalesce($x.b__cube_r)])->select(~[a, b, c, c2])`,
    );
  });

  test('Uses toOne() on the left key when both keys may be NULL', () => {
    const nullable = (joinType: JoinType): string =>
      emit([int('lk', true)], [int('rk', true)], ['lk'], ['rk'], joinType);
    expect(nullable(JoinType.INNER)).toBe(
      `${L}->join(${R}, ${KIND}.INNER, {l, r | $l.lk->toOne() == $r.rk})->select(~[lk, rk])`,
    );
    // under the temporary name
    expect(
      emit(
        [int('id', true)],
        [int('id', true)],
        ['id'],
        ['id'],
        JoinType.RIGHT_OUTER,
      ),
    ).toBe(
      `${L}->rename(~id, ~id__cube_l)->join(${R}, ${KIND}.RIGHT, {l, r | $l.id__cube_l->toOne() == $r.id})->select(~[id])`,
    );
    // not when one key can't be NULL, either way round, for every join type
    [
      JoinType.INNER,
      JoinType.LEFT_OUTER,
      JoinType.RIGHT_OUTER,
      JoinType.FULL_OUTER,
    ].forEach((joinType) => {
      expect(
        emit([int('lk', true)], [int('rk')], ['lk'], ['rk'], joinType),
      ).not.toContain('toOne');
      expect(
        emit([int('lk')], [int('rk', true)], ['lk'], ['rk'], joinType),
      ).not.toContain('toOne');
      expect(nullable(joinType)).toContain('$l.lk->toOne() == $r.rk');
    });
    // and per pair
    expect(
      emit(
        [int('a', true), int('b')],
        [int('a2', true), int('b2', true)],
        ['a', 'b'],
        ['a2', 'b2'],
        JoinType.INNER,
      ),
    ).toContain('{l, r | ($l.a->toOne() == $r.a2) && ($l.b == $r.b2)}');
  });

  test('Uses toOne() on keys that an outer join upstream made nullable', () => {
    // L ⟕ R makes R's columns nullable; then ⋈ T on R's column
    const query = new Query(
      [
        resolvedTable('relational101', 'L', [int('lk'), column('a')]),
        resolvedTable('relational102', 'R', [int('rk'), int('rv')]),
        resolvedTable('relational103', 'T', [int('tk', true)]),
        new Join('join101', {
          leftColumns: ['lk'],
          rightColumns: ['rk'],
          joinType: JoinType.LEFT_OUTER,
        }),
        new Join('join102', {
          leftColumns: ['rv'],
          rightColumns: ['tk'],
          joinType: JoinType.INNER,
        }),
      ],
      [
        new Connection('relational101', 'join101', 'leftTds'),
        new Connection('relational102', 'join101', 'rightTds'),
        new Connection('join101', 'join102', 'leftTds'),
        new Connection('relational103', 'join102', 'rightTds'),
      ],
      'join102',
    );
    expect(printIR(new QueryEmitter(query).emitRelation('join102'))).toBe(
      `${L}->join(${R}, ${KIND}.LEFT, {l, r | $l.lk == $r.rk})->select(~[lk, rk, a, rv])->join(${T}, ${KIND}.INNER, {l, r | $l.rv->toOne() == $r.tk})->select(~[rv, tk, lk, rk, a])`,
    );
  });

  test.each<[string, SchemaColumn, SchemaColumn, string]>([
    [
      'Varchar(15) and Varchar(2)',
      column('k', `${P}Varchar`, false, [15]),
      column('k', `${P}Varchar`, false, [2]),
      '->cast(@String)',
    ],
    [
      'Numeric(10,2) and Numeric(12,4)',
      column('k', `${P}Numeric`, false, [10, 2]),
      column('k', `${P}Numeric`, false, [12, 4]),
      '->cast(@Decimal)',
    ],
    [
      'Int and SmallInt',
      column('k', `${P}Int`),
      column('k', `${P}SmallInt`),
      '->cast(@Integer)',
    ],
    [
      'SmallInt and Double',
      column('k', `${P}SmallInt`),
      column('k', `${P}Double`),
      '->cast(@Number)',
    ],
    [
      'Timestamp and DateTime',
      column('k', `${P}Timestamp`),
      column('k', 'DateTime'),
      '->cast(@DateTime)',
    ],
    [
      'StrictDate and Date',
      column('k', 'StrictDate'),
      column('k', 'Date'),
      '->cast(@Date)',
    ],
    [
      'Varchar(15) twice',
      column('k', `${P}Varchar`, false, [15]),
      column('k', `${P}Varchar`, true, [15]),
      '',
    ],
    [
      'the same enumeration',
      enumColumn('k', 'a::Region', ['EMEA']),
      enumColumn('k', 'a::Region', ['EMEA', 'APAC']),
      '',
    ],
  ])(
    'Casts a FULL merged key of %s to their common type, if they differ',
    (_, left, right, cast) => {
      expect(emit([left], [right], ['k'], ['k'], JoinType.FULL_OUTER)).toBe(
        `${L}->rename(~k, ~k__cube_l)->join(${R}->rename(~k, ~k__cube_r), ${KIND}.FULL, {l, r | $l.k__cube_l == $r.k__cube_r})->extend(~[k: x | $x.k__cube_l->coalesce($x.k__cube_r)${cast}])->select(~[k])`,
      );
    },
  );

  test('Writes the cast type as a type argument, not an element', () => {
    const ir = emitIR(
      [column('k', `${P}Varchar`, false, [15])],
      [column('k', `${P}Varchar`, false, [2])],
      ['k'],
      ['k'],
      JoinType.FULL_OUTER,
    );
    // select(extend(join, ~[k: x | cast(coalesce(…), @String)]))
    const paramsOf = (node: IR | undefined, name: string): readonly IR[] => {
      if (node?.k !== 'func' || node.name !== name) {
        throw new Error(`Expected a call to ${name}`);
      }
      return node.params;
    };
    const [extend] = paramsOf(ir, 'select');
    const [, merges] = paramsOf(extend, 'extend');
    const spec = merges?.k === 'colSpecArray' ? merges.specs[0] : undefined;
    const merge = spec?.k === 'colSpec' ? spec.fn1 : undefined;
    const cast = merge?.k === 'lambda' ? merge.body[0] : undefined;
    expect(paramsOf(cast, 'cast')[1]).toEqual({
      k: 'genericType',
      path: 'String',
    });
  });

  test('Uses the temporary names in every pair that has a renamed key', () => {
    const repeated = (joinType: JoinType): string =>
      emit(
        [int('a'), column('x')],
        [int('a'), int('b'), column('y')],
        ['a', 'a'],
        ['a', 'b'],
        joinType,
      );
    expect(repeated(JoinType.INNER)).toBe(
      `${L}->join(${R}->rename(~a, ~a__cube_r), ${KIND}.INNER, {l, r | ($l.a == $r.a__cube_r) && ($l.a == $r.b)})->select(~[a, b, x, y])`,
    );
    expect(repeated(JoinType.RIGHT_OUTER)).toBe(
      `${L}->rename(~a, ~a__cube_l)->join(${R}, ${KIND}.RIGHT, {l, r | ($l.a__cube_l == $r.a) && ($l.a__cube_l == $r.b)})->select(~[a, b, x, y])`,
    );
    expect(repeated(JoinType.FULL_OUTER)).toBe(
      `${L}->rename(~a, ~a__cube_l)->join(${R}->rename(~a, ~a__cube_r), ${KIND}.FULL, {l, r | ($l.a__cube_l == $r.a__cube_r) && ($l.a__cube_l == $r.b)})->extend(~[a: x | $x.a__cube_l->coalesce($x.a__cube_r)])->select(~[a, b, x, y])`,
    );
    // a right key used twice
    expect(
      emit(
        [int('a'), int('b')],
        [int('a'), column('y')],
        ['a', 'b'],
        ['a', 'a'],
        JoinType.INNER,
      ),
    ).toBe(
      `${L}->join(${R}->rename(~a, ~a__cube_r), ${KIND}.INNER, {l, r | ($l.a == $r.a__cube_r) && ($l.b == $r.a__cube_r)})->select(~[a, b, y])`,
    );
  });

  test('Picks temporary names that no column has', () => {
    // the right input already has the first temporary name
    expect(
      emit(
        [int('id'), column('a')],
        [int('id'), column('id__cube_r')],
        ['id'],
        ['id'],
        JoinType.INNER,
      ),
    ).toBe(
      `${L}->join(${R}->rename(~id, ~id__cube_r2), ${KIND}.INNER, {l, r | $l.id == $r.id__cube_r2})->select(~[id, a, id__cube_r])`,
    );
    // so does the other input, on both sides, more than once
    expect(
      emit(
        [int('id'), column('id__cube_r'), column('id__cube_l2')],
        [int('id'), column('id__cube_l'), column('id__cube_r2')],
        ['id'],
        ['id'],
        JoinType.FULL_OUTER,
      ),
    ).toBe(
      `${L}->rename(~id, ~id__cube_l3)->join(${R}->rename(~id, ~id__cube_r3), ${KIND}.FULL, {l, r | $l.id__cube_l3 == $r.id__cube_r3})->extend(~[id: x | $x.id__cube_l3->coalesce($x.id__cube_r3)])->select(~[id, id__cube_r, id__cube_l2, id__cube_l, id__cube_r2])`,
    );
  });

  test('Picks temporary names that no column has in any case', () => {
    // a database that compares names without case takes ID__CUBE_R for id__cube_r
    expect(
      emit(
        [int('id'), column('ID__CUBE_R')],
        [int('id')],
        ['id'],
        ['id'],
        JoinType.INNER,
      ),
    ).toContain(`${R}->rename(~id, ~id__cube_r2)`);
    expect(
      emit(
        [int('id')],
        [int('id'), column('Id__Cube_L')],
        ['id'],
        ['id'],
        JoinType.FULL_OUTER,
      ),
    ).toContain(`${L}->rename(~id, ~id__cube_l2)`);
  });

  // the same pair of keys twice: one rename, one merge, two comparisons
  test.each<[JoinType, string]>([
    [
      JoinType.INNER,
      `${L}->join(${R}->rename(~a, ~a__cube_r), ${KIND}.INNER, {l, r | ($l.a == $r.a__cube_r) && ($l.a == $r.a__cube_r)})->select(~[a, x, y])`,
    ],
    [
      JoinType.LEFT_OUTER,
      `${L}->join(${R}->rename(~a, ~a__cube_r), ${KIND}.LEFT, {l, r | ($l.a == $r.a__cube_r) && ($l.a == $r.a__cube_r)})->select(~[a, x, y])`,
    ],
    [
      JoinType.RIGHT_OUTER,
      `${L}->rename(~a, ~a__cube_l)->join(${R}, ${KIND}.RIGHT, {l, r | ($l.a__cube_l == $r.a) && ($l.a__cube_l == $r.a)})->select(~[a, x, y])`,
    ],
    [
      JoinType.FULL_OUTER,
      `${L}->rename(~a, ~a__cube_l)->join(${R}->rename(~a, ~a__cube_r), ${KIND}.FULL, {l, r | ($l.a__cube_l == $r.a__cube_r) && ($l.a__cube_l == $r.a__cube_r)})->extend(~[a: x | $x.a__cube_l->coalesce($x.a__cube_r)])->select(~[a, x, y])`,
    ],
  ])('Joins on the same pair of keys twice (%s)', (joinType, expected) => {
    expect(
      emit(
        [int('a'), column('x')],
        [int('a'), column('y')],
        ['a', 'a'],
        ['a', 'a'],
        joinType,
      ),
    ).toBe(expected);
    // both keys nullable: toOne() in each comparison
    expect(
      emit(
        [int('a', true), column('x')],
        [int('a', true), column('y')],
        ['a', 'a'],
        ['a', 'a'],
        joinType,
      ).match(/->toOne\(\) == /gu),
    ).toHaveLength(2);
  });

  // names that are not identifiers: quoted in the text, as they are in the IR
  const SELECTED = `~['k.ey', 'a b', 'it\\'s', 'c.d', 'x y']`;
  const SELECTED_NAMES = ['~k.ey', '~a b', "~it's", '~c.d', '~x y'];
  test.each<[JoinType, string, string[]]>([
    [
      JoinType.INNER,
      `${L}->join(${R}->rename(~'k.ey', ~'k.ey__cube_r'), ${KIND}.INNER, {l, r | $l.'k.ey' == $r.'k.ey__cube_r'})->select(${SELECTED})`,
      ['~k.ey', '~k.ey__cube_r', '.k.ey', '.k.ey__cube_r', ...SELECTED_NAMES],
    ],
    [
      JoinType.LEFT_OUTER,
      `${L}->join(${R}->rename(~'k.ey', ~'k.ey__cube_r'), ${KIND}.LEFT, {l, r | $l.'k.ey' == $r.'k.ey__cube_r'})->select(${SELECTED})`,
      ['~k.ey', '~k.ey__cube_r', '.k.ey', '.k.ey__cube_r', ...SELECTED_NAMES],
    ],
    [
      JoinType.RIGHT_OUTER,
      `${L}->rename(~'k.ey', ~'k.ey__cube_l')->join(${R}, ${KIND}.RIGHT, {l, r | $l.'k.ey__cube_l' == $r.'k.ey'})->select(${SELECTED})`,
      ['~k.ey', '~k.ey__cube_l', '.k.ey__cube_l', '.k.ey', ...SELECTED_NAMES],
    ],
    [
      JoinType.FULL_OUTER,
      `${L}->rename(~'k.ey', ~'k.ey__cube_l')->join(${R}->rename(~'k.ey', ~'k.ey__cube_r'), ${KIND}.FULL, {l, r | $l.'k.ey__cube_l' == $r.'k.ey__cube_r'})->extend(~['k.ey': x | $x.'k.ey__cube_l'->coalesce($x.'k.ey__cube_r')->cast(@String)])->select(${SELECTED})`,
      [
        '~k.ey',
        '~k.ey__cube_l',
        '~k.ey',
        '~k.ey__cube_r',
        '.k.ey__cube_l',
        '.k.ey__cube_r',
        '~k.ey',
        '.k.ey__cube_l',
        '.k.ey__cube_r',
        ...SELECTED_NAMES,
      ],
    ],
  ])(
    'Keeps names that are not identifiers as they are (%s)',
    (joinType, expected, names) => {
      const ir = emitIR(
        [
          column('k.ey', `${P}Varchar`, false, [15]),
          column('a b'),
          column("it's"),
          column('c.d'),
        ],
        [column('k.ey', `${P}Varchar`, false, [2]), column('x y')],
        ['k.ey'],
        ['k.ey'],
        joinType,
      );
      expect(printIR(ir)).toBe(expected);
      // the IR has the raw names, unquoted: the serializer reads them
      expect(namesOf(ir)).toEqual(names);
    },
  );

  test.each<[JoinType, string]>([
    [JoinType.INNER, 'INNER'],
    [JoinType.LEFT_OUTER, 'LEFT'],
    [JoinType.RIGHT_OUTER, 'RIGHT'],
    [JoinType.FULL_OUTER, 'FULL'],
  ])('Emits the join kind as an enumeration value (%s)', (joinType, kind) => {
    const ir = emitIR(
      [int('id'), column('a')],
      [int('id'), column('b')],
      ['id'],
      ['id'],
      joinType,
    );
    // FULL nests the join in an extend
    const joins = nodesOf(ir).filter(
      (node) => node.k === 'func' && node.name === 'join',
    );
    expect(joins).toHaveLength(1);
    const [join] = joins;
    expect(JOIN_KINDS[joinType]).toBe(kind);
    expect(join?.k === 'func' ? join.params[2] : undefined).toEqual({
      k: 'enumValue',
      enumPath: JOIN_KIND_PATH,
      value: kind,
      origin: { nodeId: 'join101', role: 'join' },
    });
    expect(JOIN_KIND_PATH).toBe(KIND);
  });

  test('Gives each part of a FULL join its origin', () => {
    expect(
      listOrigins(
        emitIR(
          [
            column('id', 'Integer', true),
            column('k', `${P}Varchar`, true, [15]),
            column('a'),
          ],
          [
            column('id', 'Integer', true),
            column('k', `${P}Varchar`, false, [2]),
            column('b'),
          ],
          ['id', 'k'],
          ['id', 'k'],
          JoinType.FULL_OUTER,
        ),
      ),
    ).toEqual([
      'select@join101:select',
      'extend@join101:merge',
      'join@join101:join',
      // ->rename(~id, …)->rename(~k, …): the rename of k is the outer call
      'rename@join101:rename',
      'rename@join101:rename',
      `${L}@relational101:accessor`,
      'rename@join101:rename',
      'rename@join101:rename',
      `${R}@relational102:accessor`,
      `${KIND}.FULL@join101:join`,
      'and@join101:condition',
      // id: both keys nullable
      'equal@join101:condition',
      'toOne@join101:toOne',
      '.id__cube_l@join101:key',
      '.id__cube_r@join101:key',
      // k: only the left key nullable
      'equal@join101:condition',
      '.k__cube_l@join101:key',
      '.k__cube_r@join101:key',
      // id: the same type on both sides, no cast
      'coalesce@join101:coalesce',
      '.id__cube_l@join101:mergeKey',
      '.id__cube_r@join101:mergeKey',
      // k: Varchar(15) and Varchar(2)
      'cast@join101:cast',
      'coalesce@join101:coalesce',
      '.k__cube_l@join101:mergeKey',
      '.k__cube_r@join101:mergeKey',
    ]);
  });

  test('Gives each part of a RIGHT join its origin, and none to its inputs', () => {
    expect(
      listOrigins(
        emitJoin(
          new Join('join101', {
            leftColumns: ['id'],
            rightColumns: ['id'],
            joinType: JoinType.RIGHT_OUTER,
          }),
          [
            storeAccessor(['test::Northwind', 'NORTHWIND', 'L']),
            storeAccessor(['test::Northwind', 'NORTHWIND', 'R']),
          ],
          {
            inputSchemas: [
              new Schema([int('id'), column('a')]),
              new Schema([int('id'), column('b')]),
            ],
            schema: new Schema([int('id'), column('a'), column('b')]),
          },
        ),
      ),
    ).toEqual([
      'select@join101:select',
      'join@join101:join',
      // only the left side is renamed
      'rename@join101:rename',
      `${L}@-`,
      `${R}@-`,
      `${KIND}.RIGHT@join101:join`,
      'equal@join101:condition',
      '.id__cube_l@join101:key',
      '.id@join101:key',
    ]);
  });

  test('Joins in the order of the swapped inputs', () => {
    const query = new Query(
      [
        resolvedTable('relational101', 'L', [int('lk'), column('a')]),
        resolvedTable('relational102', 'R', [int('rk'), column('b')]),
        new Join('join101', {
          leftColumns: ['lk'],
          rightColumns: ['rk'],
          joinType: JoinType.LEFT_OUTER,
        }),
      ],
      [
        new Connection('relational101', 'join101', 'leftTds'),
        new Connection('relational102', 'join101', 'rightTds'),
      ],
      'join101',
    ).swapInputs('join101');
    expect(printIR(new QueryEmitter(query).emitRelation('join101'))).toBe(
      `${R}->join(${L}, ${KIND}.LEFT, {l, r | $l.rk == $r.lk})->select(~[rk, lk, b, a])`,
    );
  });

  test('Checks what it emits against the join schema', () => {
    const left = new Schema([int('k'), column('dup')]);
    const right = new Schema([int('k2'), column('dup')]);
    const inputs = [
      storeAccessor(['test::Northwind', 'NORTHWIND', 'L']),
      storeAccessor(['test::Northwind', 'NORTHWIND', 'R']),
    ];
    // an invalid join would give the engine a duplicate name
    expect(() =>
      emitJoin(
        new Join('join101', { leftColumns: ['k'], rightColumns: ['k2'] }),
        inputs,
        { inputSchemas: [left, right], schema: new Schema([int('k')]) },
      ),
    ).toThrow('Join "join101" would give the engine two columns named "dup"');
    // a schema that is not the join's
    expect(() =>
      emitJoin(
        new Join('join101', { leftColumns: ['k'], rightColumns: ['k2'] }),
        inputs,
        {
          inputSchemas: [new Schema([int('k')]), new Schema([int('k2')])],
          schema: new Schema([int('k2'), int('k')]),
        },
      ),
    ).toThrow('Join "join101" would select k, k2, but its schema is k2, k');
    // a schema with more columns than the select, or fewer (whole messages)
    expect(() =>
      emitJoin(
        new Join('join101', { leftColumns: ['k'], rightColumns: ['k2'] }),
        inputs,
        {
          inputSchemas: [new Schema([int('k')]), new Schema([int('k2')])],
          schema: new Schema([int('k'), int('k2'), int('extra')]),
        },
      ),
    ).toThrow(
      new Error(
        'Join "join101" would select k, k2, but its schema is k, k2, extra',
      ),
    );
    expect(() =>
      emitJoin(
        new Join('join101', { leftColumns: ['k'], rightColumns: ['k2'] }),
        inputs,
        {
          inputSchemas: [new Schema([int('k')]), new Schema([int('k2')])],
          schema: new Schema([int('k')]),
        },
      ),
    ).toThrow(
      new Error('Join "join101" would select k, k2, but its schema is k'),
    );
    expect(() =>
      emitJoin(
        new Join('join101', { leftColumns: ['k'], rightColumns: ['k2'] }),
        [],
        {
          inputSchemas: [],
          schema: new Schema([]),
        },
      ),
    ).toThrow('Join "join101" needs two inputs to be emitted');
  });
});
