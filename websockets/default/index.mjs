export const handler = async(event) => {
  console.log("WRONG_ROUTE", JSON.stringify(event));
  
  return {
      statusCode: 404,
      body: JSON.stringify({ success: false, content: {} })
  }
};
