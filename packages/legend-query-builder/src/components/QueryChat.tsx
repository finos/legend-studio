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
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  BlankPanelContent,
} from '@finos/legend-art';
import { useApplicationStore } from '@finos/legend-application';
import type { QueryBuilder_LegendApplicationPlugin_Extension } from '../stores/QueryBuilder_LegendApplicationPlugin_Extension.js';
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';

export const QueryChat = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();

    const extraQueryChatConfigurations = applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as QueryBuilder_LegendApplicationPlugin_Extension
          ).getExtraQueryChatRenderers?.() ?? [],
      );

    return (
      <Dialog
        open={queryBuilderState.isQueryChatOpened}
        onClose={() => queryBuilderState.setIsQueryChatOpened(false)}
      >
        <Modal className="query-builder__chat-mode__modal" darkMode={true}>
          <ModalHeader title="Chat Mode" />
          <ModalBody className="query-builder__chat-mode__body">
            <>
              {extraQueryChatConfigurations.length === 0 ? (
                <BlankPanelContent>
                  Chat Mode is not available
                </BlankPanelContent>
              ) : (
                <></>
              )}
            </>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              onClick={() => queryBuilderState.setIsQueryChatOpened(false)}
              text="Close"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
