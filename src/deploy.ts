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

import { exec } from "@actions/exec";

export type SiteDeploy = {
  site: string;
  target?: string;
  url: string;
  expireTime: string;
};

export type ErrorResult = {
  status: "error";
  error: string;
};

export type ChannelSuccessResult = {
  status: "success";
  result: { [key: string]: SiteDeploy };
};

export type ProductionSuccessResult = {
  status: "success";
  result: {
    hosting: string | string[];
  };
};

type DeployConfig = {
  projectId: string;
  target?: string;
  // Optional version specification for firebase-tools. Defaults to `latest`.
  firebaseToolsVersion?: string;
};

export type ChannelDeployConfig = DeployConfig & {
  expires: string;
  channelId: string;
};

export type ProductionDeployConfig = DeployConfig & {};

export function interpretChannelDeployResult(
  deployResult: ChannelSuccessResult
): { expireTime: string; expire_time_formatted: string; urls: string[] } {
  const allSiteResults = Object.values(deployResult.result);

  const expireTime = allSiteResults[0].expireTime;
  const expire_time_formatted = new Date(expireTime).toUTCString();
  const urls = allSiteResults.map((siteResult) => siteResult.url);

  return {
    expireTime,
    expire_time_formatted,
    urls,
  };
}

async function execWithCredentials(
  args: string[],
  projectId,
  gacFilename,
  opts: { debug?: boolean; firebaseToolsVersion?: string; useJson?: boolean }
) {
  let deployOutputBuf: Buffer[] = [];
  const debug = opts.debug || false;
  // Production function deploys pass `useJson: false` so callers can trust
  // exit code instead of parsing stdout. firebase-tools v15 `--json` mode has
  // a regression where non-fatal scheduler-verification warnings get coerced
  // into JSON error objects with exit code 2, even though the deploy
  // succeeds. Plain output exits 0 in the same situation.
  const useJson = opts.useJson ?? true;
  const firebaseToolsVersion = opts.firebaseToolsVersion || "latest";

  try {
    await exec(
      `npx firebase-tools@${firebaseToolsVersion}`,
      [
        ...args,
        ...(projectId ? ["--project", projectId] : []),
        ...(debug
          ? ["--debug"] // gives a more thorough error message
          : useJson
          ? ["--json"] // allows us to easily parse the output
          : []),
      ],
      {
        listeners: {
          stdout(data: Buffer) {
            deployOutputBuf.push(data);
          },
        },
        env: {
          ...process.env,
          FIREBASE_DEPLOY_AGENT: "action-hosting-deploy",
          GOOGLE_APPLICATION_CREDENTIALS: gacFilename, // the CLI will automatically authenticate with this env variable set
        },
      }
    );
  } catch (e) {
    console.log(Buffer.concat(deployOutputBuf).toString("utf-8"));
    console.log(e.message);

    if (!debug) {
      console.log(
        "Retrying deploy with the --debug flag for better error output"
      );
      await execWithCredentials(args, projectId, gacFilename, {
        debug: true,
        firebaseToolsVersion,
        useJson,
      });
    } else {
      throw e;
    }
  }

  return deployOutputBuf.length
    ? deployOutputBuf[deployOutputBuf.length - 1].toString("utf-8")
    : ""; // output from the CLI
}

export async function deployPreview(
  gacFilename: string,
  deployConfig: ChannelDeployConfig
) {
  const { projectId, channelId, target, expires, firebaseToolsVersion } =
    deployConfig;

  const deploymentText = await execWithCredentials(
    [
      "functions:channel:deploy",
      channelId,
      ...(target ? ["--only", target] : []),
      ...(expires ? ["--expires", expires] : []),
    ],
    projectId,
    gacFilename,
    { firebaseToolsVersion }
  );

  const deploymentResult = JSON.parse(deploymentText.trim()) as
    | ChannelSuccessResult
    | ErrorResult;

  return deploymentResult;
}

export async function deployProductionSite(
  gacFilename,
  productionDeployConfig: ProductionDeployConfig
): Promise<ProductionSuccessResult | ErrorResult> {
  const { projectId, target, firebaseToolsVersion } = productionDeployConfig;

  // Production function deploys: rely on firebase-tools' exit code rather
  // than parsing `--json` stdout. The success path in the caller doesn't
  // actually read the parsed result — only the `status === "error"` check
  // matters, and a non-zero exit will throw before we get here.
  await execWithCredentials(
    ["deploy", "--only", `functions${target ? ":" + target : ""}`],
    projectId,
    gacFilename,
    { firebaseToolsVersion, useJson: false }
  );

  // If exec didn't throw, the deploy succeeded. Synthesize the
  // ProductionSuccessResult the caller expects. Return type stays as the
  // pre-existing union so the caller's `status === "error"` check still
  // narrows correctly — that branch is now unreachable but keeps the
  // public shape stable for downstream consumers.
  const deploymentResult: ProductionSuccessResult | ErrorResult = {
    status: "success",
    result: { hosting: projectId },
  };

  return deploymentResult;
}
