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
import { cn, DataCubeIcon } from '@finos/legend-art';
import type { DataCubeJsonFieldsState } from '../../../stores/view/extend/DataCubeJsonFieldsState.js';
import type { DataCubeJsonField } from '../../../stores/core/variant/DataCubeJsonOffers.js';
import { FormButton, FormTextInput } from '../../core/DataCubeFormUtils.js';
import { useDataCube } from '../../DataCubeProvider.js';

const FIELD_TREE_INDENTATION_SPACE = 14;

const percentage = (presence: number) =>
  Math.min(100, Math.floor(presence * 100));

const DataCubeJsonFieldTreeNode = observer(
  (props: {
    field: DataCubeJsonField;
    level: number;
    jsonFields: DataCubeJsonFieldsState;
  }) => {
    const { field, level, jsonFields } = props;
    const isExpanded =
      jsonFields.isExpanded(field.path) || Boolean(jsonFields.search.trim());
    const isSelected = jsonFields.isSelected(field.path);
    const name = field.path.length
      ? field.path[field.path.length - 1]
      : jsonFields.column?.name;

    return (
      <>
        <div
          className={cn(
            'flex h-5 cursor-pointer select-none items-center pr-1 text-sm hover:bg-sky-100',
            {
              'bg-sky-200 hover:bg-sky-200': isSelected,
            },
          )}
          style={{
            paddingLeft: `${level * FIELD_TREE_INDENTATION_SPACE}px`,
          }}
          role="treeitem"
          aria-selected={isSelected}
          aria-expanded={field.children.length ? isExpanded : undefined}
          tabIndex={0}
          onClick={() => jsonFields.select(field.path)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              jsonFields.select(field.path);
            }
          }}
        >
          <div
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-neutral-500"
            onClick={(event) => {
              event.stopPropagation();
              jsonFields.toggleExpanded(field.path);
            }}
          >
            {field.children.length > 0 &&
              (isExpanded ? (
                <DataCubeIcon.CaretDown />
              ) : (
                <DataCubeIcon.CaretRight />
              ))}
          </div>
          <div className="overflow-hidden text-ellipsis whitespace-nowrap">
            {name}
          </div>
          <div className="ml-1.5 flex-shrink-0 text-xs text-neutral-500">
            {field.description}
          </div>
          {field.presence < 1 && (
            <div
              className="ml-1.5 flex-shrink-0 bg-neutral-200 px-1 text-xs"
              title={`Present in ${percentage(field.presence)}% of the values read`}
            >
              {percentage(field.presence)}%
            </div>
          )}
        </div>
        {isExpanded &&
          field.children.map((child) => (
            <DataCubeJsonFieldTreeNode
              key={child.path.join('.')}
              field={child}
              level={level + 1}
              jsonFields={jsonFields}
            />
          ))}
      </>
    );
  },
);

const DataCubeJsonFieldOffers = observer(
  (props: {
    field: DataCubeJsonField;
    jsonFields: DataCubeJsonFieldsState;
  }) => {
    const { field, jsonFields } = props;
    const dataCube = useDataCube();

    return (
      <div className="p-1.5">
        <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium">
          {[jsonFields.column?.name, ...field.path].join(' › ')}
        </div>
        <div className="text-xs text-neutral-500">
          {`${field.description} · in ${percentage(field.presence)}% of values`}
        </div>
        {field.topValues.length > 0 && (
          <div
            className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-neutral-500"
            title={field.topValues.join(', ')}
          >
            {`Values seen: ${field.topValues.join(', ')}`}
          </div>
        )}
        <div className="mt-1.5">
          {field.offers.length === 0 ? (
            <div className="text-sm text-neutral-500">
              {field.children.length
                ? 'Choose one of its fields on the left.'
                : 'Nothing to take from it on its own.'}
            </div>
          ) : (
            field.offers.map((offer) => (
              <button
                key={offer.key}
                className={cn(
                  'flex h-6 w-full items-center justify-between px-1.5 text-left text-sm hover:bg-sky-100',
                  {
                    'bg-sky-200 hover:bg-sky-200':
                      jsonFields.pickedOffer?.code === offer.code,
                  },
                )}
                title={`${offer.name}: ${offer.type}`}
                onClick={() => {
                  jsonFields
                    .pick(offer)
                    .catch((error) =>
                      dataCube.alertService.alertUnhandledError(error),
                    );
                }}
              >
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {offer.label}
                </span>
                <span className="ml-2 flex-shrink-0 text-xs text-neutral-500">
                  {offer.type}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  },
);

const DataCubeJsonFieldSelector = observer(
  (props: { jsonFields: DataCubeJsonFieldsState }) => {
    const { jsonFields } = props;
    const fields = jsonFields.shownFields;
    const selectedField = jsonFields.selectedField;

    return (
      <div className="flex h-[calc(100%_-_24px)] w-full">
        <div className="h-full w-1/2 border-r border-neutral-300">
          <div className="flex h-7 w-full items-center px-1">
            <DataCubeIcon.Search className="mr-1 flex-shrink-0 text-neutral-500" />
            <FormTextInput
              className="min-w-0 flex-1"
              placeholder="Find a field"
              value={jsonFields.search}
              onChange={(event) => jsonFields.setSearch(event.target.value)}
            />
          </div>
          <div className="h-[calc(100%_-_28px)] overflow-auto" role="tree">
            {fields && (
              <DataCubeJsonFieldTreeNode
                field={fields}
                level={0}
                jsonFields={jsonFields}
              />
            )}
            {!fields && jsonFields.fields && (
              <div className="px-1.5 text-sm text-neutral-500">
                No field matches.
              </div>
            )}
          </div>
        </div>
        <div className="h-full w-1/2 overflow-auto">
          {selectedField && (
            <DataCubeJsonFieldOffers
              field={selectedField}
              jsonFields={jsonFields}
            />
          )}
        </div>
      </div>
    );
  },
);

const DataCubeJsonFieldsReadValueRow = observer(
  (props: { jsonFields: DataCubeJsonFieldsState }) => {
    const { jsonFields } = props;
    const dataCube = useDataCube();
    const status = jsonFields.status;

    return (
      <div className="flex h-6 w-full items-center justify-between border-b border-neutral-300 bg-neutral-50 px-1.5">
        <div
          className={cn(
            'overflow-hidden text-ellipsis whitespace-nowrap text-xs',
            {
              'text-red-500': Boolean(status?.isError),
              'text-neutral-600': !status?.isError,
            },
          )}
          role="status"
          title={status?.text}
        >
          {status?.text}
        </div>
        {jsonFields.readState.isInProgress ? (
          <FormButton
            compact={true}
            className="ml-1 flex-shrink-0"
            onClick={() => jsonFields.stop()}
          >
            Stop
          </FormButton>
        ) : (
          jsonFields.sample &&
          !jsonFields.sample.complete && (
            <FormButton
              compact={true}
              className="ml-1 flex-shrink-0"
              onClick={() => {
                jsonFields
                  .read(true)
                  .catch((error) =>
                    dataCube.alertService.alertUnhandledError(error),
                  );
              }}
            >
              Read every value
            </FormButton>
          )
        )}
      </div>
    );
  },
);

export const DataCubeJsonFieldsWindow = observer(
  (props: { jsonFields: DataCubeJsonFieldsState }) => {
    const { jsonFields } = props;

    return (
      <div className="h-full w-full border border-neutral-300">
        <DataCubeJsonFieldsReadValueRow jsonFields={jsonFields} />
        <DataCubeJsonFieldSelector jsonFields={jsonFields} />
      </div>
    );
  },
);
