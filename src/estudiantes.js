const db = require("./database");

const registrarEstudiante = (req, res) => {
    const {
        apellido_paterno,
        apellido_materno,
        nombres,
        ci,
        grado,
        paralelo,
        telefono,
    } = req.body;

    // Validar campos obligatorios
    if (
        !apellido_paterno ||
        !apellido_materno ||
        !nombres ||
        !ci ||
        !grado ||
        !paralelo
    ) {
        return res.status(400).json({
            error: "Todos los campos obligatorios deben ser llenados",
        });
    }

    // Validar formato de CI (solo números)
    if (!/^\d+$/.test(ci)) {
        return res
            .status(400)
            .json({ error: "El CI debe contener solo números" });
    }

    // Verificar si el CI ya existe
    db.get("SELECT ci FROM estudiantes WHERE ci = ?", [ci], (err, row) => {
        if (err) {
            console.error("Error al verificar CI:", err);
            return res.status(500).json({ error: "Error del servidor" });
        }

        if (row) {
            return res.status(400).json({ error: "El CI ya está registrado" });
        }

        // Insertar nuevo estudiante
        db.run(
            `INSERT INTO estudiantes (
                apellido_paterno, apellido_materno, nombres, ci, grado, paralelo, telefono
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                apellido_paterno,
                apellido_materno,
                nombres,
                ci,
                grado,
                paralelo,
                telefono || null,
            ],
            function (err) {
                if (err) {
                    console.error("Error al registrar estudiante:", err);
                    return res
                        .status(500)
                        .json({ error: "Error al registrar el estudiante" });
                }

                res.json({
                    success: true,
                    mensaje: "Estudiante registrado exitosamente",
                    id: this.lastID,
                });
            }
        );
    });
};

// Obtener todos los estudiantes (con filtros)
// router.get("/api/estudiantes", requireAuth,
const obtenerTodosEstudiantes = (req, res) => {
    const { estado, grado, paralelo, search } = req.query;

    let sql = `SELECT * FROM estudiantes`;
    let params = [];
    let conditions = [];

    // Aplicar filtros
    if (estado && estado !== "todos") {
        conditions.push("estado = ?");
        params.push(estado);
    }

    if (grado && grado !== "todos") {
        conditions.push("grado = ?");
        params.push(grado);
    }

    if (paralelo && paralelo !== "todos") {
        conditions.push("paralelo = ?");
        params.push(paralelo);
    }

    if (search) {
        conditions.push(
            "(nombres LIKE ? OR apellido_paterno LIKE ? OR apellido_materno LIKE ? OR ci LIKE ?)"
        );
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY apellido_paterno, apellido_materno, nombres";

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error("Error al obtener estudiantes:", err);
            return res.status(500).json({ error: "Error del servidor" });
        }
        res.json(rows);
    });
};

// Obtener un estudiante por ID
// router.get("/api/estudiantes/:id", requireAuth,
const obtenerPorEstudianteID = (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM estudiantes WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.error("Error al obtener estudiante:", err);
            return res.status(500).json({ error: "Error del servidor" });
        }

        if (!row) {
            return res.status(404).json({ error: "Estudiante no encontrado" });
        }

        res.json(row);
    });
};

// Actualizar estudiante
// router.put("/api/estudiantes/:id", requireAuth,
const actualizarEstudiante = (req, res) => {
    const { id } = req.params;
    const {
        apellido_paterno,
        apellido_materno,
        nombres,
        ci,
        grado,
        paralelo,
        telefono,
        estado,
    } = req.body;

    // Validar campos obligatorios
    if (
        !apellido_paterno ||
        !apellido_materno ||
        !nombres ||
        !ci ||
        !grado ||
        !paralelo
    ) {
        return res.status(400).json({
            error: "Todos los campos obligatorios deben ser llenados",
        });
    }

    // Verificar que el CI no esté duplicado (excluyendo el actual)
    db.get(
        "SELECT id FROM estudiantes WHERE ci = ? AND id != ?",
        [ci, id],
        (err, row) => {
            if (err) {
                console.error("Error al verificar CI:", err);
                return res.status(500).json({ error: "Error del servidor" });
            }

            if (row) {
                return res.status(400).json({
                    error: "El CI ya está registrado por otro estudiante",
                });
            }

            // Actualizar estudiante
            db.run(
                `UPDATE estudiantes 
             SET apellido_paterno = ?, apellido_materno = ?, nombres = ?, ci = ?, grado = ?, paralelo = ?, telefono = ?, estado = ?
             WHERE id = ?`,
                [
                    apellido_paterno,
                    apellido_materno,
                    nombres,
                    ci,
                    grado,
                    paralelo,
                    telefono || null,
                    estado,
                    id,
                ],
                function (err) {
                    if (err) {
                        console.error("Error al actualizar estudiante:", err);
                        return res.status(500).json({
                            error: "Error al actualizar el estudiante",
                        });
                    }

                    if (this.changes === 0) {
                        return res
                            .status(404)
                            .json({ error: "Estudiante no encontrado" });
                    }

                    res.json({
                        success: true,
                        mensaje: "Estudiante actualizado exitosamente",
                    });
                }
            );
        }
    );
};

// Eliminar estudiante
// router.delete("/api/estudiantes/:id", requireAuth,
const eliminarEstudiante = (req, res) => {
    const { id } = req.params;

    // Verificar si el estudiante tiene préstamos activos
    db.get(
        `SELECT p.id FROM prestamos p 
         JOIN estudiantes e ON p.ci = e.ci 
         WHERE e.id = ? AND p.fecha_devolucion IS NULL`,
        [id],
        (err, row) => {
            if (err) {
                console.error("Error al verificar préstamos:", err);
                return res.status(500).json({ error: "Error del servidor" });
            }

            if (row) {
                return res.status(400).json({
                    error: "No se puede eliminar un estudiante con préstamos activos",
                });
            }

            // Eliminar el estudiante
            db.run(
                "DELETE FROM estudiantes WHERE id = ?",
                [id],
                function (err) {
                    if (err) {
                        console.error("Error al eliminar estudiante:", err);
                        return res
                            .status(500)
                            .json({ error: "Error al eliminar el estudiante" });
                    }

                    if (this.changes === 0) {
                        return res
                            .status(404)
                            .json({ error: "Estudiante no encontrado" });
                    }

                    res.json({
                        success: true,
                        mensaje: "Estudiante eliminado exitosamente",
                    });
                }
            );
        }
    );
};

// Obtener configuración de grados
// router.get("/api/config/grados", requireAuth,
const obtenerConfigGrados = (req, res) => {
    db.all("SELECT * FROM config_grados ORDER BY grado", (err, rows) => {
        if (err) {
            console.error("Error al obtener configuración de grados:", err);
            return res.status(500).json({ error: "Error del servidor" });
        }
        res.json(rows);
    });
};

// Promocionar grados (avanzar un año)
// router.post("/api/estudiantes/promocionar", requireAuth,
const promocionarGrados = (req, res) => {
    // Los de 4to pasan a 5to
    db.run(
        "UPDATE estudiantes SET grado = '5' WHERE grado = '4' AND estado = 'activo'",
        (err) => {
            if (err) {
                console.error("Error al promocionar 4to grado:", err);
                return res.status(500).json({ error: "Error del servidor" });
            }

            // Los de 5to pasan a 6to
            db.run(
                "UPDATE estudiantes SET grado = '6' WHERE grado = '5' AND estado = 'activo'",
                (err) => {
                    if (err) {
                        console.error("Error al promocionar 5to grado:", err);
                        return res
                            .status(500)
                            .json({ error: "Error del servidor" });
                    }

                    // Los de 6to se desactivan
                    db.run(
                        "UPDATE estudiantes SET estado = 'inactivo' WHERE grado = '6' AND estado = 'activo'",
                        (err) => {
                            if (err) {
                                console.error(
                                    "Error al desactivar 6to grado:",
                                    err
                                );
                                return res
                                    .status(500)
                                    .json({ error: "Error del servidor" });
                            }

                            res.json({
                                success: true,
                                mensaje:
                                    "Promoción de grados realizada exitosamente",
                            });
                        }
                    );
                }
            );
        }
    );
};

// Obtener historial de préstamos por estudiante
// router.get("/api/estudiantes/:id/prestamos", requireAuth,
const obtenerPrestamosPorEstudiante = (req, res) => {
    const { id } = req.params;

    // Primero obtener el estudiante
    db.get(
        "SELECT * FROM estudiantes WHERE id = ?",
        [id],
        (err, estudiante) => {
            if (err) {
                console.error("Error al obtener estudiante:", err);
                return res.status(500).json({ error: "Error del servidor" });
            }

            if (!estudiante) {
                return res
                    .status(404)
                    .json({ error: "Estudiante no encontrado" });
            }

            // Obtener préstamos del estudiante (por CI)
            db.all(
                `SELECT p.*, q.codigo 
             FROM prestamos p 
             JOIN quipus q ON p.codigo = q.codigo 
             WHERE p.ci = ? 
             ORDER BY p.fecha_prestamo DESC`,
                [estudiante.ci],
                (err, prestamos) => {
                    if (err) {
                        console.error("Error al obtener préstamos:", err);
                        return res
                            .status(500)
                            .json({ error: "Error del servidor" });
                    }

                    res.json({
                        estudiante,
                        prestamos,
                    });
                }
            );
        }
    );
};

// router.get("/api/estudiantes/:ci/historial", requireAuth, 
    const obtenerHistorialPorEstudiante = (req, res) => {
    const { ci } = req.params;
    console.log(ci)
    const sql = `
        SELECT 
            p.*,
            q.estado as estado_quipus,
            CASE 
                WHEN p.fecha_devolucion IS NULL THEN 'Pendiente'
                ELSE 'Devuelto'
            END as estado_prestamo,
            CASE 
                WHEN p.fecha_devolucion IS NULL THEN NULL
                ELSE ROUND((JULIANDAY(p.fecha_devolucion) - JULIANDAY(p.fecha_prestamo)) * 24)
            END as horas_prestamo
        FROM prestamos p
        JOIN quipus q ON p.codigo = q.codigo
        WHERE p.ci = ?
        ORDER BY p.fecha_prestamo DESC
    `;

    db.all(sql, [ci], (err, rows) => {
        if (err) {
            console.error("Error al obtener historial:", err);
            return res.status(500).json({ error: "Error del servidor" });
        }

        // Obtener información del estudiante
        db.get(
            "SELECT apellido_paterno, apellido_materno, nombres, grado, paralelo FROM estudiantes WHERE ci = ?",
            [ci],
            (err, estudiante) => {
                if (err) {
                    console.error("Error al obtener estudiante:", err);
                    return res
                        .status(500)
                        .json({ error: "Error del servidor" });
                }

                res.json({
                    estudiante: estudiante || {
                        nombre: "No registrado",
                        grado: "N/A",
                    },
                    prestamos: rows,
                    estadisticas: {
                        total: rows.length,
                        pendientes: rows.filter(
                            (p) => p.fecha_devolucion === null
                        ).length,
                        devueltos: rows.filter(
                            (p) => p.fecha_devolucion !== null
                        ).length,
                        promedioHoras:
                            rows.filter((p) => p.horas_prestamo !== null)
                                .length > 0
                                ? Math.round(
                                      rows.reduce(
                                          (sum, p) =>
                                              sum + (p.horas_prestamo || 0),
                                          0
                                      ) /
                                          rows.filter(
                                              (p) => p.horas_prestamo !== null
                                          ).length
                                  )
                                : 0,
                    },
                });
            }
        );
    });
};

module.exports = {
    registrarEstudiante,
    obtenerTodosEstudiantes,
    obtenerPorEstudianteID,
    actualizarEstudiante,
    eliminarEstudiante,
    obtenerConfigGrados,
    promocionarGrados,
    obtenerPrestamosPorEstudiante,
    obtenerHistorialPorEstudiante,
};
