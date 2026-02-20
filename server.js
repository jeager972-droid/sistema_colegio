const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const excel = require('exceljs');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'colegio2026!!',
  database: 'sistema_colegio',
  port: 3306
});

db.connect(err => {
  if (err) console.error("Error DB:", err);
  else console.log("Base de datos conectada");
});


// ================= LOGIN =================
app.post('/login', (req, res) => {

  const { document_number, password } = req.body;

  db.query(
    `SELECT users.*, roles.name AS role_name
     FROM users
     JOIN roles ON users.role_id = roles.id
     WHERE document_number=? AND password_hash=? AND is_active=TRUE`,
    [document_number, password],
    (err, result) => {

      if (err || result.length === 0)
        return res.json({ success:false });

      const user = result[0];

      res.json({
        success:true,
        dashboard: user.role_name === 'teacher'
          ? '/teacher.html'
          : '/student.html',
        user_id: user.id
      });
    }
  );
});


// ================= LISTAR ESTUDIANTES =================
app.get('/students/list', (req, res) => {

  db.query(
    `SELECT s.id,
            s.full_name,
            a.ti_est,
            a.birth_date_est,
            a.phone_est,
            a.eps_est,
            a.mom_name,
            a.phone_mon,
            a.cc_mom
     FROM students s
     LEFT JOIN additional_inf_est a
     ON s.id = a.student_id
     WHERE s.classroom_id = ?`,
    [req.query.classroom_id],
    (err, result) => {
      if (err) return res.json([]);
      res.json(result);
    }
  );
});


// ================= OBTENER INFO =================
app.get('/info/get', (req, res) => {

  db.query(
    "SELECT * FROM additional_inf_est WHERE student_id=?",
    [req.query.student_id],
    (err, result) => {

      if (err) return res.json({ success:false });

      if (result.length === 0)
        return res.json({ success:true, info:null });

      res.json({ success:true, info:result[0] });
    }
  );
});


// ================= GUARDAR =================
// ================= GUARDAR =================
app.post('/info/save', (req, res) => {
  const {
    student_id,
    ti_est,
    birth_date_est,
    phone_est,
    eps_est,
    mom_name,
    phone_mon,
    cc_mom
  } = req.body;

  if (!student_id) {
    return res.json({ success: false, message: 'student_id requerido' });
  }

  db.query(
    "SELECT student_id FROM additional_inf_est WHERE student_id=?",
    [student_id],
    (err, result) => {
      if (err) {
        console.error('Error en check existencia:', err);
        return res.json({ success: false });
      }

      if (result.length > 0) {
        // UPDATE
        db.query(
          `UPDATE additional_inf_est SET
            ti_est=?, birth_date_est=?, phone_est=?, eps_est=?,
            mom_name=?, phone_mon=?, cc_mom=?
           WHERE student_id=?`,
          [ti_est, birth_date_est, phone_est, eps_est,
           mom_name, phone_mon, cc_mom, student_id],
          (updateErr) => {
            if (updateErr) {
              console.error('Error en UPDATE:', updateErr);
              return res.json({ success: false });
            }
            res.json({ success: true });
          }
        );
      } else {
        // INSERT
        db.query(
          `INSERT INTO additional_inf_est
          (student_id, ti_est, birth_date_est, phone_est,
           eps_est, mom_name, phone_mon, cc_mom)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [student_id, ti_est, birth_date_est,
           phone_est, eps_est,
           mom_name, phone_mon, cc_mom],
          (insertErr) => {
            if (insertErr) {
              console.error('Error en INSERT:', insertErr);
              return res.json({ success: false });
            }
            res.json({ success: true });
          }
        );
      }
    }
  );
});


// ================= EXPORTAR =================
app.get('/export/excel', async (req, res) => {

  db.query(
    `SELECT s.full_name,
            a.ti_est,
            a.birth_date_est,
            a.phone_est,
            a.eps_est,
            a.mom_name,
            a.phone_mon,
            a.cc_mom
     FROM students s
     LEFT JOIN additional_inf_est a
     ON s.id = a.student_id`,
    async (err, rows) => {

      const workbook = new excel.Workbook();
      const sheet = workbook.addWorksheet('Estudiantes');

      sheet.columns = [
        { header:'Nombre', key:'full_name' },
        { header:'TI', key:'ti_est' },
        { header:'Nacimiento', key:'birth_date_est' },
        { header:'Teléfono Est.', key:'phone_est' },
        { header:'EPS', key:'eps_est' },
        { header:'Acudiente', key:'mom_name' },
        { header:'Tel. Acudiente', key:'phone_mon' },
        { header:'CC Acudiente', key:'cc_mom' }
      ];

      sheet.addRows(rows);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      res.setHeader(
        'Content-Disposition',
        'attachment; filename=estudiantes.xlsx'
      );

      await workbook.xlsx.write(res);
      res.end();
    }
  );
});

app.listen(3000, () =>
  console.log("Servidor en http://localhost:3000")
);
