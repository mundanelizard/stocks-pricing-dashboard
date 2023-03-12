import { sendData, dispatchUpdate } from "./helpers.mjs";

const response = {
  statusCode: 200,
  body: JSON.stringify({ success: true, content: {} }),
};

export const handler = async (event) => {
  const domainName = event.requestContext.domainName;
  const stage = event.requestContext.stage;

  if (Array.isArray(event.Records) && event.Records.length > 0) {
    console.log("Record update dispatch");
    await dispatchUpdate(domainName, stage, event.Records);
    return response;
  }

  const id = event.requestContext.connectionId;

  console.log("Client", id, "is requesting");

  await sendData(domainName, stage, id);

  return response;
};
