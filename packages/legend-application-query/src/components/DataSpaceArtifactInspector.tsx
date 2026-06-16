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

/**
 * Developer-only diagnostic page for measuring the size and shape of the
 * DataSpace analytics artifact returned by the Depot server. Used to
 * investigate Chrome tab OOM crashes when loading large multi execution
 * context DataSpaces.
 *
 * Route: /dev/dataspace-inspector
 *
 * The page reuses the application's existing depot client (so it inherits
 * the same auth / cookies / Envoy origin headers), fetches:
 *   GET /generations/{groupId}/{artifactId}/{versionId}/types/dataSpace-analytics?elementPath={path}
 * (the existing per-type endpoint, now narrowed via the `elementPath`
 * query parameter for QUERY-1054) and reports total uncompressed payload
 * bytes plus a per-file breakdown for that one DataSpace.
 *
 * Also supports loading inputs from a saved query id (hits the engine
 * query server `/pure/v1/query/{id}` endpoint and pulls groupId /
 * artifactId / versionId + the dataspace path from the saved query's
 * `taggedValues` / `executionContext`), and an inline JSON viewer (Monaco)
 * for the parsed response and individual file contents.
 */

import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { StoreProjectData } from '@finos/legend-server-depot';
import { LogEvent } from '@finos/legend-shared';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { LEGEND_QUERY_APP_EVENT } from '../__lib__/LegendQueryEvent.js';
import {
  useLegendQueryApplicationStore,
  useLegendQueryBaseStore,
} from './LegendQueryFrameworkProvider.js';
import { DATA_SPACE_ELEMENT_CLASSIFIER_PATH } from '@finos/legend-extension-dsl-data-space/graph';

const MB = 1024 * 1024;
const fmtMB = (bytes: number): string => `${(bytes / MB).toFixed(2)} MB`;

const QUERY_PROFILE_PATH = 'meta::pure::profiles::query';
const QUERY_PROFILE_TAG_DATA_SPACE = 'dataSpace';

interface DataSpaceOption {
  groupId: string;
  artifactId: string;
  versionId: string;
  path: string;
  label: string;
}

interface FileSizeRow {
  path: string;
  type: string;
  filePath: string;
  bytes: number;
}

interface InspectionResult {
  mode: 'parsed' | 'streamed' | 'streamed-headers';
  totalBytes: number;
  fileCount: number;
  rows: FileSizeRow[];
  fetchMs: number;
  sizingMs: number;
  streamedBodyBytes?: number | undefined;
  streamedCompressedBytes?: number | undefined;
  streamedContentEncoding?: string | undefined;
  streamedUrl?: string | undefined;
  // Only populated in parsed mode — used by the inline JSON viewer.
  rawFiles?: unknown[] | undefined;
}

interface JsonViewerState {
  title: string;
  content: string;
}

/**
 * Pretty-print arbitrary JSON-ish input. If the input is already a string
 * that happens to be valid JSON (depot returns `content` as a string for
 * files like `AnalyticsResult.json`), reparse and re-stringify so the
 * viewer gets a properly indented, foldable tree instead of a long
 * single-line escaped string.
 */
const prettyJson = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        // fall through, return raw string
      }
    }
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const inputStyle: React.CSSProperties = {
  padding: '0.4rem 0.6rem',
  background: '#2a2a2a',
  color: '#eee',
  border: '1px solid #444',
  borderRadius: 4,
  fontFamily: 'monospace',
};

const thStyle: React.CSSProperties = {
  padding: '0.4rem 0.6rem',
  textAlign: 'left',
  borderBottom: '1px solid #444',
};

const tdStyle: React.CSSProperties = {
  padding: '0.35rem 0.6rem',
  borderBottom: '1px solid #2a2a2a',
  fontFamily: 'monospace',
  fontSize: '0.85rem',
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <tr>
    <td style={{ padding: '0.2rem 0.75rem 0.2rem 0', color: '#888' }}>
      {label}
    </td>
    <td style={{ padding: '0.2rem 0', fontFamily: 'monospace' }}>{value}</td>
  </tr>
);

const JsonViewerModal: React.FC<{
  title: string;
  content: string;
  onClose: () => void;
}> = ({ title, content, onClose }) => (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}
    onClick={onClose}
  >
    <div
      style={{
        background: '#1e1e1e',
        border: '1px solid #444',
        borderRadius: 6,
        width: 'min(1400px, 95vw)',
        height: 'min(900px, 92vh)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          padding: '0.6rem 1rem',
          borderBottom: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            color: '#ddd',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginRight: '1rem',
          }}
          title={title}
        >
          {title}
          <span style={{ color: '#888', marginLeft: '1rem' }}>
            ({content.length.toLocaleString()} chars)
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '0.3rem 0.8rem',
            background: '#444',
            color: 'white',
            border: '1px solid #666',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <CodeEditor
          inputValue={content}
          isReadOnly={true}
          language={CODE_EDITOR_LANGUAGE.JSON}
          hideMinimap={false}
          hideGutter={false}
        />
      </div>
    </div>
  </div>
);

export const DataSpaceArtifactInspector = observer(() => {
  const applicationStore = useLegendQueryApplicationStore();
  const depotServerClient = useLegendQueryBaseStore().depotServerClient;

  const [groupId, setGroupId] = useState('');
  const [artifactId, setArtifactId] = useState('');
  const [versionId, setVersionId] = useState('');
  const [elementPath, setElementPath] = useState('');

  const [savedQueryId, setSavedQueryId] = useState('');
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [queryLoadError, setQueryLoadError] = useState<string | undefined>(
    undefined,
  );
  const [queryLoadInfo, setQueryLoadInfo] = useState<string | undefined>(
    undefined,
  );

  const [dataSpaceOptions, setDataSpaceOptions] = useState<DataSpaceOption[]>(
    [],
  );
  const [loadingDataSpaces, setLoadingDataSpaces] = useState(false);
  const [dataSpacesError, setDataSpacesError] = useState<string | undefined>(
    undefined,
  );
  const [selectedDataSpaceKey, setSelectedDataSpaceKey] = useState('');
  const [dataSpaceFilter, setDataSpaceFilter] = useState('');

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<InspectionResult | undefined>(undefined);
  const [viewer, setViewer] = useState<JsonViewerState | undefined>(undefined);

  const elementPathMissing = !elementPath.trim();
  const canRun =
    !running && !!groupId && !!artifactId && !!versionId && !elementPathMissing;

  /**
   * Load groupId / artifactId / versionId / elementPath from a saved
   * query. Hits the engine query server `/pure/v1/query/{id}` endpoint
   * directly (no graphManager dependency required for a diagnostic page).
   */
  const loadFromSavedQuery = async (): Promise<void> => {
    const id = savedQueryId.trim();
    if (!id) {
      return;
    }
    setLoadingQuery(true);
    setQueryLoadError(undefined);
    setQueryLoadInfo(undefined);
    try {
      const config = applicationStore.config;
      const base = config.engineQueryServerUrl ?? config.engineServerUrl;
      if (!base) {
        throw new Error('Engine (query) server URL is not configured');
      }
      const url = `${base}/pure/v1/query/${encodeURIComponent(id)}`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const body = (await response.json()) as {
        groupId?: string;
        artifactId?: string;
        versionId?: string;
        taggedValues?: {
          profile?: string;
          tag?: string;
          value?: string;
        }[];
        executionContext?: {
          _type?: string;
          dataSpacePath?: string;
        };
      };

      const nextGroupId = body.groupId ?? '';
      const nextArtifactId = body.artifactId ?? '';
      const nextVersionId = body.versionId ?? '';

      // Prefer the executionContext.dataSpacePath (set when the saved
      // query targets a dataspace exec context); fall back to the legacy
      // `dataSpace` tagged value.
      const fromExecutionContext =
        body.executionContext?.dataSpacePath?.trim() ?? '';
      const fromTaggedValues = (body.taggedValues ?? []).find(
        (t) =>
          t.profile === QUERY_PROFILE_PATH &&
          t.tag === QUERY_PROFILE_TAG_DATA_SPACE &&
          typeof t.value === 'string' &&
          t.value.length > 0,
      )?.value;
      const nextElementPath = fromExecutionContext || (fromTaggedValues ?? '');

      if (!nextGroupId || !nextArtifactId || !nextVersionId) {
        throw new Error(
          'Saved query is missing groupId / artifactId / versionId',
        );
      }
      if (!nextElementPath) {
        throw new Error(
          'Saved query has no dataspace tagged value or dataspace execution context — cannot infer elementPath. Fill it in manually.',
        );
      }

      setGroupId(nextGroupId);
      setArtifactId(nextArtifactId);
      setVersionId(nextVersionId);
      setElementPath(nextElementPath);
      setQueryLoadInfo(
        `Loaded ${nextGroupId}:${nextArtifactId}:${nextVersionId} → ${nextElementPath}`,
      );
    } catch (e) {
      setQueryLoadError(e instanceof Error ? e.message : String(e));
      applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        e,
      );
    } finally {
      setLoadingQuery(false);
    }
  };

  /**
   * Load every DataSpace registered in depot (latest version of each)
   * into a dropdown. Uses the lightweight `summary` classifier endpoint
   * so we only get `{groupId, artifactId, versionId, path}` rows, not
   * full entity content — safe to call with thousands of entries.
   */
  const loadAllDataSpaces = async (): Promise<void> => {
    setLoadingDataSpaces(true);
    setDataSpacesError(undefined);
    try {
      const base = depotServerClient.baseUrl;
      if (!base) {
        throw new Error('Depot server baseUrl is not configured');
      }
      const url = `${base}/classifiers/${encodeURIComponent(
        DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
      )}?summary=true&latest=true`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const body = (await response.json()) as {
        groupId?: string;
        artifactId?: string;
        versionId?: string;
        path?: string;
      }[];
      const options: DataSpaceOption[] = body
        .map((e): DataSpaceOption | undefined => {
          const { groupId: g, artifactId: a, versionId: v, path: p } = e;
          if (!g || !a || !v || !p) {
            return undefined;
          }
          return {
            groupId: g,
            artifactId: a,
            versionId: v,
            path: p,
            label: `${p}  \u2014  ${g}:${a}:${v}`,
          };
        })
        .filter((o): o is DataSpaceOption => o !== undefined)
        .sort((a, b) => a.label.localeCompare(b.label));
      setDataSpaceOptions(options);
    } catch (e) {
      setDataSpacesError(e instanceof Error ? e.message : String(e));
      applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        e,
      );
    } finally {
      setLoadingDataSpaces(false);
    }
  };

  const applyDataSpaceOption = (key: string): void => {
    setSelectedDataSpaceKey(key);
    if (!key) {
      return;
    }
    const option = dataSpaceOptions.find(
      (o) => `${o.groupId}:${o.artifactId}:${o.versionId}:${o.path}` === key,
    );
    if (!option) {
      return;
    }
    setGroupId(option.groupId);
    setArtifactId(option.artifactId);
    setVersionId(option.versionId);
    setElementPath(option.path);
  };

  const filteredDataSpaceOptions = (() => {
    const f = dataSpaceFilter.trim().toLowerCase();
    if (!f) {
      return dataSpaceOptions;
    }
    return dataSpaceOptions.filter((o) => o.label.toLowerCase().includes(f));
  })();

  const run = async (): Promise<void> => {
    setRunning(true);
    setError(undefined);
    setResult(undefined);
    try {
      const project = StoreProjectData.serialization.fromJson(
        await depotServerClient.getProject(groupId.trim(), artifactId.trim()),
      );

      const fetchStart = performance.now();
      const files = await depotServerClient.getGenerationFilesByType(
        project,
        versionId.trim(),
        'dataSpace-analytics',
        elementPath.trim(),
      );
      const fetchMs = performance.now() - fetchStart;

      const sizingStart = performance.now();
      const rows: FileSizeRow[] = files
        .map((f) => {
          const elemPath = (f as { path?: unknown }).path;
          const type = (f as { type?: unknown }).type;
          const file = (f as { file?: { path?: unknown; content?: unknown } })
            .file;
          const filePath = file?.path;
          const content = file?.content;
          let bytes = 0;
          try {
            bytes =
              typeof content === 'string'
                ? content.length
                : JSON.stringify(content).length;
          } catch {
            bytes = -1;
          }
          return {
            path: typeof elemPath === 'string' ? elemPath : elementPath.trim(),
            type: typeof type === 'string' ? type : '<unknown>',
            filePath: typeof filePath === 'string' ? filePath : '<unknown>',
            bytes,
          };
        })
        .sort((a, b) => b.bytes - a.bytes);
      const sizingMs = performance.now() - sizingStart;

      const totalBytes = rows.reduce((sum, r) => sum + Math.max(0, r.bytes), 0);
      setResult({
        mode: 'parsed',
        totalBytes,
        fileCount: rows.length,
        rows,
        fetchMs,
        sizingMs,
        rawFiles: files,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        e,
      );
    } finally {
      setRunning(false);
    }
  };

  /**
   * Streaming variant that NEVER parses the JSON. Uses fetch() directly,
   * reads the response as a byte stream, and counts bytes as they arrive.
   * Memory footprint stays flat regardless of payload size, so this works
   * even on the OOM-causing payload where the parsed variant would crash.
   */
  const runStreaming = async (): Promise<void> => {
    setRunning(true);
    setError(undefined);
    setResult(undefined);
    try {
      const base = depotServerClient.baseUrl;
      if (!base) {
        throw new Error('Depot server baseUrl is not configured');
      }
      const url =
        `${base}/generations/${encodeURIComponent(groupId.trim())}` +
        `/${encodeURIComponent(artifactId.trim())}` +
        `/${encodeURIComponent(versionId.trim())}` +
        `/types/dataSpace-analytics` +
        `?elementPath=${encodeURIComponent(elementPath.trim())}`;

      const fetchStart = performance.now();
      // `credentials: 'include'` mirrors what AbstractServerClient does so
      // we inherit the user's session cookies.
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const contentEncoding =
        response.headers.get('content-encoding') ?? '<none>';
      const compressedHeader = response.headers.get('content-length');
      const compressedBytes = compressedHeader
        ? Number(compressedHeader)
        : undefined;

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable as a stream');
      }
      let streamedBodyBytes = 0;
      let chunk = await reader.read();
      while (!chunk.done) {
        streamedBodyBytes += chunk.value.byteLength;
        chunk = await reader.read();
      }
      const fetchMs = performance.now() - fetchStart;

      setResult({
        mode: 'streamed',
        totalBytes: streamedBodyBytes,
        fileCount: 0,
        rows: [],
        fetchMs,
        sizingMs: 0,
        streamedBodyBytes,
        streamedCompressedBytes: compressedBytes,
        streamedContentEncoding: contentEncoding,
        streamedUrl: url,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        e,
      );
    } finally {
      setRunning(false);
    }
  };

  /**
   * Streaming variant that walks the response with a tiny JSON state
   * machine, recognises top-level array element boundaries, and for each
   * element keeps only:
   *   - its total byte length (from where it started to where it ended)
   *   - its first 64 KB of text (enough to regex out `path`)
   * Content (the large field) is read past and dropped on the fly, so peak
   * heap stays roughly element-bounded, not response-bounded. Works on
   * OOM-causing payloads because we never materialize the full body.
   */
  const runStreamingWithHeaders = async (): Promise<void> => {
    setRunning(true);
    setError(undefined);
    setResult(undefined);
    try {
      const base = depotServerClient.baseUrl;
      if (!base) {
        throw new Error('Depot server baseUrl is not configured');
      }
      const url =
        `${base}/generations/${encodeURIComponent(groupId.trim())}` +
        `/${encodeURIComponent(artifactId.trim())}` +
        `/${encodeURIComponent(versionId.trim())}` +
        `/types/dataSpace-analytics` +
        `?elementPath=${encodeURIComponent(elementPath.trim())}`;

      const fetchStart = performance.now();
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const contentEncoding =
        response.headers.get('content-encoding') ?? '<none>';
      const compressedHeader = response.headers.get('content-length');
      const compressedBytes = compressedHeader
        ? Number(compressedHeader)
        : undefined;

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable as a stream');
      }

      // Cap element header buffer at 64 KB. `StoredFileGeneration.path`
      // and `type` reliably appear before the (potentially huge)
      // `file.content` payload, so 64 KB is overkill but safe.
      const MAX_HEADER_BYTES = 64 * 1024;
      const decoder = new TextDecoder('utf-8');

      let streamedBodyBytes = 0;
      // JSON state machine
      let depth = 0; // brace/bracket depth across all containers
      let inString = false;
      let escape = false;
      let inElement = false; // true while inside a top-level array element
      let elementByteStart = 0;
      let elementHeader = ''; // capped to MAX_HEADER_BYTES per element
      const rows: FileSizeRow[] = [];

      const onElementComplete = (
        startByte: number,
        endByte: number,
        headerText: string,
      ): void => {
        const pathMatch = /"path"\s*:\s*"(?<value>(?:[^"\\]|\\.)*)"/.exec(
          headerText,
        );
        const filePath = pathMatch?.groups?.value ?? '<unknown>';
        rows.push({
          path: elementPath.trim(),
          type: '<n/a>',
          filePath,
          bytes: endByte - startByte,
        });
      };

      let chunk = await reader.read();
      while (!chunk.done) {
        const { value } = chunk;
        const chunkBytes = value.byteLength;
        const chunkText = decoder.decode(value, { stream: true });
        const chunkStartByte = streamedBodyBytes;

        for (let i = 0; i < chunkText.length; i++) {
          const ch = chunkText[i];

          if (inString) {
            if (escape) {
              escape = false;
            } else if (ch === '\\') {
              escape = true;
            } else if (ch === '"') {
              inString = false;
            }
          } else if (ch === '"') {
            inString = true;
          } else if (ch === '{' || ch === '[') {
            if (depth === 1 && ch === '{') {
              // Entering a top-level array element
              inElement = true;
              elementByteStart = chunkStartByte + i; // approximate (UTF-8/16 mismatch is OK for sizing)
              elementHeader = '';
            }
            depth++;
          } else if (ch === '}' || ch === ']') {
            depth--;
            if (depth === 1 && inElement && ch === '}') {
              const elementByteEnd = chunkStartByte + i + 1;
              onElementComplete(
                elementByteStart,
                elementByteEnd,
                elementHeader,
              );
              inElement = false;
              elementHeader = '';
            }
          }

          if (inElement && elementHeader.length < MAX_HEADER_BYTES) {
            elementHeader += ch;
          }
        }
        streamedBodyBytes += chunkBytes;
        chunk = await reader.read();
      }
      const fetchMs = performance.now() - fetchStart;

      rows.sort((a, b) => b.bytes - a.bytes);
      const totalBytes = rows.reduce((sum, r) => sum + Math.max(0, r.bytes), 0);

      setResult({
        mode: 'streamed-headers',
        totalBytes,
        fileCount: rows.length,
        rows,
        fetchMs,
        sizingMs: 0,
        streamedBodyBytes,
        streamedCompressedBytes: compressedBytes,
        streamedContentEncoding: contentEncoding,
        streamedUrl: url,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        e,
      );
    } finally {
      setRunning(false);
    }
  };

  /**
   * Stream the full response straight to a file on disk. Uses the File
   * System Access API (`showSaveFilePicker`) so chunks are flushed to the
   * filesystem as they arrive and the entire body never sits in memory at
   * once — safe for the OOM-causing payload.
   *
   * Falls back to building a Blob and triggering an <a download> click for
   * browsers without the File System Access API. Note: the fallback path
   * DOES hold the full response in memory and will OOM on huge payloads;
   * a warning is logged in that case.
   */
  const runStreamDownload = async (): Promise<void> => {
    setRunning(true);
    setError(undefined);
    setResult(undefined);
    try {
      const base = depotServerClient.baseUrl;
      if (!base) {
        throw new Error('Depot server baseUrl is not configured');
      }
      const url =
        `${base}/generations/${encodeURIComponent(groupId.trim())}` +
        `/${encodeURIComponent(artifactId.trim())}` +
        `/${encodeURIComponent(versionId.trim())}` +
        `/types/dataSpace-analytics` +
        `?elementPath=${encodeURIComponent(elementPath.trim())}`;

      const suggestedName = `dataSpace-analytics_${groupId.trim()}_${artifactId.trim()}_${versionId.trim()}_${elementPath.trim().replace(/::/g, '_')}.json`;

      // File System Access API is Chromium-only as of 2026. Probe before use.
      const showSaveFilePicker = (
        window as unknown as {
          showSaveFilePicker?: (opts?: unknown) => Promise<{
            createWritable: () => Promise<{
              write: (chunk: Uint8Array) => Promise<void>;
              close: () => Promise<void>;
            }>;
          }>;
        }
      ).showSaveFilePicker;

      const fetchStart = performance.now();
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const contentEncoding =
        response.headers.get('content-encoding') ?? '<none>';
      const compressedHeader = response.headers.get('content-length');
      const compressedBytes = compressedHeader
        ? Number(compressedHeader)
        : undefined;

      let streamedBodyBytes = 0;

      if (showSaveFilePicker) {
        // Streaming path — bytes flushed to disk per chunk.
        const handle = await showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: 'JSON file',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        const reader = response.body?.getReader();
        if (!reader) {
          await writable.close();
          throw new Error('Response body is not readable as a stream');
        }
        let chunk = await reader.read();
        while (!chunk.done) {
          await writable.write(chunk.value);
          streamedBodyBytes += chunk.value.byteLength;
          chunk = await reader.read();
        }
        await writable.close();
      } else {
        // Fallback: blob + anchor click. WARNING: holds full body in memory.
        // eslint-disable-next-line no-console
        console.warn(
          '[DataSpaceArtifactInspector] showSaveFilePicker not available; ' +
            'falling back to blob download. This holds the full body in memory.',
        );
        const blob = await response.blob();
        streamedBodyBytes = blob.size;
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      }

      const fetchMs = performance.now() - fetchStart;

      setResult({
        mode: 'streamed',
        totalBytes: streamedBodyBytes,
        fileCount: 0,
        rows: [],
        fetchMs,
        sizingMs: 0,
        streamedBodyBytes,
        streamedCompressedBytes: compressedBytes,
        streamedContentEncoding: contentEncoding,
        streamedUrl: url,
      });
    } catch (e) {
      // AbortError from the user cancelling the save dialog is not a real
      // error — silently no-op.
      if (e instanceof DOMException && e.name === 'AbortError') {
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
      applicationStore.logService.error(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        e,
      );
    } finally {
      setRunning(false);
    }
  };

  const openFullResponseViewer = (): void => {
    if (!result?.rawFiles) {
      return;
    }
    setViewer({
      title: 'Full parsed response (StoredFileGeneration[])',
      content: prettyJson(result.rawFiles),
    });
  };

  const openFileViewer = (index: number): void => {
    const entry = result?.rawFiles?.[index] as
      | {
          path?: string;
          type?: string;
          file?: { path?: string; content?: unknown };
        }
      | undefined;
    if (!entry) {
      return;
    }
    const filePath = entry.file?.path ?? entry.path ?? '<unknown>';
    setViewer({
      title: `File: ${filePath}`,
      content: prettyJson(entry.file?.content),
    });
  };

  return (
    <div
      style={{
        padding: '1.5rem',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#ddd',
        background: '#1e1e1e',
        minHeight: '100vh',
      }}
    >
      <h1 style={{ marginTop: 0 }}>DataSpace Artifact Inspector</h1>
      <p style={{ color: '#aaa', maxWidth: 760 }}>
        Diagnostic tool: fetches the per-element depot analytics endpoint for a
        single DataSpace and reports total uncompressed payload size plus a
        per-file breakdown. Use this to identify oversized partition files that
        may cause Chrome tab OOM.
      </p>

      <h2 style={{ marginTop: '1.5rem', marginBottom: '0.25rem' }}>
        Load inputs from a saved query (optional)
      </h2>
      <p style={{ color: '#888', maxWidth: 760, marginTop: 0 }}>
        Paste a Legend saved query id; we&apos;ll fetch{' '}
        <code>/pure/v1/query/&lt;id&gt;</code> and pre-fill groupId, artifactId,
        versionId, and the dataspace path from the query&apos;s tagged values /
        execution context.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '160px 1fr auto',
          gap: '0.5rem 0.75rem',
          maxWidth: 760,
        }}
      >
        <label htmlFor="ds-savedQueryId">saved query id</label>
        <input
          id="ds-savedQueryId"
          value={savedQueryId}
          onChange={(e) => setSavedQueryId(e.target.value)}
          placeholder="e.g. 65f1c0a8b1c0d20012345678"
          style={inputStyle}
        />
        <button
          type="button"
          onClick={() => {
            loadFromSavedQuery().catch(() => undefined);
          }}
          disabled={loadingQuery || !savedQueryId.trim()}
          style={{
            padding: '0.4rem 0.75rem',
            background: loadingQuery ? '#555' : '#444',
            color: 'white',
            border: '1px solid #666',
            borderRadius: 4,
            cursor: loadingQuery ? 'wait' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {loadingQuery ? 'Loading…' : 'Load'}
        </button>
      </div>
      {queryLoadError && (
        <div
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: '#5a1f1f',
            border: '1px solid #a33',
            borderRadius: 4,
            maxWidth: 760,
          }}
        >
          {queryLoadError}
        </div>
      )}
      {queryLoadInfo && (
        <div
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: '#1f3a1f',
            border: '1px solid #3a6',
            borderRadius: 4,
            maxWidth: 760,
            fontFamily: 'monospace',
            fontSize: '0.85rem',
          }}
        >
          {queryLoadInfo}
        </div>
      )}

      <h2 style={{ marginTop: '1.5rem', marginBottom: '0.25rem' }}>
        Pick from all DataSpaces (optional)
      </h2>
      <p style={{ color: '#888', maxWidth: 760, marginTop: 0 }}>
        Load every DataSpace registered in depot (latest version of each) via{' '}
        <code>
          /classifiers/meta::pure::metamodel::dataSpace::DataSpace?summary=true&amp;latest=true
        </code>
        , then pick one to pre-fill all four inputs.
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          maxWidth: 1000,
          marginBottom: '0.5rem',
        }}
      >
        <button
          type="button"
          onClick={() => {
            loadAllDataSpaces().catch(() => undefined);
          }}
          disabled={loadingDataSpaces}
          style={{
            padding: '0.4rem 0.75rem',
            background: loadingDataSpaces ? '#555' : '#444',
            color: 'white',
            border: '1px solid #666',
            borderRadius: 4,
            cursor: loadingDataSpaces ? 'wait' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {loadingDataSpaces
            ? 'Loading…'
            : dataSpaceOptions.length > 0
              ? `Reload (${dataSpaceOptions.length} loaded)`
              : 'Load all dataspaces'}
        </button>
        <input
          type="text"
          value={dataSpaceFilter}
          onChange={(e) => setDataSpaceFilter(e.target.value)}
          placeholder="filter…"
          disabled={dataSpaceOptions.length === 0}
          style={{ ...inputStyle, flex: '0 0 220px' }}
        />
        <select
          value={selectedDataSpaceKey}
          onChange={(e) => applyDataSpaceOption(e.target.value)}
          disabled={dataSpaceOptions.length === 0}
          style={{
            ...inputStyle,
            flex: 1,
            minWidth: 0,
          }}
        >
          <option value="">
            {dataSpaceOptions.length === 0
              ? '(load dataspaces first)'
              : `Select one of ${filteredDataSpaceOptions.length} dataspace${filteredDataSpaceOptions.length === 1 ? '' : 's'}…`}
          </option>
          {filteredDataSpaceOptions.map((o) => {
            const key = `${o.groupId}:${o.artifactId}:${o.versionId}:${o.path}`;
            return (
              <option key={key} value={key}>
                {o.label}
              </option>
            );
          })}
        </select>
      </div>
      {dataSpacesError && (
        <div
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: '#5a1f1f',
            border: '1px solid #a33',
            borderRadius: 4,
            maxWidth: 1000,
          }}
        >
          {dataSpacesError}
        </div>
      )}

      <h2 style={{ marginTop: '1.5rem', marginBottom: '0.25rem' }}>Inputs</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '160px 1fr',
          gap: '0.5rem 0.75rem',
          maxWidth: 760,
        }}
      >
        <label htmlFor="ds-groupId">groupId</label>
        <input
          id="ds-groupId"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          placeholder="com.groupId"
          style={inputStyle}
        />
        <label htmlFor="ds-artifactId">artifactId</label>
        <input
          id="ds-artifactId"
          value={artifactId}
          onChange={(e) => setArtifactId(e.target.value)}
          placeholder="my-artifactId"
          style={inputStyle}
        />
        <label htmlFor="ds-versionId">versionId</label>
        <input
          id="ds-versionId"
          value={versionId}
          onChange={(e) => setVersionId(e.target.value)}
          placeholder="1.0.0 or master-SNAPSHOT"
          style={inputStyle}
        />
        <label htmlFor="ds-elementPath">
          elementPath <span style={{ color: '#e88' }}>*</span>
        </label>
        <input
          id="ds-elementPath"
          value={elementPath}
          onChange={(e) => setElementPath(e.target.value)}
          placeholder="com::path::to::MyDataSpace (required)"
          style={{
            ...inputStyle,
            borderColor: elementPathMissing ? '#a33' : '#444',
          }}
          aria-required="true"
          aria-invalid={elementPathMissing}
        />
      </div>
      {elementPathMissing && (
        <div
          style={{
            marginTop: '0.5rem',
            color: '#e88',
            fontSize: '0.85rem',
          }}
        >
          elementPath is required — this endpoint fetches files for a single
          DataSpace.
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          run().catch(() => undefined);
        }}
        disabled={!canRun}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          background: running ? '#555' : '#0066cc',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: running ? 'wait' : 'pointer',
        }}
      >
        {running ? 'Fetching…' : 'Fetch and inspect (parsed)'}
      </button>
      <button
        type="button"
        onClick={() => {
          runStreaming().catch(() => undefined);
        }}
        disabled={!canRun}
        title="Streams the response and counts bytes without parsing. Survives OOM-causing payloads."
        style={{
          marginTop: '1rem',
          marginLeft: '0.5rem',
          padding: '0.5rem 1rem',
          background: running ? '#555' : '#444',
          color: 'white',
          border: '1px solid #666',
          borderRadius: 4,
          cursor: running ? 'wait' : 'pointer',
        }}
      >
        {running ? 'Streaming…' : 'Measure raw size only (streaming)'}
      </button>
      <button
        type="button"
        onClick={() => {
          runStreamingWithHeaders().catch(() => undefined);
        }}
        disabled={!canRun}
        title="Streams the response with a tiny JSON state machine, extracts each file's path and total byte length, drops the content as it flies past. Survives OOM-causing payloads AND gives per-file breakdown."
        style={{
          marginTop: '1rem',
          marginLeft: '0.5rem',
          padding: '0.5rem 1rem',
          background: running ? '#555' : '#2a6',
          color: 'white',
          border: '1px solid #2a6',
          borderRadius: 4,
          cursor: running ? 'wait' : 'pointer',
        }}
      >
        {running ? 'Streaming…' : 'Stream + per-file breakdown (no content)'}
      </button>
      <button
        type="button"
        onClick={() => {
          runStreamDownload().catch(() => undefined);
        }}
        disabled={!canRun}
        title="Stream the full response straight to a file on disk via the File System Access API. Body never sits in memory. Chromium-only for the streaming path; falls back to an in-memory blob download on other browsers."
        style={{
          marginTop: '1rem',
          marginLeft: '0.5rem',
          padding: '0.5rem 1rem',
          background: running ? '#555' : '#963',
          color: 'white',
          border: '1px solid #963',
          borderRadius: 4,
          cursor: running ? 'wait' : 'pointer',
        }}
      >
        {running ? 'Downloading…' : 'Download full response to file'}
      </button>

      {error && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: '#5a1f1f',
            border: '1px solid #a33',
            borderRadius: 4,
            whiteSpace: 'pre-wrap',
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '1.5rem' }}>
          <h2 style={{ marginBottom: '0.25rem' }}>
            Summary (
            {result.mode === 'streamed'
              ? 'streaming mode — size only'
              : result.mode === 'streamed-headers'
                ? 'streaming mode — per-file headers'
                : 'parsed mode'}
            )
          </h2>
          <table style={{ borderCollapse: 'collapse', marginBottom: '1rem' }}>
            <tbody>
              {result.mode === 'streamed' ||
              result.mode === 'streamed-headers' ? (
                <>
                  <Row label="URL" value={result.streamedUrl ?? '<unknown>'} />
                  <Row
                    label="Content-Encoding"
                    value={result.streamedContentEncoding ?? '<none>'}
                  />
                  <Row
                    label="Content-Length header"
                    value={
                      result.streamedCompressedBytes !== undefined
                        ? `${result.streamedCompressedBytes} bytes (${fmtMB(result.streamedCompressedBytes)})`
                        : '<not set>'
                    }
                  />
                  <Row
                    label="Streamed body (decoded by browser)"
                    value={`${result.streamedBodyBytes ?? 0} bytes (${fmtMB(result.streamedBodyBytes ?? 0)})`}
                  />
                  <Row
                    label="Fetch + drain time"
                    value={`${result.fetchMs.toFixed(0)} ms`}
                  />
                  {result.mode === 'streamed-headers' && (
                    <>
                      <Row
                        label="Element count"
                        value={String(result.fileCount)}
                      />
                      {result.fileCount > 0 && (
                        <Row
                          label="Mean element size"
                          value={fmtMB(result.totalBytes / result.fileCount)}
                        />
                      )}
                      {result.rows[0] && (
                        <Row
                          label="Largest element"
                          value={`${fmtMB(result.rows[0].bytes)} — ${result.rows[0].filePath} (${result.rows[0].type}) [${result.rows[0].path}]`}
                        />
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <Row label="File count" value={String(result.fileCount)} />
                  <Row
                    label="Total uncompressed"
                    value={fmtMB(result.totalBytes)}
                  />
                  <Row
                    label="Total uncompressed (bytes)"
                    value={String(result.totalBytes)}
                  />
                  <Row
                    label="Depot fetch time"
                    value={`${result.fetchMs.toFixed(0)} ms`}
                  />
                  <Row
                    label="Sizing walk time"
                    value={`${result.sizingMs.toFixed(0)} ms`}
                  />
                  {result.fileCount > 0 && (
                    <Row
                      label="Mean file size"
                      value={fmtMB(result.totalBytes / result.fileCount)}
                    />
                  )}
                  {result.rows[0] && (
                    <Row
                      label="Largest file"
                      value={`${fmtMB(result.rows[0].bytes)} — ${result.rows[0].filePath} [${result.rows[0].path}]`}
                    />
                  )}
                </>
              )}
            </tbody>
          </table>

          {result.mode === 'parsed' && result.rawFiles && (
            <button
              type="button"
              onClick={openFullResponseViewer}
              style={{
                padding: '0.4rem 0.9rem',
                background: '#444',
                color: 'white',
                border: '1px solid #666',
                borderRadius: 4,
                cursor: 'pointer',
                marginBottom: '1rem',
              }}
              title="Pretty-print the full StoredFileGeneration[] response in a foldable JSON viewer."
            >
              View full JSON response
            </button>
          )}

          <h2 style={{ marginBottom: '0.25rem' }}>
            Per-file breakdown (descending)
          </h2>
          {result.mode === 'streamed' ? (
            <p style={{ color: '#aaa' }}>
              Per-file breakdown is only available in parsed or streamed-headers
              mode. Raw streaming mode only measures total bytes.
            </p>
          ) : (
            <table
              style={{
                borderCollapse: 'collapse',
                width: '100%',
                maxWidth: 1200,
              }}
            >
              <thead>
                <tr style={{ background: '#2a2a2a' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>DataSpace path</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>File</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Size</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>% of total</th>
                  {result.mode === 'parsed' && (
                    <th style={{ ...thStyle, textAlign: 'right' }}>View</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r, i) => {
                  // In parsed mode, the per-row index in the descending
                  // size table doesn't match the position in `rawFiles`.
                  // Match by the inner `file.path` (the actual file path) —
                  // the outer `path` field on `StoredFileGeneration` is the
                  // element path and is the same for every row.
                  const rawIndex =
                    result.mode === 'parsed' && result.rawFiles
                      ? result.rawFiles.findIndex(
                          (f) =>
                            (f as { file?: { path?: unknown } }).file?.path ===
                            r.filePath,
                        )
                      : -1;
                  return (
                    <tr
                      key={`${r.path}::${r.type}::${r.filePath}::${r.bytes}`}
                      style={{
                        background: i % 2 === 0 ? '#222' : '#1a1a1a',
                      }}
                    >
                      <td style={tdStyle}>{i + 1}</td>
                      <td style={tdStyle}>{r.path}</td>
                      <td style={{ ...tdStyle, color: '#9cf' }}>{r.type}</td>
                      <td style={{ ...tdStyle, color: '#fc9' }}>
                        {r.filePath}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {fmtMB(r.bytes)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {result.totalBytes
                          ? `${((r.bytes / result.totalBytes) * 100).toFixed(1)}%`
                          : '—'}
                      </td>
                      {result.mode === 'parsed' && (
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          {rawIndex >= 0 ? (
                            <button
                              type="button"
                              onClick={() => openFileViewer(rawIndex)}
                              style={{
                                padding: '0.15rem 0.5rem',
                                background: '#345',
                                color: 'white',
                                border: '1px solid #567',
                                borderRadius: 3,
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                              }}
                              title="Open this file's content in the JSON viewer."
                            >
                              view
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {viewer && (
        <JsonViewerModal
          title={viewer.title}
          content={viewer.content}
          onClose={() => setViewer(undefined)}
        />
      )}
    </div>
  );
});
