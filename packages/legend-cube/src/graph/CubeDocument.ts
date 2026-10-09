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

import { EMPTY_JSON_OBJECT, type JsonObject } from '../utils/Json.js';
import { Query } from './Query.js';

// Each plain-data part keeps the keys of its saved JSON that this version
// does not know, in `rest`, so a re-save writes them back (PLAN §10.3)

/**
 * Where the query's tables come from: the engine's model context as plain
 * JSON, e.g. `{_type: 'text', code}` for Pure text (a bundled or pasted model,
 * dev only), `{_type: 'pointer', sdlcInfo}` for a published project (M3), or
 * a host's own kind, e.g. a direct database connection or a data product's
 * project at its deployed version, saved once for the whole cube (PLAN §6.8). It is kept whole, exactly as saved, unknown keys
 * included; only the host reads it (PLAN §6.2.2).
 */
export interface ModelContext extends JsonObject {
  readonly _type: string;
}

/** The model and runtime of the whole query: one of each per query (D2) */
export interface CubeContext {
  readonly model: ModelContext;
  /** The path of the runtime the query runs with */
  readonly runtime?: string;
  readonly rest?: JsonObject;
}

/** The width of a grid column, by column name */
export interface ColumnWidth {
  readonly column: string;
  readonly width: number;
  readonly rest?: JsonObject;
}

/** How the cube is shown */
export interface Presentation {
  /** Whether the graph panel is shown */
  readonly showGraph: boolean;
  readonly columnWidths: readonly ColumnWidth[];
  readonly rest?: JsonObject;
}

export interface CubeMeta {
  readonly presentation: Presentation;
  readonly rest?: JsonObject;
}

export const DEFAULT_PRESENTATION: Presentation = Object.freeze({
  showGraph: true,
  columnWidths: Object.freeze([]),
});

export const DEFAULT_META: CubeMeta = Object.freeze({
  presentation: DEFAULT_PRESENTATION,
});

export interface CubeDocumentInit {
  readonly name?: string | undefined;
  readonly context?: CubeContext | undefined;
  readonly query?: Query;
  /** Unknown keys of the saved `query` object */
  readonly queryRest?: JsonObject;
  readonly meta?: CubeMeta;
  /** Unknown top-level keys */
  readonly rest?: JsonObject;
}

/**
 * A cube as the editor holds it and the saved spec stores it (PLAN §10.1):
 * the query graph, its model and runtime, and how it is shown. Immutable:
 * every change makes a new document.
 */
export class CubeDocument {
  /** The display name; none until the user names the cube */
  readonly name: string | undefined;
  /** None until the first source is picked, which fixes the model and runtime */
  readonly context: CubeContext | undefined;
  readonly query: Query;
  readonly queryRest: JsonObject;
  readonly meta: CubeMeta;
  readonly rest: JsonObject;

  constructor(init: CubeDocumentInit = {}) {
    this.name = init.name;
    this.context = init.context;
    this.query = init.query ?? new Query();
    this.queryRest = init.queryRest ?? EMPTY_JSON_OBJECT;
    this.meta = init.meta ?? DEFAULT_META;
    this.rest = init.rest ?? EMPTY_JSON_OBJECT;
  }

  private with(changes: CubeDocumentInit): CubeDocument {
    return new CubeDocument({
      name: this.name,
      context: this.context,
      query: this.query,
      queryRest: this.queryRest,
      meta: this.meta,
      rest: this.rest,
      ...changes,
    });
  }

  withName(name: string | undefined): CubeDocument {
    return this.with({ name });
  }

  withContext(context: CubeContext | undefined): CubeDocument {
    return this.with({ context });
  }

  withQuery(query: Query): CubeDocument {
    return this.with({ query });
  }

  withMeta(meta: CubeMeta): CubeDocument {
    return this.with({ meta });
  }
}
