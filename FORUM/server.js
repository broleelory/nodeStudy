
const express = require('express')
const app = express()
const methodOverride = require('method-override')
const bcrypt = require('bcrypt')
require('dotenv').config(); //환경변수 설정

//passport 라이브러리 사용!
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const MongoStore = require('connect-mongo')



app.use(passport.initialize())
app.use(session({
  secret: '암호화에 쓸 비번',
  resave : false,
  saveUninitialized : false,
  cookie : {maxAge:60*60*1000}, //쿠키 1시간 유지
  store : MongoStore.create({
    mongoUrl : process.env.DB_URL,
    dbName : 'forum'
  })
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
app.use('/list',(req,res,next)=>{//list로 시작하는 API로 요청시 현재시간 터미널에 출력
  console.log(new Date())
  next()
})

// 몽고db 연결 코드
const { MongoClient,ObjectId } = require('mongodb')

let db
const url = process.env.DB_URL
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

 function checkLogin(req,res,next){
  
  if(!req.user){
    res.send('로그인하세요')
  }
  next()
 }


app.get('/', checkLogin,(req,res) =>{//checkLogin -> 요청과 응답 사이에 실행되는 미들웨어
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
  
  await bcrypt.compare(입력한비번, result.password)//입력 비번과 db의 해싱된 비번 비교해줌
  if (result.password == 입력한비번) {//유저 입력 비번과 db비번
    return cb(null, result)
  } else {
    return cb(null, false, { message: '비번불일치' });
  }
}))



//로그인 요청!?
app.post('/login', (req, res, next) => {
  passport.authenticate('local', (error, user, info) => {
    if (error) return res.status(500).json({ message: '서버 오류', error });
    if (!user) return res.status(401).json({ message: info?.message || '로그인 실패' });

    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect('/');
    });
  })(req, res, next);
});


  passport.serializeUser((user,done)=>{
    console.log(user)
    process.nextTick(()=>{
      done(null, { id:user._id, username : user.username})
    })
  })
  //쿠키를 분석함
  passport.deserializeUser(async(user,done)=>{
    let result = await db.collection('user').findOne({_id : new ObjectId(user.id)})
    delete result.password
    process.nextTick(()=>{
      done(null,user)
    })
  })

  //로그인 get요청
  app.get('/login',async(req,res)=>{
    console.log(req.user)
    res.render('login.ejs')
})

  //마이페이지
  app.get('/mypage',async(req,res)=>{
    console.log("유저네임은",req.user)
    res.render('mypage.ejs',{name:req.user.username})
  })
  
  //가입페이지
  app.get('/register',async(req,res)=>{
    res.render('register.ejs')
})

  //가입기능
  app.post('/register',async(req,res)=>{
    console.log("가입페이지")

    let hash = await bcrypt.hash('req.body.password', 10)
    console.log(hash)

    await db.collection('user').insertOne({
      username : req.body.username, 
      password : hash
    })
    res.redirect('/')
})