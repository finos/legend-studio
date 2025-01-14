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

import type { GenericLegendApplicationStore } from '@finos/legend-application';
import {
  DatasetEntitlementAccessGrantedReport,
  type BasicGraphManagerState,
  type DatasetEntitlementReport,
  type DatasetSpecification,
  DatasetEntitlementAccessApprovedReport,
  DatasetEntitlementAccessRequestedReport,
  DatasetEntitlementAccessNotGrantedReport,
  DatasetEntitlementUnsupportedReport,
  type RawLambda,
  type GraphData,
} from '@finos/legend-graph';
import {
  ActionState,
  assertErrorThrown,
  uuid,
  type GeneratorFn,
  at,
} from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import { QUERY_BUILDER_COLOR_THEME_KEY } from '../../__lib__/QueryBuilderColorTheme.js';

export class DatasetAccessInfo {
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

type EntitlementCheckInfo = {
  total: number;
  data: { label: string; count: number; percentage: number; color: string }[];
};

export class DataAccessState {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly graphManagerState: BasicGraphManagerState;

  readonly initialDatasets?: DatasetSpecification[] | undefined;
  readonly mapping: string;
  readonly runtime: string;
  readonly graphData: GraphData;
  readonly getQuery: () => Promise<RawLambda | undefined>;

  readonly surveyDatasetsState = ActionState.create();
  readonly checkEntitlementsState = ActionState.create();

  datasets: DatasetAccessInfo[] = [];

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: BasicGraphManagerState,
    options: {
      initialDatasets?: DatasetSpecification[] | undefined;
      mapping: string;
      runtime: string;
      graphData: GraphData;
      getQuery: () => Promise<RawLambda | undefined>;
    },
  ) {
    makeObservable(this, {
      datasets: observable,
      entitlementCheckInfo: computed,
      fetchDatasetSpecifications: flow,
      fetchDatasetEntitlementReports: flow,
    });

    this.applicationStore = applicationStore;
    this.graphManagerState = graphManagerState;
    this.initialDatasets = options.initialDatasets;
    this.datasets = (options.initialDatasets ?? []).map(
      (dataset) => new DatasetAccessInfo(dataset),
    );
    this.mapping = options.mapping;
    this.runtime = options.runtime;
    this.graphData = options.graphData;
    this.getQuery = options.getQuery;
  }

  get entitlementCheckInfo(): EntitlementCheckInfo {
    const total = this.datasets.length;
    if (!total) {
      return {
        total,
        data: [
          {
            label: 'Access Granted',
            count: 1,
            percentage: 100,
            color: this.applicationStore.layoutService.getColor(
              QUERY_BUILDER_COLOR_THEME_KEY.DATA_ACCESS_OVERVIEW__CHART__ACCESS_GRANTED,
            ),
          },
        ],
      };
    }

    const info: EntitlementCheckInfo = {
      total,
      data: [],
    };

    const accessGrantedCount = this.datasets.filter(
      (dataset) =>
        dataset.entitlementReport instanceof
        DatasetEntitlementAccessGrantedReport,
    ).length;
    const accessGrantedPercentage = Math.round(
      (accessGrantedCount / total) * 100,
    );
    info.data.push({
      label: 'Access Granted',
      count: accessGrantedCount,
      percentage: accessGrantedPercentage,
      color: this.applicationStore.layoutService.getColor(
        QUERY_BUILDER_COLOR_THEME_KEY.DATA_ACCESS_OVERVIEW__CHART__ACCESS_GRANTED,
      ),
    });

    const accessApprovedCount = this.datasets.filter(
      (dataset) =>
        dataset.entitlementReport instanceof
        DatasetEntitlementAccessApprovedReport,
    ).length;
    const accessApprovedPercentage = Math.round(
      (accessApprovedCount / total) * 100,
    );
    info.data.push({
      label: 'Access Approved',
      count: accessApprovedCount,
      percentage: accessApprovedPercentage,
      color: this.applicationStore.layoutService.getColor(
        QUERY_BUILDER_COLOR_THEME_KEY.DATA_ACCESS_OVERVIEW__CHART__ACCESS_APPROVED,
      ),
    });

    const accessRequestedCount = this.datasets.filter(
      (dataset) =>
        dataset.entitlementReport instanceof
        DatasetEntitlementAccessRequestedReport,
    ).length;
    const accessRequestedPercentage = Math.round(
      (accessRequestedCount / total) * 100,
    );
    info.data.push({
      label: 'Access Requested',
      count: accessRequestedCount,
      percentage: accessRequestedPercentage,
      color: this.applicationStore.layoutService.getColor(
        QUERY_BUILDER_COLOR_THEME_KEY.DATA_ACCESS_OVERVIEW__CHART__ACCESS_REQUESTED,
      ),
    });

    const accessNotGrantedCount = this.datasets.filter(
      (dataset) =>
        dataset.entitlementReport instanceof
        DatasetEntitlementAccessNotGrantedReport,
    ).length;
    const accessNotGrantedPercentage = Math.round(
      (accessNotGrantedCount / total) * 100,
    );
    info.data.push({
      label: 'Access Not Granted',
      count: accessNotGrantedCount,
      percentage: accessNotGrantedPercentage,
      color: this.applicationStore.layoutService.getColor(
        QUERY_BUILDER_COLOR_THEME_KEY.DATA_ACCESS_OVERVIEW__CHART__ACCESS_NOT_GRANTED,
      ),
    });

    const unsupportedCount = this.datasets.filter(
      (dataset) =>
        dataset.entitlementReport instanceof
        DatasetEntitlementUnsupportedReport,
    ).length;
    const unsupportedPercentage = Math.round((unsupportedCount / total) * 100);
    info.data.push({
      label: 'Unsupported',
      count: unsupportedCount,
      percentage: unsupportedPercentage,
      color: this.applicationStore.layoutService.getColor(
        QUERY_BUILDER_COLOR_THEME_KEY.DATA_ACCESS_OVERVIEW__CHART__UNSUPPORTED_ACCESS,
      ),
    });

    const unknownCount =
      total -
      accessGrantedCount -
      accessApprovedCount -
      accessRequestedCount -
      accessNotGrantedCount -
      unsupportedCount;
    const unknownPercentage = Math.round((unknownCount / total) * 100);
    info.data.push({
      label: 'Unknown',
      count: unknownCount,
      percentage: unknownPercentage,
      color: this.applicationStore.layoutService.getColor(
        QUERY_BUILDER_COLOR_THEME_KEY.DATA_ACCESS_OVERVIEW__CHART__UNSUPPORTED_ACCESS,
      ),
    });

    let currentPercentageSum = 0;
    for (let i = 0; i < info.data.length; ++i) {
      const data = at(info.data, i);
      if (currentPercentageSum + data.percentage >= 100) {
        data.percentage = 100 - currentPercentageSum;
        info.data = info.data.slice(0, i + 1);
        break;
      }
      currentPercentageSum += data.percentage;
    }

    return info;
  }

  *fetchDatasetSpecifications(): GeneratorFn<void> {
    this.surveyDatasetsState.inProgress();

    try {
      const datasets =
        (yield this.graphManagerState.graphManager.surveyDatasets(
          this.mapping,
          this.runtime,
          (yield this.getQuery()) as RawLambda | undefined,
          this.graphData,
        )) as DatasetSpecification[];
      this.datasets = datasets.map((dataset) => {
        const existingDataset = this.datasets.find(
          (ds) => ds.specification.hashCode === dataset.hashCode,
        );
        if (existingDataset) {
          return existingDataset;
        }
        return new DatasetAccessInfo(dataset);
      });
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
    } finally {
      this.surveyDatasetsState.complete();
    }
  }

  *fetchDatasetEntitlementReports(): GeneratorFn<void> {
    this.checkEntitlementsState.inProgress();

    try {
      const reports =
        (yield this.graphManagerState.graphManager.checkDatasetEntitlements(
          this.datasets.map((dataset) => dataset.specification),
          this.mapping,
          this.runtime,
          (yield this.getQuery()) as RawLambda | undefined,
          this.graphData,
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
      const newDatasets: DatasetAccessInfo[] = [];
      reports.forEach((report) => {
        const matchingDataset = this.datasets.find(
          (dataset) =>
            dataset.specification.hashCode === report.dataset.hashCode,
        );
        if (!matchingDataset) {
          const newDataset = new DatasetAccessInfo(report.dataset);
          newDataset.setEntitlementReport(report);
          newDatasets.push(newDataset);
        }
      });
      this.datasets = this.datasets.concat(newDatasets);
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
    } finally {
      this.checkEntitlementsState.complete();
    }
  }

  async intialize(): Promise<void> {
    if (!this.initialDatasets) {
      await flowResult(this.fetchDatasetSpecifications());
      await flowResult(this.fetchDatasetEntitlementReports());
    } else {
      await flowResult(this.fetchDatasetEntitlementReports());
    }
  }

  async refresh(): Promise<void> {
    await flowResult(this.fetchDatasetSpecifications());
    await flowResult(this.fetchDatasetEntitlementReports());
  }
}
