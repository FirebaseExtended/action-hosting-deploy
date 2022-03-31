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

/**
 * To note, Firebase has a message limit of 255 characters, so any message
 * returned from this function will be capped to the limit.
 */
export function getDeployMessage(
  messageInput: string | undefined,
  ghContext: Context
): string | undefined {
  if (messageInput + "" === "false") return undefined;

  if (messageInput === "") {
    console.log(`The message provided was empty.`);
    return undefined;
  }

  if (messageInput + "" === "true") {
    const commitMessage: string = ghContext.payload?.head_commit?.message;
    if (commitMessage) {
      // Firebase only accepts messages up to 255 characters long
      return commitMessage.trim().slice(0, 255).trim();
    } else {
      console.log(
        `Head commit did not contain any message. Manually provide a message instead.`
      );
      return undefined;
    }
  }

  if (messageInput.length > 255) {
    console.log(
      `Firebase only accepts messages up to 255 characters long. Your provided message will be capped at 255.`
    );
  }

  return messageInput.trim().slice(0, 255).trim();
}
