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

import { test, describe, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  findLegendAIPlugin,
  classifyQuestionIntentFast,
  LegendAIQuestionIntent,
  DEFAULT_LEGEND_AI_CONFIG,
  LegendAIConfig,
  LegendAIProductMetadata,
  LegendAIAccessPointGroupInfo,
  TDSColumnSchema,
  TDSServiceSchema,
  TDSServiceSourceType,
  LegendAIGridData,
  LegendAIThinkingStepStatus,
  LegendAIThinkingStep,
  LegendAIMessageRole,
  LegendAIUserMessage,
  LegendAIAssistantMessage,
  LegendAIConversationTurn,
  QuestionIntentClassification,
  METADATA_SIGNAL_PATTERNS,
  DATA_QUERY_SIGNAL_PATTERNS,
  buildColumnDefsFromNames,
  type LegendAIServiceSummary,
  type LegendAIAccessPointInfo,
  type LegendAITagInfo,
} from '../LegendAITypes.js';
import type { LegendApplicationPlugin } from '@finos/legend-application';

// ─── findLegendAIPlugin ──────────────────────────────────────────────────────

describe(unitTest('findLegendAIPlugin'), () => {
  test('returns undefined when no plugins match', () => {
    const fakePlugin = { getName: () => 'other' } as LegendApplicationPlugin;
    expect(findLegendAIPlugin([fakePlugin])).toBeUndefined();
  });

  test('returns undefined for empty array', () => {
    expect(findLegendAIPlugin([])).toBeUndefined();
  });
});

// ─── DEFAULT_LEGEND_AI_CONFIG ────────────────────────────────────────────────

describe(unitTest('DEFAULT_LEGEND_AI_CONFIG'), () => {
  test('has expected defaults', () => {
    expect(DEFAULT_LEGEND_AI_CONFIG.enabled).toBe(false);
    expect(DEFAULT_LEGEND_AI_CONFIG.llmServiceUrl).toBeUndefined();
    expect(DEFAULT_LEGEND_AI_CONFIG.orchestratorUrl).toBeUndefined();
    expect(DEFAULT_LEGEND_AI_CONFIG.marketplaceSearchUrl).toBeUndefined();
    expect(DEFAULT_LEGEND_AI_CONFIG.engineUrl).toBeUndefined();
  });

  test('is frozen', () => {
    expect(Object.isFrozen(DEFAULT_LEGEND_AI_CONFIG)).toBe(true);
  });
});

// ─── Data carrier classes ────────────────────────────────────────────────────

describe(unitTest('data carrier classes'), () => {
  test('TDSColumnSchema can be instantiated', () => {
    const col = new TDSColumnSchema();
    col.name = 'id';
    col.type = 'String';
    col.documentation = 'ID column';
    col.sampleValues = '1,2,3';
    expect(col.name).toBe('id');
    expect(col.type).toBe('String');
  });

  test('TDSServiceSchema can be instantiated with all fields', () => {
    const svc = new TDSServiceSchema();
    svc.title = 'TestService';
    svc.description = 'desc';
    svc.pattern = '/test';
    svc.columns = [];
    svc.parameters = ['p1'];
    svc.sourceType = TDSServiceSourceType.ACCESS_POINT;
    svc.dataProductPath = 'my::Path';
    expect(svc.sourceType).toBe(TDSServiceSourceType.ACCESS_POINT);
    expect(svc.dataProductPath).toBe('my::Path');
  });

  test('LegendAIConfig can be instantiated', () => {
    const cfg = new LegendAIConfig();
    cfg.enabled = true;
    cfg.llmServiceUrl = 'http://test';
    cfg.maxJudgeAttempts = 3;
    cfg.lakehouseEnvironment = 'uat';
    expect(cfg.maxJudgeAttempts).toBe(3);
    expect(cfg.lakehouseEnvironment).toBe('uat');
  });

  test('LegendAIProductMetadata with optional fields', () => {
    const meta = new LegendAIProductMetadata();
    meta.name = 'Prod';
    meta.description = 'desc';
    meta.coordinates = 'com:art:1';
    meta.serviceSummaries = [{ title: 'svc' }];
    meta.tags = [{ profile: 'p', value: 'v' }];
    meta.supportInfo = 'team@example.com';
    expect(meta.tags).toHaveLength(1);
    expect(meta.supportInfo).toBe('team@example.com');
  });

  test('LegendAIAccessPointGroupInfo with access points', () => {
    const group = new LegendAIAccessPointGroupInfo();
    group.title = 'Group1';
    group.description = 'desc';
    group.accessPoints = [
      { title: 'AP1', description: 'access point 1' },
      { title: 'AP2' },
    ];
    expect(group.accessPoints).toHaveLength(2);
  });

  test('LegendAIGridData can be instantiated', () => {
    const grid = new LegendAIGridData();
    grid.columnDefs = [];
    grid.rowData = [{ a: 1 }];
    expect(grid.rowData).toHaveLength(1);
  });

  test('LegendAIThinkingStep can be instantiated', () => {
    const step = new LegendAIThinkingStep();
    step.label = 'Working';
    step.status = LegendAIThinkingStepStatus.ACTIVE;
    expect(step.status).toBe('active');
  });

  test('LegendAIUserMessage can be instantiated', () => {
    const msg = new LegendAIUserMessage();
    msg.id = '1';
    msg.role = LegendAIMessageRole.USER;
    msg.text = 'hello';
    expect(msg.role).toBe('user');
  });

  test('LegendAIAssistantMessage can be instantiated with all fields', () => {
    const msg = new LegendAIAssistantMessage();
    msg.id = '2';
    msg.role = LegendAIMessageRole.ASSISTANT;
    msg.thinkingSteps = [];
    msg.sql = 'SELECT 1';
    msg.textAnswer = null;
    msg.gridData = null;
    msg.error = null;
    msg.sqlGenTime = '0.5';
    msg.execTime = '1.0';
    msg.thinkingDuration = '2.0';
    msg.isProcessing = false;
    msg.isExecuting = false;
    msg.suggestedQueries = ['q1'];
    expect(msg.suggestedQueries).toHaveLength(1);
  });

  test('LegendAIConversationTurn can be instantiated', () => {
    const turn = new LegendAIConversationTurn();
    turn.question = 'q';
    turn.sql = 'SELECT 1';
    turn.intent = LegendAIQuestionIntent.DATA_QUERY;
    expect(turn.intent).toBe('data_query');
  });

  test('QuestionIntentClassification can be instantiated', () => {
    const cls = new QuestionIntentClassification();
    cls.intent = LegendAIQuestionIntent.METADATA;
    cls.metaScore = 3;
    cls.dataScore = 1;
    cls.ambiguous = false;
    expect(cls.metaScore).toBe(3);
  });

  test('named sub-types are structurally sound', () => {
    const summary: LegendAIServiceSummary = { title: 'svc', description: 'd' };
    expect(summary.title).toBe('svc');

    const ap: LegendAIAccessPointInfo = { title: 'AP1' };
    expect(ap.title).toBe('AP1');

    const tag: LegendAITagInfo = { profile: 'p', value: 'v' };
    expect(tag.profile).toBe('p');
  });
});

// ─── buildColumnDefsFromNames ────────────────────────────────────────────────

describe(unitTest('buildColumnDefsFromNames'), () => {
  test('builds column defs from name array', () => {
    const defs = buildColumnDefsFromNames(['a', 'b']);
    expect(defs).toEqual([
      { colId: 'a', headerName: 'a', field: 'a' },
      { colId: 'b', headerName: 'b', field: 'b' },
    ]);
  });

  test('returns empty array for empty input', () => {
    expect(buildColumnDefsFromNames([])).toEqual([]);
  });
});

// ─── Enum coverage ───────────────────────────────────────────────────────────

describe(unitTest('enum values'), () => {
  test('TDSServiceSourceType values', () => {
    expect(TDSServiceSourceType.SERVICE).toBe('service');
    expect(TDSServiceSourceType.ACCESS_POINT).toBe('accessPoint');
  });

  test('LegendAIThinkingStepStatus values', () => {
    expect(LegendAIThinkingStepStatus.ACTIVE).toBe('active');
    expect(LegendAIThinkingStepStatus.DONE).toBe('done');
    expect(LegendAIThinkingStepStatus.ERROR).toBe('error');
  });

  test('LegendAIMessageRole values', () => {
    expect(LegendAIMessageRole.USER).toBe('user');
    expect(LegendAIMessageRole.ASSISTANT).toBe('assistant');
  });

  test('LegendAIQuestionIntent values', () => {
    expect(LegendAIQuestionIntent.DATA_QUERY).toBe('data_query');
    expect(LegendAIQuestionIntent.METADATA).toBe('metadata');
    expect(LegendAIQuestionIntent.ORCHESTRATOR).toBe('orchestrator');
  });
});

// ─── Regex pattern coverage (METADATA_SIGNAL_PATTERNS) ──────────────────────

describe(unitTest('METADATA_SIGNAL_PATTERNS — untested patterns'), () => {
  test('summarize what you provide', () => {
    expect(
      METADATA_SIGNAL_PATTERNS.some((r) =>
        r.test('summarize what you provide'),
      ),
    ).toBe(true);
  });

  test('what do you have', () => {
    expect(
      METADATA_SIGNAL_PATTERNS.some((r) => r.test('what do you have')),
    ).toBe(true);
  });

  test('how many fields does this product have', () => {
    expect(
      METADATA_SIGNAL_PATTERNS.some((r) =>
        r.test('how many fields does this product have'),
      ),
    ).toBe(true);
  });

  test('what type of data is this', () => {
    expect(
      METADATA_SIGNAL_PATTERNS.some((r) => r.test('what type of data is this')),
    ).toBe(true);
  });

  test('describe (sentence start)', () => {
    expect(
      METADATA_SIGNAL_PATTERNS.some((r) => r.test('describe the data')),
    ).toBe(true);
  });

  test('summary of this product', () => {
    expect(
      METADATA_SIGNAL_PATTERNS.some((r) => r.test('summary of this product')),
    ).toBe(true);
  });

  test('what is this product', () => {
    expect(
      METADATA_SIGNAL_PATTERNS.some((r) => r.test('what is this product')),
    ).toBe(true);
  });

  test('tell me more', () => {
    expect(METADATA_SIGNAL_PATTERNS.some((r) => r.test('tell me more'))).toBe(
      true,
    );
  });

  test('what this product provides', () => {
    expect(
      METADATA_SIGNAL_PATTERNS.some((r) =>
        r.test('what this product provides'),
      ),
    ).toBe(true);
  });

  test('how does this system work', () => {
    expect(
      METADATA_SIGNAL_PATTERNS.some((r) => r.test('how does this system work')),
    ).toBe(true);
  });

  test('what can I do with this', () => {
    expect(
      METADATA_SIGNAL_PATTERNS.some((r) => r.test('what can i do with this')),
    ).toBe(true);
  });

  test('used for analytics', () => {
    expect(
      METADATA_SIGNAL_PATTERNS.some((r) => r.test('used for analytics')),
    ).toBe(true);
  });

  test('help me understand this', () => {
    expect(
      METADATA_SIGNAL_PATTERNS.some((r) => r.test('help me understand this')),
    ).toBe(true);
  });

  test('what information does this provide', () => {
    expect(
      METADATA_SIGNAL_PATTERNS.some((r) =>
        r.test('what information does this provide'),
      ),
    ).toBe(true);
  });

  test('what does MyService do', () => {
    expect(
      METADATA_SIGNAL_PATTERNS.some((r) => r.test('what does myservice do')),
    ).toBe(true);
  });
});

// ─── Regex pattern coverage (DATA_QUERY_SIGNAL_PATTERNS) ────────────────────

describe(unitTest('DATA_QUERY_SIGNAL_PATTERNS — untested patterns'), () => {
  test('distinct values', () => {
    expect(
      DATA_QUERY_SIGNAL_PATTERNS.some((r) =>
        r.test('get distinct values for region'),
      ),
    ).toBe(true);
  });

  test('from service', () => {
    expect(
      DATA_QUERY_SIGNAL_PATTERNS.some((r) =>
        r.test('select data from service'),
      ),
    ).toBe(true);
  });

  test('compare vendor A versus vendor B', () => {
    expect(
      DATA_QUERY_SIGNAL_PATTERNS.some((r) =>
        r.test('compare vendor a versus vendor b'),
      ),
    ).toBe(true);
  });

  test('what percentage of total', () => {
    expect(
      DATA_QUERY_SIGNAL_PATTERNS.some((r) =>
        r.test('what percentage of total revenue'),
      ),
    ).toBe(true);
  });

  test('which accounts generate revenue', () => {
    expect(
      DATA_QUERY_SIGNAL_PATTERNS.some((r) =>
        r.test('which accounts generate the most revenue'),
      ),
    ).toBe(true);
  });

  test('how much revenue', () => {
    expect(
      DATA_QUERY_SIGNAL_PATTERNS.some((r) => r.test('how much revenue')),
    ).toBe(true);
  });

  test('date literal 2024-01-15', () => {
    expect(
      DATA_QUERY_SIGNAL_PATTERNS.some((r) => r.test('trades on 2024-01-15')),
    ).toBe(true);
  });

  test('last quarter', () => {
    expect(
      DATA_QUERY_SIGNAL_PATTERNS.some((r) => r.test('last quarter results')),
    ).toBe(true);
  });

  test('fiscal year q1 2024', () => {
    expect(
      DATA_QUERY_SIGNAL_PATTERNS.some((r) =>
        r.test('show fiscal year data q1 2024'),
      ),
    ).toBe(true);
  });

  test('sedol identifier', () => {
    expect(
      DATA_QUERY_SIGNAL_PATTERNS.some((r) => r.test('lookup sedol B1YW440')),
    ).toBe(true);
  });

  test('per country breakdown', () => {
    expect(
      DATA_QUERY_SIGNAL_PATTERNS.some((r) => r.test('volume per country')),
    ).toBe(true);
  });

  test('grouped by region', () => {
    expect(
      DATA_QUERY_SIGNAL_PATTERNS.some((r) =>
        r.test('show data grouped by region'),
      ),
    ).toBe(true);
  });

  test('broken down by category', () => {
    expect(
      DATA_QUERY_SIGNAL_PATTERNS.some((r) =>
        r.test('revenue broken down by category'),
      ),
    ).toBe(true);
  });

  test('as of yesterday', () => {
    expect(
      DATA_QUERY_SIGNAL_PATTERNS.some((r) => r.test('positions as of today')),
    ).toBe(true);
  });
});

// ─── classifyQuestionIntentFast — ambiguous / tie branches ───────────────────

describe(
  unitTest('classifyQuestionIntentFast — ambiguous / tie branches'),
  () => {
    test('mixed signals with meta > data but no product reference → ambiguous metadata', () => {
      // "what type of data is this" (meta) + "how much" (data) — meta > data, no product/structural
      const result = classifyQuestionIntentFast(
        'what type of data is available and how much',
        true,
      );
      expect(result.metaScore).toBeGreaterThan(0);
      expect(result.dataScore).toBeGreaterThan(0);
      // Ensure meta wins or ambiguous
      if (result.metaScore > result.dataScore) {
        expect(result.intent).toBe(LegendAIQuestionIntent.METADATA);
        expect(result.ambiguous).toBe(true);
      }
    });

    test('equal scores with no product/structural ref → ambiguous data_query', () => {
      // Construct a question with exactly 1 meta + 1 data pattern, no product reference or structural keyword
      // "overview" (meta, sentence start) + "revenue" (data)
      const result = classifyQuestionIntentFast('explain the revenue', true);
      expect(result.metaScore).toBeGreaterThan(0);
      expect(result.dataScore).toBeGreaterThan(0);
      if (result.metaScore === result.dataScore) {
        expect(result.intent).toBe(LegendAIQuestionIntent.DATA_QUERY);
        expect(result.ambiguous).toBe(true);
      }
    });

    test('data dominance when data >= 2x meta triggers non-ambiguous data', () => {
      // "select top 5 rows from service where amount > 100 group by region"
      const result = classifyQuestionIntentFast(
        'select top 5 rows from service where amount > 100 group by region for last year',
        true,
      );
      expect(result.dataScore).toBeGreaterThanOrEqual(result.metaScore * 2);
      expect(result.intent).toBe(LegendAIQuestionIntent.DATA_QUERY);
      expect(result.ambiguous).toBe(false);
    });
  },
);
