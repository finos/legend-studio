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

import React, { useEffect, useRef } from 'react';
import perspective, { init_server, init_client } from '@finos/perspective';
import '@finos/perspective-viewer';
import '@finos/perspective-viewer-datagrid';

// Initialize perspective WASM modules from CDN to avoid local Webpack packaging issues
init_server(
  'https://unpkg.com/@finos/perspective@3.8.0/dist/wasm/perspective-server.wasm',
);
init_client(
  'https://unpkg.com/@finos/perspective@3.8.0/dist/wasm/perspective-js.wasm',
);

interface PerspectiveViewerElement extends HTMLElement {
  load(table: any): Promise<void>;
}

export const MappingExecutionPerspectiveResultPanel: React.FC<{
  data: string;
}> = ({ data }) => {
  const viewerRef = useRef<PerspectiveViewerElement>(null);

  useEffect(() => {
    let worker: any;
    let table: any;

    const initPerspective = async () => {
      if (!viewerRef.current) return;
      try {
        worker = await (perspective as any).worker();
        let parsedData: any;
        try {
          parsedData = JSON.parse(data);
          // If the data is nested under a common key (e.g. values, results), extract it
          if (
            parsedData &&
            !Array.isArray(parsedData) &&
            typeof parsedData === 'object'
          ) {
            const keys = Object.keys(parsedData);
            for (const key of keys) {
              if (Array.isArray(parsedData[key])) {
                parsedData = parsedData[key];
                break;
              }
            }
          }
          if (!Array.isArray(parsedData)) {
            parsedData = [parsedData];
          }
        } catch (e) {
          parsedData = [{ raw_result: data }];
        }

        table = await worker.table(parsedData);
        await viewerRef.current.load(table);
      } catch (err) {
        console.error('Error loading Perspective:', err);
      }
    };

    initPerspective();

    return () => {
      if (table) table.delete();
      if (worker) worker.terminate();
    };
  }, [data]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex' }}>
      {/* @ts-ignore */}
      <perspective-viewer ref={viewerRef} style={{ flex: 1 }} />
    </div>
  );
};
