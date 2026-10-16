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
  dataProductAccessor,
  lambda,
  type IR,
  type ModelContext,
  type Schema,
} from '@finos/legend-cube';
import {
  createCubeDataProductModel,
  CubeAccessPoint,
  CubeAccessPointGroup,
  CubeDataProductCandidate,
  CubeDataProductDescription,
  CubeDataProductEnvironmentType,
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeAccessPointLocation,
  type CubeDataProductCatalog,
  type CubeDataProductProject,
  type CubeEngine,
  type NodeId,
} from '@finos/legend-cube-builder';
import { LakehouseAccessPoint, type DataProduct } from '@finos/legend-graph';
import type { EditorStore } from '../EditorStore.js';
import {
  LEGEND_STUDIO_CUBE_WORKSPACE_VERSION,
  type LegendStudioCubeWorkspace,
} from './LegendStudioCubeWorkspace.js';

// Legend Cube in Studio: a cube reads the data products of the project being
// edited, as the workspace holds them, never the platform's deployed ones.
// Their lakehouse access points are typed by Cube's engine on the workspace,
// as Studio types them for its own queries, and run in the lakehouse
// environment of the class the viewer picks (`LegendStudioCubeWorkspace`).

/**
 * The classes a Studio cube's data product runs read, the default first:
 * production parallel, as the workspace isn't released (user, 2026-10-16)
 */
const STUDIO_CUBE_DATA_PRODUCT_CLASSES = [
  CubeDataProductEnvironmentType.PRODUCTION_PARALLEL,
  CubeDataProductEnvironmentType.PRODUCTION,
];

/** The deployment a workspace data product is picked from: none yet */
const NO_DEPLOYMENT_ID = '0';

export const LEGEND_STUDIO_CUBE_DATA_PRODUCT_MESSAGE = {
  GONE: (dataProduct: string): string =>
    `The project has no data product ${dataProduct} any more.`,
  NOT_LAKEHOUSE: 'Cube reads lakehouse access points only',
  NO_ACCESS_POINT: (accessPoint: string, dataProduct: string): string =>
    `Data product ${dataProduct} has no lakehouse access point "${accessPoint}".`,
};

const keyOf = (group: string, accessPoint: string): string =>
  `${group}\u0000${accessPoint}`;

/** The lambda that types an access point: `{| #P{dataProduct.accessPoint}#}` */
const typingLambdaOf = (dataProduct: string, accessPoint: string): IR =>
  lambda([], [dataProductAccessor([dataProduct, accessPoint])]);

/**
 * The project's own data products, for the Data Product tab and for
 * re-checking saved sources. Their access points are typed by the engine, a
 * product's in one call, on the workspace
 */
export class LegendStudioCubeDataProductCatalog
  implements CubeDataProductCatalog
{
  readonly environmentTypes = STUDIO_CUBE_DATA_PRODUCT_CLASSES;
  readonly editorStore: EditorStore;
  readonly workspace: LegendStudioCubeWorkspace;
  private readonly engine: CubeEngine;

  constructor(
    editorStore: EditorStore,
    workspace: LegendStudioCubeWorkspace,
    engine: CubeEngine,
  ) {
    this.editorStore = editorStore;
    this.workspace = workspace;
    this.engine = engine;
  }

  /** The project's own data products, not its dependencies' */
  private get dataProducts(): DataProduct[] {
    return this.editorStore.graphManagerState.graph.ownDataProducts;
  }

  /** The model a cube of the workspace's data products of a class names */
  private modelOf(
    environmentType: CubeDataProductEnvironmentType,
  ): ModelContext {
    return createCubeDataProductModel({
      ...this.workspace.project,
      versionId: LEGEND_STUDIO_CUBE_WORKSPACE_VERSION,
      environmentType,
    });
  }

  private candidateOf(
    dataProduct: DataProduct,
    environmentType: CubeDataProductEnvironmentType,
  ): CubeDataProductCandidate {
    return new CubeDataProductCandidate({
      id: dataProduct.path,
      deploymentId: NO_DEPLOYMENT_ID,
      dataProductPath: dataProduct.path,
      title: dataProduct.title ?? dataProduct.name,
      description: dataProduct.description,
      ...this.workspace.project,
      versionId: LEGEND_STUDIO_CUBE_WORKSPACE_VERSION,
      environmentType,
    });
  }

  private dataProductOf(path: string): DataProduct {
    const dataProduct = this.dataProducts.find((each) => each.path === path);
    if (!dataProduct) {
      throw new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        LEGEND_STUDIO_CUBE_DATA_PRODUCT_MESSAGE.GONE(path),
      );
    }
    return dataProduct;
  }

  /** Every data product of the project, in the class asked for; the tab matches the text itself */
  async search(search: {
    readonly text?: string;
    readonly environmentType: CubeDataProductEnvironmentType;
  }): Promise<readonly CubeDataProductCandidate[]> {
    return this.dataProducts.map((each) =>
      this.candidateOf(each, search.environmentType),
    );
  }

  /** A product's access point groups, its lakehouse access points typed on the workspace */
  async describe(
    candidate: CubeDataProductCandidate,
  ): Promise<CubeDataProductDescription> {
    const dataProduct = this.dataProductOf(candidate.dataProductPath);
    const lambdas = new Map<NodeId, IR>();
    dataProduct.accessPointGroups.forEach((group) =>
      group.accessPoints
        .filter((point) => point instanceof LakehouseAccessPoint)
        .forEach((point) =>
          lambdas.set(
            keyOf(group.id, point.id),
            typingLambdaOf(dataProduct.path, point.id),
          ),
        ),
    );
    const schemas = lambdas.size
      ? await this.engine.typeLambdas(
          this.modelOf(candidate.environmentType),
          lambdas,
        )
      : new Map<NodeId, Schema | CubeEngineError>();
    return new CubeDataProductDescription(
      candidate,
      dataProduct.accessPointGroups
        .filter((group) => group.accessPoints.length > 0)
        .map(
          (group) =>
            new CubeAccessPointGroup({
              id: group.id,
              title: group.title,
              accessPoints: group.accessPoints.map((point) => {
                const typed = schemas.get(keyOf(group.id, point.id));
                return new CubeAccessPoint({
                  id: point.id,
                  title: point.title,
                  description: point.description,
                  schema: typed instanceof CubeEngineError ? undefined : typed,
                  disabledReason:
                    point instanceof LakehouseAccessPoint
                      ? typed instanceof CubeEngineError
                        ? typed.firstLine
                        : undefined
                      : LEGEND_STUDIO_CUBE_DATA_PRODUCT_MESSAGE.NOT_LAKEHOUSE,
                });
              }),
            }),
        ),
    );
  }

  /** The saved sources' schemas, typed on the workspace in one call */
  async resolveSchemas(
    project: CubeDataProductProject,
    sources: ReadonlyMap<NodeId, CubeAccessPointLocation>,
  ): Promise<Map<NodeId, Schema | CubeEngineError>> {
    const resolved = new Map<NodeId, Schema | CubeEngineError>();
    const lambdas = new Map<NodeId, IR>();
    sources.forEach((source, nodeId) => {
      const point = this.dataProducts
        .find((each) => each.path === source.dataProduct)
        ?.accessPointGroups.find(
          (group) => group.id === source.accessPointGroup,
        )
        ?.accessPoints.find((each) => each.id === source.accessPoint);
      if (point instanceof LakehouseAccessPoint) {
        lambdas.set(
          nodeId,
          typingLambdaOf(source.dataProduct, source.accessPoint),
        );
      } else {
        resolved.set(
          nodeId,
          new CubeEngineError(
            CubeEngineErrorKind.COMPILE,
            LEGEND_STUDIO_CUBE_DATA_PRODUCT_MESSAGE.NO_ACCESS_POINT(
              source.accessPoint,
              source.dataProduct,
            ),
            nodeId,
          ),
        );
      }
    });
    if (lambdas.size) {
      (
        await this.engine.typeLambdas(
          createCubeDataProductModel(project),
          lambdas,
        )
      ).forEach((schema, nodeId) => resolved.set(nodeId, schema));
    }
    // in the order the sources were given
    return new Map(
      [...sources.keys()].map((nodeId) => [
        nodeId,
        resolved.get(nodeId) as Schema | CubeEngineError,
      ]),
    );
  }

  /** No marketplace: a workspace data product has no page there yet */
  getMarketplaceLink(): string | undefined {
    return undefined;
  }
}
