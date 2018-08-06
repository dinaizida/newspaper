var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var path = require("path");

// Requiring Note  model
var Note = require("./models/Note.js");

// Require all models
var db = require("./models");

var request = require("request");
var cheerio = require("cheerio");

var port = process.env.PORT || 3000

var app = express();

app.use(logger("dev"));
app.use(bodyParser.urlencoded({
    extended: false
}));

// Make public a static dir
app.use(express.static("public"));

// Set Handlebars.
var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({
    defaultLayout: "main",
    partialsDir: path.join(__dirname, "/views/layouts/partials")
}));
app.set("view engine", "handlebars");

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/newsNYT";

// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI);

// Routes

//GET requests to render Handlebars pages
app.get("/", function(req, res) {
    db.Article.find({
        "saved": false
    }, function(error, data) {
        var dbArticle = {
            article: data
        };
        console.log(dbArticle);
        res.render("home", dbArticle);
    });
});

app.get("/saved", function(req, res) {
    db.Article.find({
        "saved": true
    }).populate("notes").exec(function(error, articles) {
        var dbArticle = {
            article: articles
        };
        res.render("saved", dbArticle);
    });
});

//  scrape the NYT website
app.get("/scrape", function(req, res) {

    request("https://www.nytimes.com/", function(error, response, html) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(html);
        var count = 0;
        // Now, get every h2 within an article tag, and do the following:
        $("article").each(function(i, element) {
            count = i;
            // Save an empty result object
            var result = {};
            // Add the title and summary of every link, and save them as properties of the result object
            result.title = $(this).children("h2").text();
            result.summary = $(this).children(".summary").text();
            result.link = $(this).children("h2").children("a").attr("href");
            //save articles in database
            if (result.title && result.link && result.summary) {
                db.Article.create(result)
                    .then(function(dbArticle) {
                        // View the added result in the console
                        console.log(dbArticle);
                    })
                    .catch(function(err) {
                        return res.json(err);
                    });
            }
        });
        res.send("Scrape Complete");
    });
});

// get the articles we scraped from the mongoDB
app.get("/articles", function(req, res) {
    db.Article.find({}, function(error, doc) {
        if (error) {
            console.log(error);
        } else {
            res.json(doc);
        }
    });
});

// Grab an article by it's ObjectId
app.get("/articles/:id", function(req, res) {
    // Using the id passed in the id parameter, find an article
    db.Article.findOne({
            "_id": req.params.id
        })
        // ..and populate all of the notes associated with the article
        .populate("note")
        
        .then(function(error, doc) {
            if (error) {
                console.log(error);
            } else {
                res.json(doc);
            }
        });
});

// Save an article
app.post("/articles/save/:id", function(req, res) {
    // Use the article id to find and update its saved boolean
    db.Article.findOneAndUpdate({
            "_id": req.params.id
        }, {
            "saved": true
        })
       
        .then(function(err, doc) {
            
            if (err) {
                console.log(err);
            } else {
               
                res.send(doc);
            }
        });
});

// Delete an article
app.post("/articles/delete/:id", function(req, res) {
    // Use the article id to find and update its saved boolean
    db.Article.findOneAndUpdate({
            "_id": req.params.id
        }, {
            "saved": false,
            "notes": []
        })
        .then(function(err, doc) {
           
            if (err) {
                console.log(err);
            } else {
               
                res.send(doc);
            }
        });
});

// Create a new note
app.post("/notes/save/:id", function(req, res) {

    var newNote = new Note({
        body: req.body.text,
        article: req.params.id
    });
    console.log(req.body)
        // And save the new note the db
    newNote.save(function(error, note) {
        
        if (error) {
            console.log(error);
        } else {
            // Use the article id to find and update it's notes
            db.Article.findOneAndUpdate({
                    "_id": req.params.id
                }, {
                    $push: {
                        "notes": note
                    }
                })
                
                .then(function(err) {
                    if (err) {
                        console.log(err);
                        res.send(err);
                    } else {
                      
                        res.send(note);
                    }
                });
        }
    });

});

// Delete a note
app.delete("/notes/delete/:note_id/:article_id", function(req, res) {
    // Use the note id to find and delete it
    db.Note.findOneAndRemove({
        "_id": req.params.note_id
    }, function(err) {
        if (err) {
            console.log(err);
            res.send(err);
        } else {
            db.Article.findOneAndUpdate({
                    "_id": req.params.article_id
                }, {
                    $pull: {
                        "notes": req.params.note_id
                    }
                })
                .then(function(err) {
          
                    if (err) {
                        console.log(err);
                        res.send(err);
                    } else {
                        res.send("Note Deleted");
                    }
                });
        }
    });
});

// Listen on port
app.listen(port, function() {
    console.log("App running on port " + port);
});