import AWS from "aws-sdk";
import {
  getClientIds,
  deleteClient,
  getStockPredictionsAndSentiments,
  formatRecords,
} from "./database.mjs";

export async function dispatchUpdate(domain, stage, records) {
  const ids = (await getClientIds())?.map(({ id }) => id);

  if (!ids) {
    throw new Error("Could not retrieve client ids " + ids);
  }
  const agwma = getNewAGWMA(domain, stage);
  const updates = formatRecords(records);

  return await Promise.all(
    ids.map(
      async (id) =>
        await agwma
          .postToConnection({ ConnectionId: id, Data: JSON.stringify(updates) })
          .promise()
          .catch(async () => await deleteClient(id))
    )
  );
}

export async function sendData(domain, stage, id) {
  const stockAndSentiments = await getStockPredictionsAndSentiments();
  const agwma = getNewAGWMA(domain, stage);
  console.log("Posting back data to ", id);
  return await agwma.postToConnection({ ConnectionId: id, Data: JSON.stringify(stockAndSentiments) }).promise();
}

const getNewAGWMA = (domain, stage) =>
  new AWS.ApiGatewayManagementApi({ endpoint: domain + "/" + stage });
