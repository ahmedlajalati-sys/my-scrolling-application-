// ========== CONFIGURATION ==========
const API_URL = 'http://localhost:5000/api';
const WS_URL = 'http://localhost:5000';

// Language translations
const translations = {
    en: {
        app_name: 'Scrolling.app',
        login: 'Login',
        signup: 'Sign Up',
        home: 'Home',
        search: 'Search',
        reels: 'Reels',
        profile: 'Profile',
        settings: 'Settings',
        followers: 'Followers',
        following: 'Following',
        posts: 'Posts',
        likes: 'Likes',
        comments: 'Comments',
        share: 'Share',
        save: 'Save',
        follow: 'Follow',
        unfollow: 'Unfollow',
        edit_profile: 'Edit Profile',
        dark_mode: 'Dark Mode',
        notifications: 'Notifications',
        language: 'Language',
        logout: 'Logout',
        delete_account: 'Delete Account',
        change_password: 'Change Password',
        saved_posts: 'Saved Posts',
        no_posts: 'No posts yet',
        no_followers: 'No followers yet',
        no_following: 'No following yet',
        create_post: 'Create Post',
        add_caption: 'Add a caption...',
        search_music: 'Search for music...',
        story_text: 'Add text to your story...',
        story_background: 'Background color',
        story_text_color: 'Text color'
    },
    ar: {
        app_name: 'سكرولينج',
        login: 'تسجيل الدخول',
        signup: 'إنشاء حساب',
        home: 'الرئيسية',
        search: 'بحث',
        reels: 'ريلز',
        profile: 'الملف الشخصي',
        settings: 'الإعدادات',
        followers: 'متابعون',
        following: 'يتابع',
        posts: 'منشورات',
        likes: 'إعجابات',
        comments: 'تعليقات',
        share: 'مشاركة',
        save: 'حفظ',
        follow: 'متابعة',
        unfollow: 'إلغاء المتابعة',
        edit_profile: 'تعديل الملف الشخصي',
        dark_mode: 'الوضع المظلم',
        notifications: 'الإشعارات',
        language: 'اللغة',
        logout: 'تسجيل خروج',
        delete_account: 'حذف الحساب',
        change_password: 'تغيير كلمة المرور',
        saved_posts: 'المنشورات المحفوظة',
        no_posts: 'لا توجد منشورات بعد',
        no_followers: 'لا يوجد متابعون بعد',
        no_following: 'لا يتابع أحداً بعد',
        create_post: 'إنشاء منشور',
        add_caption: 'أضف تعليقاً...',
        search_music: 'بحث عن موسيقى...'
    },
    fr: {
        app_name: 'Scrolling.app',
        login: 'Connexion',
        signup: "S'inscrire",
        home: 'Accueil',
        search: 'Recherche',
        reels: 'Reels',
        profile: 'Profil',
        settings: 'Paramètres',
        followers: 'Abonnés',
        following: 'Abonnements',
        posts: 'Publications',
        likes: 'J\'aime',
        comments: 'Commentaires',
        share: 'Partager',
        save: 'Enregistrer',
        follow: 'Suivre',
        unfollow: 'Ne plus suivre',
        edit_profile: 'Modifier le profil',
        dark_mode: 'Mode sombre',
        notifications: 'Notifications',
        language: 'Langue',
        logout: 'Déconnexion',
        delete_account: 'Supprimer le compte',
        change_password: 'Changer le mot de passe',
        saved_posts: 'Publications enregistrées'
    }
};

let currentLanguage = localStorage.getItem('language') || 'en';

function t(key) {
    return translations[currentLanguage]?.[key] || translations.en[key] || key;
}

function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    
    // Update all elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
    
    location.reload();
}

// Theme
let isDarkMode = localStorage.getItem('darkMode') === 'true';

function applyTheme() {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('darkMode', isDarkMode);
    applyTheme();
}

// Apply theme on load
applyTheme();