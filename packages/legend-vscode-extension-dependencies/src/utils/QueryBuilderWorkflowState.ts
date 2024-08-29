import {
  type QueryBuilderState,
  type FetchStructureLayoutConfig,
  QueryBuilderWorkflowState,
} from '@finos/legend-query-builder';

export class QueryBuilderVSCodeWorkflowState extends QueryBuilderWorkflowState {
  get showStatusBar(): boolean {
    return false;
  }

  override getFetchStructureLayoutConfig(
    state: QueryBuilderState,
  ): FetchStructureLayoutConfig {
    return {
      label: 'fetch structure',
      showInFetchPanel: true,
    };
  }

  static INSTANCE = new QueryBuilderVSCodeWorkflowState();
}
