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
import {
  getElementIcon,
  useEditorStore,
} from '@finos/legend-application-studio';
import {
  clsx,
  CheckCircleIcon,
  EyeIcon,
  LockIcon,
  Panel,
  PanelContent,
} from '@finos/legend-art';
import { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';
import { DataSpaceGeneralEditor } from './DataSpaceGeneralEditor/DataSpaceGeneralEditor.js';
import { DataSpacePreviewState } from '../stores/DataSpacePreviewState.js';
import { flowResult } from 'mobx';
import { useEffect } from 'react';
import { isStubbed_PackageableElement } from '@finos/legend-graph';
import { resolveExecutionContextMapping } from '@finos/legend-extension-dsl-data-space/graph';
import { DSL_DATA_SPACE_LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../__lib__/DSL_DataSpace_LegendStudioDocumentation.js';
import { useApplicationNavigationContext } from '@finos/legend-application';

const DataSpaceEditorHeader = observer(
  (props: {
    dataSpaceState: DataSpaceEditorState;
    canPreview: boolean;
    onPreview: () => void;
  }) => {
    const { dataSpaceState, canPreview, onPreview } = props;
    const editorStore = useEditorStore();
    const dataSpace = dataSpaceState.dataSpace;
    const statuses = [
      dataSpaceState.isVerified && {
        label: 'Verified',
        kind: 'verified',
        title: 'Marked as verified',
      },
      dataSpaceState.isInDevelopment && {
        label: 'In development',
        kind: 'development',
        title: 'Marked as still in development',
      },
      dataSpaceState.isExternal && {
        label: 'External',
        kind: 'external',
        title: 'Marked as externally sourced',
      },
      dataSpaceState.deprecationNotice && {
        label: 'Deprecated',
        kind: 'deprecated',
        title: dataSpaceState.deprecationNotice,
      },
    ].filter(
      (status): status is { label: string; kind: string; title: string } =>
        Boolean(status),
    );

    return (
      <div className="dataSpace-editor-header">
        <div className="dataSpace-editor-header__icon">
          {getElementIcon(dataSpace, editorStore)}
        </div>
        <div className="dataSpace-editor-header__title">
          <div className="dataSpace-editor-header__name">
            <span>
              {dataSpace.title?.trim() ? dataSpace.title : dataSpace.name}
            </span>
            {statuses.map((status) => (
              <span
                key={status.kind}
                className={clsx(
                  'dataSpace-editor-header__status',
                  `dataSpace-editor-header__status--${status.kind}`,
                )}
                title={status.title}
              >
                {status.kind === 'verified' && <CheckCircleIcon />}
                {status.label}
              </span>
            ))}
            {dataSpaceState.isReadOnly && (
              <span
                className="dataSpace-editor-header__status"
                title="This data space is read-only"
              >
                <LockIcon />
                Read-only
              </span>
            )}
          </div>
          <div className="dataSpace-editor-header__path" title={dataSpace.path}>
            Data space · {dataSpace.path}
          </div>
        </div>
        <button
          className="dataSpace-editor-header__preview-btn"
          onClick={onPreview}
          title="Preview the data space as people will see it"
          tabIndex={-1}
          disabled={!canPreview}
        >
          <EyeIcon />
          Preview
        </button>
      </div>
    );
  },
);

export const DataSpaceEditor = observer(() => {
  const editorStore = useEditorStore();

  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);

  const dataSpace = dataSpaceState.dataSpace;

  const dataSpacePreviewState =
    DataSpacePreviewState.retrieveNullableState(editorStore);
  if (!dataSpacePreviewState) {
    return null;
  }

  const validPreviewState = (): boolean => {
    if (!dataSpace.executionContexts?.length) {
      return true;
    }
    const ec =
      dataSpace.defaultExecutionContext ?? dataSpace.executionContexts[0];
    if (!ec) {
      return false;
    }
    const resolvedMapping = resolveExecutionContextMapping(ec);
    if (!resolvedMapping) {
      return false;
    }
    const mappingIsStub = isStubbed_PackageableElement(resolvedMapping);
    const runtimeIsStub =
      ec.defaultRuntime !== undefined &&
      isStubbed_PackageableElement(ec.defaultRuntime.value);
    return !mappingIsStub && !runtimeIsStub;
  };

  const previewDataSpace = (): void => {
    flowResult(
      dataSpacePreviewState.previewDataSpace(dataSpaceState.dataSpace),
    ).catch(editorStore.applicationStore.alertUnhandledError);
  };

  useApplicationNavigationContext(
    DSL_DATA_SPACE_LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.DATA_SPACE_EDITOR,
  );

  useEffect(() => {
    flowResult(dataSpaceState.loadRelatedDataSpaces()).catch(
      editorStore.applicationStore.alertUnhandledError,
    );
  }, [dataSpaceState, editorStore]);

  // Studio observes the graph in the background after loading it. Remount the header once that
  // is done, so it reads, and tracks, the statuses from the observed data space
  const isGraphObserved =
    editorStore.changeDetectionState.graphObserveState.hasSucceeded;

  return (
    <Panel className="dataSpace-editor">
      <DataSpaceEditorHeader
        key={isGraphObserved ? 'observed' : 'not-observed'}
        dataSpaceState={dataSpaceState}
        canPreview={validPreviewState()}
        onPreview={previewDataSpace}
      />

      <PanelContent>
        <DataSpaceGeneralEditor />
      </PanelContent>
    </Panel>
  );
});
