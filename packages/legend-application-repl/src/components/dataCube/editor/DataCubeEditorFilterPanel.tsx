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

import {
  BasePopover,
  cn,
  DataCubeIcon,
  DateCalendar,
  DatePicker,
  DatePickerField,
  useDropdownMenu,
  useForkRef,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import {
  DataCubeOperationAdvancedValueType,
  DataCubeQueryFilterGroupOperator,
  getDataType,
  type DataCubeOperationValue,
} from '../../../stores/dataCube/core/DataCubeQueryEngine.js';
import {
  DataCubeFilterEditorConditionGroupTreeNode,
  DataCubeFilterEditorConditionTreeNode,
  type DataCubeFilterEditorTreeNode,
} from '../../../stores/dataCube/core/filter/DataCubeQueryFilterEditorState.js';
import {
  FormDropdownMenu,
  FormDropdownMenuItem,
  FormDropdownMenuTrigger,
} from '../../repl/Form.js';
import type { DataCubeState } from '../../../stores/dataCube/DataCubeState.js';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { DATE_FORMAT, PRIMITIVE_TYPE } from '@finos/legend-graph';
import {
  formatDate,
  getNullableFirstEntry,
  guaranteeIsNumber,
  parseISO,
} from '@finos/legend-shared';
import { evaluate } from 'mathjs';

const FILTER_TREE_OFFSET = 10;
const FILTER_TREE_INDENTATION_SPACE = 36;
const FILTER_TREE_HORIZONTAL_GUTTER_LINE_PADDING = 8;
const FILTER_TREE_VERTICAL_GUTTER_LINE_OFFSET = 6;
const FILTER_TREE_CONTROLLER_OFFSET = 60;
const FILTER_TREE_GROUP_HIGHLIGHT_PADDING = 2;

const DataCubeEditorFilterConditionNodeTextValueEditor = observer(
  forwardRef<
    HTMLInputElement,
    {
      value: string;
      updateValue: (value: string) => void;
    }
  >(function DataCubeEditorFilterConditionNodeValueEditor(props, ref) {
    const { value, updateValue } = props;
    const inputRef = useRef<HTMLInputElement>(null);
    const handleRef = useForkRef(inputRef, ref);

    return (
      <input
        ref={handleRef}
        className="h-5 w-full flex-shrink-0 border border-neutral-400 px-1 text-sm disabled:border-neutral-300 disabled:bg-neutral-50 disabled:text-neutral-300"
        value={value}
        onKeyDown={(event) => {
          if (event.code === 'Escape') {
            inputRef.current?.select();
          }
        }}
        onChange={(event) => updateValue(event.target.value)}
      />
    );
  }),
);

const EVLUATION_ERROR_LABEL = '#ERR';
const DataCubeEditorFilterConditionNodeNumberValueEditor = observer(
  forwardRef<
    HTMLInputElement,
    {
      value: number;
      updateValue: (value: number) => void;
      defaultValue?: number | undefined;
      step?: number | undefined;
    }
  >(function DataCubeEditorFilterConditionNodeValueEditor(props, ref) {
    const { value, updateValue, defaultValue = 0, step = 1 } = props;
    const [inputValue, setInputValue] = useState<string>(value.toString());
    const inputRef = useRef<HTMLInputElement>(null);
    const handleRef = useForkRef(inputRef, ref);

    const calculateExpression = (): void => {
      const numericValue = Number(inputValue);
      if (inputValue === '') {
        // Explicitly check this case since `Number()` parses empty string as `0`
        setInputValue(defaultValue.toString());
        updateValue(defaultValue);
      } else if (isNaN(numericValue)) {
        if (inputValue === EVLUATION_ERROR_LABEL) {
          setInputValue(value.toString());
          return;
        }
        // If the value is not a number, try to evaluate it as an expression
        try {
          const calculatedValue = guaranteeIsNumber(evaluate(inputValue));
          setInputValue(calculatedValue.toString());
          updateValue(calculatedValue);
        } catch {
          setInputValue(EVLUATION_ERROR_LABEL);
          updateValue(defaultValue);
        }
      }
    };

    useEffect(() => {
      setInputValue(value.toString());
    }, [value]);

    return (
      <div className="relative h-5 w-full flex-shrink-0">
        <input
          ref={handleRef}
          inputMode="numeric"
          spellCheck={false}
          type="text" // NOTE: we leave this as text so that we can support expression evaluation
          className="h-full w-full border border-neutral-400 px-1 pr-5 text-sm disabled:border-neutral-300 disabled:bg-neutral-50 disabled:text-neutral-300"
          value={inputValue}
          onKeyDown={(event) => {
            if (event.code === 'Enter') {
              calculateExpression();
              inputRef.current?.focus();
            } else if (event.code === 'Escape') {
              inputRef.current?.select();
            } else if (event.code === 'ArrowUp') {
              event.preventDefault();
              const newValue = value + step;
              setInputValue(newValue.toString());
              updateValue(newValue);
            } else if (event.code === 'ArrowDown') {
              event.preventDefault();
              const newValue = value - step;
              setInputValue(newValue.toString());
              updateValue(newValue);
            }
          }}
          onChange={(event) => {
            const newInputValue = event.target.value;
            setInputValue(newInputValue);
            const numericValue = Number(newInputValue);
            if (
              isNaN(numericValue) ||
              !newInputValue // Explicitly check this case since `Number()` parses empty string as `0`
            ) {
              return;
            }
            updateValue(numericValue);
          }}
          onBlur={() => calculateExpression()}
        />
        <div className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center">
          <button
            className="text-lg text-neutral-500 hover:text-neutral-600"
            title="Evaluate Expression (Enter)"
            onClick={calculateExpression}
            tabIndex={-1}
          >
            <DataCubeIcon.Calculate />
          </button>
        </div>
      </div>
    );
  }),
);

// NOTE: this has to be declared here instead of defined inline in slot configuration of DatePicker
// else, with each re-render, a new function will be created and the ref might be lost
const CustomDateFieldPicker = forwardRef<HTMLInputElement>(
  function CustomDateFieldPicker(p, r) {
    return (
      <DatePickerField
        {...p}
        ref={r}
        className="h-5 w-full flex-shrink-0 border border-neutral-400 px-1 pr-5 text-sm disabled:border-neutral-300 disabled:bg-neutral-50 disabled:text-neutral-300"
      />
    );
  },
);

const CustomDateFieldPickerOpenCalendarButton = observer(
  (props: { value: string; updateValue: (value: string) => void }) => {
    const { value, updateValue } = props;
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    return (
      <>
        <button
          className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center"
          title="Open Date Picker..."
          onClick={(event) => {
            setAnchorEl(event.currentTarget);
          }}
          tabIndex={-1}
        >
          <DataCubeIcon.Calendar className="text-lg text-neutral-500 hover:text-neutral-600" />
        </button>
        <BasePopover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          transformOrigin={{ vertical: 'top', horizontal: 'center' }}
          onClose={() => setAnchorEl(null)}
          classes={{
            root: 'data-cube-editor-date-calendar mt-0.5',
            paper: 'shadow-md rounded-none border border-neutral-300',
          }}
        >
          <DateCalendar
            autoFocus={true}
            value={parseISO(value)}
            onChange={(newValue: Date) => {
              updateValue(formatDate(newValue, DATE_FORMAT));
              setAnchorEl(null);
            }}
          />
        </BasePopover>
      </>
    );
  },
);

const DataCubeEditorFilterConditionNodeDateValueEditor = observer(
  forwardRef<
    HTMLInputElement,
    {
      value: string;
      updateValue: (value: string) => void;
    }
  >(function DataCubeEditorFilterConditionNodeValueEditor(props, ref) {
    const { value, updateValue } = props;

    return (
      <DatePicker
        ref={ref}
        value={parseISO(value)}
        format={DATE_FORMAT}
        slots={{
          field: CustomDateFieldPicker,
          openPickerButton: () => (
            <CustomDateFieldPickerOpenCalendarButton
              value={value}
              updateValue={updateValue}
            />
          ),
        }}
        onChange={(newValue: Date | null) => {
          if (newValue) {
            updateValue(formatDate(newValue, DATE_FORMAT));
          }
        }}
      />
    );
  }),
);

const DataCubeEditorFilterConditionNodeColumnSelector = observer(
  forwardRef<
    HTMLButtonElement,
    {
      value: string;
      updateValue: (value: string) => void;
      dataCube: DataCubeState;
    }
  >(function DataCubeEditorFilterConditionNodeColumnSelector(props, ref) {
    const { value, updateValue, dataCube } = props;
    const panel = dataCube.editor.filter;
    const matchingColumn = panel.columns.find(
      (column) => column.name === value,
    );
    const [
      openColumnsDropdown,
      closeColumnsDropdown,
      columnsDropdownProps,
      columnsDropdownPropsOpen,
    ] = useDropdownMenu();

    return (
      <>
        <FormDropdownMenuTrigger
          ref={ref}
          className="relative mr-1 w-32"
          onClick={openColumnsDropdown}
          open={columnsDropdownPropsOpen}
        >
          {value}
        </FormDropdownMenuTrigger>
        <FormDropdownMenu className="w-32" {...columnsDropdownProps}>
          {panel.columns
            .filter(
              (column) =>
                matchingColumn &&
                getDataType(matchingColumn.type) === getDataType(column.type),
            )
            .map((column) => (
              <FormDropdownMenuItem
                key={column.name}
                onClick={() => {
                  updateValue(column.name);
                  closeColumnsDropdown();
                }}
                autoFocus={value === column.name}
              >
                {column.name}
              </FormDropdownMenuItem>
            ))}
        </FormDropdownMenu>
      </>
    );
  }),
);

const DataCubeEditorFilterConditionNodeValueEditor = observer(
  forwardRef<
    HTMLElement,
    {
      value: DataCubeOperationValue;
      updateValue: (value: unknown) => void;
      dataCube: DataCubeState;
    }
  >(function DataCubeEditorFilterConditionNodeValueEditor(props, ref) {
    const { value, updateValue, dataCube } = props;
    // WIP: support collection/column
    switch (value.type) {
      case PRIMITIVE_TYPE.STRING:
        return (
          <DataCubeEditorFilterConditionNodeTextValueEditor
            ref={ref as React.MutableRefObject<HTMLInputElement>}
            value={value.value as string}
            updateValue={(val) => updateValue(val)}
          />
        );
      case PRIMITIVE_TYPE.NUMBER:
      case PRIMITIVE_TYPE.DECIMAL:
      case PRIMITIVE_TYPE.FLOAT:
      case PRIMITIVE_TYPE.INTEGER:
        return (
          <DataCubeEditorFilterConditionNodeNumberValueEditor
            ref={ref as React.MutableRefObject<HTMLInputElement>}
            value={value.value as number}
            updateValue={(val) => updateValue(val)}
          />
        );
      case PRIMITIVE_TYPE.DATE:
      case PRIMITIVE_TYPE.STRICTDATE:
      case PRIMITIVE_TYPE.DATETIME:
        return (
          <DataCubeEditorFilterConditionNodeDateValueEditor
            ref={ref as React.MutableRefObject<HTMLInputElement>}
            value={value.value as string}
            updateValue={(val) => updateValue(val)}
          />
        );
      case DataCubeOperationAdvancedValueType.COLUMN:
        return (
          <DataCubeEditorFilterConditionNodeColumnSelector
            ref={ref as React.MutableRefObject<HTMLButtonElement>}
            value={value.value as string}
            updateValue={(val) => updateValue(val)}
            dataCube={dataCube}
          />
        );
      default:
        return null;
    }
  }),
);

function DataCubeEditorFilterNotLabel() {
  return (
    <div className="relative flex pl-2.5">
      <div className="pointer-events-none absolute -left-2 h-0 w-0 border-[9px] border-neutral-600 border-b-transparent border-l-transparent border-t-transparent" />
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
    node: DataCubeFilterEditorTreeNode;
    dataCube: DataCubeState;
  }) => {
    const { className, node, dataCube } = props;
    const panel = dataCube.editor.filter;

    return (
      <div
        className={cn(
          'flex h-3.5 w-14 flex-shrink-0 bg-neutral-100',
          className,
        )}
      >
        <button
          className="flex h-3.5 w-3.5 items-center justify-center rounded-bl-sm rounded-tl-sm border border-neutral-400 hover:bg-neutral-200"
          onClick={() => panel.addFilterNode(node)}
          title="Insert a new column filter, just after this filter."
        >
          <DataCubeIcon.FilterAddOperator className="stroke-[2.5] text-sm" />
        </button>
        <button
          className="flex h-3.5 w-3.5 items-center justify-center border border-l-0 border-neutral-400 hover:bg-neutral-200"
          onClick={() => panel.removeFilterNode(node)}
          title="Remove this filter"
        >
          <DataCubeIcon.FilterRemoveOperator className="stroke-[2.5] text-sm" />
        </button>
        <button
          className="flex h-3.5 w-3.5 items-center justify-center border border-l-0 border-neutral-400 hover:bg-neutral-200"
          onClick={() => panel.layerFilterNode(node)}
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
    node: DataCubeFilterEditorConditionTreeNode;
    level: number;
    dataCube: DataCubeState;
  }) => {
    const { node, level, dataCube } = props;
    const panel = dataCube.editor.filter;
    const parentNode = node.parent;
    const nodeIdx = parentNode ? parentNode.children.indexOf(node) : undefined;
    const valueEditorRef = useRef<HTMLElement>(null);
    const [
      openColumnsDropdown,
      closeColumnsDropdown,
      columnsDropdownProps,
      columnsDropdownPropsOpen,
    ] = useDropdownMenu();
    const [
      openOperatorsDropdown,
      closeOperatorsDropdown,
      operatorsDropdownProps,
      operatorsDropdownPropsOpen,
    ] = useDropdownMenu();
    const focusOnValueEditor = useCallback(
      () => valueEditorRef.current?.focus(),
      [],
    );

    return (
      <div className="group flex h-6 items-center">
        <div
          className={cn(
            'z-1 absolute h-6 w-full bg-opacity-50 group-hover:bg-sky-100 group-hover:bg-opacity-50',
            {
              'bg-sky-50': node === panel.selectedNode,
              'border-[0.5px] border-l-2 border-sky-200 border-l-sky-600':
                node === panel.selectedNode,
            },
          )}
          onClick={() => panel.setSelectedNode(node)}
        />
        <div
          style={{
            paddingLeft: `${level * FILTER_TREE_INDENTATION_SPACE + FILTER_TREE_OFFSET + (level - 1) * FILTER_TREE_CONTROLLER_OFFSET}px`,
          }}
          className="relative h-6 flex-shrink-0"
          onClick={() => panel.setSelectedNode(node)}
        >
          {parentNode && (
            <div
              className="absolute top-0 flex h-6 items-center justify-end"
              style={{
                width: `${FILTER_TREE_INDENTATION_SPACE - FILTER_TREE_HORIZONTAL_GUTTER_LINE_PADDING - FILTER_TREE_VERTICAL_GUTTER_LINE_OFFSET}px`,
                right: `${FILTER_TREE_HORIZONTAL_GUTTER_LINE_PADDING}px`,
              }}
            >
              <div
                className={cn('h-[1px] w-full flex-1 bg-neutral-200', {
                  'bg-sky-600': parentNode === panel.selectedGroupNode,
                })}
              />
              {nodeIdx !== undefined && nodeIdx > 0 && (
                <div
                  className={cn(
                    'flex h-6 items-center justify-center pl-1 text-xs text-neutral-600',
                    {
                      'text-sky-600': parentNode === panel.selectedGroupNode,
                    },
                  )}
                >
                  {parentNode.operation === DataCubeQueryFilterGroupOperator.AND
                    ? 'and'
                    : 'or'}
                </div>
              )}
            </div>
          )}
        </div>
        <DataCubeEditorFilterConditionNodeController
          className="relative mr-1"
          node={node}
          dataCube={dataCube}
        />
        {node.not && <DataCubeEditorFilterNotLabel />}
        <FormDropdownMenuTrigger
          className="relative mr-1 w-32"
          onClick={openColumnsDropdown}
          open={columnsDropdownPropsOpen}
        >
          {node.column.name}
        </FormDropdownMenuTrigger>
        <FormDropdownMenu
          className="w-32"
          {...columnsDropdownProps}
          onClosed={focusOnValueEditor}
        >
          {panel.columns.map((column) => (
            <FormDropdownMenuItem
              key={column.name}
              onClick={() => {
                if (column !== node.column) {
                  const newOp = node.operation.isCompatibleWithColumn(column)
                    ? node.operation
                    : getNullableFirstEntry(
                        panel.dataCube.engine.filterOperations.filter((op) =>
                          op.isCompatibleWithColumn(column),
                        ),
                      );
                  if (newOp) {
                    node.setColumn(column);
                    node.setOperation(newOp);
                    node.setValue(newOp.generateDefaultValue(column));
                  }
                }
                closeColumnsDropdown();
              }}
              autoFocus={node.column.name === column.name}
            >
              {column.name}
            </FormDropdownMenuItem>
          ))}
        </FormDropdownMenu>
        <FormDropdownMenuTrigger
          className="relative mr-1 w-24"
          onClick={openOperatorsDropdown}
          open={operatorsDropdownPropsOpen}
        >
          {node.operation.label}
        </FormDropdownMenuTrigger>
        <FormDropdownMenu
          className="w-24"
          {...operatorsDropdownProps}
          onClosed={focusOnValueEditor}
        >
          {panel.dataCube.engine.filterOperations
            .filter((op) => op.isCompatibleWithColumn(node.column))
            .map((op) => (
              <FormDropdownMenuItem
                key={op.operator}
                onClick={() => {
                  if (op !== node.operation) {
                    if (op.isCompatibleWithColumn(node.column)) {
                      node.setOperation(op);
                      node.setValue(op.generateDefaultValue(node.column));
                    }
                  }
                  closeOperatorsDropdown();
                }}
                autoFocus={node.operation.operator === op.operator}
              >
                {op.label}
              </FormDropdownMenuItem>
            ))}
        </FormDropdownMenu>
        <div className="relative w-32 flex-shrink-0">
          {node.value && (
            <DataCubeEditorFilterConditionNodeValueEditor
              ref={valueEditorRef}
              value={node.value}
              updateValue={(val) => node.updateValue(val)}
              dataCube={dataCube}
            />
          )}
        </div>
      </div>
    );
  },
);

const DataCubeEditorFilterGroupNodeDisplay = observer(
  (props: {
    node: DataCubeFilterEditorConditionGroupTreeNode;
    level: number;
    dataCube: DataCubeState;
  }) => {
    const { node, level, dataCube } = props;
    const panel = dataCube.editor.filter;
    const parentNode = node.parent;
    const nodeIdx = parentNode ? parentNode.children.indexOf(node) : undefined;
    const [
      openOperatorsDropdown,
      closeOperatorsDropdown,
      operatorsDropdownProps,
      operatorsDropdownPropsOpen,
    ] = useDropdownMenu();

    return (
      <div className="group flex h-6 items-center">
        <div
          className={cn(
            'z-1 absolute h-6 w-full bg-opacity-50 group-hover:bg-sky-100 group-hover:bg-opacity-50',
            {
              'bg-sky-50': node === panel.selectedNode,
              'border-[0.5px] border-l-2 border-sky-200 border-l-sky-600':
                node === panel.selectedNode,
            },
          )}
          onClick={() => panel.setSelectedNode(node)}
        />
        <div
          style={{
            paddingLeft: `${level * FILTER_TREE_INDENTATION_SPACE + FILTER_TREE_OFFSET + (level !== 0 ? (level - 1) * FILTER_TREE_CONTROLLER_OFFSET : 0)}px`,
          }}
          className="relative h-6 flex-shrink-0"
          onClick={() => panel.setSelectedNode(node)}
        >
          {level !== 0 && parentNode && (
            <div
              className="absolute top-0 flex h-6 items-center justify-end"
              style={{
                width: `${FILTER_TREE_INDENTATION_SPACE - FILTER_TREE_HORIZONTAL_GUTTER_LINE_PADDING - FILTER_TREE_VERTICAL_GUTTER_LINE_OFFSET}px`,
                right: `${FILTER_TREE_HORIZONTAL_GUTTER_LINE_PADDING}px`,
              }}
            >
              <div
                className={cn('h-[1px] w-full flex-1 bg-neutral-200', {
                  'bg-sky-600': parentNode === panel.selectedGroupNode,
                })}
              />
              {nodeIdx !== undefined && nodeIdx > 0 && (
                <div
                  className={cn(
                    'flex h-6 items-center justify-center pl-1 text-xs text-neutral-600',
                    {
                      'text-sky-600': parentNode === panel.selectedGroupNode,
                    },
                  )}
                >
                  {parentNode.operation === DataCubeQueryFilterGroupOperator.AND
                    ? 'and'
                    : 'or'}
                </div>
              )}
            </div>
          )}
        </div>
        {level !== 0 && (
          <>
            <DataCubeEditorFilterConditionNodeController
              className="relative mr-1"
              node={node}
              dataCube={dataCube}
            />
            {node.not && <DataCubeEditorFilterNotLabel />}
          </>
        )}
        <FormDropdownMenuTrigger
          className="relative w-14"
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

// NOTE: This particular rendering of the filter tree leans on tree data structure used to organize the nodes
// and thus, though simpler to implement, makes it harder to implement certain features which favors flat
// structure like list, such as drag and drop, multi-select, etc.
// If those needs come up we could shift the implementation or look out for a library that already works well
// out of the box such as:
// See https://mui.com/x/react-tree-view/
// See https://github.com/lukasbach/react-complex-tree
const DataCubeEditorFilterGroupDisplay = observer(
  (props: {
    node: DataCubeFilterEditorConditionGroupTreeNode;
    level: number;
    dataCube: DataCubeState;
  }) => {
    const { node, level, dataCube } = props;
    const panel = dataCube.editor.filter;

    return (
      <div className="relative w-full">
        <div
          className={cn('pointer-events-none absolute h-full', {
            'border-[0.5px] border-sky-200 bg-sky-50':
              node === panel.selectedGroupNode,
          })}
          style={{
            marginLeft: `${level * FILTER_TREE_INDENTATION_SPACE + FILTER_TREE_OFFSET + level * FILTER_TREE_CONTROLLER_OFFSET - FILTER_TREE_GROUP_HIGHLIGHT_PADDING}px`,
            width: `calc(100% - ${level * FILTER_TREE_INDENTATION_SPACE + FILTER_TREE_OFFSET + level * FILTER_TREE_CONTROLLER_OFFSET - 2 * FILTER_TREE_GROUP_HIGHLIGHT_PADDING}px)`,
          }}
        />
        <DataCubeEditorFilterGroupNodeDisplay
          node={node}
          level={level}
          dataCube={dataCube}
        />
        <div className="relative">
          <div
            className={cn(
              'pointer-events-none absolute z-10 h-[calc(100%_-_12px)] w-0 border-l border-neutral-200',
              {
                'border-sky-600': node === panel.selectedGroupNode,
              },
            )}
            style={{
              marginLeft: `${level * FILTER_TREE_INDENTATION_SPACE + FILTER_TREE_OFFSET + FILTER_TREE_VERTICAL_GUTTER_LINE_OFFSET + level * FILTER_TREE_CONTROLLER_OFFSET}px`,
            }}
          />
          {node.children.map((childNode) => {
            if (childNode instanceof DataCubeFilterEditorConditionTreeNode) {
              return (
                <DataCubeEditorFilterConditionNodeDisplay
                  key={childNode.uuid}
                  level={level + 1}
                  node={childNode}
                  dataCube={dataCube}
                />
              );
            } else if (
              childNode instanceof DataCubeFilterEditorConditionGroupTreeNode
            ) {
              return (
                <DataCubeEditorFilterGroupDisplay
                  key={childNode.uuid}
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

    useEffect(() => {
      panel.setSelectedNode(undefined);
    }, [panel]);

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
            <div
              className="relative flex h-full w-full overflow-auto rounded-sm border border-neutral-200"
              onClick={() => panel.setSelectedNode(undefined)}
            >
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
                <div
                  className="flex flex-col py-1"
                  // prevent click event of filter tree from propagating to the
                  // container which when clicked, will clear node selection
                  onClick={(event) => event.stopPropagation()}
                >
                  <DataCubeEditorFilterGroupDisplay
                    node={panel.tree.root}
                    level={0}
                    dataCube={dataCube}
                  />
                  <div
                    // add a padding so there will always be a clickable area to clear node selection
                    className="min-h-6 w-full flex-1"
                    onClick={() => panel.setSelectedNode(undefined)}
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
