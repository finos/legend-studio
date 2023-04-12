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

import { ChevronDownIcon, ChevronRightIcon } from '../icon/Icon.js';
import { isNonNullable, type PlainObject } from '@finos/legend-shared';
import { clsx } from 'clsx';

const DEFAULT_STEP_PADDING_IN_REM = 1;
type InnerProps = PlainObject;

export interface TreeNodeData {
  isSelected?: boolean | undefined;
  isOpen?: boolean | undefined;
  id: string;
  label: string;
  childrenIds?: string[] | undefined;
}

export interface TreeData<T extends TreeNodeData> {
  rootIds: string[];
  nodes: Map<string, T>;
}

/**
 * Default tree node container
 */
export interface TreeNodeContainerProps<
  T extends TreeNodeData,
  S extends InnerProps,
> {
  node: T;
  classPrefix?: string | undefined;
  level: number;
  onNodeSelect?: ((node: T) => void) | undefined;
  stepPaddingInRem?: number | undefined;
  innerProps: S;
}

const DefaultTreeNodeContainer = <T extends TreeNodeData, S extends InnerProps>(
  props: TreeNodeContainerProps<T, S>,
): React.ReactElement<TreeNodeContainerProps<T, S>> => {
  const { node, level, stepPaddingInRem, classPrefix, onNodeSelect } = props;
  const selectNode = (): void => onNodeSelect?.(node);
  return (
    <div
      className={clsx('tree-view__node__container', {
        [`${classPrefix}__tree-view__node__container`]: classPrefix,
      })}
      onClick={selectNode}
      style={{
        paddingLeft: `${
          (level - 1) * (stepPaddingInRem ?? DEFAULT_STEP_PADDING_IN_REM)
        }rem`,
        display: 'flex',
      }}
    >
      <div
        className={clsx('tree-view__node__icon', {
          [`${classPrefix}__tree-view__node__icon`]: classPrefix,
        })}
      >
        {Boolean(node.childrenIds?.length) &&
          (node.isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />)}
      </div>
      <div
        className={clsx('tree-view__node__label', {
          [`${classPrefix}__tree-view__node__label`]: classPrefix,
        })}
      >
        {node.label}
      </div>
    </div>
  );
};

/**
 * Tree View Components (default)
 */
interface TreeViewComponents<T extends TreeNodeData, S extends InnerProps> {
  TreeNodeView: React.FC<TreeNodeViewProps<T, S>>;
  TreeNodeContainer: React.FC<TreeNodeContainerProps<T, S>>;
}

/**
 * Default tree node view
 */
export interface TreeNodeViewProps<
  T extends TreeNodeData,
  S extends InnerProps,
> {
  node: T;
  classPrefix?: string | undefined;
  level: number;
  components?: Partial<TreeViewComponents<T, S>> | undefined;
  onNodeSelect?: ((node: T) => void) | undefined;
  getChildNodes: (node: T) => T[];
  stepPaddingInRem?: number | undefined;
  innerProps: S;
}

const DefaultTreeNodeView = <T extends TreeNodeData, S extends InnerProps>(
  props: TreeNodeViewProps<T, S>,
): React.ReactElement<TreeNodeViewProps<T, S>> => {
  const {
    node,
    level,
    onNodeSelect,
    getChildNodes,
    classPrefix,
    components,
    stepPaddingInRem,
    innerProps,
  } = props;
  const defaultTreeComponents = {
    TreeNodeView: DefaultTreeNodeView,
    TreeNodeContainer: DefaultTreeNodeContainer,
  };
  const treeComponents = components
    ? { ...defaultTreeComponents, ...components }
    : defaultTreeComponents;
  return (
    // NOTE: if we want block-tree instead of padded tree, we can set the padding for it and zero out the step padding for each container
    <div
      className={clsx('tree-view__node__block', {
        [`${classPrefix}__tree-view__node__block`]: classPrefix,
      })}
    >
      <treeComponents.TreeNodeContainer
        node={node}
        level={level + 1}
        stepPaddingInRem={stepPaddingInRem}
        classPrefix={classPrefix}
        onNodeSelect={onNodeSelect}
        innerProps={innerProps}
      />
      {node.isOpen &&
        getChildNodes(node).map((childNode) => (
          <treeComponents.TreeNodeView
            key={childNode.id}
            node={childNode}
            level={level + 1}
            components={components}
            classPrefix={classPrefix}
            onNodeSelect={onNodeSelect}
            getChildNodes={getChildNodes}
            innerProps={innerProps}
          />
        ))}
    </div>
  );
};

/**
 * Tree View
 */
export interface TreeViewProps<T extends TreeNodeData, S extends InnerProps> {
  treeData: TreeData<T>;
  getChildNodes: (node: T) => T[];
  getRootNodes?: (treeData: TreeData<T>) => T[];
  onNodeSelect?: (node: T) => void;
  components?: Partial<TreeViewComponents<T, S>>;
  className?: string;
  classPrefix?: string;
  innerProps: S;
}

export const TreeView = <T extends TreeNodeData, S extends InnerProps>(
  props: TreeViewProps<T, S>,
): React.ReactElement<TreeViewProps<T, S>> => {
  const {
    treeData,
    className,
    classPrefix,
    components,
    onNodeSelect,
    getChildNodes,
    getRootNodes,
    innerProps,
  } = props;
  const rootNodes =
    getRootNodes?.(treeData) ??
    treeData.rootIds
      .map((rootId) => treeData.nodes.get(rootId))
      .filter(isNonNullable);
  const defaultTreeComponents = {
    TreeNodeView: DefaultTreeNodeView,
    TreeNodeContainer: DefaultTreeNodeContainer,
  };
  const treeComponents = components
    ? { ...defaultTreeComponents, ...components }
    : defaultTreeComponents;
  return (
    <div
      className={clsx('tree-view__node__root', className ?? '', {
        [`${classPrefix}__tree-view__node__root`]: classPrefix,
      })}
    >
      {rootNodes.map((node) => (
        <treeComponents.TreeNodeView
          key={node.id}
          level={0}
          node={node}
          getChildNodes={getChildNodes}
          components={treeComponents}
          onNodeSelect={onNodeSelect}
          classPrefix={classPrefix}
          innerProps={innerProps}
        />
      ))}
    </div>
  );
};
