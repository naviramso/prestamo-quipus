// Middleware para verificar si el usuario está autenticado Y pasar datos a vistas
const requireAuth = (req, res, next) => {
    console.log("Session", req.session);
    if (req.session && req.session.admin) {
        res.locals.admin = req.session.admin;
        next();
    } else {
        res.redirect("/");
    }
};

// Middleware para verificar si ya está autenticado (evitar acceso al login)
const redirectIfAuthenticated = (req, res, next) => {
    if (req.session && req.session.admin) {
        // Ya está autenticado, redirigir al dashboard
        res.redirect("/admin/dashboard");
    } else {
        next();
    }
};

module.exports = { requireAuth, redirectIfAuthenticated };
