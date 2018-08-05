// Dependencies
var express = require("express");
var bodyParser = require("body-parser"); 
var mongoose = require("mongoose"); 
var request = require("request"); 
var cheerio = require("cheerio"); 
var logger = require("morgan");
// Require all models
var db = require("./models");

// Port configuration for local/Heroku
var PORT = process.env.PORT || process.argv[2] || 3000;

// Initialize Express
var app = express();
// Use morgan logger for logging requests
app.use(logger("dev"));

// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: true }));

// Handlebars
var exphbs = require("express-handlebars");
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));
// routers
var router = require("./router/api-routes.js");
app.use(router);
// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI);

// Start the server
app.listen(PORT, function() {
    console.log("App running on port " + PORT + "!");
  });