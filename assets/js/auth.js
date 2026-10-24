/**
 * Firebase Auth wrapper (compat SDK). Google + email/password.
 * ID tokens are sent as Bearer to /v1/account/* — never stored as long-lived secrets.
 */
(function (global) {
  const cfg = () => global.FINURA_CONFIG || {};
  let auth = null;
  let initError = null;
  let mockUser = null;

  function firebaseConfigured() {
    const f = cfg().FIREBASE || {};
    return (
      f.apiKey &&
      f.apiKey.indexOf("YOUR_") !== 0 &&
      f.projectId &&
      f.projectId.indexOf("YOUR_") !== 0
    );
  }

  /** Production site hosts — mock auth must never activate here. */
  function isProductionHost() {
    const h = (location.hostname || "").toLowerCase();
    return (
      h === "finuraai.org" ||
      h === "www.finuraai.org" ||
      h.endsWith(".finuraai.org")
    );
  }

  function useMockAuth() {
    if (isProductionHost()) {
      try {
        localStorage.removeItem("finura_mock");
        sessionStorage.removeItem("finura_mock_user");
      } catch (_) {}
      return false;
    }
    if (cfg().MOCK_MODE) return true;
    try {
      const q = new URLSearchParams(location.search);
      if (q.get("mock") === "1") return true;
      if (localStorage.getItem("finura_mock") === "1") return true;
    } catch (_) {}
    if (
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1"
    ) {
      return true;
    }
    return !firebaseConfigured();
  }

  function init() {
    if (auth || mockUser) return auth;
    if (useMockAuth()) {
      try {
        const raw = sessionStorage.getItem("finura_mock_user");
        if (raw) mockUser = JSON.parse(raw);
      } catch (_) {}
      return null;
    }
    if (typeof firebase === "undefined") {
      initError = new Error("Firebase SDK not loaded");
      return null;
    }
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(cfg().FIREBASE);
      }
      auth = firebase.auth();
      return auth;
    } catch (err) {
      initError = err;
      return null;
    }
  }

  function persistMockUser(user) {
    mockUser = user;
    if (user) sessionStorage.setItem("finura_mock_user", JSON.stringify(user));
    else sessionStorage.removeItem("finura_mock_user");
  }

  function currentUser() {
    init();
    if (useMockAuth()) return mockUser;
    return auth ? auth.currentUser : null;
  }

  function onAuthStateChanged(cb) {
    init();
    if (useMockAuth()) {
      cb(mockUser);
      return function () {};
    }
    if (!auth) {
      cb(null);
      return function () {};
    }
    return auth.onAuthStateChanged(cb);
  }

  async function getIdToken(force) {
    init();
    if (useMockAuth()) {
      if (!mockUser) return null;
      return "mock_id_token_" + (mockUser.uid || "anon");
    }
    const user = auth && auth.currentUser;
    if (!user) return null;
    return user.getIdToken(!!force);
  }

  async function signInWithGoogle() {
    init();
    if (useMockAuth()) {
      const user = {
        uid: "mock_google_" + Date.now().toString(36),
        email: "ashish@finuraai.org",
        displayName: "Ashish (mock)",
        photoURL: null,
        providerId: "google.com",
      };
      persistMockUser(user);
      return user;
    }
    if (!auth) throw initError || new Error("Auth not initialised");
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await auth.signInWithPopup(provider);
    return cred.user;
  }

  async function signInWithEmail(email, password) {
    init();
    if (useMockAuth()) {
      const user = {
        uid: "mock_email_" + Date.now().toString(36),
        email: email,
        displayName: email.split("@")[0],
        photoURL: null,
        providerId: "password",
      };
      persistMockUser(user);
      return user;
    }
    if (!auth) throw initError || new Error("Auth not initialised");
    const cred = await auth.signInWithEmailAndPassword(email, password);
    return cred.user;
  }

  async function signUpWithEmail(email, password, displayName) {
    init();
    if (useMockAuth()) {
      const user = {
        uid: "mock_signup_" + Date.now().toString(36),
        email: email,
        displayName: displayName || email.split("@")[0],
        photoURL: null,
        providerId: "password",
      };
      persistMockUser(user);
      return user;
    }
    if (!auth) throw initError || new Error("Auth not initialised");
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    if (displayName && cred.user) {
      await cred.user.updateProfile({ displayName: displayName });
    }
    return cred.user;
  }

  async function signOut() {
    init();
    if (useMockAuth()) {
      persistMockUser(null);
      return;
    }
    if (auth) await auth.signOut();
  }

  async function sendPasswordResetEmail(email) {
    init();
    if (useMockAuth()) {
      return { mock: true, email: email };
    }
    if (!auth) throw initError || new Error("Auth not initialised");
    await auth.sendPasswordResetEmail(email);
    return { mock: false, email: email };
  }

  function isMock() {
    return useMockAuth();
  }

  function getInitError() {
    return initError;
  }

  global.FinuraAuth = {
    init,
    currentUser,
    onAuthStateChanged,
    getIdToken,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    sendPasswordResetEmail,
    isMock,
    firebaseConfigured,
    getInitError,
  };
})(window);
