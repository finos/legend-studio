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

import {
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
  uuid,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import type { DataSpaceViewerState } from './DataSpaceViewerState.js';
import type {
  DatasetSpecification,
  DatasetEntitlementReport,
} from '@finos/legend-graph';

export class DataSpaceDatasetInfo {
  readonly uuid = uuid();
  readonly specification!: DatasetSpecification;

  entitlementReport?: DatasetEntitlementReport | undefined;

  constructor(specification: DatasetSpecification) {
    makeObservable(this, {
      entitlementReport: observable,
      setEntitlementReport: action,
    });

    this.specification = specification;
  }

  setEntitlementReport(val: DatasetEntitlementReport | undefined): void {
    this.entitlementReport = val;
  }
}

export class DataSpaceViewerDataAccessState {
  readonly dataSpaceViewerState: DataSpaceViewerState;

  readonly fetchDatasetSpecificationsState = ActionState.create();
  readonly fetchDatasetEntitlementReportsState = ActionState.create();

  datasets: DataSpaceDatasetInfo[] = [];

  constructor(dataSpaceViewerState: DataSpaceViewerState) {
    makeObservable(this, {
      datasets: observable,
      fetchDatasetSpecifications: flow,
      fetchDatasetEntitlementReports: flow,
    });

    this.dataSpaceViewerState = dataSpaceViewerState;
  }

  *fetchDatasetSpecifications(): GeneratorFn<void> {
    this.fetchDatasetSpecificationsState.inProgress();

    try {
      const datasets =
        (yield this.dataSpaceViewerState.graphManagerState.graphManager.surveyDatasets(
          this.dataSpaceViewerState.currentExecutionContext.mapping,
          this.dataSpaceViewerState.currentExecutionContext.defaultRuntime,
          undefined,
          this.dataSpaceViewerState.retriveGraphData(),
        )) as DatasetSpecification[];
      this.datasets = datasets.map((dataset) => {
        const existingDataset = this.datasets.find(
          (ds) => ds.specification.hashCode === dataset.hashCode,
        );
        if (existingDataset) {
          return existingDataset;
        }
        return new DataSpaceDatasetInfo(dataset);
      });
    } catch (error) {
      assertErrorThrown(error);
      this.dataSpaceViewerState.applicationStore.notificationService.notifyError(
        error,
      );
    } finally {
      this.fetchDatasetSpecificationsState.complete();
    }
  }

  *fetchDatasetEntitlementReports(): GeneratorFn<void> {
    this.fetchDatasetEntitlementReportsState.inProgress();

    try {
      const reports =
        (yield this.dataSpaceViewerState.graphManagerState.graphManager.checkEntitlements(
          this.dataSpaceViewerState.currentExecutionContext.mapping,
          this.dataSpaceViewerState.currentExecutionContext.defaultRuntime,
          undefined,
          this.dataSpaceViewerState.retriveGraphData(),
        )) as DatasetEntitlementReport[];
      this.datasets.forEach((dataset) => {
        const matchingReport = reports.find(
          (report) =>
            report.dataset.hashCode === dataset.specification.hashCode,
        );
        if (matchingReport) {
          dataset.setEntitlementReport(matchingReport);
          return;
        }
        dataset.setEntitlementReport(undefined);
      });
      const newDatasets: DataSpaceDatasetInfo[] = [];
      reports.forEach((report) => {
        const matchingDataset = this.datasets.find(
          (dataset) =>
            dataset.specification.hashCode === report.dataset.hashCode,
        );
        if (!matchingDataset) {
          const newDataset = new DataSpaceDatasetInfo(report.dataset);
          newDataset.setEntitlementReport(report);
          newDatasets.push(newDataset);
        }
      });
      this.datasets = this.datasets.concat(newDatasets);
    } catch (error) {
      assertErrorThrown(error);
      this.dataSpaceViewerState.applicationStore.notificationService.notifyError(
        error,
      );
    } finally {
      this.fetchDatasetEntitlementReportsState.complete();
    }
  }
}
