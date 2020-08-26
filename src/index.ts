import {
  endGroup,
  getInput,
  setFailed,
  setOutput,
  startGroup,
} from "@actions/core";
import { context, GitHub } from "@actions/github";
import { createGacFile } from "./createGACFile";
import { deploy, ErrorResult } from "./deploy";
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
const token = process.env.GITHUB_TOKEN || getInput("repoToken");
const github = token ? new GitHub(token) : undefined;

async function run() {
  let finish = (details: Object) => console.log(details);
  if (token) {
    finish = await createCheck(github as GitHub, context);
  }

  try {
    startGroup("Setting up Firebase");
    const firebase = await installFirebaseCLI();
    endGroup();

    startGroup("Setting up CLI credentials");
    const gacFilename = await createGacFile(googleApplicationCredentials);
    endGroup();

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

    if (token) {
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
