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
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { isNonNullable, isValidUrl } from '@finos/legend-shared';
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
import { observer } from 'mobx-react-lite';
import { TextField } from '@mui/material';

export const LegendMarketplaceAppInfo: React.FC<{
  open: boolean;
  closeModal: () => void;
}> = observer((props) => {
  const { open, closeModal } = props;
  const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
  const applicationStore = legendMarketplaceBaseStore.applicationStore;
  const config = applicationStore.config;

  const configData: {
    label: string;
    value: string | undefined;
  }[] = [
    {
      label: 'Environment',
      value: config.env,
    },
    {
      label: 'Version',
      value: config.appVersion,
    },
    {
      label: 'Revision',
      value: config.appVersionCommitId,
    },
    {
      label: 'Build Time',
      value: config.appVersionBuildTime,
    },
  ];

  const serverData: {
    label: string;
    value: string | undefined;
    setter?: (val: string | undefined) => void;
  }[] = [
    {
      label: 'Engine Server',
      value: config.engineServerUrl,
    },
    {
      label: 'Depot Server',
      value: config.depotServerUrl,
    },
    {
      label: 'Marketplace Server',
      value: legendMarketplaceBaseStore.marketplaceServerClient.baseUrl,
      setter: (val: string | undefined): void =>
        legendMarketplaceBaseStore.marketplaceServerClient.setBaseUrl(val),
    },
  ];

  const copyInfo = (): void => {
    applicationStore.clipboardService
      .copyTextToClipboard(
        [
          [...configData, ...serverData].map(
            (data) => `${data.label}: ${data.value}`,
          ),
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

  const goToReleaseLog = (): void => {
    applicationStore.releaseNotesService.setReleaseLog(true);
    closeModal();
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
          {configData.map((data) => (
            <div key={data.label} className="app__info__entry">
              <div className="app__info__entry__title">{data.label}:</div>
              <div className="app__info__entry__value">{data.value}</div>
            </div>
          ))}
          <div className="app__info__entry">
            <div
              onClick={goToReleaseLog}
              className="app__info__entry__value__action"
            >
              Details of Released Versions
            </div>
          </div>
          <div className="app__info__group">
            {serverData.map((data) => (
              <div key={data.label} className="app__info__entry">
                <div className="app__info__entry__title">{data.label}:</div>
                <div className="app__info__entry__value">
                  {data.setter === undefined ? (
                    <a
                      href={data.value}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {data.value}
                    </a>
                  ) : (
                    <TextField
                      value={data.value}
                      spellCheck={false}
                      onChange={(event) => {
                        const stringValue = event.target.value;
                        data.setter?.(stringValue ? stringValue : undefined);
                      }}
                      placeholder={`${data.label} client base URL`}
                      error={!isValidUrl(data.value ?? '')}
                      helperText={
                        !isValidUrl(data.value ?? '')
                          ? 'Invalid URL'
                          : undefined
                      }
                      variant="outlined"
                      size="small"
                      fullWidth={true}
                      className="app__info__entry__value--editable"
                      slotProps={{
                        htmlInput: {
                          className: 'app__info__entry__value--editable__input',
                        },
                        formHelperText: {
                          className:
                            'app__info__entry__value--editable__helper-text',
                        },
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </ModalBody>
      </Modal>
    </Dialog>
  );
});
