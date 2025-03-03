# 과제 백엔드

💻 개발 환경

- node v18.20.5
- npm v10.8.2
- express v4.21.2
- sqlite3 v5.1.7

💻 실행

```js
node server.js
```

📑 발표논문 페이지 ERD 구조도

![image](https://github.com/user-attachments/assets/4c6375d4-6e08-45fd-8d41-582e3eb069ad)

현재 페이지 번호, 학술대회명, 논문명, 날짜, 비고(국내/해외) 5개 항목만 나와있으나,
논문 저자, 게시자, 게시글에 대한 정보가 필요할 것 같아 위와 같이 테이블을 구성했습니다.

- 1) 게시글 작성시, 등록한 논문 정보를 일반적으로 다시 등록하지 않습니다. (논문 정보와 게시글 정보 테이블은 1:1 식별관계를 갖습니다.)
- 2) 저자는 여러개의 논문을 작성할 수 있고, 각 논문 등록 마다 유일한 논문 코드로 저장됩니다. (논문 저자 정보 테이블과 논문 정보 테이블은 1: N 식별관계를 갖습니다.)

💙 API 정보


현재 localhost:3000로 실행

1) 논문 정보 저장
> url : '/post', method : 'POST'
```js
{
    "conference_name" : "한국대기환경학회",
    "title" : "Efficient Removal of Toluene, p-Xylene VOCs and Pathogen using Mesoporous Al2O3 beads decorated Copper Metal Organic Framework (Cu-CPP) for Air Treatment",
    "content" : "Efficient Removal of Toluene, p-Xylene VOCs and Pathogen using Mesoporous Al2O3 beads decorated Copper Metal Organic Framework (Cu-CPP) for Air Treatment",
    "author_name" : "222",
    "publisher" : "LEE",
    "type" : "D"
}
```

2) 논문 전체 리스트 조회
> url : '/post/', method : 'GET'

3) 논문 상세 조회
> url : '/post/:postIndex', method : 'GET'


4) 논문 수정
> url : '/post/:postIndex', method : 'PUT'
```js
{
    "title" : "Efficient Removal of Toluene, p-Xylene VOCs and Pathogen using Mesoporous Al2O3 beads decorated Copper Metal Organic Framework (Cu-CPP) for Air Treatment",
    "content" : "Efficient Removal of Toluene, p-Xylene VOCs and Pathogen using Mesoporous Al2O3 beads decorated Copper Metal Organic Framework (Cu-CPP) for Air Treatment",
}
```
 
5) 논문 삭제
> url : '/post/:postIndex', method : 'DELETE' 
