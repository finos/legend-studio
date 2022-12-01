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

import { deleteEntry, uuid, type PlainObject } from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import {
  createModelSchema,
  deserialize,
  list,
  object,
  primitive,
} from 'serializr';

export abstract class SearchEntry {
  uuid = uuid();
}

export class SearchResultCoordinate {
  uuid = uuid();
  startLine!: number;
  startColumn!: number;
  endLine!: number;
  endColumn!: number;

  constructor(
    startLine: number,
    startColumn: number,
    endLine: number,
    endColumn: number,
  ) {
    this.startLine = startLine;
    this.startColumn = startColumn;
    this.endLine = endLine;
    this.endColumn = endColumn;
  }
}

createModelSchema(SearchResultCoordinate, {
  startLine: primitive(),
  startColumn: primitive(),
  endLine: primitive(),
  endColumn: primitive(),
});

export class SearchResultEntry extends SearchEntry {
  sourceId!: string;
  coordinates: SearchResultCoordinate[] = [];

  constructor() {
    super();
    makeObservable(this, {
      coordinates: observable,
      dismissCoordinate: action,
    });
  }

  setCoordinates(value: SearchResultCoordinate[]): void {
    this.coordinates = value;
  }
  dismissCoordinate(value: SearchResultCoordinate): void {
    deleteEntry(this.coordinates, value);
  }
}

createModelSchema(SearchResultEntry, {
  sourceId: primitive(),
  coordinates: list(object(SearchResultCoordinate)),
});

export const getSearchResultEntry = (
  result: PlainObject<SearchResultEntry>,
): SearchResultEntry => deserialize(SearchResultEntry, result);
