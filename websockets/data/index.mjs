import { sendData, dispatchUpdate } from "./helpers.mjs";

// the response is always the same
const response = {
  statusCode: 200,
  body: JSON.stringify({ success: true, content: {} }),
};

export const handler = async (event) => {
  const domainName = event.requestContext.domainName;
  const stage = event.requestContext.stage;

  // checking if it is a dynamodb event that triggered the lambda
  if (Array.isArray(event.Records) && event.Records.length > 0) {
    console.log("Record update dispatch");
    await dispatchUpdate(domainName, stage, event.Records);
    return response;
  }

  // extracting the connection id
  const id = event.requestContext.connectionId;

  console.log("Client", id, "is requesting data");

  await sendData(domainName, stage, id);

  return response;
};
