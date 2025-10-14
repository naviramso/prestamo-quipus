const db = require("./database");

// Registrar nuevo quipus
const registrar = (req, res) => {
    const { codigo } = req.body;
    if (!codigo) {
        return res.status(400).json({ error: "El código es requerido" });
    }

    // Verificar si el código ya existe
    db.get(
        "SELECT codigo FROM quipus WHERE codigo = ?",
        [codigo],
        (err, row) => {
            if (err) {
                console.error("Error al verificar quipus:", err);
                return res.status(500).json({ error: "Error del servidor" });
            }

            if (row) {
                return res.status(400).json({ error: "El código ya existe" });
            }

            // Insertar nuevo quipus
            db.run(
                "INSERT INTO quipus (codigo, estado) VALUES (?, 'disponible')",
                [codigo],
                function (err) {
                    if (err) {
                        console.error("Error al registrar quipus:", err);
                        return res
                            .status(500)
                            .json({ error: "Error al registrar el quipus" });
                    }

                    res.json({
                        success: true,
                        mensaje: "Quipus registrado exitosamente",
                        id: this.lastID,
                    });
                }
            );
        }
    );
};

// Obtener todos los quipus
const obtenerTodos = (req, res) => {
    db.all("SELECT * FROM quipus ORDER BY fecha_registro DESC", (err, rows) => {
        if (err) {
            console.error("Error al obtener quipus:", err);
            return res.status(500).json({ error: "Error del servidor" });
        }
        res.json(rows);
    });
};

// Obtener quipus por código
const obtenerPorCodigo = (req, res) => {
    const { codigo } = req.params;

    db.get("SELECT * FROM quipus WHERE codigo = ?", [codigo], (err, row) => {
        if (err) {
            console.error("Error al obtener quipus:", err);
            return res.status(500).json({ error: "Error del servidor" });
        }

        if (!row) {
            return res.status(404).json({ error: "Quipus no encontrado" });
        }

        res.json(row);
    });
};

// Actualizar estado de quipus
const actualizarEstado = (req, res) => {
    const { codigo } = req.params;
    const { estado } = req.body;

    // Validar estado
    const estadosValidos = [
        "disponible",
        "prestado",
        "mantenimiento",
        "inactivo",
    ];
    if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ error: "Estado no válido" });
    }

    db.run(
        "UPDATE quipus SET estado = ? WHERE codigo = ?",
        [estado, codigo],
        function (err) {
            if (err) {
                console.error("Error al actualizar quipus:", err);
                return res
                    .status(500)
                    .json({ error: "Error al actualizar el quipus" });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: "Quipus no encontrado" });
            }

            res.json({
                success: true,
                mensaje: `Estado del quipus actualizado a: ${estado}`,
            });
        }
    );
};

// Eliminar quipus
const eliminar = (req, res) => {
    const { codigo } = req.params;

    // Verificar si el quipus está prestado
    db.get(
        "SELECT * FROM prestamos WHERE codigo = ? AND fecha_devolucion IS NULL",
        [codigo],
        (err, row) => {
            if (err) {
                console.error("Error al verificar préstamos:", err);
                return res.status(500).json({ error: "Error del servidor" });
            }

            if (row) {
                return res.status(400).json({
                    error: "No se puede eliminar un quipus que está prestado",
                });
            }

            // Eliminar el quipus
            db.run(
                "DELETE FROM quipus WHERE codigo = ?",
                [codigo],
                function (err) {
                    if (err) {
                        console.error("Error al eliminar quipus:", err);
                        return res
                            .status(500)
                            .json({ error: "Error al eliminar el quipus" });
                    }

                    if (this.changes === 0) {
                        return res
                            .status(404)
                            .json({ error: "Quipus no encontrado" });
                    }

                    res.json({
                        success: true,
                        mensaje: "Quipus eliminado exitosamente",
                    });
                }
            );
        }
    );
};

module.exports = {
    registrar,
    obtenerTodos,
    obtenerPorCodigo,
    actualizarEstado,
    eliminar,
};
