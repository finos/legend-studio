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
import { flowResult } from 'mobx';
import {
  AccessPointGroup,
  CompilationError,
  DataProduct,
  EngineError,
  LakehouseAccessPoint,
  LakehouseTargetEnv,
  Multiplicity,
  RawLambda,
  RelationElement,
  RelationElementsData,
  RelationTypeColumnMetadata,
  RelationTypeMetadata,
} from '@finos/legend-graph';
import { guaranteeType } from '@finos/legend-shared';
import { createSpy, unitTest } from '@finos/legend-shared/test';
import { TEST__getTestEditorStore } from '../../../../__test-utils__/EditorStoreTestUtils.js';
import {
  DataProductEditorState,
  LakehouseAccessPointState,
} from '../DataProductEditorState.js';

const ACCESS_POINT_ID = 'customer_demographics';
const ENGINE_ERROR_MESSAGE =
  "Can't find table 'NOPE' in schema 'NORTHWIND' and database 'NorthwindDatabase'";

const buildRelationType = (columnNames: string[]): RelationTypeMetadata => {
  const relationType = new RelationTypeMetadata();
  relationType.columns = columnNames.map(
    (name) => new RelationTypeColumnMetadata('String', name, Multiplicity.ONE),
  );
  return relationType;
};

// a data product with one Lakehouse access point that has sample values, which
// is what makes the editor compute the access point's relation columns
const setup = () => {
  const editorStore = TEST__getTestEditorStore();
  const dataProduct = new DataProduct('sampleDataProduct');
  const group = new AccessPointGroup();
  group.id = 'GROUP1';
  const accessPoint = new LakehouseAccessPoint(
    ACCESS_POINT_ID,
    LakehouseTargetEnv.Snowflake,
    new RawLambda(undefined, [{ _type: 'integer', value: 1 }]),
    group,
  );
  group.accessPoints = [accessPoint];
  dataProduct.accessPointGroups = [group];
  const relationElement = new RelationElement();
  relationElement.paths = [ACCESS_POINT_ID];
  relationElement.columns = ['id'];
  const sampleValues = new RelationElementsData();
  sampleValues.relationElements = [relationElement];
  dataProduct.sampleValues = [sampleValues];

  const editorState = new DataProductEditorState(editorStore, dataProduct);
  const accessPointState = guaranteeType(
    editorState.accessPointGroupStates[0]?.accessPointStates[0],
    LakehouseAccessPointState,
  );
  const graphManager = editorStore.graphManagerState.graphManager;
  const logErrorSpy = createSpy(
    editorStore.applicationStore.logService,
    'error',
  ).mockImplementation(() => undefined);
  const getLambdaRelationTypeSpy = createSpy(
    graphManager,
    'getLambdaRelationType',
  ).mockResolvedValue(buildRelationType(['id']));
  return {
    editorState,
    accessPointState,
    lambdaHash: accessPoint.func.hashCode,
    graphManager,
    logErrorSpy,
    getLambdaRelationTypeSpy,
  };
};

describe(unitTest('Data product access point relation columns'), () => {
  test('batch: a relation type for the access point sets its columns and records the lambda', async () => {
    const { editorState, accessPointState, lambdaHash, graphManager } = setup();
    createSpy(graphManager, 'getBatchLambdasRelationType').mockResolvedValue({
      results: new Map([[accessPointState.uuid, buildRelationType(['id'])]]),
      errors: new Map(),
    });

    await flowResult(
      editorState.batchUpdateLambdaRelationColumns([accessPointState]),
    );

    expect(accessPointState.lambdaState.lambdaRelationColumns).toEqual(['id']);
    expect(accessPointState.lambdaState.lastComputedLambdaHash).toBe(
      lambdaHash,
    );
    expect(accessPointState.hasRelationElementMismatch).toBe(false);
  });

  test('batch: a failed call leaves the lambda unrecorded, so a later single update asks the engine again', async () => {
    const {
      editorState,
      accessPointState,
      lambdaHash,
      graphManager,
      logErrorSpy,
      getLambdaRelationTypeSpy,
    } = setup();
    createSpy(graphManager, 'getBatchLambdasRelationType').mockRejectedValue(
      new Error('Engine is unavailable'),
    );

    await flowResult(
      editorState.batchUpdateLambdaRelationColumns([accessPointState]),
    );

    expect(accessPointState.lambdaState.lastComputedLambdaHash).toBeUndefined();
    expect(accessPointState.lambdaState.lambdaRelationColumns).toBeUndefined();
    expect(logErrorSpy).toHaveBeenCalled();

    await flowResult(
      accessPointState.lambdaState.updateLambdaRelationColumns(),
    );

    expect(getLambdaRelationTypeSpy).toHaveBeenCalledTimes(1);
    expect(accessPointState.lambdaState.lambdaRelationColumns).toEqual(['id']);
    expect(accessPointState.lambdaState.lastComputedLambdaHash).toBe(
      lambdaHash,
    );
    expect(accessPointState.hasRelationElementMismatch).toBe(false);
  });

  test('batch: an engine error for the access point counts as an answer and is shown', async () => {
    const {
      editorState,
      accessPointState,
      lambdaHash,
      graphManager,
      getLambdaRelationTypeSpy,
    } = setup();
    createSpy(graphManager, 'getBatchLambdasRelationType').mockResolvedValue({
      results: new Map(),
      errors: new Map([
        [accessPointState.uuid, new EngineError(ENGINE_ERROR_MESSAGE)],
      ]),
    });

    await flowResult(
      editorState.batchUpdateLambdaRelationColumns([accessPointState]),
    );

    expect(accessPointState.lambdaState.lambdaRelationColumns).toBeUndefined();
    expect(accessPointState.lambdaState.lastComputedLambdaHash).toBe(
      lambdaHash,
    );
    expect(accessPointState.hasRelationElementMismatch).toBe(true);
    expect(accessPointState.getRelationElementMismatchMessage()).toBe(
      `Fix compiler errors and make sure AccessPoint ${ACCESS_POINT_ID} returns a Relation type. Engine error: ${ENGINE_ERROR_MESSAGE}`,
    );

    // the engine already answered for this lambda
    await flowResult(
      accessPointState.lambdaState.updateLambdaRelationColumns(),
    );
    expect(getLambdaRelationTypeSpy).not.toHaveBeenCalled();
  });

  test('batch: an access point the engine did not answer for is left unrecorded', async () => {
    const { editorState, accessPointState, graphManager, logErrorSpy } =
      setup();
    createSpy(graphManager, 'getBatchLambdasRelationType').mockResolvedValue({
      results: new Map(),
      errors: new Map(),
    });

    await flowResult(
      editorState.batchUpdateLambdaRelationColumns([accessPointState]),
    );

    expect(accessPointState.lambdaState.lambdaRelationColumns).toBeUndefined();
    expect(accessPointState.lambdaState.lastComputedLambdaHash).toBeUndefined();
    expect(logErrorSpy).toHaveBeenCalled();
  });

  test('single: a failed call leaves the lambda unrecorded, so the next update asks the engine again', async () => {
    const {
      accessPointState,
      lambdaHash,
      logErrorSpy,
      getLambdaRelationTypeSpy,
    } = setup();
    getLambdaRelationTypeSpy.mockRejectedValueOnce(
      new Error('Engine is unavailable'),
    );

    await flowResult(
      accessPointState.lambdaState.updateLambdaRelationColumns(),
    );

    expect(accessPointState.lambdaState.lambdaRelationColumns).toBeUndefined();
    expect(accessPointState.lambdaState.lastComputedLambdaHash).toBeUndefined();
    expect(logErrorSpy).toHaveBeenCalled();

    await flowResult(
      accessPointState.lambdaState.updateLambdaRelationColumns(),
    );

    expect(getLambdaRelationTypeSpy).toHaveBeenCalledTimes(2);
    expect(accessPointState.lambdaState.lambdaRelationColumns).toEqual(['id']);
    expect(accessPointState.lambdaState.lastComputedLambdaHash).toBe(
      lambdaHash,
    );
  });

  test('single: a compilation error counts as an answer and is shown', async () => {
    const { accessPointState, lambdaHash, getLambdaRelationTypeSpy } = setup();
    getLambdaRelationTypeSpy.mockRejectedValue(
      new CompilationError(ENGINE_ERROR_MESSAGE),
    );

    await flowResult(
      accessPointState.lambdaState.updateLambdaRelationColumns(),
    );
    await flowResult(
      accessPointState.lambdaState.updateLambdaRelationColumns(),
    );

    expect(getLambdaRelationTypeSpy).toHaveBeenCalledTimes(1);
    expect(accessPointState.lambdaState.lastComputedLambdaHash).toBe(
      lambdaHash,
    );
    expect(accessPointState.getRelationElementMismatchMessage()).toBe(
      `Fix compiler errors and make sure AccessPoint ${ACCESS_POINT_ID} returns a Relation type. Engine error: ${ENGINE_ERROR_MESSAGE}`,
    );
  });
});
