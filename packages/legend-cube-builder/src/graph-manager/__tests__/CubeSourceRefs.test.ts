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
  CubeDocument,
  DataProductAccessPointSource,
  Filter,
  IngestDatasetSource,
  type ModelContext,
  Query,
  type QueryNode,
  RelationalTableSource,
} from '@finos/legend-cube';
import { createCubeDirectModel } from '../CubeDirectConnection.js';
import { createCubeProjectModel } from '../CubeProject.js';
import { CubeSourceRef } from '../CubeStore.js';
import { getCubeSourceRefs } from '../CubeSourceRefs.js';

const TEXT_MODEL = { _type: 'text', code: '' } as unknown as ModelContext;

const table = (id: string, schema: string, name: string): QueryNode =>
  RelationalTableSource.fromCoordinates(id, {
    database: 'showcase::northwind::store::NorthwindDatabase',
    schema,
    table: name,
  });

const documentOf = (
  model: ModelContext | undefined,
  nodes: readonly QueryNode[],
): CubeDocument =>
  new CubeDocument({
    context: model ? { model } : undefined,
    query: new Query(nodes, [], nodes[0]?.id),
  });

describe('The sources a saved cube reads', () => {
  test('Lists each table once, in the query’s order, with no project for a text model', () => {
    expect(
      getCubeSourceRefs(
        documentOf(TEXT_MODEL, [
          table('relational101', 'NORTHWIND', 'ORDERS'),
          new Filter('filter101'),
          table('relational102', 'NORTHWIND', 'CUSTOMERS'),
          table('relational103', 'NORTHWIND', 'ORDERS'),
        ]),
      ),
    ).toEqual([
      new CubeSourceRef(
        'table',
        'showcase::northwind::store::NorthwindDatabase',
        'NORTHWIND.ORDERS',
      ),
      new CubeSourceRef(
        'table',
        'showcase::northwind::store::NorthwindDatabase',
        'NORTHWIND.CUSTOMERS',
      ),
    ]);
  });

  test("Names a Depot model's project, without its version", () => {
    const model = createCubeProjectModel({
      groupId: 'org.finos.legend.cube.samples',
      artifactId: 'cube-sales',
      versionId: '1.0.0',
    });
    expect(
      getCubeSourceRefs(documentOf(model, [table('relational101', 'S', 'T')])),
    ).toEqual([
      new CubeSourceRef(
        'table',
        'showcase::northwind::store::NorthwindDatabase',
        'S.T',
        'org.finos.legend.cube.samples:cube-sales',
      ),
    ]);
  });

  test("Leaves out a direct connection's tables", () => {
    const model = createCubeDirectModel({
      _type: 'RelationalDatabaseConnection',
    } as unknown as Parameters<typeof createCubeDirectModel>[0]);
    expect(
      getCubeSourceRefs(documentOf(model, [table('relational101', 'S', 'T')])),
    ).toEqual([]);
  });

  test('Lists data product access points and ingest data sets', () => {
    const accessPoint = DataProductAccessPointSource.fromCoordinates(
      'dataProductAccessPoint101',
      {
        dataProduct: 'sales::SalesProduct',
        accessPointGroup: 'group1',
        accessPoint: 'orders',
        dataProductId: 'SALES',
        deploymentId: '123',
      },
    );
    const dataSet = IngestDatasetSource.fromCoordinates('ingestDataset101', {
      ingestDefinitionUrn: 'urn:ingest:1',
      ingestDefinition: 'sales::SalesIngest',
      dataSet: 'TRADES',
    });
    expect(getCubeSourceRefs(documentOf(undefined, [accessPoint]))).toEqual([
      new CubeSourceRef(
        'dataProductAccessPoint',
        'sales::SalesProduct',
        'orders',
      ),
    ]);
    expect(getCubeSourceRefs(documentOf(undefined, [dataSet]))).toEqual([
      new CubeSourceRef('ingestDataSet', 'sales::SalesIngest', 'TRADES'),
    ]);
  });

  test('Lists nothing for an empty cube', () => {
    expect(getCubeSourceRefs(new CubeDocument())).toEqual([]);
  });
});
