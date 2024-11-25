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

import { useApplicationStore } from '@finos/legend-application';
import {
  MenuContentItem,
  BlankPanelContent,
  TimesCircleIcon,
  PanelLoadingIndicator,
  Dialog,
  TimesIcon,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalHeaderActions,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEditorStore } from '@finos/legend-application-studio';
import type { DataSpace } from '@finos/legend-extension-dsl-data-space/graph';
import { DataSpacePreviewState } from '../stores/DataSpacePreviewState.js';
import { DataSpaceViewer } from '@finos/legend-extension-dsl-data-space/application';

export const DataSpacePreviewAction = observer(
  (props: { dataSpace: DataSpace }) => {
    const { dataSpace } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const dataSpacePreviewState =
      DataSpacePreviewState.retrieveNullableState(editorStore);
    if (!dataSpacePreviewState) {
      return null;
    }

    const previewDataSpace = (): void => {
      flowResult(dataSpacePreviewState.previewDataSpace(dataSpace)).catch(
        applicationStore.alertUnhandledError,
      );
    };

    return (
      <MenuContentItem onClick={previewDataSpace}>Preview</MenuContentItem>
    );
  },
);

export const DataSpacePreviewDialog = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = editorStore.applicationStore;
  const dataSpacePreviewState =
    DataSpacePreviewState.retrieveNullableState(editorStore);
  if (!dataSpacePreviewState) {
    return null;
  }

  const onClose = (): void => {
    dataSpacePreviewState.setDataSpace(undefined);
  };

  return (
    <Dialog
      open={Boolean(dataSpacePreviewState.dataSpace)}
      onClose={onClose}
      classes={{
        root: 'editor-modal__root-container',
        container: 'editor-modal__container',
        paper:
          'editor-modal__content data-space-preview__dialog__container__content',
      }}
    >
      <Modal
        darkMode={
          !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        }
        className="editor-modal data-space-preview__dialog"
      >
        <ModalHeader className="data-space-preview__dialog__header">
          <ModalTitle title="Preview Data Product" />
          <ModalHeaderActions>
            <button
              className="modal__header__action"
              title="Close"
              onClick={onClose}
            >
              <TimesIcon />
            </button>
          </ModalHeaderActions>
        </ModalHeader>
        <div className="data-space-preview__dialog__content">
          <PanelLoadingIndicator
            isLoading={dataSpacePreviewState.loadDataSpaceState.isInProgress}
          />
          {dataSpacePreviewState.dataSpaceViewerState && (
            <DataSpaceViewer
              dataSpaceViewerState={dataSpacePreviewState.dataSpaceViewerState}
            />
          )}
          {!dataSpacePreviewState.dataSpaceViewerState && (
            <>
              {dataSpacePreviewState.loadDataSpaceState.isInProgress && (
                <BlankPanelContent>
                  {dataSpacePreviewState.loadDataSpaceState.message}
                </BlankPanelContent>
              )}
              {dataSpacePreviewState.loadDataSpaceState.hasFailed && (
                <BlankPanelContent>
                  <div className="data-space-preview__dialog__content--failed">
                    <div className="data-space-preview__dialog__content--failed__icon">
                      <TimesCircleIcon />
                    </div>
                    <div className="data-space-preview__dialog__content--failed__text">
                      {`Can't load data product`}
                    </div>
                  </div>
                </BlankPanelContent>
              )}
            </>
          )}
        </div>
      </Modal>
    </Dialog>
  );
});
