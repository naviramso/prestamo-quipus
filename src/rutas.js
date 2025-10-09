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
const { requireAuth, redirectIfAuthenticated } = require("./middleware");

router.get("/", redirectIfAuthenticated, (req, res) => {
    res.render("auth/login", { title: "Login", layout: false });
});

router.get("/admin/dashboard", requireAuth, (req, res) => {
    console.log(req.session.admin);
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

// API LOGIN
router.post("/admin/login", (req, res) => {
    validarAdministrador(req, res);
});

// ===== API LOGOUT =====
router.post("/admin/logout", requireAuth, (req, res) => {
    logout(req, res);
});

router.get("/api/estadisticas", requireAuth, obtenerEstadisticas);

router.get("/api/prestamos-por-dia", requireAuth, obtenerPrestamosPorDia);

//API QUIPUS
router.post("/api/quipus/registrar", requireAuth, registrar);
router.get("/api/quipus", requireAuth, obtenerTodos);
router.get("/api/quipus/:codigo", requireAuth, obtenerPorCodigo);
router.put("/api/quipus/:codigo/estado", requireAuth, actualizarEstado);
router.delete("/api/quipus/:codigo", requireAuth, eliminar);

module.exports = router;
