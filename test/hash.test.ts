import {
  channelSingleSiteSuccess,
  channelMultiSiteSuccess,
} from "./samples/cliOutputs";
import { createDeploySignature } from "../src/hash";

describe("hash", () => {
  it("Returns stable signature for single site", () => {
    const signSingle = createDeploySignature(channelSingleSiteSuccess);
    expect(signSingle).toEqual("ca07ce2c831b1990b78fcf2ecdfe230a486dc973");
  });

  it("Returns stable signature for multi site", () => {
    const signMulti1 = createDeploySignature(channelMultiSiteSuccess);
    expect(signMulti1).toEqual("980f04126fb629deaadace7d6ee8a0628942e3d3");

    const signMulti2 = createDeploySignature({
      ...channelMultiSiteSuccess,
      result: {
        targetX: channelMultiSiteSuccess.result.target2,
        targetY: channelMultiSiteSuccess.result.target1,
      },
    });
    expect(signMulti2).toEqual("980f04126fb629deaadace7d6ee8a0628942e3d3");
  });
});
