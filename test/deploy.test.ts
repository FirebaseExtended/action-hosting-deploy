import {
  ChannelSuccessResult,
  ChannelDeployConfig,
  deployPreview,
  deployProductionSite,
  ProductionDeployConfig,
  ProductionSuccessResult,
} from "../src/deploy";
import * as exec from "@actions/exec";
import {
  channelError,
  channelMultiSiteSuccess,
  channelSingleSiteSuccess,
  liveDeployMultiSiteSuccess,
  liveDeploySingleSiteSuccess,
} from "./samples/cliOutputs";

const baseChannelDeployConfig: ChannelDeployConfig = {
  projectId: "my-project",
  channelId: "my-channel",
  expires: undefined,
};

const baseLiveDeployConfig: ProductionDeployConfig = {
  projectId: "my-project",
};

async function fakeExecFail(
  mainCommand: string,
  args: string[],
  options: exec.ExecOptions
) {
  options?.listeners?.stdout(Buffer.from(JSON.stringify(channelError), "utf8"));

  throw new Error("I am an error");
}

async function fakeExec(
  mainCommand: string,
  args: string[],
  options: exec.ExecOptions
) {
  if (args.includes("--debug")) {
    return options?.listeners?.stdout(
      Buffer.from("I am a very long debug output", "utf8")
    );
  }

  const isChannelDeploy = args[0] === "hosting:channel:deploy";
  let successOutput;

  if (args.includes("--target")) {
    successOutput = isChannelDeploy
      ? channelMultiSiteSuccess
      : liveDeployMultiSiteSuccess;
  } else {
    successOutput = isChannelDeploy
      ? channelSingleSiteSuccess
      : liveDeploySingleSiteSuccess;
  }

  options?.listeners?.stdout(
    Buffer.from(JSON.stringify(successOutput), "utf8")
  );
}

describe("deploy", () => {
  it("retries with the --debug flag on error", async () => {
    // @ts-ignore read-only property
    exec.exec = jest.fn(fakeExec).mockImplementationOnce(fakeExecFail);

    const deployOutput: ChannelSuccessResult = (await deployPreview(
      "my-file",
      baseChannelDeployConfig
    )) as ChannelSuccessResult;

    expect(exec.exec).toBeCalledTimes(2);
    expect(deployOutput).toEqual(channelError);

    // Check the arguments that exec was called with
    // @ts-ignore Jest adds a magic "mock" property
    const args = exec.exec.mock.calls;
    const firstCallDeployFlags = args[0][1];
    const secondCallDeployFlags = args[1][1];
    expect(firstCallDeployFlags).toContain("--json");
    expect(secondCallDeployFlags).not.toContain("--json");
    expect(firstCallDeployFlags).not.toContain("--debug");
    expect(secondCallDeployFlags).toContain("--debug");
  });

  describe("deploy to preview channel", () => {
    it("calls exec and interprets the output", async () => {
      // @ts-ignore read-only property
      exec.exec = jest.fn(fakeExec);

      const deployOutput: ChannelSuccessResult = (await deployPreview(
        "my-file",
        baseChannelDeployConfig
      )) as ChannelSuccessResult;

      expect(exec.exec).toBeCalled();
      expect(deployOutput).toEqual(channelSingleSiteSuccess);

      // Check the arguments that exec was called with
      // @ts-ignore Jest adds a magic "mock" property
      const args = exec.exec.mock.calls;
      const deployFlags = args[0][1];
      expect(deployFlags).toContain("hosting:channel:deploy");
    });

    it("specifies a target when one is provided", async () => {
      // @ts-ignore read-only property
      exec.exec = jest.fn(fakeExec);

      const config: ChannelDeployConfig = {
        ...baseChannelDeployConfig,
        target: "my-second-site",
      };

      await deployPreview("my-file", config);

      // Check the arguments that exec was called with
      // @ts-ignore Jest adds a magic "mock" property
      const args = exec.exec.mock.calls;
      const deployFlags = args[0][1];
      expect(deployFlags).toContain("--only");
      expect(deployFlags).toContain("my-second-site");
    });
  });

  describe("deploy to live channel", () => {
    it("calls exec and interprets the output", async () => {
      // @ts-ignore read-only property
      exec.exec = jest.fn(fakeExec);

      const deployOutput: ProductionSuccessResult = (await deployProductionSite(
        "my-file",
        baseLiveDeployConfig
      )) as ProductionSuccessResult;

      expect(exec.exec).toBeCalled();
      expect(deployOutput).toEqual(liveDeploySingleSiteSuccess);

      // Check the arguments that exec was called with
      // @ts-ignore Jest adds a magic "mock" property
      const args = exec.exec.mock.calls;
      const deployFlags = args[0][1];
      expect(deployFlags).toContain("deploy");
      expect(deployFlags).toContain("--only");
      expect(deployFlags).toContain("hosting");
    });
  });
});
