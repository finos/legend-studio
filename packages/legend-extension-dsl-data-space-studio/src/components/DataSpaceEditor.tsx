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

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useEditorStore } from '@finos/legend-application-studio';
import {
  EyeIcon,
  WandIcon,
  Panel,
  PanelContent,
  PanelHeader,
  Dialog,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  CustomSelectorInput,
} from '@finos/legend-art';
import {
  DataSpaceEditorState,
  onConvertDataSpaceToDataProduct,
  onMergeDataSpaceToDataProduct,
} from '../stores/DataSpaceEditorState.js';
import { DataSpaceGeneralEditor } from './DataSpaceGeneralEditor/DataSpaceGeneralEditor.js';
import { DataSpacePreviewState } from '../stores/DataSpacePreviewState.js';
import { flowResult } from 'mobx';
import {
  isStubbed_PackageableElement,
  type DataProduct,
} from '@finos/legend-graph';
import { DSL_DATA_SPACE_LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../__lib__/DSL_DataSpace_LegendStudioDocumentation.js';
import { useApplicationNavigationContext } from '@finos/legend-application';

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
    const stubDefault = Boolean(
      isStubbed_PackageableElement(
        dataSpace.defaultExecutionContext.defaultRuntime.value,
      ) &&
        isStubbed_PackageableElement(
          dataSpace.defaultExecutionContext.mapping.value,
        ),
    );
    return Boolean(!stubDefault);
  };

  const previewDataSpace = (): void => {
    flowResult(
      dataSpacePreviewState.previewDataSpace(dataSpaceState.dataSpace),
    ).catch(editorStore.applicationStore.alertUnhandledError);
  };

  const convertDataSpace = (): void => {
    flowResult(
      onConvertDataSpaceToDataProduct(dataSpace, editorStore, dataSpaceState),
    ).catch(editorStore.applicationStore.alertUnhandledError);
  };

  const eligibleMergeTargets =
    editorStore.graphManagerState.graph.ownDataProducts.filter(
      (dp) => dp.nativeModelAccess === undefined,
    );

  const mergeDataSpace = (targetDataProduct: DataProduct): void => {
    flowResult(
      onMergeDataSpaceToDataProduct(
        dataSpace,
        targetDataProduct,
        editorStore,
        dataSpaceState,
      ),
    ).catch(editorStore.applicationStore.alertUnhandledError);
  };

  const [showConvertModal, setShowConvertModal] = useState(false);

  const modeOptions: { label: string; value: string }[] = [
    { label: 'Merge', value: 'merge' },
    { label: 'Create', value: 'create' },
  ];

  const [selectedMode, setSelectedMode] = useState<{
    label: string;
    value: string;
  } | null>(modeOptions[0] ?? null);

  const mergeTargetOptions = eligibleMergeTargets.map((dp) => ({
    label: dp.path,
    value: dp,
  }));

  const [selectedMergeTarget, setSelectedMergeTarget] = useState<{
    label: string;
    value: DataProduct;
  } | null>(mergeTargetOptions[0] ?? null);

  const onConvertButtonClick = (): void => {
    if (eligibleMergeTargets.length === 0) {
      convertDataSpace();
      return;
    }
    setSelectedMode(modeOptions[0] ?? null);
    setSelectedMergeTarget(mergeTargetOptions[0] ?? null);
    setShowConvertModal(true);
  };

  const closeConvertModal = (): void => setShowConvertModal(false);

  const handleConvertConfirm = (): void => {
    closeConvertModal();
    if (selectedMode?.value === 'merge' && selectedMergeTarget) {
      mergeDataSpace(selectedMergeTarget.value);
    } else {
      convertDataSpace();
    }
  };

  useApplicationNavigationContext(
    DSL_DATA_SPACE_LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.DATA_SPACE_EDITOR,
  );

  return (
    <Panel className="dataSpace-editor">
      <PanelHeader
        title="Data Product"
        titleContent={dataSpaceState.dataSpace.name}
        darkMode={true}
        isReadOnly={dataSpaceState.isReadOnly}
      />
      <PanelHeader title="General" darkMode={true}>
        <div className="panel__header__actions">
          <div className="btn__dropdown-combo btn__dropdown-combo--primary">
            <button
              className="btn__dropdown-combo__label"
              onClick={onConvertButtonClick}
              title="Convert to Data Product"
              tabIndex={-1}
              style={{ width: 'auto', whiteSpace: 'nowrap' }}
            >
              <WandIcon className="btn__dropdown-combo__label__icon" />
              <div className="btn__dropdown-combo__label__title">
                Convert to DataProduct
              </div>
            </button>
          </div>
          <div className="btn__dropdown-combo btn__dropdown-combo--primary">
            <button
              className="btn__dropdown-combo__label"
              onClick={previewDataSpace}
              title="Preview Data Product"
              tabIndex={-1}
              disabled={!validPreviewState()}
            >
              <EyeIcon className="btn__dropdown-combo__label__icon" />
              <div className="btn__dropdown-combo__label__title">Preview</div>
            </button>
          </div>
        </div>
      </PanelHeader>

      <Dialog open={showConvertModal} onClose={closeConvertModal}>
        <Modal darkMode={true}>
          <ModalHeader title="Convert to Data Product" />
          <ModalBody>
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Mode
              </div>
              <CustomSelectorInput
                options={modeOptions}
                onChange={(val: { label: string; value: string } | null) => {
                  if (val) {
                    setSelectedMode(val);
                    if (val.value === 'merge') {
                      setSelectedMergeTarget(mergeTargetOptions[0] ?? null);
                    }
                  }
                }}
                value={selectedMode}
                darkMode={true}
              />
            </div>
            {selectedMode?.value === 'merge' && (
              <div className="panel__content__form__section">
                <div className="panel__content__form__section__header__label">
                  Target Data Product
                </div>
                <CustomSelectorInput
                  options={mergeTargetOptions}
                  onChange={(
                    val: { label: string; value: DataProduct } | null,
                  ) => {
                    setSelectedMergeTarget(val);
                  }}
                  value={selectedMergeTarget}
                  darkMode={true}
                />
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              text="Cancel"
              onClick={closeConvertModal}
              type="secondary"
            />
            <ModalFooterButton
              text={selectedMode?.value === 'merge' ? 'Merge' : 'Create'}
              onClick={handleConvertConfirm}
              disabled={selectedMode?.value === 'merge' && !selectedMergeTarget}
            />
          </ModalFooter>
        </Modal>
      </Dialog>

      <PanelContent>
        <DataSpaceGeneralEditor />
      </PanelContent>
    </Panel>
  );
});
