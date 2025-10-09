const router = require("express").Router();
const db = require("./database");
const path = require("path");
const { crearUsuario, obtenerTodosLosUsuarios } = require("./estudiantes");
const { validarAdministrador } = require("./administradores");


// Servidor de rutas
router.get("/", (req, res) => {
    res.render("auth/login", { title: "Login" , layout: false});
})

router.get("/admin/dashboard", (req, res) => {
    res.render("admin/dashboard", { title: "Dashboard" ,
       layout: "layouts/layout-admin.ejs"
    });
});

router.get("/prestamos", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public/prestamos.html"));
});

router.get("/devolucion", (req, res) => {
    console.log(path.join(__dirname, "public/devolucion.html"));
    res.sendFile(path.join(__dirname, "..", "public/devolucion.html"));
});

router.get("/reportes", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public/reporte.html"));
});

router.get("/estudiantes", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public/estudiantes.html"));
});

//Admin
router.post("/admin/login", validarAdministrador);
//Estudiantes
router.post("/usuario/crear", crearUsuario);
router.get("/estudiantes/todos", obtenerTodosLosUsuarios);

// Ruta para registrar préstamo
router.post("/prestamo", (req, res) => {
    const { nombre, ci, grado, codigo } = req.body;
    const fecha = new Date().toISOString();

    db.run(
        "INSERT INTO prestamos (nombre, ci, grado, codigo, fecha_prestamo) VALUES (?, ?, ?, ?, ?)",
        [nombre, ci, grado, codigo, fecha],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            db.run('UPDATE quipus SET estado = "prestado" WHERE codigo = ?', [
                codigo,
            ]);
            res.json({
                success: true,
                mensaje: "Préstamo registrado con éxito",
                id: this.lastID,
            });
        }
    );
});

router.get("/quipus-disponibles", (req, res) => {
    const sql = `SELECT codigo FROM quipus WHERE estado = 'disponible'`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Obtener préstamos pendientes (los que no tienen fecha_devolución)
router.get("/prestamos-pendientes", (req, res) => {
    const sql = `
      SELECT prestamos.id, prestamos.nombre, prestamos.ci, prestamos.codigo, prestamos.fecha_prestamo
      FROM prestamos
      JOIN quipus ON prestamos.codigo = quipus.codigo
      WHERE prestamos.fecha_devolucion IS NULL AND quipus.estado = 'prestado'
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error al obtener préstamos pendientes:", err);
            return res.status(500).json({ error: "Error del servidor" });
        }

        res.json(rows);
    });
});

router.get("/prestamo/:id", (req, res) => {
    const id = req.params.id;

    db.get(
        `
      SELECT prestamos.id, prestamos.nombre, prestamos.ci, prestamos.grado, prestamos.fecha_prestamo, quipus.codigo
      FROM prestamos
      JOIN quipus ON prestamos.codigo = quipus.codigo
      WHERE prestamos.id = ?
    `,
        [id],
        (err, row) => {
            if (err) {
                console.error(err);
                return res
                    .status(500)
                    .json({ error: "Error al consultar la base de datos." });
            }

            if (!row) {
                return res
                    .status(404)
                    .json({ error: "Préstamo no encontrado." });
            }

            res.json(row);
        }
    );
});

// Registrar devolución
router.post("/devolucion", (req, res) => {
    const { id } = req.body;
    const { observaciones } = req.body;
    const fechaDevolucion = new Date().toISOString();

    console.log(req.body);
    // Obtener el código de la computadora prestada
    db.get("SELECT codigo FROM prestamos WHERE id = ?", [id], (err, row) => {
        if (err || !row) {
            console.error("Error al encontrar préstamo:", err);
            return res
                .status(500)
                .json({ error: "No se encontró el préstamo" });
        }

        const codigo = row.codigo;

        // Actualizar fecha de devolución en el préstamo
        db.run(
            "UPDATE prestamos SET fecha_devolucion = ?, observaciones = ? WHERE id = ?",
            [fechaDevolucion, observaciones, id],
            function (err) {
                if (err) {
                    console.error("Error al actualizar devolución:", err);
                    return res
                        .status(500)
                        .json({ error: "Error al actualizar préstamo" });
                }

                // Cambiar estado del equipo a "disponible"
                db.run(
                    "UPDATE quipus SET estado = 'disponible' WHERE codigo = ?",
                    [codigo],
                    function (err2) {
                        if (err2) {
                            console.error(
                                "Error al actualizar estado de quipus:",
                                err2
                            );
                            return res.status(500).json({
                                error: "Error al actualizar estado del equipo",
                            });
                        }

                        res.json({
                            mensaje: "Devolución registrada exitosamente",
                        });
                    }
                );
            }
        );
    });
});

router.get("/reportes-data", (req, res) => {
    const sql = `
      SELECT prestamos.nombre, prestamos.ci, prestamos.grado, quipus.codigo, prestamos.fecha_prestamo, prestamos.fecha_devolucion, prestamos.observaciones
      FROM prestamos
      JOIN quipus ON prestamos.codigo = quipus.codigo
      ORDER BY prestamos.fecha_prestamo DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res
                .status(500)
                .json({ error: "Error al consultar reportes." });
        }

        res.json(rows);
    });
});

module.exports = router;
