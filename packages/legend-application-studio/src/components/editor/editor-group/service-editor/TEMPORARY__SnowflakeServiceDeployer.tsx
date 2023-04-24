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

import { observer } from 'mobx-react-lite';
import { ServiceEditorState } from '../../../../stores/editor/editor-state/element-editor-state/service/ServiceEditorState.js';
import { useEditorStore } from '../../EditorStoreProvider.js';
import { useApplicationStore } from '@finos/legend-application';
import { flowResult } from 'mobx';
import { PanelLoadingIndicator } from '@finos/legend-art';
import type { PlainObject } from '@finos/legend-shared';

const tabulateResult = (result: PlainObject): React.ReactNode => (
  <table className="table">
    <thead>
      <tr>
        <th className="table__cell--left">Key</th>
        <th className="table__cell--left">Value</th>
      </tr>
    </thead>
    <tbody>
      {Object.entries(result).map(([key, value], rowIdx) => (
        // eslint-disable-next-line react/no-array-index-key
        <tr key={rowIdx}>
          <td className="table__cell--left">{key}</td>
          <td className="table__cell--left">{JSON.stringify(value)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const TEMPORARY__SnowflakeServiceDeployer = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const serviceState =
    editorStore.tabManagerState.getCurrentEditorState(ServiceEditorState);
  const deploymentState =
    serviceState.TEMPORARY__snowflakeServiceRegistrationState;
  const deploy = (): void => {
    flowResult(deploymentState.deploy()).catch(
      applicationStore.alertUnhandledError,
    );
  };
  const tabulatedResult = deploymentState.result
    ? tabulateResult(deploymentState.result)
    : undefined;

  return (
    <div className="snowflake-service-deployer">
      <PanelLoadingIndicator
        isLoading={deploymentState.deploymentState.isInProgress}
      />
      {tabulatedResult && <>{tabulatedResult}</>}
      {!tabulatedResult && (
        <button
          className="btn btn--dark"
          tabIndex={-1}
          onClick={deploy}
          disabled={deploymentState.deploymentState.isInProgress}
        >
          Deploy Snowflake Service
        </button>
      )}
    </div>
  );
});
