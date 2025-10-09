const db = require("./database");

const crearAdministrador = (req, res) => {
    const { nombre, username, rol, contrasenia } = req.body;
    const sql = `INSERT INTO administradores (nombre, username, rol, contrasenia) VALUES (?, ?, ?, ?)`;
    const params = [nombre, username, rol, contrasenia];
    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, nombre, username, rol, contrasenia });
    });
};

const validarAdministrador = (req, res) => {
    const { username, contrasenia } = req.body;
    const sql = `SELECT * FROM administradores WHERE username = ? AND contrasenia = ?`;
    const params = [username, contrasenia];
    db.get(sql, params, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row)
            return res.status(401).json({ error: "Credenciales incorrectas" });

        req.session.admin = {
            id: row.id,
            nombre: row.nombre,
            username: row.username,
            rol: row.rol,
        };

        res.json({
            success: true,
            mensaje: "Login exitoso",
            admin: req.session.admin,
        });
    });
};

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: "Error al cerrar sesión" });
        }
        res.json({ success: true, mensaje: "Sesión cerrada" });
    });
};

const obtenerEstadisticas = (req, res) => {
    const estadisticas = {};

    // Contar total de quipus
    db.get("SELECT COUNT(*) as total FROM quipus", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        estadisticas.totalQuipus = row.total;

        // Contar quipus disponibles
        db.get(
            "SELECT COUNT(*) as disponibles FROM quipus WHERE estado = 'disponible'",
            (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                estadisticas.quipusDisponibles = row.disponibles;

                // Contar total de estudiantes
                db.get(
                    "SELECT COUNT(*) as total FROM estudiantes",
                    (err, row) => {
                        if (err)
                            return res.status(500).json({ error: err.message });
                        estadisticas.totalEstudiantes = row.total;

                        // Contar préstamos activos
                        db.get(
                            `SELECT COUNT(*) as activos FROM prestamos 
                       WHERE fecha_devolucion IS NULL`,
                            (err, row) => {
                                if (err)
                                    return res
                                        .status(500)
                                        .json({ error: err.message });
                                estadisticas.prestamosActivos = row.activos;

                                // Contar préstamos del día
                                const hoy = new Date()
                                    .toISOString()
                                    .split("T")[0];
                                db.get(
                                    `SELECT COUNT(*) as hoy FROM prestamos 
                           WHERE DATE(fecha_prestamo) = ?`,
                                    [hoy],
                                    (err, row) => {
                                        if (err)
                                            return res
                                                .status(500)
                                                .json({ error: err.message });
                                        estadisticas.prestamosHoy = row.hoy;

                                        // Obtener últimos préstamos
                                        db.all(
                                            `SELECT p.nombre, p.ci, p.codigo, p.fecha_prestamo 
                               FROM prestamos p 
                               WHERE p.fecha_devolucion IS NULL 
                               ORDER BY p.fecha_prestamo DESC 
                               LIMIT 5`,
                                            (err, rows) => {
                                                if (err)
                                                    return res
                                                        .status(500)
                                                        .json({
                                                            error: err.message,
                                                        });
                                                estadisticas.ultimosPrestamos =
                                                    rows;

                                                res.json(estadisticas);
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });
};

// Obtener datos para gráficos (préstamos por día última semana)
const obtenerPrestamosPorDia = (req, res) => {
    const sql = `
        SELECT DATE(fecha_prestamo) as fecha, COUNT(*) as cantidad
        FROM prestamos 
        WHERE fecha_prestamo >= date('now', '-7 days')
        GROUP BY DATE(fecha_prestamo)
        ORDER BY fecha
    `;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

module.exports = {
    crearAdministrador,
    validarAdministrador,
    logout,
    obtenerEstadisticas,
    obtenerPrestamosPorDia,
};
