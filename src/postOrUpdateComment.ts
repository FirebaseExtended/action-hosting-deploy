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
import type { GitHub } from "@actions/github/lib/utils";
import { Context } from "@actions/github/lib/context";
import {
  ChannelSuccessResult,
  interpretChannelDeployResult,
  ErrorResult,
} from "./deploy";
import { createDeploySignature } from "./hash";
import { getInput } from "@actions/core";
import { context, getOctokit } from "@actions/github";

// Get inputs from workflow file
const showDetailedUrls = getInput("showDetailedUrls");
const fileExtension = getInput("fileExtension") || "md, html";
const originalPath = getInput("originalPath") || "src";
const replacedPath = getInput("replacedPath") || "docs";

const BOT_SIGNATURE = "[本工具](https://github.com/cfug/doc-site-preview-in-pr) 修改自 [部署至 🔥 Firebase Hosting](https://github.com/marketplace/actions/deploy-to-firebase-hosting)。";

export async function getChangedFilesByPullRequestNumber(pullRequestNumber: number): Promise<string[]> {
  const token = process.env.GITHUB_TOKEN || getInput("repoToken");
  const octokit = token ? getOctokit(token) : undefined;
  const { data: files } = await octokit.rest.pulls.listFiles({
    ...context.repo,
    pull_number: pullRequestNumber,
  });
  const fileExtensions = fileExtension.split(",").map((ext) => ext.trim());  // 过滤空格
  const prChangedFiles = files
    .filter((file) => {
      const extension = file.filename.split(".").pop();
      return fileExtensions.includes(extension);
    })
    .map((file) => file.filename);

  const replacedPathRegex = new RegExp(`^${originalPath}`);
  const prChangedFilesWithCustomizedPath = prChangedFiles.map((filePath) => {
    return filePath.replace(replacedPathRegex, replacedPath);
  });

  return prChangedFilesWithCustomizedPath;
}

export function createBotCommentIdentifier(signature: string) {
  return function isCommentByBot(comment): boolean {
    return comment.user.type === "Bot" && comment.body.includes(signature);
  };
}

export function getURLsMarkdownFromChannelDeployResult(
  result: ChannelSuccessResult
): string {
  const { urls } = interpretChannelDeployResult(result);

  return urls.length === 1
    ? `[${urls[0]}](${urls[0]})`
    : urls.map((url) => `- [${url}](${url})`).join("\n");
}

export function getURLsFromChannelDeployResult(
  result: ChannelSuccessResult
): string[] {
  const { urls } = interpretChannelDeployResult(result);
  return urls;
}

export function getChannelDeploySuccessComment(
  result: ChannelSuccessResult,
  commit: string,
  changedFiles: string[]
) {
  const deploySignature = createDeploySignature(result);
  const urlList = getURLsFromChannelDeployResult(result);
  const { expireTime } = interpretChannelDeployResult(result);

  const changedFilesWithUrls = changedFiles.map((file) => {
    return `[${urlList}${file}](${urlList}${file})`;
  }).join("\n");

  const expireTimeInChina = new Date(expireTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const formattedExpireTime = `${expireTimeInChina} (北京时间)`;

  let commentContents = "";
  commentContents = `
👍 感谢你对 Flutter / Dart 文档本地化做出的贡献！\n 
  
查看该 PR 的预览 URL (已更新至 commit: ${commit})：
  
${urlList}
  
### 查看本 PR 贡献的链接预览:
${changedFilesWithUrls}
  
<sub>(页面失效时间 ${formattedExpireTime})</sub>
  
${BOT_SIGNATURE}
  
<sub>Sign: ${deploySignature}</sub>`;
  
  if (showDetailedUrls == "false") {
    // Feature Not Enabled
    commentContents = `
Visit the preview URL for this PR (updated for commit ${commit}):
    
${urlList}
    
<sub>(expires ${new Date(expireTime).toUTCString()})</sub>
    
${BOT_SIGNATURE}
    
<sub>Sign: ${deploySignature}</sub>`
  }

  return commentContents.trim();
}

export async function postChannelSuccessComment(
  github: InstanceType<typeof GitHub>,
  context: Context,
  result: ChannelSuccessResult,
  commit: string
) {
  const commentInfo = {
    ...context.repo,
    issue_number: context.issue.number,
  };
  const pullRequest = context.payload.pull_request;
  const pullRequestNumber = pullRequest.number;

  const changedFiles = await getChangedFilesByPullRequestNumber(pullRequestNumber);

  const commentMarkdown = getChannelDeploySuccessComment(result, commit, changedFiles);

  const comment = {
    ...commentInfo,
    body: commentMarkdown,
  };

  startGroup(`Commenting on PR`);
  const deploySignature = createDeploySignature(result);
  const isCommentByBot = createBotCommentIdentifier(deploySignature);

  let commentId;
  try {
    const comments = (await github.rest.issues.listComments(commentInfo)).data;
    for (let i = comments.length; i--; ) {
      const c = comments[i];
      if (isCommentByBot(c)) {
        commentId = c.id;
        break;
      }
    }
  } catch (e) {
    console.log("Error checking for previous comments: " + e.message);
  }

  if (commentId) {
    try {
      await github.rest.issues.updateComment({
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
      await github.rest.issues.createComment(comment);
    } catch (e) {
      console.log(`Error creating comment: ${e.message}`);
    }
  }
  endGroup();
}
