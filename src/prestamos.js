const db = require("./database");

// Registrar nuevo préstamo con validaciones
const registrarPrestamo = (req, res) => {
    const { estudiante_id, codigo_quipus, observaciones } = req.body;

    // Validar campos obligatorios
    if (!estudiante_id || !codigo_quipus) {
        return res
            .status(400)
            .json({ error: "Estudiante y Quipus son requeridos" });
    }

    // Iniciar transacción
    db.serialize(() => {
        // 1. Verificar que el estudiante existe y está activo
        db.get(
            `SELECT id, nombres, apellido_paterno, apellido_materno, ci, grado, paralelo, estado 
             FROM estudiantes WHERE id = ? AND estado = 'activo'`,
            [estudiante_id],
            (err, estudiante) => {
                if (err) {
                    console.error("Error al verificar estudiante:", err);
                    return res
                        .status(500)
                        .json({ error: "Error del servidor" });
                }

                if (!estudiante) {
                    return res
                        .status(400)
                        .json({ error: "Estudiante no encontrado o inactivo" });
                }

                // 2. Verificar que el quipus existe y está disponible
                db.get(
                    "SELECT codigo, estado FROM quipus WHERE codigo = ?",
                    [codigo_quipus],
                    (err, quipus) => {
                        if (err) {
                            console.error("Error al verificar quipus:", err);
                            return res
                                .status(500)
                                .json({ error: "Error del servidor" });
                        }

                        if (!quipus) {
                            return res
                                .status(400)
                                .json({ error: "Quipus no encontrado" });
                        }

                        if (quipus.estado !== "disponible") {
                            return res.status(400).json({
                                error: `El quipus no está disponible. Estado actual: ${quipus.estado}`,
                            });
                        }

                        // 3. Verificar que el estudiante no tenga préstamos activos con el mismo quipus
                        db.get(
                            `SELECT id FROM prestamos 
                             WHERE ci = ? AND codigo = ? AND fecha_devolucion IS NULL`,
                            [estudiante.ci, codigo_quipus],
                            (err, prestamoActivo) => {
                                if (err) {
                                    console.error(
                                        "Error al verificar préstamos activos:",
                                        err
                                    );
                                    return res
                                        .status(500)
                                        .json({ error: "Error del servidor" });
                                }

                                if (prestamoActivo) {
                                    return res.status(400).json({
                                        error: "El estudiante ya tiene un préstamo activo con este quipus",
                                    });
                                }

                                // 4. Verificar límite de préstamos por estudiante (máximo 2)
                                db.get(
                                    `SELECT COUNT(*) as count FROM prestamos 
                                     WHERE ci = ? AND fecha_devolucion IS NULL`,
                                    [estudiante.ci],
                                    (err, row) => {
                                        if (err) {
                                            console.error(
                                                "Error al contar préstamos activos:",
                                                err
                                            );
                                            return res.status(500).json({
                                                error: "Error del servidor",
                                            });
                                        }

                                        if (row.count >= 1) {
                                            return res.status(400).json({
                                                error: "El estudiante ya tiene el máximo de 1 préstamos activos",
                                            });
                                        }

                                        // 5. Registrar el préstamo
                                        const fechaPrestamo =
                                            new Date().toISOString();
                                        db.run(
                                            `INSERT INTO prestamos (
                                                nombre, ci, grado, codigo, fecha_prestamo, observaciones
                                            ) VALUES (?, ?, ?, ?, ?, ?)`,
                                            [
                                                `${estudiante.nombres} ${estudiante.apellido_paterno} ${estudiante.apellido_materno}`,
                                                estudiante.ci,
                                                `${estudiante.grado}° ${estudiante.paralelo}`,
                                                codigo_quipus,
                                                fechaPrestamo,
                                                observaciones || null,
                                            ],
                                            function (err) {
                                                if (err) {
                                                    console.error(
                                                        "Error al registrar préstamo:",
                                                        err
                                                    );
                                                    return res
                                                        .status(500)
                                                        .json({
                                                            error: "Error al registrar el préstamo",
                                                        });
                                                }

                                                // 6. Actualizar estado del quipus
                                                db.run(
                                                    "UPDATE quipus SET estado = 'prestado' WHERE codigo = ?",
                                                    [codigo_quipus],
                                                    (err) => {
                                                        if (err) {
                                                            console.error(
                                                                "Error al actualizar estado del quipus:",
                                                                err
                                                            );
                                                            return res
                                                                .status(500)
                                                                .json({
                                                                    error: "Error al actualizar el quipus",
                                                                });
                                                        }

                                                        res.json({
                                                            success: true,
                                                            mensaje:
                                                                "Préstamo registrado exitosamente",
                                                            id: this.lastID,
                                                            estudiante: {
                                                                nombre: `${estudiante.nombres} ${estudiante.apellido_paterno} ${estudiante.apellido_materno}`,
                                                                ci: estudiante.ci,
                                                                grado: `${estudiante.grado}° ${estudiante.paralelo}`,
                                                            },
                                                            quipus: {
                                                                codigo: quipus.codigo,
                                                            },
                                                            fecha_prestamo:
                                                                fechaPrestamo,
                                                        });
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
            }
        );
    });
};

// Proceso de devolución con observaciones
const registrarDevolucion = (req, res) => {
    const { prestamo_id, observaciones } = req.body;

    if (!prestamo_id) {
        return res.status(400).json({ error: "ID del préstamo es requerido" });
    }

    db.serialize(() => {
        // 1. Obtener información del préstamo
        db.get(
            `SELECT p.*, q.codigo 
             FROM prestamos p 
             JOIN quipus q ON p.codigo = q.codigo 
             WHERE p.id = ? AND p.fecha_devolucion IS NULL`,
            [prestamo_id],
            (err, prestamo) => {
                if (err) {
                    console.error("Error al obtener préstamo:", err);
                    return res
                        .status(500)
                        .json({ error: "Error del servidor" });
                }

                if (!prestamo) {
                    return res.status(404).json({
                        error: "Préstamo no encontrado o ya devuelto",
                    });
                }

                // 2. Registrar la devolución
                const fechaDevolucion = new Date().toISOString();
                db.run(
                    `UPDATE prestamos 
                     SET fecha_devolucion = ?, observaciones = ?
                     WHERE id = ?`,
                    [fechaDevolucion, observaciones || null, prestamo_id],
                    function (err) {
                        if (err) {
                            console.error(
                                "Error al registrar devolución:",
                                err
                            );
                            return res.status(500).json({
                                error: "Error al registrar la devolución",
                            });
                        }

                        // 3. Actualizar estado del quipus a disponible
                        db.run(
                            "UPDATE quipus SET estado = 'disponible' WHERE codigo = ?",
                            [prestamo.codigo],
                            (err) => {
                                if (err) {
                                    console.error(
                                        "Error al actualizar estado del quipus:",
                                        err
                                    );
                                    return res.status(500).json({
                                        error: "Error al actualizar el quipus",
                                    });
                                }

                                res.json({
                                    success: true,
                                    mensaje:
                                        "Devolución registrada exitosamente",
                                    prestamo: {
                                        id: prestamo_id,
                                        estudiante: prestamo.nombre,
                                        ci: prestamo.ci,
                                        quipus: prestamo.codigo,
                                        fecha_prestamo: prestamo.fecha_prestamo,
                                        fecha_devolucion: fechaDevolucion,
                                    },
                                });
                            }
                        );
                    }
                );
            }
        );
    });
};

// Obtener préstamos activos con información detallada
const obtenerPrestamosActivos = (req, res) => {
    const sql = `
        SELECT 
            p.id,
            p.nombre as estudiante_nombre,
            p.ci,
            p.grado,
            p.codigo,
            p.fecha_prestamo,
            p.observaciones,
            e.telefono,
            e.estado as estudiante_estado,
            q.estado as quipus_estado,
            (julianday('now') - julianday(p.fecha_prestamo)) as dias_transcurridos
        FROM prestamos p
        LEFT JOIN estudiantes e ON p.ci = e.ci
        LEFT JOIN quipus q ON p.codigo = q.codigo
        WHERE p.fecha_devolucion IS NULL
        ORDER BY p.fecha_prestamo DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error al obtener préstamos activos:", err);
            return res.status(500).json({ error: "Error del servidor" });
        }
        res.json(rows);
    });
};

// Búsqueda de estudiantes para préstamos
const buscarEstudiantes = (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 2) {
        return res.json([]);
    }

    const searchTerm = `%${q}%`;
    const sql = `
        SELECT 
            id,
            nombres,
            apellido_paterno,
            apellido_materno,
            ci,
            grado,
            paralelo,
            telefono,
            estado
        FROM estudiantes 
        WHERE estado = 'activo' 
          AND (nombres LIKE ? OR apellido_paterno LIKE ? OR apellido_materno LIKE ? OR ci LIKE ?)
        ORDER BY apellido_paterno, apellido_materno, nombres
        LIMIT 10
    `;

    db.all(
        sql,
        [searchTerm, searchTerm, searchTerm, searchTerm],
        (err, rows) => {
            if (err) {
                console.error("Error al buscar estudiantes:", err);
                return res.status(500).json({ error: "Error del servidor" });
            }
            res.json(rows);
        }
    );
};

// Verificar disponibilidad de quipus en tiempo real
const obtenerQuipusDisponibles = (req, res) => {
    const sql = `
        SELECT codigo 
        FROM quipus 
        WHERE estado = 'disponible' 
        ORDER BY codigo
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error al obtener quipus disponibles:", err);
            return res.status(500).json({ error: "Error del servidor" });
        }
        res.json(rows);
    });
};

// Obtener estadísticas de préstamos
const obtenerEstadisticas2 = (req, res) => {
    const estadisticas = {};

    // Préstamos activos
    db.get(
        "SELECT COUNT(*) as count FROM prestamos WHERE fecha_devolucion IS NULL",
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            estadisticas.activos = row.count;

            // Préstamos del día
            const hoy = new Date().toISOString().split("T")[0];
            db.get(
                "SELECT COUNT(*) as count FROM prestamos WHERE DATE(fecha_prestamo) = ?",
                [hoy],
                (err, row) => {
                    if (err)
                        return res.status(500).json({ error: err.message });
                    estadisticas.hoy = row.count;

                    // Préstamos de la semana
                    db.get(
                        `SELECT COUNT(*) as count FROM prestamos 
                   WHERE fecha_prestamo >= date('now', '-7 days')`,
                        (err, row) => {
                            if (err)
                                return res
                                    .status(500)
                                    .json({ error: err.message });
                            estadisticas.semana = row.count;

                            // Préstamos vencidos (más de 7 días)
                            db.get(
                                `SELECT COUNT(*) as count FROM prestamos 
                       WHERE fecha_devolucion IS NULL 
                       AND julianday('now') - julianday(fecha_prestamo) > 7`,
                                (err, row) => {
                                    if (err)
                                        return res
                                            .status(500)
                                            .json({ error: err.message });
                                    estadisticas.vencidos = row.count;

                                    res.json(estadisticas);
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};

module.exports = {
    registrarPrestamo,
    registrarDevolucion,
    obtenerPrestamosActivos,
    buscarEstudiantes,
    obtenerQuipusDisponibles,
    obtenerEstadisticas2,
};
