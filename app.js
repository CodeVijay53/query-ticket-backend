require("dotenv").config();
const express = require("express");
const app = express();
const bodyparser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const port = process.env.PORT || 3001;
//Security
// app.use(helmet());
//CORS Error
app.use(cors());

//Mongo connection
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URL).then(() => console.log("Connected!"));

if (process.env.NODE_ENV !== "production") {
  const mDb = mongoose.connection;
  mDb.on("open", () => {
    console.log("MongoDB is conneted");
  });

  mDb.on("error", (error) => {
    console.log(error);
  });

  //Logger
  app.use(morgan("tiny"));
}
//Body Parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//Load routers
const userRouter = require("./src/routers/user.router");
const ticketRouter = require("./src/routers/ticket.router");
const tokenRouter = require("./src/routers/tokens.router");
//UseRouters
app.use("/v1/user", userRouter);
app.use("/v1/ticket", ticketRouter);
app.use("/v1/tokens", tokenRouter);

//TicketRouters

//Routers
//Error handler
const handleError = require("./src/utils/errorHandler");
app.use((req, res, next) => {
  const error = new Error("Resource not found!!!");
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  handleError(error, res);
});

app.listen(port, () => {
  console.log(`API is ready on http://localhost:${port}`);
});
