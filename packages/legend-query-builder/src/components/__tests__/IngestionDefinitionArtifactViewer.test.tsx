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

import { describe, test, expect, afterEach, jest } from '@jest/globals';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
} from '@testing-library/react';
import {
  IngestionArtifactAppDirProducer,
  IngestionArtifactDependentDataset,
  IngestionArtifactIngestDefinitionRef,
  IngestionArtifactMatViewImplementation,
  IngestionArtifactSQLQuery,
  IngestionDefinitionArtifact,
} from '@finos/legend-graph';
import { IngestionDefinitionArtifactViewer } from '../lakehouse/IngestionDefinitionArtifactViewer.js';

// Mock the CodeEditor to avoid loading monaco-editor in jsdom, and render
// its input value in a way we can easily assert against.
jest.mock('@finos/legend-lego/code-editor', () => ({
  CodeEditor: (props: { inputValue: string; language: string }) => (
    <div data-testid="mock-code-editor" data-language={props.language}>
      {props.inputValue}
    </div>
  ),
}));

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const buildSqlQuery = (sql: string): IngestionArtifactSQLQuery => {
  const q = new IngestionArtifactSQLQuery();
  q.sql = sql;
  return q;
};

const buildIngestDefRef = (
  path: string,
  appDirId = 1234,
): IngestionArtifactIngestDefinitionRef => {
  const ref = new IngestionArtifactIngestDefinitionRef();
  ref.path = path;
  const producer = new IngestionArtifactAppDirProducer();
  producer.appDirId = appDirId;
  ref.producer = producer;
  return ref;
};

const buildDependentDataset = (
  schema: string,
  dataset: string,
  ingestDefPath: string,
): IngestionArtifactDependentDataset => {
  const dep = new IngestionArtifactDependentDataset();
  dep.schema = schema;
  dep.dataset = dataset;
  dep.ingestDefinition = buildIngestDefRef(ingestDefPath);
  return dep;
};

const buildMatView = (options: {
  datasetName: string;
  refreshType?: string;
  autoTrigger?: boolean;
  primaryKey?: string[];
  dependentDatasets?: IngestionArtifactDependentDataset[];
  viewFunctionSql: string;
  barrierSql?: string;
  selectSql?: string;
}): IngestionArtifactMatViewImplementation => {
  const mv = new IngestionArtifactMatViewImplementation();
  mv.datasetName = options.datasetName;
  mv.refreshType = options.refreshType ?? 'FULL';
  mv.autoTrigger = options.autoTrigger ?? false;
  mv.primaryKey = options.primaryKey ?? [];
  mv.dependentDatasets = options.dependentDatasets ?? [];
  mv.dependentAccessPoints = [];
  mv.viewFunctionQuery = buildSqlQuery(options.viewFunctionSql);
  mv.barrierQuery = options.barrierSql
    ? buildSqlQuery(options.barrierSql)
    : undefined;
  mv.selectQuery = options.selectSql
    ? buildSqlQuery(options.selectSql)
    : undefined;
  return mv;
};

const buildArtifact = (
  matViews: IngestionArtifactMatViewImplementation[],
): IngestionDefinitionArtifact => {
  const artifact = new IngestionDefinitionArtifact();
  artifact.ingestDefinition = buildIngestDefRef('some::ingest::Definition');
  artifact.storeClusterKeys = [];
  artifact.matViewImplementations = matViews;
  artifact.content = { some: 'content', nested: { value: 1 } };
  return artifact;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('IngestionDefinitionArtifactViewer', () => {
  test('renders nothing when artifact is undefined', () => {
    const { container } = render(
      <IngestionDefinitionArtifactViewer
        artifact={undefined}
        onClose={() => {
          // no-op
        }}
      />,
    );
    expect(container.firstChild).toBeNull();
    // Dialog would be portaled to document.body; ensure title isn't rendered.
    expect(screen.queryByText('Generated Ingest Artifact')).toBeNull();
  });

  test('renders modal with header and Close button', () => {
    const artifact = buildArtifact([
      buildMatView({
        datasetName: 'DATASET_A',
        viewFunctionSql: 'SELECT 1',
      }),
    ]);
    render(
      <IngestionDefinitionArtifactViewer
        artifact={artifact}
        onClose={() => {
          // no-op
        }}
      />,
    );
    expect(screen.getByText('Generated Ingest Artifact')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Close' })).not.toBeNull();
  });

  test('calls onClose when Close button is clicked', () => {
    const onClose = jest.fn();
    const artifact = buildArtifact([
      buildMatView({
        datasetName: 'DATASET_A',
        viewFunctionSql: 'SELECT 1',
      }),
    ]);
    render(
      <IngestionDefinitionArtifactViewer
        artifact={artifact}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('shows empty state when there are no mat view implementations', () => {
    const artifact = buildArtifact([]);
    render(
      <IngestionDefinitionArtifactViewer
        artifact={artifact}
        onClose={() => {
          // no-op
        }}
      />,
    );
    expect(
      screen.getByText('No materialized view implementations found.'),
    ).not.toBeNull();
  });

  test('renders mat view summary, meta and dependent datasets', () => {
    const artifact = buildArtifact([
      buildMatView({
        datasetName: 'DATASET_A',
        refreshType: 'INCREMENTAL',
        autoTrigger: true,
        primaryKey: ['id', 'version'],
        dependentDatasets: [
          buildDependentDataset('schema1', 'ds1', 'ingest::def::One'),
          buildDependentDataset('schema2', 'ds2', 'ingest::def::Two'),
        ],
        viewFunctionSql: 'SELECT * FROM foo',
      }),
    ]);
    render(
      <IngestionDefinitionArtifactViewer
        artifact={artifact}
        onClose={() => {
          // no-op
        }}
      />,
    );
    // 'DATASET_A' appears in both the explorer list and the mat view summary.
    expect(screen.getAllByText('DATASET_A').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Refresh: INCREMENTAL')).not.toBeNull();
    expect(screen.getByText('Auto Trigger: true')).not.toBeNull();
    expect(screen.getByText('Primary Key: id, version')).not.toBeNull();
    expect(screen.getByText('Dependent Datasets')).not.toBeNull();
    expect(screen.getByText('schema1.ds1')).not.toBeNull();
    expect(screen.getByText('schema2.ds2')).not.toBeNull();
    expect(screen.getByText('ingest::def::One')).not.toBeNull();
    expect(screen.getByText('ingest::def::Two')).not.toBeNull();
  });

  test('does not render dependent datasets section when there are none', () => {
    const artifact = buildArtifact([
      buildMatView({
        datasetName: 'DATASET_A',
        viewFunctionSql: 'SELECT 1',
      }),
    ]);
    render(
      <IngestionDefinitionArtifactViewer
        artifact={artifact}
        onClose={() => {
          // no-op
        }}
      />,
    );
    expect(screen.queryByText('Dependent Datasets')).toBeNull();
  });

  test('does not render primary key line when primary key is empty', () => {
    const artifact = buildArtifact([
      buildMatView({
        datasetName: 'DATASET_A',
        viewFunctionSql: 'SELECT 1',
      }),
    ]);
    render(
      <IngestionDefinitionArtifactViewer
        artifact={artifact}
        onClose={() => {
          // no-op
        }}
      />,
    );
    expect(screen.queryByText(/Primary Key:/)).toBeNull();
  });

  test('renders SQL for the view function tab by default', () => {
    const artifact = buildArtifact([
      buildMatView({
        datasetName: 'DATASET_A',
        viewFunctionSql: 'SELECT viewfn FROM t',
        barrierSql: 'SELECT barrier FROM t',
        selectSql: 'SELECT sel FROM t',
      }),
    ]);
    render(
      <IngestionDefinitionArtifactViewer
        artifact={artifact}
        onClose={() => {
          // no-op
        }}
      />,
    );
    const editor = screen.getByTestId('mock-code-editor');
    expect(editor.getAttribute('data-language')).toBe('sql');
    // sql-formatter may reflow whitespace; assert on substring.
    expect(editor.textContent).toContain('viewfn');
  });

  test('switching SQL tabs updates the editor content', () => {
    const artifact = buildArtifact([
      buildMatView({
        datasetName: 'DATASET_A',
        viewFunctionSql: 'SELECT viewfn FROM t',
        barrierSql: 'SELECT barrier FROM t',
        selectSql: 'SELECT sel FROM t',
      }),
    ]);
    render(
      <IngestionDefinitionArtifactViewer
        artifact={artifact}
        onClose={() => {
          // no-op
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Barrier' }));
    expect(screen.getByTestId('mock-code-editor').textContent).toContain(
      'barrier',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    expect(screen.getByTestId('mock-code-editor').textContent).toContain('sel');

    fireEvent.click(screen.getByRole('button', { name: 'View Function' }));
    expect(screen.getByTestId('mock-code-editor').textContent).toContain(
      'viewfn',
    );
  });

  test('disables SQL tab buttons for queries that are not provided', () => {
    const artifact = buildArtifact([
      buildMatView({
        datasetName: 'DATASET_A',
        viewFunctionSql: 'SELECT viewfn FROM t',
        // no barrier / select queries
      }),
    ]);
    render(
      <IngestionDefinitionArtifactViewer
        artifact={artifact}
        onClose={() => {
          // no-op
        }}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Barrier' }).hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Select' }).hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'View Function' })
        .hasAttribute('disabled'),
    ).toBe(false);
  });

  test('switching to JSON view mode renders artifact.content as JSON', () => {
    const artifact = buildArtifact([
      buildMatView({
        datasetName: 'DATASET_A',
        viewFunctionSql: 'SELECT 1',
      }),
    ]);
    render(
      <IngestionDefinitionArtifactViewer
        artifact={artifact}
        onClose={() => {
          // no-op
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'JSON' }));
    const editor = screen.getByTestId('mock-code-editor');
    expect(editor.getAttribute('data-language')).toBe('json');
    expect(editor.textContent).toContain('"some": "content"');
    expect(editor.textContent).toContain('"nested"');
  });

  test('renders all mat views in the explorer and switches selection', () => {
    const artifact = buildArtifact([
      buildMatView({
        datasetName: 'DATASET_A',
        viewFunctionSql: 'SELECT a FROM t',
      }),
      buildMatView({
        datasetName: 'DATASET_B',
        viewFunctionSql: 'SELECT b FROM t',
      }),
    ]);
    render(
      <IngestionDefinitionArtifactViewer
        artifact={artifact}
        onClose={() => {
          // no-op
        }}
      />,
    );

    const explorer = guaranteeNonNullable(
      screen.getByText('Materialized Views').parentElement,
    );
    expect(within(explorer).getByText('DATASET_A')).not.toBeNull();
    expect(within(explorer).getByText('DATASET_B')).not.toBeNull();

    // Initially DATASET_A is selected -> its SQL is displayed.
    expect(screen.getByTestId('mock-code-editor').textContent).toContain('a');

    // Select DATASET_B in the explorer.
    fireEvent.click(within(explorer).getByText('DATASET_B'));
    expect(screen.getByTestId('mock-code-editor').textContent).toContain('b');
  });
});
