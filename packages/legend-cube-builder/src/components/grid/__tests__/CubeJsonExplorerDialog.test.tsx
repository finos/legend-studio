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

import { beforeEach, describe, expect, test } from '@jest/globals';
import { Extend } from '@finos/legend-cube';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { flowResult } from 'mobx';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import {
  TEST__PAYLOAD,
  TEST__payloadSample,
  TEST__setUpPayloadRun,
} from '../../../__test-utils__/CubeVariantTestUtils.js';
import { CubeJsonExplorerDialog } from '../CubeJsonExplorerDialog.js';

beforeEach(() => {
  localStorage.clear();
});

const renderExplorer = async (
  ...args: Parameters<typeof TEST__setUpPayloadRun>
): Promise<
  Awaited<ReturnType<typeof TEST__setUpPayloadRun>> & { dialog: HTMLElement }
> => {
  const setUp = await TEST__setUpPayloadRun(...args);
  await flowResult(setUp.state.jsonExplorer.open(TEST__PAYLOAD));
  await TEST__renderInCubeApplication(
    <CubeJsonExplorerDialog editorState={setUp.state} />,
    setUp.state.host.applicationStore,
    LEGEND_CUBE_TEST_ID.JSON_EXPLORER,
  );
  return { ...setUp, dialog: screen.getByRole('dialog') };
};

describe('The Explore JSON dialog (PLAN §11.20)', () => {
  test("Lists the column's fields, with what each held and how often, and the picked field's offers to tick", async () => {
    const { dialog } = await renderExplorer();
    expect(within(dialog).getByText('Explore JSON: PAYLOAD')).not.toBeNull();
    expect(within(dialog).getByRole('status').textContent).toBe(
      'All 2 values read: the fields, their types and shares cover the whole column.',
    );
    // the whole column was read: no Read every row
    expect(within(dialog).queryByText('Read every row')).toBeNull();
    const tier = within(dialog).getByLabelText('Field PAYLOAD.user.tier');
    expect(tier.textContent).toBe('tiertext50%');
    fireEvent.click(tier);
    expect(within(dialog).getByText('PAYLOAD › user › tier')).not.toBeNull();
    expect(within(dialog).getByText('Values seen: gold')).not.toBeNull();
    const offers = within(dialog).getByRole('group', {
      name: 'Columns it can become',
    });
    expect(offers.textContent).toBe(
      'the value, as StringString · PAYLOAD_user_tier',
    );
    const add = within(dialog).getByText<HTMLButtonElement>('Add 0 columns');
    expect(add.disabled).toBe(true);
    fireEvent.click(within(offers).getByRole('checkbox'));
    expect(within(dialog).getByText('Add 1 column')).not.toBeNull();
  });

  test("Offers an array's elements as rows, as an Explode Array", async () => {
    const { dialog } = await renderExplorer();
    fireEvent.click(within(dialog).getByLabelText('Field PAYLOAD.tags'));
    const offers = within(dialog).getByRole('group', {
      name: 'Columns it can become',
    });
    const explode = within(offers).getByText('one row per element');
    expect(explode.nextElementSibling?.textContent).toBe(
      'Explode Array · tags_element',
    );
    fireEvent.click(
      within(explode.closest('label') as HTMLElement).getByRole('checkbox'),
    );
    expect(within(dialog).getByText('Add 1 column')).not.toBeNull();
  });

  test('Finds fields by their keys, keeping the fields they are in', async () => {
    const { dialog } = await renderExplorer();
    fireEvent.change(within(dialog).getByLabelText('Find a field'), {
      target: { value: 'NAM' },
    });
    const fields = within(dialog).getByLabelText('Fields');
    expect(
      within(fields)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual([
      'Field PAYLOAD',
      'Field PAYLOAD.user',
      'Field PAYLOAD.user.name',
    ]);
    fireEvent.change(within(dialog).getByLabelText('Find a field'), {
      target: { value: 'zzz' },
    });
    expect(within(dialog).getByText('No field matches.')).not.toBeNull();
  });

  test('Offers Read every row after a sample that had more, and adds the ticked columns as an Extend', async () => {
    const many = Array.from({ length: 1001 }, (_, index) => `{"n": ${index}}`);
    const { state, fake, dialog } = await renderExplorer(
      'DuckDB',
      TEST__payloadSample(many),
    );
    expect(within(dialog).getByRole('status').textContent).toBe(
      'The first 1,000 values read: the types and shares are from this sample.',
    );
    fireEvent.click(within(dialog).getByText('Read every row'));
    await waitFor(() =>
      expect(within(dialog).getByRole('status').textContent).toBe(
        'All 1,001 values read: the fields, their types and shares cover the whole column.',
      ),
    );
    fireEvent.click(within(dialog).getByLabelText('Field PAYLOAD.n'));
    fireEvent.click(
      within(
        within(dialog).getByRole('group', { name: 'Columns it can become' }),
      ).getByRole('checkbox'),
    );
    fake.parseExpression.mockImplementation(async () =>
      Promise.resolve({
        lambda: { _type: 'lambda', parameters: [], body: [] },
        located: {},
      }),
    );
    await act(async () => {
      fireEvent.click(within(dialog).getByText('Add 1 column'));
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const { query } = state.document;
    const extend = query.getNode(query.selected ?? '') as Extend;
    expect(extend).toBeInstanceOf(Extend);
    expect(extend.columns[0]?.code).toBe(
      "x | $x.PAYLOAD->get('n')->to(@Integer)",
    );
  });

  test("Says why a database that can't read JSON is refused", async () => {
    const { dialog } = await renderExplorer('H2');
    expect(within(dialog).getByRole('alert').textContent).toBe(
      'JSON is not supported on H2: Variant functions run on Snowflake, Databricks, Postgres and DuckDB.',
    );
    expect(within(dialog).queryByLabelText('Fields')).toBeNull();
  });
});
