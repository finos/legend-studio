/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { test, expect, beforeEach } from '@jest/globals';
import {
  TEST_DATA__MissingSuperType,
  TEST_DATA__MissingProfile,
  TEST_DATA__MissingProperty,
  TEST_DATA__MissingStereoType,
  TEST_DATA__MissingTagValue,
  TEST_DATA__MissingTargetClassinMapping,
  TEST_DATA__MissingClassMappingWithTargetId,
  TEST_DATA__DuplicateEnumerationValues,
  TEST_DATA__DuplicateProfileTags,
  TEST_DATA__DuplicateProfileStereotypes,
  TEST_DATA__DuplicateClassProperties,
  TEST_DATA__DuplicateAssociationProperties,
  TEST_DATA__DuplicatedElement,
  TEST_DATA__InvalidAssociationProperty,
  TEST_DATA__UnknownElement,
} from './TEST_DATA__GraphBuildFailure.js';
import { unitTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import type { GraphManagerState } from '../../GraphManagerState.js';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../../__test-utils__/GraphManagerTestUtils.js';
import { TEST_DATA__DATAPRODUCT__INCLUDE } from '../roundtripTestData/TEST_DATA__DataProductRoundtrip.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

let graphManagerState: GraphManagerState;

beforeEach(async () => {
  graphManagerState = TEST__getTestGraphManagerState();
});

test(unitTest('Missing super type'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingSuperType as Entity[],
      graphManagerState.graphBuildState,
    ),
  ).rejects.toThrowError(
    `Can't find supertype 'ui::test1::Organism' of class 'ui::test1::Animal'`,
  );
});

test(unitTest('Missing profile'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingProfile as Entity[],
      graphManagerState.graphBuildState,
    ),
  ).rejects.toThrowError(`Can't find profile 'ui::test1::ProfileTest'`);
});

test(unitTest('Duplicated element'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__DuplicatedElement as Entity[],
      graphManagerState.graphBuildState,
    ),
  ).rejects.toThrowError(`Element 'ui::test1::Animal' already exists`);
});

test(unitTest('Missing class property'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingProperty as Entity[],
      graphManagerState.graphBuildState,
    ),
  ).rejects.toThrowError(`Can't find type 'ui::test1::NotFound'`);
});

test(unitTest('Missing stereotype'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingStereoType as Entity[],
      graphManagerState.graphBuildState,
    ),
  ).rejects.toThrowError(
    `Can't find stereotype 'missingStereotype' in profile 'ui::meta::pure::profiles::TestProfile'`,
  );
});

test(unitTest('Missing tagged value'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingTagValue as Entity[],
      graphManagerState.graphBuildState,
    ),
  ).rejects.toThrowError(
    `Can't find tag 'missingTag' in profile 'ui::meta::pure::profiles::TestProfile'`,
  );
});

test(unitTest('Missing class in Pure Instance class mapping'), async () => {
  await expect(() =>
    graphManagerState.graphManager.buildGraph(
      graphManagerState.graph,
      TEST_DATA__MissingTargetClassinMapping as Entity[],
      graphManagerState.graphBuildState,
    ),
  ).rejects.toThrowError(`Can't find type 'ui::test1::Target_Something'`);
});

test(unitTest('STRICT-MODE: Missing class mapping with ID'), async () => {
  await expect(() =>
    TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__MissingClassMappingWithTargetId as Entity[],
      {
        strict: true,
      },
    ),
  ).rejects.toThrowError(
    `Can't find class mapping with ID 'notFound' in mapping 'ui::myMap'`,
  );
});

test(unitTest('STRICT-MODE: Duplicate enumeration values'), async () => {
  await expect(() =>
    TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__DuplicateEnumerationValues as Entity[],
      {
        strict: true,
      },
    ),
  ).rejects.toThrowError(
    `Found duplicated value 'enum_value' in enumeration 'test::enum'`,
  );
});

test(unitTest('STRICT-MODE: Duplicate profile tags'), async () => {
  await expect(() =>
    TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__DuplicateProfileTags as Entity[],
      {
        strict: true,
      },
    ),
  ).rejects.toThrowError(
    `Found duplicated tag 'tag1' in profile 'test::profile1'`,
  );
});

test(unitTest('STRICT-MODE: Duplicate profile stereotypes'), async () => {
  await expect(() =>
    TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__DuplicateProfileStereotypes as Entity[],
      {
        strict: true,
      },
    ),
  ).rejects.toThrowError(
    `Found duplicated stereotype 'stereotype1' in profile 'test::profile2'`,
  );
});

test(unitTest('STRICT-MODE: Duplicate class properties'), async () => {
  await expect(() =>
    TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__DuplicateClassProperties as Entity[],
      {
        strict: true,
      },
    ),
  ).rejects.toThrowError(
    `Found duplicated property 'abc' in class 'test::class'`,
  );
});

test(unitTest('STRICT-MODE: Duplicate association properties'), async () => {
  await expect(() =>
    TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__DuplicateAssociationProperties as Entity[],
      {
        strict: true,
      },
    ),
  ).rejects.toThrowError(
    `Found duplicated property 'abc' in association 'test::association'`,
  );
});

test(unitTest('STRICT-MODE: Invalid association property'), async () => {
  await expect(() =>
    TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__InvalidAssociationProperty as Entity[],
      {
        strict: true,
      },
    ),
  ).rejects.toThrowError(
    `Found system class property 'meta::pure::tds::TabularDataSet' in association 'test::association'`,
  );
});

test(
  unitTest('UnknownElement has no classifier path mapping available'),
  async () => {
    await TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__UnknownElement as Entity[],
      {
        strict: true,
      },
    );

    await expect(async () =>
      graphManagerState.graph.allOwnElements.map((element) =>
        graphManagerState.graphManager.elementToEntity(element),
      ),
    ).rejects.toThrowError(
      `Can't get classifier path for element 'unknownElement::3bbdf0a0_b0d5_11ee_84b2_efcc77532342': no classifier path mapping available`,
    );
  },
);

test(unitTest('Duplicated elementxx'), async () => {
  guaranteeNonNullable(
    TEST_DATA__DATAPRODUCT__INCLUDE[2],
  ).content.includedStoreSpecifications = [];
  await expect(() =>
    TEST__buildGraphWithEntities(
      graphManagerState,
      TEST_DATA__DATAPRODUCT__INCLUDE as Entity[],
      {
        strict: true,
      },
    ),
  ).rejects.toThrowError(`Can't find database my::lakehouse::FirmIngest`);
});
