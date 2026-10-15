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
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { LEGEND_CUBE_COMMAND_KEY } from '../../../__lib__/LegendCubeCommand.js';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import {
  CUBE_EDITOR_TOUR,
  CUBE_TOUR_ANCHOR,
  CUBE_TOUR_ANCHOR_ATTRIBUTE,
  CUBE_TOUR_LABEL,
} from '../../../__lib__/LegendCubeTour.js';
import { TEST__getCanvasNodes } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { CubeEditor } from '../../CubeEditor.js';

/** The page, over an engine that answers the example's run, with its SQL */
const renderPage = async () => {
  const created = TEST__createCubeHost({
    result: {
      columns: ['COMPANY_NAME', 'COUNTRY', 'ORDER_COUNT'],
      rows: [['Ernst Handel', 'Austria', 30]],
      sql: ['select 1'],
      durationMs: 1,
    },
  });
  await TEST__renderInCubeApplication(
    <CubeEditor host={created.host} />,
    created.host.applicationStore,
    LEGEND_CUBE_TEST_ID.EDITOR,
  );
  return created;
};

/** The tour's card, by its step's title */
const findCard = (title: string): Promise<HTMLElement> =>
  screen.findByRole('dialog', { name: title });

const anchored = (anchor: CUBE_TOUR_ANCHOR): Element[] =>
  Array.from(
    screen
      .getByTestId(LEGEND_CUBE_TEST_ID.EDITOR)
      .querySelectorAll(`[${CUBE_TOUR_ANCHOR_ATTRIBUTE}~="${anchor}"]`),
  );

/** The page menu's Take the tour */
const startFromMenu = async (): Promise<void> => {
  fireEvent.click(
    within(screen.getByTestId(LEGEND_CUBE_TEST_ID.PALETTE)).getByTitle('Menu'),
  );
  fireEvent.click(await screen.findByText(CUBE_TOUR_LABEL.START));
};

/** Opens an example from the empty canvas and waits for its run */
const openExample = async (
  fake: ReturnType<typeof TEST__createCubeHost>['fake'],
): Promise<void> => {
  fireEvent.click(screen.getByText('open an example'));
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(
    within(dialog).getByRole('button', { name: /^Top customers by orders/u }),
  );
  await waitFor(() => expect(fake.execute).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
};

beforeEach(() => {
  localStorage.clear();
});

describe('The editor tour (PLAN §11.21)', () => {
  test('Starts from the empty canvas on an example it opens, and points every step at controls on the page', async () => {
    const { fake } = await renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: CUBE_TOUR_LABEL.START }),
    );
    const welcome = await findCard('Welcome to Legend Cube');
    expect(welcome.textContent).toContain(CUBE_TOUR_LABEL.EXAMPLE_OPENED);
    // the example opens and runs behind the first step
    await waitFor(() => expect(fake.execute).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(anchored(CUBE_TOUR_ANCHOR.SHOW_SQL)).toHaveLength(1),
    );
    expect(TEST__getCanvasNodes()).toHaveLength(7);
    for (const [index, step] of CUBE_EDITOR_TOUR.entries()) {
      const card = await findCard(step.title);
      expect(
        within(card).getByText(
          CUBE_TOUR_LABEL.progress(index + 1, CUBE_EDITOR_TOUR.length),
        ),
      ).toBeDefined();
      // what keeps the tour from going stale: each step's controls are there
      if (step.anchor !== undefined) {
        expect(anchored(step.anchor).length).toBeGreaterThan(0);
      }
      const isLast = index === CUBE_EDITOR_TOUR.length - 1;
      const next = within(card).getByRole('button', {
        name: isLast ? CUBE_TOUR_LABEL.DONE : CUBE_TOUR_LABEL.NEXT,
      });
      expect(document.activeElement === next).toBe(true);
      fireEvent.click(next);
    }
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    // Undo takes the example back, as the first step says
    fireEvent.click(screen.getByText('Undo'));
    expect(TEST__getCanvasNodes()).toHaveLength(0);
  });

  test('Starts from the menu on the cube as it is, moves with the arrow keys and Back, and ends with Esc or End the tour', async () => {
    const { fake, host } = await renderPage();
    const { commandService } = host.applicationStore;
    await openExample(fake);
    await startFromMenu();
    const welcome = await findCard('Welcome to Legend Cube');
    expect(welcome.textContent).not.toContain(CUBE_TOUR_LABEL.EXAMPLE_OPENED);
    expect(
      within(welcome).queryByRole('button', { name: CUBE_TOUR_LABEL.BACK }),
    ).toBeNull();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    const sources = await findCard('Sources');
    fireEvent.click(
      within(sources).getByRole('button', { name: CUBE_TOUR_LABEL.NEXT }),
    );
    const steps = await findCard('Steps');
    fireEvent.click(
      within(steps).getByRole('button', { name: CUBE_TOUR_LABEL.BACK }),
    );
    await findCard('Sources');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    await findCard('Welcome to Legend Cube');
    // before the first step, it stays
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    await findCard('Welcome to Legend Cube');
    // the page's shortcuts wait while it shows
    expect(commandService.runCommand(LEGEND_CUBE_COMMAND_KEY.EXECUTE)).toBe(
      false,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    // again, from the first step
    await startFromMenu();
    const again = await findCard('Welcome to Legend Cube');
    fireEvent.click(
      within(again).getByRole('button', { name: CUBE_TOUR_LABEL.END }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    // the cube was left as it was
    expect(fake.execute).toHaveBeenCalledTimes(1);
    expect(TEST__getCanvasNodes()).toHaveLength(7);
    // and the shortcuts are back
    let ran = false;
    act(() => {
      ran = commandService.runCommand(LEGEND_CUBE_COMMAND_KEY.EXECUTE);
    });
    expect(ran).toBe(true);
    await waitFor(() => expect(fake.execute).toHaveBeenCalledTimes(2));
  });

  test("Skips the steps whose controls aren't on the page: the graph's, when it is hidden", async () => {
    const { fake } = await renderPage();
    await openExample(fake);
    fireEvent.click(screen.getByText('Hide graph'));
    expect(anchored(CUBE_TOUR_ANCHOR.CANVAS)).toHaveLength(0);
    await startFromMenu();
    await findCard('Welcome to Legend Cube');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await findCard('Sources');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    const steps = await findCard('Steps');
    fireEvent.click(
      within(steps).getByRole('button', { name: CUBE_TOUR_LABEL.NEXT }),
    );
    // not the graph, nor the step that runs, which is on the graph
    const execute = await findCard('Execute');
    expect(
      within(execute).getByText(
        CUBE_TOUR_LABEL.progress(
          CUBE_EDITOR_TOUR.findIndex((step) => step.title === 'Execute') + 1,
          CUBE_EDITOR_TOUR.length,
        ),
      ),
    ).toBeDefined();
    fireEvent.click(
      within(execute).getByRole('button', { name: CUBE_TOUR_LABEL.BACK }),
    );
    await findCard('Steps');
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
