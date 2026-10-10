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
import type { CubeDataProductEnvironmentType } from './CubeDataProduct.js';
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

/** The viewer's ingest environment for a class: shown in the Ingest tab, never saved */
export class CubeIngestEnvironment {
  readonly environmentType: CubeDataProductEnvironmentType;
  /** The environment's name, as the platform lists it */
  readonly name: string;
  /** The environment a run's lakehouse runtime names */
  readonly runtimeEnvironment: string;

  constructor(fields: {
    environmentType: CubeDataProductEnvironmentType;
    name: string;
    runtimeEnvironment: string;
  }) {
    this.environmentType = fields.environmentType;
    this.name = fields.name;
    this.runtimeEnvironment = fields.runtimeEnvironment;
  }
}

/** A producer deployment of the viewer's ingest environment */
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

  constructor(fields: {
    urn: string;
    definition: string;
    groupId: string;
    artifactId: string;
  }) {
    this.urn = fields.urn;
    this.definition = fields.definition;
    this.groupId = fields.groupId;
    this.artifactId = fields.artifactId;
  }

  /** The definition's element name: the last segment of its path */
  get name(): string {
    const index = this.definition.lastIndexOf('::');
    return index < 0 ? this.definition : this.definition.slice(index + 2);
  }
}

/** A producer deployment's definitions: those Cube reads, and how many it left out */
export interface CubeIngestDefinitionList {
  readonly candidates: readonly CubeIngestDefinitionCandidate[];
  /** Definitions not deployed from SDLC, or deployed to another class */
  readonly droppedCount: number;
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

  /** The viewer's ingest environment for a class */
  resolveEnvironment(
    environmentType: CubeDataProductEnvironmentType,
  ): Promise<CubeIngestEnvironment>;

  /** The producer deployments of the viewer's ingest environment for a class */
  listProducers(
    environmentType: CubeDataProductEnvironmentType,
  ): Promise<readonly CubeIngestProducer[]>;

  /** A producer deployment's SDLC-deployed definitions of the class */
  listDefinitions(
    environmentType: CubeDataProductEnvironmentType,
    producerDeploymentId: string,
  ): Promise<CubeIngestDefinitionList>;

  /**
   * A definition's data sets, typed from what it declares. `fresh` reads the
   * definition again rather than what this page visit read
   */
  describe(
    urn: string,
    environmentType: CubeDataProductEnvironmentType,
    options?: { readonly fresh?: boolean | undefined },
  ): Promise<readonly CubeIngestDataSet[]>;

  /**
   * The schema of each saved source, from its definition as deployed: one
   * entry per key, failures included. `fresh` reads the definitions again
   */
  resolveSchemas(
    environmentType: CubeDataProductEnvironmentType,
    sources: ReadonlyMap<NodeId, CubeIngestDataSetLocation>,
    options?: { readonly fresh?: boolean | undefined },
  ): Promise<Map<NodeId, Schema | CubeEngineError>>;
}
