import { exec } from '@actions/exec';
import {
  getInput,
  startGroup,
  endGroup,
  setFailed,
  setOutput,
} from '@actions/core';
import { GitHub, context } from '@actions/github';
import { fileSync } from 'tmp';
import { writeSync } from 'fs';

const FIREBASE_CLI_NPM_PACKAGE =
  'https://firebasestorage.googleapis.com/v0/b/jeff-storage-90953.appspot.com/o/firebase-tools-8.7.0-CHANNELS.tgz?alt=media&token=dd24cd22-8fe4-492b-ac3c-8caf46a201e5';

async function run(github, context) {
  startGroup('Setting up Firebase');

  // Set up Google Application Credentials for use by the Firebase CLI
  // https://cloud.google.com/docs/authentication/production#finding_credentials_automatically
  const googleApplicationCredentials = getInput('firebase-service-account', {
    required: true,
  });
  const tmpFile = fileSync({ postfix: '.json' });
  writeSync(tmpFile.fd, googleApplicationCredentials, {
    encoding: 'utf8',
  });
  const gacEnv = {
    ...process.env,
    GOOGLE_APPLICATION_CREDENTIALS: tmpFile.name,
  };

  // Install Firebase CLI
  await exec('npm', [
    'install',
    '--no-save',
    '--no-package-lock',
    FIREBASE_CLI_NPM_PACKAGE,
  ]);
  const firebase = './node_modules/.bin/firebase';

  // Log the CLI version to double check that it installed correctly
  // and is available
  await exec(firebase, ['--version']);
  endGroup();

  const branchName = context.payload.pull_request.head.ref.substr(0, 20);

  const channelId = `pr${context.payload.pull_request.number}-${branchName}`;
  const channelTTL = getInput('channel-ttl');

  startGroup(`Deploying to Firebase preview channel ${channelId}`);
  let buf = [];

  try {
    await exec(
      firebase,
      [
        'hosting:channel:deploy',
        channelId,
        //   '--expires', // TODO: expires isn't implemented yet in CLI
        //   channelTTL,
        '--json', // keep this option in so that we can easily parse the output
        //   '--debug', // uncomment this for better error output
      ],
      {
        listeners: {
          stdout(data) {
            buf.push(data);
          },
        },
        env: gacEnv, // the CLI will automatically authenticate with this env variable set
      }
    );
  } catch (e) {
    console.log(Buffer.concat(buf).toString('utf-8'));
    console.log(e.message);
    throw e;
  }

  const deploymentText = Buffer.concat(buf).toString('utf-8');

  /**
     * Example CLI output:
{
    "status": "success",
    "result": {
        "jeff-test-699d3": {
            "site": "jeff-test-699d3",
            "url": "https://jeff-test-699d3--abcwaskldasd-xrgzboto.web.app",
            "expireTime": "2020-08-14T04:21:35.203433840Z"
        }
    }
}
     */

  endGroup();

  const deployment = JSON.parse(deploymentText);

  const allSiteResults = Object.values(deployment.result);
  const expireTime = allSiteResults[0].expireTime;
  const urls = allSiteResults.map((siteResult) => siteResult.url);

  setOutput('urls', urls);
  setOutput('expire_time', expireTime);
  setOutput('details_url', urls[0]);

  return { urls, expireTime };
}

(async () => {
  const token = process.env.GITHUB_TOKEN || getInput('repo-token');
  const github = token ? new GitHub(token) : {};

  let finish = (details) => console.log(details);
  if (token) {
    finish = await createCheck(github, context);
  }

  try {
    const result = await run(github, context);

    if (!result || result.urls.length === 0) {
      throw Error('No URL was returned for the deployment.');
    }

    const { urls, expireTime } = result;

    const urlsListMarkdown =
      urls.length === 1
        ? `[${urls[0]}](${urls[0]})`
        : urls.map((url) => `- [${url}](${url})`).join('/n');

    if (token) {
      await postOrUpdateComment(
        github,
        context,
        `
Deploy preview for ${context.payload.pull_request.head.sha.substring(0, 7)}:

${urlsListMarkdown}

<sub>(expires ${new Date(expireTime).toUTCString()})</sub>`.trim()
      );
    }

    await finish({
      details_url: urls[0],
      conclusion: 'success',
      output: {
        title: `Deploy preview succeeded`,
        summary: urlsListMarkdown,
      },
    });
  } catch (e) {
    setFailed(e.message);

    await finish({
      conclusion: 'failure',
      output: {
        title: 'Deploy preview failed',
        summary: `Error: ${e.message}`,
      },
    });
  }
})();

// create a check and return a function that updates (completes) it
async function createCheck(github, context) {
  const check = await github.checks.create({
    ...context.repo,
    name: 'Deploy Preview',
    head_sha: context.payload.pull_request.head.sha,
    status: 'in_progress',
  });

  return async (details) => {
    await github.checks.update({
      ...context.repo,
      check_run_id: check.data.id,
      completed_at: new Date().toISOString(),
      status: 'completed',
      ...details,
    });
  };
}

// create a PR comment, or update one if it already exists
async function postOrUpdateComment(github, context, commentMarkdown) {
  const commentInfo = {
    ...context.repo,
    issue_number: context.issue.number,
  };

  const comment = {
    ...commentInfo,
    body: commentMarkdown + '\n\n<sub>firebase-hosting-preview-action</sub>',
  };

  startGroup(`Updating PR comment`);
  let commentId;
  try {
    const comments = (await github.issues.listComments(commentInfo)).data;
    for (let i = comments.length; i--; ) {
      const c = comments[i];
      if (
        c.user.type === 'Bot' &&
        /<sub>[\s\n]*firebase-hosting-preview-action/.test(c.body)
      ) {
        commentId = c.id;
        break;
      }
    }
  } catch (e) {
    console.log('Error checking for previous comments: ' + e.message);
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
