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

import { describe, test, expect, jest } from '@jest/globals';
import { flowResult, reaction } from 'mobx';
import {
  V1_AccessPointGroupInfo,
  V1_AccessPointImplementation,
  V1_DataProductArtifact,
  V1_GenericType,
  V1_Multiplicity,
  V1_RelationType,
  V1_RelationTypeColumn,
} from '@finos/legend-graph';
import {
  QUALITY_LEVEL,
  type DataProductQualityBreakdown,
  type DataProductQualityResponse,
} from '@finos/legend-server-marketplace';
import {
  DataProductQualityState,
  type DataProductQualityHost,
} from '../DataProductQualityState.js';

const buildColumn = (
  name: string,
  description?: string,
): V1_RelationTypeColumn => {
  const column = new V1_RelationTypeColumn();
  column.name = name;
  column.description = description;
  column.genericType = new V1_GenericType();
  column.multiplicity = new V1_Multiplicity(0, 1);
  return column;
};

/** An access point whose lambda is typed as a relation of the given columns, if any. */
const buildAccessPoint = (
  id: string,
  columns?: V1_RelationTypeColumn[],
): V1_AccessPointImplementation => {
  const implementation = new V1_AccessPointImplementation();
  implementation.id = id;
  if (columns) {
    const relationType = new V1_RelationType();
    relationType.columns = columns;
    const relation = new V1_GenericType();
    relation.rawType = relationType;
    const lambdaType = new V1_GenericType();
    lambdaType.typeArguments = [relation];
    implementation.lambdaGenericType = lambdaType;
  }
  return implementation;
};

const buildArtifact = (
  ...groups: V1_AccessPointImplementation[][]
): V1_DataProductArtifact => {
  const artifact = new V1_DataProductArtifact();
  artifact.accessPointGroups = groups.map((accessPoints, index) => {
    const group = new V1_AccessPointGroupInfo();
    group.id = `GROUP${index}`;
    group.accessPointImplementations = accessPoints;
    return group;
  });
  return artifact;
};

/** An artifact of one access point with `total` columns, `documented` of them described. */
const buildArtifactWithCoverage = (
  documented: number,
  total: number,
): V1_DataProductArtifact =>
  buildArtifact([
    buildAccessPoint(
      'ap1',
      Array.from({ length: total }, (_, index) =>
        buildColumn(
          `col${index}`,
          index < documented ? `Describes col${index}.` : undefined,
        ),
      ),
    ),
  ]);

const buildBreakdown = (
  overrides: Partial<DataProductQualityBreakdown> = {},
): DataProductQualityBreakdown => ({
  isDescriptionDocumented: true,
  isAccessPointsPresent: true,
  isAccessPointGroupDescriptionsDocumented: true,
  isEveryAccessPointDocumented: true,
  attributeCoverage: 0.6,
  documentedAttributeCount: 3,
  totalAttributeCount: 5,
  ...overrides,
});

/** What the backend reports for a product it counted no field of: full coverage of nothing. */
const VACUOUS_COVERAGE: Partial<DataProductQualityBreakdown> = {
  attributeCoverage: 1,
  documentedAttributeCount: 0,
  totalAttributeCount: 0,
};

const buildResponse = (
  qualityLevel: QUALITY_LEVEL,
  breakdown: Partial<DataProductQualityBreakdown> = {},
): DataProductQualityResponse => ({
  qualityLevel,
  qualityBreakdown: buildBreakdown(breakdown),
});

const buildHost = (options: {
  response?: DataProductQualityResponse | Error;
  artifact?: V1_DataProductArtifact | Error | undefined;
  hasArtifactPromise?: boolean;
  fetchDataProductQuality?:
    | (() => Promise<DataProductQualityResponse>)
    | undefined;
}): { host: DataProductQualityHost; warn: jest.Mock } => {
  const warn = jest.fn();
  const { response, artifact, hasArtifactPromise = true } = options;
  const fetchDataProductQuality =
    options.fetchDataProductQuality ??
    (response
      ? () =>
          response instanceof Error
            ? Promise.reject(response)
            : Promise.resolve(response)
      : undefined);
  const dataProductArtifactPromise = hasArtifactPromise
    ? artifact instanceof Error
      ? Promise.reject(artifact)
      : Promise.resolve(artifact)
    : undefined;
  return {
    host: {
      fetchDataProductQuality,
      dataProductArtifactPromise,
      applicationStore: { logService: { warn } },
    },
    warn,
  };
};

const compute = async (
  options: Parameters<typeof buildHost>[0],
): Promise<{ state: DataProductQualityState; warn: jest.Mock }> => {
  const { host, warn } = buildHost(options);
  const state = new DataProductQualityState(host);
  await flowResult(state.computeQuality());
  return { state, warn };
};

describe('DataProductQualityState', () => {
  describe('when there is no artifact to recompute from', () => {
    test.each([
      [QUALITY_LEVEL.BRONZE, { isDescriptionDocumented: false }],
      [QUALITY_LEVEL.SILVER, { isEveryAccessPointDocumented: false }],
    ])('passes a %s result through unchanged', async (level, breakdown) => {
      const response = buildResponse(level, breakdown);
      const { state, warn } = await compute({
        response,
        artifact: undefined,
      });

      expect(state.qualityLevel).toBe(level);
      expect(state.qualityBreakdown).toEqual(response.qualityBreakdown);
      expect(warn).not.toHaveBeenCalled();
    });

    test('passes the result through when the host has no artifact promise', async () => {
      const response = buildResponse(QUALITY_LEVEL.GOLD);
      const { state } = await compute({ response, hasArtifactPromise: false });

      expect(state.qualityLevel).toBe(QUALITY_LEVEL.GOLD);
      expect(state.qualityBreakdown).toEqual(response.qualityBreakdown);
    });

    test.each([
      ['has no artifact', { artifact: undefined }],
      ['has no artifact promise', { hasArtifactPromise: false }],
      ['fails to load the artifact', { artifact: new Error('unavailable') }],
    ])(
      'counts nothing as 0%% too when the host %s and the backend counted no field',
      async (_label, artifactOptions) => {
        const { state } = await compute({
          response: buildResponse(QUALITY_LEVEL.DIAMOND, VACUOUS_COVERAGE),
          ...artifactOptions,
        });

        // the backend's DIAMOND rests on a coverage of nothing: no evidence of any
        expect(state.qualityLevel).toBe(QUALITY_LEVEL.SILVER);
        expect(state.qualityBreakdown?.attributeCoverage).toBe(0);
      },
    );

    test('trusts a backend that did count fields when it has no artifact to check against', async () => {
      const response = buildResponse(QUALITY_LEVEL.PLATINUM, {
        attributeCoverage: 0.92,
        documentedAttributeCount: 92,
        totalAttributeCount: 100,
      });
      const { state } = await compute({ response, artifact: undefined });

      expect(state.qualityLevel).toBe(QUALITY_LEVEL.PLATINUM);
      expect(state.qualityBreakdown).toEqual(response.qualityBreakdown);
    });

    test('falls back to the backend result, and logs, when the artifact fails to load', async () => {
      const response = buildResponse(QUALITY_LEVEL.DIAMOND);
      const { state, warn } = await compute({
        response,
        artifact: new Error('artifact unavailable'),
      });

      expect(state.qualityLevel).toBe(QUALITY_LEVEL.DIAMOND);
      expect(state.qualityBreakdown).toEqual(response.qualityBreakdown);
      expect(state.computingQualityState.hasSucceeded).toBe(true);
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('when it recomputes coverage from the artifact', () => {
    test('refreshes the displayed coverage of a BRONZE product but not its tier', async () => {
      // The roadmap shows "(currently X%)" for the Platinum and Diamond milestones whatever the
      // current tier, so a product that is not eligible yet still gets the real numbers.
      const { state } = await compute({
        response: buildResponse(QUALITY_LEVEL.BRONZE, {
          isDescriptionDocumented: false,
        }),
        artifact: buildArtifactWithCoverage(1, 2),
      });

      expect(state.qualityLevel).toBe(QUALITY_LEVEL.BRONZE);
      expect(state.qualityBreakdown?.isDescriptionDocumented).toBe(false);
      expect(state.qualityBreakdown?.attributeCoverage).toBe(0.5);
      expect(state.qualityBreakdown?.documentedAttributeCount).toBe(1);
      expect(state.qualityBreakdown?.totalAttributeCount).toBe(2);
    });

    test('does not promote a SILVER product that is not eligible for a coverage tier', async () => {
      const { state } = await compute({
        response: buildResponse(QUALITY_LEVEL.SILVER, {
          isEveryAccessPointDocumented: false,
        }),
        artifact: buildArtifactWithCoverage(10, 10),
      });

      expect(state.qualityLevel).toBe(QUALITY_LEVEL.SILVER);
      expect(state.qualityBreakdown?.attributeCoverage).toBe(1);
    });

    test('overrides the vacuous 100% the backend reports for a product it counted no fields of', async () => {
      const { state } = await compute({
        response: buildResponse(QUALITY_LEVEL.DIAMOND, VACUOUS_COVERAGE),
        artifact: buildArtifact([
          buildAccessPoint('ap1', [
            buildColumn('col1', 'A real description.'),
            buildColumn('col2'),
            buildColumn('col3', 'col3'), // identical to its own name: not documented
            buildColumn('col4', 'Another real one.'),
          ]),
        ]),
      });

      // 2 documented of 4 columns is 50%: GOLD, not the backend's DIAMOND
      expect(state.qualityLevel).toBe(QUALITY_LEVEL.GOLD);
      expect(state.qualityBreakdown?.attributeCoverage).toBe(0.5);
      expect(state.qualityBreakdown?.documentedAttributeCount).toBe(2);
      expect(state.qualityBreakdown?.totalAttributeCount).toBe(4);
    });

    test('upgrades a backend GOLD to DIAMOND when every column is documented', async () => {
      const { state } = await compute({
        response: buildResponse(QUALITY_LEVEL.GOLD, {
          attributeCoverage: 0.6,
          documentedAttributeCount: 3,
          totalAttributeCount: 5,
        }),
        artifact: buildArtifactWithCoverage(2, 2),
      });

      expect(state.qualityLevel).toBe(QUALITY_LEVEL.DIAMOND);
      expect(state.qualityBreakdown?.attributeCoverage).toBe(1);
      expect(state.qualityBreakdown?.documentedAttributeCount).toBe(2);
      expect(state.qualityBreakdown?.totalAttributeCount).toBe(2);
    });

    test.each([
      [49, QUALITY_LEVEL.SILVER],
      [50, QUALITY_LEVEL.GOLD],
      [89, QUALITY_LEVEL.GOLD],
      [90, QUALITY_LEVEL.PLATINUM],
      [94, QUALITY_LEVEL.PLATINUM],
      [95, QUALITY_LEVEL.DIAMOND],
      [100, QUALITY_LEVEL.DIAMOND],
    ])(
      'derives the tier for %i of 100 columns documented at its thresholds',
      async (documented, expected) => {
        const { state } = await compute({
          response: buildResponse(QUALITY_LEVEL.SILVER),
          artifact: buildArtifactWithCoverage(documented, 100),
        });

        expect(state.qualityLevel).toBe(expected);
        expect(state.qualityBreakdown?.attributeCoverage).toBe(
          documented / 100,
        );
      },
    );

    test('adds up the columns of every access point of every group', async () => {
      const { state } = await compute({
        response: buildResponse(QUALITY_LEVEL.SILVER),
        artifact: buildArtifact(
          [
            buildAccessPoint('ap1', [buildColumn('a', 'Documented.')]),
            // not typed as a relation: contributes no column
            buildAccessPoint('ap2'),
          ],
          [
            buildAccessPoint('ap3', [
              buildColumn('b', 'Documented.'),
              buildColumn('c'),
              buildColumn('d'),
            ]),
          ],
        ),
      });

      expect(state.qualityBreakdown?.documentedAttributeCount).toBe(2);
      expect(state.qualityBreakdown?.totalAttributeCount).toBe(4);
      expect(state.qualityBreakdown?.attributeCoverage).toBe(0.5);
    });

    test.each([
      ['an empty description', ''],
      ['a blank description', '   '],
      ['a description that is the column name in another case', ' COL '],
    ])(
      'counts a column with %s as undocumented',
      async (_label, description) => {
        const { state } = await compute({
          response: buildResponse(QUALITY_LEVEL.SILVER),
          artifact: buildArtifact([
            buildAccessPoint('ap1', [
              buildColumn('col', description),
              buildColumn('other', 'Documented.'),
            ]),
          ]),
        });

        expect(state.qualityBreakdown?.documentedAttributeCount).toBe(1);
        expect(state.qualityBreakdown?.totalAttributeCount).toBe(2);
      },
    );

    test.each([
      [
        'an access point without a relation type',
        buildArtifact([buildAccessPoint('ap1')]),
      ],
      [
        'a relation type without columns',
        buildArtifact([buildAccessPoint('ap1', [])]),
      ],
      ['no access point group', buildArtifact()],
    ])(
      'counts no column as 0% documented, not 100%, when the artifact has none: %s',
      async (_label, artifact) => {
        // The backend reports the same case as full coverage. Eligible, so it was DIAMOND
        // with nothing documented.
        const { state } = await compute({
          response: buildResponse(QUALITY_LEVEL.DIAMOND, VACUOUS_COVERAGE),
          artifact,
        });

        expect(state.qualityLevel).toBe(QUALITY_LEVEL.SILVER);
        expect(state.qualityBreakdown?.attributeCoverage).toBe(0);
        expect(state.qualityBreakdown?.documentedAttributeCount).toBe(0);
        expect(state.qualityBreakdown?.totalAttributeCount).toBe(0);
      },
    );

    test('does not promote a product without columns that is not eligible for a coverage tier', async () => {
      const { state } = await compute({
        response: buildResponse(QUALITY_LEVEL.BRONZE, {
          ...VACUOUS_COVERAGE,
          isDescriptionDocumented: false,
        }),
        artifact: buildArtifact(),
      });

      expect(state.qualityLevel).toBe(QUALITY_LEVEL.BRONZE);
      expect(state.qualityBreakdown?.attributeCoverage).toBe(0);
    });

    test('leaves the backend breakdown it was given untouched', async () => {
      const response = buildResponse(QUALITY_LEVEL.SILVER);
      const before = { ...response.qualityBreakdown };
      const { state } = await compute({
        response,
        artifact: buildArtifactWithCoverage(1, 2),
      });

      expect(response.qualityBreakdown).toEqual(before);
      expect(state.qualityBreakdown).not.toBe(response.qualityBreakdown);
    });
  });

  describe('when the quality cannot be computed', () => {
    test('shows no badge, and logs, when the quality request fails', async () => {
      const { state, warn } = await compute({
        response: new Error('quality unavailable'),
        artifact: buildArtifactWithCoverage(1, 1),
      });

      expect(state.qualityLevel).toBeUndefined();
      expect(state.qualityBreakdown).toBeUndefined();
      expect(state.computingQualityState.hasFailed).toBe(true);
      expect(warn).toHaveBeenCalledTimes(1);
    });

    test('does not fail on an artifact that also fails when the quality request does', async () => {
      const { state, warn } = await compute({
        response: new Error('quality unavailable'),
        artifact: new Error('artifact unavailable'),
      });

      expect(state.qualityLevel).toBeUndefined();
      expect(state.computingQualityState.hasFailed).toBe(true);
      expect(warn).toHaveBeenCalledTimes(2);
    });

    test('is unsupported, and quietly shows nothing, when the host has no quality action', async () => {
      const { host, warn } = buildHost({});
      const state = new DataProductQualityState(host);

      expect(state.isSupported).toBe(false);
      await flowResult(state.computeQuality());

      expect(state.qualityLevel).toBeUndefined();
      expect(state.qualityBreakdown).toBeUndefined();
      expect(state.computingQualityState.hasFailed).toBe(true);
      expect(warn).not.toHaveBeenCalled();
    });

    test('is supported when the host has a quality action', () => {
      const { host } = buildHost({
        response: buildResponse(QUALITY_LEVEL.BRONZE),
      });

      expect(new DataProductQualityState(host).isSupported).toBe(true);
    });
  });

  describe('computing', () => {
    test('requests the quality once, however many times it is asked to compute', async () => {
      const fetchDataProductQuality = jest.fn(() =>
        Promise.resolve(buildResponse(QUALITY_LEVEL.GOLD)),
      );
      const { host } = buildHost({ fetchDataProductQuality });
      const state = new DataProductQualityState(host);

      await Promise.all([
        flowResult(state.computeQuality()),
        flowResult(state.computeQuality()),
      ]);
      await flowResult(state.computeQuality());

      expect(fetchDataProductQuality).toHaveBeenCalledTimes(1);
      expect(state.computingQualityState.hasSucceeded).toBe(true);
    });

    test('is in progress while the quality loads and succeeded after', async () => {
      const { host } = buildHost({
        response: buildResponse(QUALITY_LEVEL.GOLD),
      });
      const state = new DataProductQualityState(host);

      expect(state.computingQualityState.isInInitialState).toBe(true);
      const computing = flowResult(state.computeQuality());
      expect(state.computingQualityState.isInProgress).toBe(true);
      await computing;

      expect(state.computingQualityState.isInProgress).toBe(false);
      expect(state.computingQualityState.hasSucceeded).toBe(true);
    });

    test('notifies observers once, with the final tier and breakdown', async () => {
      const { host } = buildHost({
        response: buildResponse(QUALITY_LEVEL.DIAMOND),
        artifact: buildArtifactWithCoverage(1, 2),
      });
      const state = new DataProductQualityState(host);
      const seen: (QUALITY_LEVEL | undefined)[] = [];
      const dispose = reaction(
        () => ({
          level: state.qualityLevel,
          breakdown: state.qualityBreakdown,
        }),
        ({ level }) => seen.push(level),
      );

      await flowResult(state.computeQuality());
      dispose();

      // the backend's DIAMOND is never shown: observers only see the corrected tier
      expect(seen).toEqual([QUALITY_LEVEL.GOLD]);
      expect(state.qualityBreakdown?.attributeCoverage).toBe(0.5);
    });
  });
});
