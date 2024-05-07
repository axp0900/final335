const path = require("path");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const request = require('request')
const axios = require("axios");

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.listen(5000);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

let connectionUrl = `mongodb+srv://${process.env.MONGO_DB_USER}:${process.env.MONGO_DB_PASS}@cluster0.zdvn84l.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(connectionUrl);

app.get("/", (req, res) => {
    res.render("login");
});

app.post("/dashboard", async (req, res) => {

    await client.connect()
    const db = await client.db(`${process.env.MONGO_DB_DB}`)
    const person = await db.collection(`${process.env.MONGO_DB_COLLECTION}`).findOne({ email: req.body.email, password: req.body.password });

    //Grab their information and pass to dashboard

    if (person == undefined) {
        res.status(404).redirect("login");
    }

    res.cookie("user", person._id);
    res.render("dashboard", data);
});

app.get("/createAccount", (req, res) => {
    res.render("createAccount");
});

app.post("/processCreate", async (req, res) => {

    const data = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
    }

    await client.connect()
    const db = await client.db(`${process.env.MONGO_DB_DB}`)
    const result = (await db.collection(`${process.env.MONGO_DB_COLLECTION}`).insertOne(data)).insertedId;

    res.cookie('user', result);
    res.render("dashboard", {User: result.toString()})
});


// app.get("/:stock", (req, res) => {
//     const apiString = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${req.params.stock}&apikey=${process.env.API_KEY}`
//     let news = [];

//     axios(apiString)
//     .then(response => response.data)
//     .then(data => {
//         console.log(data);
//         // data.feed.foreach(element => {
//         //     news.insert({ title: element.title, url: element.url, summary: element.summary });
//         // });
//     })


//     const data = {
//         stock: req.params.stock,
//         chart: "temp",
//         news: news
//     }

//     res.render("stock", data);
// });

process.stdout.write("Web server is running at http://localhost:5000\n")