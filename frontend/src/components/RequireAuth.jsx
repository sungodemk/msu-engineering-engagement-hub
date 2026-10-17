import { useEffect, useState } from "react";
import{Navigate, Outlet} from 'react-router-dom';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

//blocks pages until signed in (Emmanuel Koshy)
export default function RequireAuth() {
    const [user, setUser] = useState(undefined);
    useEffect(() => onAuthStateChanged(auth,setUser), []);
    if(user=== undefined) return null;
    return user ? <Outlet /> : <Navigate to="/login" replace />
}

