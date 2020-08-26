import { GitHub } from "@actions/github";
import { Context } from "@actions/github/lib/context";

// create a check and return a function that updates (completes) it
export async function createCheck(github: GitHub, context: Context) {
  const check = await github.checks.create({
    ...context.repo,
    name: "Deploy Preview",
    head_sha: context.payload.pull_request?.head.sha,
    status: "in_progress",
  });

  return async (details: Object) => {
    await github.checks.update({
      ...context.repo,
      check_run_id: check.data.id,
      completed_at: new Date().toISOString(),
      status: "completed",
      ...details,
    });
  };
}
