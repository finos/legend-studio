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
import { LEGEND_STUDIO_TEST_ID } from '../../../application/LegendStudioTesting.js';
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
} from '@finos/legend-art';
import type { BulkServiceRegistrationState } from '../../../stores/editor/sidebar-state/BulkServiceRegistrationState.js';
import { BulkServiceRegistrationEditor } from '../editor-group/service-editor/BulkServiceRegistrationEditor.js';
import { noop } from '@finos/legend-shared';

export const RegisterService = observer(
  (props: { bulkServiceRegistrationState: BulkServiceRegistrationState }) => {
    const editorStore = useEditorStore();
    const services = editorStore.graphManagerState.graph.ownServices;
    const [showRegistrationModel, setShowRegistrationModel] = useState(false);

    const serviceItems = (): React.ReactNode => (
      <>
        {services.map((service) => (
          <ContextMenu key={service._UUID}>
            <div
              className={clsx(
                'bulk-service-registration__service__container bulk-service-registration__explorer__service__container',
              )}
            >
              <div className="bulk-service-registration__explorer__service__result__icon__type">
                <PURE_ServiceIcon />
              </div>
              <div className="bulk-service-registration__item__link__content">
                <span className="bulk-service-registration__item__link__content__id">
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
        data-testid={LEGEND_STUDIO_TEST_ID.BULK_REGISTRATION}
        className="panel bulk-service-registration"
      >
        <div className="panel__header side-bar__header">
          <div className="panel__header__title bulk-service-registration__header__title">
            <div className="panel__header__title__content side-bar__header__title__content">
              REGISTER SERVICES
            </div>
          </div>
          <div className="panel__header__actions side-bar__header__actions"></div>
          <button
            className="panel__header__action side-bar__header__action bulk-service-registration__play-btn"
            onClick={() => setShowRegistrationModel(true)}
            tabIndex={-1}
            title="Register All Services"
          >
            <PlayIcon />
          </button>
          <Dialog onClose={noop} open={showRegistrationModel}>
            <Modal
              darkMode={true}
              className={clsx(
                'editor-modal bulk-service-registration__service__editor',
              )}
            >
              <div className="bulk-service-registration__header">
                <div className="bulk-service-registration__header__actions"></div>
                <button
                  className="bulk-service-registration__header__action"
                  tabIndex={-1}
                  onClick={() => setShowRegistrationModel(false)}
                >
                  <TimesIcon />
                </button>
              </div>
              <div className="bulk-service-registration__panel__content__form">
                <BulkServiceRegistrationEditor />
              </div>
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
              >
                {services.length}
              </div>
            </div>
            <PanelContent>{serviceItems()}</PanelContent>
          </div>
        </div>
      </div>
    );
  },
);
