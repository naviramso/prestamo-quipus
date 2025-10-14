// ===== REPORTES AVANZADOS =====
const db = require("./database");
// Reporte general con filtros
// router.get("/api/reportes/avanzado", requireAuth,
const reporteAvanzado = (req, res) => {
    const { fechaInicio, fechaFin, estado, grado } = req.query;

    let sql = `
        SELECT 
            p.*,
            q.estado as estado_quipus,
            DATE(p.fecha_prestamo) as fecha_prestamo_date,
            DATE(p.fecha_devolucion) as fecha_devolucion_date
        FROM prestamos p
        JOIN quipus q ON p.codigo = q.codigo
        WHERE 1=1
    `;
    const params = [];

    // Filtro por fechas
    if (fechaInicio) {
        sql += " AND DATE(p.fecha_prestamo) >= ?";
        params.push(fechaInicio);
    }
    if (fechaFin) {
        sql += " AND DATE(p.fecha_prestamo) <= ?";
        params.push(fechaFin);
    }

    // Filtro por estado de préstamo
    if (estado === "pendiente") {
        sql += " AND p.fecha_devolucion IS NULL";
    } else if (estado === "devuelto") {
        sql += " AND p.fecha_devolucion IS NOT NULL";
    }

    // Filtro por grado
    if (grado) {
        sql += " AND p.grado = ?";
        params.push(grado);
    }

    sql += " ORDER BY p.fecha_prestamo DESC";

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error("Error en reporte avanzado:", err);
            return res.status(500).json({ error: "Error del servidor" });
        }
        res.json(rows);
    });
};

// Métricas de uso
// router.get("/api/reportes/metricas", requireAuth,
const metricasUso = (req, res) => {
    const { fechaInicio, fechaFin } = req.query;

    const metricas = {};

    // Total de préstamos en el período
    let sqlPrestamos = "SELECT COUNT(*) as total FROM prestamos WHERE 1=1";
    const params = [];

    if (fechaInicio) {
        sqlPrestamos += " AND DATE(fecha_prestamo) >= ?";
        params.push(fechaInicio);
    }
    if (fechaFin) {
        sqlPrestamos += " AND DATE(fecha_prestamo) <= ?";
        params.push(fechaFin);
    }

    db.get(sqlPrestamos, params, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        metricas.totalPrestamos = row.total;

        // Préstamos pendientes
        let sqlPendientes =
            "SELECT COUNT(*) as pendientes FROM prestamos WHERE fecha_devolucion IS NULL";
        const paramsPendientes = [];

        if (fechaInicio) {
            sqlPendientes += " AND DATE(fecha_prestamo) >= ?";
            paramsPendientes.push(fechaInicio);
        }
        if (fechaFin) {
            sqlPendientes += " AND DATE(fecha_prestamo) <= ?";
            paramsPendientes.push(fechaFin);
        }

        db.get(sqlPendientes, paramsPendientes, (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            metricas.prestamosPendientes = row.pendientes;

            // Quipus más prestados
            const sqlTopQuipus = `
                SELECT codigo, COUNT(*) as total_prestamos
                FROM prestamos 
                WHERE 1=1 
                ${fechaInicio ? "AND DATE(fecha_prestamo) >= ?" : ""}
                ${fechaFin ? "AND DATE(fecha_prestamo) <= ?" : ""}
                GROUP BY codigo 
                ORDER BY total_prestamos DESC 
                LIMIT 5
            `;

            const paramsTop = [];
            if (fechaInicio) paramsTop.push(fechaInicio);
            if (fechaFin) paramsTop.push(fechaFin);

            db.all(sqlTopQuipus, paramsTop, (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                metricas.topQuipus = rows;

                // Estudiantes más activos
                const sqlTopEstudiantes = `
                    SELECT nombre, ci, grado, COUNT(*) as total_prestamos
                    FROM prestamos 
                    WHERE 1=1 
                    ${fechaInicio ? "AND DATE(fecha_prestamo) >= ?" : ""}
                    ${fechaFin ? "AND DATE(fecha_prestamo) <= ?" : ""}
                    GROUP BY ci 
                    ORDER BY total_prestamos DESC 
                    LIMIT 5
                `;

                db.all(sqlTopEstudiantes, paramsTop, (err, rows) => {
                    if (err)
                        return res.status(500).json({ error: err.message });
                    metricas.topEstudiantes = rows;

                    // Préstamos por día (para gráfico)
                    const sqlPorDia = `
                        SELECT 
                            DATE(fecha_prestamo) as fecha,
                            COUNT(*) as cantidad
                        FROM prestamos 
                        WHERE 1=1 
                        ${fechaInicio ? "AND DATE(fecha_prestamo) >= ?" : ""}
                        ${fechaFin ? "AND DATE(fecha_prestamo) <= ?" : ""}
                        GROUP BY DATE(fecha_prestamo)
                        ORDER BY fecha
                    `;

                    db.all(sqlPorDia, paramsTop, (err, rows) => {
                        if (err)
                            return res.status(500).json({ error: err.message });
                        metricas.prestamosPorDia = rows;

                        // Grados más activos
                        const sqlGrados = `
                            SELECT 
                                grado,
                                COUNT(*) as total_prestamos
                            FROM prestamos 
                            WHERE 1=1 
                            ${
                                fechaInicio
                                    ? "AND DATE(fecha_prestamo) >= ?"
                                    : ""
                            }
                            ${fechaFin ? "AND DATE(fecha_prestamo) <= ?" : ""}
                            GROUP BY grado 
                            ORDER BY total_prestamos DESC
                        `;

                        db.all(sqlGrados, paramsTop, (err, rows) => {
                            if (err)
                                return res
                                    .status(500)
                                    .json({ error: err.message });
                            metricas.prestamosPorGrado = rows;

                            res.json(metricas);
                        });
                    });
                });
            });
        });
    });
};

// Exportar datos a CSV
// router.get("/api/reportes/exportar", requireAuth,
const exportar = (req, res) => {
    const { fechaInicio, fechaFin, formato } = req.query;

    let sql = `
        SELECT 
            p.nombre,
            p.ci,
            p.grado,
            p.codigo,
            p.fecha_prestamo,
            p.fecha_devolucion,
            p.observaciones,
            CASE 
                WHEN p.fecha_devolucion IS NULL THEN 'Pendiente'
                ELSE 'Devuelto'
            END as estado_prestamo
        FROM prestamos p
        WHERE 1=1
    `;
    const params = [];

    if (fechaInicio) {
        sql += " AND DATE(p.fecha_prestamo) >= ?";
        params.push(fechaInicio);
    }
    if (fechaFin) {
        sql += " AND DATE(p.fecha_prestamo) <= ?";
        params.push(fechaFin);
    }

    sql += " ORDER BY p.fecha_prestamo DESC";

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error("Error al exportar:", err);
            return res.status(500).json({ error: "Error del servidor" });
        }

        if (formato === "csv") {
            // Generar CSV
            const headers = [
                "Nombre",
                "CI",
                "Grado",
                "Código Quipus",
                "Fecha Préstamo",
                "Fecha Devolución",
                "Observaciones",
                "Estado",
            ];
            let csv = headers.join(",") + "\n";

            rows.forEach((row) => {
                const fila = [
                    `"${row.nombre}"`,
                    `"${row.ci}"`,
                    `"${row.grado}"`,
                    `"${row.codigo}"`,
                    `"${new Date(row.fecha_prestamo).toLocaleDateString()}"`,
                    `"${
                        row.fecha_devolucion
                            ? new Date(
                                  row.fecha_devolucion
                              ).toLocaleDateString()
                            : ""
                    }"`,
                    `"${row.observaciones || ""}"`,
                    `"${row.estado_prestamo}"`,
                ];
                csv += fila.join(",") + "\n";
            });

            res.setHeader("Content-Type", "text/csv");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename=reporte_prestamos_${
                    new Date().toISOString().split("T")[0]
                }.csv`
            );
            res.send(csv);
        } else {
            // JSON por defecto
            res.json(rows);
        }
    });
};

// Obtener lista de grados únicos para filtros
// router.get("/api/grados", requireAuth,
const obtenerGrados = (req, res) => {
    db.all(
        "SELECT DISTINCT grado FROM prestamos ORDER BY grado",
        (err, rows) => {
            if (err) {
                console.error("Error al obtener grados:", err);
                return res.status(500).json({ error: "Error del servidor" });
            }
            res.json(rows.map((row) => row.grado));
        }
    );
};

module.exports = {
    reporteAvanzado,
    metricasUso,
    exportar,
    obtenerGrados,
};
