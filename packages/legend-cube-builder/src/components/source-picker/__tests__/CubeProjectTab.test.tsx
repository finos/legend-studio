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
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import { NORTHWIND_DATABASE } from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import {
  createFakeCubeProjectCatalog,
  FAKE_PLANNED_DATABASE,
} from '../../../__test-utils__/FakeCubeProjectCatalog.js';
import { CubeEditor } from '../../CubeEditor.js';

const renderPage = async () => {
  const created = TEST__createCubeHost();
  const projects = createFakeCubeProjectCatalog();
  const host = { ...created.host, projectCatalog: projects.catalog };
  await TEST__renderInCubeApplication(
    <CubeEditor host={host} />,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.EDITOR,
  );
  return { ...created, projects };
};

const selectOptions = (select: HTMLSelectElement): string[] =>
  [...select.options].map((option) => option.textContent ?? '');

beforeEach(() => {
  localStorage.clear();
});

describe('Project tab', () => {
  test("Adds a table of a project's Database at its newest release", async () => {
    await renderPage();
    fireEvent.click(screen.getByText('add a table'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(
      within(dialog).getByRole('tab', { name: 'Project Database' }),
    );
    const project =
      await within(dialog).findByLabelText<HTMLSelectElement>('Project');
    await waitFor(() =>
      expect(selectOptions(project)).toEqual([
        'Choose…',
        'com.example:reference',
        'com.example:sales',
      ]),
    );
    fireEvent.change(project, { target: { value: 'com.example:sales' } });
    const version = within(dialog).getByLabelText<HTMLSelectElement>('Version');
    await waitFor(() =>
      expect(selectOptions(version)).toEqual(['1.10.0 (latest)', '1.9.0']),
    );
    const databaseSelect =
      within(dialog).getByLabelText<HTMLSelectElement>('Database');
    await waitFor(() =>
      expect(selectOptions(databaseSelect)).toEqual([
        'Choose…',
        NORTHWIND_DATABASE,
        FAKE_PLANNED_DATABASE,
      ]),
    );

    // a Database no runtime connects to says so
    fireEvent.change(databaseSelect, {
      target: { value: FAKE_PLANNED_DATABASE },
    });
    expect(within(dialog).getByRole('note').textContent).toContain(
      'No runtime of this project connects to this Database',
    );

    fireEvent.change(databaseSelect, { target: { value: NORTHWIND_DATABASE } });
    expect(within(dialog).queryByRole('note')).toBeNull();
    fireEvent.click(await within(dialog).findByText('ORDERS'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    await TEST__findCanvasNode('relational101');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  test("Says when the depot can't list its projects, with Retry", async () => {
    const { projects } = await renderPage();
    projects.listProjects.mockRejectedValueOnce(new Error('depot down'));
    fireEvent.click(screen.getByText('add a table'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(
      within(dialog).getByRole('tab', { name: 'Project Database' }),
    );
    const alert = await within(dialog).findByRole('alert');
    expect(alert.textContent).toContain(
      "Can't list the depot's projects: depot down",
    );
    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(within(dialog).queryByRole('alert')).toBeNull());
    expect(projects.listProjects).toHaveBeenCalledTimes(2);
  });
});
