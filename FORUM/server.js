const express = require('express')
const app = express()
//정적 파일들 public에 넣어서 사용
app.use(express.static(__dirname + '/public'))

// ejs셋팅 하는 코드 ejs파일들은 views폴더에 넣는게 국룰
app.set('view engine','ejs')

//요청.body 쓰려면 이거 필요
app.use(express.json())
app.use(express.urlencoded({extended:true}))


// 몽고db 연결 코드
const { MongoClient,ObjectId } = require('mongodb')

let db
const url = 'mongodb+srv://admin:qwer1234@cluster0.9gc9v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
new MongoClient(url).connect().then((client)=>{
  console.log('DB연결성공')
  db = client.db('forum')
    //db연결 되고 나서 서버 띄우는게 좋은 관습이다
  app.listen(8080, ()=> {
    console.log('http://localhost:8080에서 서버 실행중')
})
}).catch((err)=>{
  console.log(err)
})



app.get('/', (req,res) =>{
    res.send('반갑습니다')
})

app.get('/main', (req,res) =>{
    res.sendFile(__dirname + '/index.html')
})

app.get('/news', (req,res) =>{
    db.collection('post').insertOne({title : '어쩌구'})
    // res.sendFile(__dirname + '/index.html')
})

//db에 있는 모든 도큐먼트 뽑아내기
app.get('/list', async(req,res) =>{
    let result = await db.collection('post').find().toArray()
    // console.log(result)

    //ejs파일은 기본 경로가 views폴더라서 이렇게 써도 됨
    // post라는 이름으로 result들을 보낸다
    res.render('list.ejs',{posts : result})
    // res.sendFile(__dirname + '/index.html')
})

app.get('/time', (req,res) =>{
   const time = new Date()
   console.log(time)
    res.render('Ex01Time.ejs',{time:time})
})

app.get('/write',(req,res)=>{
  res.render('write.ejs')
})


// 글 저장 라우터
app.post('/add', async (req, res) => {
  const {title,content} = req.body
  
  //입력값 검사
  if(title=='' || content==''){
    res.send('공백은 에바지')
  }else{
    try {
      const post = await db.collection('post');
      console.log(title,content)
      await post.insertOne({ title: title, content: content });
      res.redirect('/list');
    } catch (err) {
      console.error(err);
      res.status(500).send('서버 오류');
    }
  }
});

//게시글 상세 페이지
app.get('/detail/:id', async(req,res)=>{
  console.log(req.params)
  let result = await db.collection('post').findOne({_id: new ObjectId(req.params.id)})
  console.log(result)
  res.render('detail.ejs',{postDetail:result})
})
