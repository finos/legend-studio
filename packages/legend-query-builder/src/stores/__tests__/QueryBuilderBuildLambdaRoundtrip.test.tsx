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

import { test, expect, describe } from '@jest/globals';
import {
  TEST_DATA__simpleProjection,
  TEST_DATA__projectionWithChainedProperty,
  TEST_DATA__projectionWithResultSetModifiers,
  TEST_DATA__getAllWithGroupedFilter,
  TEST_DATA__getAllWithOneConditionFilter,
  TEST_DATA__projectWithDerivedProperty,
  TEST_DATA__fullComplexProjectionQuery,
  TEST_DATA__complexGraphFetch,
  TEST_DATA__simpleGraphFetch,
  TEST_DATA__graphFetchWithDerivedProperty,
  TEST_DATA__graphFetchWithDerivedPropertyAndParameter,
  TEST_DATA__simpleProjectionWithSubtype,
  TEST_DATA__graphFetchWithSubtype,
  TEST_DATA__filterQueryWithSubtypeWithoutExists,
  TEST_DATA__filterQueryWithSubtypeWithExists,
  TEST_DATA__filterQueryWithSubtypeWithExistsChain,
  TEST_DATA__simpleProjectionWithOutPreviewLimit,
  TEST_DATA__simpleProjectionWithPreviewLimit,
  TEST_DATA__simpleFromFunction,
  TEST_DATA__lambda_postFilterQueryWithRightValAsCol,
  TEST_DATA__simpleProjectionWithSlice,
  TEST_DATA_simpleTypedRelationProjection,
  TEST_DATA__projectionWithPercentileAggregation,
  TEST_DATA__projectionWithWAVGAggregation,
} from './TEST_DATA__QueryBuilder_Generic.js';
import TEST_DATA__ComplexRelationalModel from './TEST_DATA__QueryBuilder_Model_ComplexRelational.json' with { type: 'json' };
import TEST_DATA__ComplexM2MModel from './TEST_DATA__QueryBuilder_Model_ComplexM2M.json' with { type: 'json' };
import TEST_DATA__M2MWithInheritance from './TEST_DATA__QueryBuilder_Model_M2MWithInheritance.json' with { type: 'json' };
import TEST_DATA__COVIDDataSimpleModel from './TEST_DATA__QueryBuilder_Model_COVID.json' with { type: 'json' };
import TEST_DATA__SimpleM2MModel from './TEST_DATA__QueryBuilder_Model_SimpleM2M.json' with { type: 'json' };
import TEST_DATA__PostFilterModel from './TEST_DATA__QueryBuilder_Model_PostFilter.json' with { type: 'json' };
import TEST_DATA__BindingM2MModel from './TEST_DATA__QueryBuilder_Model_BindingM2M.json' with { type: 'json' };
import TEST_DATA__QueryBuilder_Model_SimpleIdentityM2M from './TEST_DATA__QueryBuilder_Model_SimpleIdentityM2M.json' with { type: 'json' };
import {
  TEST_DATA__lambda_simpleSingleConditionFilterWithParameter,
  TEST_DATA__lambda_enumerationOperatorFilter,
  TEST_DATA__lambda_existsChainFilter,
  TEST_DATA__lambda_existsChainFilterWithCustomVariableName,
  TEST_DATA__lambda_groupConditionFilter,
  TEST_DATA__lambda_groupConditionFilter_withMultipleClauseGroup,
  TEST_DATA__lambda_notOperatorFilter,
  TEST_DATA__lambda_setOperatorFilter,
  TEST_DATA__lambda_simpleSingleConditionFilter,
  TEST_DATA_lambda_dateTimeCapabilityFilterWithYesterday,
  TEST_DATA__lambda_isOperatorFilterForDate,
  TEST_DATA__lambda_filterWithRightSidePropertyExpression,
} from './TEST_DATA__QueryBuilder_Roundtrip_TestFilterQueries.js';
import {
  TEST_DATA__lambda_input_filterWithExists,
  lambda_output_filterWithExists,
  TEST_DATA__lambda_filterWithSingleExists,
  TEST_DATA__lambda_filterWithNestedExists,
  TEST_DATA__lambda_filterWithMultipleGroupConditionsInExists,
  TEST_DATA__lambda_filterWithTwoExistsInSingleGroupCondition,
} from './TEST_DATA__QueryBuilder_TestFilterQueriesWithExists.js';
import {
  TEST_DATA__lambda_input_graphFetchWithFullPathFunctions,
  TEST_DATA__lambda_output_graphFetchWithFullPathFunctions,
  TEST_DATA__lambda_input_filterWithFullPathFunctions,
  TEST_DATA__lambda_output_filterWithFullPathFunctions,
  TEST_DATA__lambda_input_projectionWithFullPathFunctions,
  TEST_DATA__lambda_output_projectionWithFullPathFunctions,
} from './TEST_DATA__QueryBuilder_TestQueriesWithFullPathFunctions.js';
import type { Entity } from '@finos/legend-storage';
import { Core_GraphManagerPreset, RawLambda } from '@finos/legend-graph';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph/test';
import { ApplicationStore } from '@finos/legend-application';
import { integrationTest } from '@finos/legend-shared/test';
import { QueryBuilder_GraphManagerPreset } from '../../graph-manager/QueryBuilder_GraphManagerPreset.js';
import {
  TEST_DATA__lambda_simpleConditionPostFilter,
  TEST_DATA__lambda_aggregationPostFilter,
  TEST_DATA__lambda_derivationPostFilter,
  TEST_DATA_lambda__dateTimeCapabilityPostFilterWithToday,
  TEST_DATA__lambda_postFilterWithRightValAsColEnums,
  TEST_DATA_lambda__postFilterOnAggregatedColWithDerivation,
  TEST_DATA__lambda_postFilterWithRightValAsWindowFunctionCol,
} from './TEST_DATA__QueryBuilder_Roundtrip_TestPostFilterQueries.js';
import { INTERNAL__BasicQueryBuilderState } from '../QueryBuilderState.js';
import {
  TEST_DATA__OlapGroupBy_entities,
  TEST_DATA__lambda_olapGroupBy_MultiStackedGroupBy,
  TEST_DATA__lambda_olapGroupBy_SimpleStringRankFunc,
  TEST_DATA__lambda_olapGroupBy_StackedGroupBy,
  TEST_DATA__lambda_olapGroupBy_SimpleStringRankWithPostFilter,
  TEST_DATA__lambda_olapGroupBy_RankWithPostFilterOnOlapColumn,
  TEST_DATA__lambda_olapGroupBy_StringRankNoSortBy,
  TEST_DATA__lambda_olapGroupBy_SimpleOlapAggregationFunc,
  TEST_DATA__lambda_olapGroupBy_Aggreation_Sum_SortBy,
  TEST_DATA__lambda_olapGroupBy_Stacked_Aggregation,
  TEST_DATA__lambda_olapGroupBy_Stacked_Aggregation_Rank,
  TEST_DATA__lambda_olapGroupBy_Stacked_Aggregation_Rank_VarName,
  TEST_DATA__lambda_olapGroupBy_withSort,
  TEST_DATA__lambda_olapGroupBy_withTake,
  TEST_DATA__lambda_olapGroupBy_withDistinct,
  TEST_DATA__lambda_groupBy_postFilter_OlapGroupBy,
  TEST_DATA__lambda_olapGroupBy_withSortOnOlapColumn,
} from './TEST_DATA__QueryBuilder__OLAPGroupBy.js';
import {
  TEST_DATA__graphFetchWithSerializationConfig,
  TEST_DATA__graphFetchWithSerializationConfigWithNullableConfigProperties,
} from './TEST_DATA__QueryBuilder_GraphFetch.js';
import {
  TEST_DATA_lambda_watermark_Constant,
  TEST_DATA_lambda_watermark_filter_Constant,
  TEST_DATA_lambda_watermark_olapGroupBy,
  TEST_DATA_lambda_watermark_Parameter,
} from './TEST_DATA__QueryBuilder_Roundtrip_Watermark.js';
import {
  TEST_DATA__lambda_ContantExpression_MultiConstantAndCalculatedVariables,
  TEST_DATA__lambda_ContantExpression_Simple,
  TEST_DATA__lambda_ContantExpression_SimpleUsedAsVariable,
} from './TEST_DATA__QueryBuilder_ConstantExpression.js';
import {
  TEST_DATA__lambda_Externalize_externalize_graphFetch,
  TEST_DATA__lambda_Externalize_externalize_graphFetch_with_different_trees,
  TEST_DATA__lambda_Externalize_externalize_graphFetchChecked,
} from './TEST_DATA__QueryBuilder_Externalize.js';
import {
  TEST__LegendApplicationPluginManager,
  TEST__getGenericApplicationConfig,
} from '../__test-utils__/QueryBuilderStateTestUtils.js';
import TEST_DATA_SimpleCalendarModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_Calendar.json' with { type: 'json' };
import {
  TEST_DATA__simpleDerivationWithCalendarAggregation,
  TEST_DATA__simpleProjectionWithCalendarAggregation,
} from './TEST_DATA__QueryBuilder_Calendar.js';
import { DEFAULT_LIMIT } from '../QueryBuilderResultState.js';
import TEST_DATA__QueryBuilder_Model_SimpleRelational from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelational.json' with { type: 'json' };
import TEST_MilestoningModel from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_Milestoning.json' with { type: 'json' };
import {
  TEST_DATA__simpleGetAllVersionsInRangeWithBusinessTemporalClass,
  TEST_DATA__simpleGetAllVersionsInRangeWithProcessingTemporalClass,
  TEST_DATA__simpleGetAllVersionsWithBiTemporalClass,
  TEST_DATA__simpleGetAllVersionsWithBusinessTemporalClass,
  TEST_DATA__simpleGetAllVersionsWithProcessingTemporalClass,
  TEST_DATA__simpleProjectionWithBusinessMilestonedColumn,
} from './TEST_DATA__QueryBuilder_Milestoning.js';
import TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates.json' with { type: 'json' };
import { QueryBuilderAdvancedWorkflowState } from '../query-workflow/QueryBuilderWorkFlowState.js';

type RoundtripTestCase = [
  string,
  {
    entities: Entity[];
  },
  { parameters?: object; body?: object },
  { parameters?: object; body?: object } | undefined,
];

const projectionCtx = {
  entities: TEST_DATA__ComplexRelationalModel,
};

const graphFetchCtx = {
  entities: TEST_DATA__ComplexM2MModel,
};

const graphFetchWithSubtypeCtx = {
  entities: TEST_DATA__M2MWithInheritance,
};

const relationalFilterCtx = {
  entities: TEST_DATA__COVIDDataSimpleModel,
};

const m2mFilterCtx = {
  entities: TEST_DATA__SimpleM2MModel,
};

const postFilterCtx = {
  entities: TEST_DATA__PostFilterModel,
};

const forWatermarkCtx = {
  entities: TEST_DATA__ComplexRelationalModel,
};

const olapGroupbyCtx = {
  entities: TEST_DATA__OlapGroupBy_entities,
};

const bindingM2MCtx = {
  entities: TEST_DATA__BindingM2MModel,
};

const identitfyM2MCtx = {
  entities: TEST_DATA__QueryBuilder_Model_SimpleIdentityM2M,
};

const calendarAggregationCtx = {
  entities: TEST_DATA_SimpleCalendarModel,
};

const existsCtx = {
  entities: TEST_DATA__QueryBuilder_Model_SimpleRelational,
};

const milestoningCtx = {
  entities: TEST_MilestoningModel,
};

const filtersCtx = {
  entities: TEST_DATA__QueryBuilder_Model_SimpleRelationalWithDates,
};

const cases: RoundtripTestCase[] = [
  // projection
  ['Simple projection', projectionCtx, TEST_DATA__simpleProjection, undefined],

  [
    'Simple typed projection (relation)',
    projectionCtx,
    TEST_DATA_simpleTypedRelationProjection,
    undefined,
  ],

  [
    'Simple projection with subType',
    projectionCtx,
    TEST_DATA__simpleProjectionWithSubtype,
    undefined,
  ],
  [
    'Simple TDS function with from() function',
    projectionCtx,
    TEST_DATA__simpleFromFunction,
    undefined,
  ],
  [
    'Complex filter',
    projectionCtx,
    TEST_DATA__fullComplexProjectionQuery,
    undefined,
  ],
  [
    'Projection with property chain',
    projectionCtx,
    TEST_DATA__projectionWithChainedProperty,
    undefined,
  ],
  [
    'Projection with result set modifiers',
    projectionCtx,
    TEST_DATA__projectionWithResultSetModifiers,
    undefined,
  ],
  [
    'Projection with derived property',
    projectionCtx,
    TEST_DATA__projectWithDerivedProperty,
    undefined,
  ],
  [
    '(auto-fix) Projection with full-path functions',
    projectionCtx,
    TEST_DATA__lambda_output_projectionWithFullPathFunctions,
    TEST_DATA__lambda_input_projectionWithFullPathFunctions,
  ],
  // aggregation
  [
    'Projection column with precentile aggregation',
    projectionCtx,
    TEST_DATA__projectionWithPercentileAggregation,
    undefined,
  ],
  [
    'Projection column with wavg aggregation',
    projectionCtx,
    TEST_DATA__projectionWithWAVGAggregation,
    undefined,
  ],
  // graph fetch
  ['Simple graph fetch', graphFetchCtx, TEST_DATA__simpleGraphFetch, undefined],
  [
    'Complex graph fetch',
    graphFetchCtx,
    TEST_DATA__complexGraphFetch,
    undefined,
  ],
  [
    '(auto-fix) Graph-fetch with full-path functions',
    graphFetchCtx,
    TEST_DATA__lambda_output_graphFetchWithFullPathFunctions,
    TEST_DATA__lambda_input_graphFetchWithFullPathFunctions,
  ],
  [
    'Graph-fetch with derived property',
    graphFetchCtx,
    TEST_DATA__graphFetchWithDerivedProperty,
    undefined,
  ],
  [
    'Graph-fetch with derived property with parameters',
    graphFetchCtx,
    TEST_DATA__graphFetchWithDerivedPropertyAndParameter,
    undefined,
  ],
  [
    'Graph-fetch with subtype',
    graphFetchWithSubtypeCtx,
    TEST_DATA__graphFetchWithSubtype,
    undefined,
  ],
  [
    'Graph Fetch with serialization config',
    identitfyM2MCtx,
    TEST_DATA__graphFetchWithSerializationConfig,
    undefined,
  ],
  [
    'Graph Fetch with serialization config with config properties not set',
    identitfyM2MCtx,
    TEST_DATA__graphFetchWithSerializationConfigWithNullableConfigProperties,
    undefined,
  ],
  // filter
  [
    'Simple filter',
    relationalFilterCtx,
    TEST_DATA__lambda_simpleSingleConditionFilter,
    undefined,
  ],
  [
    'Filter with a single condition',
    projectionCtx,
    TEST_DATA__getAllWithOneConditionFilter,
    undefined,
  ],
  [
    'Filter with subtype without exists',
    projectionCtx,
    TEST_DATA__filterQueryWithSubtypeWithoutExists,
    undefined,
  ],
  [
    'Filter with subtype with exists',
    projectionCtx,
    TEST_DATA__filterQueryWithSubtypeWithExists,
    undefined,
  ],
  [
    'Filter with subtype with exists() chain',
    projectionCtx,
    TEST_DATA__filterQueryWithSubtypeWithExistsChain,
    undefined,
  ],
  [
    'Simple filter with parameter',
    relationalFilterCtx,
    TEST_DATA__lambda_simpleSingleConditionFilterWithParameter,
    undefined,
  ],
  [
    'Filter with ProperyExpressionState as right condition',
    relationalFilterCtx,
    TEST_DATA__lambda_filterWithRightSidePropertyExpression,
    undefined,
  ],
  // group condition
  [
    'Filter with group condition',
    relationalFilterCtx,
    TEST_DATA__lambda_groupConditionFilter,
    undefined,
  ],
  [
    'Filter with group condition with multiple clauses',
    relationalFilterCtx,
    TEST_DATA__lambda_groupConditionFilter_withMultipleClauseGroup,
    undefined,
  ],
  [
    'Filter with complex group conditions',
    projectionCtx,
    TEST_DATA__getAllWithGroupedFilter,
    undefined,
  ],
  // operator
  [
    'Filter with set operator',
    relationalFilterCtx,
    TEST_DATA__lambda_setOperatorFilter,
    undefined,
  ],
  // watermark
  [
    'Watermark with constant value',
    forWatermarkCtx,
    TEST_DATA_lambda_watermark_Constant,
    undefined,
  ],
  [
    'Watermark with parameter value',
    forWatermarkCtx,
    TEST_DATA_lambda_watermark_Parameter,
    undefined,
  ],
  [
    'Watermark with filter()',
    forWatermarkCtx,
    TEST_DATA_lambda_watermark_filter_Constant,
    undefined,
  ],
  [
    'Watermark with project() and olapGroupBy()',
    forWatermarkCtx,
    TEST_DATA_lambda_watermark_olapGroupBy,
    undefined,
  ],
  // filter
  [
    'Filter with not() operator',
    relationalFilterCtx,
    TEST_DATA__lambda_notOperatorFilter,
    undefined,
  ],
  [
    'Filter with enumeration',
    m2mFilterCtx,
    TEST_DATA__lambda_enumerationOperatorFilter,
    undefined,
  ],
  // exists()
  [
    'Filter with exists() chain',
    m2mFilterCtx,
    TEST_DATA__lambda_existsChainFilter,
    undefined,
  ],
  [
    'Filter with exists() chain with custom lambda variable name',
    m2mFilterCtx,
    TEST_DATA__lambda_existsChainFilterWithCustomVariableName,
    undefined,
  ],
  [
    '(auto-fix) Filter with outdated exists()',
    m2mFilterCtx,
    lambda_output_filterWithExists,
    TEST_DATA__lambda_input_filterWithExists,
  ],
  [
    '(auto-fix) Filter with full-path functions',
    m2mFilterCtx,
    TEST_DATA__lambda_output_filterWithFullPathFunctions,
    TEST_DATA__lambda_input_filterWithFullPathFunctions,
  ],
  // post-filter
  [
    'Post-filter on primitives',
    postFilterCtx,
    TEST_DATA__lambda_simpleConditionPostFilter,
    undefined,
  ],
  [
    'Post-filter on aggregation column',
    postFilterCtx,
    TEST_DATA__lambda_aggregationPostFilter,
    undefined,
  ],
  [
    'Post-filter on derivation column',
    postFilterCtx,
    TEST_DATA__lambda_derivationPostFilter,
    undefined,
  ],
  [
    'Post-filter with result set modifier',
    postFilterCtx,
    TEST_DATA__lambda_derivationPostFilter,
    undefined,
  ],
  [
    'Post-filter with on aggregation column with derivation col',
    postFilterCtx,
    TEST_DATA_lambda__postFilterOnAggregatedColWithDerivation,
    undefined,
  ],
  [
    'Post-filter with right condition as tds col',
    filtersCtx,
    TEST_DATA__lambda_postFilterQueryWithRightValAsCol,
    undefined,
  ],
  [
    'Post-filter with left and right val as tds cols with enums',
    postFilterCtx,
    TEST_DATA__lambda_postFilterWithRightValAsColEnums,
    undefined,
  ],
  [
    'Post-filter with right condition as window function col',
    postFilterCtx,
    TEST_DATA__lambda_postFilterWithRightValAsWindowFunctionCol,
    undefined,
  ],
  // date compabilty, today(), yesterday() etc
  [
    'Filter with yesterday()',
    postFilterCtx,
    TEST_DATA_lambda_dateTimeCapabilityFilterWithYesterday,
    undefined,
  ],
  [
    'Post-filter with today()',
    postFilterCtx,
    TEST_DATA_lambda__dateTimeCapabilityPostFilterWithToday,
    undefined,
  ],
  // OLAP
  [
    'OlapGroupBy with simple string with rank() operation',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_SimpleStringRankFunc('rank'),
    undefined,
  ],
  [
    'OlapGroupBy with simple string with denseRank() operation',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_SimpleStringRankFunc('denseRank'),
    undefined,
  ],
  [
    'OlapGroupBy with simple string with rowNumber() operation',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_SimpleStringRankFunc('rowNumber'),
    undefined,
  ],
  [
    'OlapGroupBy with simple string with averageRank() operation',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_SimpleStringRankFunc('averageRank'),
    undefined,
  ],
  [
    'OlapGroupBy with simple string with rank and no sortBy',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_StringRankNoSortBy,
    undefined,
  ],
  [
    'OlapGroupBy with stacked olapGroupBy function',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_StackedGroupBy,
    undefined,
  ],
  [
    'OlapGroupBy with multi stacked olapGroupBy function',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_MultiStackedGroupBy,
    undefined,
  ],
  [
    'OlapGroupBy with rank operation and post filter()',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_SimpleStringRankWithPostFilter,
    undefined,
  ],
  [
    'OlapGroupBy with rank operation and post filter() on olapGroup column',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_RankWithPostFilterOnOlapColumn,
    undefined,
  ],
  [
    'OlapGroupBy with sum agg operation',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_SimpleOlapAggregationFunc('sum'),
    undefined,
  ],
  [
    'OlapGroupBy with count agg operation',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_SimpleOlapAggregationFunc('count'),
    undefined,
  ],
  [
    'OlapGroupBy with max agg operation',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_SimpleOlapAggregationFunc('max'),
    undefined,
  ],
  [
    'OlapGroupBy with min agg operation',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_SimpleOlapAggregationFunc('min'),
    undefined,
  ],
  [
    'OlapGroupBy with average agg operation',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_SimpleOlapAggregationFunc('average'),
    undefined,
  ],
  [
    'OlapGroupBy with agg operation and sortBy()',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_Aggreation_Sum_SortBy,
    undefined,
  ],
  [
    'OlapGroupBy with stacked aggregtions',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_Stacked_Aggregation,
    undefined,
  ],
  [
    'OlapGroupBy with stacked aggregation and rank operation',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_Stacked_Aggregation_Rank,
    undefined,
  ],
  [
    'OlapGroupBy with stacked aggregation and rank operation and different var name',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_Stacked_Aggregation_Rank_VarName,
    undefined,
  ],
  [
    'OlapGroupBy with TDS take',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_withTake,
    undefined,
  ],
  [
    'OlapGroupBy with TDS distinct',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_withDistinct,
    undefined,
  ],
  [
    'OlapGroupBy with TDS sort',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_withSort,
    undefined,
  ],
  [
    'OlapGroupBy with TDS sort applied on OLAP column',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_withSortOnOlapColumn,
    undefined,
  ],
  [
    'OlapGroupBy with TDS groupBy -> post-filter -> olap groupBy',
    postFilterCtx,
    TEST_DATA__lambda_groupBy_postFilter_OlapGroupBy,
    undefined,
  ],
  [
    'Constant expression with simple string instance',
    olapGroupbyCtx,
    TEST_DATA__lambda_ContantExpression_Simple,
    undefined,
  ],
  [
    'Constant expression with simple integer instance used as variable',
    olapGroupbyCtx,
    TEST_DATA__lambda_ContantExpression_SimpleUsedAsVariable,
    undefined,
  ],
  [
    'Constant expression with multi string instance + calculated constants',
    olapGroupbyCtx,
    TEST_DATA__lambda_ContantExpression_MultiConstantAndCalculatedVariables,
    undefined,
  ],
  // externalize
  [
    'Simple externalize() on graphfetch()',
    bindingM2MCtx,
    TEST_DATA__lambda_Externalize_externalize_graphFetch,
    undefined,
  ],
  [
    'Simple externalize() on graphfetch() with different trees',
    bindingM2MCtx,
    TEST_DATA__lambda_Externalize_externalize_graphFetch_with_different_trees,
    undefined,
  ],
  [
    'Simple externalize() on graphfetchChecked()',
    bindingM2MCtx,
    TEST_DATA__lambda_Externalize_externalize_graphFetchChecked,
    undefined,
  ],
  [
    'Simple relational projection column with calendar aggregation',
    calendarAggregationCtx,
    TEST_DATA__simpleProjectionWithCalendarAggregation,
    undefined,
  ],
  [
    'Simple relational derivation column with calendar aggregation',
    calendarAggregationCtx,
    TEST_DATA__simpleDerivationWithCalendarAggregation,
    undefined,
  ],
  [
    'Simple filter with single exists()',
    existsCtx,
    TEST_DATA__lambda_filterWithSingleExists,
    undefined,
  ],
  [
    'Simple filter with nested exists()',
    existsCtx,
    TEST_DATA__lambda_filterWithNestedExists,
    undefined,
  ],
  [
    'Simple filter with multiple group conditions in exists()',
    existsCtx,
    TEST_DATA__lambda_filterWithMultipleGroupConditionsInExists,
    undefined,
  ],
  [
    'Simple filter with two exists() in single group condition',
    existsCtx,
    TEST_DATA__lambda_filterWithTwoExistsInSingleGroupCondition,
    undefined,
  ],
  [
    'Simple filter with in operator for date primitive type',
    calendarAggregationCtx,
    TEST_DATA__lambda_isOperatorFilterForDate,
    undefined,
  ],
  [
    'Simple milestoned projection query with milestoning parameters as constants',
    milestoningCtx,
    TEST_DATA__simpleProjectionWithBusinessMilestonedColumn,
    undefined,
  ],
  [
    'Simple getAllVersions() with processing temporal class',
    milestoningCtx,
    TEST_DATA__simpleGetAllVersionsWithProcessingTemporalClass,
    undefined,
  ],

  [
    'Simple getAllVersions() with bi temporal class',
    milestoningCtx,
    TEST_DATA__simpleGetAllVersionsWithBiTemporalClass,
    undefined,
  ],
  [
    'Simple getAllVersions() with business temporal class',
    milestoningCtx,
    TEST_DATA__simpleGetAllVersionsWithBusinessTemporalClass,
    undefined,
  ],
  [
    'Simple getAllVersionsInRange() with processing temporal class',
    milestoningCtx,
    TEST_DATA__simpleGetAllVersionsInRangeWithProcessingTemporalClass,
    undefined,
  ],
  [
    'Simple getAllVersionsInRange() with business temporal class',
    milestoningCtx,
    TEST_DATA__simpleGetAllVersionsInRangeWithBusinessTemporalClass,
    undefined,
  ],
  // slice()
  [
    'Simple projection with slice',
    projectionCtx,
    TEST_DATA__simpleProjectionWithSlice,
    undefined,
  ],
];

describe(
  integrationTest('Query builder lambda processing roundtrip test'),
  () => {
    test.each(cases)(
      '%s',
      async (
        testName: RoundtripTestCase[0],
        context: RoundtripTestCase[1],
        lambda: RoundtripTestCase[2],
        inputLambda: RoundtripTestCase[3],
      ) => {
        const { entities } = context;
        const pluginManager = TEST__LegendApplicationPluginManager.create();
        pluginManager
          .usePresets([
            new Core_GraphManagerPreset(),
            new QueryBuilder_GraphManagerPreset(),
          ])
          .install();
        const applicationStore = new ApplicationStore(
          TEST__getGenericApplicationConfig(),
          pluginManager,
        );
        const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
        await TEST__buildGraphWithEntities(graphManagerState, entities);
        const queryBuilderState = new INTERNAL__BasicQueryBuilderState(
          applicationStore,
          graphManagerState,
          QueryBuilderAdvancedWorkflowState.INSTANCE,
          undefined,
        );
        // do the check using input and output lambda
        const rawLambda = inputLambda ?? lambda;
        queryBuilderState.initializeWithQuery(
          new RawLambda(rawLambda.parameters, rawLambda.body),
        );
        expect(queryBuilderState.isQuerySupported).toBe(true);
        const jsonQuery =
          graphManagerState.graphManager.serializeRawValueSpecification(
            queryBuilderState.buildQuery(),
          );
        expect(lambda).toEqual(jsonQuery);
      },
    );
  },
);

test(
  integrationTest(
    'Query builder lambda processing roundtrip test with exporting result',
  ),
  async () => {
    const context = projectionCtx;
    const { entities } = context;
    const pluginManager = TEST__LegendApplicationPluginManager.create();
    pluginManager
      .usePresets([
        new Core_GraphManagerPreset(),
        new QueryBuilder_GraphManagerPreset(),
      ])
      .install();
    const applicationStore = new ApplicationStore(
      TEST__getGenericApplicationConfig(),
      pluginManager,
    );

    const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
    await TEST__buildGraphWithEntities(graphManagerState, entities);
    const queryBuilderState = new INTERNAL__BasicQueryBuilderState(
      applicationStore,
      graphManagerState,
      QueryBuilderAdvancedWorkflowState.INSTANCE,
      undefined,
    );
    queryBuilderState.resultState.setPreviewLimit(DEFAULT_LIMIT);
    const rawLambda = TEST_DATA__simpleProjectionWithOutPreviewLimit;

    // do the check using input and output lambda
    queryBuilderState.initializeWithQuery(
      new RawLambda(rawLambda.parameters, rawLambda.body),
    );

    expect(queryBuilderState.isQuerySupported).toBe(true);
    const exportedQuery = queryBuilderState.resultState.buildExecutionRawLambda(
      {
        isExportingResult: true,
      },
    );
    const unexportedQuery =
      queryBuilderState.resultState.buildExecutionRawLambda({
        isExportingResult: false,
      });
    const queryTwo = queryBuilderState.buildQuery();
    expect(exportedQuery).toEqual(queryTwo);
    expect(TEST_DATA__simpleProjectionWithOutPreviewLimit).toEqual(
      exportedQuery,
    );
    expect(TEST_DATA__simpleProjectionWithPreviewLimit).toEqual(
      unexportedQuery,
    );
  },
);
