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
import {
  BlankPanelContent,
  BundleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  Dialog,
  InfoCircleIcon,
  Modal,
  ModalBody,
  ModalHeader,
  ModalHeaderActions,
  ModalTitle,
  PluginIcon,
  TimesIcon,
  TreeView,
  type TreeData,
  type TreeNodeContainerProps,
  type TreeNodeData,
} from '@finos/legend-art';
import {
  addUniqueEntry,
  isNonNullable,
  type PluginInfo,
  PresetInfo,
  type PluginManagerInfo,
} from '@finos/legend-shared';
import { useLegendStudioApplicationStore } from './LegendStudioFrameworkProvider.js';

class AppExtensionInfoTreeNodeData implements TreeNodeData {
  id: string;
  label: string;
  isSelected?: boolean;
  isOpen?: boolean;
  childrenIds?: string[];
  info: PresetInfo | PluginInfo;

  constructor(id: string, label: string, info: PresetInfo | PluginInfo) {
    this.id = id;
    this.label = label;
    this.info = info;
  }
}

const buildAppExtensionInfoTreeData = (
  pluginManagerInfo: PluginManagerInfo,
): TreeData<AppExtensionInfoTreeNodeData> => {
  const rootIds: string[] = [];
  const nodes = new Map<string, AppExtensionInfoTreeNodeData>();
  // NOTE: the returned plugin manager extension info is already sorted
  // so we don't need to do that anymore
  pluginManagerInfo.presets.forEach((preset) => {
    const node = new AppExtensionInfoTreeNodeData(
      preset.signature,
      preset.name,
      preset,
    );
    addUniqueEntry(rootIds, node.id);
    nodes.set(node.id, node);
    if (preset.plugins.length) {
      node.childrenIds = [];
      preset.plugins.forEach((plugin) => {
        const childNode = new AppExtensionInfoTreeNodeData(
          plugin.signature,
          plugin.name,
          plugin,
        );
        addUniqueEntry(node.childrenIds as string[], childNode.id);
        nodes.set(childNode.id, childNode);
      });
    }
  });
  pluginManagerInfo.plugins.forEach((plugin) => {
    const node = new AppExtensionInfoTreeNodeData(
      plugin.signature,
      plugin.name,
      plugin,
    );
    addUniqueEntry(rootIds, node.id);
    nodes.set(node.id, node);
  });
  return { rootIds, nodes };
};

const AppExtensionInfoTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    AppExtensionInfoTreeNodeData,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    {
      // empty
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect } = props;
  const isExpandable = Boolean(node.childrenIds?.length);
  const nodeTypeIcon =
    node.info instanceof PresetInfo ? <BundleIcon /> : <PluginIcon />;
  const selectNode = (): void => onNodeSelect?.(node);
  const nodeExpandIcon = isExpandable ? (
    node.isOpen ? (
      <ChevronDownIcon />
    ) : (
      <ChevronRightIcon />
    )
  ) : (
    <div />
  );

  return (
    <div
      className="tree-view__node__container"
      onClick={selectNode}
      style={{
        paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 2)}rem`,
        display: 'flex',
      }}
    >
      <div className="app__info__extensions__tree__node__icon">
        <div className="app__info__extensions__tree__node__icon__expand">
          {nodeExpandIcon}
        </div>
        <div className="app__info__extensions__tree__node__icon__type">
          {nodeTypeIcon}
        </div>
      </div>
      <div className="tree-view__node__label app__info__extensions__tree__node__label">
        <div className="app__info__extensions__tree__node__label__title">
          {node.label}
        </div>
        <div className="app__info__extensions__tree__node__label__version">
          <div className="app__info__extensions__tree__node__label__version__label">
            {node.info.version}
          </div>
        </div>
      </div>
    </div>
  );
};

export const LegendStudioAppInfo: React.FC<{
  open: boolean;
  closeModal: () => void;
}> = (props) => {
  const { open, closeModal } = props;
  const applicationStore = useLegendStudioApplicationStore();
  const config = applicationStore.config;
  const copyInfo = (): void => {
    applicationStore.clipboardService
      .copyTextToClipboard(
        [
          `Environment: ${config.env}`,
          `Version: ${config.appVersion}`,
          `Revision: ${config.appVersionCommitId}`,
          `Build Time: ${config.appVersionBuildTime}`,
          `SDLC Server: ${config.sdlcServerUrl}`,
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
  const [appExtensionInfoTreeData, setAppExtensionInfoTreeData] = useState(
    buildAppExtensionInfoTreeData(applicationStore.pluginManager.getInfo()),
  );
  const onAppExtensionInfoTreeNodeSelect = (
    node: AppExtensionInfoTreeNodeData,
  ): void => {
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
    }
    setAppExtensionInfoTreeData({ ...appExtensionInfoTreeData });
  };
  const getAppExtensionInfoTreeChildNodes = (
    node: AppExtensionInfoTreeNodeData,
  ): AppExtensionInfoTreeNodeData[] =>
    node.childrenIds
      ?.map((id) => appExtensionInfoTreeData.nodes.get(id))
      .filter(isNonNullable) ?? [];
  const isAppExtensionInfoEmpty = !appExtensionInfoTreeData.nodes.size;
  const goToReleaseLog = (): void => {
    applicationStore.releaseNotesService.setReleaseLog(true);
    closeModal();
  };
  return (
    <Dialog onClose={closeModal} open={open}>
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
          <div className="app__info__entry">
            <div
              onClick={goToReleaseLog}
              className="app__info__entry__value app__info__entry__value__action"
            >
              Details of Released Versions
            </div>
          </div>
          <div className="app__info__group">
            <div className="app__info__entry">
              <div className="app__info__entry__title">SDLC Server:</div>
              <div className="app__info__entry__value">
                <a
                  href={config.sdlcServerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {config.sdlcServerUrl}
                </a>
              </div>
            </div>
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
          <div className="app__info__extensions">
            <div className="app__info__extensions__header">
              <div className="app__info__extensions__header__title">
                EXTENSIONS
              </div>
            </div>
            <div className="app__info__extensions__content">
              {isAppExtensionInfoEmpty && (
                <BlankPanelContent>no extensions available</BlankPanelContent>
              )}
              {!isAppExtensionInfoEmpty && (
                <TreeView
                  components={{
                    TreeNodeContainer: AppExtensionInfoTreeNodeContainer,
                  }}
                  treeData={appExtensionInfoTreeData}
                  getChildNodes={getAppExtensionInfoTreeChildNodes}
                  onNodeSelect={onAppExtensionInfoTreeNodeSelect}
                  innerProps={{}}
                />
              )}
            </div>
          </div>
        </ModalBody>
      </Modal>
    </Dialog>
  );
};
