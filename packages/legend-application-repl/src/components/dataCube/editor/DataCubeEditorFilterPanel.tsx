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

import { DataCubeIcon, useDropdownMenu } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { DataCubeQueryFilterGroupOperator } from '../../../stores/dataCube/core/DataCubeQueryEngine.js';
import {
  DataCubeEditorFilterConditionGroupNode,
  DataCubeEditorFilterConditionNode,
} from '../../../stores/dataCube/editor/DataCubeEditorFilterPanelState.js';
import {
  FormDropdownMenu,
  FormDropdownMenuItem,
  FormDropdownMenuTrigger,
} from '../../repl/Form.js';
import type { DataCubeState } from '../../../stores/dataCube/DataCubeState.js';

const DataCubeEditorFilterConditionNodeDisplay = observer(
  (props: {
    node: DataCubeEditorFilterConditionNode;
    level: number;
    dataCube: DataCubeState;
  }) => {
    const { node, level, dataCube } = props;
    const panel = dataCube.editor.filter;
    const [openColumnsDropdown, closeColumnssDropdown, columnsDropdownProps] =
      useDropdownMenu();
    const [
      openOperatorsDropdown,
      closeOperatorsDropdown,
      operatorsDropdownProps,
    ] = useDropdownMenu();

    return (
      <div className="flex h-6 items-center">
        <div
          style={{ paddingLeft: `${level * 10 + 4}px` }}
          className="flex-shrink-0"
        />
        <FormDropdownMenuTrigger
          className="mr-1 w-32"
          onClick={openColumnsDropdown}
        >
          {node.column.name}
        </FormDropdownMenuTrigger>
        <FormDropdownMenu className="w-32" {...columnsDropdownProps}>
          {panel.columns.map((column) => (
            <FormDropdownMenuItem
              key={column.name}
              onClick={() => {
                node.setColumn(column);
                // WIP: need to make all the changes to the operator/value here potentially
                closeColumnssDropdown();
              }}
            >
              {column.name}
            </FormDropdownMenuItem>
          ))}
        </FormDropdownMenu>
        <FormDropdownMenuTrigger
          className="w-24"
          onClick={openOperatorsDropdown}
        >
          {node.operation.label}
        </FormDropdownMenuTrigger>
        <FormDropdownMenu className="w-24" {...operatorsDropdownProps}>
          {panel.operations.map((op) => (
            <FormDropdownMenuItem
              key={op.operator}
              onClick={() => {
                node.setOperation(op);
                // WIP: need to make all the changes to the value/column here potentially
                closeOperatorsDropdown();
              }}
            >
              {op.label}
            </FormDropdownMenuItem>
          ))}
        </FormDropdownMenu>
        {/* WIP: populate the value here as well */}
        <div className="flex-shrink-0">Some Value</div>
      </div>
    );
  },
);

const DataCubeEditorFilterGroupNodeDisplay = observer(
  (props: {
    node: DataCubeEditorFilterConditionGroupNode;
    level: number;
    dataCube: DataCubeState;
  }) => {
    const { node, level } = props;
    const [
      openOperatorsDropdown,
      closeOperatorsDropdown,
      operatorsDropdownProps,
    ] = useDropdownMenu();

    return (
      <div className="flex h-6 items-center">
        <div
          style={{ paddingLeft: `${level * 10 + 4}px` }}
          className="flex-shrink-0"
        />
        <FormDropdownMenuTrigger
          className="w-14"
          onClick={openOperatorsDropdown}
        >
          {node.operation === DataCubeQueryFilterGroupOperator.AND
            ? 'All of'
            : 'Any of'}
        </FormDropdownMenuTrigger>
        <FormDropdownMenu className="w-14" {...operatorsDropdownProps}>
          <FormDropdownMenuItem
            onClick={() => {
              node.setOperation(DataCubeQueryFilterGroupOperator.AND);
              closeOperatorsDropdown();
            }}
          >
            All of
          </FormDropdownMenuItem>
          <FormDropdownMenuItem
            onClick={() => {
              node.setOperation(DataCubeQueryFilterGroupOperator.OR);
              closeOperatorsDropdown();
            }}
          >
            Any of
          </FormDropdownMenuItem>
        </FormDropdownMenu>
      </div>
    );
  },
);

const DataCubeEditorFilterGroupDisplay = observer(
  (props: {
    node: DataCubeEditorFilterConditionGroupNode;
    level: number;
    dataCube: DataCubeState;
  }) => {
    const { node, level, dataCube } = props;

    return (
      <div className="">
        <DataCubeEditorFilterGroupNodeDisplay
          node={node}
          level={level}
          dataCube={dataCube}
        />
        <div className="">
          {node.children.map((childNode) => {
            if (childNode instanceof DataCubeEditorFilterConditionNode) {
              return (
                <DataCubeEditorFilterConditionNodeDisplay
                  key={node.uuid}
                  level={level + 1}
                  node={childNode}
                  dataCube={dataCube}
                />
              );
            } else if (
              childNode instanceof DataCubeEditorFilterConditionGroupNode
            ) {
              return (
                <DataCubeEditorFilterGroupDisplay
                  key={node.uuid}
                  level={level + 1}
                  node={childNode}
                  dataCube={dataCube}
                />
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  },
);

export const DataCubeEditorFilterPanel = observer(
  (props: { dataCube: DataCubeState }) => {
    const { dataCube } = props;
    const panel = dataCube.editor.filter;

    return (
      <div className="h-full w-full select-none p-2">
        <div className="flex h-6">
          <div className="flex h-6 items-center text-xl font-medium">
            <DataCubeIcon.TableFilter />
          </div>
          <div className="ml-1 flex h-6 items-center text-xl font-medium">
            Filter
          </div>
        </div>
        <div className="flex h-[calc(100%_-_24px)] w-full">
          <div className="flex h-full w-full pt-1">
            <div className="relative h-full w-full overflow-auto rounded-sm border border-neutral-200">
              {!panel.tree.root && (
                <div className="h-full w-full p-3">
                  <div>
                    No filter is specified. Click the button below to start.
                  </div>
                  <button
                    className="w-30 mt-2 h-6 border border-neutral-400 bg-neutral-300 px-2 hover:brightness-95"
                    onClick={() => {
                      panel.initializeTree();
                    }}
                  >
                    Create New Filter
                  </button>
                </div>
              )}
              {panel.tree.root && (
                <div className="py-1">
                  <DataCubeEditorFilterGroupDisplay
                    node={panel.tree.root}
                    level={0}
                    dataCube={dataCube}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
