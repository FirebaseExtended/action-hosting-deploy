import { ChannelSuccessResult } from "../../src/deploy";

export const commitId = "fe211ff";

export const multiSiteSuccess: ChannelSuccessResult = {
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

export const singleSiteSuccess: ChannelSuccessResult = {
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
