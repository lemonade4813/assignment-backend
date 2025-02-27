CREATE TABLE conference (
    conference_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('D', 'A')) NOT NULL,
);

CREATE TABLE thesis (
    thesis_id TEXT PRIMARY KEY,  
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    conference_id TEXT,
    submission_date TEXT,
    post_id TEXT UNIQUE,
    FOREIGN KEY (conference_id) REFERENCES conference(conference_id) ON DELETE CASCADE
);

CREATE TABLE thesis_author (
    thesis_id TEXT,
    author_name TEXT,
    PRIMARY KEY (thesis_id, author_name),
    FOREIGN KEY (thesis_id) REFERENCES thesis(thesis_id)
);

CREATE TABLE post_info (
    post_id TEXT PRIMARY KEY  //게시글 id
    publisher TEXT,   //게시자
    updated_date TEXT,
    FOREIGN KEY (post_id) REFERENCES thesis(post_id) ON DELETE CASCADE
)
