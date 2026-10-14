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

import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import type { QueryNode, SourceNode } from '../../graph/QueryNode.js';
import { computeRowOrders } from '../../inference/RowOrder.js';
import { buildSchemasAndValidity } from '../../inference/SchemaInference.js';
import {
  createNodeRegistry,
  type NodeRegistry,
} from '../../nodes/NodeRegistry.js';
import {
  AggregationFunction,
  type ColumnAggregation,
} from '../../nodes/transforms/Aggregation.js';
import { Distinct } from '../../nodes/transforms/Distinct.js';
import { Drop } from '../../nodes/transforms/Drop.js';
import {
  ExpressionFilter,
  getExpressionFilterSignature,
} from '../../nodes/transforms/ExpressionFilter.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import { Group } from '../../nodes/transforms/Group.js';
import { Limit } from '../../nodes/transforms/Limit.js';
import { Rename, type RenameMapping } from '../../nodes/transforms/Rename.js';
import { Restrict } from '../../nodes/transforms/Restrict.js';
import { Slice } from '../../nodes/transforms/Slice.js';
import {
  type ColumnDirection,
  Sort,
  SortDirection,
} from '../../nodes/transforms/Sort.js';
import type { Schema } from '../../schema/Schema.js';
import type { JsonObject } from '../../utils/Json.js';
import type { IR } from '../CubeIR.js';
import { getCubeFunctionName, isSameCubeIR } from './CubeIRComparison.js';
import type { CubeLambdaParts } from './CubeLambdaParts.js';
import { CubeLambdaReadError } from './CubeLambdaReadError.js';
import { readFilterCondition } from './FilterReader.js';

// A lambda's relation read into steps (Import Pure, PLAN §11.18), from its
// sources up. Each step is read from the functions Cube writes for it, then,
// when its columns are known, written again by Cube's own emitter and kept
// only when it gives the same Pure, so a lambda Cube wrote reads back to the
// steps that wrote it. A condition Cube's Filter doesn't write the same
// becomes a Filter by Expression, which keeps it as it is.

export const CUBE_QUERY_READER_MESSAGE = {
  NO_STEP: (name: string): string =>
    `Cube has no step for ->${name}(), so it can't read this query.`,
  NOT_YET: (name: string): string =>
    `Cube can't read ->${name}() into a step yet.`,
  NOT_A_RELATION: 'Cube reads a query of rows, from a source through steps.',
  UNREADABLE: (name: string, why: string): string =>
    `Cube can't read ->${name}(): ${why}`,
  UNBOUND_LET: (name: string): string =>
    `The query reads $${name}, which nothing binds.`,
  UNREAD_LET: (name: string): string =>
    `Cube reads lets that bind steps of the query, and $${name} isn't one.`,
  COLUMNS: 'it names its columns as ~[…].',
  SIZE: 'its size must be a whole number of at least 1.',
  RANGE: 'its rows must be from one whole number to a larger one.',
  SORT_KEYS: 'each key is ~column->ascending() or ~column->descending().',
  AGGREGATION: (name: string): string =>
    `its column ~${name} isn't one Cube's Group writes (~name: x | $x.column : y | $y->sum(), …).`,
  RENAME: 'it renames ~a to ~b.',
};

/** The step a source of the lambda reads as, which the host binds before reading */
export interface CubeSourceStep {
  /** The step's type, which its id is made from */
  readonly type: string;
  /** The step, with this id */
  create(id: string): SourceNode;
}

/** How a step stores an expression's lambda: protocol JSON with no source information */
export interface CubeExpressionCodec {
  /** The JSON of a lambda, as a Filter by Expression or an Extend stores it */
  readonly write: (lambda: IR) => JsonObject;
  /** The IR of a stored lambda's JSON */
  readonly read: (json: JsonObject) => IR;
}

export interface CubeQueryReadOptions {
  /**
   * The step of each source the lambda reads: an accessor, or a function's
   * call. Throws a `CubeLambdaReadError` for a source the host can't bind.
   */
  readonly bindSource: (source: IR) => CubeSourceStep;
  readonly expressions: CubeExpressionCodec;
  readonly registry?: NodeRegistry | undefined;
}

export interface CubeQueryReading {
  /** The steps read, the last one selected */
  readonly query: Query;
  /** The steps read without being written again, as the columns before them weren't known */
  readonly unchecked: readonly string[];
  /** The steps Cube writes another way, reading the same rows */
  readonly rewritten: readonly string[];
}

/** A step read, and the IR it was read from: what the steps after it read */
interface ReadStep {
  readonly id: string;
  readonly ir: IR;
  /**
   * A Sort's input's IR, below the sort it was read from: a Limit, Drop or
   * Slice after it writes the sort itself, by its input's order
   */
  readonly belowSort?: IR | undefined;
}

/**
 * A candidate step written again: the Pure it was read from; other Pure,
 * valid; not valid on the columns before it, or not written at all; or not
 * known, as those columns aren't
 */
type CheckResult = 'same' | 'different' | 'invalid' | 'unknown';

/** A way to read a step, and when it may be taken other than written back the same */
interface Candidate {
  readonly node: QueryNode;
  /** When the columns before it aren't known */
  readonly takenUnchecked: boolean;
  /**
   * When Cube writes it another way: a step read only one way, which reads
   * the same rows however it is written, e.g. a Limit whose sort Cube writes
   * just before it
   */
  readonly takenWhenDifferent?: boolean;
}

/** The functions whose first parameters are relations, how many, so a source is anything else */
const RELATION_INPUTS: ReadonlyMap<string, number> = new Map([
  ['filter', 1],
  ['select', 1],
  ['groupBy', 1],
  ['aggregate', 1],
  ['limit', 1],
  ['drop', 1],
  ['slice', 1],
  ['sort', 1],
  ['distinct', 1],
  ['rename', 1],
  ['extend', 1],
  ['pivot', 1],
  ['cast', 1],
  ['join', 2],
  ['concatenate', 2],
]);

/** Whether the IR is a source: an accessor, or the call of a function of the model */
export const isCubeLambdaSource = (ir: IR): boolean =>
  ir.k === 'storeAccessor' ||
  ir.k === 'dataProductAccessor' ||
  ir.k === 'ingestAccessor' ||
  (ir.k === 'func' &&
    ir.name.includes('::') &&
    !RELATION_INPUTS.has(getCubeFunctionName(ir.name)));

/**
 * The sources a lambda's relation reads, in the order they are read: what the
 * host binds before the steps are read
 */
export const findCubeLambdaSources = (parts: CubeLambdaParts): IR[] => {
  const sources: IR[] = [];
  const visit = (ir: IR, lets: ReadonlySet<string>): void => {
    if (isCubeLambdaSource(ir)) {
      sources.push(ir);
    } else if (ir.k === 'var') {
      const bound = parts.lets.get(ir.name);
      if (bound && !lets.has(ir.name)) {
        visit(bound, new Set(lets).add(ir.name));
      }
    } else if (ir.k === 'func') {
      const inputs = RELATION_INPUTS.get(getCubeFunctionName(ir.name)) ?? 0;
      ir.params.slice(0, inputs).forEach((input) => visit(input, lets));
    }
  };
  visit(parts.relation, new Set());
  return sources;
};

const integerOf = (ir: IR | undefined): number | undefined => {
  if (ir?.k !== 'literal' || ir.value.kind !== 'integer') {
    return undefined;
  }
  const value = Number(ir.value.value);
  return Number.isSafeInteger(value) ? value : undefined;
};

/** `~[a, b]`, or `~a` */
const columnNamesOf = (ir: IR | undefined): string[] | undefined => {
  if (ir?.k === 'colSpec' && !ir.fn1) {
    return [ir.name];
  }
  if (ir?.k !== 'colSpecArray') {
    return undefined;
  }
  const names = ir.specs.map((spec) =>
    spec.k === 'colSpec' && !spec.fn1 ? spec.name : undefined,
  );
  return names.every((name) => name !== undefined) ? names : undefined;
};

/** `~c->ascending()`, `~c->descending()`, alone or in a list */
const sortKeysOf = (ir: IR | undefined): ColumnDirection[] | undefined => {
  const keys = ir?.k === 'collection' ? ir.values : ir ? [ir] : [];
  const read = keys.map((key): ColumnDirection | undefined => {
    if (key.k !== 'func' || key.params.length !== 1) {
      return undefined;
    }
    const name = getCubeFunctionName(key.name);
    const [column] = key.params;
    if (
      column?.k !== 'colSpec' ||
      column.fn1 ||
      (name !== 'ascending' && name !== 'descending')
    ) {
      return undefined;
    }
    return {
      column: column.name,
      direction: name === 'ascending' ? SortDirection.ASC : SortDirection.DESC,
    };
  });
  return read.length && read.every((key) => key !== undefined)
    ? read
    : undefined;
};

/** How a group reduces `$y`, by the function Cube writes for it */
const REDUCES: ReadonlyMap<string, AggregationFunction> = new Map([
  ['count', AggregationFunction.COUNT],
  ['uniqueValueOnly', AggregationFunction.DISTINCT_VALUE],
  ['sum', AggregationFunction.SUM],
  ['average', AggregationFunction.AVERAGE],
  ['min', AggregationFunction.MIN],
  ['max', AggregationFunction.MAX],
]);

/** `~name: x | $x.column : y | $y->sum()`, or `~name: x | 1 : y | $y->count()` (Count rows), as `emitAggregation` writes them */
const readAggregation = (spec: IR): ColumnAggregation | undefined => {
  if (spec.k !== 'colSpec' || !spec.fn1 || !spec.fn2) {
    return undefined;
  }
  const { fn1: map, fn2: reduce, name } = spec;
  if (
    map.k !== 'lambda' ||
    map.params.length !== 1 ||
    map.body.length !== 1 ||
    reduce.k !== 'lambda' ||
    reduce.params.length !== 1 ||
    reduce.body.length !== 1
  ) {
    return undefined;
  }
  const [row] = map.params as [string];
  const [values] = reduce.params as [string];
  const [value] = map.body as [IR];
  const [reduced] = reduce.body as [IR];
  const readsValues = (ir: IR | undefined): boolean =>
    ir?.k === 'var' && ir.name === values;
  if (reduced.k !== 'func' || reduced.params.length !== 1) {
    return undefined;
  }
  const reduceName = getCubeFunctionName(reduced.name);
  const [argument] = reduced.params as [IR];
  let fn: AggregationFunction | undefined;
  if (
    reduceName === 'count' &&
    argument.k === 'func' &&
    getCubeFunctionName(argument.name) === 'distinct' &&
    argument.params.length === 1 &&
    readsValues(argument.params[0])
  ) {
    fn = AggregationFunction.DISTINCT_COUNT;
  } else if (readsValues(argument)) {
    fn = REDUCES.get(reduceName);
  }
  if (fn === undefined) {
    return undefined;
  }
  // Count rows counts `1` for every row
  if (
    value.k === 'literal' &&
    value.value.kind === 'integer' &&
    value.value.value === '1' &&
    fn === AggregationFunction.COUNT
  ) {
    return {
      name,
      column: undefined,
      function: AggregationFunction.COUNT_ROWS,
    };
  }
  if (
    value.k !== 'property' ||
    value.receiver.k !== 'var' ||
    value.receiver.name !== row
  ) {
    return undefined;
  }
  return { name, column: value.name, function: fn };
};

class CubeQueryReader {
  private readonly registry: NodeRegistry;
  private readonly nodes: QueryNode[] = [];
  /**
   * What inference reads in place of a step: a Filter by Expression whose
   * condition is assumed to check, which the editor checks on import, so the
   * steps after it can be checked
   */
  private readonly assumed = new Map<string, QueryNode>();
  private readonly connections: Connection[] = [];
  private readonly unchecked: string[] = [];
  private readonly rewritten: string[] = [];
  private readonly readLets = new Set<string>();

  constructor(
    private readonly parts: CubeLambdaParts,
    private readonly options: CubeQueryReadOptions,
  ) {
    this.registry = options.registry ?? createNodeRegistry();
  }

  read(): CubeQueryReading {
    const last = this.readRelation(this.parts.relation, new Set());
    const unread = [...this.parts.lets.keys()].find(
      (name) => !this.readLets.has(name),
    );
    if (unread !== undefined) {
      throw new CubeLambdaReadError(
        CUBE_QUERY_READER_MESSAGE.UNREAD_LET(unread),
      );
    }
    return {
      query: new Query(this.nodes, this.connections, last.id),
      unchecked: this.unchecked,
      rewritten: this.rewritten,
    };
  }

  private nextId(type: string): string {
    return new Query(
      this.nodes,
      this.connections,
      this.nodes.at(-1)?.id,
    ).generateId(type);
  }

  /** The steps read so far, as inference reads them */
  private get inferenceNodes(): QueryNode[] {
    return this.nodes.map((node) => this.assumed.get(node.id) ?? node);
  }

  /** The step as inference reads it, given its input schemas */
  private assume(node: QueryNode, inputSchemas: readonly Schema[]): QueryNode {
    const [input] = inputSchemas;
    return node instanceof ExpressionFilter && node.lambda && input
      ? node.withCheck({
          kind: 'checked',
          signature: getExpressionFilterSignature(input, node.lambda),
        })
      : node;
  }

  private connectionsInto(
    node: QueryNode,
    inputs: readonly ReadStep[],
  ): Connection[] {
    return inputs.map(
      (input, index) =>
        new Connection(input.id, node.id, node.ports[index] as string),
    );
  }

  private add(
    node: QueryNode,
    inputs: readonly ReadStep[],
    ir: IR,
    assumed?: QueryNode,
  ): ReadStep {
    this.nodes.push(node);
    if (assumed && assumed !== node) {
      this.assumed.set(node.id, assumed);
    }
    this.connections.push(...this.connectionsInto(node, inputs));
    return { id: node.id, ir };
  }

  /** Whether the step's rows are already in this order, as Cube infers it */
  private isInOrder(id: string, sorts: readonly ColumnDirection[]): boolean {
    const order = computeRowOrders(
      new Query(this.inferenceNodes, this.connections, id),
    ).get(id);
    return (
      order?.length === sorts.length &&
      order.every(
        (key, index) =>
          key.column === sorts[index]?.column &&
          key.direction === sorts[index]?.direction,
      )
    );
  }

  /**
   * The candidate step written again by its emitter, on the schemas Cube
   * infers for it after the steps read so far, as a run writes it (with its
   * rows' order): whether it gives the Pure it was read from
   */
  private check(
    node: QueryNode,
    inputs: readonly ReadStep[],
    read: IR,
  ): { readonly result: CheckResult; readonly assumed: QueryNode } {
    const before = buildSchemasAndValidity(
      new Query(this.inferenceNodes, this.connections, this.nodes.at(-1)?.id),
      this.registry.queryRules,
    );
    const inputSchemas = inputs.map((input) => before.schemas.get(input.id));
    if (inputSchemas.some((schema) => schema === undefined)) {
      return { result: 'unknown', assumed: node };
    }
    const assumed = this.assume(node, inputSchemas as Schema[]);
    const query = new Query(
      [...this.inferenceNodes, assumed],
      [...this.connections, ...this.connectionsInto(assumed, inputs)],
      assumed.id,
    );
    const { schemas, validity } = buildSchemasAndValidity(
      query,
      this.registry.queryRules,
    );
    const schema = schemas.get(assumed.id);
    const definition = this.registry.get(assumed.type);
    if (!schema || validity.get(assumed.id)?.length || !definition) {
      return { result: 'invalid', assumed };
    }
    const [input] = inputs;
    const inputOrder =
      assumed.consumesInputOrder && input
        ? computeRowOrders(query).get(input.id)
        : undefined;
    try {
      const written = definition.emit(
        assumed as never,
        inputs.map((each) =>
          assumed.consumesInputOrder && each.belowSort !== undefined
            ? each.belowSort
            : each.ir,
        ),
        {
          inputSchemas: inputSchemas as Schema[],
          schema,
          ...(inputOrder ? { inputOrder } : {}),
        },
      );
      return {
        result: isSameCubeIR(written, read, {
          readExpression: this.options.expressions.read,
        })
          ? 'same'
          : 'different',
        assumed,
      };
    } catch {
      return { result: 'invalid', assumed };
    }
  }

  /**
   * The first candidate that writes back the same Pure, or, while the
   * columns aren't known, the first that may be taken unchecked
   */
  private choose(
    candidates: readonly Candidate[],
    inputs: readonly ReadStep[],
    read: IR,
    refusal: string,
  ): ReadStep {
    for (const candidate of candidates) {
      const { result, assumed } = this.check(candidate.node, inputs, read);
      if (result === 'same') {
        return this.add(candidate.node, inputs, read, assumed);
      }
      if (result === 'unknown' && candidate.takenUnchecked) {
        this.unchecked.push(candidate.node.id);
        return this.add(candidate.node, inputs, read, assumed);
      }
      if (result === 'different' && candidate.takenWhenDifferent) {
        this.rewritten.push(candidate.node.id);
        return this.add(candidate.node, inputs, read, assumed);
      }
    }
    throw new CubeLambdaReadError(refusal);
  }

  private readRelation(ir: IR, lets: ReadonlySet<string>): ReadStep {
    if (ir.k === 'var') {
      const bound = this.parts.lets.get(ir.name);
      if (!bound || lets.has(ir.name)) {
        throw new CubeLambdaReadError(
          CUBE_QUERY_READER_MESSAGE.UNBOUND_LET(ir.name),
        );
      }
      this.readLets.add(ir.name);
      // the steps after it read the variable, as the run that bound it wrote them
      const step = this.readRelation(bound, new Set(lets).add(ir.name));
      return { id: step.id, ir };
    }
    if (isCubeLambdaSource(ir)) {
      const source = this.options.bindSource(ir);
      return this.add(source.create(this.nextId(source.type)), [], ir);
    }
    if (ir.k !== 'func') {
      throw new CubeLambdaReadError(CUBE_QUERY_READER_MESSAGE.NOT_A_RELATION);
    }
    const name = getCubeFunctionName(ir.name);
    const inputCount = RELATION_INPUTS.get(name);
    if (inputCount === undefined) {
      throw new CubeLambdaReadError(CUBE_QUERY_READER_MESSAGE.NO_STEP(name));
    }
    const refuse = (why: string): never => {
      throw new CubeLambdaReadError(
        CUBE_QUERY_READER_MESSAGE.UNREADABLE(name, why),
      );
    };
    if (name === 'rename') {
      return this.readRenames(ir, lets, refuse);
    }
    const inputs = ir.params
      .slice(0, inputCount)
      .map((input) => this.readRelation(input, lets));
    const settings = ir.params.slice(inputCount);
    switch (name) {
      case 'filter':
        return this.readFilter(ir, inputs, settings[0], refuse);
      case 'groupBy':
      case 'aggregate':
        return this.readGroup(ir, inputs, name, settings, refuse);
      case 'select': {
        const columns = columnNamesOf(settings[0]);
        if (!columns || settings.length !== 1) {
          return refuse(CUBE_QUERY_READER_MESSAGE.COLUMNS);
        }
        return this.choose(
          [
            {
              node: new Restrict(this.nextId(Restrict.TYPE), columns),
              takenUnchecked: true,
              takenWhenDifferent: true,
            },
          ],
          inputs,
          ir,
          CUBE_QUERY_READER_MESSAGE.UNREADABLE(
            name,
            'its columns must be some of its input, in order.',
          ),
        );
      }
      case 'sort': {
        const sorts = sortKeysOf(settings[0]);
        if (!sorts || settings.length !== 1) {
          return refuse(CUBE_QUERY_READER_MESSAGE.SORT_KEYS);
        }
        // a sort writes nothing where it stands: the steps that take rows by
        // its order write it, and are checked with it; Cube writes the order
        // again before each one, which is no new step
        const [input] = inputs as [ReadStep];
        if (this.isInOrder(input.id, sorts)) {
          return { id: input.id, ir, belowSort: input.ir };
        }
        const node = new Sort(this.nextId(Sort.TYPE), sorts);
        this.add(node, inputs, input.ir);
        return { id: node.id, ir, belowSort: input.ir };
      }
      case 'limit':
      case 'drop': {
        const size = integerOf(settings[0]);
        if (size === undefined || size < 1 || settings.length !== 1) {
          return refuse(CUBE_QUERY_READER_MESSAGE.SIZE);
        }
        const node =
          name === 'limit'
            ? new Limit(this.nextId(Limit.TYPE), size)
            : new Drop(this.nextId(Drop.TYPE), size);
        return this.choose(
          [{ node, takenUnchecked: true, takenWhenDifferent: true }],
          inputs,
          ir,
          CUBE_QUERY_READER_MESSAGE.UNREADABLE(
            name,
            CUBE_QUERY_READER_MESSAGE.SIZE,
          ),
        );
      }
      case 'slice': {
        const start = integerOf(settings[0]);
        const stop = integerOf(settings[1]);
        if (
          start === undefined ||
          stop === undefined ||
          start < 0 ||
          stop <= start ||
          settings.length !== 2
        ) {
          return refuse(CUBE_QUERY_READER_MESSAGE.RANGE);
        }
        return this.choose(
          [
            {
              node: new Slice(this.nextId(Slice.TYPE), start, stop),
              takenUnchecked: true,
              takenWhenDifferent: true,
            },
          ],
          inputs,
          ir,
          CUBE_QUERY_READER_MESSAGE.UNREADABLE(
            name,
            CUBE_QUERY_READER_MESSAGE.RANGE,
          ),
        );
      }
      case 'distinct':
        if (settings.length) {
          // `distinct(~[…])` also keeps only those columns
          return refuse('Cube reads a distinct of every column, ->distinct().');
        }
        return this.choose(
          [
            {
              node: new Distinct(this.nextId(Distinct.TYPE)),
              takenUnchecked: true,
              takenWhenDifferent: true,
            },
          ],
          inputs,
          ir,
          CUBE_QUERY_READER_MESSAGE.NO_STEP(name),
        );
      default:
        throw new CubeLambdaReadError(CUBE_QUERY_READER_MESSAGE.NOT_YET(name));
    }
  }

  /**
   * A Filter, its rules read back, or a Filter by Expression of the condition
   * as it is. With unknown columns, a plainly negated rule can't be told from
   * Cube's own, which keeps the empty rows, so the condition stays as it is.
   */
  private readFilter(
    ir: IR,
    inputs: readonly ReadStep[],
    conditionIr: IR | undefined,
    refuse: (why: string) => never,
  ): ReadStep {
    if (!conditionIr) {
      return refuse('it has no condition.');
    }
    const condition =
      conditionIr.k === 'lambdaJson'
        ? this.options.expressions.read(conditionIr.json)
        : conditionIr;
    if (condition.k !== 'lambda' || condition.params.length !== 1) {
      return refuse('its condition is a lambda of one row, x | ….');
    }
    const reading = readFilterCondition(condition);
    const candidates: Candidate[] = [];
    if (reading) {
      candidates.push({
        node: new Filter(this.nextId(Filter.TYPE), reading.rule),
        takenUnchecked: !reading.hasPlainNegation,
      });
    }
    candidates.push({
      node: new ExpressionFilter(
        this.nextId(ExpressionFilter.TYPE),
        '',
        this.options.expressions.write(condition),
      ),
      takenUnchecked: true,
      takenWhenDifferent: true,
    });
    return this.choose(
      candidates,
      inputs,
      ir,
      CUBE_QUERY_READER_MESSAGE.UNREADABLE(
        'filter',
        'Cube writes its condition another way.',
      ),
    );
  }

  private readGroup(
    ir: IR,
    inputs: readonly ReadStep[],
    name: 'groupBy' | 'aggregate',
    settings: readonly IR[],
    refuse: (why: string) => never,
  ): ReadStep {
    const [keysIr, aggregationsIr, ...rest] =
      name === 'groupBy' ? settings : [undefined, ...settings];
    const columns = keysIr === undefined ? [] : columnNamesOf(keysIr);
    if (!columns || rest.length || aggregationsIr === undefined) {
      return refuse(CUBE_QUERY_READER_MESSAGE.COLUMNS);
    }
    const specs =
      aggregationsIr.k === 'colSpecArray'
        ? aggregationsIr.specs
        : aggregationsIr.k === 'colSpec'
          ? [aggregationsIr]
          : [];
    const aggregations = specs.map((spec) => {
      const aggregation = readAggregation(spec);
      return (
        aggregation ??
        refuse(
          CUBE_QUERY_READER_MESSAGE.AGGREGATION(
            spec.k === 'colSpec' ? spec.name : '?',
          ),
        )
      );
    });
    if (!aggregations.length) {
      return refuse(CUBE_QUERY_READER_MESSAGE.COLUMNS);
    }
    return this.choose(
      [
        {
          node: new Group(this.nextId(Group.TYPE), columns, aggregations),
          takenUnchecked: true,
          takenWhenDifferent: true,
        },
      ],
      inputs,
      ir,
      CUBE_QUERY_READER_MESSAGE.UNREADABLE(
        name,
        'Cube writes its groups another way.',
      ),
    );
  }

  /**
   * A chain of `rename`s, as `emitRename` writes one Rename, a call for each
   * mapping: the chain is read as one Rename while no mapping names a column
   * another renames, and starts another step where one does
   */
  private readRenames(
    ir: IR,
    lets: ReadonlySet<string>,
    refuse: (why: string) => never,
  ): ReadStep {
    const chain: { readonly call: IR; readonly mapping: RenameMapping }[] = [];
    let current: IR = ir;
    while (
      current.k === 'func' &&
      getCubeFunctionName(current.name) === 'rename'
    ) {
      const [rows, from, to, ...rest] = current.params;
      if (
        rows === undefined ||
        from?.k !== 'colSpec' ||
        from.fn1 ||
        to?.k !== 'colSpec' ||
        to.fn1 ||
        rest.length
      ) {
        return refuse(CUBE_QUERY_READER_MESSAGE.RENAME);
      }
      chain.unshift({
        call: current,
        mapping: { from: from.name, to: to.name },
      });
      current = rows;
    }
    let step = this.readRelation(current, lets);
    let group: (typeof chain)[number][] = [];
    const flush = (): void => {
      const last = group.at(-1);
      if (last) {
        step = this.choose(
          [
            {
              node: new Rename(
                this.nextId(Rename.TYPE),
                group.map(({ mapping }) => mapping),
              ),
              takenUnchecked: true,
              takenWhenDifferent: true,
            },
          ],
          [step],
          last.call,
          CUBE_QUERY_READER_MESSAGE.UNREADABLE(
            'rename',
            CUBE_QUERY_READER_MESSAGE.RENAME,
          ),
        );
      }
      group = [];
    };
    chain.forEach((link) => {
      const names = group.flatMap(({ mapping }) => [mapping.from, mapping.to]);
      if (
        names.includes(link.mapping.from) ||
        names.includes(link.mapping.to)
      ) {
        flush();
      }
      group.push(link);
    });
    flush();
    return step;
  }
}

/**
 * The steps of a lambda's relation (Import Pure, PLAN §11.18), its sources
 * bound by the host, the last step selected. Throws a `CubeLambdaReadError`
 * naming the first function Cube can't read: nothing is read in part.
 */
export const readCubeQuery = (
  parts: CubeLambdaParts,
  options: CubeQueryReadOptions,
): CubeQueryReading => new CubeQueryReader(parts, options).read();
