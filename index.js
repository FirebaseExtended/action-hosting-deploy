import { exec } from '@actions/exec';
import { getInput, startGroup, endGroup, setFailed, setOutput } from '@actions/core';
import { GitHub, context } from '@actions/github';

async function run(github, context) {
    startGroup('Installing dependencies');
    await exec('npm', ['install', '--no-audit']);
    endGroup();

    const buildScript = getInput('build-script');
    if (buildScript) {
        startGroup(`Building using "${buildScript}"`);
        await exec(buildScript);
        endGroup();
    }

    const firebaseToken = getInput('firebase-token', { required: true });

    const firebase = './node_modules/.bin/firebase';
    startGroup('Setting up Firebase');
    await exec(
      'npm',
      [
        'install',
        '--no-save',
        '--no-package-lock',
        'https://firebasestorage.googleapis.com/v0/b/jeff-storage-90953.appspot.com/o/firebase-tools-8.4.2-HOSTINGCHANNELS.tgz?alt=media&token=c4710029-2d0c-4189-910b-7eec5c681136',
      ],
      {
        env: {
          ['FIREBASE_CLI_PREVIEWS']: 'hostingchannels',
          ['FIREBASE_HOSTING_API_URL']:
            'https://staging-firebasehosting.sandbox.googleapis.com',
        },
      }
    );
    endGroup();

    const branchName = context.payload.pull_request.head.ref.substr(0, 20)
    const channelId = `pr${context.payload.pull_request.number}-${branchName}`;
    const channelTTL = getInput('channel-ttl');

    startGroup(`Deploying to Firebase`);
    let buf = [];
    await exec(firebase, [
        'hosting:channel:deploy',
        channelId,
        '--expires',
        channelTTL,
        '--token',
        firebaseToken,
        '--json'
    ], {
        listeners: {
            stdout(data) {
                buf.push(data);
            }
        }
    });
    const deploymentText = Buffer.concat(buf).toString('utf-8');

    /**
     * The deployment object looks like this:
     * {
     *   "status": "success",
     *   "result": {
     *       "<site-id>": {
     *          "site": "<site-id>",
     *          "url": "",
     *          "expireTime": ""
     *       }
     *   }
     * }
     */
    const deployment = JSON.parse(deploymentText);
    endGroup();

    if (deployment.status !== 'success') {
        throw Error(deploymentText);
    }

    const allSiteResults = Array.from(deployment.result[siteId].children);
    const expireTime = allSiteResults[0].expireTime;
    const urls = allSiteResults.map(siteResult => siteResult.url);

    setOutput('urls', urls);
    setOutput('expire_time', expireTime);
    setOutput('details_url', urls[0]);

    return { urls, expireTime };
}

(async () => {
    const token = process.env.GITHUB_TOKEN || getInput('repo-token');
    const github = token ? new GitHub(token) : {};

    let finish = details => console.log(details);
    if (token) {
        finish = await createCheck(github, context);
    }

    try {
        const result = await run(github, context);

        if (!result || result.urls.length === 0) {
            throw Error('No URL was returned for the deployment.');
        }

        const urlsListMarkdown = urls.length === 1 ? `[${urls[0]}](${urls[0]})` : urls.map(url => `- [${url}](${url})`).join('/n');

        if (token) {
            await postOrUpdateComment(github, context, `
                🚀 Deploy preview for ${context.payload.pull_request.head.sha.substring(0, 7)}:

                ${urlsListMarkdown}

                <sub>(${new Date().toUTCString()})</sub>
            `.trim().replace(/^\s+/gm, ''));
        }

        await finish({
            details_url: result.urls[0],
            conclusion: 'success',
            output: {
                title: `Deploy preview succeeded`,
                summary: urlsListMarkdown
            }
        });
    } catch (e) {
        setFailed(e.message);

        await finish({
            conclusion: 'failure',
            output: {
                title: 'Deploy preview failed',
                summary: `Error: ${e.message}`
            }
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

    return async details => {
        await github.checks.update({
            ...context.repo,
            check_run_id: check.data.id,
            completed_at: new Date().toISOString(),
            status: 'completed',
            ...details
        });
    };
}


// create a PR comment, or update one if it already exists
async function postOrUpdateComment(github, context, commentMarkdown) {
    const commentInfo = {
        ...context.repo,
        issue_number: context.issue.number
    };

    const comment = {
        ...commentInfo,
        body: commentMarkdown + '\n\n<sub>firebase-hosting-preview-action</sub>'
    };

    startGroup(`Updating PR comment`);
    let commentId;
    try {
        const comments = (await github.issues.listComments(commentInfo)).data;
        for (let i = comments.length; i--;) {
            const c = comments[i];
            if (c.user.type === 'Bot' && /<sub>[\s\n]*firebase-hosting-preview-action/.test(c.body)) {
                commentId = c.id;
                break;
            }
        }
    }
    catch (e) {
        console.log('Error checking for previous comments: ' + e.message);
    }

    if (commentId) {
        try {
            await github.issues.updateComment({
                ...context.repo,
                comment_id: commentId,
                body: comment.body
            });
        }
        catch (e) {
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