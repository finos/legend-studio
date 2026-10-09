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

import type { Schema } from '@finos/legend-cube';
import type { PlainObject } from '@finos/legend-shared';
import {
  CubeAccessPoint,
  CubeAccessPointGroup,
  type CubeAccessPointLocation,
  type CubeDataProductCandidate,
  CubeDataProductDescription,
} from '../../../CubeDataProductCatalog.js';
import type { CubeResultValue } from '../../../CubeEngine.js';
import { V1_buildCubeSchema } from './V1_CubeRelationTypeAdapter.js';

// A deployed data product's access points (PLAN §6.8), read from two
// documents: the product's definition at its deployed version (titles, kinds
// and parameters) and its deployed artifact (each access point's columns, as
// the engine typed them when it deployed, and sample rows). Both are read
// tolerantly: what Cube doesn't know is skipped, and a problem stays on its
// access point, which is listed but can't be picked. No engine call

/** How many sample rows the preview shows */
export const V1_CUBE_SAMPLE_ROW_LIMIT = 5;

const LAKEHOUSE_ACCESS_POINT_TYPE = 'lakehouseAccessPoint';
const MODEL_ACCESS_POINT_GROUP_TYPE = 'modelAccessPointGroup';
const RELATION_TYPE = 'relationType';

/** Why an access point can't be picked */
export const V1_CUBE_ACCESS_POINT_REASON = {
  MODEL_GROUP: 'Model access point groups are not supported yet',
  NOT_LAKEHOUSE: 'Only Lakehouse access points can be added for now',
  PARAMETERS: 'It takes parameters, which Cube does not support yet',
  NOT_DEPLOYED: 'It is not in the deployed artifact',
  NO_DEFINITION: "Cube couldn't read the data product's definition",
  NO_RELATION: 'Its result is not a relation',
  NO_TYPE: 'Its columns are not in the deployed artifact',
  BAD_MULTIPLICITY: (column: string): string =>
    `Column "${column}" holds more than one value, which Cube can't show`,
} as const;

const asObject = (value: unknown): PlainObject =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as PlainObject)
    : {};

const asList = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length ? value : undefined;

/** A pair's key: an access point is known by its group and its own id */
const keyOf = (groupId: string, accessPointId: string): string =>
  JSON.stringify([groupId, accessPointId]);

/** The artifact's access point implementations, by group and id */
const readImplementations = (artifact: unknown): Map<string, PlainObject> => {
  const implementations = new Map<string, PlainObject>();
  asList(asObject(artifact).accessPointGroups).forEach((group) => {
    const groupId = asString(asObject(group).id);
    if (!groupId) {
      return;
    }
    asList(asObject(group).accessPointImplementations).forEach((value) => {
      const implementation = asObject(value);
      const id = asString(implementation.id);
      if (id) {
        implementations.set(keyOf(groupId, id), implementation);
      }
    });
  });
  return implementations;
};

/**
 * An access point's columns, from its implementation's lambdaGenericType:
 * the first relation type among its type arguments, whatever the outer type
 * (a relation, or an ingest relation accessor)
 */
const readSchema = (
  implementation: PlainObject,
): { schema: Schema } | { reason: string } => {
  const genericType = asObject(implementation.lambdaGenericType);
  if (!Object.keys(genericType).length) {
    return { reason: V1_CUBE_ACCESS_POINT_REASON.NO_TYPE };
  }
  const relationType = asList(genericType.typeArguments)
    .map((argument) => asObject(asObject(argument).rawType))
    .find((rawType) => rawType._type === RELATION_TYPE);
  if (!relationType) {
    return { reason: V1_CUBE_ACCESS_POINT_REASON.NO_RELATION };
  }
  for (const column of asList(relationType.columns).map(asObject)) {
    const multiplicity = asObject(column.multiplicity);
    if (Object.keys(multiplicity).length && multiplicity.upperBound !== 1) {
      return {
        reason: V1_CUBE_ACCESS_POINT_REASON.BAD_MULTIPLICITY(
          String(column.name),
        ),
      };
    }
  }
  try {
    return { schema: V1_buildCubeSchema(relationType) };
  } catch (error) {
    return { reason: error instanceof Error ? error.message : String(error) };
  }
};

/** Up to the preview's limit of rows, by the schema's columns; the artifact holds them as text */
const readSampleRows = (
  implementation: PlainObject,
  schema: Schema,
): CubeResultValue[][] => {
  const element = asObject(implementation.relationElement);
  const columns = asList(element.columns).map(String);
  const positions = schema.columns.map((column) =>
    columns.indexOf(column.name),
  );
  return asList(element.rows)
    .slice(0, V1_CUBE_SAMPLE_ROW_LIMIT)
    .map((row) => {
      const values = asList(asObject(row).values);
      return positions.map((position) => {
        const value = position < 0 ? undefined : values[position];
        return value === undefined || value === null ? null : String(value);
      });
    });
};

/**
 * A product's access points by group, as its definition lists them. One is
 * pickable when it is a Lakehouse access point without parameters, outside
 * a model group, deployed with a relation of columns Cube can read
 */
export const V1_readCubeDataProductDescription = (
  candidate: CubeDataProductCandidate,
  artifact: unknown,
  definition: unknown,
): CubeDataProductDescription => {
  const implementations = readImplementations(artifact);
  const hasDefinition = Boolean(asObject(definition).accessPointGroups);
  // without a definition, the artifact's groups are listed, unpickable
  const groupsJson = hasDefinition
    ? asList(asObject(definition).accessPointGroups)
    : asList(asObject(artifact).accessPointGroups).map((group) => ({
        ...asObject(group),
        accessPoints: asList(asObject(group).accessPointImplementations),
      }));
  const groups = groupsJson
    .map(asObject)
    .filter((group) => asString(group.id))
    .map((group) => {
      const groupId = group.id as string;
      const isModelGroup = group._type === MODEL_ACCESS_POINT_GROUP_TYPE;
      return new CubeAccessPointGroup({
        id: groupId,
        title: asString(group.title),
        accessPoints: asList(group.accessPoints)
          .map(asObject)
          .filter((point) => asString(point.id))
          .map((point) => {
            const id = point.id as string;
            const implementation = implementations.get(keyOf(groupId, id));
            const read = implementation
              ? readSchema(implementation)
              : undefined;
            const schema = read && 'schema' in read ? read.schema : undefined;
            const disabledReason = !hasDefinition
              ? V1_CUBE_ACCESS_POINT_REASON.NO_DEFINITION
              : isModelGroup
                ? V1_CUBE_ACCESS_POINT_REASON.MODEL_GROUP
                : point._type !== LAKEHOUSE_ACCESS_POINT_TYPE
                  ? V1_CUBE_ACCESS_POINT_REASON.NOT_LAKEHOUSE
                  : asList(asObject(point.func).parameters).length
                    ? V1_CUBE_ACCESS_POINT_REASON.PARAMETERS
                    : !implementation
                      ? V1_CUBE_ACCESS_POINT_REASON.NOT_DEPLOYED
                      : read && 'reason' in read
                        ? read.reason
                        : undefined;
            return new CubeAccessPoint({
              id,
              title: asString(point.title),
              description:
                asString(point.description) ??
                asString(implementation?.description),
              schema,
              disabledReason,
              sampleRows:
                implementation && schema
                  ? readSampleRows(implementation, schema)
                  : [],
            });
          }),
      });
    });
  return new CubeDataProductDescription(candidate, groups);
};

/** A saved source's schema, from the product's description, or why it has none */
export const V1_findCubeAccessPointSchema = (
  description: CubeDataProductDescription,
  location: CubeAccessPointLocation,
): Schema | string => {
  const accessPoint = description.groups
    .find((group) => group.id === location.accessPointGroup)
    ?.accessPoints.find((point) => point.id === location.accessPoint);
  if (!accessPoint) {
    return `The data product has no access point "${location.accessPoint}" in group "${location.accessPointGroup}"`;
  }
  return accessPoint.isPickable
    ? (accessPoint.schema as Schema)
    : (accessPoint.disabledReason ?? V1_CUBE_ACCESS_POINT_REASON.NO_TYPE);
};
