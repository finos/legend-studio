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

export enum DSL_DATAPRODUCT_EVENT {
  FETCH_INGEST_ENV_FAILURE = 'dataProduct.access.ingest-env.failure',
  CREATE_CONTRACT = 'dataProduct.access.create_contract',
  CREATE_SUBSCRIPTION = 'dataProduct.access.create_subscription',
  ERROR_EXTRACT_LEGEND_AI_SERVICES = 'dataProduct.error.extract-legend-ai-services',
  // Legend AI assistant usage analytics. The name scheme is shared across data
  // product and data space; the `context` payload field distinguishes them.
  LEGEND_AI_ASSISTANT_OPENED = 'legend-ai.assistant.opened',
  LEGEND_AI_ASSISTANT_CLOSED = 'legend-ai.assistant.closed',
  LEGEND_AI_QUESTION_ASKED = 'legend-ai.question.asked',
  LEGEND_AI_RESPONSE_RECEIVED = 'legend-ai.response.received',
  LEGEND_AI_FEEDBACK_SUBMITTED = 'legend-ai.feedback.submitted',
  LEGEND_AI_SUGGESTED_QUERY_CLICKED = 'legend-ai.suggested-query.clicked',
  LEGEND_AI_SCOPE_CHANGED = 'legend-ai.scope.changed',
  LEGEND_AI_MODEL_CHANGED = 'legend-ai.model.changed',
  LEGEND_AI_SQL_DETAILS_TOGGLED = 'legend-ai.sql-details.toggled',
  LEGEND_AI_ARTIFACT_COPIED = 'legend-ai.artifact.copied',
  LEGEND_AI_PYTHON_CODE_REQUESTED = 'legend-ai.python-code.requested',
  LEGEND_AI_PYTHON_CODE_TOGGLED = 'legend-ai.python-code.toggled',
  LEGEND_AI_OPEN_IN_DATACUBE_CLICKED = 'legend-ai.open-in-datacube.clicked',
  LEGEND_AI_OPEN_IN_DATACUBE_PREFILL_DROPPED = 'legend-ai.open-in-datacube.prefill-dropped',
  ERROR_LOG_OPEN_DATACUBE_FROM_AI_CHAT = 'dataProduct.error.log-open-datacube-from-ai-chat',
}

export enum DSL_DATAPRODUCT_EVENT_STATUS {
  SUCCESS = 'success',
  FAILURE = 'failure',
}
