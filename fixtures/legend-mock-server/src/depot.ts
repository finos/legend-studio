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

import { fastify, type RequestGenericInterface } from 'fastify';
import { fastifyCors } from '@fastify/cors';
import {
  DATA_SPACE_ANALYTICS_FILE_CONTENT,
  DATA_SPACE_STORED_ENTITIES,
  ENTITIES,
  PMCD,
  PROJECT_DATA,
} from './depot-data.js';
import {
  CUBE_PROJECT_CONFIGURATIONS,
  findCubeProject,
  findCubeProjectVersion,
  getCubeProjectDependencies,
  getCubeProjectModel,
  getCubeProjectVersions,
} from './cube-depot.js';

const PORT = 6200;
const API_BASE_URL = '/depot/api';

const server = fastify({
  logger: true,
});

server.register(fastifyCors, {
  methods: ['OPTIONS'],
  origin: [/localhost/],
  credentials: true,
});

server.get(`${API_BASE_URL}/info`, async (request, reply) => {
  await reply.send({ status: 'ok' });
});

// every project: the test project and Legend Cube's samples
server.get(`${API_BASE_URL}/project-configurations`, async (request, reply) => {
  await reply.send([PROJECT_DATA, ...CUBE_PROJECT_CONFIGURATIONS]);
});

server.get<
  RequestGenericInterface & {
    Params: {
      groupId: string;
      artifactId: string;
    };
  }
>(
  `${API_BASE_URL}/project-configurations/:groupId/:artifactId`,
  async (request, reply) => {
    const { groupId, artifactId } = request.params;
    const cubeProject = findCubeProject(groupId, artifactId);
    await reply.send(
      cubeProject
        ? CUBE_PROJECT_CONFIGURATIONS.find(
            (project) => project.projectId === cubeProject.projectId,
          )
        : PROJECT_DATA,
    );
  },
);

// a project's versions: Legend Cube's samples only
server.get<
  RequestGenericInterface & {
    Params: {
      groupId: string;
      artifactId: string;
    };
    Querystring: { snapshots?: string };
  }
>(
  `${API_BASE_URL}/projects/:groupId/:artifactId/versions`,
  async (request, reply) => {
    const { groupId, artifactId } = request.params;
    const cubeProject = findCubeProject(groupId, artifactId);
    if (!cubeProject) {
      await reply.code(404).send({ message: 'No such project' });
      return;
    }
    await reply.send(
      getCubeProjectVersions(cubeProject, request.query.snapshots === 'true'),
    );
  },
);

server.get<
  RequestGenericInterface & {
    Params: {
      groupId: string;
      artifactId: string;
    };
  }
>(
  `${API_BASE_URL}/versions/:groupId/:artifactId/latest`,
  async (request, reply) => {
    const { groupId, artifactId } = request.params;
    const cubeProject = findCubeProject(groupId, artifactId);
    const latest = cubeProject && findCubeProjectVersion(cubeProject, 'latest');
    await reply.send(
      cubeProject && latest
        ? { groupId, artifactId, versionId: latest.versionId }
        : PROJECT_DATA,
    );
  },
);

server.get<
  RequestGenericInterface & {
    Params: {
      groupId: string;
      artifactId: string;
      versionId: string;
    };
  }
>(
  `${API_BASE_URL}/projects/:groupId/:artifactId/versions/:versionId/dependencies`,
  async (request, reply) => {
    const { groupId, artifactId, versionId } = request.params;
    const cubeProject = findCubeProject(groupId, artifactId);
    const version =
      cubeProject && findCubeProjectVersion(cubeProject, versionId);
    await reply.send(version ? getCubeProjectDependencies(version) : []);
  },
);

server.get<
  RequestGenericInterface & {
    Params: {
      groupId: string;
      artifactId: string;
      versionId: string;
    };
  }
>(
  `${API_BASE_URL}/projects/:groupId/:artifactId/versions/:versionId`,
  async (request, reply) => {
    const { groupId, artifactId, versionId } = request.params;
    const cubeProject = findCubeProject(groupId, artifactId);
    if (!cubeProject) {
      await reply.send(ENTITIES);
      return;
    }
    const version = findCubeProjectVersion(cubeProject, versionId);
    if (!version) {
      await reply.code(404).send({ message: 'No such version' });
      return;
    }
    await reply.send(version.entities);
  },
);

server.get<
  RequestGenericInterface & {
    Params: {
      groupId: string;
      artifactId: string;
      versionId: string;
    };
    Querystring: { getDependencies?: string };
  }
>(
  `${API_BASE_URL}/projects/:groupId/:artifactId/versions/:versionId/pureModelContextData`,
  async (request, reply) => {
    const { groupId, artifactId, versionId } = request.params;
    const cubeProject = findCubeProject(groupId, artifactId);
    if (!cubeProject) {
      await reply.send(PMCD);
      return;
    }
    const version = findCubeProjectVersion(cubeProject, versionId);
    if (!version) {
      await reply.code(404).send({ message: 'No such version' });
      return;
    }
    // with its dependencies unless asked not to, as the engine's fetch expects
    await reply.send(
      getCubeProjectModel(
        cubeProject,
        version,
        request.query.getDependencies !== 'false',
      ),
    );
  },
);

server.get<
  RequestGenericInterface & {
    Params: {
      classifier: string;
    };
  }
>(
  `${API_BASE_URL}/classifiers/:classifier/entities`,
  async (request, reply) => {
    await reply.send(DATA_SPACE_STORED_ENTITIES);
  },
);

server.get<
  RequestGenericInterface & {
    Params: {
      groupId: string;
      artifactId: string;
      versionId: string;
      filePath: string;
    };
  }
>(
  `${API_BASE_URL}/generationFileContent/:groupId/:artifactId/versions/:versionId/file/:filePath`,
  async (request, reply) => {
    await reply.send(JSON.stringify(DATA_SPACE_ANALYTICS_FILE_CONTENT));
  },
);

server.listen(
  {
    port: PORT,
  },
  (error, address) => {
    if (error) {
      throw error;
    }
  },
);
