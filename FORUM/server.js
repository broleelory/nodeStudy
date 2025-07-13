const express = require('express')
const app = express()
const methodOverride = require('method-override')

//passport 라이브러리 사용!
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')

app.use(passport.initialize())
app.use(session({
  secret: '암호화에 쓸 비번',
  resave : false,
  saveUninitialized : false
}))

app.use(passport.session()) 


app.use(methodOverride('method'))
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
app.get('/list/:num', async (req, res) => {
  try {
    const page = parseInt(req.params.num) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const totalCount = await db.collection('post').countDocuments();
    const totalPages = Math.ceil(totalCount / limit);

    const result = await db.collection('post')
      .find({})
      .sort({ _id: -1 }) // -1 = 최신글부터 1 = 반대
      .skip(skip)
      .limit(limit)
      .toArray();

    res.render('list.ejs', {
      posts: result,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('서버 오류');
  }
});


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
  try{
    console.log(req.params)
    let result = await db.collection('post').findOne({_id: new ObjectId(req.params.id)})
    console.log(result)
    res.render('detail.ejs',{postDetail:result})

  } catch(err){
    console.error(err);
    res.status(404).send('해당 게시글을 찾지 못했습니다');
  }
})

//수정페이지 만들기
app.get('/edit/:id', async(req,res)=>{
  // console.log(req.params.id)
  try{
    let result = await db.collection('post').findOne({_id : new ObjectId(req.params.id)})
    console.log(result)
    res.render('edit.ejs',{post:result})
  } catch(err){
    console.error(err);
    res.status(404).send('해당 게시글을 찾지 못했습니다');
  }
})

//수정하기
app.post('/edit',async(req,res)=>{
  //수정해보자
  console.log('버튼누른겟요청',req.body)
   let result = await db.collection('post').updateOne({_id : new ObjectId(req.body.id)},{$set:{title:req.body.title, content:req.body.content           
   }})
   console.log(result)
  res.redirect('/list')
})

//가입기능

//passport라이브러리 사용
passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
  let result = await db.collection('user').findOne({ username : 입력한아이디})
  if (!result) {
    return cb(null, false, { message: '아이디 DB에 없음' })
  }
  if (result.password == 입력한비번) {
    return cb(null, result)
  } else {
    return cb(null, false, { message: '비번불일치' });
  }
}))


//로그인 기능
app.get('/login',async(req,res)=>{
  res.render('login.ejs')
})

//로그인 요청!?
app.post('/login',async(req,res,next)=>{
  
  passport.authenticate('local',(error, user, info)=> {
    if(error) return res.status(500).json(error)
    if(!user) return res.status(401).json(info.message)
      req.logIn(user, (err)=>{
        if(err) return next(err)
        res.redirect('/')
     })

  })(req,res,next) //아이디/비번을 DB와 비교

})