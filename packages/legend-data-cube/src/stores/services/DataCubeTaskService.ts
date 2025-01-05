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
import { action, computed, makeObservable, observable } from 'mobx';

export class Task {
  readonly uuid = uuid();
  readonly name: string;
  readonly startTime = Date.now();
  readonly ownerId?: string | undefined;

  endTime?: number | undefined;

  constructor(name: string, ownerId?: string | undefined) {
    this.name = name;
    this.ownerId = ownerId;
  }

  end() {
    this.endTime = Date.now();
  }
}

export class TaskManager {
  // TODO?: keep a hashmap, in parallel, for faster lookup
  tasks: Task[] = [];

  constructor() {
    makeObservable(this, {
      tasks: observable,
      newTask: action,
      endTask: action,
      endTasks: action,
    });
  }

  newTask(name: string, ownerId?: string | undefined) {
    const task = new Task(name, ownerId);
    this.tasks.push(task);
    return task;
  }

  endTask(task: Task) {
    const match = this.tasks.find((t) => t.uuid === task.uuid);
    if (match) {
      this.tasks = this.tasks.filter((t) => t.uuid !== task.uuid);
      task.end();
    }
    return task;
  }

  endTasks(tasks: Task[]) {
    this.tasks = this.tasks.filter(
      (task) => !tasks.find((t) => t.uuid === task.uuid),
    );
    tasks.forEach((task) => task.end());
  }
}

export class DataCubeTaskService {
  readonly uuid = uuid();
  readonly manager: TaskManager;

  constructor(manager?: TaskManager | undefined) {
    makeObservable(this, {
      tasks: computed,
    });

    this.manager = manager ?? new TaskManager();
  }

  get tasks() {
    return this.manager.tasks.filter((task) => task.ownerId === this.uuid);
  }

  newTask(name: string) {
    return this.manager.newTask(name, this.uuid);
  }

  endTask(task: Task) {
    return this.manager.endTask(task);
  }

  dispose() {
    // remove all tasks owned by this service
    this.manager.endTasks(this.tasks);
  }
}
