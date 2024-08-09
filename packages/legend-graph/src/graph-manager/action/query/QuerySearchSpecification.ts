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

import type { QueryStereotype, QueryTaggedValue } from './Query.js';

export class QueryProjectCoordinates {
  groupId!: string;
  artifactId!: string;
}

export class QuerySearchTermSpecification {
  searchTerm: string;
  exactMatchName: boolean | undefined;
  includeOwner: boolean | undefined;

  constructor(searchTerm: string) {
    this.searchTerm = searchTerm;
  }
}

export enum QuerySearchSortBy {
  SORT_BY_CREATE = 'SORT_BY_CREATE',
  SORT_BY_VIEW = 'SORT_BY_VIEW',
  SORT_BY_UPDATE = 'SORT_BY_UPDATE',
}

export class QuerySearchSpecification {
  searchTermSpecification: QuerySearchTermSpecification | undefined;
  projectCoordinates?: QueryProjectCoordinates[] | undefined;
  taggedValues?: QueryTaggedValue[] | undefined;
  stereotypes?: QueryStereotype[] | undefined;
  limit?: number | undefined;
  showCurrentUserQueriesOnly?: boolean | undefined;
  combineTaggedValuesCondition?: boolean | undefined;
  sortByOption?: QuerySearchSortBy;

  static createDefault(
    searchTerm: string | undefined,
  ): QuerySearchSpecification {
    const spec = new QuerySearchSpecification();
    if (searchTerm) {
      const term = new QuerySearchTermSpecification(searchTerm);
      term.includeOwner = true;
      term.exactMatchName = false;
      spec.searchTermSpecification = term;
    }
    return spec;
  }
}
