// require('dotenv').config();

// const xlsx = require('xlsx');
// const mysql = require('mysql2');

// // conexión MySQL
// const db = mysql.createConnection({
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME
// });

// // leer Excel
// const workbook = xlsx.readFile('./import/datos.xlsx');

// const sheetName = workbook.SheetNames[0];

// const data = xlsx.utils.sheet_to_json(
//     workbook.Sheets[sheetName]
// );

// console.log('Filas encontradas:', data.length);

// // convertir fechas
// function convertirFechaExcel(numeroExcel) {

//     const fecha = new Date(
//         (numeroExcel - 25569) * 86400 * 1000
//     );

//     return fecha.toISOString().split('T')[0];
// }

// // recorrer filas
// data.forEach((fila) => {

//     const imei = fila.imei?.toString().trim();

//     const equipo = fila.equipo || 'Sin modelo';

//     const tecnico = fila.tecnico || 'Sin técnico';

//     const estado = fila.estado || 'DEBE';

//     const fecha_ingreso =
//         fila.fecha_ingreso
//             ? convertirFechaExcel(fila.fecha_ingreso)
//             : new Date().toISOString().split('T')[0];

//     // separar reparaciones
//     const reparaciones =
//         fila.reparaciones
//             ?.split(',')
//             .map(r => r.trim())
//             .filter(r => r);

//     if (!imei || !reparaciones?.length) {

//         console.log('Fila inválida:', fila);

//         return;
//     }

//     // insertar equipo
//     const sqlEquipo = `
//     INSERT INTO equipos
//     (
//       imei,
//       equipo,
//       fecha_ingreso,
//       tecnico,
//       estado
//     )
//     VALUES (?, ?, ?, ?, ?)
//   `;

//     db.query(
//         sqlEquipo,
//         [
//             imei,
//             equipo,
//             fecha_ingreso,
//             tecnico,
//             estado
//         ],
//         (err, result) => {

//             if (err) {
//                 console.error('Error equipo:', err);

//                 return;
//             }

//             const equipoId = result.insertId;

//             // preparar reparaciones
//             const valores = reparaciones.map(rep => [
//                 equipoId,
//                 rep
//             ]);

//             const sqlReparaciones = `
//         INSERT INTO reparaciones
//         (
//           equipo_id,
//           tipo_reparacion
//         )
//         VALUES ?
//       `;

//             db.query(
//                 sqlReparaciones,
//                 [valores],
//                 (err) => {

//                     if (err) {
//                         console.error(
//                             'Error reparaciones:',
//                             err
//                         );

//                         return;
//                     }

//                     console.log(
//                         `Importado IMEI ${imei}`
//                     );

//                 }
//             );

//         }
//     );

// });