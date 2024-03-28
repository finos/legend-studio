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
  PanelLoadingIndicator,
  Dialog,
  Modal,
  ModalBody,
} from '@finos/legend-art';
import { noop } from '@finos/legend-shared';
import { useApplicationStore } from './ApplicationStoreProvider.js';

/**
 * The users of this need to justify their use case because blocking app disrupts the UX flow.
 * Of course there are legitimate use cases but please consult the team when you do so.
 * See https://material.io/components/dialogs#usage
 */
export const BlockingAlert = observer(() => {
  const applicationStore = useApplicationStore();
  const info = applicationStore.alertService.blockingAlertInfo;

  if (!info) {
    return null;
  }
  return (
    <Dialog
      open={Boolean(info)}
      onClose={noop} // disallow closing dialog by using Esc key or clicking on the backdrop
      classes={{
        root: 'blocking-alert__root-container',
        container: 'blocking-alert__container',
      }}
    >
      <Modal
        darkMode={
          !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        }
        className="blocking-alert"
      >
        <PanelLoadingIndicator isLoading={Boolean(info.showLoading)} />
        <ModalBody>
          <div className="blocking-alert__message">{info.message}</div>
          {info.prompt && (
            <div className="blocking-alert__message__prompt">{info.prompt}</div>
          )}
        </ModalBody>
      </Modal>
    </Dialog>
  );
});
