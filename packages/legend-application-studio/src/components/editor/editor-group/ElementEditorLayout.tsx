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

import { observer } from 'mobx-react-lite';
import { clsx, LockIcon, PlusIcon } from '@finos/legend-art';
import {
  ELEMENT_PATH_DELIMITER,
  type PackageableElement,
} from '@finos/legend-graph';
import { useEditorStore } from '../EditorStoreProvider.js';
import { getElementIcon } from '../../ElementIconUtils.js';

/**
 * The title bar of an element editor: the element's icon and name, its type, the package
 * it lives in, a read-only badge, and the editor's own actions on the right.
 */
export const ElementEditorHeader = observer(
  (props: {
    element: PackageableElement;
    typeLabel: string;
    isReadOnly?: boolean | undefined;
    children?: React.ReactNode;
  }) => {
    const { element, typeLabel, isReadOnly, children } = props;
    const editorStore = useEditorStore();
    const packagePath = element.path
      .split(ELEMENT_PATH_DELIMITER)
      .slice(0, -1)
      .join(ELEMENT_PATH_DELIMITER);

    return (
      <div className="element-editor-header">
        <div className="element-editor-header__title">
          <div className="element-editor-header__icon">
            {getElementIcon(element, editorStore)}
          </div>
          <div className="element-editor-header__name" title={element.path}>
            {element.name}
          </div>
          <div className="element-editor-header__type">{typeLabel}</div>
          {packagePath && (
            <div className="element-editor-header__path" title={element.path}>
              {packagePath}
            </div>
          )}
          {isReadOnly && (
            <div className="element-editor-header__badge">
              <LockIcon />
              read-only
            </div>
          )}
        </div>
        {children && <div className="panel__header__actions">{children}</div>}
      </div>
    );
  },
);

export type ElementEditorTab<T extends string> = {
  id: T;
  label: string;
  /**
   * How many items the element declares under this tab; leave undefined to show no count
   */
  count?: number | undefined;
};

/**
 * The tab strip under an element editor's header, with a count on each tab and the
 * selected tab's add action on the right.
 */
export const ElementEditorTabs = <T extends string>(props: {
  tabs: ElementEditorTab<T>[];
  selectedTab: T;
  onSelect: (tab: T) => void;
  addTitle?: string | undefined;
  onAdd?: (() => void) | undefined;
  disableAdd?: boolean | undefined;
  testId?: string | undefined;
}): React.ReactNode => {
  const { tabs, selectedTab, onSelect, addTitle, onAdd, disableAdd, testId } =
    props;
  return (
    <div data-testid={testId} className="element-editor-tabs">
      <div className="element-editor-tabs__list" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={tab.id === selectedTab}
            onClick={(): void => onSelect(tab.id)}
            className={clsx('element-editor-tabs__tab', {
              'element-editor-tabs__tab--active': tab.id === selectedTab,
            })}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={clsx('element-editor-tabs__tab__count', {
                  'element-editor-tabs__tab__count--empty': !tab.count,
                })}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {onAdd && (
        <div className="panel__header__actions">
          <button
            className="panel__header__action"
            disabled={disableAdd}
            onClick={onAdd}
            tabIndex={-1}
            title={addTitle}
          >
            <PlusIcon />
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Shown in place of an empty list, with the action that adds the first item.
 */
export const ElementEditorEmptyState = (props: {
  title: string;
  description?: string | undefined;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
}): React.ReactNode => {
  const { title, description, actionLabel, onAction } = props;
  return (
    <div className="element-editor-empty">
      <div className="element-editor-empty__title">{title}</div>
      {description && (
        <div className="element-editor-empty__description">{description}</div>
      )}
      {actionLabel && onAction && (
        <button className="element-editor-empty__action" onClick={onAction}>
          <PlusIcon />
          {actionLabel}
        </button>
      )}
    </div>
  );
};
