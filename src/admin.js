// ===== CRUD DE ADMINISTRADORES =====
const db = require("./database");
// Obtener todos los administradores
const obtenerAdministradores = (req, res) => {
    // Solo administradores pueden ver la lista complet

    db.all(
        "SELECT id, nombre, username, rol, fecha_creacion FROM administradores ORDER BY fecha_creacion DESC",
        (err, rows) => {
            if (err) {
                console.error("Error al obtener administradores:", err);
                return res.status(500).json({ error: "Error del servidor" });
            }
            res.json(rows);
        }
    );
};

// Obtener administrador por ID
const obtenerPorAdministradorID = (req, res) => {
    const { id } = req.params;
    // Solo administradores pueden ver detalles de otros admins
    if (
        req.session.admin.rol !== "administrador" &&
        req.session.admin.id != id
    ) {
        return res
            .status(403)
            .json({ error: "No tienes permisos para esta acción" });
    }

    db.get(
        "SELECT id, nombre, username, rol, fecha_creacion FROM administradores WHERE id = ?",
        [id],
        (err, row) => {
            if (err) {
                console.error("Error al obtener administrador:", err);
                return res.status(500).json({ error: "Error del servidor" });
            }

            if (!row) {
                return res
                    .status(404)
                    .json({ error: "Administrador no encontrado" });
            }

            res.json(row);
        }
    );
};

// Crear nuevo administrador
const crearAdministrador = (req, res) => {
    // Solo administradores pueden crear nuevos usuarios
    if (req.session.admin.rol !== "administrador") {
        return res
            .status(403)
            .json({ error: "No tienes permisos para crear administradores" });
    }

    const { nombre, username, rol, contrasenia } = req.body;

    // Validaciones
    if (!nombre || !username || !rol || !contrasenia) {
        return res
            .status(400)
            .json({ error: "Todos los campos son requeridos" });
    }

    if (contrasenia.length < 6) {
        return res
            .status(400)
            .json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    // Verificar si el username ya existe
    db.get(
        "SELECT id FROM administradores WHERE username = ?",
        [username],
        (err, row) => {
            if (err) {
                console.error("Error al verificar username:", err);
                return res.status(500).json({ error: "Error del servidor" });
            }

            if (row) {
                return res
                    .status(400)
                    .json({ error: "El nombre de usuario ya existe" });
            }

            // Insertar nuevo administrador
            db.run(
                "INSERT INTO administradores (nombre, username, rol, contrasenia) VALUES (?, ?, ?, ?)",
                [nombre, username, rol, contrasenia],
                function (err) {
                    if (err) {
                        console.error("Error al crear administrador:", err);
                        return res
                            .status(500)
                            .json({ error: "Error al crear el administrador" });
                    }

                    res.json({
                        success: true,
                        mensaje: "Administrador creado exitosamente",
                        id: this.lastID,
                    });
                }
            );
        }
    );
};

// Actualizar administrador
const actualizarAdministrador = (req, res) => {
    const { id } = req.params;
    const { nombre, username, rol, contrasenia } = req.body;

    // Solo administradores pueden modificar otros usuarios
    if (
        req.session.admin.rol !== "administrador" &&
        req.session.admin.id != id
    ) {
        return res
            .status(403)
            .json({ error: "No tienes permisos para esta acción" });
    }

    // Los usuarios "ver" no pueden cambiar su rol
    if (req.session.admin.rol !== "administrador" && rol) {
        return res.status(403).json({ error: "No puedes cambiar tu rol" });
    }

    // Verificar si el username ya existe (excluyendo el actual)
    db.get(
        "SELECT id FROM administradores WHERE username = ? AND id != ?",
        [username, id],
        (err, row) => {
            if (err) {
                console.error("Error al verificar username:", err);
                return res.status(500).json({ error: "Error del servidor" });
            }

            if (row) {
                return res
                    .status(400)
                    .json({ error: "El nombre de usuario ya existe" });
            }

            // Si se está intentando cambiar el rol a "ver", verificar que no sea el último administrador
            if (
                rol &&
                req.session.admin.rol === "administrador" &&
                rol === "ver"
            ) {
                db.get(
                    "SELECT COUNT(*) as count FROM administradores WHERE rol = 'administrador' AND id != ?",
                    [id],
                    (err, row) => {
                        if (err) {
                            console.error(
                                "Error al contar administradores:",
                                err
                            );
                            return res
                                .status(500)
                                .json({ error: "Error del servidor" });
                        }

                        // Si no hay otros administradores, no permitir el cambio
                        if (row.count === 0) {
                            return res.status(400).json({
                                error: "No puedes cambiar el rol a 'ver' porque es el último administrador",
                            });
                        }

                        // Continuar con la actualización
                        procederConActualizacion();
                    }
                );
            } else {
                // Si no se está cambiando el rol a "ver", continuar directamente
                procederConActualizacion();
            }

            function procederConActualizacion() {
                let sql = "UPDATE administradores SET nombre = ?, username = ?";
                const params = [nombre, username];

                if (rol && req.session.admin.rol === "administrador") {
                    sql += ", rol = ?";
                    params.push(rol);
                }

                if (contrasenia) {
                    if (contrasenia.length < 6) {
                        return res.status(400).json({
                            error: "La contraseña debe tener al menos 6 caracteres",
                        });
                    }
                    sql += ", contrasenia = ?";
                    params.push(contrasenia);
                }

                sql += " WHERE id = ?";
                params.push(id);

                db.run(sql, params, function (err) {
                    if (err) {
                        console.error(
                            "Error al actualizar administrador:",
                            err
                        );
                        return res.status(500).json({
                            error: "Error al actualizar el administrador",
                        });
                    }

                    if (this.changes === 0) {
                        return res
                            .status(404)
                            .json({ error: "Administrador no encontrado" });
                    }

                    res.json({
                        success: true,
                        mensaje: "Administrador actualizado exitosamente",
                    });
                });
            }
        }
    );
};

// Eliminar administrador
const eliminarAdministrador = (req, res) => {
    const { id } = req.params;

    // Solo administradores pueden eliminar usuarios
    if (req.session.admin.rol !== "administrador") {
        return res.status(403).json({
            error: "No tienes permisos para eliminar administradores",
        });
    }

    // No permitir eliminarse a sí mismo
    if (req.session.admin.id == id) {
        return res
            .status(400)
            .json({ error: "No puedes eliminar tu propia cuenta" });
    }

    db.run("DELETE FROM administradores WHERE id = ?", [id], function (err) {
        if (err) {
            console.error("Error al eliminar administrador:", err);
            return res
                .status(500)
                .json({ error: "Error al eliminar el administrador" });
        }

        if (this.changes === 0) {
            return res
                .status(404)
                .json({ error: "Administrador no encontrado" });
        }

        res.json({
            success: true,
            mensaje: "Administrador eliminado exitosamente",
        });
    });
};

module.exports = {
    obtenerAdministradores,
    obtenerPorAdministradorID,
    crearAdministrador,
    actualizarAdministrador,
    eliminarAdministrador,
};
