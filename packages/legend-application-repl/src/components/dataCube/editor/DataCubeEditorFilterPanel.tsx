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

import { cn, DataCubeIcon, useDropdownMenu } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import {
  DataCubeQueryFilterGroupOperator,
  type DataCubeOperationValue,
} from '../../../stores/dataCube/core/DataCubeQueryEngine.js';
import {
  DataCubeEditorFilterConditionGroupNode,
  DataCubeEditorFilterConditionNode,
  type DataCubeEditorFilterNode,
} from '../../../stores/dataCube/editor/DataCubeEditorFilterPanelState.js';
import {
  FormDropdownMenu,
  FormDropdownMenuItem,
  FormDropdownMenuTrigger,
} from '../../repl/Form.js';
import type { DataCubeState } from '../../../stores/dataCube/DataCubeState.js';
import { forwardRef } from 'react';
import { PRIMITIVE_TYPE } from '@finos/legend-graph';

const FILTER_TREE_LEFT_PADDING = 4;
const FILTER_TREE_INDENTATION_SPACE = 10;

const DataCubeEditorFilterConditionNodeValueEditor = observer(
  forwardRef<
    HTMLInputElement,
    {
      value: DataCubeOperationValue;
      updateValue: (value: unknown) => void;
    }
  >(function DataCubeEditorFilterConditionNodeValueEditor(props, ref) {
    const { value, updateValue } = props;
    // WIP: support collection/column
    switch (value.type) {
      case PRIMITIVE_TYPE.STRING: {
        return (
          <input
            className="h-5 flex-shrink-0 border border-neutral-400 px-1.5 text-sm disabled:border-neutral-300 disabled:bg-neutral-50 disabled:text-neutral-300"
            value={value.value as string}
            onChange={(event) => updateValue(event.target.value)}
          />
        );
      }
      default:
        return null;
    }
  }),
);

function DataCubeEditorFilterNotLabel() {
  return (
    <div className="relative flex pl-2.5">
      <div className="absolute -left-2 h-0 w-0 border-[9px] border-neutral-600 border-b-transparent border-l-transparent border-t-transparent" />
      <div
        className="mr-1 flex h-[18px] w-10 flex-shrink-0 items-center bg-neutral-600 pl-2 text-sm font-medium text-white"
        title="Filter is inverted: select all but what matches."
      >
        NOT
      </div>
    </div>
  );
}

const DataCubeEditorFilterConditionNodeController = observer(
  (props: {
    className?: string | undefined;
    node: DataCubeEditorFilterNode;
    dataCube: DataCubeState;
  }) => {
    const { className, node } = props;
    return (
      <div
        className={cn(
          'flex h-3.5 w-14 flex-shrink-0 bg-neutral-100',
          className,
        )}
      >
        <button
          className="flex h-3.5 w-3.5 items-center justify-center rounded-bl-sm rounded-tl-sm border border-neutral-400 hover:bg-neutral-200"
          onClick={() => {
            // do nothing
          }}
          title="Insert a new column filter, just after this filter."
        >
          <DataCubeIcon.FilterAddOperator className="stroke-[2.5] text-sm" />
        </button>
        <button
          className="flex h-3.5 w-3.5 items-center justify-center border border-l-0 border-neutral-400 hover:bg-neutral-200"
          onClick={() => {
            // do nothing
          }}
          title="Remove this filter"
        >
          <DataCubeIcon.FilterRemoveOperator className="stroke-[2.5] text-sm" />
        </button>
        <button
          className="flex h-3.5 w-3.5 items-center justify-center border border-l-0 border-neutral-400 hover:bg-neutral-200"
          onClick={() => {
            // do nothing
          }}
          title="Put this filter in its own sub-group (and combine it with other filters)."
        >
          <DataCubeIcon.FilterGroupOperator className="stroke-[2.5] text-sm" />
        </button>
        <button
          className={cn(
            'flex h-3.5 w-3.5 items-center justify-center rounded-br-sm rounded-tr-sm border border-l-0 border-neutral-400 hover:bg-neutral-200',
            {
              'bg-neutral-600': node.not,
              'border-neutral-600': node.not,
              'text-white': node.not,
              'hover:bg-neutral-600': node.not,
            },
          )}
          onClick={() => node.setNot(!node.not)}
          title={
            node.not
              ? 'Turn off the NOT operator on this filter to select only what matches.'
              : 'Turn on the NOT operator on this filter to select all but what matches.'
          }
        >
          <DataCubeIcon.FilterNotOperator className="stroke-[3] text-xs" />
        </button>
      </div>
    );
  },
);

const DataCubeEditorFilterConditionNodeDisplay = observer(
  (props: {
    node: DataCubeEditorFilterConditionNode;
    level: number;
    dataCube: DataCubeState;
  }) => {
    const { node, level, dataCube } = props;
    const panel = dataCube.editor.filter;
    const [
      openColumnsDropdown,
      closeColumnssDropdown,
      columnsDropdownProps,
      columnsDropdownPropsOpen,
    ] = useDropdownMenu();
    const [
      openOperatorsDropdown,
      closeOperatorsDropdown,
      operatorsDropdownProps,
      operatorsDropdownPropsOpen,
    ] = useDropdownMenu();

    return (
      <div className="flex h-6 items-center">
        <div
          style={{
            paddingLeft: `${level * FILTER_TREE_INDENTATION_SPACE + FILTER_TREE_LEFT_PADDING}px`,
          }}
          className="flex-shrink-0"
        />
        <DataCubeEditorFilterConditionNodeController
          className="mr-1"
          node={node}
          dataCube={dataCube}
        />
        {node.not && <DataCubeEditorFilterNotLabel />}
        <FormDropdownMenuTrigger
          className="mr-1 w-32"
          onClick={openColumnsDropdown}
          open={columnsDropdownPropsOpen}
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
              autoFocus={node.column.name === column.name}
            >
              {column.name}
            </FormDropdownMenuItem>
          ))}
        </FormDropdownMenu>
        <FormDropdownMenuTrigger
          className="mr-1 w-24"
          onClick={openOperatorsDropdown}
          open={operatorsDropdownPropsOpen}
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
              autoFocus={node.operation.operator === op.operator}
            >
              {op.label}
            </FormDropdownMenuItem>
          ))}
        </FormDropdownMenu>
        <div className="flex-shrink-0">
          {node.value && (
            <DataCubeEditorFilterConditionNodeValueEditor
              value={node.value}
              updateValue={(val) => node.updateValue(val)}
            />
          )}
        </div>
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
    const { node, level, dataCube } = props;
    const [
      openOperatorsDropdown,
      closeOperatorsDropdown,
      operatorsDropdownProps,
      operatorsDropdownPropsOpen,
    ] = useDropdownMenu();

    return (
      <div className="flex h-6 items-center">
        <div
          style={{
            paddingLeft: `${level * FILTER_TREE_INDENTATION_SPACE + FILTER_TREE_LEFT_PADDING}px`,
          }}
          className="flex-shrink-0"
        />
        {level !== 0 && (
          <>
            <DataCubeEditorFilterConditionNodeController
              className="mr-1"
              node={node}
              dataCube={dataCube}
            />
            <DataCubeEditorFilterNotLabel />
          </>
        )}
        <FormDropdownMenuTrigger
          className="w-14"
          onClick={openOperatorsDropdown}
          open={operatorsDropdownPropsOpen}
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
            autoFocus={node.operation === DataCubeQueryFilterGroupOperator.AND}
          >
            All of
          </FormDropdownMenuItem>
          <FormDropdownMenuItem
            onClick={() => {
              node.setOperation(DataCubeQueryFilterGroupOperator.OR);
              closeOperatorsDropdown();
            }}
            autoFocus={node.operation === DataCubeQueryFilterGroupOperator.OR}
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
