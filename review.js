// Bu dosya, review.ejs sayfasının etkileşimli özelliklerini yönetir
document.addEventListener('DOMContentLoaded', () => {
    // Yorum formu ve yıldız derecelendirme sistemini ayarla
    setupCommentSystem();
    
    // Oturum durumunu kontrol et ve yorum yapabilme izinlerini ayarla
    checkLoginStatus();
});

// Yorum sistemini kuran ana fonksiyon
function setupCommentSystem() {
    // Yıldız derecelendirmesi için event listener'ları ekle
    setupRatingStars();
    
    // Yorum formunu ayarla
    setupCommentForm();
    
    // Sayfa için gerekli stilleri ekle
    addReviewStyles();
}

// Kullanıcının oturum durumunu kontrol eden fonksiyon
function checkLoginStatus() {
    const commentFormContainer = document.getElementById('comment-form-container');
    const commentForm = document.getElementById('comment-form');
    
    // localStorage'dan kullanıcı bilgisini al
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (user) {
        // Kullanıcı giriş yapmışsa, formu etkinleştir
        if (commentForm) {
            // Kullanıcı adı alanını gizle, çünkü zaten giriş yapmış kullanıcı
            const usernameFormGroup = commentForm.querySelector('.form-group:has(#username)');
            if (usernameFormGroup) {
                usernameFormGroup.style.display = 'none';
            }
            
            // Kullanıcı adını hidden input'a yerleştir
            const usernameInput = commentForm.querySelector('#username');
            if (usernameInput) {
                usernameInput.value = user.username;
            }
            
            // Form görünür olsun
            commentForm.style.display = 'block';
            
            // Eğer login mesajı varsa kaldır
            const loginMessage = commentFormContainer.querySelector('.login-message');
            if (loginMessage) {
                loginMessage.remove();
            }
        }
    } else {
        // Kullanıcı giriş yapmamışsa, formu gizle ve login mesajı göster
        if (commentForm) {
            commentForm.style.display = 'none';
        }
        
        // Login mesajı oluştur (eğer yoksa)
        if (commentFormContainer && !commentFormContainer.querySelector('.login-message')) {
            const loginMessage = document.createElement('div');
            loginMessage.className = 'login-message';
            loginMessage.innerHTML = '<p>Yorum yapmak için lütfen <a href="/auth.html">giriş yapın veya kayıt olun</a>.</p>';
            commentFormContainer.prepend(loginMessage);
        }
    }
}

// Yıldız derecelendirme sistemini ayarlayan fonksiyon
function setupRatingStars() {
    const stars = document.querySelectorAll('.rating-stars i');
    const ratingInput = document.getElementById('rating');
    
    if (stars.length > 0 && ratingInput) {
        stars.forEach(star => {
            star.addEventListener('click', function() {
                const value = this.getAttribute('data-rating');
                ratingInput.value = value;
                
                // Tüm yıldızları sıfırla
                stars.forEach(s => s.className = 'far fa-star');
                
                // Seçilen dereceye kadar yıldızları doldur
                for (let i = 0; i < stars.length; i++) {
                    if (i < value) {
                        stars[i].className = 'fas fa-star';
                    } else {
                        break;
                    }
                }
            });
            
            // Hover efekti
            star.addEventListener('mouseover', function() {
                const value = this.getAttribute('data-rating');
                
                for (let i = 0; i < stars.length; i++) {
                    if (i < value) {
                        stars[i].className = 'fas fa-star';
                    } else {
                        stars[i].className = 'far fa-star';
                    }
                }
            });
            
            // Hover dışına çıkıldığında mevcut dereceyi göster
            star.addEventListener('mouseout', function() {
                const currentRating = ratingInput.value || 0;
                
                stars.forEach((s, index) => {
                    if (index < currentRating) {
                        s.className = 'fas fa-star';
                    } else {
                        s.className = 'far fa-star';
                    }
                });
            });
        });
    }
}

// Yorum formunu ayarlayan fonksiyon
function setupCommentForm() {
    const commentForm = document.getElementById('comment-form');
    
    if (!commentForm) return;
    
    // Karakter sayacı
    const commentTextarea = commentForm.querySelector('#comment');
    const charCount = document.createElement('div');
    charCount.className = 'char-counter';
    charCount.innerHTML = '<span id="char-count">0</span>/1000';
    
    if (commentTextarea) {
        commentTextarea.insertAdjacentElement('afterend', charCount);
        
        const charCountSpan = document.getElementById('char-count');
        if (charCountSpan) {
            // İlk değeri ayarla
            charCountSpan.textContent = commentTextarea.value.length;
            
            // Değer değiştikçe güncelle
            commentTextarea.addEventListener('input', () => {
                const count = commentTextarea.value.length;
                charCountSpan.textContent = count;
                
                // Maksimum karakter sınırına yaklaşıldığında uyarı
                if (count > 900) {
                    charCountSpan.classList.add('warning');
                } else {
                    charCountSpan.classList.remove('warning');
                }
            });
        }
    }
    
    // Form gönderimi
    commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitButton = commentForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Gönderiliyor...';
        }
        
        // Form status mesajı için alan
        let formStatus = commentForm.querySelector('.form-status');
        if (!formStatus) {
            formStatus = document.createElement('div');
            formStatus.className = 'form-status';
            commentForm.appendChild(formStatus);
        }
        
        formStatus.textContent = '';
        formStatus.className = 'form-status';
        
        // Gerekli verileri al
        const reviewIdInput = commentForm.querySelector('[name="reviewId"]');
        const usernameInput = commentForm.querySelector('#username');
        const commentInput = commentForm.querySelector('#comment');
        const ratingInput = commentForm.querySelector('#rating');
        
        if (!reviewIdInput || !usernameInput || !commentInput || !ratingInput) {
            formStatus.textContent = 'Form alanları eksik. Sayfayı yenileyin.';
            formStatus.classList.add('error');
            
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Yorum Gönder';
            }
            return;
        }
        
        const reviewId = parseInt(reviewIdInput.value);
        const username = usernameInput.value.trim();
        const comment = commentInput.value.trim();
        const rating = parseInt(ratingInput.value) || 0;
        
        // Validasyon
        if (!comment || comment.length < 2) {
            formStatus.textContent = 'Yorum alanı boş olamaz';
            formStatus.classList.add('error');
            
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Yorum Gönder';
            }
            return;
        }
        
        if (rating < 1 || rating > 5) {
            formStatus.textContent = 'Lütfen bir derecelendirme seçin (1-5)';
            formStatus.classList.add('error');
            
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Yorum Gönder';
            }
            return;  
        }
        
        // Yorumu gönder
        try {
            const response = await fetch('/comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reviewId,
                    username,
                    comment,
                    rating
                }),
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Yorum gönderilemedi');
            }
            
            // Başarılı olduğunda sayfayı yeniden yükle
            window.location.reload();
        } catch (error) {
            console.error('Yorum gönderme hatası:', error);
            
            formStatus.textContent = 'Yorum gönderilemedi. Lütfen tekrar deneyin.';
            formStatus.classList.add('error');
            
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Yorum Gönder';
            }
        }
    });
}

// Sayfa için gerekli stilleri ekler
function addReviewStyles() {
    if (document.getElementById('review-styles')) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'review-styles';
    styleElement.textContent = `
        .login-message {
            background-color: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .login-message a {
            color: #007bff;
            text-decoration: underline;
        }
        
        .rating-stars {
            display: inline-flex;
            cursor: pointer;
            font-size: 1.5rem;
            color: #ffc107;
        }
        
        .rating-stars i {
            margin-right: 5px;
        }
        
        .fas.fa-star {
            color: #ffc107;
        }
        
        .far.fa-star {
            color: #ccc;
        }
        
        .char-counter {
            font-size: 0.8em;
            color: #aaa;
            text-align: right;
            margin-top: 5px;
            margin-bottom: 10px;
        }
        
        .char-counter .warning {
            color: #ff9800;
        }
        
        .form-status {
            margin-top: 10px;
            padding: 8px;
            border-radius: 4px;
        }
        
        .form-status.error {
            color: #721c24;
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
        }
        
        .form-status.success {
            color: #155724;
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
        }
        
        .comments-section {
            margin-top: 30px;
        }
        
        .comments-list {
            margin-bottom: 20px;
        }
        
        .comment {
            border-bottom: 1px solid #eee;
            padding: 15px 0;
        }
        
        .comment-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .comment-username {
            font-weight: bold;
        }
        
        .comment-date {
            color: #888;
            font-size: 0.9em;
        }
        
        .comment-content {
            margin-top: 10px;
            line-height: 1.5;
        }
        
        .rating-stars-display {
            color: #ffc107;
        }
    `;
    
    document.head.appendChild(styleElement);
}
