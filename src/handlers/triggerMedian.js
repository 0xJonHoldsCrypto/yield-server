const superagent = require('superagent');
const ss = require('simple-statistics');

const medianModel = require('../models/median');
const AppError = require('../utils/appError');
const dbConnection = require('../utils/dbConnection.js');

module.exports.handler = async () => {
  await main();
};

const main = async () => {
  const urlBase = process.env.APIG_URL;
  let dataEnriched = (await superagent.get(`${urlBase}/poolsEnriched`)).body
    .data;

  const payload = [
    {
      timestamp: Math.floor(Date.now() / 1000 / 60 / 60) * 60 * 60 * 1000,
      medianAPY: ss.median(dataEnriched.map((p) => p.apy)),
      uniquePools: new Set(dataEnriched.map((p) => p.pool)).size,
    },
  ];
  const response = await insertMedian(payload);
  console.log(response);
};

const insertMedian = async (payload) => {
  const conn = await dbConnection.connect();
  const M = conn.model(medianModel.modelName);
  const x = await M.find({}, { _id: 0 }).sort({ timestamp: 1 });
  console.log(x);
  console.log(payload);
  console.log(typeof payload);

  console.log('insertOne');
  const responseOne = await M.insertOne(payload[0]);
  console.log(responseOne);

  console.log('insertMany');
  try {
    const response = await M.insertMany(payload);
  } catch (err) {
    console.log(err);
  }

  if (!response) {
    return new AppError("Couldn't insert data", 404);
  }

  return {
    status: 'success',
    response: `Inserted ${payload.length} samples`,
  };
};

module.exports.insertMedian = insertMedian;