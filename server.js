require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const db = require('./db');

const app = express();

app.use(cors({
  origin: "*"
}));

app.use(express.json());

// ✅ LOGIN
app.post('/login', async (req,res)=>{
  const {username,password} = req.body;

  const result = await db.query(
    'SELECT * FROM users WHERE username=$1',
    [username]
  );

  const user = result.rows[0];
  if(!user) return res.sendStatus(401);

  if(password !== user.password) return res.sendStatus(401);

  const token = jwt.sign(
    {id:user.id, username:user.username},
    process.env.JWT_SECRET || 'secret'
  );

  res.json({token});
});

// ✅ AUTH
function auth(req,res,next){
  const token = req.headers.authorization?.replace("Bearer ","");
  if(!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err,user)=>{
    if(err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// ✅ STATS
app.get('/stats', auth, async (req,res)=>{
  const open = await db.query("SELECT COUNT(*) FROM tickets WHERE status='Open'");
  const closed = await db.query("SELECT COUNT(*) FROM tickets WHERE status='Closed'");

  res.json({
    open: open.rows[0].count,
    closed: closed.rows[0].count
  });
});

// ✅ TICKETS
app.get('/tickets', auth, async (req,res)=>{
  const result = await db.query('SELECT * FROM tickets ORDER BY id DESC');
  res.json(result.rows);
});

app.put('/tickets/:id', auth, async (req,res)=>{
  const {status} = req.body;

  await db.query(
    'UPDATE tickets SET status=$1 WHERE id=$2',
    [status, req.params.id]
  );

  res.json({ok:true});
});

app.listen(process.env.PORT || 3000, ()=>{
  console.log("Server running");
});
