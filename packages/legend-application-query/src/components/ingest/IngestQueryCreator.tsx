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

import { observer, useLocalObservable } from 'mobx-react-lite';
import { parseGAVCoordinates } from '@finos/legend-storage';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  useLegendQueryApplicationStore,
  useLegendQueryBaseStore,
} from '../LegendQueryFrameworkProvider.js';
import {
  INGEST_QUERY_CREATOR_ROUTE_PATTERN_TOKEN,
  type IngestQueryCreatorPathParams,
} from '../../__lib__/LegendQueryNavigation.js';
import { IngestQueryCreatorStore } from '../../stores/ingest/IngestQueryCreatorStore.js';
import { QueryEditorStoreContext } from '../QueryEditorStoreProvider.js';
import { QueryEditor } from '../QueryEditor.js';
import { useParams } from '@finos/legend-application/browser';

/**
 * Route handler for `LEGEND_QUERY_ROUTE_PATTERN.INGEST_QUERY`.
 *
 * Parses `gav`, `ingestDefinitionPath` and `dataSet` from the URL, builds an
 * {@link IngestQueryCreatorStore}, and renders the shared {@link QueryEditor}
 * against it. The store fetches only the ingest definition entity from Depot
 * — no full graph build.
 */
export const IngestQueryCreator = observer(() => {
  const applicationStore = useLegendQueryApplicationStore();
  const baseStore = useLegendQueryBaseStore();
  const params = useParams<IngestQueryCreatorPathParams>();

  const gav = guaranteeNonNullable(
    params[INGEST_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.GAV],
  );
  const ingestDefinitionPath = guaranteeNonNullable(
    params[INGEST_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.INGEST_DEFINITION_PATH],
  );
  const dataSet = guaranteeNonNullable(
    params[INGEST_QUERY_CREATOR_ROUTE_PATTERN_TOKEN.DATA_SET],
  );
  const { groupId, artifactId, versionId } = parseGAVCoordinates(gav);

  const store = useLocalObservable(
    () =>
      new IngestQueryCreatorStore(
        applicationStore,
        baseStore.depotServerClient,
        groupId,
        artifactId,
        versionId,
        ingestDefinitionPath,
        dataSet,
      ),
  );

  return (
    <QueryEditorStoreContext.Provider value={store}>
      <QueryEditor />
    </QueryEditorStoreContext.Provider>
  );
});
