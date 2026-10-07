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
import { LegendUser } from '@finos/legend-shared';
import { UserDisplay } from '../UserDisplay.js';

const buildUser = (data: {
  firstName?: string;
  lastName?: string;
  displayName?: string;
}): LegendUser => Object.assign(new LegendUser(), data);

afterEach(() => cleanup());

describe('UserDisplay', () => {
  describe(unitTest('avatar initials'), () => {
    test(unitTest('uses the first and last name initials'), () => {
      render(
        <UserDisplay
          user={buildUser({
            firstName: 'Ada',
            lastName: 'Lovelace',
            displayName: 'Ada Lovelace',
          })}
        />,
      );
      expect(screen.getByText('AL')).toBeDefined();
    });

    test(unitTest('falls back to the display name initial'), () => {
      render(<UserDisplay user={buildUser({ displayName: 'Ada Lovelace' })} />);
      expect(screen.getByText('A')).toBeDefined();
    });

    test(unitTest('renders undefined for a half-populated name'), () => {
      render(
        <UserDisplay
          user={buildUser({ firstName: 'Ada', displayName: 'Ada' })}
        />,
      );
      // NOTE: the branch keys off `firstName || lastName`, then interpolates
      // both -- so a missing half renders the literal string "undefined"
      // rather than falling back to the display name initial.
      expect(screen.getByText('Aundefined')).toBeDefined();
    });
  });

  describe(unitTest('avatar image'), () => {
    test(unitTest('prefers an image when given one'), () => {
      render(
        <UserDisplay
          user={buildUser({
            firstName: 'Ada',
            lastName: 'Lovelace',
            displayName: 'Ada Lovelace',
          })}
          imgSrc="https://example.test/ada.png"
        />,
      );
      const avatar = screen.getByRole('img', { name: 'Ada Lovelace' });
      expect(avatar.getAttribute('src')).toEqual(
        'https://example.test/ada.png',
      );
      // the image replaces the initials entirely
      expect(screen.queryByText('AL')).toBeNull();
    });

    test(unitTest('renders a decorative image for an unnamed user'), () => {
      const { container } = render(
        <UserDisplay
          user={buildUser({ firstName: 'Ada', lastName: 'Lovelace' })}
          imgSrc="https://example.test/ada.png"
        />,
      );
      // with no display name the alt text is empty, which makes the avatar
      // decorative rather than an accessible image
      expect(screen.queryByRole('img')).toBeNull();
      expect(container.querySelector('img')?.getAttribute('alt')).toEqual('');
    });

    test(unitTest('labels the image with the display name'), () => {
      render(
        <UserDisplay
          user={buildUser({ displayName: 'Ada Lovelace' })}
          imgSrc="https://example.test/ada.png"
        />,
      );
      expect(screen.getByRole('img').getAttribute('alt')).toEqual(
        'Ada Lovelace',
      );
    });
  });

  describe(unitTest('name and interaction'), () => {
    test(unitTest('renders the display name'), () => {
      render(<UserDisplay user={buildUser({ displayName: 'Ada Lovelace' })} />);
      // once for the name, once for the avatar initial
      expect(screen.getByText('Ada Lovelace')).toBeDefined();
    });

    test(unitTest('reports a click when clickable'), () => {
      const onClick = jest.fn();
      const { container } = render(
        <UserDisplay
          user={buildUser({ displayName: 'Ada Lovelace' })}
          onClick={onClick}
        />,
      );
      expect(
        container.querySelector('.legend-user-display--clickable'),
      ).not.toBeNull();

      fireEvent.click(screen.getByText('Ada Lovelace'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    test(unitTest('is not marked clickable without a handler'), () => {
      const { container } = render(
        <UserDisplay user={buildUser({ displayName: 'Ada Lovelace' })} />,
      );
      expect(
        container.querySelector('.legend-user-display--clickable'),
      ).toBeNull();
    });

    test(unitTest('applies an extra class name'), () => {
      const { container } = render(
        <UserDisplay
          user={buildUser({ displayName: 'Ada Lovelace' })}
          className="my-user"
        />,
      );
      expect(container.querySelector('.my-user')).not.toBeNull();
    });
  });
});
