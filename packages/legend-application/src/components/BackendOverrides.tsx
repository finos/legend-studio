/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  clsx,
  Dialog,
  ExclamationTriangleIcon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  ModalHeaderActions,
  ModalTitle,
  ServerIcon,
  TimesIcon,
  UndoIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useApplicationStore } from './ApplicationStoreProvider.js';
import { LEGEND_APPLICATION_RESET_BACKEND_OVERRIDES_QUERY_PARAM } from '../application/LegendApplicationBackendOverrides.js';

/**
 * The backend servers dialog: lets the user override the URL of each backend
 * server the application declares; saving reloads the application.
 */
export const BackendOverridesDialog = observer(() => {
  const applicationStore = useApplicationStore();
  const service = applicationStore.backendOverrideService;
  if (!service.isOpen) {
    return null;
  }
  const close = (): void => service.close();
  const config = applicationStore.config;

  return (
    <Dialog
      open={service.isOpen}
      onClose={close}
      classes={{
        root: 'backend-overrides__root-container',
        container: 'backend-overrides__container',
      }}
    >
      <Modal
        darkMode={
          !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        }
        className="backend-overrides"
      >
        <ModalHeader>
          <ModalTitle icon={<ServerIcon />} title="Backend Servers" />
          <ModalHeaderActions>
            <button
              className="modal__header__action"
              tabIndex={-1}
              onClick={close}
              title="Close"
            >
              <TimesIcon />
            </button>
          </ModalHeaderActions>
        </ModalHeader>
        <ModalBody className="backend-overrides__body">
          {!service.isEnabled ? (
            <div className="backend-overrides__note">
              This deployment doesn&apos;t allow overriding backend servers: set{' '}
              <code>application.backendOverrides.enabled</code> in its{' '}
              <code>config.json</code> to allow it.
            </div>
          ) : (
            <>
              {service.entries.map((entry) => {
                const key = entry.entry.key;
                const error = service.getDraftError(key);
                return (
                  <div
                    key={key}
                    className="backend-overrides__entry"
                    data-testid={`backend-overrides-entry-${key}`}
                  >
                    <div className="backend-overrides__entry__label">
                      {entry.entry.label}
                    </div>
                    <div className="backend-overrides__entry__value">
                      <input
                        className={clsx(
                          'input input--dark backend-overrides__entry__input',
                          { 'backend-overrides__entry__input--error': error },
                        )}
                        spellCheck={false}
                        placeholder={entry.configuredUrl}
                        value={service.getDraft(key)}
                        onChange={(event) =>
                          service.setDraft(key, event.target.value)
                        }
                        aria-label={`${entry.entry.label} URL`}
                      />
                      <div className="backend-overrides__entry__configured">
                        configured: {entry.configuredUrl}
                      </div>
                      {error && (
                        <div className="backend-overrides__entry__error">
                          {error}
                        </div>
                      )}
                    </div>
                    <button
                      className="backend-overrides__entry__reset"
                      tabIndex={-1}
                      title={`Use the configured ${entry.entry.label} URL`}
                      onClick={() => service.resetDraft(key)}
                    >
                      <UndoIcon />
                    </button>
                  </div>
                );
              })}
              <div className="backend-overrides__note">
                Changes apply after a reload. They are saved in this browser for{' '}
                {config.appName} ({config.env}). If a server keeps the
                application from loading, open it with{' '}
                <code>
                  ?{LEGEND_APPLICATION_RESET_BACKEND_OVERRIDES_QUERY_PARAM}
                </code>{' '}
                to go back to the configured servers.
                {applicationStore.enableTokenClient &&
                  ' Requests carry your access token to the servers set here.'}
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          {service.isEnabled && (
            <ModalFooterButton
              text="Reset All"
              type="secondary"
              onClick={() => service.resetAllDrafts()}
            />
          )}
          {service.isEnabled && (
            <ModalFooterButton
              text="Save and Reload"
              disabled={service.hasDraftErrors}
              onClick={() => service.saveAndReload()}
            />
          )}
          {!service.isEnabled && (
            <ModalFooterButton text="Close" onClick={close} />
          )}
        </ModalFooter>
      </Modal>
    </Dialog>
  );
});

/**
 * Shown at the top of the application while backend overrides are in use, so
 * an overridden server is never used unknowingly.
 */
export const BackendOverridesBanner = observer(() => {
  const applicationStore = useApplicationStore();
  const service = applicationStore.backendOverrideService;
  const overrides = service.activeOverrides;
  if (!overrides.length) {
    return null;
  }
  return (
    <div
      className="backend-overrides__banner"
      data-testid="backend-overrides-banner"
    >
      <ExclamationTriangleIcon className="backend-overrides__banner__icon" />
      <div
        className="backend-overrides__banner__label"
        title={overrides
          .map((entry) => `${entry.entry.label}: ${entry.url}`)
          .join('\n')}
      >
        Overridden backend servers:{' '}
        {overrides
          .map((entry) => `${entry.entry.label} → ${entry.url}`)
          .join(', ')}
      </div>
      <button
        className="backend-overrides__banner__action"
        onClick={() => service.open()}
      >
        Edit
      </button>
      <button
        className="backend-overrides__banner__action"
        onClick={() => service.resetAndReload()}
      >
        Reset
      </button>
    </div>
  );
});

/**
 * Puts the backend overrides banner above the application while backend
 * overrides are in use; otherwise renders the application as it is.
 */
export const BackendOverridesFrame = observer(
  (props: { children: React.ReactNode }) => {
    const { children } = props;
    const applicationStore = useApplicationStore();
    if (!applicationStore.backendOverrideService.activeOverrides.length) {
      return <>{children}</>;
    }
    return (
      <div className="backend-overrides__frame">
        <BackendOverridesBanner />
        <div className="backend-overrides__frame__content">{children}</div>
      </div>
    );
  },
);
