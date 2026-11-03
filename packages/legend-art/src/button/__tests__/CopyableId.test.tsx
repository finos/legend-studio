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

import {
  describe,
  test,
  expect,
  afterEach,
  beforeEach,
  jest,
} from '@jest/globals';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { unitTest } from '@finos/legend-shared/test';
import { CopyableId } from '../CopyableId.js';

const writeText = jest.fn<(text: string) => Promise<void>>();

const setClipboard = (clipboard: unknown): void => {
  Object.defineProperty(navigator, 'clipboard', {
    value: clipboard,
    configurable: true,
  });
};

const idButton = (): HTMLElement =>
  screen.getByRole('button', {
    name: 'Copy data product ID TRADE_POSITIONS_EOD',
  });

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  setClipboard({ writeText });
});

afterEach(() => {
  cleanup();
  setClipboard(undefined);
});

describe('CopyableId', () => {
  describe(unitTest('rendering'), () => {
    test(
      unitTest('shows the value in a button labelled by what it copies'),
      () => {
        render(
          <CopyableId value="TRADE_POSITIONS_EOD" label="data product ID" />,
        );

        const button = idButton();
        expect(button.getAttribute('type')).toEqual('button');
        expect(button.textContent).toEqual('TRADE_POSITIONS_EOD');
        expect(button.className).toContain('copyable-id');
      },
    );

    test(unitTest('shows its children in place of the value'), () => {
      render(
        <CopyableId value="30455" label="deployment ID">
          <span>DID</span> 30455
        </CopyableId>,
      );

      const button = screen.getByRole('button', {
        name: 'Copy deployment ID 30455',
      });
      expect(button.textContent).toEqual('DID 30455');
    });

    test(unitTest('adds the given class name'), () => {
      render(
        <CopyableId
          value="TRADE_POSITIONS_EOD"
          label="data product ID"
          className="my-id"
        />,
      );

      expect(idButton().className).toContain('my-id');
    });

    test(unitTest('shows the copy icon on hover by default'), () => {
      const { container } = render(
        <CopyableId value="TRADE_POSITIONS_EOD" label="data product ID" />,
      );

      expect(idButton().className).toContain('copyable-id--icon-hover');
      expect(container.querySelector('.copyable-id__icon')).not.toBeNull();
    });

    test(unitTest('can always show the copy icon, or never'), () => {
      const { container, rerender } = render(
        <CopyableId
          value="TRADE_POSITIONS_EOD"
          label="data product ID"
          iconVisibility="always"
        />,
      );
      expect(idButton().className).toContain('copyable-id--icon-always');
      expect(container.querySelector('.copyable-id__icon')).not.toBeNull();

      rerender(
        <CopyableId
          value="TRADE_POSITIONS_EOD"
          label="data product ID"
          iconVisibility="never"
        />,
      );
      expect(idButton().className).toContain('copyable-id--icon-never');
      expect(container.querySelector('.copyable-id__icon')).toBeNull();
    });
  });

  describe(unitTest('tooltip'), () => {
    test(unitTest('says what it copies, with the full value'), async () => {
      render(
        <CopyableId value="TRADE_POSITIONS_EOD" label="data product ID" />,
      );

      fireEvent.mouseOver(idButton());

      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip.textContent).toEqual(
        'Copy data product IDTRADE_POSITIONS_EOD',
      );
      expect(
        tooltip.querySelector('.copyable-id__tooltip__value')?.textContent,
      ).toEqual('TRADE_POSITIONS_EOD');
    });

    test(unitTest('says Copied until it closes'), async () => {
      render(
        <CopyableId value="TRADE_POSITIONS_EOD" label="data product ID" />,
      );

      fireEvent.mouseOver(idButton());
      await screen.findByText('Copy data product ID');
      fireEvent.click(idButton());
      await waitFor(() =>
        expect(screen.getByRole('tooltip').textContent).toEqual('Copied'),
      );
      expect(idButton().className).toContain('copyable-id--copied');

      fireEvent.mouseLeave(idButton());
      await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
      expect(idButton().className).not.toContain('copyable-id--copied');

      fireEvent.mouseOver(idButton());
      expect(await screen.findByText('Copy data product ID')).toBeDefined();
      expect(screen.queryByText('Copied')).toBeNull();
    });

    test(
      unitTest('shows the outcome of a click made before it opened'),
      async () => {
        render(
          <CopyableId value="TRADE_POSITIONS_EOD" label="data product ID" />,
        );

        fireEvent.click(idButton());

        await waitFor(() =>
          expect(screen.getByRole('tooltip').textContent).toEqual('Copied'),
        );
      },
    );

    test(
      unitTest('keeps clicks on the tooltip from reaching the container'),
      async () => {
        const onContainerClick = jest.fn();
        const onContainerMouseDown = jest.fn();
        render(
          <div onClick={onContainerClick} onMouseDown={onContainerMouseDown}>
            <CopyableId value="TRADE_POSITIONS_EOD" label="data product ID" />
          </div>,
        );

        fireEvent.mouseOver(idButton());
        const tooltip = await screen.findByRole('tooltip');
        fireEvent.mouseDown(tooltip);
        fireEvent.click(tooltip);

        expect(onContainerClick).not.toHaveBeenCalled();
        expect(onContainerMouseDown).not.toHaveBeenCalled();
      },
    );
  });

  describe(unitTest('copy'), () => {
    test(unitTest('copies the value on click'), async () => {
      const onCopy = jest.fn();
      render(
        <CopyableId
          value="TRADE_POSITIONS_EOD"
          label="data product ID"
          onCopy={onCopy}
        />,
      );

      fireEvent.click(idButton());

      expect(writeText).toHaveBeenCalledTimes(1);
      expect(writeText).toHaveBeenCalledWith('TRADE_POSITIONS_EOD');
      await screen.findByText('Copied');
      expect(onCopy).toHaveBeenCalledTimes(1);
      expect(onCopy).toHaveBeenCalledWith('TRADE_POSITIONS_EOD');
    });

    test(unitTest('copies the value, not what it shows'), async () => {
      render(
        <CopyableId value="30455" label="deployment ID">
          DID 30455
        </CopyableId>,
      );

      fireEvent.click(
        screen.getByRole('button', { name: 'Copy deployment ID 30455' }),
      );

      expect(writeText).toHaveBeenCalledWith('30455');
      await screen.findByText('Copied');
    });

    test(unitTest('copies on Enter and on Space'), async () => {
      const onCopy = jest.fn();
      render(
        <CopyableId
          value="TRADE_POSITIONS_EOD"
          label="data product ID"
          onCopy={onCopy}
        />,
      );

      // `fireEvent` returns false once the default action was prevented: for Enter,
      // that is the click the browser would fire on top of the key press
      expect(fireEvent.keyDown(idButton(), { key: 'Enter' })).toBe(false);
      expect(fireEvent.keyDown(idButton(), { key: ' ' })).toBe(false);
      // and for Space, the click it would fire on release
      expect(fireEvent.keyUp(idButton(), { key: ' ' })).toBe(false);

      expect(writeText).toHaveBeenCalledTimes(2);
      await waitFor(() => expect(onCopy).toHaveBeenCalledTimes(2));
    });

    test(unitTest('copies once when a key is held down'), async () => {
      render(
        <CopyableId value="TRADE_POSITIONS_EOD" label="data product ID" />,
      );

      fireEvent.keyDown(idButton(), { key: 'Enter' });
      fireEvent.keyDown(idButton(), { key: 'Enter', repeat: true });
      fireEvent.keyDown(idButton(), { key: 'Enter', repeat: true });

      expect(writeText).toHaveBeenCalledTimes(1);
      await screen.findByText('Copied');
    });

    test(unitTest('ignores other keys'), () => {
      render(
        <CopyableId value="TRADE_POSITIONS_EOD" label="data product ID" />,
      );

      expect(fireEvent.keyDown(idButton(), { key: 'a' })).toBe(true);
      expect(fireEvent.keyDown(idButton(), { key: 'Tab' })).toBe(true);

      expect(writeText).not.toHaveBeenCalled();
    });

    test(unitTest('says Copy failed when the clipboard refuses'), async () => {
      writeText.mockRejectedValue(new Error('Write permission denied.'));
      const onCopy = jest.fn();
      render(
        <CopyableId
          value="TRADE_POSITIONS_EOD"
          label="data product ID"
          onCopy={onCopy}
        />,
      );

      fireEvent.click(idButton());

      expect(await screen.findByText('Copy failed')).toBeDefined();
      expect(onCopy).not.toHaveBeenCalled();
    });

    test(unitTest('says Copy failed when there is no clipboard'), async () => {
      // e.g. a page served over plain HTTP
      setClipboard(undefined);
      const onCopy = jest.fn();
      render(
        <CopyableId
          value="TRADE_POSITIONS_EOD"
          label="data product ID"
          onCopy={onCopy}
        />,
      );

      fireEvent.click(idButton());

      expect(await screen.findByText('Copy failed')).toBeDefined();
      expect(onCopy).not.toHaveBeenCalled();
    });
  });

  describe(unitTest('inside a clickable container'), () => {
    test(
      unitTest('keeps the click and the mousedown from reaching it'),
      async () => {
        const onContainerClick = jest.fn();
        const onContainerMouseDown = jest.fn();
        const onContainerTouchStart = jest.fn();
        render(
          <div
            onClick={onContainerClick}
            onMouseDown={onContainerMouseDown}
            onTouchStart={onContainerTouchStart}
          >
            <CopyableId value="TRADE_POSITIONS_EOD" label="data product ID" />
          </div>,
        );

        fireEvent.mouseDown(idButton());
        fireEvent.touchStart(idButton());
        // `fireEvent` returns false once the default action was prevented
        expect(fireEvent.click(idButton())).toBe(false);

        expect(writeText).toHaveBeenCalledTimes(1);
        expect(onContainerClick).not.toHaveBeenCalled();
        expect(onContainerMouseDown).not.toHaveBeenCalled();
        expect(onContainerTouchStart).not.toHaveBeenCalled();
        await screen.findByText('Copied');
      },
    );

    test(unitTest('keeps Enter and Space from reaching it'), async () => {
      const onContainerKeyDown = jest.fn();
      const onContainerKeyUp = jest.fn();
      render(
        <div
          role="button"
          tabIndex={0}
          onKeyDown={onContainerKeyDown}
          onKeyUp={onContainerKeyUp}
        >
          <CopyableId value="TRADE_POSITIONS_EOD" label="data product ID" />
        </div>,
      );

      fireEvent.keyDown(idButton(), { key: 'Enter' });
      fireEvent.keyDown(idButton(), { key: ' ' });
      fireEvent.keyUp(idButton(), { key: ' ' });

      expect(writeText).toHaveBeenCalledTimes(2);
      expect(onContainerKeyDown).not.toHaveBeenCalled();
      expect(onContainerKeyUp).not.toHaveBeenCalled();
      await screen.findByText('Copied');
    });

    test(unitTest('lets other keys through'), () => {
      const onContainerKeyDown = jest.fn();
      render(
        <div role="button" tabIndex={0} onKeyDown={onContainerKeyDown}>
          <CopyableId value="TRADE_POSITIONS_EOD" label="data product ID" />
        </div>,
      );

      fireEvent.keyDown(idButton(), { key: 'Escape' });

      expect(onContainerKeyDown).toHaveBeenCalledTimes(1);
    });
  });
});
