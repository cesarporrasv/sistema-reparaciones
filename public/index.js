require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// conexión a MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.error('Error conectando:', err);
    return;
  }
  console.log('Conectado a MySQL');
});

// endpoint para buscar por IMEI
app.get('/buscar', (req, res) => {

  const { imei } = req.query;

  const sql = `
    SELECT 
      e.id,
      e.imei,
      e.equipo,
      e.fecha_ingreso,
      e.tecnico,
      e.estado,

      GROUP_CONCAT(r.tipo_reparacion SEPARATOR ', ') AS reparaciones

    FROM equipos e

    LEFT JOIN reparaciones r
      ON e.id = r.equipo_id

    WHERE e.imei LIKE ?

    GROUP BY e.id

    ORDER BY e.fecha_ingreso DESC
  `;

  db.query(sql, [`%${imei}%`], (err, results) => {

    if (err) {
      console.error(err);
      return res.status(500).send('Error');
    }

    res.json(results);

  });

});

app.listen(process.env.PORT, () => {
  console.log('Servidor corriendo');
});

// endpoint para guardar reparación
app.post('/equipos', (req, res) => {
  const {
    imei,
    equipo,
    fecha_ingreso,
    tecnico,
    estado,
    reparaciones
  } = req.body;

  // ✅ Validaciones
  if (!imei || !equipo || !tecnico || !fecha_ingreso) {
    return res.status(400).send('Datos incompletos');
  }

  if (!reparaciones || reparaciones.length === 0) {
    return res.status(400).send('Debes agregar al menos una reparación');
  }

  // ✅ Guardar equipo
  const sqlEquipo = `
    INSERT INTO equipos (
      imei,
      equipo,
      fecha_ingreso,
      tecnico,
      estado
    )
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sqlEquipo,
    [imei, equipo, fecha_ingreso, tecnico, estado],
    (err, result) => {

      if (err) {
        console.error(err);
        return res.status(500).send('Error al guardar equipo');
      }

      // ID del equipo recién creado
      const equipoId = result.insertId;

      // ✅ Preparar reparaciones
      const valores = reparaciones.map(reparacion => [
        equipoId,
        reparacion
      ]);

      // ✅ Guardar reparaciones
      const sqlReparaciones = `
        INSERT INTO reparaciones (
          equipo_id,
          tipo_reparacion
        )
        VALUES ?
      `;

      db.query(sqlReparaciones, [valores], (err) => {

        if (err) {
          console.error(err);
          return res.status(500).send('Error al guardar reparaciones');
        }

        res.send('Equipo y reparaciones guardados correctamente');
      });
    }
  );
});

// endpoint toogle estado
app.put('/equipos/:id/toggle', (req, res) => {

  const { id } = req.params;

  const sql = `
    UPDATE equipos
    SET estado = CASE
      WHEN estado = 'DEBE' THEN 'OK'
      ELSE 'DEBE'
    END
    WHERE id = ?
  `;

  db.query(sql, [id], (err, result) => {

    if (err) {
      console.error(err);
      return res.status(500).send('Error al actualizar');
    }

    res.send('Estado actualizado');

  });

});

// endpoint para listar pendientes
app.get('/pendientes', (req, res) => {

  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const sql = `
    SELECT 
      e.id,
      e.imei,
      e.equipo,
      e.fecha_ingreso,
      e.tecnico,
      e.estado,

      GROUP_CONCAT(r.tipo_reparacion SEPARATOR ', ') AS reparaciones

    FROM equipos e

    LEFT JOIN reparaciones r
      ON e.id = r.equipo_id

    WHERE e.estado = 'DEBE'

    GROUP BY e.id

    ORDER BY e.fecha_ingreso DESC

    LIMIT ? OFFSET ?
  `;

  const totalSql = `
    SELECT COUNT(*) AS total
    FROM equipos
    WHERE estado = 'DEBE'
  `;

  db.query(totalSql, (err, totalResult) => {

    if (err) {
      console.error(err);
      return res.status(500).send('Error');
    }

    const total = totalResult[0].total;

    db.query(sql, [limit, offset], (err, results) => {

      if (err) {
        console.error(err);
        return res.status(500).send('Error');
      }

      res.json({
        data: results,
        total,
        totalPages: Math.ceil(total / limit)
      });

    });

  });

});

// endpoint para filtrar por técnico
app.get('/tecnico/:nombre', (req, res) => {

  const { nombre } = req.params;

  const sql = `
    SELECT 
      e.id,
      e.imei,
      e.equipo,
      e.fecha_ingreso,
      e.tecnico,
      e.estado,

      GROUP_CONCAT(r.tipo_reparacion SEPARATOR ', ') AS reparaciones

    FROM equipos e

    LEFT JOIN reparaciones r
      ON e.id = r.equipo_id

    WHERE e.tecnico = ?

    GROUP BY e.id

    ORDER BY e.fecha_ingreso DESC
  `;

  db.query(sql, [nombre], (err, results) => {

    if (err) {
      console.error(err);
      return res.status(500).send('Error');
    }

    res.json(results);

  });

});

// endpoint para resumen de pendientes y entregados
app.get('/resumen', (req, res) => {
  const sql = `
    SELECT 
      SUM(estado = 'DEBE') AS pendientes,
      SUM(estado = 'OK') AS entregados
    FROM equipos
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error');
    }

    res.json(result[0]);
  });
});

// endpoint para editar orden de reparación
app.put('/equipos/:id', (req, res) => {

  const { id } = req.params;

  const {
    imei,
    equipo,
    fecha_ingreso,
    tecnico,
    estado,
    reparaciones
  } = req.body;

  const sqlEquipo = `
    UPDATE equipos
    SET
      imei = ?,
      equipo = ?,
      fecha_ingreso = ?,
      tecnico = ?,
      estado = ?
    WHERE id = ?
  `;

  db.query(
    sqlEquipo,
    [imei, equipo, fecha_ingreso, tecnico, estado, id],
    (err) => {

      if (err) {
        console.error(err);
        return res.status(500).send('Error actualizando equipo');
      }

      // eliminar reparaciones anteriores
      const deleteSql = `
        DELETE FROM reparaciones
        WHERE equipo_id = ?
      `;

      db.query(deleteSql, [id], (err) => {

        if (err) {
          console.error(err);
          return res.status(500).send('Error eliminando reparaciones');
        }

        // insertar nuevas
        const valores = reparaciones.map(r => [id, r]);

        const insertSql = `
          INSERT INTO reparaciones
          (equipo_id, tipo_reparacion)
          VALUES ?
        `;

        db.query(insertSql, [valores], (err) => {

          if (err) {
            console.error(err);
            return res.status(500).send('Error insertando reparaciones');
          }

          res.send('Equipo actualizado');

        });

      });

    }
  );

});

// enpoint para filtros combinados
app.get('/filtros', (req, res) => {

  const {
    tecnico,
    estado,
    reparacion,
    page = 1
  } = req.query;

  const limit = 10;
  const offset = (page - 1) * limit;

  let whereSql = ` WHERE 1 = 1 `;
  const params = [];

  if (tecnico) {
    whereSql += ` AND e.tecnico = ?`;
    params.push(tecnico);
  }

  if (estado) {
    whereSql += ` AND e.estado = ?`;
    params.push(estado);
  }

  if (reparacion) {
    whereSql += ` AND r.tipo_reparacion = ?`;
    params.push(reparacion);
  }

  const sql = `
    SELECT
      e.id,
      e.imei,
      e.equipo,
      e.fecha_ingreso,
      e.tecnico,
      e.estado,

      GROUP_CONCAT(r.tipo_reparacion SEPARATOR ', ') AS reparaciones

    FROM equipos e

    LEFT JOIN reparaciones r
      ON e.id = r.equipo_id

    ${whereSql}

    GROUP BY e.id

    ORDER BY e.fecha_ingreso DESC

    LIMIT ? OFFSET ?
  `;

  const totalSql = `
    SELECT COUNT(DISTINCT e.id) AS total

    FROM equipos e

    LEFT JOIN reparaciones r
      ON e.id = r.equipo_id

    ${whereSql}
  `;

  db.query(totalSql, params, (err, totalResult) => {

    if (err) {
      console.error(err);
      return res.status(500).send('Error');
    }

    const total = totalResult[0].total;

    db.query(
      sql,
      [...params, limit, offset],
      (err, results) => {

        if (err) {
          console.error(err);
          return res.status(500).send('Error');
        }

        res.json({
          data: results,
          totalPages: Math.ceil(total / limit),
          total
        });

      }
    );

  });

});

// endpoint para estadisticas por tecnico
app.get('/estadisticas/reparaciones', (req, res) => {

  const { tecnico } = req.query;

  let sql = `
    SELECT
      e.tecnico,
      r.tipo_reparacion,
      COUNT(*) AS total

    FROM reparaciones r

    JOIN equipos e
      ON r.equipo_id = e.id

    WHERE e.fecha_ingreso >=
      CURDATE() - INTERVAL 1 MONTH
  `;

  const params = [];

  if (tecnico) {
    sql += ` AND e.tecnico = ?`;
    params.push(tecnico);
  }

  sql += `
    GROUP BY
      e.tecnico,
      r.tipo_reparacion

    ORDER BY total DESC
  `;

  db.query(sql, params, (err, results) => {

    if (err) {
      console.error(err);
      return res.status(500).send('Error');

    }

    res.json(results);

  });

});