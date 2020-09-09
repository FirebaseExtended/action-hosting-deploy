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
  target: string | undefined;
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
    hosting: string;
  };
};

export type DeployConfig = {
  projectId: string;
  expires: string;
  channelId: string;
};

async function execWithCredentials(
  firebase,
  args: string[],
  projectId,
  gacFilename,
  debug: boolean = false
) {
  let deployOutputBuf: Buffer[] = [];
  try {
    await exec(
      firebase,
      [
        ...args,
        ...(projectId ? ["--project", projectId] : []),
        debug
          ? "--debug" // gives a more thorough error message
          : "--json", // allows us to easily parse the output
      ],
      {
        listeners: {
          stdout(data: Buffer) {
            deployOutputBuf.push(data);
          },
        },
        env: {
          ...process.env,
          GOOGLE_APPLICATION_CREDENTIALS: gacFilename, // the CLI will automatically authenticate with this env variable set
        },
      }
    );
  } catch (e) {
    console.log(Buffer.concat(deployOutputBuf).toString("utf-8"));
    console.log(e.message);

    if (debug === false) {
      console.log(
        "Retrying deploy with the --debug flag for better error output"
      );
      return execWithCredentials(firebase, args, projectId, gacFilename, true);
    } else {
      throw e;
    }
  }

  return Buffer.concat(deployOutputBuf).toString("utf-8"); // output from the CLI
}

export async function deploy(
  firebase: string,
  gacFilename: string,
  deployConfig: DeployConfig
) {
  const { projectId, expires, channelId } = deployConfig;

  const deploymentText = await execWithCredentials(
    firebase,
    ["hosting:channel:deploy", channelId, "--expires", "7d"],
    projectId,
    gacFilename
  );

  const deploymentResult = JSON.parse(deploymentText) as
    | ChannelSuccessResult
    | ErrorResult;

  return deploymentResult;
}

export async function deployProductionSite(firebase, gacFilename, projectId) {
  const deploymentText = await execWithCredentials(
    firebase,
    ["deploy", "--only", "hosting"],
    projectId,
    gacFilename
  );

  const deploymentResult = JSON.parse(deploymentText) as
    | ProductionSuccessResult
    | ErrorResult;

  return deploymentResult;
}
