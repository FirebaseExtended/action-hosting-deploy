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
  if (correctedChannelId !== tmpChannelId) {
    console.log(
      `ChannelId "${tmpChannelId}" contains unsupported characters. Using "${correctedChannelId}" instead.`
    );
  }

  return correctedChannelId;
}
