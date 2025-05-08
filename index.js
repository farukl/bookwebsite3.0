const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const cors = require("cors");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const session = require('express-session');

const app = express();
const port = 3000;

// EJS görüntü motoru ve görünüm klasörü ayarı
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Dosya yolları tanımları
const usersFilePath = path.join(__dirname, "users.json");
const reviewsFilePath = path.join(__dirname, "reviews.json");
const commentsFilePath = path.join(__dirname, "comments.json");

// Veri depolama dizileri
let users = [];
let reviews = [];
let comments = [];

// CORS ayarları - tüm kaynaklardan isteklere izin ver
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware ayarları
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));
app.use(bodyParser.urlencoded({ extended: true }));

// Oturum yönetimi ayarları
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Cloudinary konfigürasyonu - resim yükleme servisi
cloudinary.config({
  cloud_name: "djgevocmm",
  api_key: "264777488666317",
  api_secret: "rGM5kJRp3LwGjOeGiZElJRMLVio",
});

// Cloudinary depolama ayarları
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "book-reviews",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

// Multer - dosya yükleme işleyicisi
const upload = multer({ storage: storage });

// İnceleme verilerini dosyadan yükle
fs.readFile(reviewsFilePath, (err, data) => {
  if (err) {
    console.error("İnceleme dosyası okunamadı:", err);
    reviews = [];
    saveReviews();
  } else {
    try {
      reviews = JSON.parse(data);
    } catch (e) {
      console.error("İnceleme JSON dosyası ayrıştırma hatası:", e);
      reviews = [];
    }
  }
});

// Yorum verilerini dosyadan yükle
fs.readFile(commentsFilePath, (err, data) => {
  if (err) {
    console.error("Yorumlar dosyası okunamadı:", err);
    comments = [];
    saveComments();
  } else {
    try {
      comments = JSON.parse(data);
    } catch (e) {
      console.error("Yorumlar JSON dosyası ayrıştırma hatası:", e);
      comments = [];
    }
  }
});

// Kullanıcı verilerini dosyadan yükle
fs.readFile(usersFilePath, (err, data) => {
  if (err) {
    console.error("Kullanıcılar dosyası okunamadı:", err);
    users = [
      {
        id: 1,
        username: "admin",
        email: "admin@example.com",
        password: "admin123",
        isAdmin: true
      }
    ];
    saveUsers();
  } else {
    try {
      users = JSON.parse(data);
    } catch (e) {
      console.error("Kullanıcılar JSON dosyası ayrıştırma hatası:", e);
      users = [
        {
          id: 1,
          username: "admin",
          email: "admin@example.com",
          password: "admin123",
          isAdmin: true
        }
      ];
      saveUsers();
    }
  }
});

// İncelemeleri dosyaya kaydet
function saveReviews() {
  fs.writeFile(reviewsFilePath, JSON.stringify(reviews, null, 2), (err) => {
    if (err) {
      console.error("İncelemeler kaydedilemedi:", err);
    }
  });
}

// Yorumları dosyaya kaydet
function saveComments() {
  fs.writeFile(commentsFilePath, JSON.stringify(comments, null, 2), (err) => {
    if (err) {
      console.error("Yorumlar kaydedilemedi:", err);
    }
  });
}

// Kullanıcıları dosyaya kaydet
function saveUsers() {
  fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), (err) => {
    if (err) {
      console.error("Kullanıcılar kaydedilemedi:", err);
    }
  });
}

// Kimlik doğrulama kontrolü middleware
function checkAuthentication(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.status(401).json({ error: "Kimlik doğrulama gerekiyor" });
}

// Admin kontrolü middleware
function checkAdmin(req, res, next) {
  if (req.session.user && req.session.user.isAdmin) {
    return next();
  }
  res.status(403).json({ error: "Yönetici hakları gerekiyor" });
}

// Ana sayfa rotası
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// İnceleme sayfası rotası
app.get('/review', (req, res) => {
  const reviewId = parseInt(req.query.id);
  if (!reviewId) {
    return res.status(400).send('İnceleme ID gereklidir');
  }
  
  const review = reviews.find(r => r.id === reviewId);
  
  if (!review) {
    return res.status(404).send('İnceleme bulunamadı');
  }
  
  const reviewComments = comments.filter(c => c.reviewId === reviewId);
  
  res.render('review', { 
    review: review,
    comments: reviewComments 
  });
});

// Yorum ekleme rotası
app.post('/comments', (req, res) => {
  const { username, comment, reviewId, rating } = req.body;
  
  if (!username || !comment || !reviewId) {
    return res.status(400).send('Kullanıcı adı, yorum ve inceleme ID gereklidir');
  }
  
  let parsedRating = 1;
  if (rating) {
    parsedRating = parseInt(rating);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      parsedRating = 1;
    }
  }
  
  const newComment = {
    id: Date.now(),
    reviewId: parseInt(reviewId),
    username,
    comment,
    rating: parsedRating,
    date: new Date().toISOString()
  };
  
  comments.push(newComment);
  saveComments();
  
  res.redirect(`/review?id=${reviewId}`);
});

// Kullanıcı kaydı rotası
app.post("/register", (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: "Tüm alanlar gereklidir" });
  }
  
  if (users.some(user => user.username === username)) {
    return res.status(400).json({ error: "Bu kullanıcı adı zaten var" });
  }
  
  if (users.some(user => user.email === email)) {
    return res.status(400).json({ error: "Bu e-posta adresi zaten var" });
  }
  
  const newUser = {
    id: Date.now(),
    username,
    email,
    password,
    isAdmin: false
  };
  
  users.push(newUser);
  saveUsers();
  
  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json(userWithoutPassword);
});

// Giriş rotası
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  
  const user = users.find(user => user.username === username && user.password === password);
  
  if (!user) {
    return res.status(401).json({ error: "Geçersiz kullanıcı adı veya şifre" });
  }
  
  const { password: _, ...userWithoutPassword } = user;
  req.session.user = userWithoutPassword;
  
  res.json(userWithoutPassword);
});

// Çıkış rotası
app.post("/logout", (req, res) => {
  req.session.destroy();
  res.json({ message: "Başarıyla çıkış yapıldı" });
});

// Mevcut kullanıcı bilgisi rotası
app.get("/current-user", (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ error: "Oturum açılmamış" });
  }
});

// Tüm incelemeleri getir rotası
app.get("/reviews", (req, res) => {
  res.json(reviews);
});

// Yeni inceleme oluşturma rotası
app.post(
  "/reviews", 
  checkAuthentication,
  upload.fields([{ name: "cover" }, { name: "fullImage" }]),
  (req, res) => {
    const { title, author, review } = req.body;
    const reviewId = Date.now();

    const reviewData = {
      id: reviewId,
      title,
      author,
      review,
      userId: req.session.user.id,
      username: req.session.user.username,
      cover: req.files["cover"] ? req.files["cover"][0].path : null,
      fullImage: req.files["fullImage"] ? req.files["fullImage"][0].path : null,
    };

    reviews.push(reviewData);
    saveReviews();
    res.status(201).send("İnceleme kaydedildi");
  }
);

// İnceleme güncelleme rotası
app.put(
  "/reviews/:id",
  checkAuthentication,
  upload.fields([{ name: "cover" }, { name: "fullImage" }]),
  (req, res) => {
    const reviewId = parseInt(req.params.id);
    const reviewIndex = reviews.findIndex((review) => review.id === reviewId);

    if (reviewIndex !== -1) {
      if (!req.session.user.isAdmin && reviews[reviewIndex].userId !== req.session.user.id) {
        return res.status(403).json({ error: "Bu incelemeyi düzenleme izniniz yok" });
      }

      const { title, author, review } = req.body;

      const updatedReview = {
        ...reviews[reviewIndex],
        title,
        author,
        review,
        cover: req.files["cover"]
          ? req.files["cover"][0].path
          : reviews[reviewIndex].cover,
        fullImage: req.files["fullImage"]
          ? req.files["fullImage"][0].path
          : reviews[reviewIndex].fullImage,
      };

      reviews[reviewIndex] = updatedReview;
      saveReviews();
      res.send("İnceleme güncellendi");
    } else {
      res.status(404).send("İnceleme bulunamadı");
    }
  }
);

// İnceleme silme rotası
app.delete("/reviews/:id", checkAdmin, (req, res) => {
  const reviewId = parseInt(req.params.id);
  reviews = reviews.filter((review) => review.id !== reviewId);
  comments = comments.filter((comment) => comment.reviewId !== reviewId);
  saveReviews();
  saveComments();
  res.send("İnceleme silindi");
});

// Sunucu port ayarı ve başlatma
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});