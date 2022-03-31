import { Context } from "@actions/github/lib/context";
import { getDeployMessage } from "../src/getDeployMessage";

const messageCapped = `head commit message that is longer than 255 characters will be 
automatically reduced and we do not want that potentially. But we also want 
to check for multiline support so here is a rather long rant which hopefully 
one day will reach 255 characters (h`;
const message = `head commit message that is longer than 255 characters will be 
automatically reduced and we do not want that potentially. But we also want 
to check for multiline support so here is a rather long rant which hopefully 
one day will reach 255 characters (hopefully).`;
const context = ({
  payload: {
    head_commit: {
      message,
    },
  },
} as unknown) as Context;

describe("getDeployMessage", () => {
  it("using false", () => {
    expect(getDeployMessage("false", context)).toBeUndefined();
  });

  it("using empty string", () => {
    expect(getDeployMessage("", context)).toBeUndefined();
  });

  it("using true", () => {
    expect(getDeployMessage("true", context)).toEqual(messageCapped);
  });

  it("return no head commit", () => {
    expect(
      getDeployMessage("true", ({} as unknown) as Context)
    ).toBeUndefined();
  });

  it("provided message is capped", () => {
    expect(getDeployMessage(message, ({} as unknown) as Context)).toEqual(
      messageCapped
    );
  });
});
