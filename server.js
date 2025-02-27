const express = require("express");
const { v4: uuidv4 } = require("uuid");
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("database.sqlite");
const app = express();
app.use(express.json()); // JSON 요청 본문을 처리


// 테이블 생성 
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS conference (
            conference_id TEXT PRIMARY KEY,
            conference_name TEXT,
            type TEXT
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS thesis (
            thesis_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            conference_id TEXT,
            submission_date TEXT,
            post_id TEXT,
            FOREIGN KEY(conference_id) REFERENCES conference(conference_id)
            FOREIGN KEY (post_id) REFERENCES thesis(post_id) ON DELETE CASCADE
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS thesis_author (
            thesis_id TEXT,
            author_name TEXT,
            FOREIGN KEY(thesis_id) REFERENCES thesis(thesis_id)
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS post_info (
            post_id TEXT PRIMARY KEY,
            publisher TEXT,
            updated_date TEXT
        )
    `);
});


// 논문 게시글 등록

app.post("/post", (req, res) => {
    const { conference_name, thesis_title, thesis_content, author_name, publisher, type } = req.body;

    const conference_id = uuidv4();
    const thesis_id = uuidv4();
    const post_id = uuidv4();
    const submission_date = "2023-01-01";
    const updated_date = new Date().toISOString().substring(0, 10);

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        db.run(
            `INSERT INTO conference (conference_id, conference_name, type) VALUES (?, ?, ?)`,
            [conference_id, conference_name, type]
        );

        db.run(
            `INSERT INTO thesis (thesis_id, title, content, conference_id, submission_date, post_id) VALUES (?, ?, ?, ?, ?, ?)`,
            [thesis_id, thesis_title, thesis_content, conference_id, submission_date, post_id]
        );

        db.run(
            `INSERT INTO thesis_author (thesis_id, author_name) VALUES (?, ?)`,
            [thesis_id, author_name]
        );

        db.run(
            `INSERT INTO post_info (post_id, publisher, updated_date) VALUES (?, ?, ?)`,
            [post_id, publisher, updated_date],
            function (err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(400).json({ error: err.message });
                }
                db.run("COMMIT");
                res.status(201).json({ message: "게시글 업로드에 성공했습니다. " });
            }
        );
    });
});


// 논문 게시글 전체 조회
app.get('/post', (req, res) => {
    const query = `
        SELECT 
            p.post_id, p.publisher, p.updated_date,
            t.thesis_id, t.title AS thesis_title, 
            t.content AS thesis_content,
            t.submission_date,
            c.conference_id, c.conference_name, c.type AS conference_type
        FROM post_info p
        JOIN thesis t ON p.post_id = t.post_id
        JOIN conference c ON t.conference_id = c.conference_id
        JOIN thesis_author a ON t.thesis_id = a.thesis_id
    `;

    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: '게시글이 존재하지 않습니다.' });
        }
        res.json(rows);
    });
});


// 상세 게시글 조회
app.get("/post/:postId", (req, res) => {
    const { postId } = req.params;
    console.log("Received postId:", postId);

    const query = `
         SELECT 
            p.post_id, p.publisher, p.updated_date,
            t.thesis_id, t.title AS thesis_title, 
            t.content AS thesis_content,
            t.submission_date,
            c.conference_id, c.conference_name, c.type AS conference_type
        FROM post_info p
        JOIN thesis t ON p.post_id = t.post_id
        JOIN conference c ON t.conference_id = c.conference_id
        JOIN thesis_author a ON t.thesis_id = a.thesis_id
        WHERE p.post_id = ?
    `;

    db.get(query, [postId], (err, rows) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "서버 오류가 발생했습니다." });
        }

        if (!rows) {
            return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
        }

        res.json(rows);
    });
});



// 논문 게시글 수정
app.put("/post/:postId", (req, res) => {
    const { postId } = req.params;
    const { thesis_title, thesis_content } = req.body;
    const updated_date = new Date().toISOString().substring(0, 10);

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // thesis_id 조회
        db.get(
            `SELECT t.thesis_id FROM thesis t JOIN post_info p ON t.post_id = p.post_id WHERE p.post_id = ?`,
            [postId],
            (err, row) => {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                }
                if (!row) {
                    db.run("ROLLBACK");
                    return res.status(404).json({ error: "해당 논문이 존재하지 않습니다." });
                }
                
                const thesisId = row.thesis_id;
                
                // thesis 테이블 업데이트
                db.run(
                    `UPDATE thesis SET title = ?, content = ? WHERE thesis_id = ?`,
                    [thesis_title, thesis_content, thesisId],
                    function (err) {
                        if (err) {
                            db.run("ROLLBACK");
                            return res.status(500).json({ error: err.message });
                        }
                        
                        // post_info 테이블 업데이트
                        db.run(
                            `UPDATE post_info SET updated_date = ? WHERE post_id = ?`,
                            [updated_date, postId],
                            function (err) {
                                if (err) {
                                    db.run("ROLLBACK");
                                    return res.status(500).json({ error: err.message });
                                }
                                
                                db.run("COMMIT", (err) => {
                                    if (err) {
                                        db.run("ROLLBACK");
                                        return res.status(500).json({ error: err.message });
                                    }
                                    res.json({ message: "게시글 수정이 완료되었습니다." });
                                });
                            }
                        );
                    }
                );
            }
        );
    });
});

// 게시물 삭제
app.delete("/post/:postId", (req, res) => {
    const { postId } = req.params;
    console.log(postId)

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run(`DELETE FROM thesis WHERE post_id = ?`, [postId], function (err) {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                db.run("ROLLBACK");
                return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
            }
            db.run("COMMIT");
            res.json({ message: "게시글이 삭제 되었습니다." });
        });
    });
});


// 서버 실행
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});