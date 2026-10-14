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

import { describe, expect, test } from '@jest/globals';
import {
  FunctionSource,
  IngestDatasetSource,
  RelationalTableSource,
} from '@finos/legend-cube';
import {
  TEST__createCubeApplicationStore,
  TEST__createCubeHost,
} from '../../__test-utils__/CubeTestApplication.js';
import { createFakeCubeEngine } from '../../__test-utils__/FakeCubeEngine.js';
import { createFakeCubeIngestCatalog } from '../../__test-utils__/FakeCubeIngestCatalog.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { isCubeSampleDataOffered } from '../CubeHost.js';
import { LocalModelCatalog } from '../LocalModelCatalog.js';
import { CubeSourcePickerTabKey } from '../source-picker/CubeSourcePickerTab.js';

/** A host as Studio's: an ingest catalog, and no sample data */
const studioLikeState = (): CubeEditorState => {
  const { engine } = createFakeCubeEngine();
  return new CubeEditorState({
    applicationStore: TEST__createCubeApplicationStore(),
    engine,
    modelCatalog: new LocalModelCatalog(engine),
    ingestCatalog: createFakeCubeIngestCatalog().catalog,
    offersSampleData: false,
  });
};

describe('A host that offers no sample data, as Studio', () => {
  test('Leaves out the Sample Data tab, and the palette offers only the sources its tabs read', () => {
    const state = studioLikeState();
    expect(isCubeSampleDataOffered(state.host)).toBe(false);
    expect(state.sourcePicker.tabs.map((tab) => tab.key)).toEqual([
      CubeSourcePickerTabKey.INGEST,
    ]);
    expect(state.offeredSources.map((definition) => definition.type)).toEqual([
      IngestDatasetSource.TYPE,
    ]);
  });

  test('Opens the source dialog on its one tab, with no tab to choose', () => {
    const state = studioLikeState();
    state.sourcePicker.openToChoose();
    expect(state.sourcePicker.isOpen).toBe(true);
    expect(state.sourcePicker.isChoosingTab).toBe(false);
    expect(state.sourcePicker.activeTab.key).toBe(
      CubeSourcePickerTabKey.INGEST,
    );
  });

  test("Keeps tables and functions for a host that says nothing, as Legend Query's", () => {
    const { host } = TEST__createCubeHost();
    const state = new CubeEditorState(host);
    expect(isCubeSampleDataOffered(host)).toBe(true);
    const offered = state.offeredSources.map((definition) => definition.type);
    expect(offered).toContain(RelationalTableSource.TYPE);
    expect(offered).toContain(FunctionSource.TYPE);
  });
});
