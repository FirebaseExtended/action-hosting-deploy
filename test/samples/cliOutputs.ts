import {
  ChannelSuccessResult,
  ErrorResult,
  ProductionSuccessResult,
} from "../../src/deploy";

export const commitId = "fe211ff";

export const channelMultiSiteSuccess: ChannelSuccessResult = {
  status: "success",
  result: {
    target1: {
      site: "my-main-hosting-site",
      target: "target1",
      url:
        "https://action-hosting-deploy-demo--multisite-test-goqvngto.web.app",
      expireTime: "2020-10-27T21:32:57.233344586Z",
    },
    target2: {
      site: "my-second-hosting-site",
      target: "target2",
      url:
        "https://action-hosting-deploy-demo-2--multisite-test-ksadajci.web.app",
      expireTime: "2020-10-27T21:32:57.233344586Z",
    },
  },
};

export const channelSingleSiteSuccess: ChannelSuccessResult = {
  status: "success",
  result: {
    "action-hosting-deploy-demo": {
      site: "action-hosting-deploy-demo",
      url:
        "https://action-hosting-deploy-demo--singlesite-test-jl98rmie.web.app",
      expireTime: "2020-10-27T21:32:57.233344586Z",
    },
  },
};

export const channelError: ErrorResult = {
  status: "error",
  error:
    "HTTP Error: 400, Channel IDs can only include letters, numbers, underscores, hyphens, and periods.",
};

export const liveDeploySingleSiteSuccess: ProductionSuccessResult = {
  status: "success",
  result: {
    hosting: "sites/jeff-test-699d3/versions/7aebddc461b66922",
  },
};

export const liveDeployMultiSiteSuccess: ProductionSuccessResult = {
  status: "success",
  result: {
    hosting: [
      "sites/action-hosting-deploy-demo/versions/cd71a5c43ba0921b",
      "sites/action-hosting-deploy-demo-2/versions/e843c071a09cecbf",
    ],
  },
};
