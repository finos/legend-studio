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

import type { CellDoubleClickedEvent } from 'ag-grid-community';
import type { DataCubeConfiguration } from '../../core/model/DataCubeConfiguration.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

export class DataCubeDimensionalTree {
  rootNodes: DataCubeDimensionalNode[] = [];

  constructor(childNodes: DataCubeDimensionalNode[]) {
    this.rootNodes = childNodes;
  }
}

export class DataCubeDimensionalNode {
  column: string | undefined;
  dimension!: string;
  childNodes: DataCubeDimensionalNode[] = [];

  constructor(
    column: string | undefined,
    dimension: string,
    childNodes: DataCubeDimensionalNode[],
  ) {
    this.column = column;
    this.dimension = dimension;
    this.childNodes = childNodes;
  }
}

export function hydrateDataCubeDimensionalTree(
  configuration: DataCubeConfiguration,
  event?: CellDoubleClickedEvent,
  tree?: DataCubeDimensionalTree,
): DataCubeDimensionalTree | undefined {
  // TODO: Handle for one dimension
  if (!event && !tree) {
    const nodes = configuration.dimensions.dimensions.map(
      (dimension) => new DataCubeDimensionalNode(undefined, dimension.name, []),
    );
    //   nodes.forEach((node,idx) =>
    //     {
    //       if (nodes[idx+1])
    //       {
    //         node?.dimensionalNodes.push(nodes[idx+1]!);
    //       }
    // });
    return new DataCubeDimensionalTree(nodes);
  } else {
    guaranteeNonNullable(tree);
    guaranteeNonNullable(event);
    tree?.rootNodes.forEach((node, idx) => {
      if (node.dimension === event?.column.getColId()) {
        let childNode: DataCubeDimensionalNode;
        const metadata = event.data['metadata'];
        const column = metadata.get(node.dimension);
        const dimension = configuration.dimensions.dimensions.find(
          (x) => x.name === node.dimension,
        );
        if (column) {
          const index = guaranteeNonNullable(
            dimension?.columns.indexOf(column),
          );
          childNode = new DataCubeDimensionalNode(
            dimension?.columns[index + 1],
            node.dimension,
            [],
          );
          // still need to add more on how to push it at the bottom
          // also create a dead node or a leaf node
        } else {
          childNode = new DataCubeDimensionalNode(
            dimension?.columns[0],
            node.dimension,
            [],
          );
          // if (idx < tree.childNodes.length - 1)
          // {
          //   tree.childNodes.slice(idx + 1).forEach(node1 => childNode.dimensionalNodes.push(node1));
          // }
          node.childNodes.push(childNode);
          return tree;
        }
      }
    });
    return tree;
  }
}
