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
  FunctionSource,
  getCubeRelationInputCount,
  IngestDatasetQualifier,
  IngestDatasetSource,
  printIR,
  readCubeQuery,
  resolveCubeType,
  splitCubeLambda,
  TypeFamily,
  UnknownNode,
  UNRESOLVED,
  type CubeCallStep,
  type CubeLambdaParts,
  type CubeSourceStep,
  type CubeType,
  type IR,
  type Query,
  type Schema,
} from '@finos/legend-cube';
import { guaranteeNonNullable, type PlainObject } from '@finos/legend-shared';
import { CUBE_DEFINITION_FLOW_MESSAGE } from '../__lib__/LegendCubeDefinitionFlowLabels.js';
import type { CubeIngestDataSet } from './CubeIngestCatalog.js';
import {
  CUBE_DEFINITION_INPUT_STAND_IN,
  expandCubeDefinitionFunctions,
  getCubeCallRelationIndexes,
  findCubeIngestDefinitionsRead,
  findCubeScalarFunctionCalls,
  isCubeUserFunctionName,
  type CubeDefinitionExpansion,
  type CubeDefinitionFunctionClosedReason,
  type CubeDefinitionFunctions,
  type CubeFunctionDefinition,
} from './CubeDefinitionFunctions.js';
import {
  CUBE_EXPRESSION_CODEC,
  getCubeIngestMetadataSchema,
  readCubeIngestDataSets,
  readCubeLambdaJson,
  readCubeLambdaParameters,
  type CubeLambdaParameterDeclaration,
} from './protocol/pure/CubeProtocolJson.js';

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

/** How many steps an opened call holds, the steps of the calls in it included */
export const countCubeDefinitionCallSteps = (
  calls: readonly CubeDefinitionFunctionContainer[],
  callId: string,
): number =>
  (calls.find((call) => call.id === callId)?.stepIds.length ?? 0) +
  calls
    .filter((call) => call.parentId === callId)
    .reduce(
      (total, call) => total + countCubeDefinitionCallSteps(calls, call.id),
      0,
    );

/** The opened calls that start folded: those holding more than `CUBE_DEFINITION_CALL_OPEN_STEPS` steps */
export const getCubeDefinitionCallsFoldedAtFirst = (
  calls: readonly CubeDefinitionFunctionContainer[],
): string[] =>
  calls
    .filter(
      (call) =>
        call.opened &&
        countCubeDefinitionCallSteps(calls, call.id) >
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
}

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

/** The step each source reads as: an ingest data set, typed from its definition when the host has it */
const createBindSource = (
  options: Pick<CubeDefinitionReadOptions, 'getIngestDefinition'>,
  unknownDataSets: CubeDefinitionDataSet[],
): ((source: IR) => CubeSourceStep) => {
  // each ingest definition's data sets, typed once; none for one the host
  // doesn't have or Cube can't read, whose data sets are drawn by name
  const dataSets = new Map<string, readonly CubeIngestDataSet[]>();
  const schemaOf = (
    ingestDefinition: string,
    dataSet: string,
  ): Schema | undefined => {
    if (!dataSets.has(ingestDefinition)) {
      const content = options.getIngestDefinition?.(ingestDefinition);
      let read: readonly CubeIngestDataSet[] = [];
      try {
        read = content ? readCubeIngestDataSets(content) : [];
      } catch {
        // its data sets are drawn by name
      }
      dataSets.set(ingestDefinition, read);
    }
    return dataSets.get(ingestDefinition)?.find((each) => each.name === dataSet)
      ?.schema;
  };
  return (source: IR): CubeSourceStep => {
    if (source.k !== 'ingestAccessor') {
      throw new CubeLambdaReadError(
        CubeLambdaReadErrorKind.SOURCE,
        CUBE_DEFINITION_FLOW_MESSAGE.SOURCE(describeSource(source)),
      );
    }
    const [ingestDefinition, dataSet] = source.path;
    const { qualifier } = source;
    const isStandIn = ingestDefinition === CUBE_DEFINITION_INPUT_STAND_IN;
    // a data set's batch metadata has the same columns whatever the data
    // set, so is known without its definition
    const schema = isStandIn
      ? undefined
      : qualifier === IngestDatasetQualifier.METADATA
        ? getCubeIngestMetadataSchema()
        : schemaOf(ingestDefinition, dataSet);
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
  options: Pick<CubeDefinitionReadOptions, 'getIngestDefinition'>,
): CubeDefinitionExpansion =>
  expandCubeDefinitionFunctions(parts, functions, (body) => {
    readCubeQuery(
      {
        relation: body,
        lets: new Map(),
        limitBesideFrom: false,
        ...(parts.parameters ? { parameters: parts.parameters } : {}),
      },
      {
        bindSource: createBindSource(options, []),
        bindCall: (call) => bindClosedCall(undefined, call),
        expressions: CUBE_EXPRESSION_CODEC,
        forDrawing: true,
      },
    );
  });

/**
 * The ingest definitions a definition reads the rows of, by path, in the
 * order it reads them: what a host loads before reading it
 * (`getIngestDefinition`); none when Cube can't read it. A data set's batch
 * metadata needs no definition: its columns are the same for every data set.
 */
export const findCubeDefinitionIngestDefinitions = (
  lambda: unknown,
  options: Pick<CubeDefinitionReadOptions, 'functions'> = {},
): string[] => {
  try {
    const parts = splitCubeLambda(readCubeLambdaJson(lambda), {
      readsParameters: true,
    });
    if (options.functions) {
      // the bodies of the functions it calls may read some too
      return findCubeIngestDefinitionsRead(
        expand(parts, options.functions, {}).parts,
      );
    }
    const sources = findCubeLambdaSources(parts);
    return [
      ...new Set(
        sources.flatMap((source) =>
          source.k === 'ingestAccessor' && source.qualifier === undefined
            ? [source.path[0]]
            : [],
        ),
      ),
    ];
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
    const { query, unchecked, stepIRs, parameterReads } = readCubeQuery(parts, {
      bindSource: createBindSource(options, unknownDataSets),
      ...(expansion
        ? { bindCall: (call) => bindClosedCall(expansion, call) }
        : {}),
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
    };
  } catch (error) {
    if (error instanceof CubeLambdaReadError) {
      return refusalOf(error);
    }
    throw error;
  }
};
