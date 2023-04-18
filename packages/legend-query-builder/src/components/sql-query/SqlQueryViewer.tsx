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

import {
  Dialog,
  ModalHeader,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  PanelFormSection,
  PanelListItem,
  PanelDivider,
  CopyIcon,
  PanelLoadingIndicator,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import type { QueryBuilderResultState } from '../../stores/QueryBuilderResultState.js';

import { format as formatSQL } from 'sql-formatter';

export const SqlQueryViewer = observer(
  (props: { resultState: QueryBuilderResultState }) => {
    const { resultState } = props;

    const applicationStore = resultState.queryBuilderState.applicationStore;

    const queries = resultState.sqlQueries;

    const copyExpression = (value: string): void => {
      applicationStore.clipboardService
        .copyTextToClipboard(value)
        .then(() =>
          applicationStore.notificationService.notifySuccess(
            'SQL Query copied',
            undefined,
            2500,
          ),
        )
        .catch(applicationStore.alertUnhandledError);
    };

    return (
      <Dialog
        open={Boolean(resultState.isShowingSqlViewer)}
        onClose={() => resultState.setIsShowingSqlViewer(false)}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal className="query-builder__sql__modal" darkMode={true}>
          <ModalHeader title="SQL Query" />
          <PanelLoadingIndicator isLoading={resultState.isGeneratingPlan} />
          <ModalBody className="query-builder__sql">
            <PanelDivider />
            <PanelFormSection>
              {queries?.map((query, index) => (
                <div key={query}>
                  <div className="query-builder__sql__item__label">
                    {queries.length > 1 && (
                      <PanelListItem>
                        SQL {index + 1}
                        <div>
                          <button
                            onClick={() => {
                              copyExpression(query);
                            }}
                            title="Copy SQL Expression"
                          >
                            <CopyIcon />
                          </button>
                        </div>
                      </PanelListItem>
                    )}
                  </div>
                  <PanelListItem className="query-builder__sql__item">
                    <pre>{formatSQL(query)} </pre>
                  </PanelListItem>
                  <PanelDivider />
                </div>
              ))}
            </PanelFormSection>
          </ModalBody>
          <ModalFooter>
            {queries && queries.length === 1 && (
              <ModalFooterButton
                onClick={() => copyExpression(queries.at(0) ?? '')}
                text="Copy to Clipboard"
              />
            )}
            <ModalFooterButton
              onClick={() => resultState.setIsShowingSqlViewer(false)}
              text="Close"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
