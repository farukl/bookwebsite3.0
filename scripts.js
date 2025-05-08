// Sayfa yüklendiğinde çalışacak fonksiyonları başlatır
document.addEventListener("DOMContentLoaded", () => {
  // Ana sayfada incelemeleri göster
  if (
    window.location.pathname.endsWith("index.html") ||
    window.location.pathname === "/" ||
    window.location.pathname === ""
  ) {
    fetchReviews();
  }

  // İnceleme formu gönderimini yönet
  const reviewForm = document.getElementById("reviewForm");
  if (reviewForm) {
    const urlParams = new URLSearchParams(window.location.search);
    const reviewId = urlParams.get("id");

    if (reviewId) {
      // Düzenleme modundayız
      populateForm(reviewId);
      document.getElementById("submitButton").style.display = "none";
      document.getElementById("updateButton").style.display = "block";
      document
        .getElementById("updateButton")
        .addEventListener("click", handleReviewUpdate);
    } else {
      // Oluşturma modundayız
      reviewForm.addEventListener("submit", handleReviewFormSubmit);
    }
  }

  // Arama girdisini yönet
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", handleSearchInput);
  }
  
  // Kimlik doğrulama ile ilgili UI'ı başlat
  initializeAuth();
  updateAuthUI();
});

// Kimlik doğrulama ile ilgili olay dinleyicilerini başlat
function initializeAuth() {
  // Kimlik doğrulama sekmelerini ayarla
  const authTabs = document.querySelectorAll('.auth-tab');
  if (authTabs.length > 0) {
    authTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Tüm sekmeler ve formlardan aktif sınıfını kaldır
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        
        // Tıklanan sekmeye ve ilgili forma aktif sınıfını ekle
        tab.classList.add('active');
        const formId = `${tab.dataset.tab}-form`;
        document.getElementById(formId).classList.add('active');
      });
    });
    
    // Giriş butonunu ayarla
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
      loginButton.addEventListener('click', handleLogin);
    }
    
    // Kayıt butonunu ayarla
    const registerButton = document.getElementById('register-button');
    if (registerButton) {
      registerButton.addEventListener('click', handleRegister);
    }
  }
}

// İncelemeleri sunucudan getir
async function fetchReviews() {
  try {
    const response = await fetch("/reviews");
    const reviews = await response.json();
    
    // Yorum sayılarını hesaplamak için yorumları da getir
    const commentsResponse = await fetch("/comments.json");
    const comments = await commentsResponse.json();
    
    // İncelemelere yorum verilerini ekle
    const reviewsWithComments = reviews.map(review => {
      const reviewComments = comments.filter(comment => comment.reviewId === review.id);
      
      // Ortalama puanı hesapla
      let avgRating = 0;
      if (reviewComments.length > 0) {
        const totalRating = reviewComments.reduce((sum, comment) => sum + (comment.rating || 0), 0);
        avgRating = totalRating / reviewComments.length;
      }
      
      return {
        ...review,
        commentCount: reviewComments.length,
        avgRating: avgRating.toFixed(1) // 1 ondalık basamağa yuvarla
      };
    });
    
    displayReviews(reviewsWithComments);
  } catch(error) {
    console.error("İncelemeler veya yorumlar getirilirken hata oluştu:", error);
    // Yorum getirme başarısız olursa, yine de incelemeleri göstermeyi dene
    try {
      const response = await fetch("/reviews");
      const reviews = await response.json();
      displayReviews(reviews);
    } catch(err) {
      console.error("İncelemeler getirilirken hata oluştu:", err);
    }
  }
}

// İncelemeleri ekranda göster
function displayReviews(reviews) {
  const reviewGrid = document.getElementById("reviewGrid");
  if (!reviewGrid) return; // İnceleme sayfasında değilsek çık
  
  reviewGrid.innerHTML = ""; // Mevcut incelemeleri temizle
  
  reviews.forEach((review) => {
    const tile = document.createElement("div");
    tile.className = "review-tile";
    
    // Yıldız puanı HTML'ini oluştur
    const ratingValue = parseFloat(review.avgRating) || 0;
    const starRating = generateStarRating(ratingValue);
    
    // Resim ve başlık, yorum sayısı ve yıldız puanı içeren overlay'i oluştur
    tile.innerHTML = `
      <img src="${review.cover || "default-cover.jpg"}" alt="${review.title}" 
           onerror="this.onerror=null;this.src='default-cover.jpg';">
      <div class="overlay">
        <h3>${review.title}</h3>
        <div class="rating-info">
          <div class="comment-count">${review.commentCount || 0} yorum</div>
          <div class="star-rating">${starRating} <span class="rating-value">${ratingValue > 0 ? review.avgRating : 'Değerlendirme yok'}</span></div>
        </div>
      </div>
    `;
    
    tile.addEventListener("click", () => {
      window.location.href = `/review?id=${review.id}`;
    });
    
    reviewGrid.appendChild(tile);
  });
}

// Yıldız puanı HTML'ini oluşturan fonksiyon
function generateStarRating(rating) {
  // Puanı en yakın yarım yıldıza yuvarla
  const roundedRating = Math.round(rating * 2) / 2;
  let starsHTML = '';
  
  // Tam yıldızları ekle
  for (let i = 1; i <= Math.floor(roundedRating); i++) {
    starsHTML += '<span class="star full">★</span>';
  }
  
  // Gerekirse yarım yıldız ekle
  if (roundedRating % 1 !== 0) {
    starsHTML += '<span class="star half">★</span>';
  }
  
  // Boş yıldızları ekle
  const emptyStars = 5 - Math.ceil(roundedRating);
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += '<span class="star empty">☆</span>';
  }
  
  return starsHTML;
}

// Formu inceleme verileriyle doldur (düzenleme modu)
async function populateForm(reviewId) {
  try {
    const response = await fetch(`/reviews`);
    const reviews = await response.json();
    const review = reviews.find((review) => review.id === parseInt(reviewId));

    if (review) {
      document.getElementById("reviewId").value = review.id;
      document.getElementById("title").value = review.title;
      document.getElementById("author").value = review.author;
      document.getElementById("review").value = review.review;
      // Not: Güvenlik kısıtlamaları nedeniyle resimleri önceden yükleyemiyoruz
    } else {
      console.error("Bu ID için inceleme bulunamadı:", reviewId);
    }
  } catch(error) {
    console.error("Form doldurulurken hata oluştu:", error);
  }
}

// İnceleme güncelleme işlemini yönet
async function handleReviewUpdate(event) {
  event.preventDefault();
  const reviewId = parseInt(document.getElementById("reviewId").value);
  const title = document.getElementById("title").value;
  const author = document.getElementById("author").value;
  const reviewText = document.getElementById("review").value;
  const cover = document.getElementById("cover").files[0];
  const fullImage = document.getElementById("fullImage").files[0];

  try {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("author", author);
    formData.append("review", reviewText);
    if (cover) {
      formData.append("cover", cover);
    }
    if (fullImage) {
      formData.append("fullImage", fullImage);
    }

    const response = await fetch(`/reviews/${reviewId}`, {
      method: "PUT",
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "İnceleme güncellenemedi");
    }
    
    alert("İnceleme başarıyla güncellendi!");
    window.location.href = "/";
  } catch(error) {
    alert("İnceleme güncellenirken hata oluştu: " + error.message);
    console.error("İnceleme güncellenirken hata oluştu:", error);
  }
}

// İnceleme formu gönderimini yönet (yeni inceleme)
async function handleReviewFormSubmit(event) {
  event.preventDefault();
  const title = document.getElementById("title").value;
  const author = document.getElementById("author").value;
  const review = document.getElementById("review").value;
  const cover = document.getElementById("cover").files[0];
  const fullImage = document.getElementById("fullImage").files[0];

  try {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("author", author);
    formData.append("review", review);
    if (cover) {
      formData.append("cover", cover);
    }
    if (fullImage) {
      formData.append("fullImage", fullImage);
    }

    const response = await fetch("/reviews", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "İnceleme gönderilemedi");
    }

    window.location.href = "/";
  } catch(error) {
    alert("İnceleme gönderilirken hata oluştu: " + error.message);
    console.error("İnceleme gönderilirken hata oluştu:", error);
  }
}

// Arama gecikmesini yönetmek için değişken
let debounceTimer;

// Arama girdisini yönet
async function handleSearchInput(event) {
  const query = event.target.value.toLowerCase();

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      const response = await fetch("/reviews");
      const reviews = await response.json();
      
      // Yorum sayılarını almak için yorumları da getir
      const commentsResponse = await fetch("/comments.json");
      const comments = await commentsResponse.json();
      
      // Arama sorgusuna göre incelemeleri filtrele
      const filteredReviews = reviews.filter((review) =>
        review.title.toLowerCase().includes(query)
      );
      
      // Filtrelenmiş incelemelere yorum sayısı ve puan verilerini ekle
      const reviewsWithComments = filteredReviews.map(review => {
        const reviewComments = comments.filter(comment => comment.reviewId === review.id);
        
        // Ortalama puanı hesapla
        let avgRating = 0;
        if (reviewComments.length > 0) {
          const totalRating = reviewComments.reduce((sum, comment) => sum + (comment.rating || 0), 0);
          avgRating = totalRating / reviewComments.length;
        }
        
        return {
          ...review,
          commentCount: reviewComments.length,
          avgRating: avgRating.toFixed(1) // 1 ondalık basamağa yuvarla
        };
      });
      
      displayReviews(reviewsWithComments);
    } catch(error) {
      console.error("İncelemeler aranırken hata oluştu:", error);
      
      // Yorum getirme başarısız olursa alternatif
      try {
        const response = await fetch("/reviews");
        const reviews = await response.json();
        const filteredReviews = reviews.filter((review) =>
          review.title.toLowerCase().includes(query)
        );
        displayReviews(filteredReviews);
      } catch(err) {
        console.error("Arama yedek işleminde hata:", err);
      }
    }
  }, 300); // Gecikme süresini gerektiği gibi ayarlayın (300ms)
}

// İncelemeyi düzenleme sayfasına yönlendir
function editReview(id) {
  window.location.href = `/form.html?id=${id}`;
}

// İncelemeyi sil
async function deleteReview(id) {
  if (confirm("Bu incelemeyi silmek istediğinizden emin misiniz?")) {
    try {
      const response = await fetch(`/reviews/${id}`, {
        method: "DELETE",
        credentials: 'include' // Oturum tabanlı kimlik doğrulama için önemli
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "İnceleme silinemedi");
      }
      
      window.location.href = "/";
    } catch(error) {
      alert("İnceleme silinirken hata oluştu: " + error.message);
      console.error("İnceleme silinirken hata oluştu:", error);
    }
  }
}

// Giriş işlemini yönet
async function handleLogin() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const errorElement = document.getElementById('login-error');
  
  // Önceki hatayı temizle
  errorElement.textContent = "";
  errorElement.style.display = "none";
  
  // Girdiyi doğrula
  if (!username || !password) {
    errorElement.textContent = "Lütfen tüm alanları doldurun";
    errorElement.style.display = "block";
    return;
  }
  
  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include' // Oturum çerezleri için önemli
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      errorElement.textContent = data.error || "Giriş başarısız";
      errorElement.style.display = "block";
      return;
    }
    
    // Giriş başarılı - minimal kullanıcı bilgisini localStorage'a kaydet
    localStorage.setItem('user', JSON.stringify({
      id: data.id,
      username: data.username,
      isAdmin: data.isAdmin
    }));
    
    window.location.href = '/';
  } catch (error) {
    errorElement.textContent = "Bir hata oluştu. Lütfen tekrar deneyin.";
    errorElement.style.display = "block";
    console.error('Giriş hatası:', error);
  }
}

// Kayıt işlemini yönet
async function handleRegister() {
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;
  const errorElement = document.getElementById('register-error');
  
  // Önceki hatayı temizle
  errorElement.textContent = "";
  errorElement.style.display = "none";
  
  // Girdiyi doğrula
  if (!username || !email || !password || !confirmPassword) {
    errorElement.textContent = "Lütfen tüm alanları doldurun";
    errorElement.style.display = "block";
    return;
  }
  
  if (password !== confirmPassword) {
    errorElement.textContent = "Şifreler eşleşmiyor";
    errorElement.style.display = "block";
    return;
  }
  
  try {
    const response = await fetch('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password }),
      credentials: 'include' // Oturum çerezleri için önemli
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      errorElement.textContent = data.error || "Kayıt başarısız";
      errorElement.style.display = "block";
      return;
    }
    
    // Kayıt başarılı
    alert('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
    
    // Giriş sekmesine geç
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.querySelector('.auth-tab[data-tab="login"]').classList.add('active');
    document.getElementById('login-form').classList.add('active');
    
    // Giriş formunu önceden doldur
    document.getElementById('login-username').value = username;
  } catch (error) {
    errorElement.textContent = "Bir hata oluştu. Lütfen tekrar deneyin.";
    errorElement.style.display = "block";
    console.error('Kayıt hatası:', error);
  }
}

// Çıkış işlemini yönet
async function handleLogout() {
  try {
    const response = await fetch('/logout', {
      method: 'POST',
      credentials: 'include' // Oturum çerezleri için önemli
    });
    
    if (!response.ok) {
      throw new Error('Çıkış başarısız');
    }
    
    localStorage.removeItem('user');
    window.location.href = '/';
  } catch (error) {
    console.error('Çıkış hatası:', error);
    alert('Çıkış yaparken hata oluştu. Lütfen tekrar deneyin.');
  }
}

// Kimlik doğrulama durumunu kontrol et
async function checkAuthStatus() {
  try {
    const response = await fetch('/current-user', {
      credentials: 'include' // Oturum çerezleri için önemli
    });
    
    if (response.ok) {
      const userData = await response.json();
      // localStorage'ı en güncel oturum verileriyle güncelle
      localStorage.setItem('user', JSON.stringify({
        id: userData.id,
        username: userData.username,
        isAdmin: userData.isAdmin
      }));
    } else {
      // Sunucuda kimlik doğrulanmadıysa, yerel depolamayı temizle
      localStorage.removeItem('user');
    }
  } catch (error) {
    console.error('Kimlik doğrulama durumu kontrol edilirken hata:', error);
  }
  
  // UI'ı mevcut kimlik doğrulama durumuna göre güncelle
  updateAuthUI();
}

// Kullanıcı arayüzünü kimlik doğrulama durumuna göre güncelle
function updateAuthUI() {
  const navElement = document.querySelector('nav ul');
  if (!navElement) return;
  
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  // Mevcut kimlik doğrulama bağlantılarını kaldır
  const existingAuthLinks = document.querySelectorAll('.auth-link');
  existingAuthLinks.forEach(link => link.remove());
  
  if (user) {
    // Kullanıcı giriş yapmış
    const userElement = document.createElement('li');
    userElement.className = 'auth-link';
    userElement.innerHTML = `<span>Merhaba, ${user.username}</span>`;
    navElement.appendChild(userElement);
    
    const logoutElement = document.createElement('li');
    logoutElement.className = 'auth-link';
    const logoutLink = document.createElement('a');
    logoutLink.href = '#';
    logoutLink.textContent = 'Çıkış Yap';
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
    logoutElement.appendChild(logoutLink);
    navElement.appendChild(logoutElement);
    
    // Giriş yapmış kullanıcılar için inceleme gönderme bağlantısını göster
    const reviewFormLinkElement = document.querySelector('a[href="form.html"]');
    if (reviewFormLinkElement && reviewFormLinkElement.parentElement) {
      reviewFormLinkElement.parentElement.style.display = 'block';
    }
    
    // İnceleme sayfasında admin veya inceleme sahibi için düzenle/sil düğmelerini göster
    if (window.location.pathname.includes('review')) {
      const editButton = document.querySelector('button[onclick^="editReview"]');
      const deleteButton = document.querySelector('button[onclick^="deleteReview"]');
      
      // URL'den inceleme kimliğini al
      const urlParams = new URLSearchParams(window.location.search);
      const reviewId = parseInt(urlParams.get('id'));
      
      // Sahipliği kontrol etmek için incelemeyi getir
      fetch(`/reviews`)
        .then(response => response.json())
        .then(reviews => {
          const review = reviews.find(r => r.id === reviewId);
          
          if (review) {
            // Admin veya sahibiyse düzenleme düğmesini göster
            if (editButton) {
              if (user.isAdmin || review.userId === user.id) {
                editButton.style.display = 'inline-block';
              } else {
                editButton.style.display = 'none';
              }
            }
            
            // Sil düğmesini yalnızca admin için göster
            if (deleteButton) {
              deleteButton.style.display = user.isAdmin ? 'inline-block' : 'none';
            }
          }
        })
        .catch(error => console.error('İzin kontrolü için inceleme getirilirken hata:', error));
    }
  } else {
    // Kullanıcı giriş yapmamış
    const loginElement = document.createElement('li');
    loginElement.className = 'auth-link';
    const loginLink = document.createElement('a');
    loginLink.href = '/auth.html';
    loginLink.textContent = 'Giriş / Kayıt';
    loginElement.appendChild(loginLink);
    navElement.appendChild(loginElement);
    
    // Giriş yapmamış kullanıcılar için inceleme gönderme bağlantısını gizle
    const reviewFormLinkElement = document.querySelector('a[href="form.html"]');
    if (reviewFormLinkElement && reviewFormLinkElement.parentElement) {
      reviewFormLinkElement.parentElement.style.display = 'none';
    }
    
    // İnceleme sayfasında düzenle/sil düğmelerini gizle
    if (window.location.pathname.includes('review')) {
      const editButton = document.querySelector('button[onclick^="editReview"]');
      const deleteButton = document.querySelector('button[onclick^="deleteReview"]');
      
      if (editButton) editButton.style.display = 'none';
      if (deleteButton) deleteButton.style.display = 'none';
    }
  }
}

// Sayfa yüklendiğinde kimlik doğrulama durumunu kontrol et
checkAuthStatus();