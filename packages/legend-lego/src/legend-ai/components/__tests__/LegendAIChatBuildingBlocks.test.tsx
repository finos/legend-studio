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
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { unitTest } from '@finos/legend-shared/test';
import { LegendAIThinkingStepStatus } from '../../LegendAITypes.js';
import {
  LegendAIElapsedTime,
  formatLegendAICompactDuration,
} from '../LegendAIElapsedTime.js';
import { LegendAIThinkingSteps } from '../LegendAIThinkingSteps.js';
import {
  LegendAIAttachButton,
  LegendAIChatComposer,
} from '../LegendAIChatComposer.js';
import {
  LegendAIProcessActivity,
  LegendAIProcessPanel,
} from '../LegendAIProcessPanel.js';
import {
  LegendAIActionButton,
  LegendAIActionCard,
  LegendAIActionLink,
} from '../LegendAIActions.js';
import {
  LegendAIAssistantMessageFrame,
  LegendAIEmptyState,
  LegendAIUserMessageView,
  LegendAIWorkingIndicator,
} from '../LegendAIMessageViews.js';
import { LegendAIConversation } from '../LegendAIConversation.js';

describe(unitTest('Legend AI elapsed time'), () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(10_000);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('is short enough for the end of a line', () => {
    expect(formatLegendAICompactDuration(42_400)).toBe('42s');
    expect(formatLegendAICompactDuration(185_000)).toBe('3m 05s');
    expect(formatLegendAICompactDuration(3_720_000)).toBe('1h 02m');
    expect(formatLegendAICompactDuration(-5)).toBe('0s');
  });

  test('a finished span shows its fixed time', () => {
    const { container } = render(
      <LegendAIElapsedTime from={2_000} to={7_000} />,
    );

    act(() => {
      jest.advanceTimersByTime(5_000);
    });

    expect(container.textContent).toBe('5s');
  });

  test('a span under way counts up each second', () => {
    const { container } = render(<LegendAIElapsedTime from={4_000} />);
    expect(container.textContent).toBe('6s');

    act(() => {
      jest.advanceTimersByTime(3_000);
    });

    expect(container.textContent).toBe('9s');
  });
});

describe(unitTest('LegendAIThinkingSteps'), () => {
  const steps = [
    {
      id: 'a',
      label: 'Reviewed',
      status: LegendAIThinkingStepStatus.DONE,
      startedAt: 1_000,
      endedAt: 4_000,
    },
    {
      id: 'b',
      label: 'Profiling',
      status: LegendAIThinkingStepStatus.ACTIVE,
      startedAt: 2_000,
    },
  ];

  test('each step carries its status and time', () => {
    const { container } = render(
      <LegendAIThinkingSteps
        steps={steps}
        isOpen={true}
        toggleLabel="2 steps"
        isLive={true}
      />,
    );

    expect(
      container.querySelector('.legend-ai__thinking-step--done')?.textContent,
    ).toContain('Reviewed3s');
    expect(
      container.querySelector('.legend-ai__thinking-step--active'),
    ).not.toBeNull();
    expect(container.querySelectorAll('.legend-ai__elapsed')).toHaveLength(2);
  });

  test('a step that never ended stops showing a time once the reply is over', () => {
    const { container } = render(
      <LegendAIThinkingSteps
        steps={steps}
        isOpen={true}
        toggleLabel="2 steps"
      />,
    );

    expect(container.querySelectorAll('.legend-ai__elapsed')).toHaveLength(1);
  });

  test('folds with its toggle, and has none without onToggle', () => {
    const onToggle = jest.fn();
    const { rerender, container } = render(
      <LegendAIThinkingSteps
        steps={steps}
        isOpen={false}
        toggleLabel="2 steps"
        onToggle={onToggle}
      />,
    );

    expect(container.querySelector('.legend-ai__thinking-steps')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '2 steps' }));
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(
      <LegendAIThinkingSteps
        steps={steps}
        isOpen={true}
        toggleLabel="2 steps"
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe(unitTest('LegendAIChatComposer'), () => {
  const renderComposer = (
    overrides: Partial<Parameters<typeof LegendAIChatComposer>[0]> = {},
  ) => {
    const props = {
      value: 'hello',
      onChange: jest.fn(),
      onSend: jest.fn(),
      isSending: false,
      placeholder: 'Ask…',
      ariaLabel: 'Message',
      ...overrides,
    };
    render(<LegendAIChatComposer {...props} />);
    return props;
  };

  test('Enter sends, Shift+Enter does not', () => {
    const props = renderComposer();
    const input = screen.getByRole('textbox', { name: 'Message' });

    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(props.onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(props.onSend).toHaveBeenCalledTimes(1);
  });

  test('blank text or a turn in flight cannot be sent', () => {
    const props = renderComposer({ value: '   ' });

    expect(screen.getByRole('button', { name: 'Send' })).toHaveProperty(
      'disabled',
      true,
    );
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(props.onSend).not.toHaveBeenCalled();
  });

  test('Stop shows while sending, when it can stop', () => {
    const props = renderComposer({ isSending: true, onStop: jest.fn() });

    fireEvent.click(screen.getByRole('button', { name: 'Stop generation' }));
    expect(props.onStop).toHaveBeenCalledTimes(1);
  });

  test('typing is handed back', () => {
    const props = renderComposer();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'hello there' },
    });
    expect(props.onChange).toHaveBeenCalledWith('hello there');
  });
});

describe(unitTest('LegendAIAttachButton'), () => {
  test('hands over the picked files', () => {
    const onFiles = jest.fn();
    render(<LegendAIAttachButton onFiles={onFiles} />);
    const file = new File(['x'], 'spec.csv');

    fireEvent.change(screen.getByLabelText('Files to attach'), {
      target: { files: [file] },
    });

    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  test('says it is uploading, and cannot be pressed meanwhile', () => {
    render(<LegendAIAttachButton onFiles={jest.fn()} isUploading={true} />);

    expect(screen.getByRole('button', { name: /Uploading/u })).toHaveProperty(
      'disabled',
      true,
    );
  });
});

describe(unitTest('LegendAIProcessPanel'), () => {
  test('shows its activity, what runs, what waits and what failed', () => {
    render(
      <LegendAIProcessPanel
        title="Run"
        subtitle="run-1"
        activity={LegendAIProcessActivity.WAITING}
        running={[{ id: 'p', label: 'Profiling' }]}
        waiting={['Waiting on you: the model']}
        errors={['The run could not be read']}
      />,
    );

    expect(screen.getByText('Waiting on you')).not.toBeNull();
    expect(screen.getByText('Profiling')).not.toBeNull();
    expect(screen.getByText('Waiting on you: the model')).not.toBeNull();
    expect(screen.getByRole('alert').textContent).toBe(
      'The run could not be read',
    );
  });

  test('its steps open on demand, and a step opens to its detail', () => {
    const { container } = render(
      <LegendAIProcessPanel
        title="Run"
        activity={LegendAIProcessActivity.READY}
        steps={[
          {
            id: 'review',
            label: 'Review',
            statusLabel: 'Done',
            status: LegendAIThinkingStepStatus.DONE,
            detail: 'All good',
          },
          { id: 'deploy', label: 'Deploy', statusLabel: 'Not started' },
        ]}
      />,
    );

    expect(container.querySelector('.legend-ai__process-steps')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /2 steps/u }));
    expect(
      container.querySelector('.legend-ai__process-step--done'),
    ).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Review/u }));
    expect(
      container.querySelector('.legend-ai__process-step-detail--open')
        ?.textContent,
    ).toBe('All good');
    // Nothing to open on a step with no detail.
    expect(screen.getByRole('button', { name: /Deploy/u })).toHaveProperty(
      'disabled',
      true,
    );
  });
});

describe(unitTest('LegendAIActionCard'), () => {
  test('shows its title, preview and actions', () => {
    const onClick = jest.fn();
    render(
      <LegendAIActionCard title="Approve the model?" preview="Class a::B {}">
        <LegendAIActionButton primary={true} onClick={onClick}>
          Approve
        </LegendAIActionButton>
        <LegendAIActionLink href="https://example.com/sign-in">
          Sign in
        </LegendAIActionLink>
      </LegendAIActionCard>,
    );

    expect(screen.getByText('Class a::B {}')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveProperty(
      'target',
      '_blank',
    );
  });
});

describe(unitTest('LegendAIActionCard preview'), () => {
  test('text shows as written; an element shows as itself', () => {
    const { container, rerender } = render(
      <LegendAIActionCard title="Approve?" preview={'a\n  b'}>
        <span />
      </LegendAIActionCard>,
    );
    expect(
      container.querySelector('pre.legend-ai__card-preview')?.textContent,
    ).toBe('a\n  b');

    rerender(
      <LegendAIActionCard title="Approve?" preview={<table data-testid="t" />}>
        <span />
      </LegendAIActionCard>,
    );
    expect(
      container.querySelector('div.legend-ai__card-preview table'),
    ).not.toBeNull();
  });
});

describe(unitTest('Legend AI message views'), () => {
  test('draw messages as the Legend AI chat does', () => {
    const { container } = render(
      <LegendAIConversation scrollKey="1">
        <LegendAIEmptyState title="Ask away" />
        <LegendAIUserMessageView text="hi" />
        <LegendAIAssistantMessageFrame>
          <LegendAIWorkingIndicator label="Working on it…" />
        </LegendAIAssistantMessageFrame>
      </LegendAIConversation>,
    );

    expect(
      container.querySelector('.legend-ai__conversation .legend-ai__empty-text')
        ?.textContent,
    ).toBe('Ask away');
    expect(
      container.querySelector('.legend-ai__msg--user .legend-ai__msg-bubble')
        ?.textContent,
    ).toBe('hi');
    expect(
      container.querySelector(
        '.legend-ai__msg--assistant .legend-ai__msg-content',
      ),
    ).not.toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Working on it…');
  });
});
