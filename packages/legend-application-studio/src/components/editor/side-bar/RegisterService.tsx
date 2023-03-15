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
import { LEGEND_STUDIO_TEST_ID } from '../../LegendStudioTestID.js';
import { useEditorStore } from '../EditorStoreProvider.js';
import {
  ContextMenu,
  PanelContent,
  PURE_ServiceIcon,
  clsx,
  PlayIcon,
  Dialog,
  Modal,
  TimesIcon,
  EmptyWindowRestoreIcon,
  WindowMaximizeIcon,
} from '@finos/legend-art';
import type { BulkServiceRegistrationState } from '../../../stores/sidebar-state/BulkServiceRegistrationState.js';
import { BulkServiceRegistrationEditor } from '../edit-panel/service-editor/BulkServiceRegistrationEditor.js';
import { noop } from '@finos/legend-shared';

export const RegisterService = observer(
  (props: { bulkServiceRegistrationState: BulkServiceRegistrationState }) => {
    const editorStore = useEditorStore();
    const services = editorStore.graphManagerState.graph.ownServices;
    const [open, setOpen] = useState(false);

    const [isMaximized, setIsMaximized] = useState(false);
    const toggleMaximize = (): void => setIsMaximized(!isMaximized);

    const renderTestables = (): React.ReactNode => (
      <>
        {services.map((service) => (
          <ContextMenu key={service._UUID}>
            <div
              className={clsx(
                'tree-view__node__container global-test-runner__explorer__testable-tree__node__container',
              )}
            >
              <div className="global-test-runner__explorer__testable-tree__node__result__icon__type">
                <PURE_ServiceIcon />
              </div>
              <div className="global-test-runner__item__link__content">
                <span className="global-test-runner__item__link__content__id">
                  {service.name}
                </span>
              </div>
            </div>
          </ContextMenu>
        ))}
      </>
    );

    return (
      <div
        data-testid={LEGEND_STUDIO_TEST_ID.GLOBAL_TEST_RUNNER}
        className="panel global-test-runner"
      >
        <div className="panel__header side-bar__header">
          <div className="panel__header__title global-test-runner__header__title">
            <div className="panel__header__title__content side-bar__header__title__content">
              REGISTER SERVICES
            </div>
          </div>
          <div className="panel__header__actions side-bar__header__actions"></div>
          <button
            className="panel__header__action side-bar__header__action global-test-runner__refresh-btn"
            onClick={() => setOpen(true)}
            tabIndex={-1}
            title="Register All Services"
          >
            <PlayIcon />
          </button>
          <Dialog onClose={noop} open={open}>
            <Modal
              darkMode={true}
              className={clsx('editor-modal query-builder__dialog', {
                'query-builder__dialog--expanded': isMaximized,
              })}
            >
              <div className="query-builder__dialog__header">
                <div className="query-builder__dialog__header__actions"></div>
                <button
                  className="query-builder__dialog__header__action"
                  tabIndex={-1}
                  onClick={toggleMaximize}
                >
                  {isMaximized ? (
                    <EmptyWindowRestoreIcon />
                  ) : (
                    <WindowMaximizeIcon />
                  )}
                </button>
                <button
                  className="query-builder__dialog__header__action"
                  tabIndex={-1}
                  onClick={() => setOpen(false)}
                >
                  <TimesIcon />
                </button>
              </div>
              <BulkServiceRegistrationEditor />;
            </Modal>
          </Dialog>
        </div>
        <div className="panel__content side-bar__content">
          <div className="panel side-bar__panel">
            <div className="panel__header">
              <div className="panel__header__title">
                <div className="panel__header__title__content">SERVICES</div>
              </div>
              <div
                className="side-bar__panel__header__changes-count"
                data-testid={
                  LEGEND_STUDIO_TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT
                }
              ></div>
            </div>
            <PanelContent>{renderTestables()}</PanelContent>
          </div>
        </div>
      </div>
    );
  },
);
