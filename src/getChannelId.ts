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

import { Context } from "@actions/github/lib/context";

export function getChannelId(configuredChannelId: string, ghContext: Context) {
  let tmpChannelId: string = "";

  if (!!configuredChannelId) {
    tmpChannelId = configuredChannelId;
  } else if (ghContext.payload.pull_request) {
    const branchName = ghContext.payload.pull_request.head.ref.substr(0, 20);
    tmpChannelId = `pr${ghContext.payload.pull_request.number}-${branchName}`;
  }

  // Channel IDs can only include letters, numbers, underscores, hyphens, and periods.
  const invalidCharactersRegex = /[^a-zA-Z0-9_\-\.]/g;
  const correctedChannelId = tmpChannelId.replace(invalidCharactersRegex, "_");

  console.log(`configuredChannelId :"${configuredChannelId}"`);
  console.log(`tmpChannelId :"${tmpChannelId}"`);
  console.log(`correctedChannelId :"${correctedChannelId}"`);
  console.log("ghContext :", ghContext);
  
  if (correctedChannelId !== tmpChannelId) {
    console.log(
      `ChannelId "${tmpChannelId}" contains unsupported characters. Using "${correctedChannelId}" instead.`
    );
  }

  if (correctedChannelId.length == 0) {
    throw Error(
      `ChannelId is empty. No branch was found in the current context. Please provide a channelId for testing.`
    );
  }

  return correctedChannelId;
}
