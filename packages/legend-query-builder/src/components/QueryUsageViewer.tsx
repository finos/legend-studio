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
  PanelDivider,
  ModalFooter,
  ModalFooterButton,
  BlankPanelContent,
  clsx,
} from '@finos/legend-art';
import { useApplicationStore } from '@finos/legend-application';
import type { QueryBuilder_LegendApplicationPlugin_Extension } from '../stores/QueryBuilder_LegendApplicationPlugin_Extension.js';
import { useState } from 'react';
import type { QueryBuilderResultState } from '../stores/QueryBuilderResultState.js';

export const QueryUsageViewer = observer(
  (props: { resultState: QueryBuilderResultState }) => {
    const { resultState } = props;
    const applicationStore = useApplicationStore();

    const extraQueryUsageOptions = applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as QueryBuilder_LegendApplicationPlugin_Extension
          ).getExtraQueryUsageConfigurations?.() ?? [],
      );
    const [selectedTab, setSelectedTab] = useState<string | undefined>(
      extraQueryUsageOptions[0]?.title,
    );
    const currentTabExtensionConfig = extraQueryUsageOptions.find(
      (option) => option.title === selectedTab,
    );

    return (
      <Dialog
        open={resultState.isQueryUsageViewerOpened}
        onClose={() => resultState.setIsQueryUsageViewerOpened(false)}
      >
        <Modal
          className="query-builder__usage-viewer__modal"
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        >
          <ModalHeader title="Query Usage" />
          <ModalBody className="query-builder__usage-viewer__body">
            <>
              {extraQueryUsageOptions.length === 0 ? (
                <BlankPanelContent>
                  Query usage is not available
                </BlankPanelContent>
              ) : (
                <>
                  <div className="query-builder__usage-viewer__tab__header">
                    <div className="query-builder__usage-viewer__tabs">
                      {extraQueryUsageOptions.map((config) => (
                        <button
                          key={config.key}
                          className={clsx('query-builder__usage-viewer__tab', {
                            'query-builder__usage-viewer__tab--active':
                              selectedTab === config.key,
                          })}
                          tabIndex={-1}
                          onClick={() => setSelectedTab(config.key)}
                        >
                          {config.icon !== undefined && (
                            <div className="query-builder__usage-viewer__tab__icon">
                              {config.icon}
                            </div>
                          )}
                          <div className="query-builder__usage-viewer__tab__label">
                            {config.title}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="query-builder__usage-viewer__content">
                    {currentTabExtensionConfig?.renderer()}
                  </div>
                </>
              )}
              <PanelDivider />
            </>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              onClick={() => resultState.setIsQueryUsageViewerOpened(false)}
              text="Close"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
