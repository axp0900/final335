const path = require("path");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const request = require('request')
const axios = require("axios");
const { connect } = require("http2");

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
    let apiString = ``;
    try {
        let inner = ``;
        person.books.forEach(book => {
            let json = JSON.parse(book)
            inner += `<tr><td>${json.title}</td><td><img src="${json.url}"></td></tr>`
        })
        let table = `<table border="1">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Cover</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${inner}
                    </tbody
                </table>`;


        res.cookie("user", person._id);
        res.render("dashboard", { favoriteBooklst: table, user: person.name});
    } catch (error) {
        res.redirect("/?loginFailed=true");
    }
});

app.get("/dashboard", async (req, res) => {
    await client.connect()
    const db = await client.db(`${process.env.MONGO_DB_DB}`)
    const person = await db.collection(`${process.env.MONGO_DB_COLLECTION}`).findOne({ _id: new ObjectId(`${req.cookies.user}`) });
    let inner = ``;
    person.books.forEach(book => {
        let json = JSON.parse(book)
        inner += `<tr><td>${json.title}</td><td><img src="${json.url}"></td></tr>`
    })
    let table = `<table border="1">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Cover</th>
                    </tr>
                </thead>
                <tbody>
                    ${inner}
                </tbody
            </table>`;

    res.render("dashboard", { favoriteBooklst: table, user: person.name});
});

app.get("/createAccount", (req, res) => {
    res.render("createAccount");
});

app.post("/processCreate", async (req, res) => {

    const data = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        books: [],
    }

    await client.connect()
    const db = await client.db(`${process.env.MONGO_DB_DB}`)
    const result = (await db.collection(`${process.env.MONGO_DB_COLLECTION}`).insertOne(data)).insertedId;

    res.cookie('user', result);
    res.redirect("/dashboard")
});


app.post("/search", async (req, res) => {
    const apiString = `https://www.googleapis.com/books/v1/volumes?q=intitle:${req.body.title}&key=${process.env.API_KEY}`;
    let content = `<form action="/addBooks" method="post"> <fieldset>
    <legend>After Selecting books, scroll to bottom to add to favorites</legend>`;
    axios(apiString)
        .then(response => {
            response.data.items.forEach((book) => {
                content +=
                    `<h1>${book.volumeInfo.title}</h1>
                    <input type="checkbox" name="id" value="${book.id}">
                    <h3>${book.volumeInfo.authors}</h3>`

                if (book.volumeInfo.imageLinks != undefined && book.volumeInfo.imageLinks.thumbnail != null) {
                    content += `<img src = ${book.volumeInfo.imageLinks.thumbnail}>`;
                }
                content +=
                    `<p>${book.volumeInfo.description == null ? "Description not available at this time" : book.volumeInfo.description}</p>
                    <hr>`;

            })
            content += `<input type="submit" value="submit"></fieldset></form>`
            res.render("searchBooks", { content: content });
        });

})

app.post("/addBooks", async (req, res) => {
    try {
        await client.connect();
        const db = await client.db(`${process.env.MONGO_DB_DB}`)
        const person = await db.collection(`${process.env.MONGO_DB_COLLECTION}`).findOne({ _id: new ObjectId(`${req.cookies.user}`) });
        let newBooks = person.books;

        if (Array.isArray(req.body.id)) {
            // Use Promise.all to wait for all axios requests to finish
            await Promise.all(req.body.id.map(async id => {
                const response = await axios(`https://www.googleapis.com/books/v1/volumes/${id}`);
                newBooks.push(JSON.stringify({ title: `${response.data.volumeInfo.title}`, url: response.data.volumeInfo.imageLinks.thumbnail }));
            }));

            // Update the database with new books
            await db.collection(`${process.env.MONGO_DB_COLLECTION}`).updateOne(
                { _id: new ObjectId(`${req.cookies.user}`) },
                { $set: { books: newBooks } }
            );
        } else {
            const response = await axios(`https://www.googleapis.com/books/v1/volumes/${req.body.id}`);
            newBooks.push(`${response.data.volumeInfo.title}`);
            await db.collection(`${process.env.MONGO_DB_COLLECTION}`).updateOne(
                { _id: new ObjectId(`${req.cookies.user}`) },
                { $set: { books: newBooks } }
            );
        }

        // Close the client connection
        client.close();

        // Redirect to dashboard after updating the database
        res.redirect("/dashboard");
    } catch (error) {
        console.error("Error:", error);
        // Handle errors appropriately
        res.status(500).send("Internal Server Error");
    }
});

app.post("/logout", (req, res) => {
    res.clearCookie()
    res.redirect("/")
})
process.stdout.write("Web server is running at http://localhost:5000\n")

