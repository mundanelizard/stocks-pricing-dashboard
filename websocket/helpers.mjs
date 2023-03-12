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
          .postToConnection({ ConnectionId: id, Data: updates })
          .promise()
          .catch(async () => await deleteClient(id))
    )
  );
}

export async function sendData(domain, stage, id) {
  const stockAndSentiments = await getStockPredictionsAndSentiments();
  const agwma = getNewAGWMA(domain, stage);
  return agwma.postToConnection({ ConnectionId: id, Data: stockAndSentiments });
}

const getNewAGWMA = (domain, stage) =>
  new AWS.ApiGatewayManagementApi({ endpoint: domain + "/" + stage });
