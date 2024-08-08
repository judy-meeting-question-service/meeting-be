const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');

const app = express();
const PORT = 9000;

app.use(bodyParser.json());
app.use(cors({
    origin: 'http://localhost:2000'
}));

// Multer storage 설정
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '.png');
    }
});

const upload = multer({ storage: storage });

const dataFilePath = path.join(__dirname, 'data', 'data.json');
const answersFilePath = path.join(__dirname, 'data', 'answers.json');
const userFilePath = path.join(__dirname, 'data', 'user.json');
if (!fs.existsSync(userFilePath)) {
  fs.writeFileSync(userFilePath, JSON.stringify([]));
}

app.post('/api/user', upload.single('image'), (req, res) => {
    const newUser = {
        id: req.body.id,
        nickname: req.body.nickname,
        password: req.body.password,
        image: req.file ? req.file.path : null,
        createdAt: req.body.createdAt,
        loginTime: req.body.loginTime,
    };
  
    fs.readFile(userFilePath, (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read user file' });
        }
    
        let users = JSON.parse(data);
        const existingUserIndex = users.findIndex(user => user.id === newUser.id);
        
        if (existingUserIndex !== -1) {
            // 기존 사용자가 존재하는 경우 업데이트
            users[existingUserIndex] = { ...users[existingUserIndex], ...newUser };
        } else {
            // 새로운 사용자 추가
            users.push(newUser);
        }
    
        fs.writeFile(userFilePath, JSON.stringify(users, null, 2), err => {
            if (err) {
                return res.status(500).json({ error: 'Failed to save user file' });
            }
            res.json({ success: true });
        });
    });
});

app.get('/api/user/:id', (req, res) => {
    const { id } = req.params;
    console.log(`Received request for user ID: ${id}`);
    
    fs.readFile(userFilePath, (err, data) => {
        if (err) {
            console.error('Failed to read user file:', err);
            return res.status(500).json({ error: 'Failed to read user file' });
        }
  
        const users = JSON.parse(data);
        const user = users.find(u => u.id === id);
    
        if (user) {
            console.log('User found:', user);
            res.json(user);
        } else {
            console.log('User not found');
            res.json({ userFound: false });
        }
    });
});

app.get('/api/questions', (req, res) => {
    fs.readFile(dataFilePath, (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read data file' });
        }
        const questions = JSON.parse(data);
        res.json(questions);
    });
});

app.post('/api/questions', (req, res) => {
    const newQuestion = req.body;
    fs.readFile(dataFilePath, (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read data file' });
        }
        let questions = JSON.parse(data);
        newQuestion.id = questions.length ? questions[questions.length - 1].id + 1 : 1;
        questions.push(newQuestion);
        fs.writeFile(dataFilePath, JSON.stringify(questions, null, 2), err => {
            if (err) {
                return res.status(500).json({ error: 'Failed to save data file' });
            }
            res.json({ success: true });
        });
    });
});

app.put('/api/questions/:id', (req, res) => {
    const { id } = req.params;
    const updatedQuestion = req.body;
    fs.readFile(dataFilePath, (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read data file' });
        }
        let questions = JSON.parse(data);
        const questionIndex = questions.findIndex(q => q.id === parseInt(id));
        if (questionIndex !== -1) {
            questions[questionIndex] = { ...questions[questionIndex], ...updatedQuestion };
            fs.writeFile(dataFilePath, JSON.stringify(questions, null, 2), err => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to save data file' });
                }
                res.json({ success: true });
            });
        } else {
            res.status(404).json({ error: 'Question not found' });
        }
    });
});

app.delete('/api/questions/:id', (req, res) => {
    const { id } = req.params;
    fs.readFile(dataFilePath, (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read data file' });
        }
        let questions = JSON.parse(data);
        questions = questions.filter(q => q.id !== parseInt(id));
        fs.writeFile(dataFilePath, JSON.stringify(questions, null, 2), err => {
            if (err) {
                return res.status(500).json({ error: 'Failed to save data file' });
            }
            res.json({ success: true });
        });
    });
});

app.post('/api/answers', (req, res) => {
    const newAnswer = req.body;
    fs.readFile(answersFilePath, (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read answers file' });
        }
        let answers = JSON.parse(data);
        newAnswer.id = answers.length ? answers[answers.length - 1].id + 1 : 1;
        answers.push(newAnswer);
        fs.writeFile(answersFilePath, JSON.stringify(answers, null, 2), err => {
            if (err) {
                return res.status(500).json({ error: 'Failed to save answers file' });
            }
            res.json({ success: true });
        });
    });
});

app.get('/api/answers/:questionId', (req, res) => {
    const { questionId } = req.params;
    fs.readFile(answersFilePath, (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read answers file' });
        }
        const answers = JSON.parse(data).filter(answer => answer.questionId === parseInt(questionId));
        res.json(answers);
    });
});

app.delete('/api/answers/:id', (req, res) => {
    const { id } = req.params;
    fs.readFile(answersFilePath, (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read answers file' });
        }
        let answers = JSON.parse(data);
        answers = answers.filter(answer => answer.id !== parseInt(id));
        fs.writeFile(answersFilePath, JSON.stringify(answers, null, 2), err => {
            if (err) {
                return res.status(500).json({ error: 'Failed to save answers file' });
            }
            res.json({ success: true });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
