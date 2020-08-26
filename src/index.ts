/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  endGroup,
  getInput,
  setFailed,
  setOutput,
  startGroup,
} from "@actions/core";
import { context, GitHub } from "@actions/github";
import { createGacFile } from "./createGACFile";
import { deploy, ErrorResult, deployProductionSite } from "./deploy";
import { getChannelId } from "./getChannelId";
import { installFirebaseCLI } from "./installFirebaseCLI";
import { createCheck } from "./createCheck";
import { postOrUpdateComment } from "./postOrUpdateComment";

// Inputs defined in action.yml
const expires = getInput("expires");
const projectId = getInput("projectId");
const googleApplicationCredentials = getInput("firebaseServiceAccount", {
  required: true,
});
const configuredChannelId = getInput("channelId");
const isProductionDeploy = configuredChannelId === "live";
const token = process.env.GITHUB_TOKEN || getInput("repoToken");
const github = token ? new GitHub(token) : undefined;

async function run() {
  const isPullRequest = !!context.payload.pull_request;

  let finish = (details: Object) => console.log(details);
  if (token && isPullRequest) {
    finish = await createCheck(github as GitHub, context);
  }

  try {
    startGroup("Setting up Firebase");
    const firebase = await installFirebaseCLI();
    endGroup();

    startGroup("Setting up CLI credentials");
    const gacFilename = await createGacFile(googleApplicationCredentials);
    endGroup();

    if (isProductionDeploy) {
      startGroup("Deploying to production site");
      const deployment = await deployProductionSite(
        firebase,
        gacFilename,
        projectId
      );
      if (deployment.status === "error") {
        throw Error((deployment as ErrorResult).error);
      }
      endGroup();

      const url = `https://${projectId}.web.app`;
      await finish({
        details_url: url,
        conclusion: "success",
        output: {
          title: `Production deploy succeeded`,
          summary: `[${projectId}.web.app](${url})`,
        },
      });
      return;
    }

    const channelId = getChannelId(configuredChannelId, context);

    startGroup(`Deploying to Firebase preview channel ${channelId}`);
    const deployment = await deploy(firebase, gacFilename, {
      projectId,
      expires,
      channelId,
    });
    endGroup();

    if (deployment.status === "error") {
      throw Error((deployment as ErrorResult).error);
    }

    const allSiteResults = Object.values(deployment.result);
    const expireTime = allSiteResults[0].expireTime;
    const urls = allSiteResults.map((siteResult) => siteResult.url);

    setOutput("urls", urls);
    setOutput("expire_time", expireTime);
    setOutput("details_url", urls[0]);

    const urlsListMarkdown =
      urls.length === 1
        ? `[${urls[0]}](${urls[0]})`
        : urls.map((url) => `- [${url}](${url})`).join("/n");

    if (token && isPullRequest) {
      await postOrUpdateComment(
        github,
        context,
        `
Deploy preview for ${context.payload.pull_request?.head.sha.substring(0, 7)}:

${urlsListMarkdown}

<sub>(expires ${new Date(expireTime).toUTCString()})</sub>`.trim()
      );
    }

    await finish({
      details_url: urls[0],
      conclusion: "success",
      output: {
        title: `Deploy preview succeeded`,
        summary: urlsListMarkdown,
      },
    });
  } catch (e) {
    setFailed(e.message);

    await finish({
      conclusion: "failure",
      output: {
        title: "Deploy preview failed",
        summary: `Error: ${e.message}`,
      },
    });
  }
}

run();
