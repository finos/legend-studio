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

import type { ModelContext, Schema } from '@finos/legend-cube';
import type { PlainObject } from '@finos/legend-shared';
import {
  type CubeDataProductEnvironmentType,
  type CubeDataProductProject,
  getCubeDataProductProject,
} from './CubeDataProduct.js';
import {
  type CubeIngestSettings,
  getCubeIngestSettings,
} from './CubeIngest.js';
import type { CubeEngineError, NodeId } from './CubeEngine.js';

// The deployed ingest definitions of a host's lakehouse (PLAN §6.7), as Data
// Cube's producer source lists them: the viewer's ingest environment for a
// class, its producer deployments, a deployment's SDLC-deployed definitions,
// and a definition's data sets

/** A data set of a deployed ingest definition, as the definition declares it */
export class CubeIngestDataSet {
  readonly name: string;
  /** Its columns: the declared ones, then the milestoning ones of its write mode; none when they can't be read */
  readonly schema: Schema | undefined;
  /** Why it can't be picked, e.g. it is a materialized view; none when it can */
  readonly disabledReason: string | undefined;
  readonly primaryKey: readonly string[];

  constructor(fields: {
    name: string;
    schema?: Schema | undefined;
    disabledReason?: string | undefined;
    primaryKey?: readonly string[];
  }) {
    this.name = fields.name;
    this.schema = fields.schema;
    this.disabledReason = fields.disabledReason;
    this.primaryKey = fields.primaryKey ?? [];
  }

  get isPickable(): boolean {
    return this.disabledReason === undefined && this.schema !== undefined;
  }
}

/**
 * An ingest environment, by its class and its name: none for the viewer's
 * own environment of the class
 */
export interface CubeIngestEnvironmentKey {
  readonly environmentType: CubeDataProductEnvironmentType;
  readonly name?: string | undefined;
}

/** The ingest environment a cube's settings name: the viewer's own of the class when they name none */
export const getCubeIngestEnvironmentKey = (
  settings: Pick<CubeIngestSettings, 'environmentType' | 'environment'>,
): CubeIngestEnvironmentKey => ({
  environmentType: settings.environmentType,
  name: settings.environment,
});

/**
 * The ingest environment a cube's model reads its data sets in: an ingest
 * cube's own; for a data product cube, which reads ingest data sets too on a
 * host that runs them together (PLAN §11.30), the viewer's own of its class.
 * None for any other model, or one Cube can't use
 */
export const getCubeIngestEnvironmentKeyOfModel = (
  model: ModelContext,
): CubeIngestEnvironmentKey | undefined => {
  const settings = getCubeIngestSettings(model);
  if (settings) {
    return getCubeIngestEnvironmentKey(settings);
  }
  const project = getCubeDataProductProject(model);
  return project ? { environmentType: project.environmentType } : undefined;
};

/** An ingest environment of the platform, as the Ingest tab lists it; a cube saves its name and class */
export class CubeIngestEnvironment implements CubeIngestEnvironmentKey {
  readonly environmentType: CubeDataProductEnvironmentType;
  /** The environment's name, as the platform lists it */
  readonly name: string;
  /** The environment a run's lakehouse runtime names */
  readonly runtimeEnvironment: string;
  /**
   * The warehouse a new cube starts with, when the environment has one, e.g.
   * the runtime of a Studio project; else the one the viewer last picked
   */
  readonly warehouse: string | undefined;

  constructor(fields: {
    environmentType: CubeDataProductEnvironmentType;
    name: string;
    runtimeEnvironment: string;
    warehouse?: string | undefined;
  }) {
    this.environmentType = fields.environmentType;
    this.name = fields.name;
    this.runtimeEnvironment = fields.runtimeEnvironment;
    this.warehouse = fields.warehouse;
  }
}

/** A producer deployment of an ingest environment */
export class CubeIngestProducer {
  /** Its deployment id, as text */
  readonly deploymentId: string;
  readonly urn: string;

  constructor(fields: { deploymentId: string; urn: string }) {
    this.deploymentId = fields.deploymentId;
    this.urn = fields.urn;
  }
}

/** A definition a producer deployment deployed from SDLC */
export class CubeIngestDefinitionCandidate {
  readonly urn: string;
  /** The IngestDefinition element's path */
  readonly definition: string;
  readonly groupId: string;
  readonly artifactId: string;
  /**
   * Why it can't be opened, e.g. the data product version a cube reads
   * doesn't have it (PLAN §11.30); none when it can
   */
  readonly disabledReason: string | undefined;

  constructor(fields: {
    urn: string;
    definition: string;
    groupId: string;
    artifactId: string;
    disabledReason?: string | undefined;
  }) {
    this.urn = fields.urn;
    this.definition = fields.definition;
    this.groupId = fields.groupId;
    this.artifactId = fields.artifactId;
    this.disabledReason = fields.disabledReason;
  }

  /** The definition's element name: the last segment of its path */
  get name(): string {
    const index = this.definition.lastIndexOf('::');
    return index < 0 ? this.definition : this.definition.slice(index + 2);
  }

  get isPickable(): boolean {
    return this.disabledReason === undefined;
  }
}

/** A producer deployment's definitions: those Cube reads, and how many it left out */
export interface CubeIngestDefinitionList {
  readonly candidates: readonly CubeIngestDefinitionCandidate[];
  /**
   * Definitions not deployed from SDLC, or deployed to another class; for a
   * data product's project, those of other projects too
   */
  readonly droppedCount: number;
}

/**
 * What a data product cube's ingest data sets are read as (PLAN §11.30):
 * the cube's project at its version, which its runs compile against
 */
export interface CubeIngestReadOptions {
  /** Reads the definitions again rather than what this page visit read */
  readonly fresh?: boolean | undefined;
  /**
   * A data product cube's project: its data sets' columns are those of the
   * project's definitions at its version, and one the version lacks can't
   * be picked, saying so. A host whose project is the definitions it lists,
   * e.g. Studio's workspace, reads them as it always does
   */
  readonly project?: CubeDataProductProject | undefined;
}

/** Where a saved ingest source's data set is */
export interface CubeIngestDataSetLocation {
  readonly ingestDefinitionUrn: string;
  readonly ingestDefinition: string;
  readonly dataSet: string;
}

/**
 * The deployed ingest definitions, for the source dialog and for re-checking
 * saved sources: its own port, so hosts without them need none. Calls fail
 * with a `CubeEngineError`: with no node for listing and describing, with
 * the node's id for schemas
 */
export interface CubeIngestCatalog {
  /** The classes the host lists, the default first */
  readonly environmentTypes: readonly CubeDataProductEnvironmentType[];

  /** Every ingest environment of the classes the host lists, for the viewer to pick one */
  listEnvironments(): Promise<readonly CubeIngestEnvironment[]>;

  /** An ingest environment: the one named, else the viewer's own of the class, which the Ingest tab starts on */
  resolveEnvironment(
    environment: CubeIngestEnvironmentKey,
  ): Promise<CubeIngestEnvironment>;

  /** The producer deployments of an ingest environment */
  listProducers(
    environment: CubeIngestEnvironmentKey,
  ): Promise<readonly CubeIngestProducer[]>;

  /**
   * The names of producer deployments, by deployment id, from the host's
   * deployment directory: none for an id it doesn't know. Only the Ingest
   * tab reads them, to label its producers; hosts without a directory leave
   * it out, and producers show their ids alone
   */
  getProducerNames?(
    deploymentIds: readonly string[],
  ): Promise<ReadonlyMap<string, string>>;

  /** A producer deployment's SDLC-deployed definitions of the environment's class */
  listDefinitions(
    environment: CubeIngestEnvironmentKey,
    producerDeploymentId: string,
  ): Promise<CubeIngestDefinitionList>;

  /**
   * The definitions a data product cube of the project can read alongside
   * its access points (PLAN §11.30): the project's own, deployed from SDLC
   * in the viewer's own environment of the project's class, as the project
   * has them at its version; one the version lacks is listed, but can't be
   * opened. The deployment is the cube's data products', which deploys
   * their project's definitions; none when the cube has no access point
   * left. A host without it keeps data products and ingest data sets apart
   */
  listProjectDefinitions?(
    project: CubeDataProductProject,
    deploymentId: string | undefined,
  ): Promise<CubeIngestDefinitionList>;

  /**
   * A definition's data sets, typed from what it declares; a data product
   * cube's as its project has them at its version
   */
  describe(
    urn: string,
    environment: CubeIngestEnvironmentKey,
    options?: CubeIngestReadOptions,
  ): Promise<readonly CubeIngestDataSet[]>;

  /**
   * The schema of each saved source, from its definition as deployed, or a
   * data product cube's as its project has it at its version: one entry per
   * key, failures included
   */
  resolveSchemas(
    environment: CubeIngestEnvironmentKey,
    sources: ReadonlyMap<NodeId, CubeIngestDataSetLocation>,
    options?: CubeIngestReadOptions,
  ): Promise<Map<NodeId, Schema | CubeEngineError>>;
}

/**
 * Where an ingest cube's engine reads the definitions it types and runs on,
 * as protocol JSON, by URN, and the environment a run's lakehouse runtime
 * names: the ingest servers for the deployed ones, or the host's own, e.g.
 * Studio's workspace. Calls fail with a `CubeEngineError`
 */
export interface CubeIngestDefinitionSource {
  /** A definition's element, as protocol JSON, by its URN, in the cube's ingest environment */
  getDefinitionElement(
    urn: string,
    environment: CubeIngestEnvironmentKey,
  ): Promise<PlainObject>;
  /** The environment a run's lakehouse runtime names, for the cube's ingest environment */
  getRuntimeEnvironment(environment: CubeIngestEnvironmentKey): Promise<string>;
  /**
   * Every element a typing's or a run's model holds, as protocol JSON, when
   * the host has more than the definitions, e.g. Studio's whole workspace,
   * whose definitions' materialized views read other elements; the
   * definitions alone otherwise
   */
  getModelElements?(): Promise<readonly PlainObject[]>;
}
