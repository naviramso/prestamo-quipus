const router = require("express").Router();

const {
    validarAdministrador,
    logout,
    obtenerEstadisticas,
    obtenerPrestamosPorDia,
} = require("./administradores");

const {
    registrar,
    obtenerTodos,
    obtenerPorCodigo,
    actualizarEstado,
    eliminar,
} = require("./quipus");

const {
    registrarEstudiante,
    actualizarEstudiante,
    obtenerTodosEstudiantes,
    obtenerPorEstudianteID,
    eliminarEstudiante,
    obtenerConfigGrados,
    promocionarGrados,
    obtenerPrestamosPorEstudiante,
    obtenerHistorialPorEstudiante,
    obtenerEstudiantesConPrestamosActivos,
} = require("./estudiantes");

const {
    registrarPrestamo,
    registrarDevolucion,
    obtenerPrestamosActivos,
    buscarEstudiantes,
    obtenerQuipusDisponibles,
    obtenerEstadisticas2,
} = require("./prestamos");
const { requireAuth, redirectIfAuthenticated } = require("./middleware");

const {
    reporteAvanzado,
    metricasUso,
    exportar,
    obtenerGrados,
} = require("./reportes");

const {
    obtenerAdministradores,
    obtenerPorAdministradorID,
    crearAdministrador,
    actualizarAdministrador,
    eliminarAdministrador,
} = require("./admin");

router.get("/", redirectIfAuthenticated, (req, res) => {
    res.render("auth/login", { title: "Login", layout: false });
});

router.get("/admin/dashboard", requireAuth, (req, res) => {
    res.render("admin/dashboard", {
        title: "Dashboard",
        layout: "layouts/layout-admin.ejs",
        admin: req.session.admin,
    });
});

router.get("/admin/quipus", requireAuth, (req, res) => {
    res.render("admin/quipus/registrar", {
        title: "Quipus",
        layout: "layouts/layout-admin.ejs",
        admin: req.session.admin,
    });
});

router.get("/admin/quipus/lista", requireAuth, (req, res) => {
    res.render("admin/quipus/lista", {
        title: "Quipus",
        layout: "layouts/layout-admin.ejs",
        admin: req.session.admin,
    });
});

router.get("/admin/estudiantes", requireAuth, (req, res) => {
    res.render("admin/estudiantes/registrar", {
        title: "Estudiantes",
        layout: "layouts/layout-admin.ejs",
        admin: req.session.admin,
    });
});

router.get("/admin/estudiantes/lista", requireAuth, (req, res) => {
    res.render("admin/estudiantes/lista", {
        title: "Estudiantes",
        layout: "layouts/layout-admin.ejs",
        admin: req.session.admin,
    });
});

router.get("/admin/prestamos", requireAuth, (req, res) => {
    res.render("admin/prestamos.ejs", {
        title: "Prestamos",
        layout: "layouts/layout-admin.ejs",
        admin: req.session.admin,
    });
});

router.get("/admin/devoluciones", requireAuth, (req, res) => {
    res.render("admin/devoluciones.ejs", {
        title: "Devoluciones",
        layout: "layouts/layout-admin.ejs",
        admin: req.session.admin,
    });
});

router.get("/admin/reportes", requireAuth, (req, res) => {
    res.render("admin/reportes.ejs", {
        title: "Reportes",
        layout: "layouts/layout-admin.ejs",
        admin: req.session.admin,
    });
});

router.get("/admin/administradores/registrar", requireAuth, (req, res) => {
    res.render("admin/administradores/registrar", {
        title: "Administradores",
        layout: "layouts/layout-admin.ejs",
        admin: req.session.admin,
    });
});

router.get("/admin/administradores/lista", requireAuth, (req, res) => {
    res.render("admin/administradores/lista", {
        title: "Administradores",
        layout: "layouts/layout-admin.ejs",
        admin: req.session.admin,
    });
});
// API LOGIN
router.post("/admin/login", (req, res) => {
    validarAdministrador(req, res);
});

// ===== API LOGOUT =====
router.post("/admin/logout", requireAuth, (req, res) => {
    logout(req, res);
});

router.get("/api/estadisticas", requireAuth, obtenerEstadisticas);

router.get("/api/grafico-prestamos", requireAuth, obtenerPrestamosPorDia);

//API QUIPUS
router.post("/api/quipus/registrar", requireAuth, registrar);
router.get("/api/quipus/disponibles", requireAuth, obtenerQuipusDisponibles);
router.get("/api/quipus", requireAuth, obtenerTodos);
router.get("/api/quipus/:codigo", requireAuth, obtenerPorCodigo);
router.put("/api/quipus/:codigo/estado", requireAuth, actualizarEstado);
router.delete("/api/quipus/:codigo", requireAuth, eliminar);

//API ESTUDIANTES
router.post("/api/estudiantes/registrar", requireAuth, registrarEstudiante);

router.get("/api/estudiantes/buscar", requireAuth, buscarEstudiantes);

router.get("/api/estudiantes", requireAuth, obtenerTodosEstudiantes);

router.get("/api/estudiantes/:id", requireAuth, obtenerPorEstudianteID);
router.put("/api/estudiantes/:id", requireAuth, actualizarEstudiante);
router.delete("/api/estudiantes/:id", requireAuth, eliminarEstudiante);
router.get("/api/config/grados", requireAuth, obtenerConfigGrados);
router.post("/api/estudiantes/promocionar", requireAuth, promocionarGrados);
router.get(
    "/api/estudiantes/:id/prestamos",
    requireAuth,
    obtenerPrestamosPorEstudiante
);
router.get(
    "/api/estudiantes/:ci/historial",
    requireAuth,
    obtenerHistorialPorEstudiante
);
router.get(
    "/api/cantidad-prestamos",
    requireAuth,
    obtenerEstudiantesConPrestamosActivos
);

// API PRESTAMOS
router.post("/api/prestamos/registrar", requireAuth, registrarPrestamo);
router.post("/api/devoluciones/registrar", requireAuth, registrarDevolucion);
router.get("/api/prestamos/activos", requireAuth, obtenerPrestamosActivos);
router.get("/api/prestamos/estadisticas", requireAuth, obtenerEstadisticas2);

//API REPORTES
router.get("/api/reportes/avanzado", requireAuth, reporteAvanzado);
router.get("/api/reportes/metricas", requireAuth, metricasUso);
router.get("/api/reportes/exportar", requireAuth, exportar);
router.get("/api/grados", requireAuth, obtenerGrados);

//API ADMINISTRADORES
router.get("/api/administradores", requireAuth, obtenerAdministradores);
router.get("/api/administradores/:id", requireAuth, obtenerPorAdministradorID);
router.post("/api/administradores", requireAuth, crearAdministrador);
router.put("/api/administradores/:id", requireAuth, actualizarAdministrador);
router.delete("/api/administradores/:id", requireAuth, eliminarAdministrador);

module.exports = router;
