//jshint version:6

require('dotenv').config();
const express=require('express');
const bodyparser=require('body-parser');
const mongoose=require('mongoose');
const https=require('https');
const session=require('express-session');
const passport=require('passport');
const ejs = require("ejs");
const passportLocalMongoose=require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate=require('mongoose-findorcreate');

const app=express();

app.use(express.static('public'));
app.set('view engine','ejs');


app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

app.use(session({
  secret: 'My little secret of football tactics.',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://Rohit-user:Neymar-123@cluster0.6srmu.mongodb.net/bankDB" , {useUnifiedTopology:true, useNewUrlParser: true } );

mongoose.set('useCreateIndex', true);

var sess;
var temp;
var num1;
var mail;
var updated;

const bankschema=new mongoose.Schema({
  username:{type:String},
  username1:{type:String},
  password1:String,
  balance:{type:Number,default:0},
  googleId:String,
  versionKey: false
});

bankschema.plugin(passportLocalMongoose);
bankschema.plugin(findOrCreate);

bankschema.path('username1').validate(async function(username1){
  const count= await mongoose.models.User.countDocuments({username1})
  return !count
},'Email-id already exists')

const User=new mongoose.model("User",bankschema);

passport.use(User.createStrategy());


passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/bank",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb, ) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      User.updateOne({googleId: profile.id},{username1:profile.name.givenName},function(err,result){
        if(err){
          console.log(err);
        }
        else{
          console.log("successfully updated the username1");
        }
      });

      User.updateOne({googleId: profile.id},{username:profile.displayName},function(err,result){
        if(err){
          console.log(err);
        }
        else{
          console.log("successfully updated the emailid");
        }
      });




      return cb(err, user);
      console.log(user);
    });
  }
));

app.get("/",  function(req, res){
 res.render("front");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/bank",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/next");
  });



app.get("/singup",  function(req, res){
 res.render("singup");
});
app.get("/login",  function(req, res){
 res.render("login");
});

app.get("/next",  function(req, res){
  if(req.isAuthenticated()){
    res.render("next",{name:req.user.username1});
  }
  else{
    res.redirect("/login");
  }
});



app.post("/singup", function(req, res){
  User.register({username1:req.body.username1,username:req.body.username}, req.body.password, function(err,user){
      if(err){
        console.log(err);
        res.redirect("/singup");
      }else{
        console.log("hello");
        passport.authenticate("local")(req, res, function(){
            console.log("success");
            res.redirect("/next");
        });
      }
  });


});


app.post('/login', function(req, res){
  const user=new User({
    username:req.body.username,
    password:req.body.password
  });

  req.login(user, function(err){
    if(err){
      console.log("hii");
      console.log(err);

    }
    else{
      passport.authenticate("local")(req, res, function(){
          console.log("success");
          res.redirect("/next");
      });
    }
  });
});
app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.get("/addmoney",  function(req, res){
  if(req.isAuthenticated()){
    res.render("addmoney",{name:req.user.username1,bal:req.user.balance});

  }
  else{
    res.redirect("/login");
  }
});

app.post('/addmoney',function(req,res){
  var t1=parseInt(req.body.value1);
    updated=req.user.balance+t1;
    User.updateOne({username:req.user.username},{balance:updated},function(err,result){
      if(err){
        console.log(err);
      }
      else{
        res.redirect("/addmoney");
      }
    })
});

app.get("/withdraw",  function(req, res){
  if(req.isAuthenticated()){
    res.render("withdraw",{name:req.user.username1,bal:req.user.balance,failed1:""});
  }
  else{
    res.redirect("/login");
  }
});

app.post('/withdraw',function(req,res){
    var t1=parseInt(req.body.value1);
    if(t1<=req.user.balance){
      updated=req.user.balance-t1;
      User.updateOne({username:req.user.username},{balance:updated},function(err,result){
        if(err){
          console.log(err);
        }
        else{
          res.redirect("/withdraw");
        }
      })
    }
    else{
      res.render("withdraw",{name:req.user.username1,bal:req.user.balance,failed1:"Withdrawal Amount cannot be greater than Available balance"});
    }
});

app.get("/transaction",  function(req, res){
 res.render("transaction");
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}


app.listen(port,function(){
  console.log("server running on port 3000");
});
