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
  IngestDatasetSource,
  readCubeQuery,
  resolveCubeType,
  splitCubeLambda,
  TypeFamily,
  UNRESOLVED,
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
  CUBE_EXPRESSION_CODEC,
  readCubeIngestDataSets,
  readCubeLambdaJson,
  readCubeLambdaParameters,
  type CubeLambdaParameterDeclaration,
} from './protocol/pure/CubeProtocolJson.js';

// A data product's access point definition, its lambda, read into steps to
// be drawn read-only (`CubeDefinitionFlow`): in the browser, with no engine,
// as the host has the lambda's protocol JSON already, and the columns of its
// ingest data sets typed from their definitions' JSON. Cube reads all of a
// lambda or none of it, so what it can't read comes back as a refusal, of a
// kind a host can count, and the host shows the Pure instead. A definition
// may take parameters, which its steps read where they keep the Pure as it
// is: a filter's condition, a new column's expression.

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

/**
 * The ingest definitions a definition reads, by path, in the order it reads
 * them: what a host loads before reading it (`getIngestDefinition`); none when
 * Cube can't read it
 */
export const findCubeDefinitionIngestDefinitions = (
  lambda: unknown,
): string[] => {
  try {
    const sources = findCubeLambdaSources(
      splitCubeLambda(readCubeLambdaJson(lambda), { readsParameters: true }),
    );
    return [
      ...new Set(
        sources.flatMap((source) =>
          source.k === 'ingestAccessor' ? [source.path[0]] : [],
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
 * What Cube can't read comes back as a refusal; it throws only on an
 * unexpected error.
 */
export const readCubeDefinition = (
  lambda: unknown,
  options: CubeDefinitionReadOptions = {},
): CubeDefinitionReading => {
  try {
    const parts = splitCubeLambda(readCubeLambdaJson(lambda), {
      readsParameters: true,
    });
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
      return dataSets
        .get(ingestDefinition)
        ?.find((each) => each.name === dataSet)?.schema;
    };
    const unknownDataSets: CubeDefinitionDataSet[] = [];
    const bindSource = (source: IR): CubeSourceStep => {
      if (source.k !== 'ingestAccessor') {
        throw new CubeLambdaReadError(
          CubeLambdaReadErrorKind.SOURCE,
          CUBE_DEFINITION_FLOW_MESSAGE.SOURCE(describeSource(source)),
        );
      }
      const [ingestDefinition, dataSet] = source.path;
      const schema = schemaOf(ingestDefinition, dataSet);
      if (
        !schema &&
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
            },
            schema ? { kind: 'resolved', schema } : UNRESOLVED,
          ),
      };
    };
    const { query, unchecked, stepIRs, parameterReads } = readCubeQuery(parts, {
      bindSource,
      expressions: CUBE_EXPRESSION_CODEC,
      forDrawing: true,
    });
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
    };
  } catch (error) {
    if (error instanceof CubeLambdaReadError) {
      return refusalOf(error);
    }
    throw error;
  }
};
