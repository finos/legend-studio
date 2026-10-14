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

import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { lazy, Suspense } from 'react';
import { useEditorStore } from '../EditorStoreProvider.js';

// Loaded on the first opening, so Cube and its host stay out of Studio's
// main bundle, as Legend Query loads its Cube page (`LegendQueryCubeRoute`)
const LazyEmbeddedCubeEditor = lazy(() =>
  import('./EmbeddedCubeEditor.js').then((module) => ({
    default: module.EmbeddedCubeEditor,
  })),
);

/**
 * Legend Cube, full screen over the editor, while it is open on an ingest
 * definition (Create MatView with Cube); nothing otherwise
 */
export const EmbeddedCube = observer(() => {
  const { embeddedCubeState } = useEditorStore();
  const { ingest } = embeddedCubeState;
  if (!ingest) {
    return null;
  }
  return (
    <Suspense
      fallback={
        <CubesLoadingIndicator isLoading={true}>
          <CubesLoadingIndicatorIcon />
        </CubesLoadingIndicator>
      }
    >
      <LazyEmbeddedCubeEditor
        embeddedCubeState={embeddedCubeState}
        ingest={ingest}
      />
    </Suspense>
  );
});
