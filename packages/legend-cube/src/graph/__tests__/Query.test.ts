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
  resolvedTable,
  TestBinaryNode,
  TestUnaryNode,
} from '../../__test-utils__/CubeTestNodes.js';
import { UnknownNode } from '../../nodes/UnknownNode.js';
import { Connection } from '../Connection.js';
import { Query } from '../Query.js';
import type { QueryNode } from '../QueryNode.js';

const source = (id: string): QueryNode =>
  resolvedTable(id, id.toUpperCase(), [column('ID')]);
const unary = (id: string): QueryNode => new TestUnaryNode(id);
const binary = (id: string): QueryNode => new TestBinaryNode(id);
const edge = (s: string, t: string, port = 'tds'): Connection =>
  new Connection(s, t, port);

/** The connections as sorted text, for order-insensitive comparison */
const edges = (query: Query): string[] =>
  query.connections.map((c) => `${c.source}>${c.target}:${c.port}`).sort();

/** s → n → t, with t selected */
const chain = (): Query =>
  new Query(
    [source('s'), unary('n'), unary('t')],
    [edge('s', 'n'), edge('n', 't')],
    't',
  );

describe(unitTest('Query invariants'), () => {
  test('An empty query is valid', () => {
    const query = new Query();
    expect(query.isEmpty).toBe(true);
    expect(query.selected).toBeUndefined();
  });

  test.each<[string, () => Query]>([
    ['duplicate node ids', () => new Query([source('a'), unary('a')], [], 'a')],
    [
      'a connection from a missing node',
      () => new Query([unary('a')], [edge('x', 'a')], 'a'),
    ],
    [
      'a connection to a missing node',
      () => new Query([source('a')], [edge('a', 'x')], 'a'),
    ],
    [
      'a node feeding two nodes',
      () =>
        new Query(
          [source('s'), unary('a'), unary('b')],
          [edge('s', 'a'), edge('s', 'b')],
          'a',
        ),
    ],
    [
      'a selected node that is not in the query',
      () => new Query([source('a')], [], 'x'),
    ],
    ['nodes without a selected node', () => new Query([source('a')], [])],
    ['a selected node in an empty query', () => new Query([], [], 'a')],
    [
      'a cycle',
      () =>
        new Query(
          [unary('a'), unary('b')],
          [edge('a', 'b'), edge('b', 'a')],
          'a',
        ),
    ],
    [
      'a node feeding itself',
      () => new Query([unary('a')], [edge('a', 'a')], 'a'),
    ],
    [
      'a longer cycle',
      () =>
        new Query(
          [unary('a'), unary('b'), unary('c')],
          [edge('a', 'b'), edge('b', 'c'), edge('c', 'a')],
          'a',
        ),
    ],
    [
      'a connection to a port the target does not have',
      () => new Query([source('s'), unary('a')], [edge('s', 'a', 'tds2')], 'a'),
    ],
    [
      'two identical connections',
      () =>
        new Query(
          [source('s'), unary('a')],
          [edge('s', 'a'), edge('s', 'a')],
          'a',
        ),
    ],
    [
      'a node feeding both ports of one node',
      () =>
        new Query(
          [source('s'), binary('j')],
          [edge('s', 'j', 'tds1'), edge('s', 'j', 'tds2')],
          'j',
        ),
    ],
    [
      'a connection into a source',
      () => new Query([source('s'), source('t')], [edge('s', 't')], 's'),
    ],
  ])('Rejects %s', (_, build) => {
    expect(build).toThrow();
  });

  test('Port capacity is not an invariant: two inputs on one port are allowed by the constructor', () => {
    expect(
      () =>
        new Query(
          [source('s1'), source('s2'), unary('a')],
          [edge('s1', 'a'), edge('s2', 'a')],
          'a',
        ),
    ).not.toThrow();
  });

  test('Keeps its own frozen copies of nodes and connections', () => {
    const nodes = [source('s')];
    const query = new Query(nodes, [], 's');
    nodes.push(unary('n'));
    expect(query.nodes).toHaveLength(1);
    expect(Object.isFrozen(query.nodes)).toBe(true);
    expect(Object.isFrozen(query.connections)).toBe(true);
  });
});

describe(unitTest('Query lookups'), () => {
  test('Finds inputs in port order, outputs and free ports', () => {
    const query = new Query(
      [source('l'), source('r'), binary('j'), unary('f')],
      [edge('r', 'j', 'tds2'), edge('j', 'f')],
      'f',
    );
    expect(query.getInputIds('j')).toEqual([undefined, 'r']);
    expect(query.getFreePorts('j')).toEqual(['tds1']);
    expect(query.getOutputConnection('j')?.target).toBe('f');
    expect(query.getOutputConnection('f')).toBeUndefined();
    expect(query.isUpstreamOf('r', 'f')).toBe(true);
    expect(query.isUpstreamOf('f', 'r')).toBe(false);
    expect(query.isUpstreamOf('l', 'f')).toBe(false);
    expect(query.getInputIds('missing')).toEqual([]);
    expect(query.getFreePorts('missing')).toEqual([]);
  });
});

describe(unitTest('Generating ids'), () => {
  test('Starts at 101 and counts per type', () => {
    expect(new Query().generateId('filter')).toBe('filter101');
    const query = new Query(
      [new TestUnaryNode('testUnary101')],
      [],
      'testUnary101',
    );
    expect(query.generateId(TestUnaryNode.TYPE)).toBe('testUnary102');
    // a node of another type does not move the count
    expect(query.generateId(TestBinaryNode.TYPE)).toBe('testBinary101');
  });

  test('Continues from the highest number of the type', () => {
    const query = new Query(
      [new TestUnaryNode('testUnary7'), new TestUnaryNode('testUnary250')],
      [],
      'testUnary7',
    );
    expect(query.generateId(TestUnaryNode.TYPE)).toBe('testUnary251');
  });

  test('Ignores ids that are not the type followed by digits', () => {
    const query = new Query(
      [new TestUnaryNode('testUnary300x'), new TestUnaryNode('custom')],
      [],
      'custom',
    );
    expect(query.generateId(TestUnaryNode.TYPE)).toBe('testUnary101');
  });

  test('Falls back to the lowest free number when the id is taken by a node of another type', () => {
    const query = new Query(
      [new TestBinaryNode('testUnary101')],
      [],
      'testUnary101',
    );
    expect(query.generateId(TestUnaryNode.TYPE)).toBe('testUnary1');
  });

  test('Falls back when the next number is not a safe integer', () => {
    const query = new Query(
      [new TestUnaryNode('testUnary99999999999999999999')],
      [],
      'testUnary99999999999999999999',
    );
    expect(query.generateId(TestUnaryNode.TYPE)).toBe('testUnary1');
  });

  // nodes of another type taking the ids testUnary1 to testUnary<count>
  const takenIds = (count: number): Query =>
    new Query(
      Array.from(
        { length: count },
        (_, index) => new TestBinaryNode(`testUnary${index + 1}`),
      ),
      [],
      'testUnary1',
    );

  test('The fallback scan goes up to 10000 included', () => {
    expect(takenIds(9999).generateId(TestUnaryNode.TYPE)).toBe(
      'testUnary10000',
    );
  });

  test('Throws when every id up to 10000 is taken', () => {
    expect(() => takenIds(10000).generateId(TestUnaryNode.TYPE)).toThrow(
      /^too many query nodes of type "testUnary" to generate identifier$/u,
    );
  });

  test('Counts from 101 when every number of the type is at most 100', () => {
    const query = new Query(
      [new TestUnaryNode('testUnary7'), new TestUnaryNode('testUnary100')],
      [],
      'testUnary7',
    );
    expect(query.generateId(TestUnaryNode.TYPE)).toBe('testUnary101');
  });

  test('Ignores ids with another prefix of the same length, or a character before the digits', () => {
    const query = new Query(
      [new TestUnaryNode('abcdefghi500'), new TestUnaryNode('testUnaryx300')],
      [],
      'abcdefghi500',
    );
    expect(query.generateId(TestUnaryNode.TYPE)).toBe('testUnary101');
  });
});

describe(unitTest('Selecting'), () => {
  test('Selects an existing node that is not selected yet', () => {
    const query = chain();
    expect(query.canSelect('n')).toBe(true);
    expect(query.select('n').selected).toBe('n');
    expect(query.canSelect('t')).toBe(false);
    expect(query.canSelect('missing')).toBe(false);
    expect(() => query.select('t')).toThrow();
    expect(() => query.select('missing')).toThrow();
  });
});

describe(unitTest('Adding'), () => {
  test('Selects the first node added', () => {
    const query = new Query().add(source('s'));
    expect(query.selected).toBe('s');
    expect(query.connections).toHaveLength(0);
  });

  test('Keeps the selection when adding a node on its own', () => {
    const query = new Query().add(source('s')).add(source('t'));
    expect(query.selected).toBe('s');
    expect(query.connections).toHaveLength(0);
  });

  test('Connects a node added after another, selecting it when that node was selected', () => {
    const query = new Query().add(source('s')).add(unary('n'), 's');
    expect(edges(query)).toEqual(['s>n:tds']);
    expect(query.selected).toBe('n');
  });

  test('Splices a node added into a chain', () => {
    const query = chain().add(unary('x'), 's');
    expect(edges(query)).toEqual(['n>t:tds', 's>x:tds', 'x>n:tds']);
    // `s` was not selected, so the selection stays
    expect(query.selected).toBe('t');
  });

  test('Keeps the port of the connection it splices into', () => {
    const query = new Query(
      [source('l'), source('r'), binary('j')],
      [edge('l', 'j', 'tds1'), edge('r', 'j', 'tds2')],
      'j',
    ).add(unary('x'), 'r');
    expect(edges(query)).toEqual(['l>j:tds1', 'r>x:tds', 'x>j:tds2']);
  });

  test.each<[string, () => [Query, QueryNode, string | undefined]]>([
    ['an id already in the query', () => [chain(), unary('n'), undefined]],
    ['a node after itself', () => [chain(), unary('x'), 'x']],
    ['a node after a missing node', () => [chain(), unary('x'), 'missing']],
    ['a source after a node', () => [chain(), source('x'), 's']],
    [
      'an unknown node after a node',
      () => [chain(), new UnknownNode('x', 1), 's'],
    ],
  ])('Refuses %s', (_, build) => {
    const [query, node, afterId] = build();
    expect(query.canAdd(node, afterId)).toBe(false);
    expect(() => query.add(node, afterId)).toThrow();
  });
});

describe(unitTest('Moving'), () => {
  test('Disconnects the node, heals the chain it leaves and splices it in after the other node', () => {
    // s → n → t, and x on its own
    const query = new Query(
      [source('s'), unary('n'), unary('t'), source('x')],
      [edge('s', 'n'), edge('n', 't')],
      't',
    ).move('n', 'x');
    expect(edges(query)).toEqual(['s>t:tds', 'x>n:tds']);
    expect(query.selected).toBe('t');
  });

  test('Can move a node after a node further down its own chain, and stays acyclic', () => {
    // s → n → a → t
    const query = new Query(
      [source('s'), unary('n'), unary('a'), unary('t')],
      [edge('s', 'n'), edge('n', 'a'), edge('a', 't')],
      't',
    );
    expect(query.canMove('n', 'a')).toBe(true);
    // s → a → n → t
    expect(edges(query.move('n', 'a'))).toEqual([
      'a>n:tds',
      'n>t:tds',
      's>a:tds',
    ]);
  });

  test('Selects the moved node when moved after the selected node', () => {
    const query = new Query(
      [source('s'), unary('n'), source('x')],
      [edge('s', 'n')],
      'x',
    ).move('n', 'x');
    expect(query.selected).toBe('n');
  });

  test('Heals with the first input of a binary node', () => {
    const query = new Query(
      [source('l'), source('r'), binary('j'), unary('t'), source('x')],
      [edge('l', 'j', 'tds1'), edge('r', 'j', 'tds2'), edge('j', 't')],
      't',
    ).move('j', 'x');
    expect(edges(query)).toEqual(['l>t:tds', 'x>j:tds1']);
  });

  test.each<[string, string, string]>([
    ['a missing node', 'missing', 's'],
    ['after a missing node', 'n', 'missing'],
    ['a node after itself', 'n', 'n'],
    ['a source', 's', 'n'],
    ['a node after the node that already feeds it', 'n', 's'],
  ])('Refuses to move %s', (_, nodeId, afterId) => {
    const query = chain();
    expect(query.canMove(nodeId, afterId)).toBe(false);
    expect(() => query.move(nodeId, afterId)).toThrow();
  });

  test('Refuses to move an unknown node', () => {
    const query = new Query(
      [source('s'), new UnknownNode('u', 1), source('x')],
      [edge('s', 'u', 'in0')],
      'u',
    );
    expect(query.canMove('u', 'x')).toBe(false);
  });
});

describe(unitTest('Removing'), () => {
  test('Heals the chain', () => {
    expect(edges(chain().remove('n'))).toEqual(['s>t:tds']);
  });

  test('Heals with the first input of a binary node and drops the other', () => {
    const query = new Query(
      [source('l'), source('r'), binary('j'), unary('t')],
      [edge('l', 'j', 'tds1'), edge('r', 'j', 'tds2'), edge('j', 't')],
      't',
    ).remove('j');
    expect(edges(query)).toEqual(['l>t:tds']);
  });

  test('Heals with the only input of a binary node, even on its second port', () => {
    const query = new Query(
      [source('r'), binary('j'), unary('t')],
      [edge('r', 'j', 'tds2'), edge('j', 't')],
      't',
    ).remove('j');
    expect(edges(query)).toEqual(['r>t:tds']);
  });

  test('Drops the connections of a node with no input or no output', () => {
    expect(edges(chain().remove('s'))).toEqual(['n>t:tds']);
    expect(edges(chain().remove('t'))).toEqual(['s>n:tds']);
  });

  test('Moves the selection: kept, else the input, else the output, else the last node, else none', () => {
    expect(chain().remove('n').selected).toBe('t');
    expect(chain().select('n').remove('n').selected).toBe('s');
    expect(chain().select('s').remove('s').selected).toBe('n');
    const isolated = new Query(
      [source('a'), source('b'), source('c')],
      [],
      'a',
    );
    expect(isolated.remove('a').selected).toBe('c');
    expect(
      new Query([source('a')], [], 'a').remove('a').selected,
    ).toBeUndefined();
  });

  test('Heals into the port of an unknown node, which keeps its port', () => {
    const query = new Query(
      [source('r'), unary('n'), new UnknownNode('u', 1)],
      [edge('r', 'n'), edge('n', 'u', 'in0')],
      'u',
    ).remove('n');
    expect(edges(query)).toEqual(['r>u:in0']);
  });

  test('Refuses a missing node', () => {
    expect(chain().canRemove('missing')).toBe(false);
    expect(() => chain().remove('missing')).toThrow();
  });
});

describe(unitTest('Connecting'), () => {
  const joinQuery = (): Query =>
    new Query(
      [source('l'), source('r'), source('x'), binary('j')],
      [edge('l', 'j', 'tds1')],
      'j',
    );

  test('Connects to the first free port', () => {
    expect(edges(joinQuery().connect('r', 'j'))).toEqual([
      'l>j:tds1',
      'r>j:tds2',
    ]);
  });

  test('Connects to the given port', () => {
    const query = new Query([source('r'), binary('j')], [], 'j').connect(
      'r',
      'j',
      'tds2',
    );
    expect(edges(query)).toEqual(['r>j:tds2']);
    expect(query.selected).toBe('j');
  });

  test.each<[string, string, string, string | undefined]>([
    ['a missing source', 'missing', 'j', undefined],
    ['a missing target', 'r', 'missing', undefined],
    ['a node to itself', 'j', 'j', undefined],
    ['a source that already feeds a node', 'l', 'j', undefined],
    ['to a port that is taken', 'r', 'j', 'tds1'],
    ['to a port the target does not have', 'r', 'j', 'tds3'],
    ['to a node without a free port', 'r', 'l', undefined],
  ])('Refuses %s', (_, sourceId, targetId, port) => {
    const query = joinQuery();
    expect(query.canConnect(sourceId, targetId, port)).toBe(false);
    expect(() => query.connect(sourceId, targetId, port)).toThrow();
  });

  test('Refuses a connection that would close a cycle', () => {
    const query = new Query([unary('f1'), unary('f2')], [], 'f1').connect(
      'f1',
      'f2',
    );
    expect(query.canConnect('f2', 'f1')).toBe(false);
    expect(() => query.connect('f2', 'f1')).toThrow();
  });

  test('Refuses new inputs for an unknown node', () => {
    const query = new Query([source('s'), new UnknownNode('u', 2)], [], 'u');
    expect(query.canConnect('s', 'u')).toBe(false);
    expect(query.canConnect('s', 'u', 'in1')).toBe(false);
    // its own output can still feed another node
    expect(
      new Query([new UnknownNode('u', 0), unary('n')], [], 'n').canConnect(
        'u',
        'n',
      ),
    ).toBe(true);
  });
});

describe(unitTest('Swapping inputs'), () => {
  test('Swaps only the inputs of the node, keeping everything else', () => {
    const query = new Query(
      [source('l'), source('r'), binary('j'), unary('f')],
      [edge('l', 'j', 'tds1'), edge('r', 'j', 'tds2'), edge('j', 'f')],
      'f',
    );
    const swapped = query.swapInputs('j');
    expect(edges(swapped)).toEqual(['j>f:tds', 'l>j:tds2', 'r>j:tds1']);
    expect(swapped.selected).toBe('f');
    expect(swapped.nodes).toEqual(query.nodes);
    // swapping twice restores the inputs
    expect(edges(swapped.swapInputs('j'))).toEqual(edges(query));
  });

  test('Swaps both inputs of a binary node', () => {
    const query = new Query(
      [source('l'), source('r'), binary('j')],
      [edge('l', 'j', 'tds1'), edge('r', 'j', 'tds2')],
      'j',
    ).swapInputs('j');
    expect(edges(query)).toEqual(['l>j:tds2', 'r>j:tds1']);
  });

  test('Moves a single input to the other port', () => {
    const query = new Query(
      [source('l'), binary('j')],
      [edge('l', 'j', 'tds1')],
      'j',
    ).swapInputs('j');
    expect(edges(query)).toEqual(['l>j:tds2']);
  });

  test.each<[string, () => Query, string]>([
    ['a missing node', chain, 'missing'],
    ['a unary node', chain, 'n'],
    [
      'a binary node without inputs',
      () => new Query([binary('j')], [], 'j'),
      'j',
    ],
    [
      'an unknown node with two inputs',
      () =>
        new Query(
          [source('a'), source('b'), new UnknownNode('u', 2)],
          [edge('a', 'u', 'in0'), edge('b', 'u', 'in1')],
          'u',
        ),
      'u',
    ],
  ])('Refuses %s', (_, build, nodeId) => {
    const query = build();
    expect(query.canSwapInputs(nodeId)).toBe(false);
    expect(() => query.swapInputs(nodeId)).toThrow();
  });
});

describe(unitTest('Replacing and cloning'), () => {
  test('Replaces a node by id with a new node object, keeping its connections', () => {
    const replacement = unary('n');
    const query = chain().replace(replacement);
    expect(query.getNode('n')).toBe(replacement);
    expect(edges(query)).toEqual(edges(chain()));
  });

  test('Refuses the same node object, a missing node, or a node without the ports in use', () => {
    const query = chain();
    const sameNode = query.getNode('n');
    expect(sameNode && query.canReplace(sameNode)).toBe(false);
    expect(query.canReplace(unary('missing'))).toBe(false);
    expect(query.canReplace(source('n'))).toBe(false);
    expect(() => query.replace(source('n'))).toThrow(
      /^Can't replace node "n"$/u,
    );
    if (sameNode) {
      expect(() => query.replace(sameNode)).toThrow(
        /^Can't replace node "n"$/u,
      );
    }
    expect(() => query.replace(unary('missing'))).toThrow(
      /^Can't replace node "missing"$/u,
    );
  });

  test('Clones into a new object with the same content, as undo needs', () => {
    const query = chain();
    const copy = query.clone();
    expect(copy).not.toBe(query);
    expect(copy.nodes).toEqual(query.nodes);
    expect(edges(copy)).toEqual(edges(query));
    expect(copy.selected).toBe(query.selected);
  });
});

describe(unitTest('Query validity'), () => {
  test('Is valid when not empty and every node has no errors', () => {
    const query = chain();
    const valid = new Map([
      ['s', []],
      ['n', []],
      ['t', []],
    ]);
    expect(query.validate(valid)).toBe(true);
    expect(query.validate(new Map([...valid, ['n', ['error']]]))).toBe(false);
    expect(query.validate(new Map([['s', []]]))).toBe(false);
    expect(new Query().validate(new Map())).toBe(false);
  });
});

test(
  unitTest('Every predicate is total: it answers false and never throws'),
  () => {
    const queries = [new Query(), chain()];
    const ids = ['missing', '', 's', 'n', 't'];
    queries.forEach((query) => {
      ids.forEach((a) => {
        expect(() => query.canSelect(a)).not.toThrow();
        expect(() => query.canRemove(a)).not.toThrow();
        expect(() => query.canSwapInputs(a)).not.toThrow();
        expect(() => query.canAdd(unary(`new${a}`), a)).not.toThrow();
        ids.forEach((b) => {
          expect(() => query.canMove(a, b)).not.toThrow();
          [undefined, 'tds', 'tds2', ''].forEach((port) =>
            expect(() => query.canConnect(a, b, port)).not.toThrow(),
          );
        });
      });
      expect(query.canSelect('missing')).toBe(false);
      expect(query.canRemove('missing')).toBe(false);
      expect(query.canSwapInputs('missing')).toBe(false);
      expect(query.canMove('missing', 'missing')).toBe(false);
      expect(query.canConnect('missing', 'missing')).toBe(false);
    });
  },
);

describe(unitTest('Adding, more cases'), () => {
  test('Appends the node at the end, with or without a node to go after', () => {
    const ids = (query: Query): string[] => query.nodes.map((n) => n.id);
    expect(ids(chain().add(source('x')))).toEqual(['s', 'n', 't', 'x']);
    expect(ids(chain().add(unary('x'), 's'))).toEqual(['s', 'n', 't', 'x']);
  });

  test('Adds no connection without a node to go after', () => {
    const query = new Query().add(source('s')).add(unary('n'));
    expect(query.connections).toHaveLength(0);
    expect(query.selected).toBe('s');
    const withBinary = chain().add(binary('j'));
    expect(edges(withBinary)).toEqual(edges(chain()));
    expect(withBinary.selected).toBe('t');
  });

  test('Can splice a node in front of an unknown node, which keeps its port', () => {
    const query = new Query(
      [source('s'), new UnknownNode('u', 1)],
      [edge('s', 'u', 'in0')],
      'u',
    );
    expect(query.canAdd(unary('x'), 's')).toBe(true);
    expect(edges(query.add(unary('x'), 's'))).toEqual(['s>x:tds', 'x>u:in0']);
    const withSpare = new Query(
      [source('s'), new UnknownNode('u', 1), unary('y'), source('z')],
      [edge('s', 'u', 'in0'), edge('z', 'y')],
      'u',
    );
    expect(withSpare.canMove('y', 's')).toBe(true);
    expect(edges(withSpare.move('y', 's'))).toEqual(['s>y:tds', 'y>u:in0']);
  });
});

describe(unitTest('Healing follows port order, not connection order'), () => {
  // the connections list the second port first
  const outOfOrder = (): Query =>
    new Query(
      [source('l'), source('r'), binary('j'), unary('t'), source('x')],
      [edge('r', 'j', 'tds2'), edge('l', 'j', 'tds1'), edge('j', 't')],
      't',
    );

  test('When removing', () => {
    expect(edges(outOfOrder().remove('j'))).toEqual(['l>t:tds']);
    expect(outOfOrder().select('j').remove('j').selected).toBe('l');
    // after a swap, the right input is first
    expect(edges(outOfOrder().swapInputs('j').remove('j'))).toEqual([
      'r>t:tds',
    ]);
  });

  test('When moving', () => {
    expect(edges(outOfOrder().move('j', 'x'))).toEqual(['l>t:tds', 'x>j:tds1']);
  });

  test('A binary node fed on either port by a node can not move after it', () => {
    const query = outOfOrder();
    expect(query.canMove('j', 'r')).toBe(false);
    expect(query.canMove('j', 'l')).toBe(false);
    expect(() => query.move('j', 'r')).toThrow();
  });
});

describe(unitTest('Connecting, more cases'), () => {
  test('Without a port, connects to the first port in port order', () => {
    expect(new Query([binary('j')], [], 'j').getFreePorts('j')).toEqual([
      'tds1',
      'tds2',
    ]);
    expect(
      edges(new Query([source('l'), binary('j')], [], 'j').connect('l', 'j')),
    ).toEqual(['l>j:tds1']);
  });

  test('Refuses a target with every port taken', () => {
    const query = new Query(
      [source('l'), source('r'), source('x'), binary('j')],
      [edge('l', 'j', 'tds1'), edge('r', 'j', 'tds2')],
      'j',
    );
    expect(query.canConnect('x', 'j')).toBe(false);
    expect(() => query.connect('x', 'j')).toThrow();
    const unaryTaken = chain().add(source('z'));
    expect(unaryTaken.canConnect('z', 'n')).toBe(false);
  });
});

describe(unitTest('Operations keep what they should'), () => {
  test('Replacing keeps the node in place and keeps the selection', () => {
    const query = chain();
    const replaced = query.replace(unary('n'));
    expect(replaced.nodes.map((n) => n.id)).toEqual(['s', 'n', 't']);
    expect(replaced.selected).toBe('t');
    expect(
      new Query([source('a'), unary('f')], [edge('a', 'f')], 'f').replace(
        source('a'),
      ).selected,
    ).toBe('f');
  });

  test('Connecting keeps the selection', () => {
    const query = new Query(
      [source('l'), source('r'), source('x'), binary('j')],
      [],
      'x',
    );
    expect(query.connect('r', 'j').selected).toBe('x');
    expect(
      new Query([source('s'), unary('f')], [], 's').connect('s', 'f').selected,
    ).toBe('s');
  });

  test('Counts from 101 when the numbers of the type are all below 100', () => {
    expect(
      new Query([new TestUnaryNode('testUnary7')], [], 'testUnary7').generateId(
        TestUnaryNode.TYPE,
      ),
    ).toBe('testUnary101');
  });

  test('A node needs an id', () => {
    expect(() => new TestUnaryNode('')).toThrow(
      'Query node id cannot be empty',
    );
    expect(() => source('')).toThrow();
  });
});
