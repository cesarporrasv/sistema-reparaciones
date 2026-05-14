require('dotenv').config();

const bcrypt = require('bcrypt');
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function crearUsuario() {

    const passwordPlano = '090611';

    const hash = await bcrypt.hash(passwordPlano, 10);

    const sql = `
    INSERT INTO usuarios
    (username, password, rol)
    VALUES (?, ?, ?)
  `;

    db.query(
        sql,
        ['cesar tecnico', hash, 'admin'],
        (err) => {

            if (err) {
                console.error(err);
                return;
            }

            console.log('Usuario creado');

            process.exit();
        }
    );
}

crearUsuario();