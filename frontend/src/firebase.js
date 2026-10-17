//Emmanuel Koshy
import {initializeApp } from 'firebase/app';
import {getAuth} from 'firebase/auth';

// Public web config so its safe to commit for now (no passwords)
const app = initializeApp({
    apiKey: 'AIzaSyCO-I8Qer8AlU8IexXi5JOshMDsXlRaNWE',
    authDomain: 'msu-capstone-384e5.firebaseapp.com',
    projectId: 'msu-capstone-384e5',
    appId: '1:553964191154:web:9c15f4cb89da132d8078ab',
});

export const auth = getAuth(app);


