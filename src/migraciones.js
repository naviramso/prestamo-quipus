const db = require("./database");
// Crear tablas si no existen
db.serialize(() => {
    console.log("Creando tablas...");
    db.run(
        `CREATE TABLE IF NOT EXISTS quipus (
    codigo TEXT PRIMARY KEY,
    estado TEXT DEFAULT 'disponible',
    fecha_registro DATETIME DEFAULT CURRENT_DATE
  )`,
        (err) => {
            if (err) {
                console.error("Error al crear la tabla 'quipus':", err);
            }
            console.log("Tabla 'quipus' creada");
        }
    );

    db.run(
        `CREATE TABLE IF NOT EXISTS prestamos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    ci TEXT,
    grado TEXT,
    codigo TEXT,
    fecha_prestamo TEXT,
    fecha_devolucion TEXT,
    observaciones TEXT,
    FOREIGN KEY (codigo) REFERENCES quipus(codigo)
  )`,
        (err) => {
            if (err) {
                console.error("Error al crear la tabla 'prestamos':", err);
            }
            console.log("Tabla 'prestamos' creada");
        }
    );

    db.run(
        `
    CREATE TABLE IF NOT EXISTS estudiantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      ci TEXT UNIQUE,
      grado TEXT
    )`,
        (err) => {
            if (err) {
                console.error("Error al crear la tabla 'estudiantes':", err);
            }
            console.log("Tabla 'estudiantes' creada");
        }
    );

    db.run(
        `CREATE TABLE IF NOT EXISTS administradores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT,
      username TEXT UNIQUE,
      rol TEXT DEFAULT 'admin',
      contrasenia TEXT
    )`,
        (err) => {
            if (err) {
                console.error(
                    "Error al crear la tabla 'administradores':",
                    err.message
                );
            }
            console.log("Tabla 'administradores' creada");
        }
    );

    db.run(
        `INSERT INTO administradores (nombre, username, contrasenia) VALUES ('Administrador', 'admin', 'password')`,
        (err) => {
            if (err) {
                console.error(
                    "Error al crear el administrador 'admin':",
                    err.errno === 19
                        ? "El administrador 'admin' ya existe"
                        : err.message
                );
            }
            console.log("Administrador 'admin' creado");
        }
    );

    db.run(
        `INSERT INTO
    quipus (codigo, estado)
VALUES (41031, 'disponible'),
    (41048, 'disponible'),
    (41052, 'disponible'),
    (41091, 'disponible'),
    (41094, 'disponible'),
    (41095, 'disponible'),
    (41136, 'disponible'),
    (41141, 'disponible'),
    (41145, 'disponible'),
    (41146, 'disponible'),
    (41148, 'disponible'),
    (41161, 'disponible'),
    (41163, 'disponible'),
    (41164, 'disponible'),
    (41166, 'disponible'),
    (41169, 'disponible'),
    (41179, 'disponible'),
    (41191, 'disponible'),
    (41199, 'disponible'),
    (41200, 'disponible'),
    (41201, 'disponible'),
    (41203, 'disponible'),
    (41208, 'disponible'),
    (41209, 'disponible'),
    (41214, 'disponible'),
    (41218, 'disponible'),
    (41223, 'disponible'),
    (41224, 'disponible'),
    (41226, 'disponible'),
    (41227, 'disponible'),
    (41229, 'disponible'),
    (41231, 'disponible'),
    (41234, 'disponible'),
    (41244, 'disponible'),
    (41245, 'disponible'),
    (41249, 'disponible'),
    (41254, 'disponible'),
    (41257, 'disponible');`,
        (err) => {
            if (err) {
                console.error(
                    "Error al registrar quipus:",
                    err.errno === 19 ? "Quipus ya registrados" : err.message
                );
            }
            console.log("Lista de Quipus registrados");
        }
    );
});
