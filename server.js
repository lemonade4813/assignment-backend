const express = require("express");
const { v4: uuidv4 } = require("uuid");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const db = new sqlite3.Database("database.sqlite");
const app = express();

app.use(cors());
app.use(express.json()); // JSON 요청 본문을 처리

// 테이블 생성
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS conference (
            conference_id TEXT PRIMARY KEY,
            conference_name TEXT
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS thesis (
            thesis_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            conference_id TEXT,
            submission_date TEXT,
            type TEXT CHECK(type IN ('A', 'D')),
            post_index INTEGER,
            author_id TEXT,
            FOREIGN KEY(author_id) REFERENCES thesis_author(author_id),
            FOREIGN KEY(post_index) REFERENCES post_info(post_index) ON DELETE CASCADE
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS thesis_author (
            author_id TEXT PRIMARY KEY,
            author_name TEXT
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS post_info (
            post_index INTEGER PRIMARY KEY AUTOINCREMENT,
            publisher TEXT,
            updated_date TEXT
        )
    `);
});

// 논문 게시글 등록
app.post("/post", (req, res) => {
    const { conference_name, title, content, author_name, publisher, type } = req.body;

    const conference_id = uuidv4(); //학술대회 ID 생성
    const thesis_id = uuidv4();  // 논문 ID 생성
    const author_id = uuidv4(); // 저자 ID 생성
    const submission_date = "2023-01-01";
    const updated_date = new Date().toISOString().substring(0, 10);

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        // 컨퍼런스 정보 저장
        db.run(
            `INSERT INTO conference (conference_id, conference_name) VALUES (?, ?)`,
            [conference_id, conference_name],
            function (err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(400).json({ error: err.message });
                }
                console.log(1)
                // post_info 저장 후 생성된 post_index 가져오기
                db.run(
                    `INSERT INTO post_info (publisher, updated_date) VALUES (?, ?)`,
                    [publisher, updated_date],
                    function (err) {
                        if (err) {
                            db.run("ROLLBACK");
                            return res.status(400).json({ error: err.message });
                        }
                        console.log(2)
                        const postIndex = this.lastID;
                        console.log(3)
                        // thesis 테이블에 저장
                        db.run(
                            `INSERT INTO thesis_author (author_id, author_name) VALUES (?, ?)`,
                            [author_id, author_name],
                            function (err) {
                                if (err) {
                                    db.run("ROLLBACK");
                                    return res.status(400).json({ error: err.message });
                                }
                                // thesis_author 저장
                                db.run(
                                    `INSERT INTO thesis (thesis_id, title, content, conference_id, submission_date, type, post_index, author_id) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                                    [thesis_id, title, content, conference_id, submission_date, type, postIndex, author_id],
                                

                                        db.run("COMMIT", (err) => {
                                            if (err) {
                                                db.run("ROLLBACK");
                                                return res.status(500).json({ error: err.message });
                                            }
                                            res.status(201).json({ message: "게시글 업로드에 성공했습니다.", post_index: postIndex });
                                        }));
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });


// 논문 게시글 전체 조회
app.get("/post", (req, res) => {
    const query = `
        SELECT 
            p.post_index,
            t.title,
            t.type,
            t.submission_date,
            c.conference_name
        FROM post_info p
        JOIN thesis t ON p.post_index = t.post_index
        JOIN conference c ON t.conference_id = c.conference_id
        ORDER BY p.post_index DESC
    `;

    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: "게시글이 존재하지 않습니다." });
        }
        res.json(rows);
    });
});

// 상세 게시글 조회
app.get("/post/:postIndex", (req, res) => {
    const { postIndex } = req.params;

    const query = `
        SELECT 
            p.post_index, 
            p.publisher, 
            p.updated_date,
            t.thesis_id, 
            t.title,
            t.content,
            t.type,
            t.submission_date,
            c.conference_id, 
            c.conference_name
        FROM post_info p
        JOIN thesis t ON p.post_index = t.post_index
        JOIN conference c ON t.conference_id = c.conference_id
        WHERE p.post_index = ?
    `;

    db.get(query, [postIndex], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "서버 오류가 발생했습니다." });
        }

        if (!row) {
            return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
        }

        res.json(row);
    });
});

// 논문 게시글 수정
app.put("/post/:postIndex", (req, res) => {
    const { postIndex } = req.params;
    const { title, content } = req.body;
    const updated_date = new Date().toISOString().substring(0, 10);

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        db.run(
            `UPDATE thesis SET title = ?, content = ? WHERE post_index = ?`,
            [title, content, postIndex],
            function (err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                }

                db.run(
                    `UPDATE post_info SET updated_date = ? WHERE post_index = ?`,
                    [updated_date, postIndex],
                    function (err) {
                        if (err) {
                            db.run("ROLLBACK");
                            return res.status(500).json({ error: err.message });
                        }

                        db.run("COMMIT");
                        res.json({ message: "게시글 수정이 완료되었습니다." });
                    }
                );
            }
        );
    });
});

// 게시물 삭제
app.delete("/post/:postIndex", (req, res) => {
    const { postIndex } = req.params;

    db.run(`DELETE FROM post_info WHERE post_index = ?`, [postIndex], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "게시글이 삭제되었습니다." });
    });
});

// 서버 실행
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});