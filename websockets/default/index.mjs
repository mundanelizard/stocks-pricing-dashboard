export const handler = async(event) => {
  // handles errors for poorly routed requests.
  console.log("WRONG_ROUTE", JSON.stringify(event));
  
  return {
      statusCode: 404,
      body: JSON.stringify({ success: false, content: {} })
  }
};
