const express = require('express')
const request = require("request");
const axios = require("axios");
const { StringStream } = require("scramjet");
const fs = require('fs');

const port = 8080
const arkCSVdataUrl1 = "https://ark-funds.com/wp-content/fundsiteliterature/csv/ARK_INNOVATION_ETF_ARKK_HOLDINGS.csv"
const arkCSVdataUrl2 = "https://ark-funds.com/wp-content/fundsiteliterature/csv/ARK_AUTONOMOUS_TECHNOLOGY_&_ROBOTICS_ETF_ARKQ_HOLDINGS.csv"
const arkCSVdataUrl3 = "https://ark-funds.com/wp-content/fundsiteliterature/csv/ARK_NEXT_GENERATION_INTERNET_ETF_ARKW_HOLDINGS.csv"
const arkCSVdataUrl4 = "https://ark-funds.com/wp-content/fundsiteliterature/csv/ARK_GENOMIC_REVOLUTION_MULTISECTOR_ETF_ARKG_HOLDINGS.csv"
const arkCSVdataUrl5 = "https://ark-funds.com/wp-content/fundsiteliterature/csv/ARK_FINTECH_INNOVATION_ETF_ARKF_HOLDINGS.csv"

const app = express()

async function getArkCSVData(url) {
  let data = [];

  await request.get(url) // fetch csv
    .pipe(new StringStream()) // pass to stream
    .CSVParse() // parse into objects
    .consume(object => {
      data.push(object);
    });

  let colums = data.shift();

  return data.map(row => {
    return row.reduce((result, field, index) => {
      result[colums[index]] = row[index];
      return result;
    }, {})
  });
};

function parseData(data){
  let finalData = {};
  data.forEach(csvData => {
    csvData.forEach(dataRow => {
      let stockName = dataRow.ticker;
      finalData[stockName] ? finalData[stockName].push(dataRow): finalData[stockName]=[dataRow];
      // console.log(finalData);
    })
  });

  return finalData;
}

const fetchData = async (stockName, token) => {
  try {
      const resp = await axios.get(`https://cloud.iexapis.com/stable/stock/${stockName}/indicator/rsi?range=30d&input1=15&token=${token}&chartCloseOnly=true`);
      return {[stockName]: resp.data};
  } catch (err) {
      // Handle Error Here
      console.error({
        stockName,
        stack: err.stack,
        message: err.message
       });
  }
};

async function getRsiData(parsedData, token){
  const stocksNames = Object.keys(parsedData);
  let pro = stocksNames.map(async stocksName => {
    return await fetchData(stocksName, token);
  });

  const rawData = await Promise.all([...pro]);

  let formatedData = {};
  rawData.forEach(row => {
    if (row) {
      const [values] = Object.entries(row)
      formatedData[values[0]] = values[1];
    }
  })
  return formatedData;
}

function getLocalData(){
  try{
    const dataFile = fs.readFileSync('./data.json', {encoding:'utf8'}); 
    return dataFile ? JSON.parse(dataFile) : null;
  }catch(e){
    console.error(e)
  }
}

function getIeToken(){
  try{
    if (process.env.IEXAPI_TOKEN) return process.env.IEXAPI_TOKEN;
 
    const dataFile = fs.readFileSync('./config.json', {encoding:'utf8'}); 
    return JSON.parse(dataFile).iexapis;
  }catch(e){
    console.error(e)
  }
}


app.get('/', async (req, res) => {
  
  const token = getIeToken();

  const localData = getLocalData()
  if (localData){
    res.json(localData);
    return
  }

  let csvRawdata = await Promise.all([
    getArkCSVData(arkCSVdataUrl1),
    getArkCSVData(arkCSVdataUrl2),
    getArkCSVData(arkCSVdataUrl3),
    getArkCSVData(arkCSVdataUrl4),
    getArkCSVData(arkCSVdataUrl5),
  ]);
  
  const parsedData = parseData(csvRawdata);
  const RSidata = await getRsiData(parsedData, token);
  
  const mergedData = Object.keys(parsedData).map(stock=>{
    const data = {};
    data[stock] = [];
    let v = parsedData[stock];
    let t = RSidata[stock];
    data[stock].push(v)
    data[stock].push(t)
    return data;
  });

  fs.writeFileSync("data.json", JSON.stringify(mergedData), function(err) {
    if (err) {
        console.log(err);
    }
  });

  res.json(mergedData);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})