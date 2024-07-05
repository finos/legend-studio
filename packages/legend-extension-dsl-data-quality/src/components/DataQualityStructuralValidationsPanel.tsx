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
  Dialog,
  ModalBody,
  ModalFooter,
  Modal,
  ModalFooterButton,
  ModalHeader,
  TreeView,
} from '@finos/legend-art';
import type { DataQualityState } from './states/DataQualityState.js';
import {
  DataQualityConstraintsTreeNodeContainer,
  getQueryBuilderExplorerTreeNodeSortRank,
} from './DataQualityConstraintsSelection.js';
import { DataQualityGraphFetchTreeNodeData } from './utils/DataQualityGraphFetchTreeUtil.js';

export const DataQualityStructuralValidationsPanel = observer(
  (props: { dataQualityState: DataQualityState }) => {
    const { dataQualityState } = props;
    const { structuralValidationsGraphFetchTreeState } = dataQualityState;
    const structureValidationsTree =
      structuralValidationsGraphFetchTreeState.treeData;
    if (!structureValidationsTree) {
      return null;
    }
    const closePlanViewer = (): void => {
      dataQualityState.setShowStructuralValidations(false);
    };
    const isDarkMode =
      !dataQualityState.applicationStore.layoutService
        .TEMPORARY__isLightColorThemeEnabled;

    const getChildNodes = (
      node: DataQualityGraphFetchTreeNodeData,
    ): DataQualityGraphFetchTreeNodeData[] =>
      node.childrenIds
        .map((id) => structureValidationsTree.nodes.get(id))
        .filter(
          (_node): _node is DataQualityGraphFetchTreeNodeData =>
            _node instanceof DataQualityGraphFetchTreeNodeData,
        )
        .sort((a, b) => a.label.localeCompare(b.label))
        .sort(
          (a, b) =>
            getQueryBuilderExplorerTreeNodeSortRank(b) -
            getQueryBuilderExplorerTreeNodeSortRank(a),
        );

    return (
      <Dialog
        open={dataQualityState.showStructuralValidations}
        onClose={closePlanViewer}
        classes={{
          root: 'data-quality-editor-modal__root-container',
          container: 'data-quality-editor-modal__container',
          paper: 'data-quality-editor-modal__content',
        }}
      >
        <Modal className="data-quality-editor-modal" darkMode={isDarkMode}>
          <ModalHeader title="Structural Attributes" />
          <ModalBody>
            <div className="data-quality-validation-graph-fetch-constraints-selection__config-group__item">
              <TreeView
                components={{
                  TreeNodeContainer: DataQualityConstraintsTreeNodeContainer,
                }}
                className="data-quality-validation-graph-fetch-tree__container__tree"
                treeData={structureValidationsTree}
                getChildNodes={getChildNodes}
                innerProps={{
                  dataQualityState,
                  isReadOnly: true,
                }}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              onClick={closePlanViewer}
              text="Close"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
