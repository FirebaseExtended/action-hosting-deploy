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
import { extractChannelIdFromChannelName } from "./getChannelId";

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

export type ChannelTotalSuccessResult = {
  status: "success";
  channels: Channel[];
};

export interface Channel {
  name: string;
  url: string;
  release: {
    name: string;
    version: {
      name: string;
      status: string;
      config: {
        headers: {
          headers: {
            "Cache-Control": string;
          };
          glob: string;
        }[];
        rewrites: {
          glob: string;
          path: string;
        }[];
      };
      labels: {
        "deployment-tool": string;
      };
      createTime: string;
      createUser: {
        email: string;
      };
      finalizeTime: string;
      finalizeUser: {
        email: string;
      };
      fileCount: string;
      versionBytes: string;
    };
    type: string;
    releaseTime: string;
    releaseUser: {
      email: string;
    };
  };
  createTime: string;
  updateTime: string;
  retainedReleaseCount: number;
  expireTime?: string;
  labels?: {
    type: "live";
  };
}

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
  // Optional for preview channels deployment
  totalPreviewChannelLimit?: number;
};

export type ChannelDeployConfig = DeployConfig & {
  expires: string;
  channelId: string;
};

export type ProductionDeployConfig = DeployConfig & {};

const SITE_CHANNEL_QUOTA = 50;
const SITE_CHANNEL_LIVE_SITE = 1;

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
  opts: { debug?: boolean; firebaseToolsVersion?: string }
) {
  let deployOutputBuf: Buffer[] = [];
  const debug = opts.debug || false;
  const firebaseToolsVersion = opts.firebaseToolsVersion || "latest";

  try {
    await exec(
      `npx firebase-tools@${firebaseToolsVersion}`,
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
      });
    } else {
      throw e;
    }
  }

  return deployOutputBuf.length
    ? deployOutputBuf[deployOutputBuf.length - 1].toString("utf-8")
    : ""; // output from the CLI
}

export async function getAllChannels(
  gacFilename: string,
  deployConfig: Omit<ChannelDeployConfig, "expires" | "channelId">
): Promise<Channel[]> {
  const { projectId, target, firebaseToolsVersion } = deployConfig;

  const allChannelsText = await execWithCredentials(
    ["hosting:channel:list", ...(target ? ["--site", target] : [])],
    projectId,
    gacFilename,
    { firebaseToolsVersion }
  );

  const channelResults = JSON.parse(allChannelsText.trim()) as
    | ChannelTotalSuccessResult
    | ErrorResult;

  if (channelResults.status === "error") {
    throw Error((channelResults as ErrorResult).error);
  } else {
    return channelResults.channels || [];
  }
}

function getPreviewChannelToRemove(
  channels: Channel[],
  totalPreviewChannelLimit: DeployConfig["totalPreviewChannelLimit"]
): Channel[] {
  let totalAllowedPreviewChannels = totalPreviewChannelLimit;
  let totalPreviewChannelToSlice = totalPreviewChannelLimit;

  if (totalPreviewChannelLimit >= SITE_CHANNEL_QUOTA - SITE_CHANNEL_LIVE_SITE) {
    /**
     * If the total number of preview channels is greater than or equal to the site channel quota,
     * preview channels is the site channel quota minus the live site channel
     *
     * e.g. 49(total allowed preview channels) = 50(quota) - 1(live site channel)
     */
    totalAllowedPreviewChannels =
      totalPreviewChannelLimit - SITE_CHANNEL_LIVE_SITE;

    /**
     * If the total number of preview channels is greater than or equal to the site channel quota,
     * total preview channels to slice is the site channel quota plus the live site channel plus the current preview deploy
     *
     * e.g. 52(total preview channels to slice) = 50(site channel quota) + 1(live site channel) + 1 (current preview deploy)
     */
    totalPreviewChannelToSlice =
      SITE_CHANNEL_QUOTA + SITE_CHANNEL_LIVE_SITE + 1;
  }

  if (channels.length > totalAllowedPreviewChannels) {
    // If the total number of channels exceeds the limit, remove the preview channels
    // Filter out live channel(hosting default site) and channels without an expireTime(additional sites)
    const previewChannelsOnly = channels.filter(
      (channel) => channel?.labels?.type !== "live" && !!channel?.expireTime
    );

    if (previewChannelsOnly.length) {
      // Sort preview channels by expireTime
      const sortedPreviewChannels = previewChannelsOnly.sort(
        (channelA, channelB) => {
          return (
            new Date(channelA.expireTime).getTime() -
            new Date(channelB.expireTime).getTime()
          );
        }
      );

      // Calculate the number of preview channels to remove
      const sliceEnd =
        totalPreviewChannelToSlice > sortedPreviewChannels.length
          ? totalPreviewChannelToSlice - sortedPreviewChannels.length
          : sortedPreviewChannels.length - totalPreviewChannelToSlice;

      // Remove the oldest preview channels
      return sortedPreviewChannels.slice(0, sliceEnd);
    }
  } else {
    return [];
  }
}

/**
 * Removes preview channels from the list of active channels if the number exceeds the configured limit
 *
 * This function identifies the preview channels that need to be removed based on the total limit of
 * preview channels allowed (`totalPreviewChannelLimit`).
 *
 * It then attempts to remove those channels using the `removeChannel` function.
 * Errors encountered while removing channels are logged but do not stop the execution of removing other channels.
 */
export async function removePreviews({
  channels,
  gacFilename,
  deployConfig,
}: {
  channels: Channel[];
  gacFilename: string;
  deployConfig: Omit<ChannelDeployConfig, "expires" | "channelId">;
}) {
  const toRemove = getPreviewChannelToRemove(
    channels,
    deployConfig.totalPreviewChannelLimit
  );

  if (toRemove.length) {
    await Promise.all(
      toRemove.map(async (channel) => {
        try {
          await removeChannel(
            gacFilename,
            deployConfig,
            extractChannelIdFromChannelName(channel.name)
          );
        } catch (error) {
          console.error(
            `Error removing preview channel ${channel.name}:`,
            error
          );
        }
      })
    );
  }
}

export function removeChannel(
  gacFilename: string,
  deployConfig: Omit<ChannelDeployConfig, "expires" | "channelId">,
  channelId: string
): Promise<string> {
  const { projectId, firebaseToolsVersion } = deployConfig;

  return execWithCredentials(
    ["hosting:channel:delete", channelId, "--force"],
    projectId,
    gacFilename,
    { firebaseToolsVersion }
  );
}

export async function deployPreview(
  gacFilename: string,
  deployConfig: ChannelDeployConfig
) {
  const { projectId, channelId, target, expires, firebaseToolsVersion } =
    deployConfig;

  const deploymentText = await execWithCredentials(
    [
      "hosting:channel:deploy",
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
) {
  const { projectId, target, firebaseToolsVersion } = productionDeployConfig;

  const deploymentText = await execWithCredentials(
    ["deploy", "--only", `hosting${target ? ":" + target : ""}`],
    projectId,
    gacFilename,
    { firebaseToolsVersion }
  );

  const deploymentResult = JSON.parse(deploymentText) as
    | ProductionSuccessResult
    | ErrorResult;

  return deploymentResult;
}
