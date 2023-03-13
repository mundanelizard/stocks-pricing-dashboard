import AWS from "aws-sdk";

let client = new AWS.DynamoDB.DocumentClient();

export const handler = async(event) => {
    let id = event.requestContext.connectionId;
    console.log("Disconnecting", id);
    
    let params = {
        TableName: "clients",
        Key: {
            id: id,
        }
    }
    
    await client.delete(params).promise();

    return {
        statusCode: 200,
        body: JSON.stringify({ success: true, content: { id } })
    }
};
