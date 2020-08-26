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
