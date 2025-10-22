// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const routes = require("./src/rutas");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");

const app = express();
const PORT = 3000;

// Middleware
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src/views"));

app.use(expressLayouts);
app.set("layout", "layouts");

app.use(
    session({
        secret: "contrasena-secreta",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000,
        },
    })
);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", routes);

// app.listen(PORT, () => {
//     console.log(`Servidor corriendo en http://localhost:${PORT}`);
// });

module.exports = app;