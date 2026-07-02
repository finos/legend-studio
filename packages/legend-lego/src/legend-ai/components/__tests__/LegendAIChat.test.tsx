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
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from '@testing-library/react';
import { unitTest } from '@finos/legend-shared/test';
import { LegendAIChat, LEGEND_AI_ANCHOR_ID } from '../LegendAIChat.js';
import {
  type LegendAIChatProps,
  type LegendAIChatState,
  LegendAIMessageFeedbackRating,
  LegendAIMessageRole,
  LegendAIQuestionIntent,
  LegendAIThinkingStepStatus,
  LegendAIErrorType,
} from '../../LegendAITypes.js';
import {
  TEST__createMockLegendAIPlugin,
  TEST_DATA__legendAIConfig,
  TEST_DATA__legendAIMetadata,
  TEST_DATA__legendAIServices,
} from '../../__test-utils__/LegendAITestUtils.js';

const mockState: LegendAIChatState = {
  questionText: '',
  setQuestionText: jest.fn(),
  isSending: false,
  messages: [],
  selectedModelName: undefined,
  availableModelNames: [],
  setSelectedModelName: jest.fn(),
  askQuestion: jest.fn(),
  askQuestionWithIntent: jest.fn(),
  clearChat: jest.fn(),
  expandedThinking: new Set<number>(),
  toggleThinking: jest.fn(),
  runFallbackAction: jest.fn(),
  conversationRef: { current: null },
  selectedScopes: [],
  toggleScope: jest.fn(),
  removeScope: jest.fn(),
  stopGeneration: jest.fn(),
};

jest.mock('../../stores/LegendAIChatState.js', () => ({
  ...jest.requireActual<object>('../../stores/LegendAIChatState.js'),
  useLegendAIChatState: () => mockState,
}));

jest.mock('../LegendAIResultGrid.js', () => ({
  LegendAIResultGrid: (props: { data: { rowData: unknown[] } }) => (
    <div data-testid="mock-result-grid">{props.data.rowData.length} rows</div>
  ),
}));

jest.mock('../LegendAIAnalysisPanel.js', () => ({
  LegendAIAnalysisPanel: (props: { summary: string }) => (
    <div data-testid="mock-analysis-panel">{props.summary}</div>
  ),
}));

jest.mock('@finos/legend-art', () => ({
  SendIcon: () => <span data-testid="send-icon" />,
  LoadingIcon: (props: { isLoading?: boolean }) =>
    props.isLoading ? <span data-testid="loading-icon" /> : null,
  SparkleStarsIcon: () => <span data-testid="sparkle-icon" />,
  CodeIcon: () => <span data-testid="code-icon" />,
  TableIcon: () => <span data-testid="table-icon" />,
  CopyIcon: () => <span data-testid="copy-icon" />,
  RefreshIcon: () => <span data-testid="refresh-icon" />,
  CheckIcon: () => <span data-testid="check-icon" />,
  TimesIcon: () => <span data-testid="times-icon" />,
  MinusIcon: () => <span data-testid="minus-icon" />,
  PlusIcon: () => <span data-testid="plus-icon" />,
  CaretDownIcon: () => <span data-testid="caret-down-icon" />,
  CaretRightIcon: () => <span data-testid="caret-right-icon" />,
  DotIcon: () => <span data-testid="dot-icon" />,
  PlusCircleIcon: () => <span data-testid="plus-circle-icon" />,
  SearchIcon: () => <span data-testid="search-icon" />,
  SquareIcon: () => <span data-testid="square-icon" />,
  MarkdownTextViewer: (props: { value: { value: string } }) => (
    <div data-testid="markdown-viewer">{props.value.value}</div>
  ),
  LikeIcon: () => <span data-testid="like-icon" />,
  DislikeIcon: () => <span data-testid="dislike-icon" />,
  ExternalLinkIcon: () => <span data-testid="external-link-icon" />,
  InfoCircleIcon: () => <span data-testid="info-circle-icon" />,
  clsx: (...args: unknown[]) => {
    const classes: string[] = [];
    for (const arg of args) {
      if (typeof arg === 'string') {
        classes.push(arg);
      } else if (typeof arg === 'object' && arg !== null) {
        for (const [key, value] of Object.entries(arg)) {
          if (value) {
            classes.push(key);
          }
        }
      }
    }
    return classes.join(' ');
  },
}));

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
  mockState.questionText = '';
  mockState.isSending = false;
  mockState.messages = [];
  mockState.expandedThinking = new Set<number>();
});

const defaultProps: LegendAIChatProps = {
  services: TEST_DATA__legendAIServices,
  coordinates: 'com.test:prod:1.0.0',
  config: TEST_DATA__legendAIConfig,
  metadata: TEST_DATA__legendAIMetadata,
  plugin: TEST__createMockLegendAIPlugin(),
};

describe(unitTest('LegendAIChat'), () => {
  test('renders with correct anchor id', () => {
    const { container } = render(<LegendAIChat {...defaultProps} />);
    expect(container.querySelector(`#${LEGEND_AI_ANCHOR_ID}`)).toBeDefined();
  });

  test('renders default title when none provided', () => {
    render(<LegendAIChat {...defaultProps} />);
    expect(screen.getByText('Legend AI')).toBeDefined();
  });

  test('renders custom title', () => {
    render(<LegendAIChat {...defaultProps} title="Ask TradeService" />);
    expect(screen.getByText('Ask TradeService')).toBeDefined();
  });

  test('shows empty state with suggestions when no messages', () => {
    render(<LegendAIChat {...defaultProps} />);
    expect(screen.getByText('Ask a question about your data')).toBeDefined();
  });

  test('renders suggestion cards', () => {
    render(<LegendAIChat {...defaultProps} />);
    expect(
      screen.getByText(
        `What data does ${TEST_DATA__legendAIMetadata.name} offer and how can I use it?`,
      ),
    ).toBeDefined();
  });

  test('new chat button is always visible in header', () => {
    render(<LegendAIChat {...defaultProps} />);
    expect(screen.getByTitle('New chat')).toBeDefined();
  });
  test('renders textarea placeholder', () => {
    render(<LegendAIChat {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(
      /Ask anything about (?:the|your) data\.\.\./,
    );
    expect(textarea).toBeDefined();
  });

  test('clicking suggestion triggers askQuestionWithIntent', () => {
    render(<LegendAIChat {...defaultProps} />);
    const suggestion = screen.getByText(
      `What data does ${TEST_DATA__legendAIMetadata.name} offer and how can I use it?`,
    );
    fireEvent.click(suggestion);
    expect(mockState.askQuestionWithIntent).toHaveBeenCalledWith(
      `What data does ${TEST_DATA__legendAIMetadata.name} offer and how can I use it?`,
      LegendAIQuestionIntent.METADATA,
    );
  });

  test('send button is disabled when question is empty', () => {
    render(<LegendAIChat {...defaultProps} />);
    const sendBtn = screen.getByTitle('Send');
    expect(sendBtn).toBeDefined();
    expect((sendBtn as HTMLButtonElement).disabled).toBe(true);
  });

  test('send button is disabled while sending', () => {
    mockState.isSending = true;
    mockState.questionText = 'a question';
    render(<LegendAIChat {...defaultProps} />);
    const sendBtn = screen.getByTitle('Send');
    expect((sendBtn as HTMLButtonElement).disabled).toBe(true);
  });

  test('shows loading icon when sending', () => {
    mockState.isSending = true;
    render(<LegendAIChat {...defaultProps} />);
    expect(screen.getByTestId('loading-icon')).toBeDefined();
  });
  test('renders user message', () => {
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'show top 10 trades' },
    ];
    render(<LegendAIChat {...defaultProps} />);
    expect(screen.getByText('show top 10 trades')).toBeDefined();
  });

  test('renders assistant message with SQL', () => {
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'get trades' },
      {
        id: 'a',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: 'SELECT * FROM trades',
        textAnswer: null,
        dataContext: null,
        gridData: null,
        error: null,
        sqlGenTime: '1.50',
        execTime: null,
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: null,
        queriedAccessPointGroups: [],
      },
    ];
    render(<LegendAIChat {...defaultProps} />);
    expect(screen.getByText('SELECT * FROM trades')).toBeDefined();
    expect(screen.getByText('Generated SQL')).toBeDefined();
    expect(screen.getByText('1.50s')).toBeDefined();
  });

  test('renders assistant message with text answer', () => {
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'what is this?' },
      {
        id: 'a',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: null,
        textAnswer: 'This provides trade data',
        dataContext: null,
        gridData: null,
        error: null,
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: null,
        queriedAccessPointGroups: [],
      },
    ];
    render(<LegendAIChat {...defaultProps} />);
    expect(screen.getByText('This provides trade data')).toBeDefined();
  });

  test('submits thumbs up feedback for assistant message', async () => {
    const onMessageFeedback: LegendAIChatProps['onMessageFeedback'] = jest.fn(
      () => undefined,
    );
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'what is this?' },
      {
        id: 'a',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: 'SELECT * FROM trades',
        textAnswer: 'This provides trade data',
        dataContext: null,
        gridData: {
          columnDefs: [{ colId: 'id', headerName: 'id', field: 'id' }],
          rowData: [{ id: 1 }, { id: 2 }],
        },
        error: null,
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: null,
        queriedAccessPointGroups: [],
      },
    ];

    render(
      <LegendAIChat {...defaultProps} onMessageFeedback={onMessageFeedback} />,
    );

    await act(async () => {
      fireEvent.click(screen.getByTitle('Thumbs up'));
    });

    expect(onMessageFeedback).toHaveBeenCalledWith({
      messageId: 'a',
      rating: LegendAIMessageFeedbackRating.THUMBS_UP,
      question: 'what is this?',
      answer: 'This provides trade data',
      sql: 'SELECT * FROM trades',
      rowCount: 2,
    });
  });

  test('renders assistant message with error', () => {
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'bad query' },
      {
        id: 'a',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: null,
        textAnswer: null,
        dataContext: null,
        gridData: null,
        error: 'Query timeout',
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: null,
        queriedAccessPointGroups: [],
      },
    ];
    render(<LegendAIChat {...defaultProps} />);
    expect(screen.getByText('Query timeout')).toBeDefined();
  });

  test('renders permission access links when configured', () => {
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'bad query' },
      {
        id: 'a',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: null,
        textAnswer: null,
        dataContext: null,
        gridData: null,
        error: 'Unable to reach the AI service. This is a permissions issue.',
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: LegendAIErrorType.PERMISSION,
        queriedAccessPointGroups: [],
      },
    ];

    render(
      <LegendAIChat
        {...defaultProps}
        config={{
          ...defaultProps.config,
          enghubDocUrl: 'https://enghub.gs.com/test',
          enthubRequestAccessUrl: 'https://enthub.site.gs.com/test',
        }}
      />,
    );

    expect(
      screen
        .getByRole('link', { name: 'View Documentation' })
        .getAttribute('href'),
    ).toBe('https://enghub.gs.com/test');
    expect(
      screen.getByRole('link', { name: 'Request Access' }).getAttribute('href'),
    ).toBe('https://enthub.site.gs.com/test');
  });

  test('does not render permission links when config URLs are missing', () => {
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'bad query' },
      {
        id: 'a',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: null,
        textAnswer: null,
        dataContext: null,
        gridData: null,
        error: 'Unable to reach the AI service. This is a permissions issue.',
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: LegendAIErrorType.PERMISSION,
        queriedAccessPointGroups: [],
      },
    ];

    render(<LegendAIChat {...defaultProps} />);

    expect(screen.queryByRole('link', { name: 'View Documentation' })).toBe(
      null,
    );
    expect(screen.queryByRole('link', { name: 'Request Access' })).toBe(null);
    expect(screen.queryByText('Need access?')).toBe(null);
  });

  test('renders executing indicator', () => {
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'get data' },
      {
        id: 'a',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: 'SELECT 1',
        textAnswer: null,
        dataContext: null,
        gridData: null,
        error: null,
        sqlGenTime: '0.50',
        execTime: null,
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: true,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: null,
        queriedAccessPointGroups: [],
      },
    ];
    render(<LegendAIChat {...defaultProps} />);
    expect(screen.getByText('Executing query...')).toBeDefined();
  });

  test('renders grid data results', () => {
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'get data' },
      {
        id: 'a',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: 'SELECT id FROM t',
        textAnswer: null,
        dataContext: null,
        gridData: {
          columnDefs: [{ colId: 'id', headerName: 'id', field: 'id' }],
          rowData: [{ id: 1 }, { id: 2 }],
        },
        error: null,
        sqlGenTime: '0.50',
        execTime: '0.10',
        thinkingDuration: '1.5',
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: null,
        queriedAccessPointGroups: [],
      },
    ];
    render(<LegendAIChat {...defaultProps} />);
    expect(screen.getByText('Results')).toBeDefined();
    const meta = document.querySelector('.legend-ai__results-meta');
    expect(meta?.textContent).toContain('2');
    expect(meta?.textContent).toContain('rows');
    expect(screen.getByTestId('mock-result-grid')).toBeDefined();
  });

  test('renders singular row count for 1 row', () => {
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'get data' },
      {
        id: 'a',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: 'SELECT id FROM t LIMIT 1',
        textAnswer: null,
        dataContext: null,
        gridData: {
          columnDefs: [{ colId: 'id', headerName: 'id', field: 'id' }],
          rowData: [{ id: 1 }],
        },
        error: null,
        sqlGenTime: null,
        execTime: '0.05',
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: null,
        queriedAccessPointGroups: [],
      },
    ];
    render(<LegendAIChat {...defaultProps} />);
    const meta = document.querySelector('.legend-ai__results-meta');
    expect(meta?.textContent).toContain('1');
    expect(meta?.textContent).toContain('row');
    expect(meta?.textContent).not.toContain('rows');
  });
  test('renders thinking steps when processing', () => {
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'get data' },
      {
        id: 'a',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [
          {
            id: 'step-1',
            label: 'Analyzing your question...',
            status: LegendAIThinkingStepStatus.ACTIVE,
          },
        ],
        sql: null,
        textAnswer: null,
        dataContext: null,
        gridData: null,
        error: null,
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: null,
        isProcessing: true,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: null,
        queriedAccessPointGroups: [],
      },
    ];
    render(<LegendAIChat {...defaultProps} />);
    expect(screen.getByText('Understanding your request')).toBeDefined();
  });

  test('renders thinking toggle for completed messages', () => {
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'get data' },
      {
        id: 'a',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [
          {
            id: 'step-1',
            label: 'Done analyzing',
            status: LegendAIThinkingStepStatus.DONE,
          },
        ],
        sql: 'SELECT 1',
        textAnswer: null,
        dataContext: null,
        gridData: null,
        error: null,
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: '2.1',
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: null,
        queriedAccessPointGroups: [],
      },
    ];
    mockState.expandedThinking = new Set([1]);
    render(<LegendAIChat {...defaultProps} />);
    expect(screen.getByText(/Thought for 2.1s/)).toBeDefined();
    expect(screen.getByText('Done analyzing')).toBeDefined();
  });
  test('shows new chat button when messages exist', () => {
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'hello' },
    ];
    render(<LegendAIChat {...defaultProps} />);
    expect(screen.getByTitle('New chat')).toBeDefined();
  });

  test('clicking new chat calls clearChat', () => {
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'hello' },
    ];
    render(<LegendAIChat {...defaultProps} />);
    fireEvent.click(screen.getByTitle('New chat'));
    expect(mockState.clearChat).toHaveBeenCalled();
  });
  test('Enter key triggers askQuestion', () => {
    mockState.questionText = 'show data';
    render(<LegendAIChat {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(
      /Ask anything about (?:the|your) data\.\.\./,
    );
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(mockState.askQuestion).toHaveBeenCalled();
  });

  test('Shift+Enter does not trigger askQuestion', () => {
    mockState.questionText = 'show data';
    render(<LegendAIChat {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(
      /Ask anything about (?:the|your) data\.\.\./,
    );
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(mockState.askQuestion).not.toHaveBeenCalled();
  });

  test('Enter does not trigger askQuestion when isSending', () => {
    mockState.questionText = 'show data';
    mockState.isSending = true;
    render(<LegendAIChat {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(
      /Ask anything about (?:the|your) data\.\.\./,
    );
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(mockState.askQuestion).not.toHaveBeenCalled();
  });

  test('Enter does not trigger askQuestion when question is empty', () => {
    mockState.questionText = '   ';
    render(<LegendAIChat {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(
      /Ask anything about (?:the|your) data\.\.\./,
    );
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(mockState.askQuestion).not.toHaveBeenCalled();
  });
  test('renders copy SQL button', () => {
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'query' },
      {
        id: 'a',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: 'SELECT 1',
        textAnswer: null,
        dataContext: null,
        gridData: null,
        error: null,
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: null,
        queriedAccessPointGroups: [],
      },
    ];
    render(<LegendAIChat {...defaultProps} />);
    expect(screen.getByTitle('Copy SQL')).toBeDefined();
  });

  test('clicking copy SQL button copies to clipboard', () => {
    const writeTextMock = jest
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'query' },
      {
        id: 'a',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: 'SELECT * FROM trades',
        textAnswer: null,
        dataContext: null,
        gridData: null,
        error: null,
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: null,
        queriedAccessPointGroups: [],
      },
    ];
    render(<LegendAIChat {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Copy SQL'));
    expect(writeTextMock).toHaveBeenCalledWith('SELECT * FROM trades');
  });
  test('clicking thinking toggle calls toggleThinking', () => {
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'query' },
      {
        id: 'a',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [
          {
            id: 'step-1',
            label: 'Analyzing...',
            status: LegendAIThinkingStepStatus.DONE,
          },
        ],
        sql: 'SELECT 1',
        textAnswer: null,
        dataContext: null,
        gridData: null,
        error: null,
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: '1.5',
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: null,
        queriedAccessPointGroups: [],
      },
    ];
    render(<LegendAIChat {...defaultProps} />);
    const toggle = screen.getByText(/Thought for/);
    fireEvent.click(toggle);
    expect(mockState.toggleThinking).toHaveBeenCalledWith(1);
  });
  test('renders error icon for error thinking step', () => {
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'bad' },
      {
        id: 'a',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [
          {
            id: 'step-1',
            label: 'Error occurred',
            status: LegendAIThinkingStepStatus.ERROR,
          },
        ],
        sql: null,
        textAnswer: null,
        dataContext: null,
        gridData: null,
        error: 'Something went wrong',
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: '0.5',
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: null,
        queriedAccessPointGroups: [],
      },
    ];
    mockState.expandedThinking = new Set([1]);
    render(<LegendAIChat {...defaultProps} />);
    expect(
      screen.getByText('Hit an issue while preparing the answer'),
    ).toBeDefined();
    expect(screen.getAllByTestId('times-icon').length).toBeGreaterThanOrEqual(
      1,
    );
  });
  test('typing in textarea calls setQuestionText', () => {
    render(<LegendAIChat {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(
      /Ask anything about (?:the|your) data\.\.\./,
    );
    fireEvent.change(textarea, { target: { value: 'hello' } });
    expect(mockState.setQuestionText).toHaveBeenCalledWith('hello');
  });
  test('clicking send button calls askQuestion', () => {
    mockState.questionText = 'show data';
    render(<LegendAIChat {...defaultProps} />);
    const sendBtn = screen.getByTitle('Send');
    fireEvent.click(sendBtn);
    expect(mockState.askQuestion).toHaveBeenCalled();
  });

  test('renders analysis panel when textAnswer and gridData present', () => {
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'analyze data' },
      {
        id: 'a',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: 'SELECT * FROM t',
        textAnswer: 'Here is the analysis summary',
        dataContext: null,
        gridData: {
          columnDefs: [{ colId: 'id', headerName: 'id', field: 'id' }],
          rowData: [{ id: 1 }],
        },
        error: null,
        sqlGenTime: '0.50',
        execTime: '0.10',
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: null,
        queriedAccessPointGroups: [],
      },
    ];
    render(<LegendAIChat {...defaultProps} />);
    expect(screen.getByTestId('mock-analysis-panel')).toBeDefined();
  });

  test('renders metadata text above SQL and query analysis below results', () => {
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'capability question' },
      {
        id: 'a',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: 'SELECT * FROM t',
        textAnswer:
          '### Metadata context\nMetadata context answer\n\n### Query analysis\nQuery analysis summary',
        dataContext: null,
        gridData: {
          columnDefs: [{ colId: 'id', headerName: 'id', field: 'id' }],
          rowData: [{ id: 1 }],
        },
        error: null,
        sqlGenTime: '0.50',
        execTime: '0.10',
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: null,
        queriedAccessPointGroups: [],
      },
    ];

    render(<LegendAIChat {...defaultProps} />);

    const metadataNode = screen.getByText('Metadata context answer');
    const sqlNode = screen.getByText('SELECT * FROM t');
    const analysisNode = screen.getByText('Query analysis summary');

    expect(
      metadataNode.compareDocumentPosition(sqlNode) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      sqlNode.compareDocumentPosition(analysisNode) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test('renders analyzing loader when processing after grid data', () => {
    mockState.messages = [
      { id: 'u', role: LegendAIMessageRole.USER, text: 'get data' },
      {
        id: 'a',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: 'SELECT * FROM t',
        textAnswer: null,
        dataContext: null,
        gridData: {
          columnDefs: [{ colId: 'id', headerName: 'id', field: 'id' }],
          rowData: [{ id: 1 }],
        },
        error: null,
        sqlGenTime: '0.50',
        execTime: '0.10',
        thinkingDuration: null,
        isProcessing: true,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: null,
        queriedAccessPointGroups: [],
      },
    ];
    render(<LegendAIChat {...defaultProps} />);
    expect(screen.getByText('Analyzing results...')).toBeDefined();
  });

  test('renders close button when onClose provided', () => {
    const onClose = jest.fn();
    render(<LegendAIChat {...defaultProps} onClose={onClose} />);
    const closeBtn = screen.getByTitle('Close');
    expect(closeBtn).toBeDefined();
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  test('renders minimize button when onMinimize provided', () => {
    const onMinimize = jest.fn();
    render(<LegendAIChat {...defaultProps} onMinimize={onMinimize} />);
    const minimizeBtn = screen.getByTitle('Minimize');
    expect(minimizeBtn).toBeDefined();
    fireEvent.click(minimizeBtn);
    expect(onMinimize).toHaveBeenCalled();
  });

  test('does not render close or minimize buttons by default', () => {
    render(<LegendAIChat {...defaultProps} />);
    expect(screen.queryByTitle('Close')).toBeNull();
    expect(screen.queryByTitle('Minimize')).toBeNull();
  });
});
