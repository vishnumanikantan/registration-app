var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    flash       = require("connect-flash"),
    passport    = require("passport"),
    LocalStrategy = require("passport-local"),
    methodOverride = require("method-override"),
    multer = require("multer"),
    User = require("./models/user"),
    Student = require("./models/student"),
    maxSize = 1*1024*1024,
    count = 100000,
    fields = [{name: "photo"},{name: "image"}];
    

    
app.set("view engine", "ejs");
app.use(express.static(__dirname + "public"));
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.use(flash());
mongoose.connect(process.env.DATABASE_URL);

// SET STORAGE
var storage = multer.diskStorage({
    destination: function (req, file, callback) {
    callback(null, './public/uploads');
    },
    filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});

var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, limits: { fileSize: maxSize }, fileFilter: imageFilter});



//Passport Configuration
app.use(require("express-session")({
    secret: "Study hard",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   res.locals.error = req.flash("error");
   res.locals.success = req.flash("success");
   res.locals.warning = req.flash("warning");
   next();
});


//Create Admin Id 
function createAdmin(){
    User.deleteMany({isAdmin: true},function(err){
        if(err){
            console.log(err);
        }else{
            console.log("Deleted....");
            var newAdmin = {username: process.env.ADMIN_ID, firstName: "Administrator", isAdmin: true};
            User.register(newAdmin, process.env.ADMIN_PASS, function(err, created){
                if(err){
                    console.log(err);
                }else{
                    console.log("It worked....");
                    return true;
                }
            });
        }
    });
}
createAdmin();



//Root Route
app.get("/", function(req, res){
    res.render("landing");
});

//Authentication Routes
//Display the user registration form
app.get("/register", function(req,res){
    res.render("register");
});

//Handle User registraion request
app.post("/register", function(req, res){
    if((req.body.username)&&(req.body.password)){
        var newUser = new User({
            username: req.body.username,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            phone: req.body.phone,
            email: req.body.username
        });
        User.register(newUser, req.body.password, function(err, newuser){
            if(err || (!newuser)){
                console.log(err);
                req.flash("error", err.message);
                return res.redirect("/register");
            }else{
                passport.authenticate("local")(req, res, function(){
                req.flash("success", "Successfully registered....\n Welcome "+ newuser.firstName);
                   res.redirect("/"); 
                });
            }
        });
    }
});

//Display the login form
app.get("/login", function(req, res) {
    res.render("login");
});

//Handle login request
app.post("/login", function(req, res){
    User.findOne({username: req.body.username}, function(err, User){
        if(err || (!User)){
            console.log(err);
            req.flash("error","Username is wrong....");
            return res.redirect("/login");
        }else{
            passport.authenticate("local",
            {
                  successRedirect: "/",
                  failureRedirect: "/login",
                  successFlash: "Welcome "+ User.firstName,
                  failureFlash: "Password is wrong...."
                })(req, res);
        }
        });
    
});


//Handle logout request
app.get("/logout", function(req, res) {
    req.logout();
    req.flash("success","Logged you out....");
    res.redirect("/");
});

//User Dashboard
//Render dashboard
app.get("/dashboard", isLoggedIn, hasnotApplied, function(req, res) {
    res.render("user/dashboard");
});

//handle form post request
app.post("/apply", isLoggedIn, hasnotApplied, fileUploader, function(req, res){
        req.body.student.applicationnum = ++count;
        Student.create(req.body.student, function(err, newStudent){
            if(err){
                console.log(err);
                req.flash("error", err.message);
                return res.redirect("back");
            }else{
                newStudent.author.id = req.user._id;
                req.user.application.id = newStudent._id;
                newStudent.isApplied = true;
                req.user.isApplied = true;
                req.user.save();
                newStudent.save();
                console.log(newStudent);
                req.flash("success", "Application submitted successfully....Now take print out of the application.");
                res.redirect("/download");
            }
        });
});

//Download Aplication form
app.get("/download", isLoggedIn, hasApplied, function(req, res) {
   var formId = req.user.application.id;
   Student.findById(formId, function(err, foundApplication) {
      if(err || !foundApplication){
          console.log(err);
          req.flash("error", "Could not find application!!!");
          res.redirect("/");
      }else{
          res.render("user/download", {application: foundApplication});
      } 
   });
});

//Handle download request
app.get("/:id/print", isLoggedIn, hasApplied, function(req, res) {
   Student.findById(req.params.id, function(err, foundApplication){
       if(err || !foundApplication){
           console.log(err);
           req.flash("error", "Could not find application!!!");
           res.redirect("/");
       }else{
           res.render("user/print", {application: foundApplication});
       }
   }); 
});


//Admin Dashboard
//Show institute dashboard
app.get("/admind", isAdminIn, function(req, res){
    Student.find({}, function(err, Applications){
        if(err){
            req.flash("error","Something went wrong....");
            return res.redirect("/");
        }else{
            res.render("user/admind", {applications: Applications});
        }
    });
});




//Middleware
//To check user is logged in or not
function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        req.flash("success","Welcome "+req.user.firstName);
        return next();
    }else{
        req.flash("error","Please login to do that....");
        res.redirect("/login");
    }
    
}

//To upload image files
function fileUploader(req, res, next){
    upload.fields(fields)(req, res, function(err){
            console.log("\n"+"I am inside multer"+"\n");
            if(err instanceof multer.MulterError){
                console.log(err);
                req.flash("error", "Could not upload image....Contact us at email@institution.ac.in");
                return res.redirect("/");
            }else if(err){
                console.log(err);
                req.flash("error", err.message);
                return res.redirect("/");
            }else{
                req.body.student.certificate = "uploads/" + req.files["image"][0].filename;
                req.body.student.photo = "uploads/" + req.files["photo"][0].filename;
                console.log(req.body.student);
                return next();
            }
        });
}

//To check whether a student has applied or not
function hasnotApplied(req, res, next){
    if(!(req.user.isApplied)){
        next();
    }else{
        console.log("You have already applied.....Contact the institution to edit any details....");
        req.flash("warning", "You have already applied.....Contact the institution to edit any details....");
        return res.redirect("/download");
    }
}

//To check whether a student has actually applied or not
function hasApplied(req, res, next){
    if(req.user.isApplied){
        next();
    }else{
        console.log("You have not applied.....First apply then take print out....");
        req.flash("warning", "You have not applied.....First apply then take print out....");
        return res.redirect("/dashboard");
    }
}

//To check whether Institute is logged in
function isAdminIn(req, res, next){
    if(req.isAuthenticated()){
        if(req.user.isAdmin){
            return next();
        }else{
            req.flash("error", "You are not an admin....Access Denied");
            res.redirect("/");
        }
    }else{
        req.flash("error", "You have to login first....");
        res.redirect("/login");
    }
}

app.listen(process.env.PORT, process.env.IP, function(){
   console.log("App Started!!");
   
});