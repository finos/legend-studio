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
import {
  type CubeDataProductEnvironmentType,
  type CubeDataProductProject,
  isCubeSnapshotVersion,
} from './CubeDataProduct.js';
import type { CubeEngineError, CubeResultValue, NodeId } from './CubeEngine.js';

// The deployed data products a cube can read (PLAN §6.8), in Cube's own
// terms: what the catalog lists, what a product's deployed artifact says of
// its access points, and the schemas of saved sources. The host's
// implementation reads the marketplace or the lakehouse's lists, the depot
// and the artifacts; nothing here names their wire classes

/** A deployed data product the catalog lists, at the version it was deployed from */
export class CubeDataProductCandidate {
  /** The catalog's id for the product, which its links use */
  readonly id: string;
  /** The deployment, as text */
  readonly deploymentId: string;
  /** The path of its DataProduct element */
  readonly dataProductPath: string;
  readonly title: string;
  readonly description: string | undefined;
  readonly groupId: string;
  readonly artifactId: string;
  /** The version it was deployed from, as the catalog gave it, snapshots included */
  readonly versionId: string;
  readonly environmentType: CubeDataProductEnvironmentType;
  /** The producer's environment, for display */
  readonly producerEnvironmentName: string | undefined;

  constructor(fields: {
    id: string;
    deploymentId: string;
    dataProductPath: string;
    title: string;
    description?: string | undefined;
    groupId: string;
    artifactId: string;
    versionId: string;
    environmentType: CubeDataProductEnvironmentType;
    producerEnvironmentName?: string | undefined;
  }) {
    this.id = fields.id;
    this.deploymentId = fields.deploymentId;
    this.dataProductPath = fields.dataProductPath;
    this.title = fields.title;
    this.description = fields.description;
    this.groupId = fields.groupId;
    this.artifactId = fields.artifactId;
    this.versionId = fields.versionId;
    this.environmentType = fields.environmentType;
    this.producerEnvironmentName = fields.producerEnvironmentName;
  }

  /** Whether it was deployed from a moving version, whose data may change under a cube */
  get isSnapshot(): boolean {
    return isCubeSnapshotVersion(this.versionId);
  }
}

/** An access point of a deployed product, as its artifact describes it */
export class CubeAccessPoint {
  readonly id: string;
  readonly title: string | undefined;
  readonly description: string | undefined;
  /** Its columns, as the artifact types them; none when it can't be read */
  readonly schema: Schema | undefined;
  /** Why it can't be picked, e.g. it takes parameters; none when it can */
  readonly disabledReason: string | undefined;
  /** A few rows the artifact holds, by the schema's columns */
  readonly sampleRows: readonly (readonly CubeResultValue[])[];

  constructor(fields: {
    id: string;
    title?: string | undefined;
    description?: string | undefined;
    schema?: Schema | undefined;
    disabledReason?: string | undefined;
    sampleRows?: readonly (readonly CubeResultValue[])[];
  }) {
    this.id = fields.id;
    this.title = fields.title;
    this.description = fields.description;
    this.schema = fields.schema;
    this.disabledReason = fields.disabledReason;
    this.sampleRows = fields.sampleRows ?? [];
  }

  get isPickable(): boolean {
    return this.disabledReason === undefined && this.schema !== undefined;
  }
}

export class CubeAccessPointGroup {
  readonly id: string;
  readonly title: string | undefined;
  readonly accessPoints: readonly CubeAccessPoint[];
  /** Open to everyone in the organization, as the host's marketplace marks such groups */
  readonly isEnterprise: boolean;

  constructor(fields: {
    id: string;
    title?: string | undefined;
    accessPoints: readonly CubeAccessPoint[];
    isEnterprise?: boolean | undefined;
  }) {
    this.id = fields.id;
    this.title = fields.title;
    this.accessPoints = fields.accessPoints;
    this.isEnterprise = fields.isEnterprise ?? false;
  }
}

/**
 * The viewer's access to an access point group, as the marketplace shows
 * it: open to everyone, granted, on its way through approval, refused, or
 * never asked for
 */
export enum CubeAccessPointGroupAccess {
  ENTERPRISE = 'ENTERPRISE',
  APPROVED = 'APPROVED',
  SUBMITTED_FOR_APPROVALS = 'SUBMITTED_FOR_APPROVALS',
  PENDING_MANAGER_APPROVAL = 'PENDING_MANAGER_APPROVAL',
  PENDING_DATA_OWNER_APPROVAL = 'PENDING_DATA_OWNER_APPROVAL',
  DENIED = 'DENIED',
  NO_ACCESS = 'NO_ACCESS',
}

/** A deployed product's access points, by group */
export class CubeDataProductDescription {
  readonly candidate: CubeDataProductCandidate;
  readonly groups: readonly CubeAccessPointGroup[];

  constructor(
    candidate: CubeDataProductCandidate,
    groups: readonly CubeAccessPointGroup[],
  ) {
    this.candidate = candidate;
    this.groups = groups;
  }
}

/** Where a saved source's access point is */
export interface CubeAccessPointLocation {
  readonly dataProduct: string;
  readonly accessPointGroup: string;
  readonly accessPoint: string;
}

/** What a marketplace link points at */
export interface CubeMarketplaceLinkTarget {
  readonly dataProductId: string;
  readonly deploymentId: string;
  readonly environmentType: CubeDataProductEnvironmentType;
  readonly accessPointGroup?: string | undefined;
}

/**
 * The deployed data products, for the source dialog and for re-checking
 * saved sources: its own port, beside the `CubeEngine`, so hosts without
 * data products need neither. Calls fail with a `CubeEngineError`: with no
 * node for listing and describing, with the node's id for schemas
 */
export interface CubeDataProductCatalog {
  /** The deployment classes the host lists, the default first */
  readonly environmentTypes: readonly CubeDataProductEnvironmentType[];

  /**
   * Whether `search` matches and ranks the text on a server. Otherwise the
   * text is matched on the client, over the class's whole list
   */
  readonly searchesOnServer?: boolean | undefined;

  /** The most products one server search gives: an answer this long may be cut short */
  readonly searchLimit?: number | undefined;

  /**
   * Whether an answer `search` gave leaves out matches the server has, as
   * its page says, counting rows the catalog dropped. Without it, an answer
   * as long as `searchLimit` is taken to be cut short
   */
  readonly isCutShort?:
    | ((answer: readonly CubeDataProductCandidate[]) => boolean)
    | undefined;

  /**
   * The deployed products of a class whose title, id or description holds
   * the text, or, searching on a server, the ones it matches, in its order
   */
  search(
    search: {
      text: string;
      environmentType: CubeDataProductEnvironmentType;
    },
    signal?: AbortSignal,
  ): Promise<readonly CubeDataProductCandidate[]>;

  /** A product's access points, read from its artifact at the version it was deployed from */
  describe(
    candidate: CubeDataProductCandidate,
    signal?: AbortSignal,
  ): Promise<CubeDataProductDescription>;

  /**
   * The schema of each saved source, from the artifact at the cube's
   * version: one entry per key, failures included. `fresh` reads the
   * artifact again rather than what this page visit read, e.g. on Refresh
   */
  resolveSchemas(
    project: CubeDataProductProject,
    sources: ReadonlyMap<NodeId, CubeAccessPointLocation>,
    options?: { readonly fresh?: boolean | undefined },
  ): Promise<Map<NodeId, Schema | CubeEngineError>>;

  /** The product's page in the marketplace, or none when the host has no marketplace */
  getMarketplaceLink(target: CubeMarketplaceLinkTarget): string | undefined;

  /**
   * The viewer's access to each of the product's access point groups, by
   * group id; a group it can't tell has no entry. Optional: a host without
   * it shows no access
   */
  getAccess?(
    candidate: CubeDataProductCandidate,
    signal?: AbortSignal,
  ): Promise<ReadonlyMap<string, CubeAccessPointGroupAccess>>;
}
