const express = require("express");
const app = express();
const path = require("path");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

app.use(express.json());
module.exports = app;

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log("ExpressJs Server started Running");
    });
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
};

initializeDBAndServer();

//login user
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const userQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const user = await db.get(userQuery);
  if (user === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const verifyPassword = await bcrypt.compare(password, user.password);
    if (verifyPassword !== true) {
      response.status(400);
      response.send("Invalid password");
    } else {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "MY_SECRET");
      response.send({ jwtToken: jwtToken });
    }
  }
});

//Authentication Using MiddleWare Function
const AuthorizeEachRequest = (request, response, next) => {
  const authHeader = request.headers["authorization"];
  if (authHeader === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    let sendToken = authHeader.split(" ")[1];
    jwt.verify(sendToken, "MY_SECRET", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//Res APIS
app.get("/states/", AuthorizeEachRequest, async (request, response) => {
  const getStatesQuery = `SELECT state_id as stateId,
  state_name as stateName,
  population FROM state;`;
  const list1 = await db.all(getStatesQuery);
  response.send(list1);
});

app.get(
  "/states/:stateId/",
  AuthorizeEachRequest,
  async (request, response) => {
    const { stateId } = request.params;
    const getStateIdQuery = `SELECT state_id as stateId,
  state_name as stateName, population
  FROM state WHERE state_id = ${stateId}`;
    const state1 = await db.get(getStateIdQuery);
    response.send(state1);
  }
);

app.post("/districts/", AuthorizeEachRequest, async (request, response) => {
  const dis = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = dis;
  const postQuery = `INSERT INTO district 
    (district_name, state_id, cases, cured, active, deaths) 
    VALUES ('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths}
    )`;
  await db.run(postQuery);
  response.send(`District Successfully Added`);
});

app.get(
  "/districts/:districtId/",
  AuthorizeEachRequest,
  async (request, response) => {
    const { districtId } = request.params;
    const getDisQuery = `SELECT 
  district_id as districtId,
  district_name as districtName,
  state_id as stateId,
  cases,
  cured,
  active,
  deaths
  FROM district WHERE district_id = ${districtId};`;
    const dis1 = await db.get(getDisQuery);
    response.send(dis1);
  }
);

app.delete(
  "/districts/:districtId/",
  AuthorizeEachRequest,
  async (request, response) => {
    const { districtId } = request.params;
    const delQuery = `DELETE FROM district WHERE district_id = ${districtId};`;
    await db.run(delQuery);
    response.send(`District Removed`);
  }
);

app.put(
  "/districts/:districtId/",
  AuthorizeEachRequest,
  async (request, response) => {
    const { districtId } = request.params;
    const upData = request.body;
    const { districtName, stateId, cases, cured, active, deaths } = upData;
    const updateQuery = `UPDATE district 
    SET district_name = '${districtName}', state_id = ${stateId}, 
    cases = ${cases}, cured = ${cured}, active = ${active}, deaths = ${deaths};`;
    await db.run(updateQuery);
    response.send(`District Details Updated`);
  }
);

app.get(
  "/states/:stateId/stats/",
  AuthorizeEachRequest,
  async (request, response) => {
    const { stateId } = request.params;
    const getStQuery = `SELECT cases as totalCases,cured as totalCured,active as totalActive, deaths as totalDeaths FROM district
  WHERE state_id = ${stateId};`;
    const res1 = await db.get(getStQuery);
    response.send(res1);
  }
);

app.get(
  "/districts/:districtId/details/",
  AuthorizeEachRequest,
  async (request, response) => {
    const { districtId } = request.params;
    const getQuery = `SELECT state.state_name as stateName FROM state INNER JOIN district
   ON state.state_id = district.state_id
    WHERE district.district_id = ${districtId};`;
    const res = await db.get(getQuery);
    response.send(res);
  }
);
