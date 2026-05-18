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
  type V1_Accessor,
  type RawLambda,
  V1_AccessPointGroup,
  V1_AccessPointGroupInfo,
  V1_AccessPointImplementation,
  V1_AppDirProducer,
  V1_DataProduct,
  V1_DataProductAccessor,
  V1_DataProductArtifact,
  V1_DataProductInfo,
  V1_Dataset,
  V1_DependencyAccessPoint,
  V1_IngestDefinitionAccessor,
  V1_IngestDefinitionInfo,
  V1_KerberosProducer,
  V1_LakehouseAccessPoint,
  V1_ProducerType,
  V1_RawLambda,
  V1_RelationStoreAccessor,
} from '@finos/legend-graph';
import type { ProjectGAVCoordinates } from '@finos/legend-storage';
import {
  buildCandidateIngestUrns,
  collectDatasetsFromArtifact,
  isLegacyArtifact,
  walkAccessPointGraphForIngestPaths,
  type LakehouseIngestDatasetInfo,
} from '../DataProductIngestUtils.js';

const TEST_DEPLOYMENT_ID = 11111;
const TEST_DP_NAME = 'MyDataProduct';
const MAIN_APG_ID = 'GROUP1';

const buildDataset = (
  ingestPath: string,
  producerKind: 'appDir' | 'kerberos',
  datasetName: string,
): V1_Dataset => {
  const dataset = new V1_Dataset();
  const ingestDef = new V1_IngestDefinitionInfo();
  ingestDef.path = ingestPath;
  if (producerKind === 'appDir') {
    const producer = new V1_AppDirProducer();
    producer.appDirId = 99999;
    ingestDef.producer = producer;
  } else {
    const producer = new V1_KerberosProducer();
    producer.kerberos = 'svc-acct';
    ingestDef.producer = producer;
  }
  dataset.ingestDefinition = ingestDef;
  dataset.dataset = datasetName;
  return dataset;
};

const buildDependencyAccessPoint = (
  dataProductId: string,
  accessPointId: string,
): V1_DependencyAccessPoint => {
  const dep = new V1_DependencyAccessPoint();
  dep.dataProductId = dataProductId;
  dep.accessPointId = accessPointId;
  dep.production = true;
  return dep;
};

const sameDpDep = (accessPointId: string): V1_DependencyAccessPoint =>
  buildDependencyAccessPoint(TEST_DP_NAME, accessPointId);
const crossDpDep = (
  otherDpId: string,
  accessPointId: string,
): V1_DependencyAccessPoint =>
  buildDependencyAccessPoint(otherDpId, accessPointId);

const buildAccessPointImpl = (
  id: string,
  dependencyDatasets: V1_Dataset[],
  dependencyAccessPoints: V1_DependencyAccessPoint[] = [],
): V1_AccessPointImplementation => {
  const impl = new V1_AccessPointImplementation();
  impl.id = id;
  impl.dependencyDatasets = dependencyDatasets;
  impl.dependencyAccessPoints = dependencyAccessPoints;
  return impl;
};

const buildArtifact = (
  accessPointImpls: V1_AccessPointImplementation[],
  options: {
    apgId?: string;
    extraGroups?: { id: string; impls: V1_AccessPointImplementation[] }[];
  } = {},
): V1_DataProductArtifact => {
  const artifact = new V1_DataProductArtifact();
  const dpInfo = new V1_DataProductInfo();
  dpInfo.path = `test::${TEST_DP_NAME}`;
  dpInfo.deploymentId = String(TEST_DEPLOYMENT_ID);
  artifact.dataProduct = dpInfo;

  const targetGroup = new V1_AccessPointGroupInfo();
  targetGroup.id = options.apgId ?? MAIN_APG_ID;
  targetGroup.accessPointImplementations = accessPointImpls;
  artifact.accessPointGroups = [targetGroup];

  (options.extraGroups ?? []).forEach((g) => {
    const group = new V1_AccessPointGroupInfo();
    group.id = g.id;
    group.accessPointImplementations = g.impls;
    artifact.accessPointGroups.push(group);
  });

  return artifact;
};

const DATASET_A = (): V1_Dataset =>
  buildDataset('com.example::IngestA', 'appDir', 'DATASET_A');
const DATASET_B = (): V1_Dataset =>
  buildDataset('com.example::IngestB', 'appDir', 'DATASET_B');
const DATASET_B_KERBEROS = (): V1_Dataset =>
  buildDataset('com.example::IngestB', 'kerberos', 'DATASET_B');
const DATASET_FOREIGN = (): V1_Dataset =>
  buildDataset('other.dp::IngestForeign', 'appDir', 'DATASET_FOREIGN');

const AP1_WITH_A = (): V1_AccessPointImplementation =>
  buildAccessPointImpl('ap1', [DATASET_A()]);
const AP2_WITH_B = (): V1_AccessPointImplementation =>
  buildAccessPointImpl('ap2', [DATASET_B()]);
const EMPTY_AP1 = (): V1_AccessPointImplementation =>
  buildAccessPointImpl('ap1', []);
const EMPTY_AP2 = (): V1_AccessPointImplementation =>
  buildAccessPointImpl('ap2', []);

describe('collectDatasetsFromArtifact', () => {
  test('returns datasets from a single access point implementation', () => {
    const expectedDataset = DATASET_A();
    const artifact = buildArtifact([
      buildAccessPointImpl('ap1', [expectedDataset]),
    ]);

    const result = collectDatasetsFromArtifact(
      artifact,
      MAIN_APG_ID,
      TEST_DP_NAME,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(expectedDataset);
  });

  test('returns datasets from multiple impls in the same group and dedupes duplicates', () => {
    const ap2 = buildAccessPointImpl('ap2', [
      DATASET_B_KERBEROS(),
      DATASET_A(),
    ]);
    const artifact = buildArtifact([AP1_WITH_A(), ap2]);

    const result = collectDatasetsFromArtifact(
      artifact,
      MAIN_APG_ID,
      TEST_DP_NAME,
    );

    expect(result).toHaveLength(2);
    expect(result.map((d) => d.dataset).sort()).toEqual([
      'DATASET_A',
      'DATASET_B',
    ]);
  });

  test('follows same-DP dependency access points transitively', () => {
    const ap1 = buildAccessPointImpl('ap1', [DATASET_A()], [sameDpDep('ap2')]);
    const artifact = buildArtifact([ap1, AP2_WITH_B()]);

    const result = collectDatasetsFromArtifact(
      artifact,
      MAIN_APG_ID,
      TEST_DP_NAME,
    );

    expect(result).toHaveLength(2);
    expect(result.map((d) => d.dataset).sort()).toEqual([
      'DATASET_A',
      'DATASET_B',
    ]);
  });

  test('skips cross-DP dependency access points (other dataProductId)', () => {
    const ap1 = buildAccessPointImpl(
      'ap1',
      [DATASET_A()],
      [crossDpDep('OtherDataProduct', 'apForeign')],
    );
    const apForeign = buildAccessPointImpl('apForeign', [DATASET_FOREIGN()]);
    const artifact = buildArtifact([ap1], {
      extraGroups: [{ id: 'OTHER_GROUP', impls: [apForeign] }],
    });

    const result = collectDatasetsFromArtifact(
      artifact,
      MAIN_APG_ID,
      TEST_DP_NAME,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.dataset).toBe('DATASET_A');
  });

  test('dedupes access points reached via a cycle (ap1 → ap2 → ap1)', () => {
    const ap1 = buildAccessPointImpl('ap1', [DATASET_A()], [sameDpDep('ap2')]);
    const ap2 = buildAccessPointImpl('ap2', [DATASET_B()], [sameDpDep('ap1')]);
    const artifact = buildArtifact([ap1, ap2]);

    const result = collectDatasetsFromArtifact(
      artifact,
      MAIN_APG_ID,
      TEST_DP_NAME,
    );

    expect(result).toHaveLength(2);
    expect(result.map((d) => d.dataset).sort()).toEqual([
      'DATASET_A',
      'DATASET_B',
    ]);
  });

  test('throws when the target access point group is missing', () => {
    const artifact = buildArtifact([AP1_WITH_A()]);

    expect(() =>
      collectDatasetsFromArtifact(artifact, 'NOT_PRESENT', TEST_DP_NAME),
    ).toThrow(
      `Access point group 'NOT_PRESENT' not found in data product '${TEST_DP_NAME}'`,
    );
  });

  test('throws when a same-DP dependency references an unknown access point id', () => {
    const ap1 = buildAccessPointImpl(
      'ap1',
      [DATASET_A()],
      [sameDpDep('ap_unknown')],
    );
    const artifact = buildArtifact([ap1]);

    expect(() =>
      collectDatasetsFromArtifact(artifact, MAIN_APG_ID, TEST_DP_NAME),
    ).toThrow(/ap_unknown/);
  });
});

const INGEST_PATH = 'com.example::IngestA';

const buildDatasetInfo = (
  params: {
    gavCoordinates?: ProjectGAVCoordinates;
    producerType?: V1_ProducerType;
    appDirId?: number;
    kerberos?: string;
  } = {},
): LakehouseIngestDatasetInfo => ({
  gavCoordinates: params.gavCoordinates ?? {
    groupId: 'com.example',
    artifactId: 'my-data-product',
    versionId: '1.0.0',
  },
  deploymentId: TEST_DEPLOYMENT_ID,
  ingestDefinitionPackage: 'com.example',
  ingestDefinitionName: 'IngestA',
  datasetName: 'DATASET_A',
  producerType: params.producerType ?? V1_ProducerType.APP_DIR,
  appDirId: params.appDirId,
  kerberos: params.kerberos,
});

describe('buildCandidateIngestUrns', () => {
  test('emits a single alloy-git URN when only GAV is set', () => {
    const gavOnlyDataset = buildDatasetInfo();

    const result = buildCandidateIngestUrns(
      gavOnlyDataset,
      'prod',
      INGEST_PATH,
    );

    expect(result).toEqual([
      `urn:lakehouse:prod:ingest:definition:alloy-git:com.example~my-data-product~${INGEST_PATH}`,
    ]);
  });

  test('appends a rest-api appdir URN when appDirId is set', () => {
    const appDirDataset = buildDatasetInfo({ appDirId: 99999 });

    const result = buildCandidateIngestUrns(appDirDataset, 'prod', INGEST_PATH);

    expect(result).toEqual([
      `urn:lakehouse:prod:ingest:definition:alloy-git:com.example~my-data-product~${INGEST_PATH}`,
      `urn:lakehouse:prod:ingest:definition:rest-api:${TEST_DEPLOYMENT_ID}~99999~${INGEST_PATH}`,
    ]);
  });

  test('appends a rest-api kerberos URN when kerberos is set', () => {
    const kerberosDataset = buildDatasetInfo({
      producerType: V1_ProducerType.KERBEROS,
      kerberos: 'svc-acct',
    });

    const result = buildCandidateIngestUrns(
      kerberosDataset,
      'prod',
      INGEST_PATH,
    );

    expect(result).toEqual([
      `urn:lakehouse:prod:ingest:definition:alloy-git:com.example~my-data-product~${INGEST_PATH}`,
      `urn:lakehouse:prod:ingest:definition:rest-api:svc-acct~${INGEST_PATH}`,
    ]);
  });

  test('omits the alloy-git URN when GAV groupId or artifactId is missing', () => {
    const datasetMissingGroupId = buildDatasetInfo({
      gavCoordinates: { groupId: '', artifactId: 'x', versionId: '1.0.0' },
      appDirId: 99999,
    });
    const datasetMissingArtifactId = buildDatasetInfo({
      gavCoordinates: { groupId: 'g', artifactId: '', versionId: '1.0.0' },
      appDirId: 99999,
    });

    const noGroup = buildCandidateIngestUrns(
      datasetMissingGroupId,
      'prod',
      INGEST_PATH,
    );
    const noArtifact = buildCandidateIngestUrns(
      datasetMissingArtifactId,
      'prod',
      INGEST_PATH,
    );

    expect(noGroup.some((u) => u.includes('alloy-git'))).toBe(false);
    expect(noArtifact.some((u) => u.includes('alloy-git'))).toBe(false);
    expect(noGroup).toHaveLength(1);
    expect(noArtifact).toHaveLength(1);
  });

  test('renders the env segment verbatim for prod-parallel and non-prod', () => {
    const gavOnlyDataset = buildDatasetInfo();

    const prodParallel = buildCandidateIngestUrns(
      gavOnlyDataset,
      'prod-parallel',
      INGEST_PATH,
    );
    const nonProd = buildCandidateIngestUrns(
      gavOnlyDataset,
      'non-prod',
      INGEST_PATH,
    );

    expect(prodParallel[0]).toBe(
      `urn:lakehouse:prod-parallel:ingest:definition:alloy-git:com.example~my-data-product~${INGEST_PATH}`,
    );
    expect(nonProd[0]).toBe(
      `urn:lakehouse:non-prod:ingest:definition:alloy-git:com.example~my-data-product~${INGEST_PATH}`,
    );
  });
});

describe('isLegacyArtifact', () => {
  test('returns true when the target access point group is missing', () => {
    const artifact = buildArtifact([AP1_WITH_A()]);

    expect(isLegacyArtifact(artifact, 'NOT_PRESENT')).toBe(true);
  });

  test('returns true when the access point group has no implementations', () => {
    const artifact = buildArtifact([]);

    expect(isLegacyArtifact(artifact, MAIN_APG_ID)).toBe(true);
  });

  test('returns true when every implementation has neither datasets nor dependencies', () => {
    const artifact = buildArtifact([EMPTY_AP1(), EMPTY_AP2()]);

    expect(isLegacyArtifact(artifact, MAIN_APG_ID)).toBe(true);
  });

  test('returns false when an implementation has dependency datasets', () => {
    const artifact = buildArtifact([EMPTY_AP1(), AP2_WITH_B()]);

    expect(isLegacyArtifact(artifact, MAIN_APG_ID)).toBe(false);
  });

  test('returns false when an implementation has dependency access points but no datasets', () => {
    const ap1 = buildAccessPointImpl('ap1', [], [sameDpDep('ap2')]);
    const artifact = buildArtifact([ap1]);

    expect(isLegacyArtifact(artifact, MAIN_APG_ID)).toBe(false);
  });
});

const WALKER_DP_PATH = 'com.example::MyDataProduct';
const INGEST_A_PATH = 'com.example::IngestA';
const INGEST_B_PATH = 'com.example::IngestB';

const buildLakehouseAP = (apId: string): V1_LakehouseAccessPoint => {
  const ap = new V1_LakehouseAccessPoint();
  ap.id = apId;
  ap.targetEnvironment = 'prod';
  const lambda = new V1_RawLambda();
  lambda.parameters = [];
  lambda.body = [apId];
  ap.func = lambda;
  return ap;
};
const AP1 = (): V1_LakehouseAccessPoint => buildLakehouseAP('ap1');
const AP2 = (): V1_LakehouseAccessPoint => buildLakehouseAP('ap2');

const buildIngestAccessor = (path: string): V1_IngestDefinitionAccessor => {
  const a = new V1_IngestDefinitionAccessor();
  a.path = [path];
  return a;
};
const buildDataProductAccessor = (
  dpPath: string,
  apId: string,
): V1_DataProductAccessor => {
  const a = new V1_DataProductAccessor();
  a.path = [dpPath, apId];
  return a;
};
const INGEST_ACCESSOR_A = buildIngestAccessor(INGEST_A_PATH);
const INGEST_ACCESSOR_B = buildIngestAccessor(INGEST_B_PATH);
const REF_AP1 = buildDataProductAccessor(WALKER_DP_PATH, 'ap1');
const REF_AP2 = buildDataProductAccessor(WALKER_DP_PATH, 'ap2');
const CROSS_DP_REF = buildDataProductAccessor(
  'other.dp::OtherDataProduct',
  'apForeign',
);

const buildAccessPointGroup = (
  id: string,
  accessPoints: V1_LakehouseAccessPoint[],
): V1_AccessPointGroup => {
  const apg = new V1_AccessPointGroup();
  apg.id = id;
  apg.accessPoints = accessPoints;
  return apg;
};
const buildWalkerDataProduct = (
  groups: V1_AccessPointGroup[],
): V1_DataProduct => {
  const dp = new V1_DataProduct();
  dp.package = 'com.example';
  dp.name = 'MyDataProduct';
  dp.accessPointGroups = groups;
  return dp;
};
const dpWithGroup = (
  id: string,
  accessPoints: V1_LakehouseAccessPoint[],
): V1_DataProduct =>
  buildWalkerDataProduct([buildAccessPointGroup(id, accessPoints)]);

const buildResolverByApId = (
  accessorsByApId: Record<string, V1_Accessor[]>,
): ((lambda: RawLambda) => V1_Accessor[]) => {
  return (lambda: RawLambda): V1_Accessor[] => {
    const apId = (lambda.body as unknown as string[])[0];
    return apId ? (accessorsByApId[apId] ?? []) : [];
  };
};

describe('walkAccessPointGraphForIngestPaths', () => {
  test('collects the ingest spec path from a single ingest accessor', () => {
    const dp = dpWithGroup('GROUP1', [AP1()]);
    const resolver = buildResolverByApId({ ap1: [INGEST_ACCESSOR_A] });

    const result = walkAccessPointGraphForIngestPaths(dp, 'GROUP1', resolver);

    expect(Array.from(result)).toEqual([INGEST_A_PATH]);
  });

  test('collects multiple ingest spec paths from a single access point', () => {
    const dp = dpWithGroup('GROUP1', [AP1()]);
    const resolver = buildResolverByApId({
      ap1: [INGEST_ACCESSOR_A, INGEST_ACCESSOR_B],
    });

    const result = walkAccessPointGraphForIngestPaths(dp, 'GROUP1', resolver);

    expect(Array.from(result).sort()).toEqual([INGEST_A_PATH, INGEST_B_PATH]);
  });

  test('follows same-DP data product accessors into other access point groups', () => {
    const dp = buildWalkerDataProduct([
      buildAccessPointGroup('GROUP1', [AP1()]),
      buildAccessPointGroup('GROUP2', [AP2()]),
    ]);
    const resolver = buildResolverByApId({
      ap1: [REF_AP2],
      ap2: [INGEST_ACCESSOR_B],
    });

    const result = walkAccessPointGraphForIngestPaths(dp, 'GROUP1', resolver);

    expect(Array.from(result)).toEqual([INGEST_B_PATH]);
  });

  test('silently skips cross-DP data product accessors', () => {
    const dp = dpWithGroup('GROUP1', [AP1()]);
    const resolver = buildResolverByApId({
      ap1: [CROSS_DP_REF, INGEST_ACCESSOR_A],
    });

    const result = walkAccessPointGraphForIngestPaths(dp, 'GROUP1', resolver);

    expect(Array.from(result)).toEqual([INGEST_A_PATH]);
  });

  test('terminates and visits each access point exactly once when references form a cycle', () => {
    const dp = buildWalkerDataProduct([
      buildAccessPointGroup('GROUP1', [AP1()]),
      buildAccessPointGroup('GROUP2', [AP2()]),
    ]);

    let ap1ResolveCount = 0;
    let ap2ResolveCount = 0;
    const resolver = (lambda: RawLambda): V1_Accessor[] => {
      const apId = (lambda.body as unknown as string[])[0];
      if (apId === 'ap1') {
        ap1ResolveCount += 1;
        return [REF_AP2, INGEST_ACCESSOR_A];
      }
      if (apId === 'ap2') {
        ap2ResolveCount += 1;
        return [REF_AP1, INGEST_ACCESSOR_B];
      }
      return [];
    };

    const result = walkAccessPointGraphForIngestPaths(dp, 'GROUP1', resolver);

    expect(Array.from(result).sort()).toEqual([INGEST_A_PATH, INGEST_B_PATH]);
    expect(ap1ResolveCount).toBe(1);
    expect(ap2ResolveCount).toBe(1);
  });

  test('ignores accessor kinds other than ingest and data product accessors', () => {
    const dp = dpWithGroup('GROUP1', [AP1()]);
    const resolver = buildResolverByApId({
      ap1: [new V1_RelationStoreAccessor(), INGEST_ACCESSOR_A],
    });

    const result = walkAccessPointGraphForIngestPaths(dp, 'GROUP1', resolver);

    expect(Array.from(result)).toEqual([INGEST_A_PATH]);
  });

  test('throws when the root access point group is missing from the data product', () => {
    const dp = dpWithGroup('GROUP1', [AP1()]);
    const resolver = buildResolverByApId({});

    expect(() =>
      walkAccessPointGraphForIngestPaths(dp, 'NOT_PRESENT', resolver),
    ).toThrow(
      `Access point group 'NOT_PRESENT' not found in data product '${WALKER_DP_PATH}'`,
    );
  });
});
