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

import type { StopWatch, TimingsRecord } from '@finos/legend-shared';

export class TimeService {
  readonly timestamp = Date.now();
  /**
   * Record the instances where the application usage is interrupted (e.g. when the app window/tab is not in focus),
   * this is useful to know since for certain platform, background contexts are de-prioritized, given less resources,
   * and hence, would run less performantly.
   *
   * See https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API#policies_in_place_to_aid_background_page_performance
   * See https://plumbr.io/blog/performance-blog/background-tabs-in-browser-load-20-times-slower
   *
   * This impacts certain operations such as scheduler and timer in the app, so it's useful to keep track of these here.
   */
  readonly interruptions: number[] = [];

  recordUsageInterruption(): void {
    this.interruptions.push(Date.now());
  }

  finalizeTimingsRecord(
    stopWatch: StopWatch,
    timings?: TimingsRecord | undefined,
  ): TimingsRecord {
    const totalTime = stopWatch.elapsed;
    const startTime = stopWatch.startTime;
    const endTime = startTime + totalTime;

    const record = {
      ...(timings ?? {}),
      ...Object.fromEntries(stopWatch.records),
      total: totalTime,
    };

    // count the number of interruptions
    let numberOfInteruptions = 0;

    for (const interruption of this.interruptions) {
      if (interruption >= startTime && interruption <= endTime) {
        numberOfInteruptions++;
      } else if (interruption > endTime) {
        break;
      }
    }

    return numberOfInteruptions > 0
      ? { ...record, __numberOfInteruptions: numberOfInteruptions }
      : record;
  }
}
