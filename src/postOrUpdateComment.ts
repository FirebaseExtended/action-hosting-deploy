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

import { endGroup, startGroup } from "@actions/core";
import { GitHub } from "@actions/github";
import { Context } from "@actions/github/lib/context";

// create a PR comment, or update one if it already exists
export async function postOrUpdateComment(
  github: GitHub | undefined,
  context: Context,
  commentMarkdown: string
) {
  if (!github) {
    console.log("GitHub object not available. Skipping PR comment.");
    return;
  }

  const commentInfo = {
    ...context.repo,
    issue_number: context.issue.number,
  };

  const comment = {
    ...commentInfo,
    body: commentMarkdown + "\n\n<sub>firebase-hosting-preview-action</sub>",
  };

  startGroup(`Updating PR comment`);
  let commentId;
  try {
    const comments = (await github.issues.listComments(commentInfo)).data;
    for (let i = comments.length; i--; ) {
      const c = comments[i];
      if (
        c.user.type === "Bot" &&
        /<sub>[\s\n]*firebase-hosting-preview-action/.test(c.body)
      ) {
        commentId = c.id;
        break;
      }
    }
  } catch (e) {
    console.log("Error checking for previous comments: " + e.message);
  }

  if (commentId) {
    try {
      await github.issues.updateComment({
        ...context.repo,
        comment_id: commentId,
        body: comment.body,
      });
    } catch (e) {
      commentId = null;
    }
  }

  if (!commentId) {
    try {
      await github.issues.createComment(comment);
    } catch (e) {
      console.log(`Error creating comment: ${e.message}`);
    }
  }
  endGroup();
}
