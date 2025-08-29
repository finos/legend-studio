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

import type React from 'react';
import { useLegendMarketplaceApplicationStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { isNonNullable } from '@finos/legend-shared';
import {
  CopyIcon,
  Dialog,
  InfoCircleIcon,
  Modal,
  ModalBody,
  ModalHeader,
  ModalHeaderActions,
  ModalTitle,
  TimesIcon,
} from '@finos/legend-art';

export const LegendMarketplaceAppInfo: React.FC<{
  open: boolean;
  closeModal: () => void;
}> = (props) => {
  const { open, closeModal } = props;
  const applicationStore = useLegendMarketplaceApplicationStore();
  const config = applicationStore.config;
  const copyInfo = (): void => {
    applicationStore.clipboardService
      .copyTextToClipboard(
        [
          `Environment: ${config.env}`,
          `Version: ${config.appVersion}`,
          `Revision: ${config.appVersionCommitId}`,
          `Build Time: ${config.appVersionBuildTime}`,
          `Engine Server: ${config.engineServerUrl}`,
          `Depot Server: ${config.depotServerUrl}`,
        ]
          .filter(isNonNullable)
          .join('\n'),
      )
      .then(() =>
        applicationStore.notificationService.notifySuccess(
          'Copied application info to clipboard',
        ),
      )
      .catch(applicationStore.alertUnhandledError);
  };

  return (
    <Dialog onClose={closeModal} open={open} fullWidth={true} maxWidth="sm">
      <Modal
        darkMode={
          !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        }
        className="modal--scrollable app__info"
      >
        <ModalHeader>
          <ModalTitle icon={<InfoCircleIcon />} title="About" />
          <ModalHeaderActions>
            <button
              className="modal__header__action"
              tabIndex={-1}
              onClick={copyInfo}
              title="Copy application info"
            >
              <CopyIcon />
            </button>
            <button
              className="modal__header__action"
              tabIndex={-1}
              onClick={closeModal}
            >
              <TimesIcon />
            </button>
          </ModalHeaderActions>
        </ModalHeader>
        <ModalBody>
          <div className="app__info__entry">
            <div className="app__info__entry__title">Environment:</div>
            <div className="app__info__entry__value">{config.env}</div>
          </div>
          <div className="app__info__entry">
            <div className="app__info__entry__title">Version:</div>
            <div className="app__info__entry__value">{config.appVersion}</div>
          </div>
          <div className="app__info__entry">
            <div className="app__info__entry__title">Revision:</div>
            <div className="app__info__entry__value">
              {config.appVersionCommitId}
            </div>
          </div>
          <div className="app__info__entry">
            <div className="app__info__entry__title">Build Time:</div>
            <div className="app__info__entry__value">
              {config.appVersionBuildTime}
            </div>
          </div>
          <div className="app__info__group">
            <div className="app__info__entry">
              <div className="app__info__entry__title">Engine Server:</div>
              <div className="app__info__entry__value">
                <a
                  href={config.engineServerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {config.engineServerUrl}
                </a>
              </div>
            </div>
            <div className="app__info__entry">
              <div className="app__info__entry__title">Depot Server:</div>
              <div className="app__info__entry__value">
                <a
                  href={config.depotServerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {config.depotServerUrl}
                </a>
              </div>
            </div>
          </div>
        </ModalBody>
      </Modal>
    </Dialog>
  );
};
