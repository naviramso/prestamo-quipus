const db = require("./database");

const crearUsuario = async (req, res) => {
    const { nombre, ci, grado } = req.body;
    const sql = `INSERT INTO estudiantes (nombre, ci, grado) VALUES (?, ?, ?)`;
    const params = [nombre, ci, grado];
    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, nombre, ci, grado });
    });
};

const obtenerTodosLosUsuarios = async (req, res) => {
    const sql = `SELECT * FROM estudiantes`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
}

module.exports = { crearUsuario, obtenerTodosLosUsuarios };