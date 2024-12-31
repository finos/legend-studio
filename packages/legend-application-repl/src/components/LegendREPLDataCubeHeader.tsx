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

import { FormButton, type DataCubeState } from '@finos/legend-data-cube';
import { observer } from 'mobx-react-lite';
import { LegendREPLDataCubeSource } from '../stores/LegendREPLDataCubeSource.js';
import { useLegendREPLBaseStore } from './LegendREPLFramworkProvider.js';

export const LegendREPLDataCubeHeader = observer(
  (props: { dataCube: DataCubeState }) => {
    const { dataCube } = props;
    const store = useLegendREPLBaseStore();

    if (!dataCube.view.isSourceProcessed || !store.queryServerBaseUrl) {
      return null;
    }

    const isPublishAllowed =
      dataCube.view.source instanceof LegendREPLDataCubeSource &&
      dataCube.view.source.isPersistenceSupported &&
      // eslint-disable-next-line no-process-env
      (process.env.NODE_ENV === 'development' || !dataCube.view.source.isLocal);

    return (
      <div className="flex h-full items-center">
        <FormButton
          compact={true}
          disabled={!isPublishAllowed || store.publishState.isInProgress}
          onClick={() => {
            store
              .publishDataCube(dataCube)
              .catch((error) => dataCube.engine.logUnhandledError(error));
          }}
        >
          Publish
        </FormButton>
      </div>
    );
  },
);
