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

import { Connection } from '../graph/Connection.js';
import {
  type ColumnWidth,
  type CubeContext,
  CubeDocument,
  type CubeMeta,
  DEFAULT_META,
  type ModelRef,
  type Presentation,
} from '../graph/CubeDocument.js';
import { Query } from '../graph/Query.js';
import type { QueryNode } from '../graph/QueryNode.js';
import {
  createNodeRegistry,
  type NodeRegistry,
  type TransformDefinition,
} from '../nodes/NodeRegistry.js';
import { UnknownNode } from '../nodes/UnknownNode.js';
import {
  EMPTY_JSON_OBJECT,
  type JsonObject,
  type JsonValue,
  pickUnknownKeys,
} from '../utils/Json.js';
import {
  CubeSpecDecodeError,
  fail,
  pathTo,
  readArray,
  readBoolean,
  readObject,
  readOptionalString,
  readString,
  UnreadableContent,
} from './SpecReader.js';

/** The version of the saved spec format this version of Cube writes */
export const CURRENT_FORMAT_VERSION = 1;

/** The largest saved spec Cube imports or exports, in UTF-8 bytes (PLAN §10.3) */
export const MAX_SPEC_BYTES = 1024 * 1024;

export interface CubeSpecDecodeResult {
  readonly document: CubeDocument;
  /** The format version the document was saved with */
  readonly formatVersion: number;
  /**
   * Saved by a newer version of Cube: read with this version's rules, so it
   * can be shown, but it must not be edited or saved again
   */
  readonly readOnly: boolean;
}

/** One step of the migrations that bring older documents to the current format */
export interface CubeSpecMigration {
  /** The version it migrates from, to the next one */
  readonly from: number;
  migrate(json: JsonObject): JsonObject;
}

/** The migrations of the format, in order: none yet, since version 1 is the first */
export const CUBE_SPEC_MIGRATIONS: readonly CubeSpecMigration[] = [];

export interface CubeSpecDecodeOptions {
  readonly registry?: NodeRegistry;
  readonly migrations?: readonly CubeSpecMigration[];
}

const TOP_LEVEL_KEYS = ['formatVersion', 'name', 'context', 'query', 'meta'];
const CONTEXT_KEYS = ['model', 'runtime'];
const LOCAL_MODEL_KEYS = ['kind', 'id', 'label'];
const PROJECT_MODEL_KEYS = ['kind', 'groupId', 'artifactId', 'versionId'];
const QUERY_KEYS = ['selected', 'nodes'];
const NODE_KEYS = ['kind', 'id', 'inputs'];
const META_KEYS = ['presentation'];
const PRESENTATION_KEYS = ['showGraph', 'columnWidths'];
const COLUMN_WIDTH_KEYS = ['column', 'width'];

/** Unknown keys to write back, never over a known one */
const restOf = (
  rest: JsonObject | undefined,
  known: readonly string[],
): JsonObject => (rest ? pickUnknownKeys(rest, known) : EMPTY_JSON_OBJECT);

/** The unknown keys of a saved object, when it has any */
const readRest = (
  json: JsonObject,
  known: readonly string[],
): { rest?: JsonObject } => {
  const rest = pickUnknownKeys(json, known);
  return Object.keys(rest).length ? { rest } : {};
};

/** Brings a document saved with an older format to `to`, one step at a time */
export const migrateCubeSpec = (
  json: JsonObject,
  from: number,
  to = CURRENT_FORMAT_VERSION,
  migrations: readonly CubeSpecMigration[] = CUBE_SPEC_MIGRATIONS,
): JsonObject => {
  let migrated = json;
  for (let version = from; version < to; version += 1) {
    const step = migrations.find((migration) => migration.from === version);
    if (!step) {
      return fail(
        'formatVersion',
        `can't be read: there is no migration from format ${version}`,
      );
    }
    migrated = { ...step.migrate(migrated), formatVersion: version + 1 };
  }
  return migrated;
};

// ---------------------------------------- encode ----------------------------------------

const encodeModel = (model: ModelRef): JsonObject =>
  model.kind === 'local'
    ? {
        kind: model.kind,
        id: model.id,
        ...(model.label !== undefined ? { label: model.label } : {}),
        ...restOf(model.rest, LOCAL_MODEL_KEYS),
      }
    : {
        kind: model.kind,
        groupId: model.groupId,
        artifactId: model.artifactId,
        versionId: model.versionId,
        ...restOf(model.rest, PROJECT_MODEL_KEYS),
      };

const encodeContext = (context: CubeContext): JsonObject => ({
  model: encodeModel(context.model),
  ...(context.runtime !== undefined ? { runtime: context.runtime } : {}),
  ...restOf(context.rest, CONTEXT_KEYS),
});

const encodeNode = (
  query: Query,
  node: QueryNode,
  registry: NodeRegistry,
): JsonObject => {
  const inputs = query.getInputIds(node.id).map((id) => id ?? null);
  if (node.type === UnknownNode.TYPE) {
    // written back as it was saved; only `id` and `inputs` come from the query
    const unknown = node as UnknownNode;
    const { kind = UnknownNode.TYPE, ...others } = unknown.json;
    return {
      kind,
      id: node.id,
      ...(unknown.hasInputs ? { inputs } : {}),
      ...others,
    };
  }
  const definition = registry.get(node.type);
  if (!definition) {
    throw new Error(
      `Can't save node "${node.id}": its type "${node.type}" is unknown`,
    );
  }
  // the definition is the one registered for the node's type
  const { spec } = definition as TransformDefinition;
  return {
    kind: node.type,
    id: node.id,
    ...(node.ports.length ? { inputs } : {}),
    ...spec.encode(node),
    ...restOf(node.rest, [...NODE_KEYS, ...spec.keys]),
  };
};

const encodePresentation = (
  presentation: Presentation,
): JsonObject | undefined => {
  const json: JsonObject = {
    ...(presentation.showGraph ? {} : { showGraph: false }),
    ...(presentation.columnWidths.length
      ? {
          columnWidths: presentation.columnWidths.map((width) => ({
            column: width.column,
            width: width.width,
            ...restOf(width.rest, COLUMN_WIDTH_KEYS),
          })),
        }
      : {}),
    ...restOf(presentation.rest, PRESENTATION_KEYS),
  };
  return Object.keys(json).length ? json : undefined;
};

const encodeMeta = (meta: CubeMeta): JsonObject | undefined => {
  const presentation = encodePresentation(meta.presentation);
  const json: JsonObject = {
    ...(presentation ? { presentation } : {}),
    ...restOf(meta.rest, META_KEYS),
  };
  return Object.keys(json).length ? json : undefined;
};

/**
 * The document as a saved spec (PLAN §10.3): a plain JSON object with its
 * keys in a fixed order, leaving out anything absent or at its default.
 * Any document can be saved, valid or not.
 */
export const encodeCubeSpec = (
  document: CubeDocument,
  registry: NodeRegistry = createNodeRegistry(),
): JsonObject => {
  const { query } = document;
  const meta = encodeMeta(document.meta);
  return {
    formatVersion: CURRENT_FORMAT_VERSION,
    ...(document.name !== undefined ? { name: document.name } : {}),
    ...(document.context ? { context: encodeContext(document.context) } : {}),
    query: {
      ...(query.selected !== undefined ? { selected: query.selected } : {}),
      nodes: query.nodes.map((node) => encodeNode(query, node, registry)),
      ...restOf(document.queryRest, QUERY_KEYS),
    },
    ...(meta ? { meta } : {}),
    ...restOf(document.rest, TOP_LEVEL_KEYS),
  };
};

// ---------------------------------------- decode ----------------------------------------

const decodeModel = (value: unknown, path: string): ModelRef => {
  const json = readObject(value, path);
  const kind = readString(json, 'kind', path);
  switch (kind) {
    case 'local': {
      const label = readOptionalString(json, 'label', path, true);
      return {
        kind,
        id: readString(json, 'id', path),
        ...(label !== undefined ? { label } : {}),
        ...readRest(json, LOCAL_MODEL_KEYS),
      };
    }
    case 'project':
      return {
        kind,
        groupId: readString(json, 'groupId', path),
        artifactId: readString(json, 'artifactId', path),
        versionId: readString(json, 'versionId', path),
        ...readRest(json, PROJECT_MODEL_KEYS),
      };
    default:
      // nothing can be resolved or run without a model it knows
      return fail(pathTo(path, 'kind'), `"${kind}" is not a known model kind`);
  }
};

const decodeContext = (value: unknown, path: string): CubeContext => {
  const json = readObject(value, path);
  const runtime = readOptionalString(json, 'runtime', path);
  return {
    model: decodeModel(
      json.model ?? fail(pathTo(path, 'model'), 'is required'),
      pathTo(path, 'model'),
    ),
    ...(runtime !== undefined ? { runtime } : {}),
    ...readRest(json, CONTEXT_KEYS),
  };
};

const readInputs = (
  json: JsonObject,
  path: string,
): (string | null)[] | undefined => {
  if (json.inputs === undefined) {
    return undefined;
  }
  const at = pathTo(path, 'inputs');
  return readArray(json.inputs, at).map((input, index) =>
    input === null || (typeof input === 'string' && input)
      ? input
      : fail(pathTo(at, index), 'must be a node id or null'),
  );
};

/** A node of a type this version can't read, kept as it was saved */
const decodeUnknownNode = (
  id: string,
  json: JsonObject,
  inputs: readonly (string | null)[] | undefined,
): UnknownNode =>
  new UnknownNode(
    id,
    inputs?.length ?? 0,
    pickUnknownKeys(json, ['id', 'inputs']),
    inputs !== undefined,
  );

const decodeNode = (
  json: JsonObject,
  path: string,
  inputs: readonly (string | null)[] | undefined,
  registry: NodeRegistry,
): QueryNode => {
  const kind = readString(json, 'kind', path);
  const id = readString(json, 'id', path);
  const definition = kind === UnknownNode.TYPE ? undefined : registry.get(kind);
  if (!definition) {
    return decodeUnknownNode(id, json, inputs);
  }
  const { spec } = definition;
  const own: Record<string, JsonValue> = {};
  spec.keys.forEach((key) => {
    const value = json[key];
    if (value !== undefined) {
      own[key] = value;
    }
  });
  let node: QueryNode;
  try {
    node = spec.decode(
      id,
      own,
      path,
      pickUnknownKeys(json, [...NODE_KEYS, ...spec.keys]),
    );
  } catch (error) {
    if (error instanceof UnreadableContent) {
      return decodeUnknownNode(id, json, inputs);
    }
    if (error instanceof CubeSpecDecodeError || !(error instanceof Error)) {
      throw error;
    }
    return fail(path, error.message);
  }
  // a known type has a fixed number of ports, so another count is malformed
  const at = pathTo(path, 'inputs');
  if (!node.ports.length) {
    if (inputs?.length) {
      fail(at, `must be left out: a ${kind} node has no inputs`);
    }
  } else if (inputs?.length !== node.ports.length) {
    fail(
      at,
      `must list the ${node.ports.length} input(s) of a ${kind} node, in port order`,
    );
  }
  return node;
};

const decodeQuery = (
  value: unknown,
  path: string,
  registry: NodeRegistry,
): { query: Query; queryRest: JsonObject } => {
  const json = readObject(value, path);
  const nodesPath = pathTo(path, 'nodes');
  const items = readArray(
    json.nodes ?? fail(nodesPath, 'is required'),
    nodesPath,
  );
  const ids = new Set<string>();
  const decoded = items.map((item, index) => {
    const at = pathTo(nodesPath, index);
    const nodeJson = readObject(item, at);
    const inputs = readInputs(nodeJson, at);
    const node = decodeNode(nodeJson, at, inputs, registry);
    if (ids.has(node.id)) {
      fail(pathTo(at, 'id'), `repeats the id "${node.id}"`);
    }
    ids.add(node.id);
    return { node, inputs: inputs ?? [], at };
  });

  const fed = new Set<string>();
  const connections = decoded.flatMap(({ node, inputs, at }) =>
    inputs.flatMap((input, index) => {
      if (input === null) {
        return [];
      }
      const inputPath = pathTo(pathTo(at, 'inputs'), index);
      if (!ids.has(input)) {
        return fail(inputPath, `"${input}" is not a node of the query`);
      }
      if (fed.has(input)) {
        return fail(inputPath, `node "${input}" already feeds another node`);
      }
      fed.add(input);
      return [new Connection(input, node.id, node.ports[index] as string)];
    }),
  );

  const selected = readOptionalString(json, 'selected', path);
  const selectedPath = pathTo(path, 'selected');
  if (!decoded.length && selected !== undefined) {
    fail(selectedPath, 'must be left out of a query with no nodes');
  }
  if (decoded.length && selected === undefined) {
    fail(selectedPath, 'is required');
  }
  if (selected !== undefined && !ids.has(selected)) {
    fail(selectedPath, `"${selected}" is not a node of the query`);
  }
  let query: Query;
  try {
    query = new Query(
      decoded.map(({ node }) => node),
      connections,
      selected,
    );
  } catch (error) {
    // e.g. a cycle
    return fail(
      nodesPath,
      error instanceof Error ? error.message : 'is invalid',
    );
  }
  return { query, queryRest: pickUnknownKeys(json, QUERY_KEYS) };
};

const decodeColumnWidth = (value: unknown, path: string): ColumnWidth => {
  const json = readObject(value, path);
  const { width } = json;
  if (width === undefined) {
    return fail(pathTo(path, 'width'), 'is required');
  }
  if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0) {
    return fail(pathTo(path, 'width'), 'must be a positive number');
  }
  return {
    column: readString(json, 'column', path),
    width,
    ...readRest(json, COLUMN_WIDTH_KEYS),
  };
};

const decodePresentation = (value: unknown, path: string): Presentation => {
  const json = readObject(value, path);
  const widthsPath = pathTo(path, 'columnWidths');
  return {
    showGraph:
      json.showGraph === undefined
        ? true
        : readBoolean(json, 'showGraph', path),
    columnWidths:
      json.columnWidths === undefined
        ? []
        : readArray(json.columnWidths, widthsPath).map((item, index) =>
            decodeColumnWidth(item, pathTo(widthsPath, index)),
          ),
    ...readRest(json, PRESENTATION_KEYS),
  };
};

const decodeMeta = (value: unknown, path: string): CubeMeta => {
  const json = readObject(value, path);
  return {
    presentation:
      json.presentation === undefined
        ? DEFAULT_META.presentation
        : decodePresentation(json.presentation, pathTo(path, 'presentation')),
    ...readRest(json, META_KEYS),
  };
};

const decodeDocument = (
  json: JsonObject,
  registry: NodeRegistry,
): CubeDocument => {
  const { query, queryRest } = decodeQuery(
    json.query ?? fail('query', 'is required'),
    'query',
    registry,
  );
  return new CubeDocument({
    name: readOptionalString(json, 'name', '', true),
    context:
      json.context === undefined
        ? undefined
        : decodeContext(json.context, 'context'),
    query,
    queryRest,
    meta:
      json.meta === undefined ? DEFAULT_META : decodeMeta(json.meta, 'meta'),
    rest: pickUnknownKeys(json, TOP_LEVEL_KEYS),
  });
};

/**
 * The document a saved spec holds (PLAN §10.3). What this version can't
 * understand is kept, not dropped: unknown keys, nodes of unknown types and
 * unreadable filter rules are saved back as they were. A malformed document
 * throws a `CubeSpecDecodeError` that says where. Values are kept as
 * written, valid or not: validation reports them.
 */
export const decodeCubeSpec = (
  json: unknown,
  options: CubeSpecDecodeOptions = {},
): CubeSpecDecodeResult => {
  const registry = options.registry ?? createNodeRegistry();
  const root = readObject(json, '');
  const { formatVersion } = root;
  if (formatVersion === undefined) {
    return fail('formatVersion', 'is required');
  }
  if (
    typeof formatVersion !== 'number' ||
    !Number.isSafeInteger(formatVersion) ||
    formatVersion < 1
  ) {
    return fail('formatVersion', 'must be a whole number of at least 1');
  }
  const readOnly = formatVersion > CURRENT_FORMAT_VERSION;
  const current =
    formatVersion < CURRENT_FORMAT_VERSION
      ? migrateCubeSpec(
          root,
          formatVersion,
          CURRENT_FORMAT_VERSION,
          options.migrations,
        )
      : root;
  try {
    return {
      document: decodeDocument(current, registry),
      formatVersion,
      readOnly,
    };
  } catch (error) {
    if (readOnly && error instanceof CubeSpecDecodeError) {
      throw new CubeSpecDecodeError(
        error.path,
        `${error.detail} (this cube was saved by a newer version of Cube, in format ${formatVersion})`,
      );
    }
    throw error;
  }
};

/** The number of bytes of the text in UTF-8 */
export const getUtf8ByteLength = (text: string): number => {
  let bytes = 0;
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0;
    bytes +=
      codePoint < 0x80
        ? 1
        : codePoint < 0x800
          ? 2
          : codePoint < 0x10000
            ? 3
            : 4;
  }
  return bytes;
};

/** The document as saved-spec text, indented for people, e.g. to export it */
export const serializeCubeSpec = (
  document: CubeDocument,
  registry?: NodeRegistry,
): string => {
  const text = JSON.stringify(encodeCubeSpec(document, registry), undefined, 2);
  if (getUtf8ByteLength(text) > MAX_SPEC_BYTES) {
    throw new Error(
      `The cube is too large to save: its spec is over ${MAX_SPEC_BYTES} bytes`,
    );
  }
  return text;
};

/** The document saved-spec text holds, e.g. an imported file */
export const parseCubeSpec = (
  text: string,
  options?: CubeSpecDecodeOptions,
): CubeSpecDecodeResult => {
  if (getUtf8ByteLength(text) > MAX_SPEC_BYTES) {
    return fail('', `is over ${MAX_SPEC_BYTES} bytes`);
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    return fail(
      '',
      `is not valid JSON (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  return decodeCubeSpec(json, options);
};
