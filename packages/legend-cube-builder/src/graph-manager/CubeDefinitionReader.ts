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

import {
  CubeLambdaReadError,
  CubeLambdaReadErrorKind,
  findCubeLambdaSources,
  func,
  FunctionSource,
  getCubeRelationInputCount,
  ingestAccessor,
  IngestDatasetQualifier,
  IngestDatasetSource,
  isCubeRowsLet,
  printIR,
  readCubeQuery,
  resolveCubeType,
  splitCubeLambda,
  TypeFamily,
  UnknownNode,
  UNRESOLVED,
  variable,
  type CubeCallStep,
  type CubeLambdaParts,
  type CubeSourceRelation,
  type CubeSourceStep,
  type CubeType,
  type IR,
  type Query,
  type Schema,
} from '@finos/legend-cube';
import { guaranteeNonNullable, type PlainObject } from '@finos/legend-shared';
import {
  CUBE_DEFINITION_FLOW_LABEL,
  CUBE_DEFINITION_FLOW_MESSAGE,
} from '../__lib__/LegendCubeDefinitionFlowLabels.js';
import type { CubeIngestDataSet } from './CubeIngestCatalog.js';
import {
  CUBE_DEFINITION_INPUT_STAND_IN,
  expandCubeDefinitionFunctions,
  getCubeCallRelationIndexes,
  findCubeIngestDefinitionsRead,
  findCubeScalarFunctionCalls,
  findCubeSqlRead,
  isCubeUserFunctionName,
  type CubeDefinitionExpansion,
  type CubeDefinitionFunctionClosedReason,
  type CubeDefinitionFunctions,
  type CubeFunctionDefinition,
} from './CubeDefinitionFunctions.js';
import {
  CUBE_EXPRESSION_CODEC,
  findCubeSqlSources,
  getCubeIngestSourceSchema,
  readCubeIngestDataSets,
  readCubeLambdaJson,
  readCubeLambdaParameters,
  readCubeSqlTree,
  type CubeLambdaParameterDeclaration,
} from './protocol/pure/CubeProtocolJson.js';
import {
  CubeSqlStepKind,
  listCubeSqlSteps,
  type CubeSqlStep,
} from './CubeSqlStructure.js';

// A data product's access point definition, its lambda, read into steps to
// be drawn read-only (`CubeDefinitionFlow`): in the browser, with no engine,
// as the host has the lambda's protocol JSON already, and the columns of its
// ingest data sets typed from their definitions' JSON, those of a data set's
// batch metadata (`#I{…|metadata}#`) as legend-graph types them. Cube reads
// all of a lambda or none of it, so what it can't read comes back as a
// refusal, of a kind a host can count, and the host shows the Pure instead.
// A definition may take parameters, which its steps read where they keep the
// Pure as it is: a filter's condition, a new column's expression.

/** An ingest data set a definition reads */
export interface CubeDefinitionDataSet {
  /** The ingest definition's path */
  readonly ingestDefinition: string;
  readonly dataSet: string;
}

/** A step of a definition's flow */
export interface CubeDefinitionStep {
  readonly id: string;
  /** Its type, e.g. `ingestDataset`, `filter`, `join`, `group` */
  readonly type: string;
  /** The ids of the steps it reads, in port order: a join's left, then its right */
  readonly inputs: readonly string[];
  /**
   * The relation it was read from, reading the lambda's lets by name
   * (`CubeDefinitionFlowReading.lets`): the Pure up to it, with it
   */
  readonly ir: IR;
}

/** A value a definition takes when it is queried: one of its lambda's parameters */
export interface CubeDefinitionParameter {
  readonly name: string;
  /**
   * Its type, e.g. `StrictDate`; opaque for one Cube doesn't know, e.g. an
   * enumeration; `undefined` when the lambda declares none
   */
  readonly type: CubeType | undefined;
  /** How many values it takes, as Pure writes it: `[1]`, `[0..1]`, `[*]`…; `undefined` when the lambda doesn't say */
  readonly multiplicity: string | undefined;
  /** The steps that read it, in the flow's order: none when no step does */
  readonly stepIds: readonly string[];
}

/**
 * A call of a user-defined function in a definition (PLAN §11.33):
 * opened, a container of the steps of its body, its name on top; closed, one
 * box, a step of the flow
 */
export interface CubeDefinitionFunctionContainer {
  readonly id: string;
  /** The path the call names, e.g. `shop::orders::ordersSince` */
  readonly name: string;
  /** Its name alone, e.g. `ordersSince` */
  readonly shortName: string;
  /** The function's element path, with its signature, when the host has it */
  readonly path: string | undefined;
  /** The project it comes from, when the host says */
  readonly origin: string | undefined;
  /** The container it is drawn in, a call whose body calls it */
  readonly parentId: string | undefined;
  /** Its values as Pure prints them, its relations left out: `%2026-01-01`, `'EMEA'`, `$since` */
  readonly values: readonly string[];
  /** Its signature, as Pure writes it: `ordersSince(since: StrictDate[1], region: String[1]): Relation<…>[1]` */
  readonly signature: string | undefined;
  /** The columns it declares it returns, when it does: `ORDER_ID, AMOUNT…` */
  readonly declaredColumns: readonly string[] | undefined;
  /** Whether its body is drawn */
  readonly opened: boolean;
  readonly closedReason?: CubeDefinitionFunctionClosedReason | undefined;
  readonly closedMessage?: string | undefined;
  /** Opened: the steps of its body, not those of the calls in it; closed: its box */
  readonly stepIds: readonly string[];
}

/**
 * How many steps an opened call may hold and still start open: one holding
 * more starts folded, to keep a flow readable (the user, 2026-11-14:
 * "fold them past some size"); the steps of the calls in it count
 */
export const CUBE_DEFINITION_CALL_OPEN_STEPS = 5;

/**
 * How many steps an opened call holds, the steps of the calls in it
 * included, and those of the SQL in it that is drawn as steps
 */
export const countCubeDefinitionCallSteps = (
  calls: readonly CubeDefinitionFunctionContainer[],
  callId: string,
  sqlIslands: readonly CubeDefinitionSqlIsland[] = [],
): number =>
  (calls.find((call) => call.id === callId)?.stepIds.length ?? 0) +
  sqlIslands
    .filter((island) => island.parentId === callId)
    .reduce((total, island) => total + (island.steps?.length ?? 0), 0) +
  calls
    .filter((call) => call.parentId === callId)
    .reduce(
      (total, call) =>
        total + countCubeDefinitionCallSteps(calls, call.id, sqlIslands),
      0,
    );

/** The opened calls that start folded: those holding more than `CUBE_DEFINITION_CALL_OPEN_STEPS` steps */
export const getCubeDefinitionCallsFoldedAtFirst = (
  calls: readonly CubeDefinitionFunctionContainer[],
  sqlIslands: readonly CubeDefinitionSqlIsland[] = [],
): string[] =>
  calls
    .filter(
      (call) =>
        call.opened &&
        countCubeDefinitionCallSteps(calls, call.id, sqlIslands) >
          CUBE_DEFINITION_CALL_OPEN_STEPS,
    )
    .map((call) => call.id);

/** A user-defined function a step's expression calls, e.g. a filter's condition calling `pkg::defaultDate()` */
export interface CubeDefinitionScalarFunction {
  readonly name: string;
  readonly path: string;
  readonly signature: string;
  readonly origin: string | undefined;
}

/** A step of an island's SQL: a source it reads, or a clause, as the SQL writes it */
export interface CubeDefinitionSqlStep {
  readonly stepId: string;
  readonly kind: CubeSqlStepKind;
  /** What it says, as SQL: a Where's condition, a Select's columns, a join's `on …` */
  readonly text: string;
  /** What kind it is of its kind: a join's type, a set operation's words, a source's function */
  readonly variant?: string | undefined;
  /** The name the SQL after it calls a source by */
  readonly alias?: string | undefined;
  /** A Select's columns, by the names its rows give them */
  readonly columns?: readonly string[] | undefined;
}

/**
 * The engine's SQL island in a definition, `#SQL{select … from …}#`. With
 * the engine's tree of its SQL, which the host gives (`getSqlTree`), a
 * container of the steps its clauses are, as the SQL writes them: Cube checks
 * none of them. Without it, or with SQL Cube has no steps for, one step, a
 * box.
 */
export interface CubeDefinitionSqlIsland {
  /** Its id: its container's, when its SQL is drawn as steps */
  readonly id: string;
  /** Its step: its box; drawn as steps, the last of them, whose rows it gives */
  readonly stepId: string;
  /** Its SQL, as written */
  readonly sql: string;
  /**
   * The ingest data sets its SQL names, `i('definition.dataSet')`: what its
   * text names, which may not be all it reads
   */
  readonly dataSets: readonly CubeDefinitionDataSet[];
  /** The access points its SQL names, `p('dataProduct.accessPoint')` */
  readonly accessPoints: readonly {
    /** The data product's path */
    readonly dataProduct: string;
    /** The access point's id */
    readonly accessPoint: string;
  }[];
  /**
   * Its SQL as steps, each after the steps it reads: its sources, then its
   * clauses in the order they run; `undefined` for an island drawn as one box
   */
  readonly steps?: readonly CubeDefinitionSqlStep[] | undefined;
  /** The call of a user-defined function whose body it is in, when it is drawn as steps */
  readonly parentId?: string | undefined;
  /**
   * What of its SQL Cube has no step for, in words, for an island the host
   * gave the tree of that is one box all the same
   */
  readonly closedMessage?: string | undefined;
}

/**
 * How many steps an island's SQL may be drawn as and still start open: SQL
 * of more starts folded to one box, to keep a flow readable
 */
export const CUBE_DEFINITION_SQL_OPEN_STEPS = 12;

/** The islands drawn as steps that start folded: those of more than `CUBE_DEFINITION_SQL_OPEN_STEPS` steps */
export const getCubeDefinitionSqlFoldedAtFirst = (
  islands: readonly CubeDefinitionSqlIsland[],
): string[] =>
  islands
    .filter(
      (island) => (island.steps?.length ?? 0) > CUBE_DEFINITION_SQL_OPEN_STEPS,
    )
    .map((island) => island.id);

/** A definition Cube can draw */
export interface CubeDefinitionFlowReading {
  readonly kind: 'flow';
  /** Its steps, each after the steps it reads */
  readonly steps: readonly CubeDefinitionStep[];
  /** The step whose rows the definition gives */
  readonly outputStepId: string;
  /** What each of the lambda's lets binds, by name */
  readonly lets: ReadonlyMap<string, IR>;
  /** The steps read without being checked, as the columns before them weren't known */
  readonly uncheckedStepIds: readonly string[];
  /** The ingest data sets it reads whose columns the host didn't give: drawn by name */
  readonly unknownDataSets: readonly CubeDefinitionDataSet[];
  /** The values it takes when it is queried, in order: none for most */
  readonly parameters: readonly CubeDefinitionParameter[];
  /** The steps as Cube holds them, for `CubeDefinitionFlow` to draw */
  readonly query: Query;
  /** Its calls of user-defined functions, in the order met, a call before the calls in its body */
  readonly functionCalls: readonly CubeDefinitionFunctionContainer[];
  /** The user-defined functions each step's expressions call, by the step's id */
  readonly scalarFunctions: ReadonlyMap<
    string,
    readonly CubeDefinitionScalarFunction[]
  >;
  /**
   * Its SQL, `#SQL{…}#`, in the flow's order: each a container of its
   * clauses' steps, or one box; its columns aren't known either way, so the
   * steps after it are read unchecked
   */
  readonly sqlIslands: readonly CubeDefinitionSqlIsland[];
}

/**
 * What a host says above a flow whose SQL, `#SQL{…}#`, has steps after it:
 * that those steps aren't checked, as the SQL's columns aren't known;
 * `undefined` for a flow with no SQL, or none with a step after it
 */
export const describeCubeDefinitionUncheckedSql = (
  reading: CubeDefinitionFlowReading,
): string | undefined => {
  const count = reading.sqlIslands.filter(
    (island) => island.stepId !== reading.outputStepId,
  ).length;
  return count ? CUBE_DEFINITION_FLOW_LABEL.SQL_UNCHECKED(count) : undefined;
};

/** A definition Cube can't draw, and why: a host shows its Pure instead */
export interface CubeDefinitionRefusal {
  readonly kind: 'refused';
  /** Why, as a kind a host can count */
  readonly reason: CubeLambdaReadErrorKind;
  /** The function Cube can't read, for a step's function: `olapGroupBy`, `select`… */
  readonly functionName?: string | undefined;
  /** The first problem Cube found, in words */
  readonly message: string;
}

export type CubeDefinitionReading =
  | CubeDefinitionFlowReading
  | CubeDefinitionRefusal;

export interface CubeDefinitionReadOptions {
  /**
   * The content (protocol JSON) of an ingest definition the lambda reads, by
   * the definition's path (`findCubeDefinitionIngestDefinitions`), which types
   * its data sets' columns; `undefined` for one the host doesn't have, whose
   * data sets are drawn by name, the steps after them unchecked
   */
  readonly getIngestDefinition?:
    | ((path: string) => PlainObject | undefined)
    | undefined;
  /**
   * The user-defined functions the definition calls, as the host loaded them
   * (`loadCubeDefinitionFunctions`): each call of one is opened into its
   * body, in a container; without them a call is refused, as before
   * (PLAN §11.33)
   */
  readonly functions?: CubeDefinitionFunctions | undefined;
  /**
   * The engine's tree of the SQL of an island the definition holds
   * (`findCubeDefinitionSql`), as its SQL grammar gives it (`POST
   * sql/v1/grammar/grammarToJson`): the island is drawn as a container
   * of its clauses' steps; `undefined` for SQL the host has no tree of, drawn
   * as one box
   */
  readonly getSqlTree?: ((sql: string) => unknown) | undefined;
}

const refusalOf = (error: CubeLambdaReadError): CubeDefinitionRefusal => ({
  kind: 'refused',
  reason: error.kind,
  ...(error.functionName === undefined
    ? {}
    : { functionName: error.functionName }),
  message: error.message,
});

/** What a source other than an ingest data set is, to say so */
const describeSource = (source: IR): string =>
  source.k === 'storeAccessor'
    ? CUBE_DEFINITION_FLOW_MESSAGE.TABLE
    : source.k === 'dataProductAccessor'
      ? CUBE_DEFINITION_FLOW_MESSAGE.ACCESS_POINT
      : source.k === 'func'
        ? CUBE_DEFINITION_FLOW_MESSAGE.FUNCTION(source.name)
        : CUBE_DEFINITION_FLOW_MESSAGE.OTHER;

/**
 * A parameter's type as Cube knows it: by its path or, for a primitive whose
 * path has a package, e.g. `meta::pure::precisePrimitives::Varchar`, its
 * name, as an ingest data set's columns are typed
 */
const typeOf = (
  type: NonNullable<CubeLambdaParameterDeclaration['type']>,
): CubeType => {
  const name = type.path.slice(type.path.lastIndexOf(':') + 1);
  const params = type.params ?? [];
  return (
    [type.path, name]
      .map((path) => resolveCubeType(path, params))
      .find((candidate) => candidate.family !== TypeFamily.OPAQUE) ??
    resolveCubeType(type.path, params)
  );
};

/** A multiplicity as Pure writes it: `[1]`, `[0..1]`, `[*]`, `[1..*]` */
const printMultiplicity = ({
  lowerBound,
  upperBound,
}: NonNullable<CubeLambdaParameterDeclaration['multiplicity']>): string =>
  upperBound === undefined
    ? lowerBound === 0
      ? '[*]'
      : `[${lowerBound}..*]`
    : lowerBound === upperBound
      ? `[${lowerBound}]`
      : `[${lowerBound}..${upperBound}]`;

/** Pure's way of writing a function's signature, its parameters named */
const printSignature = (definition: CubeFunctionDefinition): string => {
  const shortName = definition.name.split('::').at(-1) ?? definition.name;
  const columns = definition.declaredSchema?.columns
    .map((column) => column.name)
    .join(', ');
  return `${shortName}(${definition.parameters
    .map(
      (parameter) =>
        `${parameter.name}: ${parameter.type}${printMultiplicity(parameter.multiplicity)}`,
    )
    .join(', ')}): ${definition.returnType}${
    definition.returnsRelation ? `<${columns ? `(${columns})` : 'Any'}>` : ''
  }${printMultiplicity(definition.returnMultiplicity)}`;
};

/**
 * The steps a call left unopened reads as: a source when it takes no
 * relation, typed by the columns it declares; a step of unknown columns
 * with its relations as its inputs otherwise
 */
const bindClosedCall = (
  expansion: CubeDefinitionExpansion | undefined,
  call: Extract<IR, { readonly k: 'func' }>,
): CubeCallStep | undefined => {
  if (!isCubeUserFunctionName(call.name)) {
    return undefined;
  }
  const record = expansion?.calls.find(
    (each) => each.id === expansion.closedCallOf.get(call),
  );
  const definition = record?.definition;
  const inputs = getCubeCallRelationIndexes(call, record?.candidates ?? []);
  return inputs.length
    ? {
        type: UnknownNode.TYPE,
        inputs,
        create: (id) =>
          new UnknownNode(id, inputs.length, {
            kind: 'function',
            function: call.name,
          }),
      }
    : {
        type: FunctionSource.TYPE,
        inputs: [],
        create: (id) =>
          new FunctionSource(
            id,
            {
              function: call.name,
              signature: definition?.path ?? call.name,
              parameters: [],
            },
            [],
            definition?.declaredSchema
              ? { kind: 'resolved', schema: definition.declaredSchema }
              : UNRESOLVED,
          ),
      };
};

/** An island read as the steps of its SQL: each relation Cube reads in its place, with its step */
interface SqlRead {
  /** The island, as the lambda holds it */
  readonly source: IR;
  readonly sql: string;
  readonly stepOf: ReadonlyMap<IR, CubeSqlStep>;
}

/** How the SQL of a definition's islands is read as steps, from the trees the host gave */
interface SqlBinder {
  /**
   * The relation an island is read as: its sources, an ingest data set as
   * any other, a let by its name, and one call per clause, each a step
   * (`bindCall`); `undefined` for SQL the host gave no tree of, or Cube has
   * no steps for
   */
  readonly relationOf: (
    source: Extract<IR, { readonly k: 'sqlAccessor' }>,
  ) => IR | undefined;
  /** The step of a clause of an island's SQL, its inputs the steps it reads */
  readonly bindCall: (
    call: Extract<IR, { readonly k: 'func' }>,
  ) => CubeCallStep | undefined;
  /** The islands read as steps, each time one was read */
  readonly reads: readonly SqlRead[];
  /** What of an island's SQL Cube has no step for, by the SQL */
  readonly refusals: ReadonlyMap<string, string>;
}

/** The function a clause of an island's SQL is, in the relation Cube reads in the island's place: no Pure's */
const SQL_STEP_FUNCTION = '#SQL';

const createSqlBinder = (
  options: Pick<CubeDefinitionReadOptions, 'getSqlTree'>,
  lets: ReadonlyMap<string, IR>,
): SqlBinder => {
  const reads: SqlRead[] = [];
  const refusals = new Map<string, string>();
  const clauses = new Map<IR, CubeSqlStep>();
  return {
    relationOf: (source) => {
      const tree = options.getSqlTree?.(source.sql);
      if (tree === undefined) {
        return undefined;
      }
      const reading = readCubeSqlTree(tree);
      if ('refused' in reading) {
        refusals.set(source.sql, reading.refused);
        return undefined;
      }
      const stepOf = new Map<IR, CubeSqlStep>();
      const relationOf = (step: CubeSqlStep): IR => {
        if (step.kind === CubeSqlStepKind.DATA_SET && step.dataSet) {
          const dataSet = ingestAccessor(step.dataSet);
          stepOf.set(dataSet, step);
          return dataSet;
        }
        // a let that binds rows is read by its name, as any step reads one
        if (
          step.kind === CubeSqlStepKind.VARIABLE &&
          step.variable !== undefined &&
          isCubeRowsLet(lets.get(step.variable))
        ) {
          return variable(step.variable);
        }
        const call = func(SQL_STEP_FUNCTION, step.inputs.map(relationOf));
        stepOf.set(call, step);
        clauses.set(call, step);
        return call;
      };
      const relation = relationOf(reading.last);
      reads.push({ source, sql: source.sql, stepOf });
      return relation;
    },
    bindCall: (call) => {
      const step = clauses.get(call);
      return step
        ? {
            type: UnknownNode.TYPE,
            inputs: step.inputs.map((_input, index) => index),
            create: (id) =>
              new UnknownNode(id, step.inputs.length, {
                kind: 'sqlClause',
                clause: step.kind,
                text: step.text,
              }),
          }
        : undefined;
    },
    reads,
    refusals,
  };
};

/** The step each source reads as: an ingest data set, typed from its definition when the host has it */
const createBindSource = (
  options: Pick<CubeDefinitionReadOptions, 'getIngestDefinition'>,
  unknownDataSets: CubeDefinitionDataSet[],
  sql?: SqlBinder,
): ((source: IR) => CubeSourceStep | CubeSourceRelation) => {
  // each ingest definition's data sets, typed once; none for one the host
  // doesn't have or Cube can't read, whose data sets are drawn by name
  const dataSets = new Map<string, readonly CubeIngestDataSet[]>();
  const schemaOf = (
    ingestDefinition: string,
    dataSet: string,
    qualifier: IngestDatasetQualifier | undefined,
  ): Schema | undefined => {
    // a data set's batch metadata has the same columns whatever the data
    // set, so is known without its definition
    if (
      qualifier !== IngestDatasetQualifier.METADATA &&
      !dataSets.has(ingestDefinition)
    ) {
      const content = options.getIngestDefinition?.(ingestDefinition);
      let read: readonly CubeIngestDataSet[] = [];
      try {
        read = content ? readCubeIngestDataSets(content) : [];
      } catch {
        // its data sets are drawn by name
      }
      dataSets.set(ingestDefinition, read);
    }
    return getCubeIngestSourceSchema(
      dataSets.get(ingestDefinition)?.find((each) => each.name === dataSet),
      qualifier,
    );
  };
  return (source: IR): CubeSourceStep | CubeSourceRelation => {
    if (source.k === 'sqlAccessor') {
      // the steps of its SQL, with the engine's tree of it
      const relation = sql?.relationOf(source);
      if (relation) {
        return { relation };
      }
      // one step of unknown columns, the lets its SQL reads as its inputs
      return {
        type: UnknownNode.TYPE,
        create: (id, inputCount) =>
          new UnknownNode(id, inputCount ?? 0, {
            kind: 'sql',
            sql: source.sql,
          }),
      };
    }
    if (source.k !== 'ingestAccessor') {
      throw new CubeLambdaReadError(
        CubeLambdaReadErrorKind.SOURCE,
        CUBE_DEFINITION_FLOW_MESSAGE.SOURCE(describeSource(source)),
      );
    }
    const [ingestDefinition, dataSet] = source.path;
    const { qualifier } = source;
    const isStandIn = ingestDefinition === CUBE_DEFINITION_INPUT_STAND_IN;
    const schema = isStandIn
      ? undefined
      : schemaOf(ingestDefinition, dataSet, qualifier);
    if (
      !schema &&
      !isStandIn &&
      !unknownDataSets.some(
        (each) =>
          each.ingestDefinition === ingestDefinition &&
          each.dataSet === dataSet,
      )
    ) {
      unknownDataSets.push({ ingestDefinition, dataSet });
    }
    return {
      type: IngestDatasetSource.TYPE,
      create: (id) =>
        new IngestDatasetSource(
          id,
          {
            // never read: a flow resolves no source, so the definition's
            // path stands for the URN the host would read it by
            ingestDefinitionUrn: ingestDefinition,
            ingestDefinition,
            dataSet,
            qualifier,
          },
          schema ? { kind: 'resolved', schema } : UNRESOLVED,
        ),
    };
  };
};

/** The lambda's parts with the calls Cube can open opened, each body checked alone */
const expand = (
  parts: CubeLambdaParts,
  functions: CubeDefinitionFunctions,
  options: Pick<
    CubeDefinitionReadOptions,
    'getIngestDefinition' | 'getSqlTree'
  >,
): CubeDefinitionExpansion =>
  expandCubeDefinitionFunctions(parts, functions, (body) => {
    const sql = createSqlBinder(options, new Map());
    readCubeQuery(
      {
        relation: body,
        lets: new Map(),
        limitBesideFrom: false,
        ...(parts.parameters ? { parameters: parts.parameters } : {}),
      },
      {
        bindSource: createBindSource(options, [], sql),
        bindCall: (call) =>
          sql.bindCall(call) ?? bindClosedCall(undefined, call),
        expressions: CUBE_EXPRESSION_CODEC,
        forDrawing: true,
      },
    );
  });

/**
 * The ingest definitions a definition reads the columns of, by path, in the
 * order it reads them: its rows', or what a qualifier reads of them. What a
 * host loads before reading it (`getIngestDefinition`); none when Cube can't
 * read it. A data set's batch metadata needs no definition: its columns are
 * the same for every data set.
 */
export const findCubeDefinitionIngestDefinitions = (
  lambda: unknown,
  options: Pick<CubeDefinitionReadOptions, 'functions' | 'getSqlTree'> = {},
): string[] => {
  try {
    const parts = splitCubeLambda(readCubeLambdaJson(lambda), {
      readsParameters: true,
    });
    // those the SQL of its islands reads, for SQL the host has the tree of
    // and Cube draws as steps
    const readBySql = (islands: readonly string[]): string[] =>
      islands.flatMap((sql) => {
        const tree = options.getSqlTree?.(sql);
        const reading = tree === undefined ? undefined : readCubeSqlTree(tree);
        return reading && 'last' in reading
          ? listCubeSqlSteps(reading.last).flatMap((step) =>
              step.kind === CubeSqlStepKind.DATA_SET && step.dataSet
                ? [step.dataSet[0]]
                : [],
            )
          : [];
      });
    if (options.functions) {
      // the bodies of the functions it calls may read some too; its lets
      // are a map, which the walk doesn't open
      const expanded = expand(parts, options.functions, {}).parts;
      const read = [expanded.relation, ...expanded.lets.values()];
      return [
        ...new Set([
          ...findCubeIngestDefinitionsRead(read),
          ...readBySql(findCubeSqlRead(read)),
        ]),
      ];
    }
    const sources = findCubeLambdaSources(parts);
    return [
      ...new Set([
        ...sources.flatMap((source) =>
          source.k === 'ingestAccessor' &&
          source.qualifier !== IngestDatasetQualifier.METADATA
            ? [source.path[0]]
            : [],
        ),
        ...readBySql(
          sources.flatMap((source) =>
            source.k === 'sqlAccessor' ? [source.sql] : [],
          ),
        ),
      ]),
    ];
  } catch (error) {
    if (error instanceof CubeLambdaReadError) {
      return [];
    }
    throw error;
  }
};

/** What an island's SQL names in its text */
const namedBySql = (
  sql: string,
): Pick<CubeDefinitionSqlIsland, 'dataSets' | 'accessPoints'> => {
  const named = findCubeSqlSources(sql);
  return {
    dataSets: named.dataSets.map(([ingestDefinition, dataSet]) => ({
      ingestDefinition,
      dataSet,
    })),
    accessPoints: named.accessPoints.map(([dataProduct, accessPoint]) => ({
      dataProduct,
      accessPoint,
    })),
  };
};

/** The definition's islands as read, in the flow's order: each one box, or the steps of its SQL */
const readSqlIslands = (
  query: Query,
  stepIRs: ReadonlyMap<string, IR>,
  sql: SqlBinder,
  expansion: CubeDefinitionExpansion | undefined,
): CubeDefinitionSqlIsland[] => {
  const order = new Map(query.nodes.map((node, index) => [node.id, index]));
  const boxes = query.nodes.flatMap((node): CubeDefinitionSqlIsland[] => {
    const ir = stepIRs.get(node.id);
    if (ir?.k !== 'sqlAccessor') {
      return [];
    }
    const closedMessage = sql.refusals.get(ir.sql);
    return [
      {
        id: node.id,
        stepId: node.id,
        sql: ir.sql,
        ...namedBySql(ir.sql),
        ...(closedMessage === undefined ? {} : { closedMessage }),
      },
    ];
  });
  const opened = sql.reads.flatMap((read, index): CubeDefinitionSqlIsland[] => {
    const steps = query.nodes.flatMap((node): CubeDefinitionSqlStep[] => {
      const ir = stepIRs.get(node.id);
      const step = ir ? read.stepOf.get(ir) : undefined;
      return step
        ? [
            {
              stepId: node.id,
              kind: step.kind,
              text: step.text,
              ...(step.variant === undefined ? {} : { variant: step.variant }),
              ...(step.alias === undefined ? {} : { alias: step.alias }),
              ...(step.columns === undefined ? {} : { columns: step.columns }),
            },
          ]
        : [];
    });
    const last = steps.at(-1);
    const parentId = expansion?.callOf.get(read.source);
    return last
      ? [
          {
            id: `sql${index + 1}`,
            stepId: last.stepId,
            sql: read.sql,
            ...namedBySql(read.sql),
            steps,
            ...(parentId === undefined ? {} : { parentId }),
          },
        ]
      : [];
  });
  return [...boxes, ...opened].sort(
    (a, b) => (order.get(a.stepId) ?? 0) - (order.get(b.stepId) ?? 0),
  );
};

/**
 * The SQL of the islands, `#SQL{…}#`, a definition holds, each once, in the
 * order it holds them, those of the functions it calls included: what a host
 * asks the engine to parse before reading the definition (`getSqlTree`), so
 * its SQL is drawn as steps; none when Cube can't read the definition
 */
export const findCubeDefinitionSql = (
  lambda: unknown,
  options: Pick<CubeDefinitionReadOptions, 'functions'> = {},
): string[] => {
  try {
    const split = splitCubeLambda(readCubeLambdaJson(lambda), {
      readsParameters: true,
    });
    const parts = options.functions
      ? expand(split, options.functions, {}).parts
      : split;
    return findCubeSqlRead([parts.relation, ...parts.lets.values()]);
  } catch (error) {
    if (error instanceof CubeLambdaReadError) {
      return [];
    }
    throw error;
  }
};

/**
 * A definition, its lambda's protocol JSON, read into steps to be drawn, with
 * no engine. Read to be drawn, it may be what only Cube's editor refuses,
 * e.g. a group's sum named like the column it adds up, or take parameters,
 * which its steps read in a filter's condition or a new column's expression.
 * With the functions it calls (`loadCubeDefinitionFunctions`), each call Cube
 * can open is drawn as a container of its body's steps, each it can't as one
 * box (PLAN §11.33). What Cube can't read comes back as a refusal; it throws
 * only on an unexpected error.
 */
export const readCubeDefinition = (
  lambda: unknown,
  options: CubeDefinitionReadOptions = {},
): CubeDefinitionReading => {
  try {
    const split = splitCubeLambda(readCubeLambdaJson(lambda), {
      readsParameters: true,
    });
    const expansion = options.functions
      ? expand(split, options.functions, options)
      : undefined;
    const parts = expansion?.parts ?? split;
    const unknownDataSets: CubeDefinitionDataSet[] = [];
    const sql = createSqlBinder(options, parts.lets);
    const { query, unchecked, stepIRs, parameterReads } = readCubeQuery(parts, {
      bindSource: createBindSource(options, unknownDataSets, sql),
      bindCall: (call) =>
        sql.bindCall(call) ??
        (expansion ? bindClosedCall(expansion, call) : undefined),
      expressions: CUBE_EXPRESSION_CODEC,
      forDrawing: true,
    });
    // each step in the container of the call whose body it was read from;
    // a call left unopened is a step, in the container of the call round it
    const stepsOf = new Map<string, string[]>();
    query.nodes.forEach((node) => {
      const ir = stepIRs.get(node.id);
      if (!ir || !expansion) {
        return;
      }
      const closedId = expansion.closedCallOf.get(ir);
      const callId = closedId ?? expansion.callOf.get(ir);
      if (callId !== undefined) {
        stepsOf.set(callId, [...(stepsOf.get(callId) ?? []), node.id]);
      }
    });
    const functionCalls = (expansion?.calls ?? []).map(
      (call): CubeDefinitionFunctionContainer => ({
        id: call.id,
        name: call.name,
        shortName: call.name.split('::').at(-1) ?? call.name,
        path: call.definition?.path,
        origin: call.definition?.origin,
        parentId: call.parentId,
        values: call.values.map(({ value }) => printIR(value)),
        signature: call.definition
          ? printSignature(call.definition)
          : undefined,
        declaredColumns: call.definition?.declaredSchema?.columns.map(
          (column) => column.name,
        ),
        opened: call.opened,
        ...(call.closedReason ? { closedReason: call.closedReason } : {}),
        ...(call.closedMessage ? { closedMessage: call.closedMessage } : {}),
        stepIds: stepsOf.get(call.id) ?? [],
      }),
    );
    const scalarFunctions = new Map<string, CubeDefinitionScalarFunction[]>();
    if (options.functions) {
      const functions = options.functions;
      query.nodes.forEach((node) => {
        const ir = stepIRs.get(node.id);
        if (ir?.k !== 'func') {
          return;
        }
        // the step's own expressions: what it takes but its input
        const found = findCubeScalarFunctionCalls(
          {
            ...ir,
            params: ir.params.slice(getCubeRelationInputCount(ir.name) ?? 1),
          },
          functions,
        );
        if (found.length) {
          scalarFunctions.set(
            node.id,
            found.map((definition) => ({
              name: definition.name,
              path: definition.path,
              signature: printSignature(definition),
              origin: definition.origin,
            })),
          );
        }
      });
    }
    return {
      kind: 'flow',
      steps: query.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        inputs: query
          .getInputIds(node.id)
          .filter((input): input is string => input !== undefined),
        ir: guaranteeNonNullable(stepIRs.get(node.id)),
      })),
      outputStepId: guaranteeNonNullable(query.selected),
      lets: parts.lets,
      uncheckedStepIds: unchecked,
      unknownDataSets,
      parameters: readCubeLambdaParameters(lambda).map((parameter) => ({
        name: parameter.name,
        type: parameter.type ? typeOf(parameter.type) : undefined,
        multiplicity: parameter.multiplicity
          ? printMultiplicity(parameter.multiplicity)
          : undefined,
        stepIds: query.nodes
          .filter((node) =>
            parameterReads.get(node.id)?.includes(parameter.name),
          )
          .map((node) => node.id),
      })),
      query,
      functionCalls,
      scalarFunctions,
      sqlIslands: readSqlIslands(query, stepIRs, sql, expansion),
    };
  } catch (error) {
    if (error instanceof CubeLambdaReadError) {
      return refusalOf(error);
    }
    throw error;
  }
};
