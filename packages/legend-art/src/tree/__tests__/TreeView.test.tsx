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

import { describe, test, expect, afterEach, jest } from '@jest/globals';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { unitTest } from '@finos/legend-shared/test';
import { TreeView, type TreeData, type TreeNodeData } from '../TreeView.js';

interface TestNode extends TreeNodeData {
  id: string;
  label: string;
}

const buildNode = (
  id: string,
  childrenIds?: string[],
  isOpen?: boolean,
): TestNode => ({
  id,
  label: id,
  ...(childrenIds ? { childrenIds } : {}),
  ...(isOpen !== undefined ? { isOpen } : {}),
});

const buildTreeData = (
  nodes: TestNode[],
  rootIds: string[],
): TreeData<TestNode> => ({
  rootIds,
  nodes: new Map(nodes.map((node) => [node.id, node])),
});

const getChildNodes =
  (treeData: TreeData<TestNode>) =>
  (node: TestNode): TestNode[] =>
    (node.childrenIds ?? [])
      .map((id) => treeData.nodes.get(id))
      .filter((child): child is TestNode => child !== undefined);

const renderTree = (
  treeData: TreeData<TestNode>,
  options?: { onNodeSelect?: (node: TestNode) => void; classPrefix?: string },
): ReturnType<typeof render> =>
  render(
    <TreeView
      treeData={treeData}
      getChildNodes={getChildNodes(treeData)}
      innerProps={{}}
      {...(options?.onNodeSelect ? { onNodeSelect: options.onNodeSelect } : {})}
      {...(options?.classPrefix ? { classPrefix: options.classPrefix } : {})}
    />,
  );

afterEach(() => cleanup());

describe('TreeView', () => {
  describe(unitTest('root resolution'), () => {
    test(unitTest('renders the root nodes'), () => {
      renderTree(buildTreeData([buildNode('a'), buildNode('b')], ['a', 'b']));
      expect(screen.getByText('a')).toBeDefined();
      expect(screen.getByText('b')).toBeDefined();
    });

    test(unitTest('silently drops unknown root ids'), () => {
      renderTree(buildTreeData([buildNode('a')], ['a', 'ghost']));
      // a root id with no matching entry in `nodes` is filtered out rather
      // than throwing or rendering a blank node
      expect(screen.getByText('a')).toBeDefined();
      expect(screen.queryByText('ghost')).toBeNull();
    });

    test(unitTest('renders nothing for an empty tree'), () => {
      const { container } = renderTree(buildTreeData([], []));
      expect(container.textContent).toEqual('');
    });

    test(unitTest('honours a getRootNodes override'), () => {
      const treeData = buildTreeData(
        [buildNode('a'), buildNode('b')],
        ['a', 'b'],
      );
      render(
        <TreeView
          treeData={treeData}
          getChildNodes={getChildNodes(treeData)}
          getRootNodes={(data) => [
            data.nodes.get('b') as NonNullable<TestNode>,
          ]}
          innerProps={{}}
        />,
      );
      // the override replaces `rootIds` entirely
      expect(screen.getByText('b')).toBeDefined();
      expect(screen.queryByText('a')).toBeNull();
    });
  });

  describe(unitTest('expansion'), () => {
    test(unitTest('hides children of a collapsed node'), () => {
      renderTree(
        buildTreeData(
          [buildNode('parent', ['child'], false), buildNode('child')],
          ['parent'],
        ),
      );
      expect(screen.getByText('parent')).toBeDefined();
      expect(screen.queryByText('child')).toBeNull();
    });

    test(unitTest('shows children of an expanded node'), () => {
      renderTree(
        buildTreeData(
          [buildNode('parent', ['child'], true), buildNode('child')],
          ['parent'],
        ),
      );
      expect(screen.getByText('child')).toBeDefined();
    });

    test(unitTest('renders nested descendants recursively'), () => {
      renderTree(
        buildTreeData(
          [
            buildNode('root', ['mid'], true),
            buildNode('mid', ['leaf'], true),
            buildNode('leaf'),
          ],
          ['root'],
        ),
      );
      expect(screen.getByText('leaf')).toBeDefined();
    });

    test(unitTest('stops at a collapsed node partway down the tree'), () => {
      renderTree(
        buildTreeData(
          [
            buildNode('root', ['mid'], true),
            buildNode('mid', ['leaf'], false),
            buildNode('leaf'),
          ],
          ['root'],
        ),
      );
      expect(screen.getByText('mid')).toBeDefined();
      expect(screen.queryByText('leaf')).toBeNull();
    });
  });

  describe(unitTest('selection'), () => {
    test(unitTest('reports the clicked node'), () => {
      const onNodeSelect = jest.fn();
      const treeData = buildTreeData(
        [buildNode('parent', ['child'], true), buildNode('child')],
        ['parent'],
      );
      renderTree(treeData, { onNodeSelect });

      fireEvent.click(screen.getByText('child'));

      expect(onNodeSelect).toHaveBeenCalledTimes(1);
      expect(onNodeSelect).toHaveBeenCalledWith(treeData.nodes.get('child'));
    });

    test(unitTest('is optional'), () => {
      renderTree(buildTreeData([buildNode('a')], ['a']));
      expect(() => fireEvent.click(screen.getByText('a'))).not.toThrow();
    });
  });

  describe(unitTest('indentation'), () => {
    const paddingOf = (label: string): string | undefined =>
      screen.getByText(label).parentElement?.style.paddingLeft;

    test(unitTest('indents each level by one step'), () => {
      renderTree(
        buildTreeData(
          [
            buildNode('root', ['mid'], true),
            buildNode('mid', ['leaf'], true),
            buildNode('leaf'),
          ],
          ['root'],
        ),
      );
      // the container is rendered at `level + 1` but padded at `level - 1`, so
      // a root node sits flush at 0rem
      expect(paddingOf('root')).toEqual('0rem');
      expect(paddingOf('mid')).toEqual('1rem');
      expect(paddingOf('leaf')).toEqual('2rem');
    });
  });

  describe(unitTest('class prefixing'), () => {
    test(unitTest('adds prefixed class names alongside the defaults'), () => {
      const { container } = renderTree(buildTreeData([buildNode('a')], ['a']), {
        classPrefix: 'my-app',
      });
      expect(
        container.querySelector('.my-app__tree-view__node__root'),
      ).not.toBeNull();
      expect(container.querySelector('.tree-view__node__root')).not.toBeNull();
    });

    test(unitTest('omits prefixed class names by default'), () => {
      const { container } = renderTree(buildTreeData([buildNode('a')], ['a']));
      expect(container.querySelector('[class*="undefined"]')).toBeNull();
    });
  });
});
