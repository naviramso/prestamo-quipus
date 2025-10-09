const sqlite3 = require("sqlite3").verbose();
// Inicializar base de datos
const db = new sqlite3.Database("./database/database.db", (err) => {
    if (err) return console.error(err.message);
    console.log("Conectado a la base de datos SQLite");
});


module.exports = db;
