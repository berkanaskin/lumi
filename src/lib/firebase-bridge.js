// ============================================
// LUMI - Firebase Bridge
// ============================================
//
// window.firebase global'ini CDN compat script'leri yerine npm bundle'ından
// sağlar. main.js'in İLK importu olmalı: public/services/auth.js (defer) ve
// tüm src modülleri window.firebase'i bu modül değerlendirildikten sonra okur.
//
// Compat katmanı npm'de modüler SDK'nın üstüne sarılıdır — aynı app registry'yi
// paylaşırlar. Yani auth.js'in compat initializeApp'i, modüler getFirestore()
// çağıran modülleri de (streaming-cache, embeddings) besler.

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

if (typeof window !== 'undefined') {
    window.firebase = firebase;
}

export default firebase;
