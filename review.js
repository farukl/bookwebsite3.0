// Bu dosya, review.ejs sayfasının etkileşimli özelliklerini yönetir
document.addEventListener('DOMContentLoaded', () => {
    const commentFormContainer = document.getElementById('comment-form-container');
    
    // EJS'den reviewId alınmış olacak, ancak EJS render edilmeme ihtimaline karşı bir kontrol yapıyoruz
    let reviewId;
    try {
      // EJS içindeki reviewId değerine erişmeye çalış
      const reviewIdInput = document.querySelector('[name="reviewId"]');
      if (reviewIdInput) {
        reviewId = parseInt(reviewIdInput.value);
      } else {
        // URL'den almayı dene
        const urlParams = new URLSearchParams(window.location.search);
        reviewId = parseInt(urlParams.get('id'));
      }
    } catch (error) {
      console.error('Error getting reviewId:', error);
    }
    
    // Kullanıcı oturum durumunu kontrol et
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    // Eğer commentFormContainer daha önce doldurulmamışsa ve ID geçerliyse doldur
    if (commentFormContainer && commentFormContainer.innerHTML.trim() === '' && reviewId) {
      renderCommentForm(commentFormContainer, reviewId, user);
    }
    
    // Mevcut bir forma event listener ekleyen fonksiyon (muhtemel çift koddan kaçınmak için)
    addCommentFormListeners();
  });
  
  // Yorum formunu oluşturma fonksiyonu
  function renderCommentForm(container, reviewId, user) {
    if (!container) return;
    
    if (user) {
      // Oturum açmış kullanıcı için yorumlama formu
      container.innerHTML = `
        <form class="comment-form" id="comment-form">
          <input type="hidden" name="reviewId" value="${reviewId}">
          <input type="hidden" id="username" name="username" value="${user.username}">
          
          <div class="rating-container">
            <p class="rating-text">Rate this book:</p>
            <div class="rating-stars">
              <input type="radio" id="star5" name="rating" value="5" />
              <label for="star5" title="5 stars"><i class="fas fa-star"></i></label>
              
              <input type="radio" id="star4" name="rating" value="4" />
              <label for="star4" title="4 stars"><i class="fas fa-star"></i></label>
              
              <input type="radio" id="star3" name="rating" value="3" />
              <label for="star3" title="3 stars"><i class="fas fa-star"></i></label>
              
              <input type="radio" id="star2" name="rating" value="2" />
              <label for="star2" title="2 stars"><i class="fas fa-star"></i></label>
              
              <input type="radio" id="star1" name="rating" value="1" checked />
              <label for="star1" title="1 star"><i class="fas fa-star"></i></label>
            </div>
            <div class="selected-rating">
              <span id="rating-value">1</span>/5
            </div>
          </div>
          
          <textarea name="comment" id="comment" placeholder="Your Comment" required minlength="2" maxlength="1000"></textarea>
          <div class="char-counter">
            <span id="char-count">0</span>/1000
          </div>
          <div class="form-controls">
            <button type="submit" id="submit-comment">Post Comment</button>
            <div class="form-status" id="form-status"></div>
          </div>
        </form>
      `;
      
      // Form oluşturulduktan sonra event listener'ları ekle
      addCommentFormListeners();
    } else {
      // Oturum açmamış kullanıcılar için giriş mesajı
      container.innerHTML = `
        <div class="login-message">
          <p>Please <a href="/auth.html">login or register</a> to post a comment.</p>
        </div>
      `;
    }
  }
  
  // Yorum formuna event listener'lar ekler
  function addCommentFormListeners() {
    const commentForm = document.getElementById('comment-form');
    if (!commentForm) return;
    
    // Derecelendirme yıldızları için event listener'lar
    const ratingInputs = commentForm.querySelectorAll('input[name="rating"]');
    const ratingValueElement = document.getElementById('rating-value');
    
    if (ratingInputs.length > 0 && ratingValueElement) {
      ratingInputs.forEach(input => {
        input.addEventListener('change', () => {
          ratingValueElement.textContent = input.value;
        });
      });
    }
    
    // Karakter sayacı için event listener
    const commentTextarea = document.getElementById('comment');
    const charCount = document.getElementById('char-count');
    
    if (commentTextarea && charCount) {
      // İlk değeri ayarla
      charCount.textContent = commentTextarea.value.length;
      
      commentTextarea.addEventListener('input', () => {
        const count = commentTextarea.value.length;
        charCount.textContent = count;
        
        // Maksimum karakter sınırına yaklaşıldığında uyarı
        if (count > 900) {
          charCount.classList.add('warning');
        } else {
          charCount.classList.remove('warning');
        }
      });
    }
    
    // Form gönderimi için event listener
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitButton = document.getElementById('submit-comment');
      const formStatus = document.getElementById('form-status');
      
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Posting...';
      }
      
      if (formStatus) {
        formStatus.textContent = '';
        formStatus.className = 'form-status';
      }
      
      // Form verilerini topla
      const reviewId = parseInt(commentForm.querySelector('[name="reviewId"]').value);
      const username = commentForm.querySelector('#username').value;
      const comment = commentForm.querySelector('#comment').value.trim();
      const rating = commentForm.querySelector('input[name="rating"]:checked').value;
      
      // Yorum içeriğini kontrol et
      if (!comment || comment.length < 2) {
        if (formStatus) {
          formStatus.textContent = 'Comment cannot be empty';
          formStatus.classList.add('error');
        }
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Post Comment';
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
          throw new Error('Failed to post comment');
        }
        
        // Sayfayı yeniden yükle
        window.location.reload();
      } catch (error) {
        console.error('Error posting comment:', error);
        
        if (formStatus) {
          formStatus.textContent = 'Failed to post comment. Please try again.';
          formStatus.classList.add('error');
        }
        
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Post Comment';
        }
      }
    });
  }
  
  // Review sayfasında gerekli ek CSS stillerini ekler
  function addReviewStyles() {
    if (document.getElementById('review-styles')) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'review-styles';
    styleElement.textContent = `
      .char-counter {
        font-size: 0.8em;
        color: #aaa;
        text-align: right;
        margin-top: -8px;
        margin-bottom: 10px;
      }
      
      .char-counter .warning {
        color: #ff9800;
      }
      
      .form-controls {
        display: flex;
        align-items: center;
        gap: 15px;
      }
      
      .form-status {
        font-size: 0.9em;
        padding: 5px 10px;
      }
      
      .form-status.error {
        color: #f44336;
      }
      
      .form-status.success {
        color: #4caf50;
      }
      
      .selected-rating {
        margin-top: 5px;
        color: #ffcc00;
        font-size: 0.9em;
      }
      
      .comment-form textarea {
        transition: border 0.3s ease;
      }
      
      .comment-form textarea:focus {
        border-color: #61dafb;
        outline: none;
        box-shadow: 0 0 0 2px rgba(97, 218, 251, 0.3);
      }
    `;
    
    document.head.appendChild(styleElement);
  }
  
  // Stilleri ekle
  addReviewStyles();