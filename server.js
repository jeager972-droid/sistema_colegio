const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 SERVIR ARCHIVOS ESTÁTICOS (HTML, imágenes, etc.)
app.use(express.static(__dirname));


// =====================
// CONEXIÓN BASE DE DATOS
// =====================
const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'colegio2026!!', // tu contraseña
  database: 'sistema_colegio',
  port: 3306
});

db.connect(err => {
  if (err) {
    console.error("Error conectando DB:", err);
  } else {
    console.log("Base de datos conectada");
  }
});


// =====================
// LOGIN
// =====================
app.post('/login', (req, res) => {

  const { document_number, password } = req.body;

  db.query(
    `SELECT users.*, roles.name as role_name
     FROM users
     JOIN roles ON users.role_id = roles.id
     WHERE document_number=? AND password_hash=? AND is_active=TRUE`,
    [document_number, password],
    (err, result) => {

      if (err) {
        console.error(err);
        return res.json({ success:false, message:"Error servidor" });
      }

      if (result.length === 0) {
        return res.json({ success:false, message:"Credenciales incorrectas" });
      }

      const user = result[0];

      let dashboard = '/student.html';
      if (user.role_name === 'teacher') {
        dashboard = '/teacher.html';
      }

      res.json({
        success: true,
        dashboard: dashboard,
        user_id: user.id
      });

    }
  );
});


// =====================
// GUARDAR INFORMACIÓN ADICIONAL
// =====================
app.post('/info/add', (req, res) => {

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

  db.query(
    `INSERT INTO additional_inf_est 
     (student_id, ti_est, birth_date_est, phone_est, eps_est, mom_name, phone_mon, cc_mom)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [student_id, ti_est, birth_date_est, phone_est, eps_est, mom_name, phone_mon, cc_mom],
    (err) => {

      if (err) {
        console.error(err);
        return res.json({ success:false, message:"Error guardando" });
      }

      res.json({ success:true });
    }
  );
});


// =====================
// LISTAR ESTUDIANTES
// =====================
app.get('/students/list', (req, res) => {

  const classroom_id = req.query.classroom_id;

  db.query(
    `SELECT students.id, students.full_name as name, additional_inf_est.ti_est
     FROM students
     LEFT JOIN additional_inf_est 
     ON students.id = additional_inf_est.student_id
     WHERE students.classroom_id = ?`,
    [classroom_id],
    (err, result) => {

      if (err) {
        console.error(err);
        return res.json([]);
      }

      res.json(result);
    }
  );
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// =====================
app.listen(3000, () => {
  console.log("Servidor en http://localhost:3000");
});
