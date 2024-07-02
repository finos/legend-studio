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

import type { Mapping } from '../../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import type { PackageableElementReference } from '../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import type { PackageableRuntime } from '../../../graph/metamodel/pure/packageableElements/runtime/PackageableRuntime.js';

export class QueryTaggedValue {
  profile!: string;
  tag!: string;
  value!: string;
}

export class QueryStereotype {
  profile!: string;
  stereotype!: string;
}

export class QueryParameterValue {
  name!: string;
  content!: string;
}

export abstract class QueryExecutionContext {}

export class QueryExplicitExecutionContext extends QueryExecutionContext {
  mapping!: PackageableElementReference<Mapping>;
  runtime!: PackageableElementReference<PackageableRuntime>;
}

export class QueryDataSpaceExecutionContext extends QueryExecutionContext {
  dataSpacePath!: string;
  executionKey: string | undefined;
}

export interface QueryGridConfig {
  columns: object[];
  isPivotModeEnabled: boolean | undefined;
  isLocalModeEnabled: boolean | undefined;
  previewLimit?: number | undefined;
  weightedColumnPairs?: Map<string, string> | undefined;
}

export class Query {
  name!: string;
  id!: string;
  versionId!: string;
  originalVersionId?: string | undefined;
  groupId!: string;
  artifactId!: string;
  // We enforce a single owner, for collaboration on query, use Studio
  // if not owner is specified, any user can own the query
  // NOTE: the owner is managed automatically by the backend
  owner?: string | undefined;
  // NOTE: these are different from metamodel tagged values and stereotypes
  // because we don't process them
  taggedValues?: QueryTaggedValue[] | undefined;
  stereotypes?: QueryStereotype[] | undefined;
  defaultParameterValues?: QueryParameterValue[] | undefined;

  // Store query in text to be more compact and stable
  content!: string;
  executionContext!: QueryExecutionContext;

  /**
   * mapping, runtime have been deprecated in favor of `V1_QueryExecutionContext`
   * @deprecated
   */
  mapping?: PackageableElementReference<Mapping> | undefined;
  /**
   * mapping, runtime have been deprecated in favor of `V1_QueryExecutionContext`
   * @deprecated
   */
  runtime?: PackageableElementReference<PackageableRuntime> | undefined;

  lastUpdatedAt?: number | undefined;
  createdAt?: number | undefined;
  lastOpenAt?: number | undefined;
  isCurrentUserQuery = false;
  gridConfig?: QueryGridConfig | undefined;
}

export class LightQuery {
  name!: string;
  id!: string;
  versionId!: string;
  originalVersionId?: string | undefined;
  groupId!: string;
  artifactId!: string;
  owner?: string | undefined;
  lastUpdatedAt?: number | undefined;
  createdAt?: number | undefined;
  lastOpenAt?: number | undefined;

  isCurrentUserQuery = false;
}

export const toLightQuery = (query: Query): LightQuery => {
  const lightQuery = new LightQuery();
  lightQuery.name = query.name;
  lightQuery.id = query.id;
  lightQuery.groupId = query.groupId;
  lightQuery.artifactId = query.artifactId;
  lightQuery.versionId = query.versionId;
  lightQuery.originalVersionId = query.originalVersionId;
  lightQuery.owner = query.owner;
  lightQuery.isCurrentUserQuery = query.isCurrentUserQuery;
  lightQuery.lastOpenAt = query.lastOpenAt;
  lightQuery.createdAt = query.createdAt;
  lightQuery.lastUpdatedAt = query.lastUpdatedAt;
  return lightQuery;
};

export const cloneQueryTaggedValue = (
  val: QueryTaggedValue,
): QueryTaggedValue => {
  const queryTaggedVal = new QueryTaggedValue();
  queryTaggedVal.profile = val.profile;
  queryTaggedVal.tag = val.tag;
  queryTaggedVal.value = val.value;
  return queryTaggedVal;
};

export const cloneQueryStereotype = (val: QueryStereotype): QueryStereotype => {
  const queryStereotype = new QueryStereotype();
  queryStereotype.profile = val.profile;
  queryStereotype.stereotype = val.stereotype;
  return queryStereotype;
};

export abstract class QueryExecutionContextInfo {}

export class QueryExplicitExecutionContextInfo extends QueryExecutionContextInfo {
  mapping!: string;
  runtime!: string;
}

export class QueryDataSpaceExecutionContextInfo extends QueryExecutionContextInfo {
  dataSpacePath!: string;
  executionKey: string | undefined;
}
export interface QueryInfo {
  name: string;
  id: string;
  versionId: string;
  origignalVersionId?: string | undefined;
  groupId: string;
  artifactId: string;
  executionContext: QueryExecutionContextInfo;
  mapping?: string | undefined;
  runtime?: string | undefined;
  content: string;
}
