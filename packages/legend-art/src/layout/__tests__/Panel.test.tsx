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
import {
  PanelBooleanField,
  PanelFormTextField,
  PanelFormValidatedTextField,
} from '../Panel.js';

const textbox = (): HTMLInputElement => screen.getByRole('textbox');

afterEach(() => cleanup());

describe('PanelFormTextField', () => {
  test(unitTest('renders a capitalized label and the current value'), () => {
    render(
      <PanelFormTextField name="user name" value="abc" update={jest.fn()} />,
    );
    expect(screen.getByText('User name')).toBeDefined();
    expect(textbox().value).toEqual('abc');
  });

  test(unitTest('renders an empty string for an undefined value'), () => {
    render(
      <PanelFormTextField name="name" value={undefined} update={jest.fn()} />,
    );
    expect(textbox().value).toEqual('');
  });

  test(unitTest('reports an edit'), () => {
    const update = jest.fn();
    render(<PanelFormTextField name="name" value="" update={update} />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'hello' },
    });

    expect(update).toHaveBeenCalledWith('hello');
  });

  test(unitTest('reports a cleared field as undefined'), () => {
    const update = jest.fn();
    render(<PanelFormTextField name="name" value="abc" update={update} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });

    // an empty string is normalized away so callers never store `''`
    expect(update).toHaveBeenCalledWith(undefined);
  });

  test(unitTest('disables the input when read-only'), () => {
    render(
      <PanelFormTextField
        name="name"
        value="abc"
        update={jest.fn()}
        isReadOnly={true}
      />,
    );
    expect(textbox().disabled).toBe(true);
  });

  test(unitTest('shows an error message when given one'), () => {
    render(
      <PanelFormTextField
        name="name"
        value="abc"
        update={jest.fn()}
        errorMessage="Name is taken"
      />,
    );
    expect(screen.getByText('Name is taken')).toBeDefined();
  });
});

describe('PanelFormValidatedTextField', () => {
  test(unitTest('pushes a valid value up on mount'), () => {
    const update = jest.fn();
    render(
      <PanelFormValidatedTextField
        name="name"
        value={undefined}
        update={update}
      />,
    );
    // the effect syncs whenever `value` and the local input disagree, and
    // `undefined` differs from the `''` the input starts at
    expect(update).toHaveBeenCalledWith('');
  });

  test(unitTest('does not push up while the value is invalid'), () => {
    const update = jest.fn();
    render(
      <PanelFormValidatedTextField
        name="name"
        value="ok"
        update={update}
        validate={(input) => (input === 'bad' ? 'Not allowed' : undefined)}
      />,
    );
    update.mockClear();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'bad' },
    });

    expect(screen.getByText('Not allowed')).toBeDefined();
    expect(update).not.toHaveBeenCalled();
  });

  test(unitTest('pushes up again once the value becomes valid'), () => {
    const update = jest.fn();
    render(
      <PanelFormValidatedTextField
        name="name"
        value="ok"
        update={update}
        validate={(input) => (input === 'bad' ? 'Not allowed' : undefined)}
      />,
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'bad' } });
    update.mockClear();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'good' },
    });

    expect(screen.queryByText('Not allowed')).toBeNull();
    expect(update).toHaveBeenCalledWith('good');
  });

  test(unitTest('reports the validation outcome to onValidate'), () => {
    const onValidate = jest.fn();
    render(
      <PanelFormValidatedTextField
        name="name"
        value="ok"
        update={jest.fn()}
        onValidate={onValidate}
        validate={(input) => (input === 'bad' ? 'Not allowed' : undefined)}
      />,
    );
    expect(onValidate).toHaveBeenCalledWith(undefined);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'bad' } });

    // unlike `update`, this fires on every render regardless of validity
    expect(onValidate).toHaveBeenCalledWith('Not allowed');
  });

  test(unitTest('renders an optional prompt'), () => {
    render(
      <PanelFormValidatedTextField
        name="name"
        value="ok"
        update={jest.fn()}
        prompt="Pick something memorable"
      />,
    );
    expect(screen.getByText('Pick something memorable')).toBeDefined();
  });
});

describe('PanelBooleanField', () => {
  test(unitTest('toggles from unset to true'), () => {
    const update = jest.fn();
    render(
      <PanelBooleanField
        prompt="Enabled"
        value={undefined}
        isReadOnly={false}
        update={update}
      />,
    );

    fireEvent.click(screen.getByText('Enabled'));

    expect(update).toHaveBeenCalledWith(true);
  });

  test(unitTest('toggles from true to false'), () => {
    const update = jest.fn();
    render(
      <PanelBooleanField
        prompt="Enabled"
        value={true}
        isReadOnly={false}
        update={update}
      />,
    );

    fireEvent.click(screen.getByText('Enabled'));

    expect(update).toHaveBeenCalledWith(false);
  });

  test(unitTest('does nothing when read-only'), () => {
    const update = jest.fn();
    render(
      <PanelBooleanField
        prompt="Enabled"
        value={false}
        isReadOnly={true}
        update={update}
      />,
    );

    fireEvent.click(screen.getByText('Enabled'));

    expect(update).not.toHaveBeenCalled();
    expect(screen.getByRole<HTMLButtonElement>('button').disabled).toBe(true);
  });

  test(unitTest('renders a capitalized label when named'), () => {
    render(
      <PanelBooleanField
        name="auto save"
        prompt="Enabled"
        value={false}
        isReadOnly={false}
        update={jest.fn()}
      />,
    );
    expect(screen.getByText('Auto save')).toBeDefined();
  });
});
