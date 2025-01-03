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

import { uuid } from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';

export class DataCubeTask {
  readonly uuid = uuid();
  readonly name: string;
  readonly startTime = Date.now();
  endTime?: number | undefined;

  constructor(name: string) {
    this.name = name;
  }

  end() {
    this.endTime = Date.now();
  }
}

export class DataCubeTaskService {
  readonly tasks = new Map<string, DataCubeTask>();

  constructor() {
    makeObservable(this, {
      tasks: observable,
      start: action,
      end: action,
    });
  }

  start(name: string) {
    const task = new DataCubeTask(name);
    this.tasks.set(task.uuid, task);
    return task;
  }

  end(task: DataCubeTask) {
    this.tasks.delete(task.uuid);
    task.end();
    return task;
  }
}
